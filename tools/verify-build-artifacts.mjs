import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// 词库切片（*.dat）被谁引用，取决于当前谁占着 index.html：
//   旧站当家（现状）→ index.html / sw.js
//   切到 Vue 后      → 旧站产物改名成 legacy.html / sw-legacy.js，由它们引用（见 ROLLBACK.md）
//
// 这里**把存在的入口全扫一遍**，而不是「挑第一个存在的那组」。
// 后者踩过一次：回退到旧站后 legacy.html 快照没删，于是 legacy 和 index 同时存在，
// 排在前面的 legacy.html 把校验全接管了 —— 连着两天，真正部署的 index.html
// 一次都没被验过，它引哪个切片、切片在不在仓库里，全没人管。
const ENTRIES = ['index.html', 'sw.js', 'legacy.html', 'sw-legacy.js'];
const present = ENTRIES.filter((f) => existsSync(f));

// GitHub Pages 无条件服务 index.html —— 它和它的 SW 必须在，且必须被扫到
for (const f of ['index.html', 'sw.js']) {
  if (!present.includes(f)) fail(`${f} 不在工作区 —— 它是 Pages 实际服务的产物。先跑 npm run build。`);
}

const refs = new Set();
const refPattern = /\b(?:de|en)\.[a-f0-9]{8}\.dat\b/g;
const from = new Map();                       // 切片 → 哪些入口引用了它，报错时好定位

for (const file of present) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(refPattern)) {
    refs.add(match[0]);
    from.set(match[0], (from.get(match[0]) || []).concat(file));
  }
}

for (const expectedPrefix of ['de.', 'en.']) {
  if (![...refs].some((ref) => ref.startsWith(expectedPrefix))) {
    fail(`No ${expectedPrefix}<hash>.dat reference found in ${present.join(' / ')}.`);
  }
}

for (const ref of refs) {
  const who = from.get(ref).join(' / ');
  if (!existsSync(ref)) fail(`${ref}（被 ${who} 引用）不在工作区。`);
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', ref], { stdio: 'ignore' });
  } catch {
    fail(`${ref}（被 ${who} 引用）没被 git 跟踪，部署前先 git add。`);
  }
}

// 历史切片：留少量给「HTML 还在浏览器 HTTP 缓存里、但 SW 已经换代」的短窗口兜底。
// 服务端的老切片其实基本够不着 —— sw.js 的页面请求是**网络优先**，
// 拿到的 index.html 永远指向当前切片；而 activate 里又会把 KEEP 之外的 .dat 全删。
// 所以只需要覆盖 Pages 那 ~10 分钟的 HTML 缓存窗口，留 2–3 个足矣。
//
// 之所以设硬上限：没人盯的时候它一路涨到了 19 个、6.5MB，全是死文件。
// 每次构建换内容就多一个，不设线就只会继续涨。
const MAX_STALE = 6;
let staleList = [];
try {
  staleList = execFileSync('git', ['ls-files', '*.dat'], { encoding: 'utf8' })
    .split('\n').filter(Boolean).filter((f) => !refs.has(f));
} catch { /* 不在 git 仓库里就算了 */ }
const stale = staleList.length;
if (stale > MAX_STALE) {
  const drop = staleList.slice(0, stale - 3);   // 留最近 3 个
  fail(`积了 ${stale} 个没人引用的历史词库切片（上限 ${MAX_STALE}），清一下：\n`
    + `       git rm ${drop.join(' ')}`);
}

console.log(`OK Verified ${refs.size} generated data slice(s): ${[...refs].sort().join(', ')}`
  + `（入口 ${present.join(' / ')}${stale ? `；另有 ${stale} 个历史切片留作旧 SW 兜底` : ''}）`);

function fail(message) {
  console.error(`ERROR ${message}`);
  process.exit(1);
}
