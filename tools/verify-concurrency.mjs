// 并发回归：把真的 worker.js 挂在真的 SQLite 上，用 Promise.all 同时打同一个接口，
// 钉住几类「先读再写」竞态（2026-11-15 并发审查发现）：
//   ① 同一人同时兑多张码 → 以前后写的覆盖先写的，白丢天数
//   ② 同一张码两人同时兑 → 只能一人成功（这条以前就对，钉住别退化）
//   ③ 并发猜密码 / 猜 6 位邮箱验证码 → 以前「只读查限流 → 验失败才计数」，一口气几十个请求全部放行
//   ④ 两台设备同时同步 → 以前后写的用旧值盖掉先写的较大值，动态也会发两遍
//   ⑤ 同时注册同一个用户名 → 以前第二个撞唯一约束直接 500
//   ⑥ 同一个 OAuth state 同时回调两次 → 以前两次都能过（各发一个会话）
// worker 里每个 await 都是让出点，Promise.all 下各请求会在「读」和「写」之间交错，足以复现这些竞态。
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };
const ok = (m) => console.log('  ✓ ' + m);

const db = new DatabaseSync(':memory:');
db.exec(readFileSync(join(ROOT, 'analytics/schema.sql'), 'utf8'));
// 每次查库都让出一轮事件循环，模拟 D1 的网络往返：并发请求才会真的在「读」和「写」之间交错
const tick = () => new Promise((r) => setImmediate(r));
const stmt = (sql) => {
  const make = (b) => ({
    bind: (...a) => make(a.map((v) => (v === undefined ? null : (typeof v === 'boolean' ? +v : v)))),
    async first() { await tick(); const r = db.prepare(sql).get(...b); return r === undefined ? null : r; },
    async all() { await tick(); return { results: db.prepare(sql).all(...b) }; },
    async run() { await tick(); const r = db.prepare(sql).run(...b); return { meta: { changes: r.changes, last_row_id: r.lastInsertRowid } }; },
    _sync() { const r = db.prepare(sql).run(...b); return { meta: { changes: r.changes, last_row_id: r.lastInsertRowid } }; },
  });
  return make([]);
};
// D1 的 batch 是一个事务：要么全成要么全不成
const DB = {
  prepare: stmt,
  batch: async (list) => {
    await null;
    db.exec('BEGIN');
    try { const out = list.map((s) => s._sync()); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; }
  },
};
const mailbox = [];
const env = { DB, SITE: 'https://www.uuoo.site', SITE_URL: 'https://www.uuoo.site', STATS_KEY: 'admin-secret-key',
  MAIL_FROM: 'no-reply@uuoo.site', RESEND_API_KEY: 'test', GH_CLIENT_ID: 'cid', GH_CLIENT_SECRET: 'sec' };
globalThis.fetch = async (u, o) => {
  const s = String(u);
  if (s.includes('resend.com')) { const b = JSON.parse(o.body); mailbox.push(b.html || b.text || ''); return new Response('{"id":"x"}'); }
  if (s.includes('github.com/login/oauth/access_token')) return new Response(JSON.stringify({ access_token: 'gho_x' }));
  if (s.includes('api.github.com/user')) return new Response(JSON.stringify({ id: 777, login: 'racer', name: 'Racer' }));
  throw new Error('unexpected fetch ' + s);
};
const worker = (await import(pathToFileURL(join(ROOT, 'analytics/worker.js')).href)).default;
let ipN = 0;
const call = async (method, path, body, token, extra) => {
  const h = Object.assign({ origin: 'https://www.uuoo.site', 'CF-Connecting-IP': '198.51.100.' + (++ipN % 250) }, extra || {});
  if (token) h.Authorization = 'Bearer ' + token;
  const res = await worker.fetch(new Request('https://api.test' + path, {
    method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual',
  }), env, { waitUntil() {} });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  return { status: res.status, data, location: res.headers.get('Location') || '', setCookie: res.headers.get('Set-Cookie') || '' };
};
const reg = async (u) => (await call('POST', '/api/register', { username: u, password: 'pass-' + u, email: u + '@example.com' })).data.token;
const DAY = 86400000;

// ① + ② 兑换码
{
  const t = await reg('alice'), t2 = await reg('bob');
  const g = await call('POST', '/api/admin/codes', { n: 6, days: 30 }, null, { 'X-Admin-Key': env.STATS_KEY });
  const cs = g.data.codes || [], c3 = cs[5];
  const before = Date.now();
  const rs = await Promise.all(cs.slice(0, 5).map((c) => call('POST', '/api/redeem', { code: c }, t)));
  if (rs.some((r) => r.status !== 200)) bad('同时兑多张码有失败：' + JSON.stringify(rs.map((r) => r.data)));
  const until = db.prepare('SELECT until FROM memberships WHERE uid=(SELECT id FROM users WHERE username=?)').get('alice').until;
  if (until - before < 149.9 * DAY) bad(`同一人同时兑 5 张 30 天码，只到账 ${((until - before) / DAY).toFixed(1)} 天（应为 150 天）`);
  else ok('同一人同时兑 5 张 30 天码 → 到账 150 天');
  const both = await Promise.all([call('POST', '/api/redeem', { code: c3 }, t), call('POST', '/api/redeem', { code: c3 }, t2)]);
  const wins = both.filter((r) => r.status === 200).length;
  if (wins !== 1) bad(`同一张码两人同时兑，成功了 ${wins} 次`);
  else ok('同一张码两人同时兑 → 只有一人成功');
}

// ③ 并发猜密码：每用户名 10 分钟只允许 10 次失败
{
  await reg('carol');
  const rs = await Promise.all(Array.from({ length: 40 }, () => call('POST', '/api/login', { username: 'carol', password: 'wrong' })));
  const tried = rs.filter((r) => r.status === 400).length, blocked = rs.filter((r) => r.status === 429).length;
  if (tried > 10) bad(`并发 40 次猜密码，真正验了 ${tried} 次（上限 10）`);
  else ok(`并发 40 次猜密码 → 只验了 ${tried} 次，拦下 ${blocked} 次`);
  // 成功登录不计失败：先清桶，连续正确登录 15 次都应成功
  db.prepare("DELETE FROM ratelimit WHERE k LIKE 'lg%'").run();
  let good = 0;
  for (let i = 0; i < 15; i++) if ((await call('POST', '/api/login', { username: 'carol', password: 'pass-carol' })).status === 200) good++;
  if (good !== 15) bad(`连续 15 次正确登录只成功 ${good} 次（成功不该消耗失败额度）`);
  else ok('连续 15 次正确登录全部成功（成功会退回额度）');
}

// ③' 并发猜 6 位邮箱验证码：一枚码最多验 5 次，最后夹一个正确码也不能混过去
{
  await reg('dave');
  await call('POST', '/api/account/email_code', { username: 'dave' });
  const m = /(\d{6})/.exec(mailbox[mailbox.length - 1] || '');
  if (!m) bad('没收到验证码邮件');
  else {
    const right = m[1], wrong = right === '000000' ? '111111' : '000000';
    const reqs = Array.from({ length: 30 }, (_, i) => call('POST', '/api/account/reset', { username: 'dave', emailCode: i === 29 ? right : wrong, new: 'hacked-pw' }));
    const rs = await Promise.all(reqs);
    const tries = db.prepare("SELECT mail_try FROM users WHERE username='dave'").get().mail_try;
    if (rs[29].status === 200) bad('并发 29 次错码 + 1 次正确码，正确码混过去了（5 次上限被绕过）');
    else if (tries > 5) bad(`验证码被验了 ${tries} 次（上限 5）`);
    else ok(`并发 30 次猜验证码 → 只验了 ${tries} 次，夹在最后的正确码没混过去`);
    // 正常流程不受影响：清掉频控、发新码、一次输对
    db.prepare("DELETE FROM ratelimit WHERE k LIKE 'rs%' OR k LIKE 'ml%'").run();
    await call('POST', '/api/account/email_code', { username: 'dave' });
    const code2 = /(\d{6})/.exec(mailbox[mailbox.length - 1])[1];
    const twice = await Promise.all([1, 2].map(() => call('POST', '/api/account/reset', { username: 'dave', emailCode: code2, new: 'new-pass-1' })));
    const okN = twice.filter((r) => r.status === 200).length;
    if (okN !== 1) bad(`同一枚正确验证码同时提交两次，成功了 ${okN} 次（应一次性）`);
    else ok('同一枚验证码同时提交两次 → 只成功一次');
  }
}

// ④ 两台设备同时同步
{
  const t = await reg('erin');
  const rs = await Promise.all([
    call('POST', '/api/sync', { lang: 'de', known: 500, streak: 3, best: 3, total: 600, quiz: 60 }, t),
    call('POST', '/api/sync', { lang: 'de', known: 100, streak: 3, best: 3, total: 50, quiz: 10 }, t),
  ]);
  if (rs.some((r) => r.status !== 200)) bad('并发同步失败：' + JSON.stringify(rs.map((r) => r.data)));
  const p = db.prepare("SELECT known,total,quiz FROM user_language_profiles WHERE uid=(SELECT id FROM users WHERE username='erin') AND lang='de'").get();
  const u = db.prepare("SELECT id,known,badges FROM users WHERE username='erin'").get();
  if (p.known !== 500 || p.total !== 600 || p.quiz !== 60) bad(`并发同步后语言档案被旧值盖掉：${JSON.stringify(p)}`);
  else ok('两台设备同时同步 → 语言档案保留较大值');
  if (u.known !== 500 || !/word500/.test(u.badges || '') || !/quiz50/.test(u.badges || '')) bad(`并发同步后账号汇总/徽章不对：${JSON.stringify(u)}`);
  else ok('两台设备同时同步 → 徽章不互相抹掉');
  const dup = db.prepare('SELECT type,data,COUNT(*) c FROM activity WHERE uid=? GROUP BY type,data HAVING c>1').all(u.id);
  if (dup.length) bad('并发同步插了重复动态：' + JSON.stringify(dup));
  else ok('两台设备同时同步 → 动态不重复');
}

// ⑤ 同时注册同名
{
  const rs = await Promise.all([1, 2, 3].map(() => call('POST', '/api/register', { username: 'frank', password: 'pass-frank' })));
  const codes = rs.map((r) => r.status).sort().join(',');
  if (codes !== '200,400,400') bad(`同时注册同名 3 次，状态码 ${codes}（应 200,400,400，不能 500）`);
  else ok('同时注册同名 → 一个成功，其余提示「用户名已被占用」');
}

// ⑥ 同一 OAuth state 同时回调两次
{
  const st = /[?&]state=([a-f0-9]+)/.exec((await call('GET', '/api/oauth/github/start')).location)[1];
  const cb = () => call('GET', '/api/oauth/github/callback?code=abc&state=' + st, undefined, undefined, { Cookie: 'uuoo_os=' + st });
  const rs = await Promise.all([cb(), cb()]);
  const got = rs.filter((r) => /#acct_token=/.test(r.location)).length;
  const accts = db.prepare("SELECT COUNT(*) c FROM users WHERE provider='github' AND provider_id='777'").get().c;
  if (got !== 1) bad(`同一个 OAuth state 同时回调两次，发了 ${got} 个会话`);
  else if (accts !== 1) bad(`同一个 GitHub 账号建了 ${accts} 个用户`);
  else ok('同一个 OAuth state 同时回调两次 → 只认一次、只建一个账号');
}

console.log('并发回归：兑换码叠加 · 一码一用 · 并发爆破限流 · 验证码一次性 · 多设备同步 · 同名注册 · OAuth state');
if (fail) { console.error(`FAIL ${fail} 项`); process.exit(1); }
console.log('OK 并发竞态全部堵住');
