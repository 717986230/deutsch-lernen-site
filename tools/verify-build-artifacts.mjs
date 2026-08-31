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

// 历史切片一直留着，给缓存了旧 sw.js 的浏览器兜底（ROLLBACK.md 有记）。
// 不当错误报，但把数量打出来 —— 哪天涨到离谱就看得见。
let stale = 0;
try {
  stale = execFileSync('git', ['ls-files', '*.dat'], { encoding: 'utf8' })
    .split('\n').filter(Boolean).filter((f) => !refs.has(f)).length;
} catch { /* 不在 git 仓库里就算了 */ }

console.log(`OK Verified ${refs.size} generated data slice(s): ${[...refs].sort().join(', ')}`
  + `（入口 ${present.join(' / ')}${stale ? `；另有 ${stale} 个历史切片留作旧 SW 兜底` : ''}）`);

function fail(message) {
  console.error(`ERROR ${message}`);
  process.exit(1);
}
