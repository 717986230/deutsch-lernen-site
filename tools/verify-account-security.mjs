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
const stmt = (sql) => ({
  _b: [],
  bind(...a) { this._b = a.map((v) => (v === undefined ? null : (typeof v === 'boolean' ? +v : v))); return this; },
  first() { const r = db.prepare(sql).get(...this._b); return r === undefined ? null : r; },
  all() { return { results: db.prepare(sql).all(...this._b) }; },
  run() { const r = db.prepare(sql).run(...this._b); return { meta: { changes: r.changes, last_row_id: r.lastInsertRowid } }; },
});
const DB = { prepare: stmt, batch: async (list) => list.map((s) => s.run()) };

// 验证码只在邮件正文里出现一次，所以发信必须拦下来 —— 攻击链的关键一环正是「码发给了谁」
const mailbox = [];
const env = { DB, SITE: 'https://www.uuoo.site', MAIL_FROM: 'no-reply@uuoo.site', RESEND_API_KEY: 'test' };

// 拦 fetch：Resend 发信接口直接记账返回成功
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  const s = String(u);
  if (s.includes('resend.com')) {
    const b = JSON.parse(o.body);
    mailbox.push({ to: Array.isArray(b.to) ? b.to[0] : b.to, html: b.html || b.text || '' });
    return new Response(JSON.stringify({ id: 'x' }), { status: 200 });
  }
  return realFetch(u, o);
};

const worker = (await import(pathToFileURL(join(ROOT, 'analytics/worker.js')).href)).default;
const call = async (method, path, body, token) => {
  const h = { origin: 'https://www.uuoo.site', 'CF-Connecting-IP': '203.0.113.' + Math.floor(Math.random() * 250) };
  if (token) h.Authorization = 'Bearer ' + token;
  const res = await worker.fetch(new Request('https://api.test' + path, {
    method, headers: h, body: body === undefined ? undefined : JSON.stringify(body),
  }), env, { waitUntil() {} });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  return { status: res.status, ok: res.ok, data };
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

console.log(`账号安全回归：重放 ${3} 组接管路径`);
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 账号接管路径全部堵住，正常找回流程未受影响');
