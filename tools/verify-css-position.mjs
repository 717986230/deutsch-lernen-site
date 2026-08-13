// 防「后写的 position:relative 把固定浮层打回文档流」。
//
// 起因：给触摸目标补 44px 热区时，写了一条
//   .btn,…,.fab-read,.beginner-fab,…{position:relative}
// 它排在 .fab-read{position:fixed} / .beginner-fab{position:fixed} 之后，
// 同特异性下后写的赢 —— 于是「循环朗读」和「零基础入门」两个悬浮按钮
// 悄悄变成了行内元素，跟着页面滚走了。构建和既有回归都没报警，因为它们
// 只检查元素在不在、能不能点，不检查它是不是还浮着。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(ROOT, 'src.html'), 'utf8');
let fail = 0;

// 收集每个「单类名选择器」最后一次声明的 position
const last = new Map();      // 选择器 -> {pos, at}
for (const m of css.matchAll(/(^|[\s},])((?:\.[A-Za-z0-9_-]+|#[A-Za-z0-9_-]+)(?:\s*,\s*(?:\.[A-Za-z0-9_-]+|#[A-Za-z0-9_-]+|[^{,]+))*)\{([^}]*)\}/g)) {
  const body = m[3];
  const pm = /(?:^|;)\s*position\s*:\s*([a-z-]+)/.exec(body);
  if (!pm) continue;
  for (let sel of m[2].split(',')) {
    sel = sel.trim();
    if (!/^[.#][A-Za-z0-9_-]+$/.test(sel)) continue;   // 只看裸类/裸 id，组合选择器特异性另算
    last.set(sel, { pos: pm[1], at: m.index });
  }
}
// 声明过 fixed/absolute/sticky 的，最终值不能被改成 static/relative
for (const m of css.matchAll(/(^|[\s},])((?:\.[A-Za-z0-9_-]+|#[A-Za-z0-9_-]+))\{([^}]*position\s*:\s*(fixed|absolute|sticky)[^}]*)\}/g)) {
  const sel = m[2];
  const want = m[4];
  const fin = last.get(sel);
  if (fin && (fin.pos === 'relative' || fin.pos === 'static')) {
    console.error(`ERROR ${sel} 声明过 position:${want}，却被后面的 position:${fin.pos} 覆盖 —— 浮层会掉回文档流`);
    fail++;
  }
}
console.log(`CSS 定位体检：检查了 ${last.size} 个单选择器的最终 position`);
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 没有固定浮层被 relative 打回文档流');
