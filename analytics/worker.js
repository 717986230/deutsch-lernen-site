// Cloudflare Worker：匿名埋点(/collect,/stats) + 账号/资料/排行榜/徽章(/api/*)，写入 D1。
// 账号：用户名+密码（PBKDF2 哈希，不存明文）、GitHub / Google OAuth。登录后发随机 session token。
// 资料：昵称 + emoji 头像 + 背景色 + 个性签名（服务端白名单/长度校验）。学习数据由前端同步，服务端判定徽章。
// 面向「社交学习」演进：users 表已含展示资料与统计，后续加关注/动态只需新表。

const JSONH = { 'Content-Type': 'application/json; charset=utf-8' };

// 头像白名单：emoji + 背景色（只接受集合内的值，防注入/超长；无图片上传=无审核负担）
const AV_EMOJI = ['🦊', '🐼', '🐨', '🐯', '🦁', '🐶', '🐱', '🐰', '🐻', '🐸', '🐵', '🦉', '🐧', '🐢', '🦄', '🐲', '🌷', '🌟', '🍀', '🔥', '🚀', '⚽', '🎨', '🎧', '📚', '☕', '🥨', '🗼'];
const AV_BG = ['#58cc02', '#1cb0f6', '#ff9600', '#ff4b4b', '#ce82ff', '#2b70c9', '#ff86d0', '#00c2a8', '#f5b800', '#7a869a'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const cleanText = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, n);

// ───────── 联系方式（选填，用于找回密码）─────────
// 属个人信息：只在用户主动填写时收集，返回前端一律掩码，注销时随账号硬删。
// 传空字符串＝清空该项，存 null（SQLite 中 NULL 互不相等，唯一索引会忽略未填的行）。
function normEmail(v) {
  const s = cleanText(v, 120).toLowerCase();
  if (!s) return { ok: true, val: null };
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(s)) return { ok: false, err: '邮箱格式不正确' };
  return { ok: true, val: s };
}
// ───────── 邮箱验证码（Resend 发信）─────────
// 密钥用 `wrangler secret put RESEND_API_KEY` 设置，切勿写进 wrangler.toml（那是明文进 git 的）。
// 发信域名需在 Resend 后台验证过；发件人可用 MAIL_FROM 覆盖。
// SQLite 缺列时有两种措辞：SELECT 报 "no such column"，INSERT 报 "has no column named"。
// 只判前者会让 INSERT 的兜底永远不触发 —— 这是实测才发现的。
const isMissingCol = (e) => /no such column|has no column named/i.test(String(e && e.message));

const MAIL_TTL = 10 * 60 * 1000;   // 验证码 10 分钟有效
const MAIL_MAX_TRY = 5;            // 同一枚码最多试 5 次
function genMailCode() { const a = new Uint32Array(1); crypto.getRandomValues(a); return String(a[0] % 1000000).padStart(6, '0'); }
async function sendMail(env, to, code) {
  if (!env.RESEND_API_KEY) return { ok: false, err: '服务端未配置邮件服务（RESEND_API_KEY）' };
  const from = env.MAIL_FROM || 'uuoo 德语学习手册 <noreply@uuoo.site>';
  const text = '你的验证码是 ' + code + '，10 分钟内有效。\n\n如果不是你本人操作，请忽略本邮件，你的账号不受影响。';
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: 'uuoo 验证码 ' + code, text }),
    });
    if (!r.ok) return { ok: false, err: '邮件发送失败(' + r.status + ')' };
    return { ok: true };
  } catch { return { ok: false, err: '邮件发送异常' }; }
}

// ───────── 恢复码（忘记密码的唯一凭证；不依赖任何第三方发送）─────────
// 格式 UUOO-XXXX-XXXX-XXXX，字符集去掉易混的 0/O/1/I/L；库里只存 PBKDF2 哈希。
const REC_ALPHA = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function genRecovery() {
  const a = new Uint8Array(12); crypto.getRandomValues(a);
  let out = '';
  for (let i = 0; i < 12; i++) { if (i && i % 4 === 0) out += '-'; out += REC_ALPHA[a[i] % REC_ALPHA.length]; }
  return 'UUOO-' + out;
}
// 比对时忽略大小写/分隔符/空格，容忍用户手抄的格式差异
const normRecovery = (v) => String(v == null ? '' : v).toUpperCase().replace(/[^0-9A-Z]/g, '');
async function setRecovery(env, uid) {
  const code = genRecovery(), salt = rndHex(16);
  const hash = await pbkdf2(normRecovery(code), salt);
  await env.DB.prepare('UPDATE users SET rec_salt=?,rec_hash=?,rec_at=? WHERE id=?')
    .bind(salt, hash, Date.now(), uid).run();
  return code;
}

const maskEmail = (e) => { if (!e) return ''; const i = e.indexOf('@'); const n = e.slice(0, i), d = e.slice(i); return (n.length <= 1 ? n : n[0] + '***') + d; };


// ───────── 埋点：IP 处理 ─────────
// IP 在 PIPL / GDPR 下均属个人信息。默认只存**截断后**的：
//   IPv4 末段清零（1.2.3.4 → 1.2.3.0）、IPv6 只留前 48 位。
// 这样仍能做地域与运营商分析，但无法定位到具体个人 —— 是业界标准做法。
// 确需完整 IP（如排查滥用）时，设 wrangler secret LOG_FULL_IP=1 显式开启，
// 并**必须同步在隐私政策里写明**，否则属于未告知收集。
function truncIP(ip, full) {
  if (!ip) return '';
  if (full) return ip.slice(0, 45);
  if (ip.indexOf(':') >= 0) {
    // 必须先把 :: 展开再取前 3 组。直接按 ':' 切会把 2001:db8::1 变成
    // 「2001:db8:::」这种非法地址，2a01::9f3:1c2 也会多留一组、超出承诺的 /48。
    const [head, tail] = ip.split('::');
    const h = head ? head.split(':') : [];
    const t = tail ? tail.split(':') : [];
    const fill = Math.max(0, 8 - h.length - t.length);
    const groups = ip.indexOf('::') >= 0
      ? h.concat(Array(fill).fill('0'), t)
      : ip.split(':');
    return groups.slice(0, 3).join(':') + '::';
  }
  const p = ip.split('.');
  return p.length === 4 ? p[0] + '.' + p[1] + '.' + p[2] + '.0' : '';
}

// 频控参数（固定窗口计数，ratelimit 表；调参改这里即可）
const RL = {
  reg: { limit: 5, win: 3600000 },  // 注册：每 IP 1 小时 5 次（每请求计）
  lgf: { limit: 30, win: 600000 },  // 登录验密失败：每 IP 10 分钟 30 次（仅失败计）
  lgu: { limit: 10, win: 600000 },  // 验密失败：每用户名 10 分钟 10 次（login/delete/password 共用，仅失败计）
  rst: { limit: 8, win: 3600000 },  // 恢复码校验失败：每 IP / 每用户名 1 小时各 8 次（仅失败计）
  mls: { limit: 5, win: 3600000 },  // 发送邮箱验证码：每用户名 1 小时 5 次（每次发送即计）
  mli: { limit: 20, win: 3600000 }, // 发送邮箱验证码：每 IP 1 小时 20 次
};

// 第三方登录配置（GitHub / Google 同一套 OAuth2 流程，差异抽到这里）
const OAUTH = {
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userUrl: 'https://api.github.com/user',
    scope: 'read:user', idKey: 'id', loginKey: 'login', nameKey: 'name',
    cid: e => e.GH_CLIENT_ID, secret: e => e.GH_CLIENT_SECRET, extra: '',
  },
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid email profile', idKey: 'sub', loginKey: 'email', nameKey: 'name',
    cid: e => e.GOOGLE_CLIENT_ID, secret: e => e.GOOGLE_CLIENT_SECRET, extra: '&response_type=code&access_type=online',
  },
};

// 保留天数：埋点只用于看趋势，超过这个窗口的明细没有分析价值，
// 留着只会撑大 D1（上限 10GB）并延长「个人信息」的留存期。
const RETAIN_DAYS = 90;

export default {
  // 定时清理（wrangler.toml 里配 [triggers] crons）。
  // 顺带清掉过期 session / oauth_state / 频控计数 —— 这些表以前只增不减。
  async scheduled(event, env, ctx) {
    const now = Date.now();
    const cut = now - RETAIN_DAYS * 86400000;
    // 逐条执行而非 batch：batch 是一个事务，events 那条一旦超出 D1 限制就整批回滚，
    // 结果是「什么都没清」且悄无声息。拆开后一条失败不连累其余。
    const jobs = [
      // events 分批删：积压很久时一次性 DELETE 可能超限，每次最多 5 万行，靠每日重复跑收敛
      ['events', 'DELETE FROM events WHERE id IN (SELECT id FROM events WHERE ts < ? LIMIT 50000)', cut],
      ['sessions', 'DELETE FROM sessions WHERE exp < ?', now],
      ['oauth_state', 'DELETE FROM oauth_state WHERE exp < ?', now],
      ['ratelimit', 'DELETE FROM ratelimit WHERE exp < ?', now],
      ['activity', 'DELETE FROM activity WHERE ts < ?', now - 180 * 86400000],
    ];
    ctx.waitUntil((async () => {
      for (const [name, sql, arg] of jobs) {
        try { await env.DB.prepare(sql).bind(arg).run(); }
        catch (e) { console.error('cleanup ' + name + ' failed:', e && e.message); }
      }
    })());
  },

  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,GET,PUT,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(req.url);
    const path = url.pathname;
    const M = req.method;

    // ───────── 匿名埋点 ─────────
    if (M === 'POST' && path === '/collect') {
      const ipKey = truncIP(req.headers.get('CF-Connecting-IP') || '', false) || 'unknown';
      const rl = await rateHit(env, 'collect:' + ipKey, 120, 60000);
      if (!rl.ok) return tooMany(cors, rl.retry);
      let d;
      try { d = JSON.parse(await req.text()); } catch { return new Response('bad json', { status: 400, headers: cors }); }
      const cut = (v, n) => (v == null ? '' : String(v)).slice(0, n);
      const vid = cut(d.vid, 40), sid = cut(d.sid, 20), p = cut(d.path, 200), ref = cut(d.ref, 300), ua = cut(d.ua, 300);
      const cf = req.cf || {};
      const country = cf.country || '';
      const region = cut(cf.region || '', 40);        // 省/州
      const city = cut(cf.city || '', 40);
      const ip = truncIP(req.headers.get('CF-Connecting-IP') || '', env.LOG_FULL_IP === '1');
      // 会话时长由前端在页面隐藏时上报（秒）；夹到 0–86400 防脏数据
      const dur = Math.max(0, Math.min(86400, parseInt(d.dur, 10) || 0));
      const evs = Array.isArray(d.events) ? d.events.slice(0, 50) : [];
      if (evs.length) {
        const receivedAt = Date.now();
        // 事件时间不再相信客户端输入，避免伪造未来时间绕过数据保留策略。
        const base = [() => receivedAt, () => vid, () => sid, e => cut(e.n, 40),
          e => (e.p ? JSON.stringify(e.p).slice(0, 500) : null), () => p, () => ref, () => ua, () => country];
        try {
          const stmt = env.DB.prepare('INSERT INTO events (ts,vid,sid,name,props,path,ref,ua,country,region,city,ip,dur) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
          await env.DB.batch(evs.map(e => stmt.bind(...base.map(f => f(e)), region, city, ip, dur)));
        } catch (err) {
          // 表结构还没补列时（先部署了 Worker、后跑迁移）回落到旧写法，
          // 保证埋点不中断。跑过 migrate-events-geo.sql 后自动走上面的完整写法。
          if (!isMissingCol(err)) throw err;
          const old = env.DB.prepare('INSERT INTO events (ts,vid,sid,name,props,path,ref,ua,country) VALUES (?,?,?,?,?,?,?,?,?)');
          await env.DB.batch(evs.map(e => old.bind(...base.map(f => f(e)))));
        }
      }
      return new Response('ok', { headers: cors });
    }
    if (M === 'GET' && path === '/stats') {
      if (url.searchParams.get('key') !== env.STATS_KEY) return new Response('forbidden', { status: 403 });
      const days = Math.min(90, +url.searchParams.get('days') || 7);
      const since = Date.now() - days * 86400000;
      const pv = await env.DB.prepare('SELECT COUNT(*) c FROM events WHERE ts>?').bind(since).first();
      const uv = await env.DB.prepare('SELECT COUNT(DISTINCT vid) c FROM events WHERE ts>?').bind(since).first();
      const byEvent = await env.DB.prepare('SELECT name,COUNT(*) c FROM events WHERE ts>? GROUP BY name ORDER BY c DESC LIMIT 20').bind(since).all();
      const byView = await env.DB.prepare("SELECT props,COUNT(*) c FROM events WHERE ts>? AND name='view' GROUP BY props ORDER BY c DESC LIMIT 20").bind(since).all();
      const users = await env.DB.prepare('SELECT COUNT(*) c FROM users').first();
      // 会话时长：只取 dur>0 的记录（0 表示还没上报过时长），中位数比均值抗极端值
      // 下面两项依赖 migrate-events-geo.sql 补的列；未跑迁移时不让整个 /stats 挂掉
      let median = 0, avg = 0, dv = [], byCity = { results: [] };
      try {
        // 一次会话会随每批上报重复写入累计时长，所以必须**按 sid 取最大值**再统计，
        // 否则一个长会话会贡献几十行递增的 dur，把「会话时长」算成「上报次数分布」。
        // 加 LIMIT：90 天窗口下不能把全表拉进内存做中位数。
        const durs = await env.DB.prepare(
          'SELECT MAX(dur) d FROM events WHERE ts>? AND dur>0 GROUP BY sid ORDER BY d LIMIT 5000'
        ).bind(since).all();
        dv = durs.results.map(r => r.d);
        median = dv.length ? dv[Math.floor(dv.length / 2)] : 0;
        avg = dv.length ? Math.round(dv.reduce((a, b) => a + b, 0) / dv.length) : 0;
        byCity = await env.DB.prepare(
          "SELECT country,region,city,COUNT(DISTINCT vid) c FROM events WHERE ts>? AND city<>'' " +
          'GROUP BY country,region,city ORDER BY c DESC LIMIT 20').bind(since).all();
      } catch (err) {
        if (!isMissingCol(err)) throw err;
      }
      return json({ days, pv: pv.c, uv: uv.c, users: users.c,
        byEvent: byEvent.results, byView: byView.results,
        duration: { median, avg, samples: dv.length },   // 按会话去重后的秒数；未跑迁移时全为 0
        byCity: byCity.results }, 200, cors);
    }

    // ───────── 账号：注册 / 登录 ─────────
    if (M === 'POST' && path === '/api/register') {
      const ip = req.headers.get('CF-Connecting-IP') || '';
      if (ip) { // 注册频控：每请求即计数（无 IP 时放行不计）
        const rl = await rateHit(env, 'reg:' + ip, RL.reg.limit, RL.reg.win);
        if (!rl.ok) return tooMany(cors, rl.retry);
      }
      const b = await body(req);
      const name = String(b.username || '').trim().toLowerCase();
      const nick = cleanText(b.nickname, 20) || name;
      const pw = String(b.password || '');
      if (!/^[a-z0-9_]{3,20}$/.test(name)) return json({ err: '用户名需 3-20 位，仅小写字母/数字/下划线' }, 400, cors);
      if (pw.length < 6) return json({ err: '密码至少 6 位' }, 400, cors);
      // 邮箱选填，仅用于日后找回密码。手机号已下线：属强监管个人信息，
      // 而找回密码用邮箱验证码 + 恢复码已经够用，收它只增合规负担不增能力。
      const em = normEmail(b.email); if (!em.ok) return json({ err: em.err }, 400, cors);
      const exist = await env.DB.prepare('SELECT id FROM users WHERE username=?').bind(name).first();
      if (exist) return json({ err: '用户名已被占用' }, 400, cors);
      if (em.val && await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(em.val).first())
        return json({ err: '该邮箱已被使用' }, 400, cors);
      const salt = rndHex(16), hash = await pbkdf2(pw, salt), now = Date.now();
      const r = await env.DB.prepare('INSERT INTO users (username,nickname,pass_salt,pass_hash,provider,avatar,av_bg,email,created,updated) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .bind(name, nick, salt, hash, 'pw', pick(AV_EMOJI), pick(AV_BG), em.val, now, now).run();
      const newUid = r.meta.last_row_id;
      const recovery = await setRecovery(env, newUid); // 明文仅此一次返回，之后只剩哈希
      return json({ token: await newSession(env, newUid), user: { username: name, nickname: nick }, recovery }, 200, cors);
    }
    if (M === 'POST' && path === '/api/login') {
      const b = await body(req);
      const name = String(b.username || '').trim().toLowerCase();
      const ip = req.headers.get('CF-Connecting-IP') || '';
      // 进来先查两桶是否已超限（只读不计；失败后才计数）
      if (ip) {
        const c = await rateCheck(env, 'lgf:' + ip, RL.lgf.limit);
        if (!c.ok) return tooMany(cors, c.retry);
      }
      if (name) {
        const c = await rateCheck(env, 'lgu:' + name, RL.lgu.limit);
        if (!c.ok) return tooMany(cors, c.retry);
      }
      const fail = async () => { // 验密失败：IP 桶 + 用户名桶各计一次
        if (ip) await rateHit(env, 'lgf:' + ip, RL.lgf.limit, RL.lgf.win);
        if (name) await rateHit(env, 'lgu:' + name, RL.lgu.limit, RL.lgu.win);
        return json({ err: '用户名或密码错误' }, 400, cors);
      };
      const u = await env.DB.prepare('SELECT id,username,nickname,pass_salt,pass_hash FROM users WHERE username=?').bind(name).first();
      if (!u || !u.pass_hash) return fail();
      const hash = await pbkdf2(String(b.password || ''), u.pass_salt);
      if (hash !== u.pass_hash) return fail();
      return json({ token: await newSession(env, u.id), user: { username: u.username, nickname: u.nickname } }, 200, cors);
    }

    // ───────── 账号安全：注销 / 改密 / 登出 ─────────
    if (M === 'POST' && path === '/api/account/delete') {
      const uid = await auth(req, env);
      if (!uid) return json({ err: '未登录' }, 401, cors);
      const b = await body(req);
      const u = await env.DB.prepare('SELECT id,username,pass_salt,pass_hash FROM users WHERE id=?').bind(uid).first();
      if (!u) return json({ err: '账号不存在' }, 404, cors);
      if (u.pass_hash) { // 密码账号：必须验密（不接受 confirm 绕过）
        const c = await rateCheck(env, 'lgu:' + u.username, RL.lgu.limit);
        if (!c.ok) return tooMany(cors, c.retry);
        const hash = await pbkdf2(String(b.password || ''), u.pass_salt);
        if (hash !== u.pass_hash) {
          await rateHit(env, 'lgu:' + u.username, RL.lgu.limit, RL.lgu.win);
          return json({ err: '密码错误' }, 400, cors);
        }
      } else { // OAuth 账号：必须输入自己的用户名确认（不接受 password 绕过）
        if (String(b.confirm || '') !== u.username) return json({ err: '确认信息不符' }, 400, cors);
      }
      // 硬删：会话 → 关注关系（双向）→ 动态 → 账号本体。匿名埋点与账号无关联，不动。
      await env.DB.batch([
        env.DB.prepare('DELETE FROM sessions WHERE uid=?1').bind(uid),
        env.DB.prepare('DELETE FROM follows WHERE follower=?1 OR followee=?1').bind(uid),
        env.DB.prepare('DELETE FROM activity WHERE uid=?1').bind(uid),
        env.DB.prepare('DELETE FROM users WHERE id=?1').bind(uid),
      ]);
      return json({ ok: 1 }, 200, cors);
    }
    if (M === 'POST' && path === '/api/account/recovery') {
      const uid = await auth(req, env);
      if (!uid) return json({ err: '未登录' }, 401, cors);
      const b = await body(req);
      const u = await env.DB.prepare('SELECT username,provider,pass_salt,pass_hash FROM users WHERE id=?').bind(uid).first();
      if (!u) return json({ err: '账号不存在' }, 404, cors);
      // 密码账号必须验当前密码：否则借到一台已登录的手机就能换走恢复码
      if (u.provider === 'pw' && u.pass_hash) {
        const c = await rateCheck(env, 'lgu:' + u.username, RL.lgu.limit);
        if (!c.ok) return tooMany(cors, c.retry);
        if (await pbkdf2(String(b.password || ''), u.pass_salt) !== u.pass_hash) {
          await rateHit(env, 'lgu:' + u.username, RL.lgu.limit, RL.lgu.win);
          return json({ err: '密码错误' }, 400, cors);
        }
      }
      return json({ recovery: await setRecovery(env, uid) }, 200, cors);
    }
    // 申请邮箱验证码（免登录）。无论账号/邮箱是否存在，一律返回同一句，防账号枚举。
    if (M === 'POST' && path === '/api/account/email_code') {
      const b = await body(req);
      const name = String(b.username || '').trim().toLowerCase();
      const ip = req.headers.get('CF-Connecting-IP') || '';
      const generic = json({ ok: 1, msg: '若该用户名已绑定邮箱，验证码已发出，请查收（含垃圾箱）' }, 200, cors);
      if (ip) { const c = await rateCheck(env, 'mli:' + ip, RL.mli.limit); if (!c.ok) return tooMany(cors, c.retry); }
      if (name) { const c = await rateCheck(env, 'mls:' + name, RL.mls.limit); if (!c.ok) return tooMany(cors, c.retry); }
      if (!name) return generic;
      const u = await env.DB.prepare('SELECT id,email FROM users WHERE username=?').bind(name).first();
      // 计数放在查库之后、发信之前：存在与否都计，避免用耗时差异探测账号
      if (ip) await rateHit(env, 'mli:' + ip, RL.mli.limit, RL.mli.win);
      await rateHit(env, 'mls:' + name, RL.mls.limit, RL.mls.win);
      if (!u || !u.email) return generic;
      const code = genMailCode(), salt = rndHex(16), hash = await pbkdf2(code, salt);
      const sent = await sendMail(env, u.email, code);
      if (!sent.ok) return json({ err: sent.err }, 500, cors);   // 配置/服务问题要让站长看得见
      await env.DB.prepare('UPDATE users SET mail_salt=?,mail_hash=?,mail_exp=?,mail_try=0 WHERE id=?')
        .bind(salt, hash, Date.now() + MAIL_TTL, u.id).run();
      return generic;
    }
    // 用恢复码重置密码（无需登录）。成功后：旧码作废、发新码、踢掉全部会话
    if (M === 'POST' && path === '/api/account/reset') {
      const b = await body(req);
      const name = String(b.username || '').trim().toLowerCase();
      const code = normRecovery(b.code);
      const nw = String(b.new || '');
      const ip = req.headers.get('CF-Connecting-IP') || '';
      if (ip) { const c = await rateCheck(env, 'rst:' + ip, RL.rst.limit); if (!c.ok) return tooMany(cors, c.retry); }
      if (name) { const c = await rateCheck(env, 'rsu:' + name, RL.rst.limit); if (!c.ok) return tooMany(cors, c.retry); }
      if (nw.length < 6) return json({ err: '新密码至少 6 位' }, 400, cors);
      // 失败一律返回同一句，避免暴露「用户名是否存在 / 是否设过恢复码」
      const fail = async () => {
        if (ip) await rateHit(env, 'rst:' + ip, RL.rst.limit, RL.rst.win);
        if (name) await rateHit(env, 'rsu:' + name, RL.rst.limit, RL.rst.win);
        return json({ err: '用户名或恢复码不正确' }, 400, cors);
      };
      const mailCode = String(b.emailCode || '').replace(/\D/g, '');
      if (!name || (!code && !mailCode)) return fail();
      const u = await env.DB.prepare('SELECT id,provider,pass_hash,rec_salt,rec_hash,mail_salt,mail_hash,mail_exp,mail_try FROM users WHERE username=?').bind(name).first();
      if (!u) return fail();
      // 第三方账号没有密码可「重置」—— 真给它写一个 pass_hash，等于凭一封邮件
      // 给 GitHub/Google 账号凭空造出一条用户名+密码的登录通道（/api/login 只看
      // pass_hash 不看 provider）。这类账号丢失访问的正解是回去用第三方重新登录。
      if (u.provider !== 'pw' && !u.pass_hash) return fail();
      let passed = false;
      if (mailCode) {                                    // ① 邮箱验证码
        if (!u.mail_hash || !u.mail_exp || Date.now() > u.mail_exp) return fail();
        if ((u.mail_try || 0) >= MAIL_MAX_TRY) return fail();
        if (await pbkdf2(mailCode, u.mail_salt) === u.mail_hash) passed = true;
        else {                                           // 试错计数，满 5 次这枚码作废
          await env.DB.prepare('UPDATE users SET mail_try=? WHERE id=?').bind((u.mail_try || 0) + 1, u.id).run();
          return fail();
        }
      } else {                                           // ② 恢复码
        if (!u.rec_hash) return fail();
        if (await pbkdf2(code, u.rec_salt) !== u.rec_hash) return fail();
        passed = true;
      }
      if (!passed) return fail();
      const salt = rndHex(16), hash = await pbkdf2(nw, salt);
      await env.DB.batch([
        env.DB.prepare('UPDATE users SET pass_salt=?,pass_hash=?,updated=? WHERE id=?').bind(salt, hash, Date.now(), u.id),
        env.DB.prepare('DELETE FROM sessions WHERE uid=?').bind(u.id), // 重置后所有设备都要重登
        // 验证码一次性：无论走哪条通道都清掉；走邮箱通道则证明邮箱确属本人
        env.DB.prepare('UPDATE users SET mail_hash=NULL,mail_salt=NULL,mail_exp=NULL,mail_try=0' +
          (mailCode ? ',email_ok=1' : '') + ' WHERE id=?').bind(u.id),
      ]);
      const recovery = await setRecovery(env, u.id); // 旧码已用掉，立刻换一枚
      return json({ ok: 1, token: await newSession(env, u.id), recovery }, 200, cors);
    }
    if (M === 'POST' && path === '/api/account/password') {
      const uid = await auth(req, env);
      if (!uid) return json({ err: '未登录' }, 401, cors);
      const b = await body(req);
      const u = await env.DB.prepare('SELECT id,username,provider,pass_salt,pass_hash FROM users WHERE id=?').bind(uid).first();
      if (!u) return json({ err: '账号不存在' }, 404, cors);
      if (u.provider !== 'pw' || !u.pass_hash) return json({ err: '该账号为第三方登录，无密码可改' }, 400, cors);
      const nw = String(b.new || '');
      if (nw.length < 6) return json({ err: '新密码至少 6 位' }, 400, cors);
      const c = await rateCheck(env, 'lgu:' + u.username, RL.lgu.limit);
      if (!c.ok) return tooMany(cors, c.retry);
      const oldHash = await pbkdf2(String(b.old || ''), u.pass_salt);
      if (oldHash !== u.pass_hash) {
        await rateHit(env, 'lgu:' + u.username, RL.lgu.limit, RL.lgu.win);
        return json({ err: '原密码错误' }, 400, cors);
      }
      const salt = rndHex(16), hash = await pbkdf2(nw, salt);
      // 改密成功：踢掉当前会话之外的全部会话
      await env.DB.batch([
        env.DB.prepare('UPDATE users SET pass_salt=?,pass_hash=?,updated=? WHERE id=?').bind(salt, hash, Date.now(), uid),
        env.DB.prepare('DELETE FROM sessions WHERE uid=? AND token<>?').bind(uid, getToken(req)),
      ]);
      return json({ ok: 1 }, 200, cors);
    }
    if (M === 'POST' && path === '/api/logout') {
      const t = getToken(req);
      if (!t) return json({ err: '未登录' }, 401, cors);
      await env.DB.prepare('DELETE FROM sessions WHERE token=?').bind(t).run(); // 幂等：不存在也算成功
      return json({ ok: 1 }, 200, cors);
    }
    if (M === 'POST' && path === '/api/logout_all') {
      const uid = await auth(req, env);
      if (!uid) return json({ err: '未登录' }, 401, cors);
      const r = await env.DB.prepare('DELETE FROM sessions WHERE uid=? AND token<>?').bind(uid, getToken(req)).run();
      return json({ ok: 1, revoked: r.meta.changes }, 200, cors);
    }

    // ───────── 第三方登录（GitHub / Google，配置化） ─────────
    const om = path.match(/^\/api\/oauth\/(github|google)\/(start|callback)$/);
    if (M === 'GET' && om) {
      const prov = OAUTH[om[1]], step = om[2], site = env.SITE_URL || url.origin;
      const cid = prov.cid(env);
      if (!cid) return Response.redirect(site + '/#login?err=oauth_unavailable', 302);
      const redirect = url.origin + '/api/oauth/' + om[1] + '/callback';
      if (step === 'start') {
        const state = rndHex(16);
        await env.DB.prepare('INSERT INTO oauth_state (state,exp) VALUES (?,?)').bind(state, Date.now() + 600000).run();
        const authUrl = prov.authUrl + '?client_id=' + encodeURIComponent(cid) +
          '&redirect_uri=' + encodeURIComponent(redirect) + '&scope=' + encodeURIComponent(prov.scope) +
          '&state=' + state + (prov.extra || '');
        return Response.redirect(authUrl, 302);
      }
      // callback
      const code = url.searchParams.get('code'), state = url.searchParams.get('state');
      const st = state && await env.DB.prepare('SELECT exp FROM oauth_state WHERE state=?').bind(state).first();
      if (!code || !st || st.exp < Date.now()) return Response.redirect(site + '/#login?err=oauth', 302);
      await env.DB.prepare('DELETE FROM oauth_state WHERE state=?').bind(state).run();
      const tr = await fetch(prov.tokenUrl, {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: cid, client_secret: prov.secret(env), code, redirect_uri: redirect, grant_type: 'authorization_code' }),
      });
      const tok = await tr.json().catch(() => ({}));
      if (!tok.access_token) return Response.redirect(site + '/#login?err=oauth', 302);
      const ur = await fetch(prov.userUrl, { headers: { Authorization: 'Bearer ' + tok.access_token, 'User-Agent': 'uuoo-app', Accept: 'application/json' } });
      const info = await ur.json().catch(() => ({}));
      const pid = info[prov.idKey] != null ? String(info[prov.idKey]) : '';
      if (!pid) return Response.redirect(site + '/#login?err=oauth', 302);
      const uid = await oauthUpsert(env, om[1], pid, info[prov.loginKey], info[prov.nameKey]);
      // token 放 URL 片段(#)而非查询串(?)：片段不进 Referer / 访问日志，前端读后立即清除
      return Response.redirect(site + '/#acct_token=' + (await newSession(env, uid)), 302);
    }

    // ───────── 学习明细（需登录；按目标语言分开、带 revision 防止新设备覆盖旧设备） ─────────
    if (M === 'GET' && path === '/api/progress') {
      const uid = await auth(req, env);
      if (!uid) return json({ err: '未登录' }, 401, cors);
      const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'de';
      const row = await env.DB.prepare('SELECT rev,document,updated FROM user_progress_documents WHERE uid=? AND lang=?').bind(uid, lang).first();
      if (!row) return json({ lang, rev: 0, document: null }, 200, cors);
      let document;
      try { document = JSON.parse(row.document); } catch (_) { document = {}; }
      return json({ lang, rev: row.rev, document, updated: row.updated }, 200, cors);
    }
    if (M === 'PUT' && path === '/api/progress') {
      const uid = await auth(req, env);
      if (!uid) return json({ err: '未登录' }, 401, cors);
      const progressRate = await rateHit(env, 'progress:' + uid, 30, 60000);
      if (!progressRate.ok) return tooMany(cors, progressRate.retry);
      const b = await body(req);
      const lang = b.lang === 'en' ? 'en' : 'de';
      const rev = Number.isInteger(b.rev) && b.rev >= 0 ? b.rev : -1;
      if (!b.document || typeof b.document !== 'object' || Array.isArray(b.document)) return json({ err: '学习数据格式错误' }, 400, cors);
      const encoded = JSON.stringify(b.document);
      if (encoded.length > 900000) return json({ err: '学习数据过大' }, 413, cors);
      const now = Date.now();
      if (rev === 0) {
        const inserted = await env.DB.prepare('INSERT OR IGNORE INTO user_progress_documents (uid,lang,rev,document,updated) VALUES (?,?,?,?,?)')
          .bind(uid, lang, 1, encoded, now).run();
        if (inserted.meta && inserted.meta.changes) return json({ ok: 1, rev: 1 }, 200, cors);
      } else {
        const updated = await env.DB.prepare('UPDATE user_progress_documents SET document=?,rev=rev+1,updated=? WHERE uid=? AND lang=? AND rev=?')
          .bind(encoded, now, uid, lang, rev).run();
        if (updated.meta && updated.meta.changes) return json({ ok: 1, rev: rev + 1 }, 200, cors);
      }
      const current = await env.DB.prepare('SELECT rev,document,updated FROM user_progress_documents WHERE uid=? AND lang=?').bind(uid, lang).first();
      let document = {};
      try { document = current && JSON.parse(current.document); } catch (_) {}
      return json({ err: '同步冲突', rev: current ? current.rev : 0, document, updated: current && current.updated }, 409, cors);
    }

    // ───────── 同步学习摘要（需登录） ─────────
    if (M === 'POST' && path === '/api/sync') {
      const uid = await auth(req, env);
      if (!uid) return json({ err: '未登录' }, 401, cors);
      const syncRate = await rateHit(env, 'sync:' + uid, 30, 60000);
      if (!syncRate.ok) return tooMany(cors, syncRate.retry);
      const b = await body(req);
      const lang = b.lang === 'en' ? 'en' : 'de';
      const clamp = (v) => Math.max(0, Math.min(1e7, v | 0));
      const known = clamp(b.known), streak = clamp(b.streak), best = clamp(b.best), total = clamp(b.total), quiz = clamp(b.quiz);
      const level = String(b.level || 'A1').slice(0, 4);
      const old = await env.DB.prepare('SELECT badges,known,best_streak,total,quiz FROM users WHERE id=?').bind(uid).first();
      if (!old) return json({ err: '账号不存在' }, 404, cors);
      // 语言档案是同步与恢复的权威边界；旧 users 字段保留为全站德语兼容/排行榜汇总。
      let profile = await env.DB.prepare('SELECT known,streak,best_streak,total,quiz,level FROM user_language_profiles WHERE uid=? AND lang=?').bind(uid, lang).first();
      if (!profile) {
        await env.DB.prepare('INSERT OR IGNORE INTO user_language_profiles (uid,lang,known,streak,best_streak,total,quiz,level,updated) VALUES (?,?,?,?,?,?,?,?,?)')
          .bind(uid, lang, lang === 'de' ? (old.known || 0) : 0, lang === 'de' ? (old.streak || 0) : 0, lang === 'de' ? (old.best_streak || 0) : 0, lang === 'de' ? (old.total || 0) : 0, lang === 'de' ? (old.quiz || 0) : 0, lang === 'de' ? (old.level || 'A1') : 'A1', Date.now()).run();
        profile = await env.DB.prepare('SELECT known,streak,best_streak,total,quiz,level FROM user_language_profiles WHERE uid=? AND lang=?').bind(uid, lang).first();
      }
      // 客户端是离线优先，换设备时它的累计值可能比云端低。用于徽章的必须是
      // 实际会写入的合并结果，不能用请求体的较小值，否则一次同步会把已解锁徽章抹掉。
      const merged = {
        known: Math.max(profile.known || 0, known),
        streak,
        best: Math.max(profile.best_streak || 0, best, streak),
        total: Math.max(profile.total || 0, total),
        quiz: Math.max(profile.quiz || 0, quiz),
      };
      const list = computeBadges(merged, uid);
      const badges = list.join(',');
      const now = Date.now();
      // known/total/quiz 只增不减：这三个是累计量，用户不可能「忘掉」已掌握的词。
      // 无条件覆盖会让**新设备首次登录时用本地的 0 清空服务端数据** ——
      // 而 DEPLOY.md 承诺的正是「换设备重新登录可恢复进度」，覆盖式写入会直接打破它。
      // 顺带也堵掉了用一次 POST 把别人挤下排行榜的路（只能往上刷，不能改低）。
      // streak 例外：断签后本就该降回去，故保持直接赋值。
      await env.DB.prepare(
        'UPDATE user_language_profiles SET known=?,streak=?,best_streak=?,total=?,quiz=?,level=?,updated=? WHERE uid=? AND lang=?')
        .bind(merged.known, merged.streak, merged.best, merged.total, merged.quiz, level, now, uid, lang).run();
      // 德语保留旧排行榜/徽章兼容；英语统计绝不能覆盖德语的全站公开档案。
      if (lang === 'de') await env.DB.prepare(
        'UPDATE users SET known=MAX(known,?),streak=?,best_streak=MAX(best_streak,?,?),' +
        'total=MAX(total,?),quiz=MAX(quiz,?),level=?,badges=?,updated=? WHERE id=?')
        .bind(merged.known, merged.streak, merged.best, merged.streak, merged.total, merged.quiz, level, badges, now, uid).run();
      // 学习动态：纯系统事件（新徽章 / 打卡破纪录），供关注者的 Feed
      if (old) {
        const had = new Set((old.badges || '').split(',').filter(Boolean));
        const acts = list.filter(id => !had.has(id)).map(id => ['badge', id]);
        const newBest = merged.best;
        if (newBest > (old.best_streak || 0) && newBest >= 3) acts.push(['streak', String(newBest)]);
        if (acts.length) {
          const st = env.DB.prepare('INSERT INTO activity (uid,type,data,ts) VALUES (?,?,?,?)');
          await env.DB.batch(acts.slice(0, 10).map(([t, d]) => st.bind(uid, t, d, now)));
        }
      }
      return json({ ok: 1, badges: list }, 200, cors);
    }
    if (M === 'GET' && path === '/api/me') {
      const uid = await auth(req, env);
      if (!uid) return json({ err: '未登录' }, 401, cors);
      const u = await env.DB.prepare('SELECT username,nickname,avatar,av_bg,sig,provider,known,streak,best_streak,total,quiz,level,badges,created,email FROM users WHERE id=?').bind(uid).first();
      if (!u) return json({ err: '账号不存在' }, 404, cors);
      const profiles = await env.DB.prepare('SELECT lang,known,streak,best_streak,total,quiz,level,updated FROM user_language_profiles WHERE uid=? ORDER BY lang').bind(uid).all();
      // 联系方式只回掩码 + 是否已填，明文不出服务端
      u.hasEmail = !!u.email;
      u.email = maskEmail(u.email);
      u.badges = badgeList(u.badges, uid).join(',');   // 没同步过也要看得到创始人
      const rank = await env.DB.prepare('SELECT COUNT(*)+1 c FROM users WHERE known>?').bind(u.known || 0).first();
      const fc = await followCounts(env, uid);
      return json({ user: u, profiles: profiles.results || [], rank: rank.c, followers: fc.followers, following: fc.following }, 200, cors);
    }
    // ───────── 社交：关注 / 取关 / 关注列表 ─────────
    if (M === 'POST' && (path === '/api/follow' || path === '/api/unfollow')) {
      const uid = await auth(req, env);
      if (!uid) return json({ err: '未登录' }, 401, cors);
      const b = await body(req);
      const name = String(b.name || '').trim().toLowerCase();
      const t = await env.DB.prepare('SELECT id FROM users WHERE username=?').bind(name).first();
      if (!t) return json({ err: '用户不存在' }, 404, cors);
      if (t.id === uid) return json({ err: '不能关注自己' }, 400, cors);
      if (path === '/api/follow') await env.DB.prepare('INSERT OR IGNORE INTO follows (follower,followee,ts) VALUES (?,?,?)').bind(uid, t.id, Date.now()).run();
      else await env.DB.prepare('DELETE FROM follows WHERE follower=? AND followee=?').bind(uid, t.id).run();
      return json({ ok: 1, following: path === '/api/follow' }, 200, cors);
    }
    if (M === 'GET' && path === '/api/following') {
      const uid = await auth(req, env);
      if (!uid) return json({ err: '未登录' }, 401, cors);
      // 多查一列 u.id 只为算创始人，不外泄（下面构造返回对象时不带它）
      const rows = await env.DB.prepare('SELECT u.id,u.username,u.nickname,u.avatar,u.av_bg,u.known,u.best_streak,u.level,u.badges FROM follows f JOIN users u ON u.id=f.followee WHERE f.follower=? ORDER BY u.known DESC LIMIT 100').bind(uid).all();
      const list = rows.results.map(r => ({ username: r.username, nickname: r.nickname, avatar: r.avatar, av_bg: r.av_bg, known: r.known, streak: r.best_streak, level: r.level, badges: badgeList(r.badges, r.id).length }));
      return json({ list }, 200, cors);
    }
    // 修改资料：昵称 / 头像 / 背景色 / 个性签名（需登录，服务端校验）
    if (M === 'POST' && path === '/api/profile/update') {
      const uid = await auth(req, env);
      if (!uid) return json({ err: '未登录' }, 401, cors);
      const b = await body(req);
      const set = [], bind = [];
      if (b.nickname != null) {
        const nick = cleanText(b.nickname, 20);
        if (!nick) return json({ err: '昵称不能为空' }, 400, cors);
        set.push('nickname=?'); bind.push(nick);
      }
      if (b.avatar != null) {
        if (!AV_EMOJI.includes(b.avatar)) return json({ err: '头像不在可选范围' }, 400, cors);
        set.push('avatar=?'); bind.push(b.avatar);
      }
      if (b.email != null) {
        const em = normEmail(b.email); if (!em.ok) return json({ err: em.err }, 400, cors);
        // 找回密码邮箱＝账号的第二把钥匙：改掉它就能走 email_code → reset 拿走整个账号。
        // 所以和「重新生成恢复码」同规矩 —— 必须重验当前密码，光有会话不够
        // （借到一台已登录的手机就能改走，原主人会被彻底锁在门外）。
        const me = await env.DB.prepare('SELECT username,provider,pass_salt,pass_hash,email FROM users WHERE id=?').bind(uid).first();
        if (!me) return json({ err: '账号不存在' }, 404, cors);
        if ((me.email || '') !== (em.val || '')) {
          if (me.provider === 'pw' && me.pass_hash) {
            const c = await rateCheck(env, 'lgu:' + me.username, RL.lgu.limit);
            if (!c.ok) return tooMany(cors, c.retry);
            if (await pbkdf2(String(b.password || ''), me.pass_salt) !== me.pass_hash) {
              await rateHit(env, 'lgu:' + me.username, RL.lgu.limit, RL.lgu.win);
              return json({ err: '请输入当前密码以确认修改邮箱' }, 400, cors);
            }
          } else {
            // 第三方账号既没密码也没恢复码，会话内无从二次验证。它们本来就靠
            // GitHub/Google 回来登录，不需要找回邮箱 —— 直接不给改。
            return json({ err: '第三方登录账号无需设置找回邮箱' }, 400, cors);
          }
          // 换了邮箱，之前那次「邮箱已验证」的结论作废，未用完的验证码一并清掉
          set.push('email_ok=?'); bind.push(0);
          set.push('mail_hash=?'); bind.push(null);
          set.push('mail_salt=?'); bind.push(null);
          set.push('mail_exp=?'); bind.push(null);
          set.push('mail_try=?'); bind.push(0);
        }
        set.push('email=?'); bind.push(em.val);
      }
      if (b.av_bg != null) {
        if (!AV_BG.includes(b.av_bg)) return json({ err: '背景色不在可选范围' }, 400, cors);
        set.push('av_bg=?'); bind.push(b.av_bg);
      }
      if (b.sig != null) { set.push('sig=?'); bind.push(cleanText(b.sig, 60)); }
      if (!set.length) return json({ err: '无更新内容' }, 400, cors);
      set.push('updated=?'); bind.push(Date.now()); bind.push(uid);
      await env.DB.prepare('UPDATE users SET ' + set.join(',') + ' WHERE id=?').bind(...bind).run();
      const u = await env.DB.prepare('SELECT username,nickname,avatar,av_bg,sig FROM users WHERE id=?').bind(uid).first();
      return json({ ok: 1, user: u }, 200, cors);
    }

    // ───────── 学习动态 Feed（关注的人 + 自己；纯系统事件） ─────────
    if (M === 'GET' && path === '/api/feed') {
      const uid = await auth(req, env);
      if (!uid) return json({ err: '未登录' }, 401, cors);
      const rows = await env.DB.prepare(
        'SELECT a.type,a.data,a.ts,u.username,u.nickname,u.avatar,u.av_bg FROM activity a JOIN users u ON u.id=a.uid ' +
        'WHERE a.uid=? OR a.uid IN (SELECT followee FROM follows WHERE follower=?) ORDER BY a.ts DESC LIMIT 50'
      ).bind(uid, uid).all();
      return json({ list: rows.results }, 200, cors);
    }

    // ───────── 排行榜 / 公开主页 ─────────
    if (M === 'GET' && path === '/api/leaderboard') {
      const cols = { known: 'known', streak: 'best_streak', total: 'total' };
      const by = cols[url.searchParams.get('by')] ? url.searchParams.get('by') : 'known';
      const col = cols[by];
      let where = col + '>0', binds = [];
      if (url.searchParams.get('scope') === 'friends') {
        const uid = await auth(req, env);
        if (!uid) return json({ err: '未登录' }, 401, cors);
        where += ' AND (id=? OR id IN (SELECT followee FROM follows WHERE follower=?))';
        binds = [uid, uid];
      }
      const [count, rows] = await Promise.all([
        env.DB.prepare('SELECT COUNT(*) AS total FROM users WHERE ' + where).bind(...binds).first(),
        env.DB.prepare(
        'SELECT id,username,nickname,avatar,av_bg,known,best_streak,total,level,badges FROM users WHERE ' + where + ' ORDER BY ' + col + ' DESC, updated ASC LIMIT 50'
        ).bind(...binds).all(),
      ]);
      const list = rows.results.map(r => ({
        username: r.username, nickname: r.nickname, avatar: r.avatar, av_bg: r.av_bg, level: r.level,
        known: r.known, streak: r.best_streak, total: r.total,
        badges: badgeList(r.badges, r.id).length,     // id 只用来算创始人，不进返回体
      }));
      return json({ by, total: Number(count?.total || 0), list }, 200, cors);
    }
    if (M === 'GET' && path === '/api/profile') {
      const name = String(url.searchParams.get('name') || '').trim().toLowerCase();
      const u = await env.DB.prepare('SELECT id,username,nickname,avatar,av_bg,sig,provider,known,streak,best_streak,total,quiz,level,badges,created FROM users WHERE username=?').bind(name).first();
      if (!u) return json({ err: '用户不存在' }, 404, cors);
      const pid = u.id; delete u.id;
      u.badges = badgeList(u.badges, pid).join(',');   // 同上：别人看别人的资料页
      const rank = await env.DB.prepare('SELECT COUNT(*)+1 c FROM users WHERE known>?').bind(u.known || 0).first();
      const fc = await followCounts(env, pid);
      let isFollowing = false;
      const viewer = await auth(req, env);
      if (viewer && viewer !== pid) {
        const f = await env.DB.prepare('SELECT 1 FROM follows WHERE follower=? AND followee=?').bind(viewer, pid).first();
        isFollowing = !!f;
      }
      return json({ user: u, rank: rank.c, followers: fc.followers, following: fc.following, isFollowing, isMe: viewer === pid }, 200, cors);
    }

    if (path.startsWith('/api/')) return json({ err: '接口不存在' }, 404, cors);
    return new Response('uuoo app', { headers: cors });
  },
};

async function followCounts(env, uid) {
  const a = await env.DB.prepare('SELECT COUNT(*) c FROM follows WHERE followee=?').bind(uid).first();
  const b = await env.DB.prepare('SELECT COUNT(*) c FROM follows WHERE follower=?').bind(uid).first();
  return { followers: a.c, following: b.c };
}

// FOUNDER_MAX：创始人 = 前 N 个注册账号（按自增 id）。
// 注意 users.id 是 AUTOINCREMENT，注销的账号会永久占掉号段、不会有人补位。
const FOUNDER_MAX = 100;

// 读取时补齐"派生徽章"。
// 起因：users.badges 这一列**只有 POST /api/sync 会回写**，而注册/OAuth 建号的
// 两条 INSERT 都不写它（默认空串）。于是一个前 100 号但还没同步过一次的账号，
// 在别人看到的公开资料页、关注列表、排行榜计数里统统没有创始人徽章。
// 创始人跟学习进度无关、纯由 id 决定，没理由让它取决于"有没有同步过"——
// 读的时候直接算出来，badges 列退化成缓存，历史数据也就不用迁移了。
function badgeList(stored, uid) {
  const set = new Set(String(stored || '').split(',').filter(Boolean));
  if (uid && uid <= FOUNDER_MAX) set.add('founder');
  return [...set];
}

// 徽章判定（服务端唯一真值；前端 BADGES 用同一套门槛渲染灰/亮，两边必须一致）
// 没有"注册就送"的徽章——全部要靠学习/资历挣。创始人=前 100 个注册账号（按自增 id）。
function computeBadges(s, uid) {
  const b = [];
  if (uid && uid <= FOUNDER_MAX) b.push('founder');
  [[7, 'streak7'], [30, 'streak30'], [100, 'streak100'], [365, 'streak365']].forEach(([n, id]) => { if (s.best >= n) b.push(id); });
  [[100, 'word100'], [500, 'word500'], [1000, 'word1000'], [2000, 'word2000']].forEach(([n, id]) => { if (s.known >= n) b.push(id); });
  [[500, 'study500'], [2000, 'study2000'], [10000, 'study10000']].forEach(([n, id]) => { if (s.total >= n) b.push(id); });
  [[200, 'quiz200'], [1000, 'quiz1000']].forEach(([n, id]) => { if (s.quiz >= n) b.push(id); });
  return b;
}

// OAuth 用户：已存在则返回 id，否则新建（用户名唯一、随机头像）
async function oauthUpsert(env, provider, pid, login, name) {
  const found = await env.DB.prepare('SELECT id FROM users WHERE provider=? AND provider_id=?').bind(provider, pid).first();
  if (found) return found.id;
  const raw = provider === 'google' ? ('g_' + String(login || pid).split('@')[0]) : ('gh_' + (login || pid));
  let base = raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 18) || (provider[0] + '_' + pid);
  let uname = base, i = 1;
  while (await env.DB.prepare('SELECT id FROM users WHERE username=?').bind(uname).first()) uname = base + (++i);
  const nick = cleanText(name || login || uname, 20) || uname, now = Date.now();
  const r = await env.DB.prepare('INSERT INTO users (username,nickname,provider,provider_id,avatar,av_bg,created,updated) VALUES (?,?,?,?,?,?,?,?)')
    .bind(uname, nick, provider, pid, pick(AV_EMOJI), pick(AV_BG), now, now).run();
  return r.meta.last_row_id;
}

function json(obj, status, cors) { return new Response(JSON.stringify(obj), { status: status || 200, headers: Object.assign({}, JSONH, cors || {}) }); }
const tooMany = (cors, retry) => json({ err: '操作过于频繁，请稍后再试', retry }, 429, cors);

// 频控：固定窗口计数，单语句 UPSERT+RETURNING（写后读无竞态）。cnt>limit → 拒（被拒也计数）。
async function rateHit(env, key, limit, windowMs) {
  const now = Date.now();
  const r = await env.DB.prepare(
    'INSERT INTO ratelimit (k, cnt, exp) VALUES (?1, 1, ?2) ' +
    'ON CONFLICT(k) DO UPDATE SET ' +
    'cnt = CASE WHEN ratelimit.exp <= ?3 THEN 1 ELSE ratelimit.cnt + 1 END, ' +
    'exp = CASE WHEN ratelimit.exp <= ?3 THEN ?2 ELSE ratelimit.exp END ' +
    'RETURNING cnt, exp'
  ).bind(key, now + windowMs, now).first();
  return { ok: r.cnt <= limit, retry: Math.max(1, Math.ceil((r.exp - now) / 1000)) };
}
// 只读检查是否已超限（不计数；配额已耗尽即 cnt>=limit 就拒）
async function rateCheck(env, key, limit) {
  const now = Date.now();
  const r = await env.DB.prepare('SELECT cnt,exp FROM ratelimit WHERE k=?').bind(key).first();
  if (!r || r.exp <= now || r.cnt < limit) return { ok: true, retry: 0 };
  return { ok: false, retry: Math.max(1, Math.ceil((r.exp - now) / 1000)) };
}
async function body(req) { try { return JSON.parse(await req.text()); } catch { return {}; } }
function rndHex(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(x => x.toString(16).padStart(2, '0')).join(''); }
async function pbkdf2(pw, saltHex) {
  const salt = Uint8Array.from(saltHex.match(/../g).map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function newSession(env, uid) {
  const token = rndHex(24), now = Date.now();
  const SESSION_TTL_MS = 180 * 86400000;
  // 发新会话时顺手清理过期数据，防 sessions/oauth_state 无限堆积
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE exp<?').bind(now),
    env.DB.prepare('DELETE FROM oauth_state WHERE exp<?').bind(now),
    env.DB.prepare('DELETE FROM ratelimit WHERE exp<?').bind(now),
    env.DB.prepare('INSERT INTO sessions (token,uid,exp) VALUES (?,?,?)').bind(token, uid, now + SESSION_TTL_MS),
  ]);
  return token;
}
// 只接受 Authorization: Bearer，避免 token 出现在 URL、Referer 或访问日志中。
function getToken(req) {
  const h = req.headers.get('Authorization') || '';
  return h.replace(/^Bearer\s+/i, '');
}
async function auth(req, env) {
  const t = getToken(req);
  if (!t) return null;
  const s = await env.DB.prepare('SELECT uid,exp FROM sessions WHERE token=?').bind(t).first();
  if (!s || s.exp < Date.now()) return null;
  return s.uid;
}
