// 会员与兑换码回归：真 worker.js + 真 SQLite（同 verify-account-security 的垫片）。
// 钉住收钱相关的不变量：码只能用一次、库里只有哈希、输错有频控、过期/非会员拿不到付费课包、
// 发码必须带 STATS_KEY、注销账号连会员一起删。
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
const stmt = (sql) => {
  const make = (b) => ({
    bind: (...a) => make(a.map((v) => (v === undefined ? null : (typeof v === 'boolean' ? +v : v)))),
    first() { const r = db.prepare(sql).get(...b); return r === undefined ? null : r; },
    all() { return { results: db.prepare(sql).all(...b) }; },
    run() { const r = db.prepare(sql).run(...b); return { meta: { changes: r.changes, last_row_id: r.lastInsertRowid } }; },
  });
  return make([]);
};
const DB = { prepare: stmt, batch: async (list) => list.map((s) => s.run()) };
const env = { DB, SITE_URL: 'https://www.uuoo.site', STATS_KEY: 'admin-secret-key' };
const worker = (await import(pathToFileURL(join(ROOT, 'analytics/worker.js')).href)).default;
const call = async (method, path, body, token, headers, ip) => {
  const h = Object.assign({ origin: 'https://www.uuoo.site', 'CF-Connecting-IP': ip || '198.51.100.7' }, headers || {});
  if (token) h.Authorization = 'Bearer ' + token;
  const res = await worker.fetch(new Request('https://api.test' + path, { method, headers: h,
    body: body === undefined ? undefined : JSON.stringify(body) }), env, { waitUntil() {} });
  let data = {}; try { data = await res.json(); } catch (_) {}
  return { status: res.status, data };
};
const DAY = 86400000;

// ── 发码 ──
let r = await call('POST', '/api/admin/codes', { n: 3, days: 365 }, null, { 'X-Admin-Key': 'wrong' });
if (r.status !== 403) bad(`错误密钥也能发码（${r.status}）`); else ok('错误密钥发码被拒（403）');
r = await call('POST', '/api/admin/codes', { n: 3, days: 7 }, null, { 'X-Admin-Key': env.STATS_KEY });
if (r.status !== 400) bad(`非法天数也能发码（${r.status}）`); else ok('天数只认 30/365');
r = await call('POST', '/api/admin/codes', { n: 1, days: 36500 }, null, { 'X-Admin-Key': env.STATS_KEY });
if (r.status !== 400) bad('停售后仍能发永久码'); else ok('永久码已停发（400）');
r = await call('POST', '/api/admin/codes', { n: 3, days: 365, batch: 'test' }, null, { 'X-Admin-Key': env.STATS_KEY });
const codes = r.data.codes || [];
if (codes.length !== 3 || !codes.every((c) => /^UUOO-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(c))) bad(`发码格式不对：${JSON.stringify(r.data)}`);
else ok('发出 3 个年卡码，格式 UUOO-XXXX-XXXX-XXXX');
const dump = JSON.stringify(db.prepare('SELECT * FROM redeem_codes').all());
if (codes.some((c) => dump.includes(c.slice(5).replace(/-/g, '')))) bad('库里存了明文兑换码'); else ok('库里只有哈希，没有明文码');
const life = (await call('POST', '/api/admin/codes', { n: 1, days: 30 }, null, { 'X-Admin-Key': env.STATS_KEY })).data.codes[0];   // 月卡；下面把 carol 手动改成历史永久会员

// ── 用户 ──
const reg = async (u) => (await call('POST', '/api/register', { username: u, nickname: u, password: 'pass-' + u + '-123' })).data.token;
const ta = await reg('alice'), tb = await reg('bob');

r = await call('POST', '/api/redeem', { code: codes[0] });
if (r.status !== 401) bad('未登录也能兑换'); else ok('未登录兑换被拒（401）');

r = await call('GET', '/api/pro/pack?id=arzt', undefined, ta);
if (r.status !== 403) bad(`非会员拿到了付费课包（${r.status}）`); else ok('非会员取课包被拒（403）');

const t0 = Date.now();
r = await call('POST', '/api/redeem', { code: ' uuoo-' + codes[0].slice(5).toLowerCase() + ' ' }, ta);
if (!r.data.ok || Math.abs(r.data.pro_until - (t0 + 365 * DAY)) > 60000) bad(`年卡兑换结果不对：${JSON.stringify(r.data)}`);
else ok('兑换容忍大小写和空格，年卡 = 365 天');

r = await call('POST', '/api/redeem', { code: codes[0] }, tb);
if (r.status !== 400) bad('同一个码被第二个人用掉了'); else ok('码只能用一次');

r = await call('POST', '/api/redeem', { code: codes[1] }, ta);
if (Math.abs(r.data.pro_until - (t0 + 730 * DAY)) > 60000) bad(`续期没有叠加：${JSON.stringify(r.data)}`); else ok('未到期续费从到期日往后叠加');

r = await call('GET', '/api/me', undefined, ta);
if (!(r.data.user && r.data.user.pro_until > t0)) bad('/api/me 没带 pro_until'); else ok('/api/me 带回会员到期时间');

r = await call('GET', '/api/pro/pack?id=arzt', undefined, ta);
const units = r.data.pack && r.data.pack.units;
if (r.status !== 200 || !Array.isArray(units) || units.length < 5) bad(`会员取课包失败：${r.status}`); else ok(`会员拿到课包：${units.length} 个单元`);
r = await call('GET', '/api/pro/pack?id=nope', undefined, ta);
if (r.status !== 404) bad('不存在的课包没有 404');

// ── 公开展示：排行榜 / 主页只给档位，不给到期日 ──
r = await call('GET', '/api/leaderboard');
{
  const la = r.data.list.find((x) => x.username === 'alice'), lb = r.data.list.find((x) => x.username === 'bob');
  if (!la || la.pro !== 1 || !lb || lb.pro !== 0) bad(`排行榜会员档位不对：${JSON.stringify([la, lb])}`);
  else if (JSON.stringify(r.data).match(/"(pu|until|pro_until)"/)) bad('排行榜泄露了会员到期日');
  else ok('排行榜带会员档位（年卡=1、非会员=0），不含到期日');
}
r = await call('GET', '/api/profile?name=alice', undefined, tb);
if (r.data.user.pro !== 1 || 'pro_until' in r.data.user) bad(`他人主页会员字段不对：${JSON.stringify(r.data.user)}`); else ok('他人主页只给会员档位');

// 过期：手动把到期时间改到过去
db.prepare('UPDATE memberships SET until=? WHERE uid=(SELECT id FROM users WHERE username=?)').run(Date.now() - 1000, 'alice');
r = await call('GET', '/api/pro/pack?id=arzt', undefined, ta);
if (r.status !== 403) bad('过期会员还能取课包'); else ok('会员过期后课包关闭');

// ── 暴力猜码频控 ──
let blocked = 0;
for (let i = 0; i < 14; i++) {
  r = await call('POST', '/api/redeem', { code: 'UUOO-AAAA-BBBB-CC' + 'DEFGHJKMNPQRST'[i] + 'X' }, tb, null, '203.0.113.' + i);
  if (r.status === 429) blocked++;
}
if (blocked < 3) bad(`连续输错没有被限流（429 次数 ${blocked}）`); else ok(`连续输错 10 次后限流（拦下 ${blocked} 次）`);
r = await call('POST', '/api/redeem', { code: life }, tb, null, '192.0.2.1');
if (r.status !== 429) bad('被限流期间仍可兑换（应先等窗口过去）');

// ── 注销连带删会员 ──
const tc = await reg('carol');
await call('POST', '/api/redeem', { code: life }, tc, null, '192.0.2.9');
const cid = db.prepare("SELECT id FROM users WHERE username='carol'").get().id;
if (!db.prepare('SELECT 1 FROM memberships WHERE uid=?').get(cid)) bad('兑换后没有会员记录');
db.prepare('UPDATE memberships SET until=? WHERE uid=?').run(Date.now() + 36500 * DAY, cid);   // 模拟已开通的永久会员
await call('POST', '/api/follow', { name: 'carol' }, tb);
r = await call('GET', '/api/following', undefined, tb);
{ const fc = (r.data.list || []).find((x) => x.username === 'carol'); if (!fc || fc.pro !== 2) bad(`关注列表永久会员档位不对：${JSON.stringify(fc)}`); else ok('关注列表/永久会员档位 = 2'); }
// ── 头像框：只能戴已解锁的；公开接口按资格下发 ──
const lbFrame = async (u) => ((await call('GET', '/api/leaderboard')).data.list.find((x) => x.username === u) || {}).frame;
if (await lbFrame('carol') !== 'pro_life') bad('永久会员默认没戴永久会员框'); else ok('永久会员默认戴「永久会员」框');
r = await call('POST', '/api/frame', { frame: 'streak365' }, tc);
if (r.status !== 403) bad(`没点亮的徽章框也能戴（${r.status}）`); else ok('未解锁的头像框戴不上（403）');
r = await call('POST', '/api/frame', { frame: 'pro' }, tb);
if (r.status !== 403) bad('非会员戴上了会员框'); else ok('非会员戴不上会员框');
r = await call('POST', '/api/frame', { frame: 'founder' }, tc);   // 前 100 名注册 = 创始人徽章
if (!r.data.ok || await lbFrame('carol') !== 'founder') bad(`创始人框没戴上：${JSON.stringify(r.data)}`); else ok('戴上已点亮徽章的框，排行榜同步显示');
r = await call('GET', '/api/profile?name=carol', undefined, tb);
if (r.data.user.frame !== 'founder') bad('他人主页没带头像框'); else ok('他人主页带头像框');
await call('POST', '/api/frame', { frame: 'none' }, tc);
if (await lbFrame('carol') !== '') bad('摘下头像框后仍显示'); else ok('选「不戴」后不显示任何框');
r = await call('POST', '/api/frame', { frame: 'pro' }, tc);
db.prepare('UPDATE memberships SET until=? WHERE uid=?').run(Date.now() - 1000, cid);
if (await lbFrame('carol') !== '') bad('会员过期后仍戴着会员框'); else ok('会员过期后会员框自动摘下');
r = await call('POST', '/api/frame', { frame: 'x'.repeat(200) }, tc);
if (r.status !== 403) bad(`乱填框名没被拒（${r.status}）`); else ok('乱填的框名被拒');
await call('POST', '/api/account/delete', { password: 'pass-carol-123' }, tc);
if (db.prepare('SELECT 1 FROM user_frames WHERE uid=?').get(cid)) bad('注销账号后头像框记录还在');
if (db.prepare('SELECT 1 FROM memberships WHERE uid=?').get(cid)) bad('注销账号后会员记录还在'); else ok('注销账号连会员记录一起删除');

// ── 课包内容体检：每个 packs/*.json 都要在 worker 登记、在 PRO_CFG 有目录；字段齐全、谐音只含中文 ──
const CJK = /^[一-鿿\s，。！？、；：「」（）·/\-↔—…]+$/;
const { readdirSync } = await import('node:fs');
const src = readFileSync(join(ROOT, 'src.html'), 'utf8');
const cfg = JSON.parse(src.match(/var PRO_CFG=(\{.*?\});\n/)[1]);
for (const f of readdirSync(join(ROOT, 'analytics/packs')).filter((x) => x.endsWith('.json'))) {
  const pack = JSON.parse(readFileSync(join(ROOT, 'analytics/packs', f), 'utf8'));
  if (pack.id + '.json' !== f) bad(`${f} 的 id 与文件名不一致`);
  r = await call('GET', '/api/pro/pack?id=' + pack.id, undefined, tb, null, '192.0.2.77');
  if (r.status !== 403) bad(`课包 ${pack.id} 没在 worker 的 PRO_PACKS 登记（非会员应 403，实际 ${r.status}）`);
  const meta = cfg.packs.find((x) => x.id === pack.id);
  if (!meta) bad(`课包 ${pack.id} 没在 src.html 的 PRO_CFG.packs 里`);
  let n = 0;
  for (const u of pack.units) {
    for (const k of ['id', 'icon', 'name', 'tip']) if (!u[k]) bad(`${f} 单元缺 ${k}`);
    for (const p of u.phrases) {
      n++;
      for (const k of ['de', 'zh', 'py']) if (!String(p[k] || '').trim()) bad(`${f}「${p.de}」缺 ${k}`);
      if (p.py && !CJK.test(p.py)) bad(`${f}「${p.de}」谐音含非中文字符：${p.py}`);
    }
  }
  if (meta && !meta.desc.includes(n + ' 句')) bad(`PRO_CFG 里 ${pack.id} 的句数与实际 ${n} 不符`);
  if (meta) for (const v of meta.preview) if (src.split(v[0]).length < 2) bad('试看句缺失');
  ok(`课包「${pack.title}」${pack.units.length} 单元 ${n} 句：已登记、目录句数一致、字段与谐音合格`);
}

console.log('会员与兑换码回归：发码鉴权 · 哈希存储 · 一码一用 · 续期叠加 · 过期关闭 · 猜码限流 · 注销删除');
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 会员与兑换码不变量全部成立');
