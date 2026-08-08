import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Vue 产物直接发布在仓库根目录；旧站产物已下线，不再参与构建校验。
const requiredFiles = ['index.html', 'sw.js'];
const assetRefs = new Set();
const assetPattern = /assets\/[A-Za-z0-9_-]+\.(?:js|css)/g;

for (const file of requiredFiles) {
  if (!existsSync(file)) fail(`${file} is missing. Run npm run build first.`);
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(assetPattern)) assetRefs.add(match[0]);
}

if (![...assetRefs].some((ref) => ref.startsWith('assets/index-'))) {
  fail('index.html does not reference the Vue application bundle. Run cd web && npm run build first.');
}

for (const ref of assetRefs) {
  if (!existsSync(ref)) fail(`${ref} is referenced but missing from the working tree.`);
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', ref], { stdio: 'ignore' });
  } catch {
    fail(`${ref} is referenced but not tracked by git. Add it before deploying.`);
  }
}

if (!readFileSync('sw.js', 'utf8').includes("const SHELL =")) {
  fail('sw.js is not the generated Vue service worker. Run cd web && npm run build first.');
}

console.log(`OK Verified Vue entry and ${assetRefs.size} generated asset(s): ${[...assetRefs].sort().join(', ')}`);

function fail(message) {
  console.error(`ERROR ${message}`);
  process.exit(1);
}
