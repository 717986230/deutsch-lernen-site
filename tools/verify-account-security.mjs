// 账号安全回归：把真的 worker.js 挂在真的 SQLite 上，重放几条已知的接管路径。
//
// 起因是一次审计里发现的完整接管链（借到一台已登录的手机就够）：
//   ① POST /api/profile/update {email:"攻击者@x"}  ← 当时只验会话，不验密码
//   ② POST /api/account/email_code {username}      ← 验证码发到攻击者信箱
//   ③ POST /api/account/reset {username,emailCode,new}
//   ④ reset 会踢掉全部会话并换掉恢复码 —— 原主人被永久锁在门外
// 第三方账号更糟：它们本来没有密码，走完 ③ 反而**凭空多出**一条用户名+密码登录
// 通道（/api/login 只看 pass_hash、不看 provider）。
//
// 这类洞看代码很容易看漏（每个端点单独看都「验过身份」了），所以钉成可执行用例。
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };
const ok = (m) => console.log('  ✓ ' + m);

// ── 最小 D1 垫片：worker 只用到 prepare/bind/first/all/run/batch ──
const db = new DatabaseSync(':memory:');
db.exec(readFileSync(join(ROOT, 'analytics/schema.sql'), 'utf8'));
const stmt = (sql) => {
  // D1 的 stmt.bind() 返回**新**语句，原语句不变；早先这里写成「改 this 再 return this」，
  // 于是 batch(acts.map(a => st.bind(...a))) 里所有元素都是同一个对象、绑的是最后一组值，
  // 测出来的行为跟线上不是一回事（会把 N 条不同动态测成 N 条一样的）。
  const make = (b) => ({
    bind: (...a) => make(a.map((v) => (v === undefined ? null : (typeof v === 'boolean' ? +v : v)))),
    first() { const r = db.prepare(sql).get(...b); return r === undefined ? null : r; },
    all() { return { results: db.prepare(sql).all(...b) }; },
    run() { const r = db.prepare(sql).run(...b); return { meta: { changes: r.changes, last_row_id: r.lastInsertRowid } }; },
  });
  return make([]);
};
const DB = { prepare: stmt, batch: async (list) => list.map((s) => s.run()) };

// 验证码只在邮件正文里出现一次，所以发信必须拦下来 —— 攻击链的关键一环正是「码发给了谁」
const mailbox = [];
let mailBroken = false;                       // 置 true 模拟 Resend 挂了
const env = { DB, SITE: 'https://www.uuoo.site', SITE_URL: 'https://www.uuoo.site',
  MAIL_FROM: 'no-reply@uuoo.site', RESEND_API_KEY: 'test',
  GH_CLIENT_ID: 'cid', GH_CLIENT_SECRET: 'sec' };

// 拦 fetch：Resend 发信接口直接记账返回成功
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  const s = String(u);
  if (s.includes('resend.com')) {
    if (mailBroken) return new Response(JSON.stringify({ message: 'service down' }), { status: 500 });
    const b = JSON.parse(o.body);
    mailbox.push({ to: Array.isArray(b.to) ? b.to[0] : b.to, html: b.html || b.text || '' });
    return new Response(JSON.stringify({ id: 'x' }), { status: 200 });
  }
  // GitHub OAuth 的两个外部端点：换 token / 取用户信息
  if (s.includes('github.com/login/oauth/access_token')) return new Response(JSON.stringify({ access_token: 'gho_x' }), { status: 200 });
  if (s.includes('api.github.com/user')) return new Response(JSON.stringify({ id: 4242, login: 'octo', name: 'Octo' }), { status: 200 });
  return realFetch(u, o);
};

const worker = (await import(pathToFileURL(join(ROOT, 'analytics/worker.js')).href)).default;
const call = async (method, path, body, token, extraHeaders) => {
  const h = Object.assign({ origin: 'https://www.uuoo.site', 'CF-Connecting-IP': '203.0.113.' + Math.floor(Math.random() * 250) }, extraHeaders || {});
  if (token) h.Authorization = 'Bearer ' + token;
  const res = await worker.fetch(new Request('https://api.test' + path, {
    method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual',
  }), env, { waitUntil() {} });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  return { status: res.status, ok: res.ok, data,
    location: res.headers.get('Location') || '', setCookie: res.headers.get('Set-Cookie') || '' };
};

// ─────────────────────────────────────────────────────────
// ① 密码账号：改找回邮箱必须重验当前密码
// ─────────────────────────────────────────────────────────
const reg = await call('POST', '/api/register', { username: 'victim', nickname: '受害者', password: 'correct-horse' });
if (!reg.data.token) { bad(`注册失败：${JSON.stringify(reg.data)}`); }
const victimToken = reg.data.token;

let r = await call('POST', '/api/profile/update', { email: 'attacker@evil.test' }, victimToken);
if (r.ok) bad('只凭会话就改掉了找回邮箱 —— 接管链第 ① 步没堵住');
else ok(`不带密码改邮箱被拒（${r.status} ${r.data.err}）`);

r = await call('POST', '/api/profile/update', { email: 'attacker@evil.test', password: 'wrong-guess' }, victimToken);
if (r.ok) bad('密码错误也让改了找回邮箱');
else ok(`密码错误改邮箱被拒（${r.status} ${r.data.err}）`);

// 昵称/头像这类无关字段不该被误伤
r = await call('POST', '/api/profile/update', { nickname: '新昵称' }, victimToken);
if (!r.ok) bad(`改昵称被误伤了：${JSON.stringify(r.data)}`);
else ok('改昵称/头像不受影响，仍然只要会话');

// 带对密码才能改
r = await call('POST', '/api/profile/update', { email: 'me@own.test', password: 'correct-horse' }, victimToken);
if (!r.ok) bad(`带对密码仍然改不了邮箱：${JSON.stringify(r.data)}`);
else ok('带对当前密码可以改邮箱');

// 改完邮箱：email_ok 必须归零，旧验证码必须作废
const after = db.prepare('SELECT email,email_ok,mail_hash FROM users WHERE username=?').get('victim');
if (after.email !== 'me@own.test') bad(`邮箱没落库：${after.email}`);
if (after.email_ok) bad('换邮箱后 email_ok 没归零 —— 新邮箱等于白捡一个「已验证」');
if (after.mail_hash) bad('换邮箱后旧验证码没作废');
if (after.email === 'me@own.test' && !after.email_ok && !after.mail_hash) ok('换邮箱后 email_ok 归零、旧验证码作废');

// ─────────────────────────────────────────────────────────
// ② 第三方账号：不给设找回邮箱，也不能被 reset 造出密码
// ─────────────────────────────────────────────────────────
db.prepare('INSERT INTO users (username,nickname,provider,provider_id,avatar,av_bg,created,updated) VALUES (?,?,?,?,?,?,?,?)')
  .run('gh_alice', 'Alice', 'github', '9001', '🦊', '#58cc02', Date.now(), Date.now());
const ghUid = db.prepare('SELECT id FROM users WHERE username=?').get('gh_alice').id;
const ghToken = 'a'.repeat(48);
db.prepare('INSERT INTO sessions (token,uid,exp) VALUES (?,?,?)').run(ghToken, ghUid, Date.now() + 864e5);

r = await call('POST', '/api/profile/update', { email: 'attacker@evil.test' }, ghToken);
if (r.ok) bad('第三方账号被设上了找回邮箱 —— 它没有密码可二次验证，等于白送一把钥匙');
else ok(`第三方账号拒绝设置找回邮箱（${r.status} ${r.data.err}）`);

// 就算库里被别的途径写进了邮箱，reset 也不能给它造出密码
db.prepare('UPDATE users SET email=? WHERE id=?').run('attacker@evil.test', ghUid);
mailbox.length = 0;
await call('POST', '/api/account/email_code', { username: 'gh_alice' });
const code = (mailbox[0] && (mailbox[0].html.match(/\b(\d{6})\b/) || [])[1]) || '';
if (!code) {
  ok('第三方账号连验证码都发不出去（更保险）');
} else {
  r = await call('POST', '/api/account/reset', { username: 'gh_alice', emailCode: code, new: 'attacker-pw' });
  if (r.ok) bad('凭一封邮件给第三方账号造出了用户名+密码登录通道');
  else ok(`第三方账号 reset 被拒（${r.status} ${r.data.err}）`);
}
const ghRow = db.prepare('SELECT pass_hash FROM users WHERE id=?').get(ghUid);
if (ghRow.pass_hash) bad('第三方账号被写入了 pass_hash —— /api/login 只看 pass_hash，等于可以密码登录了');
else ok('第三方账号始终没有 pass_hash');

// ─────────────────────────────────────────────────────────
// ③ 正常的密码账号找回流程不能被上面的收紧误伤
// ─────────────────────────────────────────────────────────
mailbox.length = 0;
await call('POST', '/api/account/email_code', { username: 'victim' });
const vcode = (mailbox[0] && (mailbox[0].html.match(/\b(\d{6})\b/) || [])[1]) || '';
if (!vcode) bad('密码账号收不到验证码 —— 找回流程被误伤');
else {
  if (mailbox[0].to !== 'me@own.test') bad(`验证码发错人了：${mailbox[0].to}`);
  r = await call('POST', '/api/account/reset', { username: 'victim', emailCode: vcode, new: 'brand-new-pw' });
  if (!r.ok) bad(`密码账号邮箱找回被误伤：${JSON.stringify(r.data)}`);
  else ok('密码账号的邮箱找回流程照常可用');
  const login = await call('POST', '/api/login', { username: 'victim', password: 'brand-new-pw' });
  if (!login.ok) bad('重置后新密码登不进去');
  else ok('重置后可用新密码登录');
}

// ─────────────────────────────────────────────────────────
// ④ 排行榜 by 参数：不能被原型链上的键带进 ORDER BY
// ─────────────────────────────────────────────────────────
// cols['constructor'] / cols['__proto__'] 是继承来的，直接取值也是真值，
// 于是排序列会变成一个函数或 [object Object] 拼进 SQL —— 实测能把接口打成 500。
db.prepare("INSERT INTO users (username,nickname,provider,known,streak,best_streak,total,level,created,updated) VALUES ('lb','lb','pw',7,1,3,9,'A1',1,1)").run();
for (const q of ['', '?by=known', '?by=streak', '?by=total', '?by=constructor', '?by=__proto__', '?by=toString', '?by=known;DROP TABLE users']) {
  let r;
  try { r = await call('GET', '/api/leaderboard' + q); }
  catch (e) { bad(`/api/leaderboard${q} 直接抛异常：${e.message}`); continue; }
  if (r.status !== 200) bad(`/api/leaderboard${q} 返回 ${r.status}，应为 200`);
  else if (!['known', 'streak', 'total'].includes(r.data.by)) bad(`/api/leaderboard${q} 回了非法排序字段 by=${r.data.by}`);
}
if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'").get()) bad('users 表没了');
ok('排行榜 by 参数只认三个白名单值，原型链键与注入串都被挡下');


// ─────────────────────────────────────────────────────────
// ⑤ email_code：发信故障也不能变成「这个账号存不存在」的探测器
// ─────────────────────────────────────────────────────────
// 走到发信那一步时，「用户存在」和「绑了邮箱」两道门槛都已经过了。
// 这时候如果发信失败回 500、其他情况回 200，拿一批用户名扫一遍就能筛出可下手的目标 ——
// 而那正是 email_code → reset 接管链的第一步。
mailBroken = true;
const probeHit = await call('POST', '/api/account/email_code', { username: 'victim' });
const probeMiss = await call('POST', '/api/account/email_code', { username: 'no-such-user-here' });
mailBroken = false;
if (probeHit.status !== probeMiss.status || JSON.stringify(probeHit.data) !== JSON.stringify(probeMiss.data)) {
  bad(`发信故障时响应可区分：存在的账号回 ${probeHit.status} ${JSON.stringify(probeHit.data)}，`
    + `不存在的回 ${probeMiss.status} ${JSON.stringify(probeMiss.data)} —— 等于账号探测器`);
} else ok(`发信故障时存在/不存在的账号回同一句（${probeHit.status}）`);

// ─────────────────────────────────────────────────────────
// ⑥ OAuth：state 必须绑定发起流程的那个浏览器
// ─────────────────────────────────────────────────────────
// 只把 state 存库里挡不住登录 CSRF：攻击者自己走一遍 start 拿到合法 state，
// 再把 callback 链接发给受害者，受害者就「登录」进了攻击者的账号，
// 之后所有学习进度都同步进去。所以 start 时下发同值 Cookie，callback 双提交比对。
const start = await call('GET', '/api/oauth/github/start');
const stateM = /[?&]state=([a-f0-9]+)/.exec(start.location || '');
if (!stateM) bad(`OAuth start 没带 state：${start.status} ${start.location}`);
else {
  const state = stateM[1];
  if (!new RegExp('uuoo_os=' + state + '\\b').test(start.setCookie)) bad(`OAuth start 没有下发绑定用的 Cookie：${start.setCookie}`);
  else ok('OAuth start 下发了与 state 同值的 HttpOnly Cookie');
  if (!/HttpOnly/i.test(start.setCookie) || !/SameSite=Lax/i.test(start.setCookie) || !/Secure/i.test(start.setCookie)) {
    bad(`OAuth Cookie 属性不全（要 HttpOnly + Secure + SameSite=Lax）：${start.setCookie}`);
  }
  // 攻击者把 callback 链接丢给别人：受害者浏览器里没有这个 Cookie
  const noCookie = await call('GET', '/api/oauth/github/callback?code=abc&state=' + state);
  if (!/#login\?err=oauth/.test(noCookie.location || '')) {
    bad(`不带 Cookie 的 callback 竟然通过了：${noCookie.status} ${noCookie.location}`);
  } else ok('不带 Cookie 的 callback 被拒（登录 CSRF 堵住）');
  if (db.prepare('SELECT 1 FROM users WHERE provider=? AND provider_id=?').get('github', '4242')) {
    bad('被拒的 callback 仍然建出了账号');
  }
  // 正常流程：同一浏览器带着 Cookie 回来，必须能登进去
  const s2 = await call('GET', '/api/oauth/github/start');
  const st2 = /[?&]state=([a-f0-9]+)/.exec(s2.location)[1];
  const good = await call('GET', '/api/oauth/github/callback?code=abc&state=' + st2, undefined, undefined, { Cookie: 'uuoo_os=' + st2 });
  if (!/#acct_token=[a-f0-9]+/.test(good.location || '')) bad(`带对 Cookie 的正常第三方登录被误伤：${good.status} ${good.location}`);
  else ok('带对 Cookie 的第三方登录照常可用');
  // state 用过即焚
  const replay = await call('GET', '/api/oauth/github/callback?code=abc&state=' + st2, undefined, undefined, { Cookie: 'uuoo_os=' + st2 });
  if (!/#login\?err=oauth/.test(replay.location || '')) bad('同一个 state 可以重放');
  else ok('state 用过即焚，不能重放');
}

// ─────────────────────────────────────────────────────────
// ⑦ /api/sync：不能拿来灌 activity 表，也不能把排行榜刷到天上
// ─────────────────────────────────────────────────────────
const flood = await call('POST', '/api/register', { username: 'flooder', nickname: 'F', password: 'correct-horse' });
const ftok = flood.data.token;
const actCount = () => db.prepare('SELECT COUNT(*) c FROM activity WHERE uid=(SELECT id FROM users WHERE username=?)').get('flooder').c;
const payload = { known: 500, streak: 10, best: 10, total: 900, quiz: 50 };
for (let i = 0; i < 6; i++) await call('POST', '/api/sync', Object.assign({ lang: 'en' }, payload), ftok);
if (actCount()) bad(`英语同步写出了 ${actCount()} 条动态 —— 徽章去重靠的是 users.badges，而它只在德语分支回写，会无限重复`);
else ok('英语同步不再写 activity（去重状态和写入分支一致）');
await call('POST', '/api/sync', Object.assign({ lang: 'de' }, payload), ftok);
const deOnce = actCount();
if (!deOnce) bad('德语同步一条动态都没写 —— 去重改过头，Feed 空了');
for (let i = 0; i < 6; i++) await call('POST', '/api/sync', Object.assign({ lang: 'de' }, payload), ftok);
if (actCount() !== deOnce) bad(`德语重复同步把动态从 ${deOnce} 条涨到了 ${actCount()} 条`);
else ok(`德语同步只写一次（${deOnce} 条），重复同步不再增长`);

// MAX() 合并是多设备必需的，但上限必须说得通：德语 4253 + 英语 7192 条词，
// known 给到 20000 已经很宽。这里只断言「离谱值进不去」，
// 不可逆本身是设计取舍（换设备时不能让本地的 0 清空云端），文档里写明了。
await call('POST', '/api/sync', { lang: 'de', known: 9999999, streak: 99999, best: 99999, total: 9e9, quiz: 9e9 }, ftok);
const infl = db.prepare("SELECT known,streak,best_streak,total,quiz FROM users WHERE username='flooder'").get();
const caps = { known: 20000, streak: 3650, best_streak: 3650, total: 1000000, quiz: 1000000 };
let capBad = 0;
for (const [k, hi] of Object.entries(caps)) if (infl[k] > hi) { bad(`${k} 被刷到 ${infl[k]}，超过上限 ${hi}`); capBad++; }
if (!capBad) ok(`离谱数值被夹到上限内（known=${infl.known} streak=${infl.streak} total=${infl.total}）`);

console.log(`账号安全回归：重放 ${3} 组接管路径 + 排行榜排序 + 邮箱探测 + OAuth 登录 CSRF + 同步灌水/刷分`);
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 账号接管路径全部堵住，正常找回流程未受影响');
