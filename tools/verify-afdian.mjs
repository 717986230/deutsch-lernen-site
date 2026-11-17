// 爱发电自动开通回归：真 worker.js + 真 SQLite，爱发电 query-order 接口用桩代替（校验签名）。
// 钉住收钱相关的不变量：回调内容不可信（只认官方查单结果）、一单只开一次、带 ref 自动开通、
// 没带 ref 的订单可凭订单号认领、年卡给龙权益、测试回调与查无此单都回 {"ec":200}。
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };
const ok = (m) => console.log('  ✓ ' + m);

// Node 的 WebCrypto 没有 MD5（Workers 有）：测试里补上
const dig = crypto.subtle.digest.bind(crypto.subtle);
crypto.subtle.digest = async (alg, data) => (alg === 'MD5' ? createHash('md5').update(Buffer.from(data)).digest().buffer : dig(alg, data));
const md5 = (s) => createHash('md5').update(s).digest('hex');

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
const env = { DB, SITE_URL: 'https://www.uuoo.site', AFDIAN_USER_ID: 'creator-uid', AFDIAN_TOKEN: 'tok-secret' };

// 爱发电「真实」订单库（桩）
const ORDERS = {};
let apiDown = false, apiCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url) !== 'https://afdian.com/api/open/query-order') return realFetch(url, init);
  apiCalls++;
  if (apiDown) throw new Error('network');
  const b = JSON.parse(init.body);
  if (b.user_id !== env.AFDIAN_USER_ID || b.sign !== md5(env.AFDIAN_TOKEN + 'params' + b.params + 'ts' + b.ts + 'user_id' + b.user_id))
    return new Response(JSON.stringify({ ec: 400005, em: 'sign error' }));
  const no = JSON.parse(b.params).out_trade_no;
  return new Response(JSON.stringify({ ec: 200, em: '', data: { list: ORDERS[no] ? [ORDERS[no]] : [], total_count: ORDERS[no] ? 1 : 0, total_page: 1 } }));
};

const worker = (await import(pathToFileURL(join(ROOT, 'analytics/worker.js')).href)).default;
const call = async (method, path, body, token, ip) => {
  const h = { origin: 'https://www.uuoo.site', 'CF-Connecting-IP': ip || '198.51.100.9' };
  if (token) h.Authorization = 'Bearer ' + token;
  const res = await worker.fetch(new Request('https://api.test' + path, { method, headers: h,
    body: body === undefined ? undefined : JSON.stringify(body) }), env, { waitUntil() {} });
  let data = {}; try { data = await res.json(); } catch (_) {}
  return { status: res.status, data };
};
const hook = (order) => call('POST', '/api/afdian/webhook', { ec: 200, em: 'ok', data: { type: 'order', order } });
const DAY = 86400000;
const order = (no, amt, ref, month) => ({ out_trade_no: no, custom_order_id: ref || '', user_id: 'buyer', plan_id: 'p', month: month || 1, total_amount: amt, show_amount: amt, status: 2, remark: '' });
const reg = async (u) => (await call('POST', '/api/register', { username: u, nickname: u, password: 'pass-' + u + '-123' })).data.token;
const ta = await reg('alice'), tb = await reg('bob'), tc = await reg('carol');
const me = async (t) => (await call('GET', '/api/me', undefined, t)).data.user;

// ── ref ──
let r = await call('GET', '/api/pay/ref');
if (r.status !== 401) bad('未登录也拿到了付款凭据'); else ok('未登录取 ref 被拒（401）');
const refA = (await call('GET', '/api/pay/ref', undefined, ta)).data.ref;
const refB = (await call('GET', '/api/pay/ref', undefined, tb)).data.ref;
if (!/^[0-9a-z]+x[0-9a-f]{12}$/.test(refA || '') || refA === refB) bad(`ref 格式不对：${refA}`); else ok('每人一个带签名的 ref');

// ── 发送测试：样例单查无此单，也要回 ec:200 ──
r = await hook(order('202106232138371083454010626', '5.00', ''));
if (r.status !== 200 || r.data.ec !== 200) bad(`「发送测试」没回 ec:200：${JSON.stringify(r)}`); else ok('爱发电「发送测试」回 {"ec":200}');
r = await call('POST', '/api/afdian/webhook', { ec: 200 });
if (r.data.ec !== 200) bad('空回调没回 ec:200'); else ok('畸形回调也回 ec:200，不报错');

// ── 伪造回调：订单号在爱发电查不到 → 不开通 ──
r = await hook(order('11112222333344445555', '99.00', refA));
if (r.data.ec !== 200 || (await me(ta)).pro_until) bad('伪造回调开通了会员'); else ok('伪造回调（查无此单）不开通');

// ── 带 ref 的月卡：自动开通 ──
ORDERS['20261117000000000001'] = order('20261117000000000001', '9.90', refA);
const t0 = Date.now();
r = await hook(Object.assign({}, ORDERS['20261117000000000001'], { total_amount: '999.00' }));   // 回调里篡改金额也没用
let u = await me(ta);
if (Math.abs(u.pro_until - (t0 + 30 * DAY)) > 60000) bad(`带 ref 月卡没按官方金额开 30 天：${u.pro_until - t0}`); else ok('带 ref 月卡自动开通 30 天（金额以官方查单为准）');
await hook(ORDERS['20261117000000000001']);
if ((await me(ta)).pro_until !== u.pro_until) bad('重复回调重复加了天数'); else ok('同一订单重复回调只开一次');
r = await call('POST', '/api/redeem', { code: '20261117000000000001' }, tb);
if (r.status !== 400) bad('别人拿已开通的订单号又认领了一次'); else ok('已开通的订单号别人不能再认领');

// ── 回调里伪造 ref 也没用：以官方查单的 custom_order_id 为准 ──
ORDERS['20261117000000000002'] = order('20261117000000000002', '99.00', '');
await hook(Object.assign({}, ORDERS['20261117000000000002'], { custom_order_id: refB }));
if ((await me(tb)).pro_until) bad('回调里塞别人的 ref 就给别人开了'); else ok('回调里伪造的 ref 不生效');
// 签名不对的 ref
ORDERS['20261117000000000003'] = order('20261117000000000003', '9.90', refB.replace(/x.*/, 'x000000000000'));
await hook(ORDERS['20261117000000000003']);
if ((await me(tb)).pro_until) bad('签名错的 ref 也开通了'); else ok('签名错误的 ref 不开通（订单留待认领）');

// ── 没带 ref 的年卡：凭订单号认领，给龙权益 ──
r = await call('POST', '/api/redeem', { code: ' 2026 1117 0000 0000 0002 ' }, tb);
u = await me(tb);
if (!r.data.ok || r.data.days !== 365 || u.pro_perk !== 2) bad(`订单号认领年卡失败：${JSON.stringify(r.data)} perk=${u.pro_perk}`); else ok('输入订单号认领年卡 365 天，带年卡龙权益');
r = await call('POST', '/api/redeem', { code: '20261117000000000002' }, tb);
if (!r.data.ok || r.data.already !== 1) bad('本人重复认领没有友好提示'); else ok('本人重复输入订单号：提示已开通，不重复加天数');
r = await call('POST', '/api/redeem', { code: '20261117000000000002' }, tc);
if (r.status !== 400) bad('第二个人认领了同一订单'); else ok('同一订单只能一人认领');

// ── 回调丢了：认领时现查爱发电 ──
ORDERS['20261117000000000004'] = order('20261117000000000004', '19.80', '', 2);
const calls0 = apiCalls;
r = await call('POST', '/api/redeem', { code: '20261117000000000004' }, tc);
if (!r.data.ok || r.data.days !== 60 || apiCalls !== calls0 + 1) bad(`回调丢失时认领失败：${JSON.stringify(r.data)}`); else ok('没收到回调也能认领（现查爱发电），2 个月 = 60 天');
await hook(ORDERS['20261117000000000004']);
if ((await me(tc)).pro_until - Date.now() > 61 * DAY) bad('认领后迟到的回调又加了一次'); else ok('认领后迟到的回调不重复开通');

// ── 未支付 / 金额太小：不开通 ──
ORDERS['20261117000000000005'] = Object.assign(order('20261117000000000005', '9.90', refB), { status: 1 });
ORDERS['20261117000000000006'] = order('20261117000000000006', '1.00', refB);
const pb = (await me(tb)).pro_until;
await hook(ORDERS['20261117000000000005']); await hook(ORDERS['20261117000000000006']);
if ((await me(tb)).pro_until !== pb) bad('未支付或小额订单开通了会员'); else ok('未支付 / 小额打赏订单不开通');
r = await call('POST', '/api/redeem', { code: '20261117000000000005' }, tb);
if (r.status !== 400) bad('未支付订单能认领'); else ok('未支付订单不能认领');

// ── 查单失败：回调回 500 让爱发电重发；认领回 503 ──
apiDown = true;
ORDERS['20261117000000000007'] = order('20261117000000000007', '9.90', refB);
r = await hook(ORDERS['20261117000000000007']);
if (r.status !== 500) bad('查单失败时回调没回 500'); else ok('查单失败：回调回 500，留给爱发电重发');
r = await call('POST', '/api/redeem', { code: '20261117000000000007' }, tb);
if (r.status !== 503) bad('查单失败时认领没回 503'); else ok('查单失败：认领提示稍后再试（503）');
apiDown = false;
await hook(ORDERS['20261117000000000007']);
if ((await me(tb)).pro_until - pb < 29 * DAY) bad('重发回调后没开通'); else ok('爱发电重发后正常开通并叠加');

// ── 普通兑换码不受影响 ──
r = await call('POST', '/api/redeem', { code: 'UUOO-AAAA-BBBB-CCCC' }, tc);
if (r.status !== 400 || !/兑换码/.test(r.data.err)) bad('普通兑换码路径被影响'); else ok('普通兑换码路径照旧');

// ── 没配 token：ref 为空，回调仍回 200 不崩 ──
const tok = env.AFDIAN_TOKEN; delete env.AFDIAN_TOKEN;
r = await call('GET', '/api/pay/ref', undefined, ta);
if (r.data.ref !== '') bad('没配 token 也发了 ref'); else ok('没配 AFDIAN_TOKEN：ref 为空，前端退回订单号认领');
r = await hook(order('202106232138371083454010626', '5.00', ''));
if (r.status !== 500) bad('没配 token 时回调状态不对'); else ok('没配 AFDIAN_TOKEN：回调回 500（提醒先设密钥）');
env.AFDIAN_TOKEN = tok;

const dump = JSON.stringify(db.prepare('SELECT * FROM redeem_codes').all());
if (/2026111700000000000/.test(dump)) bad('库里存了明文订单号'); else ok('库里只存订单号哈希');

console.log('爱发电回归：官方查单核验 · 一单一开 · ref 自动开通 · 订单号认领 · 年卡龙权益 · 失败重发');
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 爱发电自动开通不变量全部成立');
