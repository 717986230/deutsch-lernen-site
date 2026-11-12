// 排行榜只收 30 天内活跃的账号（站长 2026-11-12 拍板）：把真的 worker.js 挂在真的 SQLite 上验证。
//   · 30 天内登录/访问过的人上榜，更久没来的不上榜，total 只数活跃的人
//   · 回填：老库里没有 user_seen 记录的人，按已有的最晚活动痕迹补上
//   · 不活跃的人重新打开网站（带有效 token 请求 /api/me）后立刻回榜
//   · /api/me、/api/profile 里的名次也只在活跃用户里排
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };
const ok = (m) => console.log('  ✓ ' + m);
const db = new DatabaseSync(':memory:');
const schema = readFileSync(join(ROOT, 'analytics/schema.sql'), 'utf8');
db.exec(schema);
const stmt = (sql) => {
  const make = (b) => ({
    bind: (...a) => make(a.map((v) => (v === undefined ? null : (typeof v === 'boolean' ? +v : v)))),
    first() { const r = db.prepare(sql).get(...b); return r === undefined ? null : r; },
    all() { return { results: db.prepare(sql).all(...b) }; },
    run() { const r = db.prepare(sql).run(...b); return { meta: { changes: r.changes, last_row_id: r.lastInsertRowid } }; },
  });
  return make([]);
};
const env = { DB: { prepare: stmt, batch: async (list) => list.map((s) => s.run()) } };
const worker = (await import(pathToFileURL(join(ROOT, 'analytics/worker.js')).href)).default;
const call = async (method, path, body, token) => {
  const h = { origin: 'https://www.uuoo.site', 'CF-Connecting-IP': '203.0.113.' + Math.floor(Math.random() * 250) };
  if (token) h.Authorization = 'Bearer ' + token;
  const res = await worker.fetch(new Request('https://api.test' + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }), env, { waitUntil() {} });
  let data = {}; try { data = await res.json(); } catch (_) {}
  return { status: res.status, data };
};

const DAY = 86400000, now = Date.now();
// 老库里的三个人（部署前就存在、user_seen 里没有记录）
const ins = db.prepare('INSERT INTO users (username,nickname,known,created,updated) VALUES (?,?,?,?,?)');
ins.run('fresh', '最近同步过', 50, now - 100 * DAY, now - 3 * DAY);
ins.run('stale', '两个月没来', 999, now - 100 * DAY, now - 60 * DAY);
const loginOnly = Number(ins.run('loginonly', '只是登录过', 10, now - 100 * DAY, now - 90 * DAY).lastInsertRowid);
db.prepare('INSERT INTO sessions (token,uid,exp) VALUES (?,?,?)').run('tok-login', loginOnly, now - 5 * DAY + 180 * DAY);
const staleId = db.prepare("SELECT id FROM users WHERE username='stale'").get().id;
db.prepare('INSERT INTO sessions (token,uid,exp) VALUES (?,?,?)').run('tok-stale', staleId, now - 40 * DAY + 180 * DAY);
db.exec(schema);   // 部署时重跑 schema.sql = 回填

const names = (r) => (r.data.list || []).map((u) => u.username).join(',');
let r = await call('GET', '/api/leaderboard?by=known');
if (r.status !== 200) bad('排行榜接口 ' + r.status);
if (names(r) !== 'fresh,loginonly') bad('回填后榜单应为 fresh,loginonly，实际 ' + names(r));
else ok('回填：3 天前同步过、5 天前登录过的上榜，60 天没来的不上榜');
if (r.data.total !== 2) bad('total 应只数活跃的 2 人，实际 ' + r.data.total); else ok('total 只数活跃人数');

// 新注册的人立刻上榜
const reg = await call('POST', '/api/register', { username: 'newbie', nickname: '新人', password: 'correct-horse' });
if (!reg.data.token) bad('注册失败 ' + JSON.stringify(reg.data));
r = await call('GET', '/api/leaderboard?by=known');
if (!names(r).includes('newbie')) bad('新注册用户没上榜：' + names(r)); else ok('新注册用户立刻上榜');

// stale 带着还没过期的 token 重新打开网站 → 回榜
const me = await call('GET', '/api/me', undefined, 'tok-stale');
if (me.status !== 200) bad('/api/me ' + me.status);
if (me.data.rank !== 1) bad('stale 回来后名次应为 1，实际 ' + me.data.rank); else ok('/api/me 名次只在活跃用户里排');
r = await call('GET', '/api/leaderboard?by=known');
if (names(r).split(',')[0] !== 'stale') bad('stale 重新访问后应回榜首：' + names(r)); else ok('老用户重新打开网站后立刻回榜');

// 把 fresh 拨到 31 天前：下榜，但公开主页仍可访问，名次按活跃用户算
db.prepare("UPDATE user_seen SET ts=? WHERE uid=(SELECT id FROM users WHERE username='fresh')").run(now - 31 * DAY);
r = await call('GET', '/api/leaderboard?by=known');
if (names(r).includes('fresh')) bad('31 天没来仍在榜上：' + names(r)); else ok('超过 30 天未活跃即下榜');
const pf = await call('GET', '/api/profile?name=fresh');
if (pf.status !== 200 || pf.data.rank !== 2) bad('公开主页名次应为 2（stale 999 在前），实际 ' + pf.status + ' ' + pf.data.rank); else ok('公开主页名次只数活跃用户');

// 好友榜同样只收活跃的人（自己总是活跃的）
r = await call('GET', '/api/leaderboard?by=known&scope=friends', undefined, reg.data.token);
if (r.status !== 200 || names(r) !== 'newbie') bad('好友榜异常：' + r.status + ' ' + names(r)); else ok('好友榜正常');

// 注销账号会清掉活跃记录
await call('POST', '/api/account/delete', { password: 'correct-horse' }, reg.data.token);
if (db.prepare("SELECT COUNT(*) c FROM user_seen WHERE uid NOT IN (SELECT id FROM users)").get().c) bad('注销后 user_seen 有残留'); else ok('注销账号同时删除活跃记录');

if (fail) { console.error(`✗ 排行榜活跃筛选：${fail} 项失败`); process.exit(1); }
console.log('OK 排行榜只收 30 天内活跃用户');
