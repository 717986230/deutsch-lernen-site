// 构建脚本：src.html（明文可读源）→ index.html（加密+混淆，用于部署）
//
// 用法：
//   npm install        # 安装 terser（仅首次）
//   node build.mjs     # 由 src.html 生成 index.html
//
// 做两件事：
//   1) 将 4 个大数据数组（categories/EN_CATEGORIES/READINGS/SERIES）用 XOR+Base64
//      编码，页面加载时经 _dec() 运行时解码——源码里不出现明文词库。
//   2) 用 terser 压缩/混淆全部内联 <script>（保留全局函数名以兼容 HTML 内联事件）。
//
// 反爬说明：这是客户端“混淆”，能挡住查看源码/curl/复制 JSON 等随手爬取，
// 但无法阻止用开发者工具的定向提取——这是任何纯静态站的固有上限。
//
// 维护流程：以后改词/加功能只改 src.html（可读），再 `node build.mjs` 生成部署文件。

import { readFileSync, writeFileSync } from 'fs';
import { minify } from 'terser';

// XOR 密钥（与解码器一致；运行时在页面里由字符码拼装，源码中不出现明文密钥串）
const KEY_CODES = [68,120,55,36,76,113,57,33,90,114,50,35,87,112,53,38,97,72,56,94,84,110,51,42];
const KEY = KEY_CODES.map(c => String.fromCharCode(c)).join('');
const DATA_VARS = ['categories', 'EN_CATEGORIES', 'READINGS', 'SERIES'];

function xorB64(text) {
  const bytes = Buffer.from(text, 'utf8');
  const out = Buffer.allocUnsafe(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ KEY.charCodeAt(i % KEY.length);
  return out.toString('base64');
}

// 定位 `const NAME = [ ... ];`，返回 [语句起点, 语句终点(含;), 数组JSON文本]
function findArray(html, name) {
  const marker = `const ${name} = `;
  const stmtStart = html.indexOf(marker);
  if (stmtStart === -1) throw new Error(`未找到 ${name}`);
  const jsonStart = stmtStart + marker.length;
  let depth = 0, i = jsonStart, end = -1;
  for (; i < html.length; i++) {
    const c = html[i];
    if (c === '[') depth++;
    else if (c === ']') { if (--depth === 0) { end = i + 1; break; } }
  }
  if (end === -1) throw new Error(`${name} 数组括号不匹配`);
  const semi = html.indexOf(';', end) + 1;
  return [stmtStart, semi, html.slice(jsonStart, end)];
}

const DECODER =
  'const _XK=String.fromCharCode(' + KEY_CODES.join(',') + ');' +
  'function _dec(s){const b=atob(s),n=b.length,a=new Uint8Array(n);' +
  'for(let i=0;i<n;i++)a[i]=b.charCodeAt(i)^_XK.charCodeAt(i%_XK.length);' +
  'return new TextDecoder().decode(a);}\n';

async function build() {
  let html = readFileSync('src.html', 'utf8');

  // 1) 加密 4 个数组（从后往前替换以保持偏移），并校验 JSON 合法
  const spans = DATA_VARS.map(n => { const [s, e, json] = findArray(html, n); JSON.parse(json); return { n, s, e, json }; });
  const catStart = spans.find(x => x.n === 'categories').s;
  for (const { n, s, e, json } of [...spans].sort((a, b) => b.s - a.s)) {
    html = html.slice(0, s) + `const ${n} = JSON.parse(_dec("${xorB64(json)}"));` + html.slice(e);
  }
  html = html.slice(0, catStart) + DECODER + html.slice(catStart);

  // 2) 混淆全部内联 <script>（保留全局名，兼容 onclick 等 HTML 内联处理器）
  const opts = { compress: { toplevel: false, keep_fnames: true }, mangle: { toplevel: false }, format: { comments: false } };
  const re = /<script>([\s\S]*?)<\/script>/g;
  let out = '', last = 0, m, count = 0;
  while ((m = re.exec(html))) {
    const res = await minify(m[1], opts);
    if (res.error) throw res.error;
    out += html.slice(last, m.index) + '<script>' + res.code + '</script>';
    last = re.lastIndex; count++;
  }
  out += html.slice(last);

  writeFileSync('index.html', out);
  console.log(`✓ 构建完成：加密 ${DATA_VARS.length} 个数组、混淆 ${count} 个脚本块`);
  console.log(`  src.html ${(readFileSync('src.html').length / 1024 | 0)}KB → index.html ${(out.length / 1024 | 0)}KB`);
}

build().catch(e => { console.error('构建失败：', e); process.exit(1); });
