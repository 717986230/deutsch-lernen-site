// 永久会员头像框「双龙戏珠 · 天穹龙翼」：16 翼天使翅膀 + 两条东方龙左右盘旋、轮流吐息、头顶共护龙珠。
// 8 种元素龙可自选（换色 = 换龙：龙身、鬃毛、龙息特效、翅膀、粒子全部跟着变）。原创矢量动画。
// 两种尺寸：
//   frames/pro_life[-<key>].svg     大图：画布 240，头像位直径 80 居中（= 头像的 3 倍），用在个人主页 / 选框面板
//   frames/pro_life[-<key>]-sm.svg  紧凑图：画布 150（= 头像的 1.875 倍），用在排行榜 / 关注列表
// 用法：node tools/gen-frame-prolife.mjs（gen-frames.mjs 会顺带调用）
import { writeFileSync, mkdirSync } from 'node:fs';

// body: [亮, 主, 暗边]；mane: [鬃毛主, 鬃毛亮]；w: 翅膀 4 阶（亮→暗）；fx: 龙息 4 阶（核心→外焰）
export const PRO_LIFE_COLORS = {
  gold:    { name: '金龙', breath: 'light',   body: ['#fff1b8', '#e8b23a', '#6b3f05'], belly: '#fff4d0', mane: ['#ff8a1f', '#ffd34d'], horn: '#fff7e0', eye: '#ff3b1f',
             w: ['#ffffff', '#fff3c4', '#f8cf62', '#c98a1a'], halo: '#ffe27a', glow: '#ffd24a', gem: '#e11d48', fx: ['#ffffff', '#fff3a8', '#ffd24a', '#f59e0b'], spark: 'star' },
  flame:   { name: '火龙', breath: 'fire',    body: ['#ffa36b', '#d6300f', '#3d0802'], belly: '#ffc98a', mane: ['#ff5a1f', '#ffc53d'], horn: '#fde68a', eye: '#ffe14d',
             w: ['#fff1e6', '#ffb36b', '#ff5a1f', '#9b1006'], halo: '#ff9a3c', glow: '#ff5a1f', gem: '#facc15', fx: ['#fff7d1', '#ffd24a', '#ff6a00', '#c21d0a'], spark: 'ember' },
  ice:     { name: '冰龙', breath: 'ice',     body: ['#ffffff', '#9fdcff', '#1d4ed8'], belly: '#eefcff', mane: ['#67e8f9', '#e0f7ff'], horn: '#ffffff', eye: '#22d3ee',
             w: ['#ffffff', '#dff6ff', '#7fd3ff', '#2a6fdb'], halo: '#a5f0ff', glow: '#4cc9ff', gem: '#38bdf8', fx: ['#ffffff', '#cffafe', '#7dd3fc', '#3b82f6'], spark: 'snow' },
  thunder: { name: '雷龙', breath: 'bolt',    body: ['#c4b5fd', '#4c1d95', '#170838'], belly: '#fde68a', mane: ['#facc15', '#fef08a'], horn: '#fef9c3', eye: '#fde047',
             w: ['#ffffff', '#fef9c3', '#a78bfa', '#4c1d95'], halo: '#fde047', glow: '#a78bfa', gem: '#facc15', fx: ['#ffffff', '#fef08a', '#facc15', '#8b5cf6'], spark: 'bolt' },
  water:   { name: '水龙', breath: 'water',   body: ['#7dd3fc', '#0e7490', '#062a35'], belly: '#ccfbf1', mane: ['#22d3ee', '#a5f3fc'], horn: '#e0f2fe', eye: '#5eead4',
             w: ['#ffffff', '#cffafe', '#22d3ee', '#0e7490'], halo: '#67e8f9', glow: '#06b6d4', gem: '#2dd4bf', fx: ['#ffffff', '#a5f3fc', '#22d3ee', '#0369a1'], spark: 'drop' },
  wind:    { name: '风龙', breath: 'wind',    body: ['#d9f99d', '#16a34a', '#052e16'], belly: '#ecfccb', mane: ['#4ade80', '#d9f99d'], horn: '#f0fdf4', eye: '#a3e635',
             w: ['#ffffff', '#dcfce7', '#86efac', '#15803d'], halo: '#bbf7d0', glow: '#4ade80', gem: '#a3e635', fx: ['#ffffff', '#dcfce7', '#86efac', '#16a34a'], spark: 'leaf' },
  abyss:   { name: '暗龙', breath: 'dark',    body: ['#6b7280', '#141a2a', '#020409'], belly: '#c4b5fd', mane: ['#a855f7', '#f0abfc'], horn: '#e5e7eb', eye: '#f0abfc',
             w: ['#f5ecff', '#c4a1ff', '#7c3aed', '#2e1065'], halo: '#d8b4fe', glow: '#a855f7', gem: '#a855f7', fx: ['#fdf4ff', '#f0abfc', '#a21caf', '#2e1065'], spark: 'orb' },
  rainbow: { name: '彩龙', breath: 'rainbow', body: ['#fdf4ff', '#c084fc', '#3730a3'], belly: '#ffffff', mane: ['#f472b6', '#67e8f9'], horn: '#ffffff', eye: '#a3e635',
             w: ['#ffffff', '#ffd1f0', '#9ad7ff', '#8b5cf6'], halo: '#ffffff', glow: '#f472b6', gem: '#22d3ee', fx: ['#ffffff', '#fde047', '#f472b6', '#6366f1'], spark: 'star', rainbow: true },
};
export const PRO_LIFE_KEYS = Object.keys(PRO_LIFE_COLORS);
const RBW = ['#f43f5e', '#f59e0b', '#facc15', '#4ade80', '#22d3ee', '#6366f1', '#c084fc'];

const f1 = (n) => +n.toFixed(1);
const nrm = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
const rot = ([x, y], deg) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; };

function build(key, compact) {
  const K = PRO_LIFE_COLORS[key];
  const S = compact ? 150 : 240, C = S / 2, AV = 40;
  const P = (r, deg) => { const a = (deg - 90) * Math.PI / 180; return [f1(C + r * Math.cos(a)), f1(C + r * Math.sin(a))]; };
  const defs = [];
  const lin = (id, stops, x1 = 0, y1 = 0, x2 = 1, y2 = 0) => defs.push(`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
    stops.map((s, i) => { const [c, o] = Array.isArray(s) ? s : [s, 1]; return `<stop offset="${(i / (stops.length - 1)).toFixed(2)}" stop-color="${c}"${o < 1 ? ` stop-opacity="${o}"` : ''}/>`; }).join('') + `</linearGradient>`);

  lin('ring', [K.w[0], K.halo, K.w[2], K.w[1], K.w[3], K.w[0]], 0, 0, 1, 1);
  lin('bA', [K.fx[0], K.fx[1], K.fx[2], [K.fx[3], 0.15]]);
  lin('fth', [K.w[2], K.w[1], K.w[0]], 0, 0, 0, 1);
  lin('fthB', [K.w[3], K.w[2]], 0, 0, 0, 1);
  if (K.rainbow) { lin('fthR', ['#8b5cf6', '#22d3ee', '#a3e635', '#fbbf24', '#f472b6'], 0, 0, 0, 1); lin('mnR', RBW, 0, 0, 1, 1); }
  defs.push(`<radialGradient id="pg" cx=".35" cy=".3"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="${K.fx[1]}"/><stop offset="1" stop-color="${K.fx[3]}"/></radialGradient>`);
  defs.push(`<filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${compact ? 1.2 : 2.2}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  defs.push(`<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${compact ? 2.5 : 5}"/></filter>`);
  const MANE = K.rainbow ? 'url(#mnR)' : K.mane[0];

  // ───────────── 翅膀（每侧 8 翼，共 16 翼）─────────────
  const wingLen = compact ? 33 : 74;
  const feather = (len, wid, fill, stroke, sw) =>
    `<path d="M0 0C${f1(wid)} ${f1(len * 0.25)} ${f1(wid * 0.9)} ${f1(len * 0.78)} 0 ${f1(len)}C${f1(-wid * 0.9)} ${f1(len * 0.78)} ${f1(-wid)} ${f1(len * 0.25)} 0 0Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
    `<path d="M0 ${f1(len * 0.05)}L0 ${f1(len * 0.9)}" stroke="${K.w[0]}" stroke-width="${f1(sw * 0.8)}" opacity=".7"/>`;
  const wing = (L, back) => {
    const fill = back ? 'url(#fthB)' : (K.rainbow ? 'url(#fthR)' : 'url(#fth)');
    const sw = compact ? 0.35 : 0.6, n = compact ? 7 : 10;
    const armY = (x) => -Math.sin(Math.PI * x / L) * L * 0.16;
    let prim = '', cov = '';
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / n, x = t * L * 0.96, y = armY(x), dir = 105 - t * 82;
      const len = L * (0.32 + 0.5 * t), wid = (compact ? 2.2 : 3.6) * (0.8 + 0.5 * t);
      prim += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(dir - 90)})">${feather(len, wid, fill, K.w[3], sw)}</g>`;
      if (t < 0.8) cov += `<g transform="translate(${f1(x - L * 0.03)} ${f1(y - 1)}) rotate(${f1(dir - 80)})">${feather(len * 0.48, wid * 0.95, back ? 'url(#fthB)' : K.w[1], K.w[3], sw)}</g>`;
    }
    return prim + cov + `<path d="M0 0Q${f1(L * 0.5)} ${f1(-L * 0.32)} ${f1(L * 0.98)} ${f1(armY(L * 0.98))}" fill="none" stroke="${back ? K.w[2] : K.w[0]}" stroke-width="${compact ? 1.6 : 3}" stroke-linecap="round"/>`;
  };
  const wingSpec = [[-58, 1.0], [-42, 0.97], [-27, 0.92], [-12, 0.86], [3, 0.78], [19, 0.68], [35, 0.58], [52, 0.48]];
  let wingsBack = '', wingsFront = '';
  [-1, 1].forEach((sx) => wingSpec.forEach(([elev, k], i) => {
    const g = `<g transform="translate(${f1(C + sx * (AV + 2))} ${f1(C - 4 + elev * 0.1)}) scale(${sx} 1) rotate(${elev})"><g class="flap" style="animation-delay:${(i * 0.09).toFixed(2)}s">${wing(wingLen * k, i % 2 === 1)}</g></g>`;
    if (i % 2) wingsBack += g; else wingsFront += g;
  }));

  // ───────────── 东方龙（右侧这条；左侧镜像）─────────────
  // 脊线：从底部偏左（200°）经右侧向上绕到右上（28°），龙头朝向头顶的龙珠；半径带两个半波起伏 = 游动感
  const N = compact ? 60 : 96;
  const orbitR = AV + (compact ? 16 : 27), wobA = compact ? 3 : 7, rmax = compact ? 4.6 : 8.5;
  const sp = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), deg = 200 + (38 - 200) * t;
    let r = rmax * (0.14 + 0.86 * Math.sin(Math.min(t / 0.5, 1) * Math.PI / 2));
    if (t > 0.8) r *= 1 - 0.28 * (t - 0.8) / 0.2;                     // 脖颈收细
    const a = (deg - 90) * Math.PI / 180, rad = orbitR + wobA * Math.sin(t * Math.PI * 3);
    sp.push({ x: C + rad * Math.cos(a), y: C + rad * Math.sin(a), r, t });
  }
  sp.forEach((p, i) => {                                                // 切线（朝龙头）+ 外法线（背离圆心）
    const a = sp[Math.max(0, i - 1)], b = sp[Math.min(N - 1, i + 1)];
    const [tx, ty] = nrm(b.x - a.x, b.y - a.y);
    let nx = -ty, ny = tx; if (nx * (p.x - C) + ny * (p.y - C) < 0) { nx = -nx; ny = -ny; }
    Object.assign(p, { tx, ty, nx, ny });
  });
  const at = (p, o, s = 0) => [f1(p.x + p.nx * o + p.tx * s), f1(p.y + p.ny * o + p.ty * s)];
  const pt = (q) => `${q[0]} ${q[1]}`;
  const band = (a, b) => {
    let d = '';
    for (let i = 0; i < N; i++) d += (i ? 'L' : 'M') + pt(at(sp[i], a * sp[i].r));
    for (let i = N - 1; i >= 0; i--) d += 'L' + pt(at(sp[i], b * sp[i].r));
    return d + 'Z';
  };
  const sw = compact ? 0.4 : 0.6;

  // 背鳍：内侧（朝头像）一排向后掠的火焰状鬃毛，尖端不进头像区
  let dorsal = '';
  const dStep = compact ? 5 : 4;
  for (let i = Math.round(N * 0.1), k = 0; i < N * 0.9; i += dStep, k++) {
    const p = sp[i], r = p.r, w = r * 0.55;
    let h = r * (0.9 + 0.5 * (k % 2));
    let tip = at(p, -(r + h), -h * 0.9);
    while (Math.hypot(tip[0] - C, tip[1] - C) < AV + 3 && h > 0.5) { h *= 0.8; tip = at(p, -(r + h), -h * 0.9); }
    dorsal += `<path d="M${pt(at(p, -r * 0.7, w))}Q${pt(at(p, -(r + h * 0.5), w * 0.1))} ${pt(tip)}Q${pt(at(p, -(r + h * 0.15), -w * 1.1))} ${pt(at(p, -r * 0.7, -w))}Z" fill="${k % 2 ? K.mane[1] : MANE}" stroke="${K.body[2]}" stroke-width="${sw}"/>`;
  }

  // 四肢：外侧（腹侧）伸出，大腿往尾部收、小臂往前探，三趾利爪 + 肘部火焰毛
  const leg = (ti, L) => {
    const p = sp[Math.round(ti * (N - 1))], r = p.r, n = [p.nx, p.ny], t = [p.tx, p.ty];
    const base = at(p, r * 0.75);
    const d1 = nrm(n[0] * 0.9 - t[0] * 0.45, n[1] * 0.9 - t[1] * 0.45);
    const knee = [f1(base[0] + d1[0] * L), f1(base[1] + d1[1] * L)];
    const d2 = nrm(n[0] * 0.6 + t[0] * 0.8, n[1] * 0.6 + t[1] * 0.8);
    const paw = [f1(knee[0] + d2[0] * L * 0.8), f1(knee[1] + d2[1] * L * 0.8)];
    const lw = r * 0.95;
    const tuftDir = nrm(-t[0] * 0.8 - d1[0] * 0.2, -t[1] * 0.8 - d1[1] * 0.2), perp = [-d1[1], d1[0]];
    const tuftTip = [f1(knee[0] + tuftDir[0] * L * 0.75), f1(knee[1] + tuftDir[1] * L * 0.75)];
    let s = `<path d="M${pt([f1(knee[0] + perp[0] * lw * 0.5), f1(knee[1] + perp[1] * lw * 0.5)])}Q${pt([f1(knee[0] + tuftDir[0] * L * 0.4 + perp[0] * lw), f1(knee[1] + tuftDir[1] * L * 0.4 + perp[1] * lw)])} ${pt(tuftTip)}Q${pt([f1(knee[0] + tuftDir[0] * L * 0.3), f1(knee[1] + tuftDir[1] * L * 0.3)])} ${pt([f1(knee[0] - perp[0] * lw * 0.5), f1(knee[1] - perp[1] * lw * 0.5)])}Z" fill="${MANE}" stroke="${K.body[2]}" stroke-width="${sw}"/>`;
    const limb = `M${pt(base)}L${pt(knee)}L${pt(paw)}`;
    s += `<path d="${limb}" fill="none" stroke="${K.body[2]}" stroke-width="${f1(lw + (compact ? 1 : 1.6))}" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<path d="${limb}" fill="none" stroke="${K.body[1]}" stroke-width="${f1(lw)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<path d="${limb}" fill="none" stroke="${K.body[0]}" stroke-width="${f1(lw * 0.3)}" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>`;
    [-40, 0, 40].forEach((a) => {
      const dir = rot(d2, a), c = rot(dir, 35);
      const tip = [f1(paw[0] + dir[0] * L * 0.55), f1(paw[1] + dir[1] * L * 0.55)];
      const ctl = [f1(paw[0] + c[0] * L * 0.4), f1(paw[1] + c[1] * L * 0.4)];
      s += `<path d="M${pt(paw)}Q${pt(ctl)} ${pt(tip)}" fill="none" stroke="${K.body[2]}" stroke-width="${f1(lw * 0.5)}" stroke-linecap="round"/><path d="M${pt(paw)}Q${pt(ctl)} ${pt(tip)}" fill="none" stroke="${K.horn}" stroke-width="${f1(lw * 0.3)}" stroke-linecap="round"/>`;
    });
    return s + `<circle cx="${paw[0]}" cy="${paw[1]}" r="${f1(lw * 0.55)}" fill="${K.body[1]}" stroke="${K.body[2]}" stroke-width="${sw}"/>`;
  };
  const legs = leg(0.36, compact ? 7 : 14) + leg(0.74, compact ? 7 : 14);

  // 尾巴：末端一团扇形火焰毛
  const tp = sp[0], back = [-tp.tx, -tp.ty], Lt = compact ? 10 : 18;
  let tail = '';
  [-38, -12, 14, 40].forEach((a, j) => {
    const d = rot(back, a), q = [-d[1], d[0]], len = Lt * (j === 1 || j === 2 ? 1 : 0.72);
    const tip = [f1(tp.x + d[0] * len), f1(tp.y + d[1] * len)];
    const c1 = [f1(tp.x + d[0] * len * 0.5 + q[0] * len * 0.28), f1(tp.y + d[1] * len * 0.5 + q[1] * len * 0.28)];
    const c2 = [f1(tp.x + d[0] * len * 0.55 - q[0] * len * 0.05), f1(tp.y + d[1] * len * 0.55 - q[1] * len * 0.05)];
    tail += `<path d="M${f1(tp.x)} ${f1(tp.y)}Q${pt(c1)} ${pt(tip)}Q${pt(c2)} ${f1(tp.x)} ${f1(tp.y)}Z" fill="${j % 2 ? K.mane[1] : MANE}" stroke="${K.body[2]}" stroke-width="${sw}"/>`;
  });

  // 龙身：暗边 → 主色 → 背部高光 → 腹甲（外侧，带横纹）→ 鳞片
  let body = `<path d="${band(-1.13, 1.13)}" fill="${K.body[2]}"/><path d="${band(-0.92, 0.92)}" fill="${K.body[1]}"/>` +
    `<path d="${band(-0.72, -0.2)}" fill="${K.body[0]}" opacity=".42"/><path d="${band(0.3, 0.9)}" fill="${K.belly}"/>`;
  for (let i = 3; i < N - 2; i += compact ? 3 : 2) {
    const p = sp[i];
    body += `<path d="M${pt(at(p, p.r * 0.3))}Q${pt(at(p, p.r * 0.62, -p.r * 0.28))} ${pt(at(p, p.r * 0.9))}" fill="none" stroke="${K.body[2]}" stroke-width="${f1(sw * 0.8)}" opacity=".6"/>`;
  }
  for (let i = 4, k = 0; i < N - 3; i += compact ? 4 : 3, k++) {      // 鳞片：两排交错的 U 形，开口朝龙头
    const p = sp[i];
    if (p.r < rmax * 0.35) continue;
    const o = (k % 2 ? -0.62 : -0.12) * p.r, s = p.r * 0.3;
    body += `<path d="M${pt(at(p, o + s))}Q${pt(at(p, o, -s * 1.7))} ${pt(at(p, o - s))}" fill="none" stroke="${K.body[0]}" stroke-width="${f1(sw)}" opacity=".6"/>`;
  }

  // 龙头（局部坐标：朝 +x，头顶朝 -y，原点在脖颈）
  const B = K.body;
  let breath = '';
  const bm = K.breath;
  if (bm === 'fire') breath =
    `<path d="M35 2C46 -6 62 -13 84 -9C74 -4 76 0 93 2C76 6 76 10 88 17C66 21 48 14 35 6Z" fill="url(#bA)"/>` +
    `<path d="M36 3C48 -1 60 -1 76 3C60 6 48 7 36 5Z" fill="${K.fx[0]}"/>` +
    [[64, -12, 1.6], [80, 16, 1.4], [92, -4, 1.2], [72, 20, 1]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${K.fx[1]}"/>`).join('');
  else if (bm === 'light') breath =
    `<path d="M35 3L98 -11L98 19Z" fill="url(#bA)" opacity=".75"/><path d="M35 3.5L100 0L100 8Z" fill="${K.fx[0]}"/>` +
    `<circle cx="38" cy="4" r="6" fill="${K.fx[0]}" opacity=".9"/>` +
    [-30, -10, 10, 30].map((a) => `<path d="M38 4L${f1(38 + 14 * Math.cos(a * Math.PI / 180))} ${f1(4 + 14 * Math.sin(a * Math.PI / 180))}" stroke="${K.fx[1]}" stroke-width="1.2" stroke-linecap="round"/>`).join('');
  else if (bm === 'ice') breath =
    `<path d="M35 3C52 -6 74 -11 97 -7C89 2 89 8 97 17C74 19 52 14 35 6Z" fill="url(#bA)" opacity=".7"/>` +
    [[50, 3, 7, 2.2, -8], [62, -4, 9, 2.6, -14], [66, 10, 8, 2.4, 10], [80, 1, 11, 3, 0], [88, 13, 9, 2.6, 16], [80, -9, 7, 2, -20], [94, -2, 7, 2.2, -6]]
      .map(([x, y, l, w, a]) => `<path transform="rotate(${a} ${x} ${y})" d="M${x - l / 2} ${y}L${x} ${y - w}L${x + l / 2} ${y}L${x} ${y + w}Z" fill="${K.fx[0]}" stroke="${K.fx[3]}" stroke-width=".5"/>`).join('') +
    [[72, -12], [96, 9]].map(([x, y]) => `<path d="M${x - 3} ${y}H${x + 3}M${x - 1.5} ${y - 2.6}L${x + 1.5} ${y + 2.6}M${x - 1.5} ${y + 2.6}L${x + 1.5} ${y - 2.6}" stroke="#fff" stroke-width=".8" stroke-linecap="round"/>`).join('');
  else if (bm === 'bolt') {
    const z = 'M35 4L46 -1L52 7L63 1L70 10L81 2L88 9L99 3M63 1L70 -6L78 -4L86 -12M70 10L76 17L85 15';
    breath = `<path d="M35 3C52 -6 74 -10 97 -6C89 2 89 8 97 16C74 18 52 14 35 6Z" fill="url(#bA)" opacity=".35"/>` +
      `<g class="fk"><path d="${z}" fill="none" stroke="${K.fx[3]}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round" opacity=".55"/>` +
      `<path d="${z}" fill="none" stroke="${K.fx[2]}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>` +
      `<path d="${z}" fill="none" stroke="#fff" stroke-width=".9" stroke-linejoin="round" stroke-linecap="round"/></g>`;
  } else if (bm === 'water') breath =
    `<path d="M35 2C48 -2 60 -6 72 -4C80 -3 86 -8 97 -6C93 0 93 8 97 14C86 14 80 10 72 12C60 14 48 10 35 6Z" fill="url(#bA)"/>` +
    `<path d="M38 3.5C50 1 58 4 68 2S84 4 95 2M44 6C54 8 64 6 74 8S88 8 94 9" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".85"/>` +
    [[80, -11, 1.8], [90, -12, 1.2], [86, 17, 1.6], [96, 19, 1.1], [70, -9, 1.1]].map(([x, y, r]) => `<path d="M${x} ${f1(y - r * 1.8)}Q${f1(x + r)} ${y} ${x} ${f1(y + r)}Q${f1(x - r)} ${y} ${x} ${f1(y - r * 1.8)}Z" fill="${K.fx[1]}"/>`).join('');
  else if (bm === 'wind') breath =
    `<path d="M35 3C52 -6 74 -11 97 -7C89 2 89 8 97 17C74 19 52 14 35 6Z" fill="url(#bA)" opacity=".45"/>` +
    [[56, 4, 5], [74, 2, 7], [90, 7, 8]].map(([x, y, R]) => `<path d="M${x + R} ${y}A${R} ${R} 0 1 1 ${x} ${y - R}A${f1(R * 0.6)} ${f1(R * 0.6)} 0 1 1 ${f1(x + R * 0.3)} ${y}" fill="none" stroke="${K.fx[2]}" stroke-width="1.6" stroke-linecap="round"/>`).join('') +
    `<path d="M36 2C56 -5 76 -8 99 -4M36 6C56 13 76 16 99 13" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".9"/>`;
  else if (bm === 'dark') breath =
    `<path d="M35 3C52 -7 74 -12 97 -8C89 2 89 8 97 18C74 20 52 15 35 6Z" fill="url(#bA)" opacity=".85"/>` +
    [[54, 4, 3.5], [70, -3, 4.5], [72, 12, 3.5], [88, 4, 5.5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${K.fx[3]}" stroke="${K.fx[1]}" stroke-width="1"/><circle cx="${f1(x - r * 0.3)}" cy="${f1(y - r * 0.3)}" r="${f1(r * 0.35)}" fill="${K.fx[0]}"/>`).join('');
  else breath =
    RBW.map((c, k) => `<path d="M35 3.5L99 ${f1(-12 + k * 4.4)}L99 ${f1(-12 + (k + 1) * 4.4)}Z" fill="${c}" opacity=".85"/>`).join('') +
    `<path d="M35 3.5L100 1.5L100 6Z" fill="#fff"/>`;

  const maneHead = Array.from({ length: 5 }, (_, j) => {
    const y = -9 + j * 3.6;
    return `<path d="M-1 ${f1(y)}C-9 ${f1(y - 6)} -19 ${f1(y - 3)} ${-27 - j * 1.5} ${f1(y + 3 + j)}C-18 ${f1(y + 1)} -10 ${f1(y + 3)} -1 ${f1(y + 3)}Z" fill="${j % 2 ? K.mane[1] : MANE}" stroke="${B[2]}" stroke-width=".6"/>`;
  }).join('');
  const antler = (dx, dy, col) =>
    `<g transform="translate(${dx} ${dy})" fill="none" stroke="${col}" stroke-linecap="round"><path d="M5 -10C1 -18 -6 -24 -17 -28" stroke-width="2.8"/><path d="M-3 -20Q-2 -27 3 -32M-10 -25Q-12 -31 -8 -36" stroke-width="2"/></g>`;
  const head =
    `<g class="mn">${maneHead}</g>` +
    antler(-3, 1.5, B[2]) + antler(0, 0, K.horn) +
    `<path class="wk" d="M33 -5C41 -16 29 -23 15 -21C4 -19 -4 -25 -13 -21" fill="none" stroke="${K.mane[1]}" stroke-width="1.2" stroke-linecap="round"/>` +
    // 下颚（张口）+ 舌头
    `<path d="M4 3C14 4 24 4 33 3L30 8Z" fill="#7f1d1d"/>` +
    `<g class="jw"><path d="M-2 3C8 4 20 4.5 32 3.5L31 7C22 9.5 10 9.5 -1 7.5Z" fill="${B[1]}" stroke="${B[2]}" stroke-width=".7"/>` +
    `<path d="M22 4.3L23 1.5L24.4 4.4ZM28 4L29 1.4L30.2 4Z" fill="#fff"/>` +
    `<path d="M4 8C2 13 -2 17 -8 19C-2 14 -1 11 0 8Z" fill="${MANE}" stroke="${B[2]}" stroke-width=".5"/></g>` +
    // 头颅 + 吻部 + 鼻头
    `<path d="M-6 -6C-4 -12 6 -14 12 -11C16 -9 18 -9 22 -8C28 -7 33 -8 36 -5C39 -3 38 1 35 1.5L8 2.5C2 3 -4 4 -6 2Z" fill="${B[1]}" stroke="${B[2]}" stroke-width=".8"/>` +
    `<path d="M10 -11C16 -10 22 -8.5 32 -7" fill="none" stroke="${B[0]}" stroke-width="1.3" stroke-linecap="round" opacity=".75"/>` +
    `<ellipse cx="34" cy="-4" rx="3.2" ry="2.5" fill="${B[0]}" opacity=".55"/><ellipse cx="36.2" cy="-3" rx="1" ry=".7" fill="${B[2]}"/>` +
    `<path d="M30 1.6L31 5L32.2 1.5ZM24 2L25 5.4L26.2 2Z" fill="#fff"/>` +
    // 腮鳍、眉骨、发光竖瞳
    `<path d="M3 -1C-3 -3 -7 0 -10 5C-5 3 -1 3 3 2Z" fill="${MANE}" stroke="${B[2]}" stroke-width=".5"/>` +
    `<path d="M8 -10Q0 -18 -8 -16Q-1 -12 8 -8.5Z" fill="${K.mane[1]}" stroke="${B[2]}" stroke-width=".5"/>` +
    `<path d="M7 -9.5Q13 -14 20 -8.5" fill="none" stroke="${B[2]}" stroke-width="1.8" stroke-linecap="round"/>` +
    `<path d="M9 -6Q13 -9.5 17.5 -6Q13 -3.8 9 -6Z" fill="${K.eye}" filter="url(#glow)"/><ellipse cx="13.6" cy="-6.3" rx=".7" ry="1.7" fill="#000"/>` +
    `<path class="wk" d="M34 0C41 4 40 10 33 13C27 15 22 14 17 16" fill="none" stroke="${K.mane[1]}" stroke-width="1.2" stroke-linecap="round"/>` +
    `<g class="br" filter="url(#glow)">${breath}</g>`;
  const hp = sp[N - 1], hs = compact ? 0.62 : 1.12;
  const phi = f1(Math.atan2(-hp.ty, -hp.tx) * 180 / Math.PI + 8);
  const headG = `<g transform="translate(${f1(hp.x)} ${f1(hp.y)}) rotate(${phi}) scale(${-hs} ${hs})">${head}</g>`;
  const dragon = (cls) => `<g class="${cls}">${dorsal}${tail}${body}${legs}${headG}</g>`;

  // ───────────── 龙珠 + 光环 + 主环 + 元素粒子 ─────────────
  const [px, py] = P(AV + (compact ? 21 : 36), 0), pr = compact ? 4.2 : 7;
  const tongue = (a, len, col) => `<path transform="rotate(${a})" d="M${f1(-pr * 0.45)} ${f1(-pr * 0.7)}Q0 ${f1(-pr * len)} ${f1(pr * 0.45)} ${f1(-pr * 0.7)}Z" fill="${col}"/>`;
  const pearl = `<g transform="translate(${px} ${py})"><g class="pf">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => tongue(a, 2.3, K.fx[2])).join('')}${[22, 112, 202, 292].map((a) => tongue(a, 1.8, K.fx[1])).join('')}</g>` +
    `<circle r="${f1(pr * 1.5)}" fill="${K.glow}" opacity=".6" filter="url(#soft)"/><g class="pl"><circle r="${pr}" fill="url(#pg)" stroke="#fff" stroke-width="${compact ? 0.5 : 0.8}"/><circle cx="${f1(-pr * 0.35)}" cy="${f1(-pr * 0.38)}" r="${f1(pr * 0.28)}" fill="#fff"/></g>` +
    `<g class="hl" filter="url(#glow)"><ellipse cx="0" cy="${f1(-pr * 2.1)}" rx="${f1(pr * 2)}" ry="${f1(pr * 0.5)}" fill="none" stroke="${K.halo}" stroke-width="${compact ? 1.4 : 2.2}"/></g></g>`;
  const ringW = compact ? 3.5 : 5;
  const mainRing =
    `<circle cx="${C}" cy="${C}" r="${AV + (compact ? 7 : 12)}" fill="none" stroke="${K.glow}" stroke-width="${compact ? 6 : 12}" opacity=".5" filter="url(#soft)"/>` +
    `<g class="spin"><circle cx="${C}" cy="${C}" r="${AV + ringW / 2}" fill="none" stroke="url(#ring)" stroke-width="${ringW}"/></g>` +
    `<circle cx="${C}" cy="${C}" r="${AV + ringW + 0.6}" fill="none" stroke="${K.w[0]}" stroke-width=".7" opacity=".8"/>` +
    [90, 180, 270].map((d) => { const [x, y] = P(AV + ringW / 2, d); return `<circle cx="${x}" cy="${y}" r="${compact ? 2.2 : 3.2}" fill="${K.gem}" stroke="${K.w[0]}" stroke-width="${compact ? 0.6 : 1}"/>`; }).join('');
  const sparkShape = (x, y, s, col) => {
    switch (K.spark) {
      case 'ember': return `<circle cx="${x}" cy="${y}" r="${f1(s * 0.5)}" fill="${col}"/>`;
      case 'snow': return `<path d="M${f1(x - s)} ${y}H${f1(x + s)}M${f1(x - s / 2)} ${f1(y - s * 0.87)}L${f1(x + s / 2)} ${f1(y + s * 0.87)}M${f1(x - s / 2)} ${f1(y + s * 0.87)}L${f1(x + s / 2)} ${f1(y - s * 0.87)}" stroke="${col}" stroke-width="${f1(s * 0.3)}" stroke-linecap="round"/>`;
      case 'drop': return `<path d="M${x} ${f1(y - s)}Q${f1(x + s * 0.6)} ${f1(y + s * 0.2)} ${x} ${f1(y + s * 0.6)}Q${f1(x - s * 0.6)} ${f1(y + s * 0.2)} ${x} ${f1(y - s)}Z" fill="${col}"/>`;
      case 'bolt': return `<path d="M${f1(x + s * 0.3)} ${f1(y - s)}L${f1(x - s * 0.4)} ${f1(y + s * 0.1)}L${f1(x + s * 0.2)} ${f1(y + s * 0.1)}L${f1(x - s * 0.3)} ${f1(y + s)}" fill="none" stroke="${col}" stroke-width="${f1(s * 0.3)}" stroke-linejoin="round"/>`;
      case 'leaf': return `<ellipse cx="${x}" cy="${y}" rx="${f1(s * 0.9)}" ry="${f1(s * 0.35)}" transform="rotate(-35 ${x} ${y})" fill="${col}"/>`;
      case 'orb': return `<circle cx="${x}" cy="${y}" r="${f1(s * 0.45)}" fill="${col}" stroke="${K.fx[2]}" stroke-width="${f1(s * 0.15)}"/>`;
      default: return `<path fill="${col}" d="M${x} ${f1(y - s)}Q${x} ${y} ${f1(x + s)} ${y}Q${x} ${y} ${x} ${f1(y + s)}Q${x} ${y} ${f1(x - s)} ${y}Q${x} ${y} ${x} ${f1(y - s)}Z"/>`;
    }
  };
  const sparks = Array.from({ length: compact ? 10 : 22 }, (_, i) => {
    const d = (i * 137.5) % 360, r = AV + (compact ? 10 : 16) + ((i * 29) % (compact ? 22 : 60));
    const [x, y] = P(r, d), s = compact ? 1.6 : 2.4 + (i % 3);
    const col = K.rainbow ? RBW[i % RBW.length] : (i % 3 ? K.fx[1] : K.halo);
    return `<g class="tw" style="animation-delay:${((i * 0.23) % 2.4).toFixed(2)}s">${sparkShape(x, y, s, col)}</g>`;
  }).join('');

  const css = `
.spin{transform-origin:${C}px ${C}px;animation:spin 6s linear infinite}
.flap{animation:flap 2.8s ease-in-out infinite;transform-origin:0 0}
.d1,.d2{transform-origin:${C}px ${C}px;animation:sway 7s ease-in-out infinite}
.d2{animation-delay:-3.5s}
.mn{transform-origin:-1px -2px;animation:mn 1.8s ease-in-out infinite alternate}
.wk{transform-origin:34px 0;animation:wk 2.2s ease-in-out infinite alternate}
.br{transform-origin:35px 4px;animation:br 4s ease-in infinite}
.jw{transform-origin:-2px 4px;animation:jw 4s ease-in-out infinite}
.d2 .br,.d2 .jw{animation-delay:-2s}
.fk{animation:fk .24s steps(2) infinite}
.pf{animation:spin 9s linear infinite}
.pl{animation:pl 2.2s ease-in-out infinite}
.hl{animation:hl 3s ease-in-out infinite}
.tw{transform-box:fill-box;transform-origin:center;animation:tw 2.4s ease-in-out infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes flap{0%,100%{transform:rotate(0)}50%{transform:rotate(-5deg)}}
@keyframes sway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
@keyframes mn{to{transform:rotate(9deg)}}
@keyframes wk{to{transform:rotate(-8deg)}}
@keyframes br{0%,50%{transform:scale(0,.3);opacity:0}58%{transform:scale(.7,.85);opacity:1}84%{transform:scale(1.08,1.05);opacity:1}100%{transform:scale(1.22,1.2);opacity:0}}
@keyframes jw{0%,46%,100%{transform:rotate(0)}56%,86%{transform:rotate(16deg)}}
@keyframes fk{50%{opacity:.35}}
@keyframes pl{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
@keyframes hl{0%,100%{transform:translateY(0)}50%{transform:translateY(-${compact ? 1.2 : 2.5}px)}}
@keyframes tw{0%,100%{opacity:.15;transform:scale(.4)}50%{opacity:1;transform:scale(1.2)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.br{opacity:0}}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}"><defs>${defs.join('')}<style>${css}</style></defs>` +
    `<g opacity=".95">${wingsBack}</g>${wingsFront}${mainRing}` +
    `<g transform="translate(${S} 0) scale(-1 1)">${dragon('d2')}</g>${dragon('d1')}` +
    pearl + sparks + `</svg>\n`;
}

export function genProLife() {
  mkdirSync('frames', { recursive: true });
  let n = 0;
  for (const key of PRO_LIFE_KEYS) {
    const base = key === 'gold' ? 'pro_life' : `pro_life-${key}`;
    writeFileSync(`frames/${base}.svg`, build(key, false));
    writeFileSync(`frames/${base}-sm.svg`, build(key, true));
    n += 2;
  }
  return n;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(`✓ 永久会员框：${genProLife()} 张`);
