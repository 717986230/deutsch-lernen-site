import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// 谁在引用词库切片，取决于当前谁占着 index.html：
//   旧站当家（现状）→ index.html / sw.js
//   切到 Vue 后      → 旧站改名成 legacy.html / sw-legacy.js，由它们引用
// 两种状态都合法，所以按存在与否挑，而不是写死其中一种 —— 写死的结果就是
// 回退之后 npm run verify 必然报「legacy.html is missing」。
const candidates = [
  ['legacy.html', 'sw-legacy.js'],   // Vue 已上线
  ['index.html', 'sw.js'],           // 旧站当家
];
const requiredFiles = candidates.find((set) => set.every((f) => existsSync(f)));
if (!requiredFiles) fail('找不到旧站产物（legacy.html/sw-legacy.js 或 index.html/sw.js）。先跑 npm run build。');

const refs = new Set();
const refPattern = /\b(?:de|en)\.[a-f0-9]{8}\.dat\b/g;

for (const file of requiredFiles) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(refPattern)) refs.add(match[0]);
}

for (const expectedPrefix of ['de.', 'en.']) {
  if (![...refs].some((ref) => ref.startsWith(expectedPrefix))) {
    fail(`No ${expectedPrefix}<hash>.dat reference found in ${requiredFiles.join(' or ')}.`);
  }
}

for (const ref of refs) {
  if (!existsSync(ref)) fail(`${ref} is referenced but missing from the working tree.`);
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', ref], { stdio: 'ignore' });
  } catch {
    fail(`${ref} is referenced but not tracked by git. Add it before deploying.`);
  }
}

console.log(`OK Verified ${refs.size} generated data slice(s): ${[...refs].sort().join(', ')}`);

function fail(message) {
  console.error(`ERROR ${message}`);
  process.exit(1);
}
