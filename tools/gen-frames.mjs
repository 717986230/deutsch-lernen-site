// 生成头像框素材库 frames/<id>.svg（原创矢量动画，Steam / Discord 式「叠在头像外圈」的装饰图）。
// 画布 120×120，中间直径 80 的圆是头像位（留空），装饰画在外圈、可伸出到画布边缘。
// 前端把图片按「头像尺寸 × 1.5」叠在头像上（见 src.html .fr-img）。
// 用法：node tools/gen-frames.mjs   —— 改了这里要重新跑，frames/ 一并提交。
import { writeFileSync, mkdirSync } from 'node:fs';
import { genProLife } from './gen-frame-prolife.mjs';
import { genAvatars } from './gen-avatars.mjs';

const C = 60, AV = 40;                           // 圆心、头像半径
const P = (r, deg) => { const a = (deg - 90) * Math.PI / 180; return [+(C + r * Math.cos(a)).toFixed(2), +(C + r * Math.sin(a)).toFixed(2)]; };
const star4 = (x, y, s, cls = '', fill = '#fff', delay = 0) =>
  `<path class="${cls}" style="animation-delay:${delay}s" fill="${fill}" d="M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z"/>`;
const grad = (id, stops, x2 = 1, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map((c, i) => `<stop offset="${(i / (stops.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const ring = (r, w, paint, cls = '', extra = '') => `<circle class="${cls}" cx="${C}" cy="${C}" r="${r}" fill="none" stroke="${paint}" stroke-width="${w}" ${extra}/>`;
const leaf = (r, deg, len, wid, fill, cls = '', tilt = 40) => {
  const [x, y] = P(r, deg);
  return `<ellipse class="${cls}" cx="${x}" cy="${y}" rx="${wid}" ry="${len}" fill="${fill}" transform="rotate(${deg + tilt} ${x} ${y})"/>`;
};
const crown = (cx, cy, s, body, gem) => {
  const k = (v) => +(v * s).toFixed(2);
  return `<g transform="translate(${cx - k(14)} ${cy - k(12)})"><path fill="${body}" stroke="#7a4b00" stroke-width="${k(0.8)}" stroke-linejoin="round" d="M${k(1)} ${k(20)}L${k(0)} ${k(5)}L${k(7)} ${k(11)}L${k(14)} ${k(0)}L${k(21)} ${k(11)}L${k(28)} ${k(5)}L${k(27)} ${k(20)}Z"/><rect x="${k(1)}" y="${k(19)}" width="${k(26)}" height="${k(4)}" rx="${k(1.2)}" fill="${body}" stroke="#7a4b00" stroke-width="${k(0.8)}"/><circle cx="${k(14)}" cy="${k(13)}" r="${k(2.6)}" fill="${gem}"/><circle cx="${k(0)}" cy="${k(5)}" r="${k(1.8)}" fill="${body}"/><circle cx="${k(14)}" cy="${k(0)}" r="${k(1.8)}" fill="${body}"/><circle cx="${k(28)}" cy="${k(5)}" r="${k(1.8)}" fill="${body}"/></g>`;
};

const BASE_CSS = `
.spin{transform-origin:60px 60px;animation:spin var(--d,10s) linear infinite}
.rspin{transform-origin:60px 60px;animation:spin var(--d,14s) linear infinite reverse}
.tw{transform-box:fill-box;transform-origin:center;animation:tw 2.2s ease-in-out infinite}
.bob{transform-box:fill-box;transform-origin:center;animation:bob 2.6s ease-in-out infinite}
.sway{transform-box:fill-box;transform-origin:50% 100%;animation:sway 3s ease-in-out infinite}
.flk{transform-box:fill-box;transform-origin:50% 100%;animation:flk .9s ease-in-out infinite alternate}
.pulse{transform-origin:60px 60px;animation:pulse 2.4s ease-in-out infinite}
.wave{transform-origin:60px 60px;animation:wave 2.4s ease-out infinite}
.rise{transform-box:fill-box;animation:rise 2.4s ease-in infinite}
.blink{animation:blink 1.6s steps(1) infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes tw{0%,100%{opacity:.25;transform:scale(.5)}50%{opacity:1;transform:scale(1.15)}}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes sway{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}
@keyframes flk{0%{transform:scaleY(.82) skewX(-3deg)}100%{transform:scaleY(1.12) skewX(3deg)}}
@keyframes pulse{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes wave{0%{transform:scale(.9);opacity:.85}100%{transform:scale(1.22);opacity:0}}
@keyframes rise{0%{transform:translateY(0);opacity:0}15%{opacity:1}100%{transform:translateY(-26px);opacity:0}}
@keyframes blink{0%,100%{opacity:0}8%,14%{opacity:1}20%{opacity:0}52%,56%{opacity:1}60%{opacity:0}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;

const svg = (body, defs = '', css = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><defs>${defs}<filter id="gl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><style>${BASE_CSS}${css}</style></defs>${body}</svg>\n`;

const around = (n, f, off = 0) => Array.from({ length: n }, (_, i) => f(off + i * 360 / n, i)).join('');

const F = {};
const f2 = (n) => +n.toFixed(2);
// 符文：短线 / 小圆 / 小三角交替，沿圆排一圈（魔法阵用）
const runes = (r, n, color, w = 0.9) => around(n, (d, i) => {
  const [x, y] = P(r, d), k = i % 4;
  const g = k === 0 ? `<path d="M-2 -2.5L0 2.5L2 -2.5" fill="none"/>` : k === 1 ? `<circle r="1.6" fill="none"/>` : k === 2 ? `<path d="M-2 0H2M0 -2.5V2.5" fill="none"/>` : `<path d="M-2 2L0 -2.5L2 2Z" fill="none"/>`;
  return `<g transform="translate(${x} ${y}) rotate(${d})" stroke="${color}" stroke-width="${w}" stroke-linecap="round">${g}</g>`;
});
const polyStar = (r, n, rot = 0) => { let d = ''; for (let i = 0; i <= n * 2; i += 2) { const [x, y] = P(r, rot + (i % (n * 2)) * 360 / n * 0.5 * 2 / 2); d += (i ? 'L' : 'M') + x + ' ' + y; } return d + 'Z'; };
const hexagram = (r, rot = 0) => { const t = (o) => [0, 120, 240].map((a, i) => { const [x, y] = P(r, a + o + rot); return (i ? 'L' : 'M') + x + ' ' + y; }).join('') + 'Z'; return t(0) + t(60); };
const petal = (x, y, rot, s, fill, cls = '', delay = 0) =>
  `<path class="${cls}" style="animation-delay:${delay}s" transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" fill="${fill}" d="M0 -6C3.5 -6 5 -2 3.6 2C2.6 4.6 1 6 0 6.6C-1 6 -2.6 4.6 -3.6 2C-5 -2 -3.5 -6 0 -6ZM0 -6L-1 -4.2L0 -3.6L1 -4.2Z"/>`;
const sparkleField = (n, rMin, rMax, color, size = 2.4, seed = 1) => Array.from({ length: n }, (_, i) => {
  const d = (i * 137.5 + seed * 40) % 360, r = rMin + ((i * 7919 + seed * 31) % 100) / 100 * (rMax - rMin);
  const [x, y] = P(r, d); return star4(x, y, size * (0.6 + (i % 3) * 0.25), 'tw', color, f2(((i * 0.37) % 2.2)));
}).join('');
// 圆弧路径（顺时针，从 a 到 b 度）
const arc = (r, a, b) => { const [x1, y1] = P(r, a), [x2, y2] = P(r, b); return `M${x1} ${y1}A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${x2} ${y2}`; };
const GL = (sd) => `<filter id="g${sd}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

// ── 会员：紫晶魔法阵 ──
F.pro = svg(
  `<circle cx="60" cy="60" r="47" fill="none" stroke="#7c3aed" stroke-width="10" opacity=".35" filter="url(#g3)"/>` +
  `<g class="spin" style="--d:18s"><circle cx="60" cy="60" r="49.5" fill="none" stroke="url(#pm)" stroke-width="1.2"/><circle cx="60" cy="60" r="55" fill="none" stroke="#c4b5fd" stroke-width=".7" stroke-dasharray="1 3"/>${runes(52.3, 24, '#e9d5ff', .8)}</g>` +
  `<g class="rspin" style="--d:24s"><path d="${hexagram(47.5)}" fill="none" stroke="#a78bfa" stroke-width=".8" opacity=".9"/></g>` +
  `<g class="spin" style="--d:6s"><circle cx="60" cy="60" r="43" fill="none" stroke="url(#pr)" stroke-width="4"/></g>` +
  around(4, (d) => { const [x, y] = P(43, d); return `<path d="M${x} ${y - 4}L${x + 3} ${y}L${x} ${y + 4}L${x - 3} ${y}Z" fill="url(#gem)" stroke="#f5f3ff" stroke-width=".6" filter="url(#g1)"/>`; }, 45) +
  sparkleField(8, 50, 58, '#f5f3ff', 2.4, 3) +
  `<g class="bob">${crown(60, 13, 0.95, 'url(#pc)', '#22d3ee')}</g>`,
  grad('pm', ['#c4b5fd', '#7c3aed', '#f0abfc']) + grad('pr', ['#818cf8', '#f5f3ff', '#a855f7', '#e9d5ff', '#6366f1']) + grad('pc', ['#f5f3ff', '#c4b5fd', '#7c3aed'], 0, 1) + grad('gem', ['#cffafe', '#22d3ee', '#0e7490'], 0, 1) + GL(1) + GL(3));

// ── 创始人：星穹（银河漩涡 + 新月 + 星座） ──
F.founder = svg(
  `<circle cx="60" cy="60" r="48" fill="none" stroke="url(#neb)" stroke-width="13" opacity=".95"/>` +
  `<g class="spin" style="--d:30s">${around(3, (d) => `<path d="${arc(48, d, d + 70)}" fill="none" stroke="#c4b5fd" stroke-width="3.5" stroke-linecap="round" opacity=".55" filter="url(#g2)"/>`)}${sparkleField(16, 43, 54, '#ffffff', 1.6, 2)}</g>` +
  `<circle cx="60" cy="60" r="42" fill="none" stroke="url(#fg)" stroke-width="2"/>` +
  `<g filter="url(#g1)"><path d="M84 13A13 13 0 1 0 98 30A10 10 0 1 1 84 13Z" fill="#fef3c7"/></g>` +
  `<path d="M14 40L22 30L32 33L28 22" fill="none" stroke="#e0e7ff" stroke-width=".6" opacity=".8"/>` + [[14, 40], [22, 30], [32, 33], [28, 22]].map(([x, y], i) => star4(x, y, 2.3, 'tw', '#fde68a', i * 0.4)).join('') +
  `<g class="spin" style="--d:4.5s"><path d="${arc(56, 200, 245)}" fill="none" stroke="url(#fs)" stroke-width="1.8" stroke-linecap="round"/>${star4(...P(56, 245), 3.2, '', '#fff')}</g>`,
  `<radialGradient id="neb"><stop offset=".78" stop-color="#1e1b4b"/><stop offset=".88" stop-color="#4c1d95"/><stop offset="1" stop-color="#0f172a"/></radialGradient>` + grad('fg', ['#93c5fd', '#e9d5ff', '#fde68a', '#93c5fd']) + grad('fs', ['rgba(255,255,255,0)', '#ffffff']) + GL(1) + GL(2));

// ── 三日之约：朝阳（光芒万丈 + 云海 + 飞鸟） ──
F.streak3 = svg(
  `<g class="pulse">${around(16, (d, i) => { const [x1, y1] = P(46, d), [x2, y2] = P(i % 2 ? 56 : 60, d); return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="url(#ray)" stroke-width="${i % 2 ? 1.6 : 2.6}" stroke-linecap="round"/>`; }, 0)}</g>` +
  `<circle cx="60" cy="60" r="44" fill="none" stroke="url(#sg)" stroke-width="5"/><circle cx="60" cy="60" r="46.8" fill="none" stroke="#fff7ed" stroke-width=".8"/>` +
  `<g filter="url(#g2)"><circle cx="60" cy="13" r="9" fill="url(#sun)"/></g>` +
  `<g class="bob"><path d="M8 100C8 92 18 90 22 94C24 86 36 86 38 94C44 92 50 98 46 104H10C6 104 6 100 8 100Z" fill="#fff" stroke="#fed7aa" stroke-width=".8"/></g>` +
  `<g class="bob" style="animation-delay:1.3s"><path d="M78 104C76 96 86 94 90 98C92 90 104 90 106 98C112 96 116 102 112 108H82C78 108 76 104 78 104Z" fill="#fff" stroke="#fbcfe8" stroke-width=".8"/></g>` +
  `<g class="bob" style="animation-delay:.6s"><path d="M88 30q3 -3 6 0q3 -3 6 0" fill="none" stroke="#9a3412" stroke-width="1.1" stroke-linecap="round"/><path d="M96 40q2 -2 4 0q2 -2 4 0" fill="none" stroke="#9a3412" stroke-width=".9" stroke-linecap="round"/></g>`,
  grad('sg', ['#fdba74', '#fef08a', '#f9a8d4', '#fdba74']) + grad('ray', ['#fde047', '#fb923c'], 0, 1) + `<radialGradient id="sun"><stop offset="0" stop-color="#fffbeb"/><stop offset=".6" stop-color="#fde047"/><stop offset="1" stop-color="#fb923c"/></radialGradient>` + GL(2));

// ── 一周达人：炎之环（螺旋火焰 + 火星） ──
F.streak7 = svg(
  `<circle cx="60" cy="60" r="47" fill="none" stroke="#f97316" stroke-width="12" opacity=".35" filter="url(#g4)"/>` +
  `<g class="spin" style="--d:5s">${around(12, (d, i) => {
    const [x, y] = P(45, d), h = 14 + (i % 3) * 3;
    return `<path transform="translate(${x} ${y}) rotate(${d + 35})" d="M-5 0C-6 -6 -2 -${h * 0.6} 2 -${h}C3 -${h * 0.6} 7 -6 5 0C3 3 -3 3 -5 0Z" fill="url(#fl)" opacity=".95"/>`;
  })}</g>` +
  `<g class="rspin" style="--d:7s">${around(12, (d, i) => {
    const [x, y] = P(45, d), h = 9 + (i % 2) * 3;
    return `<path transform="translate(${x} ${y}) rotate(${d + 35})" d="M-3 0C-4 -4 -1 -${h * 0.6} 1 -${h}C2 -${h * 0.6} 4 -4 3 0Z" fill="#fef3c7" opacity=".85"/>`;
  }, 15)}</g>` +
  `<circle cx="60" cy="60" r="42.5" fill="none" stroke="url(#fr)" stroke-width="3.5"/>` +
  around(8, (d, i) => { const [x, y] = P(50, d); return `<circle class="rise" style="animation-delay:${f2(i * 0.3)}s" cx="${x}" cy="${y}" r="${1 + (i % 2) * 0.6}" fill="#fde047" filter="url(#g1)"/>`; }, 10),
  grad('fl', ['#fde047', '#f97316', '#dc2626'], 0, 1) + grad('fr', ['#7f1d1d', '#f97316', '#fde047', '#f97316', '#7f1d1d']) + GL(1) + GL(4));

// ── 月度铁人：机甲装甲环（六边形装甲片 + 能量线 + HUD 刻度） ──
F.streak30 = svg(
  `<g class="rspin" style="--d:40s">${around(60, (d, i) => { const [x1, y1] = P(55, d), [x2, y2] = P(i % 5 ? 56.5 : 58.5, d); return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="#67e8f9" stroke-width="${i % 5 ? .5 : 1}" opacity=".85"/>`; })}</g>` +
  around(12, (d) => { const [x, y] = P(47, d); return `<path transform="translate(${x} ${y}) rotate(${d})" d="M-5.5 -4.5L5.5 -4.5L7.5 0L5.5 4.5L-5.5 4.5L-7.5 0Z" fill="url(#plate)" stroke="#0f172a" stroke-width=".7"/><path transform="translate(${x} ${y}) rotate(${d})" d="M-4 -2.6H4" stroke="#e2e8f0" stroke-width=".6" opacity=".7"/>`; }) +
  `<g class="pulse"><circle cx="60" cy="60" r="41.6" fill="none" stroke="#22d3ee" stroke-width="1.6" filter="url(#g1)"/>${around(12, (d) => { const [x, y] = P(51.8, d + 15); return `<circle cx="${x}" cy="${y}" r="1.2" fill="#a5f3fc" filter="url(#g1)"/>`; })}</g>` +
  `<g class="spin" style="--d:3s"><path d="${arc(41.6, 0, 50)}" fill="none" stroke="#ecfeff" stroke-width="2.4" stroke-linecap="round" filter="url(#g1)"/></g>` +
  `<path d="M44 104L60 112L76 104L72 98H48Z" fill="url(#plate)" stroke="#0f172a" stroke-width=".8"/><path d="M53 104H67" stroke="#22d3ee" stroke-width="1.6" filter="url(#g1)"/>`,
  grad('plate', ['#e2e8f0', '#94a3b8', '#475569'], 0, 1) + GL(1));

// ── 百日筑基：冰晶（棱晶尖刺 + 雪花 + 霜环） ──
F.streak100 = svg(
  `<circle cx="60" cy="60" r="46" fill="none" stroke="#a5f3fc" stroke-width="9" opacity=".35" filter="url(#g3)"/>` +
  around(14, (d, i) => {
    const [x, y] = P(44, d), L = i % 2 ? 9 : 15, W = i % 2 ? 3 : 4.2;
    return `<path transform="translate(${x} ${y}) rotate(${d})" d="M0 ${-L - 4}L${W} -3L0 1L${-W} -3Z" fill="url(#ice)" stroke="#ecfeff" stroke-width=".6"/><path transform="translate(${x} ${y}) rotate(${d})" d="M0 ${-L - 4}L0 1" stroke="#ffffff" stroke-width=".5" opacity=".8"/>`;
  }) +
  `<circle cx="60" cy="60" r="42.4" fill="none" stroke="url(#dg)" stroke-width="3"/>` +
  [[14, 20], [104, 22], [16, 100], [102, 100]].map(([x, y], i) => `<g class="spin" style="transform-origin:${x}px ${y}px;--d:${8 + i * 2}s">${around(6, (d) => `<path d="M${x} ${y}L${P(0, 0) && f2(x + 5 * Math.sin(d * Math.PI / 180))} ${f2(y - 5 * Math.cos(d * Math.PI / 180))}" stroke="#e0f2fe" stroke-width="1" stroke-linecap="round"/>`)}</g>`).join('') +
  sparkleField(7, 50, 57, '#ffffff', 2.6, 5),
  grad('dg', ['#22d3ee', '#ffffff', '#818cf8', '#a5f3fc']) + grad('ice', ['#ffffff', '#a5f3fc', '#38bdf8', '#6366f1'], 0, 1) + GL(3));

// ── 全年无休：帝王（金色花纹框 + 宝石 + 皇冠 + 红色披风） ──
F.streak365 = svg(
  `<path d="M22 86C14 104 30 116 46 112C40 106 40 98 44 92ZM98 86C106 104 90 116 74 112C80 106 80 98 76 92Z" fill="url(#cape)" stroke="#7f1d1d" stroke-width=".8"/>` +
  `<circle cx="60" cy="60" r="45" fill="none" stroke="url(#kg)" stroke-width="7"/><circle cx="60" cy="60" r="41.6" fill="none" stroke="#78350f" stroke-width=".8"/><circle cx="60" cy="60" r="48.4" fill="none" stroke="#78350f" stroke-width=".8"/>` +
  around(16, (d) => { const [x, y] = P(45, d); return `<path transform="translate(${x} ${y}) rotate(${d})" d="M-3 0C-3 -2 -1 -3 0 -1.5C1 -3 3 -2 3 0C3 2 1 3 0 1.5C-1 3 -3 2 -3 0Z" fill="#fef3c7" opacity=".85"/>`; }, 11.25) +
  around(4, (d, i) => { const [x, y] = P(45, d); return `<circle cx="${x}" cy="${y}" r="3.6" fill="${['#dc2626', '#2563eb', '#16a34a', '#7c3aed'][i]}" stroke="#fde68a" stroke-width="1.2"/><circle cx="${x - 1}" cy="${y - 1}" r="1" fill="#fff" opacity=".8"/>`; }, 45) +
  `<g class="spin" style="--d:5s"><path d="${arc(45, 0, 30)}" fill="none" stroke="#fffbeb" stroke-width="2" stroke-linecap="round" opacity=".9"/></g>` +
  sparkleField(6, 51, 57, '#fde68a', 2.6, 7) +
  `<g filter="url(#g1)">${crown(60, 10, 1.25, 'url(#kc)', '#dc2626')}</g>`,
  grad('kg', ['#fef3c7', '#facc15', '#b45309', '#fde68a', '#a16207']) + grad('kc', ['#fffbeb', '#facc15', '#b45309'], 0, 1) + grad('cape', ['#ef4444', '#991b1b'], 0, 1) + GL(1));

// ── 词汇新芽：森灵（藤蔓 + 花 + 萤火） ──
F.word100 = svg(
  `<circle cx="60" cy="60" r="43" fill="none" stroke="#166534" stroke-width="3"/>` +
  `<path d="${arc(45, -100, 190)}" fill="none" stroke="#15803d" stroke-width="2.2" stroke-dasharray="1 0"/>` +
  around(16, (d, i) => leaf(i % 2 ? 49 : 41, d, 5, 2.3, i % 3 ? '#4ade80' : '#22c55e', 'sway', i % 2 ? 50 : -50)) +
  [[60, 104], [24, 90], [96, 88]].map(([x, y], j) => `<g class="bob" style="animation-delay:${j * .5}s">${around(5, (d) => `<ellipse cx="${f2(x + 3.4 * Math.sin(d * Math.PI / 180))}" cy="${f2(y - 3.4 * Math.cos(d * Math.PI / 180))}" rx="2.6" ry="3.6" transform="rotate(${d} ${f2(x + 3.4 * Math.sin(d * Math.PI / 180))} ${f2(y - 3.4 * Math.cos(d * Math.PI / 180))})" fill="${['#fbcfe8', '#fde68a', '#bfdbfe'][j]}"/>`)}<circle cx="${x}" cy="${y}" r="1.8" fill="#f59e0b"/></g>`).join('') +
  around(7, (d, i) => { const [x, y] = P(54 + (i % 3) * 2, d); return `<circle class="tw" style="animation-delay:${f2(i * 0.31)}s" cx="${x}" cy="${y}" r="1.5" fill="#d9f99d" filter="url(#g1)"/>`; }, 20),
  GL(1));

// ── 小有词汇：魔导书（浮空法典 + 环绕字母符文） ──
F.word500 = svg(
  `<circle cx="60" cy="60" r="44" fill="none" stroke="url(#gb)" stroke-width="4"/>` +
  `<g class="spin" style="--d:16s">${around(10, (d, i) => { const [x, y] = P(52, d); return `<text x="${x}" y="${y + 3}" transform="rotate(${d} ${x} ${y})" font-family="Georgia,serif" font-size="8" font-weight="700" fill="#fcd34d" text-anchor="middle" filter="url(#g1)">${'ÄÖÜßAEIOUẞ'[i]}</text>`; })}</g>` +
  `<g class="bob"><g filter="url(#g2)"><ellipse cx="60" cy="110" rx="18" ry="3" fill="#fbbf24" opacity=".5"/></g>` +
  `<path d="M38 96Q49 90 60 97Q71 90 82 96L82 110Q71 104 60 111Q49 104 38 110Z" fill="#7c2d12" stroke="#fbbf24" stroke-width="1"/>` +
  `<path d="M40 95Q50 89.5 59.5 96L59.5 108Q50 102 40 107.6Z" fill="#fffbeb"/><path d="M80 95Q70 89.5 60.5 96L60.5 108Q70 102 80 107.6Z" fill="#fff7ed"/>` +
  `<path d="M44 97.5Q50 95 56 99M44 101Q50 98.5 56 102.5M64 99Q70 95 76 97.5M64 102.5Q70 98.5 76 101" stroke="#b45309" stroke-width=".6" fill="none"/>` +
  `<path class="flip" d="M60.5 96Q70 89.5 80 95L80 107.6Q70 102 60.5 108Z" fill="#fef3c7" opacity=".9"/></g>`,
  grad('gb', ['#78350f', '#fbbf24', '#7c2d12', '#fcd34d']) + GL(1) + GL(2),
  `.flip{transform-origin:60.5px 100px;animation:flip 3s ease-in-out infinite}@keyframes flip{0%,60%{transform:scaleX(1)}80%{transform:scaleX(-1)}100%{transform:scaleX(-1);opacity:0}}`);

// ── 词汇达人：浪花卷轴（和风海浪 + 展开卷轴） ──
F.word1000 = svg(
  `<circle cx="60" cy="60" r="44" fill="none" stroke="#0c4a6e" stroke-width="6"/>` +
  `<g class="spin" style="--d:20s">${around(14, (d) => { const [x, y] = P(44, d); return `<path transform="translate(${x} ${y}) rotate(${d})" d="M-5 2C-5 -3 0 -6 4 -3C1 -3 0 0 2 1" fill="none" stroke="#e0f2fe" stroke-width="1.3" stroke-linecap="round"/>`; })}</g>` +
  `<path d="M14 92C24 80 34 96 44 86C50 80 58 88 54 94C66 84 74 98 84 88C92 80 100 92 106 86L110 112H10Z" fill="url(#sea)" stroke="#e0f2fe" stroke-width="1"/>` +
  `<path class="bob" d="M20 100C26 94 32 102 38 96M74 102C80 96 86 104 92 98" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>` +
  `<g><rect x="30" y="8" width="60" height="9" rx="2" fill="#fef3c7" stroke="#92400e" stroke-width=".8"/><rect x="26" y="7" width="5" height="11" rx="2" fill="#b45309"/><rect x="89" y="7" width="5" height="11" rx="2" fill="#b45309"/><path d="M38 12.5H82" stroke="#92400e" stroke-width=".7" stroke-dasharray="3 2"/></g>` +
  sparkleField(5, 50, 56, '#bae6fd', 2.2, 9),
  grad('sea', ['#38bdf8', '#0369a1', '#0c4a6e'], 0, 1));

// ── 词汇大师：圣杯（月桂 + 奖杯 + 放射光） ──
F.word2000 = svg(
  `<g class="pulse">${around(12, (d) => { const [x1, y1] = P(46, d), [x2, y2] = P(58, d); return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="#fde68a" stroke-width="3" opacity=".5"/>`; })}</g>` +
  ['l', 'r'].map((s) => around(9, (d, i) => leaf(49, s === 'l' ? 195 + i * 16 : 165 - i * 16, 6.8, 2.8, i % 2 ? '#fde68a' : '#f59e0b', '', s === 'l' ? -35 : 35))).join('') +
  `<circle cx="60" cy="60" r="43" fill="none" stroke="url(#tc)" stroke-width="4"/>` +
  `<g class="spin" style="--d:4s"><path d="${arc(43, 0, 35)}" fill="none" stroke="#fffbeb" stroke-width="2" stroke-linecap="round"/></g>` +
  `<g filter="url(#g1)" class="bob"><path d="M49 92H71V96Q71 107 60 108Q49 107 49 96Z" fill="url(#tc)" stroke="#92400e" stroke-width=".8"/><path d="M49 94Q42 94 43 99Q44 103 50 102M71 94Q78 94 77 99Q76 103 70 102" fill="none" stroke="#b45309" stroke-width="1.6"/><rect x="56.5" y="107.5" width="7" height="4" fill="#b45309"/><rect x="51" y="111.5" width="18" height="4" rx="1" fill="#92400e"/>${star4(60, 99, 3.4, 'tw', '#fffbeb')}</g>` +
  sparkleField(6, 52, 57, '#fff7ed', 2.4, 11),
  grad('tc', ['#fef3c7', '#f59e0b', '#b45309'], 0, 1) + GL(1));

// ── 词汇宗师：赛博霓虹（故障环 + 电路走线） ──
F.word3000 = svg(
  `<circle cx="60" cy="60" r="45" fill="none" stroke="#0f172a" stroke-width="10" opacity=".85"/>` +
  `<g filter="url(#g2)" class="pulse"><circle cx="60" cy="60" r="42" fill="none" stroke="#ec4899" stroke-width="2"/><circle cx="60" cy="60" r="49" fill="none" stroke="#22d3ee" stroke-width="1.6"/></g>` +
  `<g class="spin" style="--d:5s">${[[0, 40], [70, 95], [150, 220], [260, 300]].map(([a, b]) => `<path d="${arc(45.5, a, b)}" fill="none" stroke="#f0abfc" stroke-width="3" stroke-linecap="butt"/>`).join('')}</g>` +
  `<g class="rspin" style="--d:8s">${[[20, 55], [120, 140], [200, 250], [310, 345]].map(([a, b]) => `<path d="${arc(45.5, a, b)}" fill="none" stroke="#67e8f9" stroke-width="1.4"/>`).join('')}</g>` +
  around(8, (d) => { const [x1, y1] = P(50, d), [x2, y2] = P(56, d), [x3, y3] = P(56, d + 8); return `<polyline points="${x1},${y1} ${x2},${y2} ${x3},${y3}" fill="none" stroke="#a78bfa" stroke-width="1"/><circle cx="${x3}" cy="${y3}" r="1.5" fill="#f0abfc" filter="url(#g1)"/>`; }) +
  `<g class="glitch"><rect x="86" y="14" width="14" height="3" fill="#22d3ee"/><rect x="90" y="19" width="8" height="2" fill="#ec4899"/></g>`,
  GL(1) + GL(2),
  `.glitch{animation:glitch 1.8s steps(1) infinite}@keyframes glitch{0%,100%{transform:translate(0)}30%{transform:translate(-3px,1px)}32%{transform:translate(2px,-1px);opacity:.5}34%{transform:translate(0)}}`);

// ── 起步：破壳（保留站长点名喜欢的造型，加光晕与蛋壳纹理） ──
F.study100 = svg(
  `<circle cx="60" cy="60" r="44" fill="none" stroke="url(#eg)" stroke-width="4"/>` +
  `<circle cx="60" cy="60" r="47" fill="none" stroke="#fde68a" stroke-width="6" opacity=".35" filter="url(#g2)"/>` +
  `<path d="M14 84L22 76L30 86L38 76L46 88L54 78L62 90L70 78L78 88L86 76L94 86L102 76L108 84Q100 118 60 118Q20 118 14 84Z" fill="url(#shell)" stroke="#e7c98a" stroke-width="1.2"/>` +
  `<circle cx="34" cy="100" r="2" fill="#fde68a" opacity=".7"/><circle cx="80" cy="104" r="2.6" fill="#fbcfe8" opacity=".7"/><circle cx="58" cy="108" r="1.6" fill="#bfdbfe" opacity=".8"/>` +
  `<g class="bob"><circle cx="96" cy="26" r="8.5" fill="#fde047"/><path d="M89 22C90 17 96 15 99 18" fill="none" stroke="#facc15" stroke-width="1.5"/><circle cx="98.5" cy="24" r="1.2" fill="#422006"/><path d="M103 26L108 27.5L103 29Z" fill="#fb923c"/><ellipse cx="94" cy="29" rx="2" ry="1.2" fill="#fda4af" opacity=".8"/></g>` +
  sparkleField(4, 50, 56, '#fde68a', 2.2, 13),
  grad('eg', ['#fde68a', '#fbcfe8', '#bfdbfe', '#fde68a']) + grad('shell', ['#ffffff', '#fffbeb', '#fde68a'], 0, 1) + GL(2));

// ── 勤学不辍：战意（燃烧斗气 + 冲击波） ──
F.study500 = svg(
  `<circle class="wave" cx="60" cy="60" r="44" fill="none" stroke="#ef4444" stroke-width="3"/>` +
  `<circle class="wave" style="animation-delay:1.2s" cx="60" cy="60" r="44" fill="none" stroke="#fb7185" stroke-width="3"/>` +
  `<g filter="url(#g2)">${around(18, (d, i) => {
    const [x, y] = P(44, d), h = 8 + (i % 3) * 5;
    return `<path class="flk" style="animation-delay:${f2(i * 0.07)}s" transform="translate(${x} ${y}) rotate(${d})" d="M-3 0Q-2 -${h * 0.7} 0 -${h}Q2 -${h * 0.7} 3 0Z" fill="url(#aura)"/>`;
  })}</g>` +
  `<circle cx="60" cy="60" r="42.5" fill="none" stroke="url(#rg)" stroke-width="3.5"/>`,
  grad('rg', ['#fecaca', '#ef4444', '#7f1d1d', '#ef4444']) + grad('aura', ['#ffffff', '#fca5a5', '#dc2626'], 0, 1) + GL(2));

// ── 学而不厌：雷神（游走的电弧 + 雷纹环） ──
const bolt = (r, d, len) => { let pts = []; for (let i = 0; i <= 6; i++) { const [x, y] = P(r + (i % 2 ? 4 : -2) * (i === 0 || i === 6 ? 0 : 1), d + i * len / 6); pts.push(x + ',' + y); } return pts.join(' '); };
F.study2000 = svg(
  `<circle cx="60" cy="60" r="44" fill="none" stroke="#1e3a8a" stroke-width="6"/>` +
  `<g class="spin" style="--d:2.6s"><circle cx="60" cy="60" r="44" fill="none" stroke="url(#eb)" stroke-width="3" stroke-dasharray="18 6 4 6"/></g>` +
  [0, 1, 2, 3].map((i) => `<polyline class="blink" style="animation-delay:${i * 0.4}s" points="${bolt(48, i * 90 + 20, 50)}" fill="none" stroke="#fef9c3" stroke-width="1.6" stroke-linejoin="round" filter="url(#g2)"/>`).join('') +
  around(4, (d, i) => { const [x, y] = P(54, d); return `<path class="blink" style="animation-delay:${f2(i * 0.4 + 0.2)}s" filter="url(#g1)" transform="translate(${x} ${y}) rotate(${d})" d="M-2 -9L4 -9L0 -1L4 -1L-4 10L-1 2L-5 2Z" fill="#fde047" stroke="#1d4ed8" stroke-width=".7"/>`; }, 45),
  grad('eb', ['#fef08a', '#60a5fa', '#ffffff', '#1d4ed8']) + GL(1) + GL(2));

// ── 学海无涯：星际（行星环 + 绕行火箭 + 星云） ──
F.study10000 = svg(
  `<circle cx="60" cy="60" r="47" fill="none" stroke="url(#neb2)" stroke-width="10" opacity=".8"/>` +
  `<circle cx="60" cy="60" r="43" fill="none" stroke="url(#rb)" stroke-width="3.5"/>` +
  sparkleField(12, 45, 56, '#ffffff', 1.8, 15) +
  `<ellipse cx="60" cy="60" rx="57" ry="19" fill="none" stroke="#c4b5fd" stroke-width="1.2" stroke-dasharray="3 3" transform="rotate(-25 60 60)" opacity=".85"/>` +
  `<g class="spin" style="--d:5s"><g transform="translate(60 5) rotate(90)"><path d="M-7 -3.4L5 -3.4Q11 0 5 3.4L-7 3.4Z" fill="#f1f5f9" stroke="#475569" stroke-width=".7"/><circle cx="1" cy="0" r="1.5" fill="#38bdf8"/><path d="M-7 -3.4L-10 -7L-6 -1.5ZM-7 3.4L-10 7L-6 1.5Z" fill="#ef4444"/><path class="flk" d="M-7 -1.8L-15 0L-7 1.8Z" fill="#f97316" filter="url(#g1)"/></g></g>` +
  `<g class="bob"><circle cx="101" cy="98" r="8" fill="url(#pl)"/><ellipse cx="101" cy="98" rx="13" ry="3" fill="none" stroke="#fcd34d" stroke-width="1.4" transform="rotate(-20 101 98)"/></g>` +
  `<circle cx="18" cy="24" r="4.5" fill="url(#pl2)"/>`,
  grad('rb', ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7']) + grad('pl', ['#fda4af', '#a855f7'], 0, 1) + grad('pl2', ['#a5f3fc', '#0e7490'], 0, 1) + `<radialGradient id="neb2"><stop offset=".8" stop-color="#312e81"/><stop offset=".9" stop-color="#7e22ce"/><stop offset="1" stop-color="#0f172a"/></radialGradient>` + GL(1));

// ── 初试身手：墨笔圆相（水墨笔触 + 墨点飞溅） ──
F.quiz50 = svg(
  `<path d="M60 13C88 12 108 34 106 62C104 90 82 108 56 106C30 104 12 84 14 58C15 40 26 24 44 17" fill="none" stroke="#111827" stroke-width="7" stroke-linecap="round" opacity=".9"/>` +
  `<path d="M60 13C88 12 108 34 106 62C104 90 82 108 56 106C30 104 12 84 14 58" fill="none" stroke="#4b5563" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 5" opacity=".7"/>` +
  [[40, 14, 2.2], [34, 11, 1.2], [104, 82, 1.8], [109, 76, 1], [18, 92, 1.5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#111827"/>`).join('') +
  `<g transform="rotate(35 98 22)" class="bob"><rect x="94" y="0" width="6" height="26" rx="1.5" fill="#92400e"/><path d="M94 26L97 38L100 26Z" fill="#111827"/><rect x="93.5" y="22" width="7" height="4" fill="#d4d4d8"/></g>` +
  `<rect x="10" y="100" width="12" height="12" rx="1.5" fill="#dc2626"/><text x="16" y="109.5" font-size="8" text-anchor="middle" fill="#fff" font-family="serif">学</text>`);

// ── 测验能手：漫画（速度线 + 网点 + 爆炸气泡） ──
F.quiz200 = svg(
  `<g opacity=".8">${around(28, (d, i) => { const [x1, y1] = P(47, d), [x2, y2] = P(i % 2 ? 55 : 59, d); return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="#111827" stroke-width="${i % 3 ? .6 : 1.2}"/>`; })}</g>` +
  `<circle cx="60" cy="60" r="44" fill="none" stroke="#111827" stroke-width="3.5"/><circle cx="60" cy="60" r="44" fill="none" stroke="#facc15" stroke-width="1.6"/>` +
  around(10, (d, i) => { const [x, y] = P(47.5, d); return `<circle cx="${x}" cy="${y}" r="${1 + (i % 2) * 0.6}" fill="#ef4444"/>`; }, 18) +
  `<g class="bob"><path d="M84 6L90 14L99 8L98 18L108 20L100 27L106 35L96 34L94 44L88 36L80 40L82 30L74 26L82 21L78 12Z" fill="#facc15" stroke="#111827" stroke-width="1.2"/><text x="91" y="30" font-size="12" font-weight="900" text-anchor="middle" fill="#dc2626" font-family="Arial Black,Arial,sans-serif">!</text></g>` +
  `<g class="bob" style="animation-delay:1s"><ellipse cx="22" cy="100" rx="12" ry="8" fill="#fff" stroke="#111827" stroke-width="1.2"/><path d="M28 106L34 112L24 107" fill="#fff" stroke="#111827" stroke-width="1.2"/><text x="22" y="103.5" font-size="8" font-weight="900" text-anchor="middle" fill="#111827" font-family="Arial,sans-serif">GUT</text></g>`);

// ── 测验大师：樱刃（双刃刀光斩环 + 落樱） ──
F.quiz1000 = svg(
  `<circle cx="60" cy="60" r="44" fill="none" stroke="#1f2937" stroke-width="4"/><circle cx="60" cy="60" r="44" fill="none" stroke="#fbcfe8" stroke-width="1"/>` +
  `<g class="spin" style="--d:3.2s"><path d="${arc(48, 0, 120)}" fill="none" stroke="url(#slash)" stroke-width="3.2" stroke-linecap="round" filter="url(#g1)"/><path d="${arc(48, 180, 300)}" fill="none" stroke="url(#slash)" stroke-width="3.2" stroke-linecap="round" filter="url(#g1)"/></g>` +
  `<g transform="rotate(-40 60 60)"><path d="M10 60H24" stroke="#78350f" stroke-width="3.4" stroke-linecap="round"/><rect x="23" y="56" width="2.4" height="8" rx=".8" fill="#fbbf24"/><path d="M25.4 58.6H44Q47 60 44 61.4H25.4Z" fill="#e5e7eb" stroke="#9ca3af" stroke-width=".5"/></g>` +
  Array.from({ length: 9 }, (_, i) => { const [x, y] = P(50 + (i % 3) * 3, i * 40 + 10); return petal(x, y, i * 47, 0.75 + (i % 3) * 0.12, i % 2 ? '#fbcfe8' : '#f9a8d4', 'fall', f2(i * 0.45)); }).join(''),
  `<linearGradient id="slash" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fdf2f8" stop-opacity="0"/><stop offset=".7" stop-color="#f9a8d4"/><stop offset="1" stop-color="#ffffff"/></linearGradient>` + GL(1),
  `.fall{transform-box:fill-box;animation:fall 3.6s linear infinite}@keyframes fall{0%{opacity:0;translate:0 -6px}15%{opacity:1}100%{opacity:0;translate:6px 14px}}`);

mkdirSync('frames', { recursive: true });
for (const [id, s] of Object.entries(F)) writeFileSync(`frames/${id}.svg`, s);
const nl = genProLife(), na = genAvatars();
console.log(`✓ frames/：${Object.keys(F).length} 款头像框 + 永久会员框 ${nl} 张（8 种龙 × 大小两版）；avatars/：会员专属头像 ${na} 张`);
