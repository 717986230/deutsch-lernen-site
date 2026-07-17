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

export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(req.url);
    const path = url.pathname;
    const M = req.method;

    // ───────── 匿名埋点 ─────────
    if (M === 'POST' && path === '/collect') {
      let d;
      try { d = JSON.parse(await req.text()); } catch { return new Response('bad json', { status: 400, headers: cors }); }
      const cut = (v, n) => (v == null ? '' : String(v)).slice(0, n);
      const vid = cut(d.vid, 40), sid = cut(d.sid, 20), p = cut(d.path, 200), ref = cut(d.ref, 300), ua = cut(d.ua, 300);
      const country = (req.cf && req.cf.country) || '';
      const evs = Array.isArray(d.events) ? d.events.slice(0, 50) : [];
      if (evs.length) {
        const stmt = env.DB.prepare('INSERT INTO events (ts,vid,sid,name,props,path,ref,ua,country) VALUES (?,?,?,?,?,?,?,?,?)');
        await env.DB.batch(evs.map(e => stmt.bind(
          e.t || Date.now(), vid, sid, cut(e.n, 40),
          e.p ? JSON.stringify(e.p).slice(0, 500) : null, p, ref, ua, country)));
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
      return json({ days, pv: pv.c, uv: uv.c, users: users.c, byEvent: byEvent.results, byView: byView.results }, 200, cors);
    }

    // ───────── 账号：注册 / 登录 ─────────
    if (M === 'POST' && path === '/api/register') {
      const b = await body(req);
      const name = String(b.username || '').trim().toLowerCase();
      const nick = cleanText(b.nickname, 20) || name;
      const pw = String(b.password || '');
      if (!/^[a-z0-9_]{3,20}$/.test(name)) return json({ err: '用户名需 3-20 位，仅小写字母/数字/下划线' }, 400, cors);
      if (pw.length < 6) return json({ err: '密码至少 6 位' }, 400, cors);
      const exist = await env.DB.prepare('SELECT id FROM users WHERE username=?').bind(name).first();
      if (exist) return json({ err: '用户名已被占用' }, 400, cors);
      const salt = rndHex(16), hash = await pbkdf2(pw, salt), now = Date.now();
      const r = await env.DB.prepare('INSERT INTO users (username,nickname,pass_salt,pass_hash,provider,avatar,av_bg,created,updated) VALUES (?,?,?,?,?,?,?,?,?)')
        .bind(name, nick, salt, hash, 'pw', pick(AV_EMOJI), pick(AV_BG), now, now).run();
      return json({ token: await newSession(env, r.meta.last_row_id), user: { username: name, nickname: nick } }, 200, cors);
    }
    if (M === 'POST' && path === '/api/login') {
      const b = await body(req);
      const name = String(b.username || '').trim().toLowerCase();
      const u = await env.DB.prepare('SELECT * FROM users WHERE username=?').bind(name).first();
      if (!u || !u.pass_hash) return json({ err: '用户名或密码错误' }, 400, cors);
      const hash = await pbkdf2(String(b.password || ''), u.pass_salt);
      if (hash !== u.pass_hash) return json({ err: '用户名或密码错误' }, 400, cors);
      return json({ token: await newSession(env, u.id), user: { username: u.username, nickname: u.nickname } }, 200, cors);
    }

    // ───────── 第三方登录（GitHub / Google，配置化） ─────────
    const om = path.match(/^\/api\/oauth\/(github|google)\/(start|callback)$/);
    if (M === 'GET' && om) {
      const prov = OAUTH[om[1]], step = om[2], site = env.SITE_URL || url.origin;
      const cid = prov.cid(env);
      if (!cid) return new Response('该登录方式未配置', { status: 500 });
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

    // ───────── 同步学习数据（需登录） ─────────
    if (M === 'POST' && path === '/api/sync') {
      const uid = await auth(req, env);
      if (!uid) return json({ err: '未登录' }, 401, cors);
      const b = await body(req);
      const clamp = (v) => Math.max(0, Math.min(1e7, v | 0));
      const known = clamp(b.known), streak = clamp(b.streak), best = clamp(b.best), total = clamp(b.total), quiz = clamp(b.quiz);
      const level = String(b.level || 'A1').slice(0, 4);
      const old = await env.DB.prepare('SELECT badges,best_streak FROM users WHERE id=?').bind(uid).first();
      const list = computeBadges({ known, streak, best: Math.max(best, streak), total, quiz }, uid);
      const badges = list.join(',');
      const now = Date.now();
      await env.DB.prepare('UPDATE users SET known=?,streak=?,best_streak=MAX(best_streak,?,?),total=?,quiz=?,level=?,badges=?,updated=? WHERE id=?')
        .bind(known, streak, best, streak, total, quiz, level, badges, now, uid).run();
      // 学习动态：纯系统事件（新徽章 / 打卡破纪录），供关注者的 Feed
      if (old) {
        const had = new Set((old.badges || '').split(',').filter(Boolean));
        const acts = list.filter(id => !had.has(id)).map(id => ['badge', id]);
        const newBest = Math.max(best, streak);
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
      const u = await env.DB.prepare('SELECT username,nickname,avatar,av_bg,sig,provider,known,streak,best_streak,total,quiz,level,badges,created FROM users WHERE id=?').bind(uid).first();
      if (!u) return json({ err: '账号不存在' }, 404, cors);
      const rank = await env.DB.prepare('SELECT COUNT(*)+1 c FROM users WHERE known>?').bind(u.known || 0).first();
      const fc = await followCounts(env, uid);
      return json({ user: u, rank: rank.c, followers: fc.followers, following: fc.following }, 200, cors);
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
      const rows = await env.DB.prepare('SELECT u.username,u.nickname,u.avatar,u.av_bg,u.known,u.best_streak,u.level,u.badges FROM follows f JOIN users u ON u.id=f.followee WHERE f.follower=? ORDER BY u.known DESC LIMIT 100').bind(uid).all();
      const list = rows.results.map(r => ({ username: r.username, nickname: r.nickname, avatar: r.avatar, av_bg: r.av_bg, known: r.known, streak: r.best_streak, level: r.level, badges: (r.badges || '').split(',').filter(Boolean).length }));
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
      const rows = await env.DB.prepare(
        'SELECT username,nickname,avatar,av_bg,known,best_streak,total,level,badges FROM users WHERE ' + where + ' ORDER BY ' + col + ' DESC, updated ASC LIMIT 50'
      ).bind(...binds).all();
      const list = rows.results.map(r => ({
        username: r.username, nickname: r.nickname, avatar: r.avatar, av_bg: r.av_bg, level: r.level,
        known: r.known, streak: r.best_streak, total: r.total,
        badges: (r.badges || '').split(',').filter(Boolean).length,
      }));
      return json({ by, list }, 200, cors);
    }
    if (M === 'GET' && path === '/api/profile') {
      const name = String(url.searchParams.get('name') || '').trim().toLowerCase();
      const u = await env.DB.prepare('SELECT id,username,nickname,avatar,av_bg,sig,provider,known,streak,best_streak,total,quiz,level,badges,created FROM users WHERE username=?').bind(name).first();
      if (!u) return json({ err: '用户不存在' }, 404, cors);
      const pid = u.id; delete u.id;
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

    return new Response('uuoo app');
  },
};

async function followCounts(env, uid) {
  const a = await env.DB.prepare('SELECT COUNT(*) c FROM follows WHERE followee=?').bind(uid).first();
  const b = await env.DB.prepare('SELECT COUNT(*) c FROM follows WHERE follower=?').bind(uid).first();
  return { followers: a.c, following: b.c };
}

// 徽章判定（服务端唯一真值；前端 BADGES 用同一套门槛渲染灰/亮，两边必须一致）
// 没有"注册就送"的徽章——全部要靠学习/资历挣。创始人=前 100 个注册账号（按自增 id）。
function computeBadges(s, uid) {
  const b = [];
  if (uid && uid <= 100) b.push('founder');
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
async function body(req) { try { return JSON.parse(await req.text()); } catch { return {}; } }
function rndHex(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(x => x.toString(16).padStart(2, '0')).join(''); }
async function pbkdf2(pw, saltHex) {
  const salt = Uint8Array.from(saltHex.match(/../g).map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function newSession(env, uid) {
  const token = rndHex(24);
  await env.DB.prepare('INSERT INTO sessions (token,uid,exp) VALUES (?,?,?)').bind(token, uid, Date.now() + 180 * 86400000).run();
  return token;
}
async function auth(req, env) {
  const h = req.headers.get('Authorization') || '';
  const t = h.replace(/^Bearer\s+/i, '') || new URL(req.url).searchParams.get('token');
  if (!t) return null;
  const s = await env.DB.prepare('SELECT uid,exp FROM sessions WHERE token=?').bind(t).first();
  if (!s || s.exp < Date.now()) return null;
  return s.uid;
}
