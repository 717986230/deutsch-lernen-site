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

// 解码器 + 兼容垫片。全部 ES5（var/for），不依赖 TextDecoder，避免旧版 WebView
// （如微信 X5 / 老 iOS WKWebView）缺失 API 时首屏脚本整体崩溃、导致全站点击失效。
const DECODER =
  'var _XK=String.fromCharCode(' + KEY_CODES.join(',') + ');' +
  'function _u8(a){var s="",i=0,n=a.length,c,c2,c3,c4,cp;while(i<n){c=a[i++];' +
  'if(c<128)s+=String.fromCharCode(c);' +
  'else if(c<224){c2=a[i++];s+=String.fromCharCode((c&31)<<6|c2&63);}' +
  'else if(c<240){c2=a[i++];c3=a[i++];s+=String.fromCharCode((c&15)<<12|(c2&63)<<6|c3&63);}' +
  'else{c2=a[i++];c3=a[i++];c4=a[i++];cp=((c&7)<<18|(c2&63)<<12|(c3&63)<<6|c4&63)-65536;' +
  's+=String.fromCharCode(55296+(cp>>10),56320+(cp&1023));}}return s;}' +
  'function _dec(s){var b=atob(s),n=b.length,a=new Uint8Array(n),i;' +
  'for(i=0;i<n;i++)a[i]=b.charCodeAt(i)^_XK.charCodeAt(i%_XK.length);' +
  'try{return new TextDecoder().decode(a);}catch(e){return _u8(a);}}' +
  'if(![].flatMap){Array.prototype.flatMap=function(f,t){return this.reduce(function(a,v,i,arr){var r=f.call(t,v,i,arr);return a.concat(Array.isArray(r)?r:[r]);},[]);};}' +
  'if(!Object.values){Object.values=function(o){return Object.keys(o).map(function(k){return o[k];});};}' +
  'if(!Object.assign){Object.assign=function(t){for(var i=1;i<arguments.length;i++){var s=arguments[i];if(s)for(var k in s)if(Object.prototype.hasOwnProperty.call(s,k))t[k]=s[k];}return t;};}' +
  // 语音合成兜底：微信 X5 等无 Web Speech API 的内核里，speechSynthesis 全局根本不存在，
  // 裸引用会抛 ReferenceError（点标签→showSection→stopReading→speechSynthesis.cancel 即崩）。
  // 缺失时装一个 no-op 桩，全站正常可用，仅朗读静默降级。
  'if(typeof speechSynthesis==="undefined"){window.__noTTS=1;try{window.speechSynthesis={speaking:false,paused:false,pending:false,cancel:function(){},pause:function(){},resume:function(){},speak:function(){},getVoices:function(){return[];},onvoiceschanged:null,addEventListener:function(){},removeEventListener:function(){}};}catch(e){}}' +
  'if(typeof SpeechSynthesisUtterance==="undefined"){try{window.SpeechSynthesisUtterance=function(t){this.text=t;this.lang="";this.rate=1;this.pitch=1;this.volume=1;this.voice=null;this.onend=null;this.onerror=null;};}catch(e){}}' +
  '\n';

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
  // safari10：规避老 WKWebView（iOS 10/11，微信内置浏览器）的 let 循环与 punctuator bug
  const opts = { compress: { toplevel: false, keep_fnames: true }, mangle: { toplevel: false, safari10: true }, format: { comments: false, safari10: true } };
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
