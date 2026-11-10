// 生成头像框素材库 frames/<id>.svg（原创矢量动画，Steam / Discord 式「叠在头像外圈」的装饰图）。
// 画布 120×120，中间直径 80 的圆是头像位（留空），装饰画在外圈、可伸出到画布边缘。
// 前端把图片按「头像尺寸 × 1.5」叠在头像上（见 src.html .fr-img）。
// 用法：node tools/gen-frames.mjs   —— 改了这里要重新跑，frames/ 一并提交。
import { writeFileSync, mkdirSync } from 'node:fs';

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

// ── 会员 ──
F.pro_life = svg(
  // 双翼：左右各 5 片羽毛
  ['l', 'r'].map((side) => {
    const sx = side === 'l' ? -1 : 1;
    return `<g class="sway" style="transform-origin:${60 + sx * 38}px 70px;animation-duration:3.4s">` +
      [0, 1, 2, 3, 4].map((i) => {
        const len = 22 - i * 2.6, ang = -60 + i * 26, bx = 60 + sx * 40, by = 52 + i * 7;
        return `<ellipse cx="${bx + sx * len * 0.55}" cy="${by}" rx="${len * 0.6}" ry="4.2" fill="url(#gw)" stroke="#b7791f" stroke-width=".6" transform="rotate(${sx * ang * 0.35} ${bx} ${by})"/>`;
      }).join('') + `</g>`;
  }).join('') +
  `<g class="spin" style="--d:6s">${ring(44, 5, 'url(#gg)')}</g>` + ring(44, 1, '#fff7d6', '', 'opacity=".7"') +
  around(8, (d, i) => star4(...P(52, d), 3.2, 'tw', '#fff4c2', i * 0.27), 22) +
  crown(60, 13, 1.05, 'url(#gc)', '#e11d48'),
  grad('gg', ['#f5b942', '#fff4c2', '#e9a93a', '#fde68a', '#b7791f']) + grad('gw', ['#fffbea', '#fde68a', '#f5b942'], 1, 0) + grad('gc', ['#fff4c2', '#f5b942', '#b7791f'], 0, 1));

F.pro = svg(
  `<g class="spin" style="--d:7s">${ring(44, 5, 'url(#pg)')}</g>` +
  `<g class="rspin" style="--d:12s">${around(12, (d) => { const [x, y] = P(49.5, d); return `<circle cx="${x}" cy="${y}" r="1.5" fill="#c4b5fd"/>`; })}</g>` +
  around(6, (d, i) => star4(...P(53, d), 3, 'tw', '#ede9fe', i * 0.37), 30) +
  crown(60, 14, 0.95, 'url(#pc)', '#22d3ee'),
  grad('pg', ['#818cf8', '#e9d5ff', '#a5b4fc', '#c084fc']) + grad('pc', ['#f5f3ff', '#c4b5fd', '#7c3aed'], 0, 1));

// ── 打卡 ──
F.founder = svg(
  `<circle cx="60" cy="60" r="47" fill="none" stroke="#0b1340" stroke-width="10" opacity=".9"/>` +
  `<g class="spin" style="--d:9s">${ring(44, 3.5, 'url(#fg)')}</g>` +
  around(10, (d, i) => star4(...P(47, d), i % 3 ? 2 : 3.4, 'tw', i % 2 ? '#e0e7ff' : '#fde68a', i * 0.21), 9) +
  `<g class="spin" style="--d:5s"><path d="M${P(54, 300).join(' ')}A54 54 0 0 1 ${P(54, 350).join(' ')}" fill="none" stroke="url(#fs)" stroke-width="2" stroke-linecap="round"/>${star4(...P(54, 350), 3.5, '', '#fff')}</g>`,
  grad('fg', ['#1e3a8a', '#7c3aed', '#0ea5e9', '#1e3a8a']) + grad('fs', ['rgba(255,255,255,0)', '#ffffff']));

F.streak3 = svg(
  ring(44, 5, 'url(#sg)') +
  `<g class="pulse">${around(9, (d) => { const [x1, y1] = P(50, d), [x2, y2] = P(57, d); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fb923c" stroke-width="2.4" stroke-linecap="round"/>`; }, -80).replace(/(<line[^>]*>)/g, (m, _, i) => m)}</g>` +
  `<path d="M42 14A18 18 0 0 1 78 14Z" fill="url(#ss)" transform="translate(0 2)"/>` +
  `<g class="bob"><ellipse cx="26" cy="96" rx="11" ry="5.5" fill="#fff"/><ellipse cx="33" cy="92" rx="7" ry="5" fill="#fff"/></g>` +
  `<g class="bob" style="animation-delay:1.2s"><ellipse cx="94" cy="98" rx="10" ry="5" fill="#fff"/><ellipse cx="88" cy="94" rx="6" ry="4.5" fill="#fff"/></g>`,
  grad('sg', ['#fdba74', '#fde68a', '#f9a8d4', '#fdba74']) + grad('ss', ['#fde047', '#fb923c'], 0, 1));

F.streak7 = svg(
  around(14, (d, i) => {
    const [x, y] = P(44, d), h = 13 + (i % 3) * 4;
    return `<path class="flk" style="animation-delay:${(i * 0.13).toFixed(2)}s" fill="url(#fl)" transform="rotate(${d} ${x} ${y})" d="M${x - 5} ${y}Q${x - 6} ${y - h * 0.6} ${x} ${y - h}Q${x + 6} ${y - h * 0.6} ${x + 5} ${y}Z"/>`;
  }, 100).replace(/rotate\((\d+(\.\d+)?)/g, (m, d) => `rotate(${d}`) +
  ring(44, 4.5, 'url(#fr)') +
  around(6, (d, i) => { const [x, y] = P(47, d); return `<circle class="rise" style="animation-delay:${(i * 0.4).toFixed(1)}s" cx="${x}" cy="${y}" r="1.6" fill="#fde047"/>`; }, 130),
  grad('fl', ['#fde047', '#f97316', '#dc2626'], 0, 1) + grad('fr', ['#dc2626', '#f97316', '#facc15', '#f97316']));

F.streak30 = svg(
  ring(45, 7, 'url(#ir)') + ring(45, 1, '#f8fafc', '', 'opacity=".6"') +
  around(12, (d) => { const [x, y] = P(45, d); return `<circle cx="${x}" cy="${y}" r="1.7" fill="#475569" stroke="#e2e8f0" stroke-width=".6"/>`; }, 15) +
  `<g class="spin" style="--d:4s"><path d="M${P(45, 330).join(' ')}A45 45 0 0 1 ${P(45, 20).join(' ')}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".75"/></g>` +
  `<path d="M50 100L46 118L54 113L60 119L60 100Z" fill="#b91c1c"/><path d="M70 100L74 118L66 113L60 119L60 100Z" fill="#1d4ed8"/>` +
  `<circle cx="60" cy="104" r="8.5" fill="url(#md)" stroke="#78350f" stroke-width=".8"/>${star4(60, 104, 4.2, 'tw', '#fff7ed')}`,
  grad('ir', ['#94a3b8', '#f1f5f9', '#64748b', '#cbd5e1']) + grad('md', ['#fde68a', '#d97706'], 0, 1));

F.streak100 = svg(
  ring(44, 3, 'url(#dg)') +
  `<g class="spin" style="--d:16s">${around(10, (d, i) => {
    const [x, y] = P(48, d), s = i % 2 ? 6 : 8.5;
    return `<path transform="rotate(${d} ${x} ${y})" d="M${x} ${y - s}L${x + s * 0.55} ${y}L${x} ${y + s * 0.7}L${x - s * 0.55} ${y}Z" fill="url(#dc)" stroke="#e0f2fe" stroke-width=".7" opacity=".95"/>`;
  })}</g>` +
  around(5, (d, i) => star4(...P(55, d), 3.4, 'tw', '#ffffff', i * 0.43), 18),
  grad('dg', ['#22d3ee', '#e0f2fe', '#818cf8', '#a5f3fc']) + grad('dc', ['#ecfeff', '#67e8f9', '#6366f1'], 0, 1));

F.streak365 = svg(
  // 月桂 + 金紫环 + 大皇冠
  ['l', 'r'].map((s) => around(7, (d, i) => leaf(50, s === 'l' ? 200 + i * 17 : 160 - i * 17, 6, 2.6, i % 2 ? '#a3e635' : '#65a30d', '', s === 'l' ? -35 : 35), 0)).join('') +
  `<g class="spin" style="--d:5s">${ring(44, 5, 'url(#kg)')}</g>` +
  around(4, (d) => { const [x, y] = P(44, d); return `<circle cx="${x}" cy="${y}" r="3" fill="#7c3aed" stroke="#fde68a" stroke-width="1"/>`; }, 45) +
  around(6, (d, i) => star4(...P(54, d), 2.8, 'tw', '#fde68a', i * 0.3), 60) +
  crown(60, 11, 1.2, 'url(#kc)', '#7c3aed'),
  grad('kg', ['#7c3aed', '#facc15', '#7c3aed', '#fde68a']) + grad('kc', ['#fffbeb', '#facc15', '#b45309'], 0, 1));

// ── 词汇 ──
F.word100 = svg(
  ring(44, 3, '#4ade80') +
  `<g class="spin" style="--d:24s">${around(10, (d, i) => leaf(46, d, 5.5, 2.4, i % 2 ? '#86efac' : '#22c55e'))}</g>` +
  `<g class="sway"><path d="M60 118C60 110 60 104 60 100" stroke="#15803d" stroke-width="2.4" fill="none"/><ellipse cx="53" cy="101" rx="7" ry="3.6" fill="#4ade80" transform="rotate(-25 53 101)"/><ellipse cx="67" cy="99" rx="7.5" ry="3.8" fill="#22c55e" transform="rotate(25 67 99)"/></g>`);

F.word500 = svg(
  ring(45, 7, '#f5e6c8') + `<g class="spin" style="--d:20s">${ring(45, 1.6, '#8b5e34', '', 'stroke-dasharray="4 3"')}</g>` +
  around(4, (d, i) => { const [x, y] = P(55, d); return `<text class="bob" style="animation-delay:${i * 0.5}s" x="${x}" y="${y}" font-family="Georgia,serif" font-size="9" font-weight="700" fill="#8b5e34" text-anchor="middle">${['A', 'ä', 'ß', 'Ö'][i]}</text>`; }, 315) +
  `<path d="M42 100Q51 95 60 101Q69 95 78 100L78 113Q69 108 60 114Q51 108 42 113Z" fill="#fffaf0" stroke="#8b5e34" stroke-width="1.2"/><line x1="60" y1="101" x2="60" y2="114" stroke="#8b5e34" stroke-width="1"/>`);

F.word1000 = svg(
  `<g class="spin" style="--d:9s">${ring(44, 4, 'url(#tg)', '', 'stroke-dasharray="30 6"')}</g>` +
  `<g class="rspin" style="--d:13s">${ring(51, 1.8, '#5eead4', '', 'stroke-dasharray="2 5" stroke-linecap="round"')}` +
  around(3, (d, i) => { const [x, y] = P(51, d); return `<rect x="${x - 4}" y="${y - 5}" width="8" height="10" rx="1.2" fill="${['#0e7490', '#14b8a6', '#f59e0b'][i]}" stroke="#ecfeff" stroke-width=".8"/>`; }) + `</g>`,
  grad('tg', ['#14b8a6', '#0e7490', '#5eead4']));

F.word2000 = svg(
  ['l', 'r'].map((s) => around(8, (d, i) => leaf(49, s === 'l' ? 190 + i * 18 : 170 - i * 18, 6.5, 2.8, i % 2 ? '#fde68a' : '#f59e0b', '', s === 'l' ? -35 : 35))).join('') +
  `<g class="pulse">${ring(44, 4, 'url(#tc)')}</g>` +
  `<g class="bob"><path d="M51 98H69V101Q69 110 60 111Q51 110 51 101Z" fill="url(#tc)" stroke="#92400e" stroke-width=".8"/><path d="M51 100Q46 100 47 104Q48 107 52 106M69 100Q74 100 73 104Q72 107 68 106" fill="none" stroke="#b45309" stroke-width="1.4"/><rect x="57" y="110" width="6" height="4" fill="#b45309"/><rect x="53" y="114" width="14" height="3" rx="1" fill="#92400e"/></g>` +
  around(5, (d, i) => star4(...P(56, d), 2.8, 'tw', '#fff7ed', i * 0.35), 300),
  grad('tc', ['#fef3c7', '#f59e0b', '#b45309'], 0, 1));

F.word3000 = svg(
  `<g filter="url(#gl)" class="pulse">${ring(44, 2.6, '#ec4899')}${ring(48.5, 2, '#22d3ee')}</g>` +
  `<g class="spin" style="--d:6s">${around(6, (d) => { const [x1, y1] = P(44, d), [x2, y2] = P(55, d + 6), [x3, y3] = P(55, d + 14); return `<polyline points="${x1},${y1} ${x2},${y2} ${x3},${y3}" fill="none" stroke="#a78bfa" stroke-width="1.3"/><circle cx="${x3}" cy="${y3}" r="1.8" fill="#f0abfc"/>`; })}</g>`);

// ── 学习次数 ──
F.study100 = svg(
  ring(44, 4, 'url(#eg)') +
  `<path d="M14 84L22 76L30 86L38 76L46 88L54 78L62 90L70 78L78 88L86 76L94 86L102 76L108 84Q100 118 60 118Q20 118 14 84Z" fill="#fffbeb" stroke="#e7c98a" stroke-width="1.2"/>` +
  `<g class="bob"><circle cx="96" cy="26" r="8" fill="#fde047"/><circle cx="98.5" cy="24" r="1.2" fill="#422006"/><path d="M103 26L108 27.5L103 29Z" fill="#fb923c"/></g>`,
  grad('eg', ['#fde68a', '#fbcfe8', '#bfdbfe', '#fde68a']));

F.study500 = svg(
  `<circle class="wave" cx="60" cy="60" r="44" fill="none" stroke="#ef4444" stroke-width="3"/>` +
  `<circle class="wave" style="animation-delay:1.2s" cx="60" cy="60" r="44" fill="none" stroke="#fb7185" stroke-width="3"/>` +
  ring(44, 5, 'url(#rg)') +
  `<path class="pulse" d="M8 60H26L31 50L37 72L43 56L47 60" fill="none" stroke="#fecaca" stroke-width="2" stroke-linejoin="round"/>`,
  grad('rg', ['#ef4444', '#fb7185', '#b91c1c']));

F.study2000 = svg(
  `<g class="spin" style="--d:2.4s">${ring(44, 4, 'url(#eg2)', '', 'stroke-dasharray="14 4"')}</g>` +
  around(4, (d, i) => {
    const [x, y] = P(52, d);
    return `<path class="blink" style="animation-delay:${i * 0.4}s" filter="url(#gl)" transform="rotate(${d} ${x} ${y})" d="M${x - 2} ${y - 9}L${x + 4} ${y - 9}L${x} ${y - 1}L${x + 4} ${y - 1}L${x - 4} ${y + 10}L${x - 1} ${y + 2}L${x - 5} ${y + 2}Z" fill="#fde047" stroke="#1d4ed8" stroke-width=".7"/>`;
  }, 45),
  grad('eg2', ['#facc15', '#3b82f6', '#fef08a', '#1d4ed8']));

F.study10000 = svg(
  ring(44, 3.5, 'url(#rb)') +
  around(8, (d, i) => star4(...P(i % 2 ? 54 : 50, d), 2, 'tw', '#fff', i * 0.25), 10) +
  `<ellipse cx="60" cy="60" rx="56" ry="20" fill="none" stroke="#c4b5fd" stroke-width="1.2" stroke-dasharray="3 3" transform="rotate(-25 60 60)" opacity=".8"/>` +
  `<g class="spin" style="--d:5s"><g transform="translate(60 6) rotate(90)"><path d="M-6 -3L4 -3Q10 0 4 3L-6 3Z" fill="#e5e7eb" stroke="#475569" stroke-width=".7"/><circle cx="1" cy="0" r="1.3" fill="#38bdf8"/><path d="M-6 -3L-9 -6L-6 -1ZM-6 3L-9 6L-6 1Z" fill="#ef4444"/><path class="flk" d="M-6 -1.5L-12 0L-6 1.5Z" fill="#f97316"/></g></g>` +
  `<circle cx="100" cy="98" r="7" fill="url(#pl)"/><ellipse cx="100" cy="98" rx="11" ry="2.6" fill="none" stroke="#fcd34d" stroke-width="1.2" transform="rotate(-20 100 98)"/>`,
  grad('rb', ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7']) + grad('pl', ['#fda4af', '#a855f7'], 0, 1));

// ── 测验 ──
F.quiz50 = svg(
  `<g class="sway" style="transform-origin:60px 60px;animation-duration:5s">` +
  `<circle cx="60.6" cy="59.4" r="44.5" fill="none" stroke="#6b7280" stroke-width="1.8" stroke-dasharray="40 3 22 2"/>` +
  `<circle cx="59.4" cy="60.8" r="46" fill="none" stroke="#9ca3af" stroke-width="1.2" stroke-dasharray="18 4 30 3"/></g>` +
  `<g transform="rotate(35 98 22)" class="bob"><rect x="92" y="10" width="7" height="22" rx="1" fill="#fbbf24" stroke="#92400e" stroke-width=".6"/><path d="M92 32L95.5 39L99 32Z" fill="#fde68a" stroke="#92400e" stroke-width=".6"/><rect x="92" y="8" width="7" height="3" fill="#f472b6"/></g>`);

F.quiz200 = svg(
  ring(44, 3, '#60a5fa', '', 'stroke-dasharray="6 3"') +
  around(8, (d, i) => {
    const [x, y] = P(52, d), c = ['#f472b6', '#60a5fa', '#fbbf24', '#34d399'][i % 4];
    return i % 2 ? star4(x, y, 4, 'tw', c, i * 0.3) : `<path class="bob" style="animation-delay:${i * 0.3}s" d="M${x - 5} ${y}q2.5 -4 5 0t5 0" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`;
  }, 20));

F.quiz1000 = svg(
  ring(51, 6, '#dc2626') + ring(45.5, 5, '#ffffff') + ring(41.5, 3, '#dc2626') +
  `<circle class="wave" cx="60" cy="60" r="46" fill="none" stroke="#f87171" stroke-width="2"/>` +
  `<g class="bob"><line x1="84" y1="36" x2="108" y2="12" stroke="#78350f" stroke-width="2.4"/><path d="M84 36L86 28L92 34Z" fill="#475569"/><path d="M104 12L110 6L110 14ZM108 16L114 10L106 10Z" fill="#22c55e"/></g>`);

mkdirSync('frames', { recursive: true });
for (const [id, s] of Object.entries(F)) writeFileSync(`frames/${id}.svg`, s);
console.log(`✓ frames/：${Object.keys(F).length} 款头像框`);
