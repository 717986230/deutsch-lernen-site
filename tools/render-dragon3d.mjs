// 把 tools/dragon3d/scene.js 的 3D 双龙渲染成循环动图（带透明通道的 animated AVIF，比 WebP 小 5 倍）：
//   frames/pro_life[-<key>].avif     大图 300px（头像的 3 倍画布）
//   frames/pro_life[-<key>]-sm.avif  小图 150px（中心裁到 1.875 倍，用在排行榜/列表）
// 前端用 <picture> 下发：不支持动态 AVIF 的老浏览器自动退回同名 .svg（平面双龙）。
// 用法：node tools/render-dragon3d.mjs [key...]   需要 devDependency three + 预装 Chromium + ffmpeg
import http from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
import { PRO_LIFE_COLORS } from './gen-frame-prolife.mjs';

const RENDER = +process.env.R || 540, N = +process.env.N || 48, FPS = 16;
const BIG = +process.env.BIG || 300, SM = +process.env.SM || 150, CRF = +process.env.CRF || 38;
const only = process.argv.slice(2);
const keys = only.length ? only : Object.keys(PRO_LIFE_COLORS);
const types = { '.js': 'text/javascript', '.html': 'text/html', '.mjs': 'text/javascript' };
const srv = http.createServer((q, r) => { const f = join(process.cwd(), decodeURIComponent(q.url.split('?')[0])); if (!existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' }); r.end(readFileSync(f)); }).listen(0);
const port = srv.address().port;
const b = await pkg.chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
mkdirSync('frames', { recursive: true });
for (const key of keys) {
  const t0 = Date.now();
  const p = await b.newPage();
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto(`http://localhost:${port}/tools/dragon3d/index.html`);
  await p.waitForFunction(() => window.setup);
  await p.evaluate(([K, S]) => window.setup(K, S), [PRO_LIFE_COLORS[key], RENDER]);
  const dir = join(tmpdir(), 'd3-' + key); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir);
  for (let i = 0; i < N; i++) {
    const url = await p.evaluate((t) => window.renderAt(t), i / N);
    writeFileSync(join(dir, `f${String(i).padStart(3, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  await p.close();
  const base = key === 'gold' ? 'pro_life' : `pro_life-${key}`;
  const crop = Math.round(RENDER * 1.875 / 3);
  // AVIF 的透明通道要拆成独立的灰度流交给封装器
  const enc = (vf, out) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(dir, 'f%03d.png'), '-filter_complex', `[0:v]${vf},format=yuva420p,split[c][a];[a]alphaextract[a1]`, '-map', '[c]', '-map', '[a1]', '-c:v', 'libaom-av1', '-crf', String(CRF), '-cpu-used', '6', '-row-mt', '1', '-still-picture', '0', '-loop', '0', out]);
  enc(`scale=${BIG}:${BIG}:flags=lanczos`, `frames/${base}.avif`);
  enc(`crop=${crop}:${crop},scale=${SM}:${SM}:flags=lanczos`, `frames/${base}-sm.avif`);
  rmSync(dir, { recursive: true, force: true });
  const kb = (f) => (readFileSync(f).length / 1024).toFixed(0);
  console.log(`✓ ${key}: ${kb(`frames/${base}.avif`)}KB / sm ${kb(`frames/${base}-sm.avif`)}KB  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
await b.close(); srv.close();
