// 全站公告后台接口（站长 2026-11-14 要求「公告弹窗我自己编辑发布」）：真的 worker.js 挂在真的 SQLite 上验证。
//   · 没发布过时 GET /api/announce 给代码里的默认公告
//   · 没密钥 / 密钥错 → 403；发布后 GET 拿到新内容；正文里的 HTML 原样当文本存（前端再转义）
//   · 按钮只收站内版块 id，链接/脚本一律丢弃；标题或正文为空 → 400
//   · 改错字（不勾 renew）沿用旧 id，勾 renew 换新 id；下线后 GET 给 null
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
const KEY = 'test-stats-key-123';
const env = { DB: { prepare: stmt, batch: async (list) => list.map((s) => s.run()) }, STATS_KEY: KEY };
const worker = (await import(pathToFileURL(join(ROOT, 'analytics/worker.js')).href)).default;
const call = async (method, path, body, key) => {
  const h = { 'CF-Connecting-IP': '203.0.113.7' };
  if (key) h['X-Admin-Key'] = key;
  const res = await worker.fetch(new Request('https://api.test' + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }), env, { waitUntil() {} });
  let data = {}; try { data = await res.json(); } catch (_) {}
  return { status: res.status, data, cc: res.headers.get('Cache-Control') };
};

let r = await call('GET', '/api/announce');
if (r.status !== 200 || !r.data.ann || r.data.ann.id !== '2026-11-rank-top10') bad('未发布时应给默认公告：' + JSON.stringify(r.data).slice(0, 120));
else ok('未发布时给默认公告（榜单前三送年卡）');
if (!/max-age=60/.test(r.cc || '')) bad('GET 应缓存 60 秒，实际 ' + r.cc); else ok('GET 缓存 60 秒');

const draft = { every: false, icon: '🎉', title: '新公告', body: '第一段 **重点**\n\n<img src=x onerror=alert(1)>', contact: false,
  btns: [{ t: '去排行榜', go: 'rank' }, { t: '坏按钮', go: 'javascript:alert(1)' }, { t: '第三个', go: 'home' }] };
r = await call('POST', '/api/admin/announce', { ann: draft });
if (r.status !== 403) bad('没密钥应 403，实际 ' + r.status); else ok('没密钥 403');
r = await call('POST', '/api/admin/announce', { ann: draft }, 'wrong');
if (r.status !== 403) bad('密钥错应 403，实际 ' + r.status); else ok('密钥错 403');
r = await call('POST', '/api/admin/announce', { ann: { title: '', body: 'x' } }, KEY);
if (r.status !== 400) bad('空标题应 400，实际 ' + r.status); else ok('空标题 400');

r = await call('POST', '/api/admin/announce', { ann: draft }, KEY);
if (r.status !== 200) bad('发布失败 ' + r.status + JSON.stringify(r.data));
const id1 = r.data.ann && r.data.ann.id;
r = await call('GET', '/api/announce');
const a = r.data.ann || {};
if (a.title !== '新公告' || a.every !== false || a.id !== id1) bad('发布后 GET 内容不对：' + JSON.stringify(a)); else ok('发布后 GET 拿到新公告');
if (id1 === '2026-11-rank-top10') bad('从默认公告第一次发布应换新 id');
if (!a.body.includes('\n\n') || !a.body.includes('<img')) bad('正文换行/原文应原样保存：' + JSON.stringify(a.body));
if (a.btns.length !== 1 || a.btns[0].go !== 'rank') bad('按钮应只剩站内的「去排行榜」：' + JSON.stringify(a.btns)); else ok('按钮只收站内版块、最多两个');

r = await call('POST', '/api/admin/announce', { ann: Object.assign({}, draft, { title: '新公告（改错字）' }) }, KEY);
if (r.data.ann.id !== id1) bad('不勾 renew 应沿用旧 id'); else ok('改错字沿用旧 id（看过的人不再弹）');
r = await call('POST', '/api/admin/announce', { ann: draft, renew: true }, KEY);
if (r.data.ann.id === id1) bad('勾 renew 应换新 id'); else ok('renew 换新 id（所有人再弹一次）');

r = await call('POST', '/api/admin/announce', { ann: null }, KEY);
if (r.status !== 200) bad('下线失败 ' + r.status);
r = await call('GET', '/api/announce');
if (r.data.ann !== null) bad('下线后 GET 应为 null：' + JSON.stringify(r.data)); else ok('下线后 GET 给 null');

if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 全站公告后台接口');
