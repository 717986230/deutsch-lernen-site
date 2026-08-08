import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// 切换后 index.html 是 Vue 产物、不引用 .dat；词库切片由旧站 legacy.html 使用
const requiredFiles = ['legacy.html', 'sw-legacy.js'];
const refs = new Set();
const refPattern = /\b(?:de|en)\.[a-f0-9]{8}\.dat\b/g;

for (const file of requiredFiles) {
  if (!existsSync(file)) fail(`${file} is missing. Run npm run build first.`);
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(refPattern)) refs.add(match[0]);
}

for (const expectedPrefix of ['de.', 'en.']) {
  if (![...refs].some((ref) => ref.startsWith(expectedPrefix))) {
    fail(`No ${expectedPrefix}<hash>.dat reference found in legacy.html or sw-legacy.js.`);
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
