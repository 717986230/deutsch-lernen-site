// 会员专属头像：8 款原创 Q 版角色（预设 SVG，非用户上传）。画布 100×100，满幅绘制，头像位是圆形裁切。
//   会员（月卡/年卡）可选：龙崽 凤凰雏 九尾狐 宇航猫 魔法猫头鹰 机甲熊
//   永久会员独享：金龙王 暗龙王
// 存值 'm:<id>'；服务端 MEMBER_AV 白名单 + 档位校验，前端 MEMBER_AV 同步。
// 用法：node tools/gen-avatars.mjs → avatars/<id>.svg
import { writeFileSync, mkdirSync } from 'node:fs';

export const MEMBER_AVATARS = [
  ['dragon', '龙崽', 1], ['phoenix', '凤凰雏', 1], ['kitsune', '九尾狐', 1], ['astro', '宇航猫', 1],
  ['owl', '魔法猫头鹰', 1], ['mecha', '机甲熊', 1], ['goldking', '金龙王', 2], ['abyssking', '暗龙王', 2],
];

const CSS = `.bl{transform-box:fill-box;transform-origin:center;animation:bl 4.5s infinite}
.tw{transform-box:fill-box;transform-origin:center;animation:tw 2.4s ease-in-out infinite}
.fl{transform-box:fill-box;transform-origin:50% 100%;animation:fl 1.6s ease-in-out infinite alternate}
.gl{animation:gl 2.6s ease-in-out infinite}
@keyframes bl{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes tw{0%,100%{opacity:.2;transform:scale(.5)}50%{opacity:1;transform:scale(1.15)}}
@keyframes fl{to{transform:scale(1.06,1.1) rotate(2deg)}}
@keyframes gl{0%,100%{opacity:.55}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;

const svg = (defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><defs>${defs}<style>${CSS}</style></defs>${body}</svg>\n`;
const bg = (id, a, b) => `<radialGradient id="${id}" cx=".5" cy=".35" r=".75"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;
const star = (x, y, s, c, d = 0) => `<path class="tw" style="animation-delay:${d}s" fill="${c}" d="M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z"/>`;
// Q 版大眼：深色眼球 + 两点高光，带眨眼
const eye = (x, y, rx, ry, iris, glow) => `<g class="bl"><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#1b1030"/>` +
  `<ellipse cx="${x}" cy="${y + ry * 0.35}" rx="${rx * 0.8}" ry="${ry * 0.5}" fill="${iris}" opacity=".9"${glow ? ' class="gl"' : ''}/>` +
  `<circle cx="${x - rx * 0.35}" cy="${y - ry * 0.4}" r="${rx * 0.38}" fill="#fff"/><circle cx="${x + rx * 0.35}" cy="${y + ry * 0.15}" r="${rx * 0.16}" fill="#fff"/></g>`;
const blush = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="2.6" fill="#ff7aa8" opacity=".45"/>`;
const crown = (c1, c2, gem) => `<g transform="translate(50 9)"><path d="M-15 10L-17 -4L-8 3L0 -9L8 3L17 -4L15 10Z" fill="${c1}" stroke="${c2}" stroke-width="1.2" stroke-linejoin="round"/>` +
  `<rect x="-15" y="8" width="30" height="4" rx="1.5" fill="${c2}"/><circle cy="-1" r="2.4" fill="${gem}"/><circle cx="-9" cy="6" r="1.4" fill="${gem}"/><circle cx="9" cy="6" r="1.4" fill="${gem}"/></g>`;

// 龙头（龙崽 / 金龙王 / 暗龙王 共用）
function dragonHead(K) {
  return `<g>` +
    // 鬃毛
    [[-1, 0], [1, 0]].map(([s]) => `<path d="M${50 + s * 26} 44C${50 + s * 40} 38 ${50 + s * 44} 54 ${50 + s * 40} 66C${50 + s * 36} 58 ${50 + s * 32} 56 ${50 + s * 28} 58Z" fill="${K.mane}" stroke="${K.dark}" stroke-width="1.2"/>` +
      `<path d="M${50 + s * 24} 30C${50 + s * 36} 22 ${50 + s * 44} 30 ${50 + s * 44} 40C${50 + s * 36} 36 ${50 + s * 32} 38 ${50 + s * 28} 42Z" fill="${K.mane2}" stroke="${K.dark}" stroke-width="1.2"/>`).join('') +
    // 角（鹿角式）
    [[-1], [1]].map(([s]) => `<g fill="none" stroke="${K.dark}" stroke-width="5.2" stroke-linecap="round"><path d="M${50 + s * 12} 26C${50 + s * 14} 16 ${50 + s * 20} 10 ${50 + s * 28} 7"/><path d="M${50 + s * 17} 15L${50 + s * 13} 7"/></g>` +
      `<g fill="none" stroke="${K.horn}" stroke-width="3" stroke-linecap="round"><path d="M${50 + s * 12} 26C${50 + s * 14} 16 ${50 + s * 20} 10 ${50 + s * 28} 7"/><path d="M${50 + s * 17} 15L${50 + s * 13} 7"/></g>`).join('') +
    // 头
    `<path d="M24 50C22 32 36 22 50 22C64 22 78 32 76 50C75 62 70 70 62 74L38 74C30 70 25 62 24 50Z" fill="url(#hd)" stroke="${K.dark}" stroke-width="1.6"/>` +
    // 吻部
    `<path d="M32 62C32 54 40 52 50 52C60 52 68 54 68 62C68 72 60 80 50 80C40 80 32 72 32 62Z" fill="${K.snout}" stroke="${K.dark}" stroke-width="1.4"/>` +
    `<ellipse cx="43" cy="62" rx="1.8" ry="1.3" fill="${K.dark}"/><ellipse cx="57" cy="62" rx="1.8" ry="1.3" fill="${K.dark}"/>` +
    `<path d="M44 70Q50 74 56 70" fill="none" stroke="${K.dark}" stroke-width="1.4" stroke-linecap="round"/>` +
    `<path d="M45 71L46.5 74L48 71.6ZM55 71L53.5 74L52 71.6Z" fill="#fff"/>` +
    // 额头鳞片 + 眉
    `<path d="M44 30Q50 26 56 30Q50 34 44 30Z" fill="${K.mane2}" opacity=".9"/>` +
    eye(39, 45, 6, 7, K.iris, K.glowEye) + eye(61, 45, 6, 7, K.iris, K.glowEye) +
    `<path d="M31 36Q38 32 44 36M56 36Q62 32 69 36" fill="none" stroke="${K.dark}" stroke-width="1.8" stroke-linecap="round"/>` +
    (K.blush ? blush(31, 55) + blush(69, 55) : '') +
    // 龙须
    `<path d="M33 64C24 66 18 72 14 82M67 64C76 66 82 72 86 82" fill="none" stroke="${K.mane2}" stroke-width="1.6" stroke-linecap="round"/>` +
    `</g>`;
}

const ART = {
  dragon: () => {
    const K = { light: '#a7f3d0', main: '#34d399', dark: '#065f46', snout: '#d1fae5', mane: '#22d3ee', mane2: '#a5f3fc', horn: '#fef3c7', iris: '#22d3ee', blush: true };
    return svg(bg('b', '#e0f2fe', '#7dd3fc') + `<radialGradient id="hd" cx=".4" cy=".3"><stop offset="0" stop-color="${K.light}"/><stop offset="1" stop-color="${K.main}"/></radialGradient>`,
      `<rect width="100" height="100" fill="url(#b)"/><path d="M0 84Q25 74 50 84T100 84V100H0Z" fill="#fff" opacity=".7"/>` + dragonHead(K) + star(14, 18, 3, '#fff') + star(86, 22, 2.5, '#fff', 0.8));
  },
  goldking: () => {
    const K = { light: '#fff3b0', main: '#f5b532', dark: '#7a4300', snout: '#fff7dc', mane: '#ff7a1a', mane2: '#ffd34d', horn: '#fffaf0', iris: '#ff3b1f', glowEye: true };
    return svg(bg('b', '#b91c1c', '#3b0505') + `<radialGradient id="hd" cx=".4" cy=".3"><stop offset="0" stop-color="${K.light}"/><stop offset="1" stop-color="${K.main}"/></radialGradient>` +
      `<radialGradient id="ra" cx=".5" cy=".5"><stop offset="0" stop-color="#ffd24a" stop-opacity=".9"/><stop offset="1" stop-color="#ffd24a" stop-opacity="0"/></radialGradient>`,
      `<rect width="100" height="100" fill="url(#b)"/><circle class="gl" cx="50" cy="50" r="46" fill="url(#ra)"/>` +
      Array.from({ length: 12 }, (_, i) => `<path d="M50 50L${(50 + 60 * Math.cos(i * Math.PI / 6 - 0.08)).toFixed(1)} ${(50 + 60 * Math.sin(i * Math.PI / 6 - 0.08)).toFixed(1)}L${(50 + 60 * Math.cos(i * Math.PI / 6 + 0.08)).toFixed(1)} ${(50 + 60 * Math.sin(i * Math.PI / 6 + 0.08)).toFixed(1)}Z" fill="#ffe27a" opacity=".22"/>`).join('') +
      dragonHead(K) + crown('#ffd24a', '#a16207', '#e11d48') + star(13, 30, 3.2, '#fff3a8') + star(87, 30, 3.2, '#fff3a8', 1.1) + star(20, 86, 2.4, '#fff3a8', 0.5));
  },
  abyssking: () => {
    const K = { light: '#4b5563', main: '#111827', dark: '#000000', snout: '#374151', mane: '#7c3aed', mane2: '#e879f9', horn: '#e5e7eb', iris: '#f0abfc', glowEye: true };
    return svg(bg('b', '#4c1d95', '#0b0217') + `<radialGradient id="hd" cx=".4" cy=".3"><stop offset="0" stop-color="${K.light}"/><stop offset="1" stop-color="${K.main}"/></radialGradient>`,
      `<rect width="100" height="100" fill="url(#b)"/>` +
      [[18, 80, 8], [84, 76, 10], [76, 16, 6]].map(([x, y, r], i) => `<circle class="gl" style="animation-delay:${i * 0.7}s" cx="${x}" cy="${y}" r="${r}" fill="#a855f7" opacity=".5"/>`).join('') +
      dragonHead(K) + crown('#c4b5fd', '#4c1d95', '#f0abfc') + star(14, 26, 3, '#f5d0fe') + star(88, 46, 2.6, '#f5d0fe', 0.9));
  },
  phoenix: () => svg(bg('b', '#fff1d6', '#fb923c') +
    `<radialGradient id="hd" cx=".4" cy=".3"><stop offset="0" stop-color="#fff1c2"/><stop offset="1" stop-color="#fb7a1e"/></radialGradient>` +
    `<linearGradient id="fe" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ef4444"/><stop offset=".6" stop-color="#f97316"/><stop offset="1" stop-color="#fde047"/></linearGradient>`,
    `<rect width="100" height="100" fill="url(#b)"/>` +
    // 火焰冠羽
    [[-22, 30, 4], [-10, 22, 2], [0, 18, 0], [10, 22, 2], [22, 30, 4]].map(([dx, top, w], i) => `<path class="fl" style="animation-delay:${i * 0.2}s" d="M${50 + dx - 6} 34C${50 + dx - 8} ${top + 6} ${50 + dx * 1.3} ${top - 14 + w} ${50 + dx * 1.35} ${top - 18 + w}C${50 + dx + 4} ${top - 6} ${50 + dx + 8} ${top + 4} ${50 + dx + 6} 34Z" fill="url(#fe)" stroke="#9a3412" stroke-width="1"/>`).join('') +
    // 脸侧羽毛
    `<path d="M24 56C12 58 8 72 14 82C20 74 26 72 30 70ZM76 56C88 58 92 72 86 82C80 74 74 72 70 70Z" fill="url(#fe)" stroke="#9a3412" stroke-width="1"/>` +
    `<circle cx="50" cy="56" r="27" fill="url(#hd)" stroke="#9a3412" stroke-width="1.6"/>` +
    `<path d="M30 74Q50 92 70 74Q60 86 50 86Q40 86 30 74Z" fill="#fde68a"/>` +
    eye(39, 52, 6, 7.5, '#f97316') + eye(61, 52, 6, 7.5, '#f97316') +
    `<path d="M44 62L56 62L50 74Z" fill="#facc15" stroke="#a16207" stroke-width="1.2" stroke-linejoin="round"/><path d="M44 62L56 62L50 66Z" fill="#fde047"/>` +
    blush(30, 62) + blush(70, 62) + star(14, 16, 3, '#fff') + star(88, 20, 2.6, '#fff', 0.9)),
  kitsune: () => svg(bg('b', '#3b2a6b', '#120a2a') +
    `<radialGradient id="hd" cx=".45" cy=".35"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f1e9ff"/></radialGradient>` +
    `<linearGradient id="tl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c4b5fd"/></linearGradient>`,
    `<rect width="100" height="100" fill="url(#b)"/><circle cx="80" cy="20" r="11" fill="#fef9c3"/><circle cx="84" cy="17" r="10" fill="#2b1d55"/>` +
    // 九尾（背后扇开）
    Array.from({ length: 9 }, (_, i) => { const a = -150 + i * 15, r = a * Math.PI / 180, x = 50 + 50 * Math.cos(r), y = 70 + 50 * Math.sin(r);
      return `<path d="M50 70Q${(50 + 28 * Math.cos(r - 0.35)).toFixed(1)} ${(70 + 28 * Math.sin(r - 0.35)).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}Q${(50 + 30 * Math.cos(r + 0.25)).toFixed(1)} ${(70 + 30 * Math.sin(r + 0.25)).toFixed(1)} 50 70Z" fill="url(#tl)" stroke="#7c3aed" stroke-width=".8" opacity=".95"/>`; }).join('') +
    // 耳朵
    `<path d="M26 44L22 14L44 32ZM74 44L78 14L56 32Z" fill="#fff" stroke="#6d28d9" stroke-width="1.4" stroke-linejoin="round"/><path d="M28 38L26 20L39 32ZM72 38L74 20L61 32Z" fill="#f9a8d4"/>` +
    `<path d="M22 50C22 34 36 28 50 28C64 28 78 34 78 50C78 64 66 80 50 82C34 80 22 64 22 50Z" fill="url(#hd)" stroke="#6d28d9" stroke-width="1.4"/>` +
    // 额前红纹 + 眼角红影
    `<path d="M50 32C46 36 46 40 50 44C54 40 54 36 50 32Z" fill="#e11d48"/><path d="M28 46Q34 42 40 46M60 46Q66 42 72 46" fill="none" stroke="#e11d48" stroke-width="2.2" stroke-linecap="round"/>` +
    eye(38, 54, 5.5, 6.5, '#c084fc', true) + eye(62, 54, 5.5, 6.5, '#c084fc', true) +
    `<path d="M47 66Q50 69 53 66" fill="none" stroke="#6d28d9" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="50" cy="63" rx="2.2" ry="1.6" fill="#6d28d9"/>` +
    blush(31, 64) + blush(69, 64) +
    `<circle class="gl" cx="20" cy="60" r="3" fill="#a78bfa"/><circle class="gl" style="animation-delay:1s" cx="82" cy="64" r="2.6" fill="#a78bfa"/>`),
  astro: () => svg(bg('b', '#1e3a8a', '#020617') +
    `<radialGradient id="gl" cx=".35" cy=".3"><stop offset="0" stop-color="#e0f2fe" stop-opacity=".55"/><stop offset=".6" stop-color="#93c5fd" stop-opacity=".15"/><stop offset="1" stop-color="#93c5fd" stop-opacity=".35"/></radialGradient>`,
    `<rect width="100" height="100" fill="url(#b)"/>` + [[12, 14], [86, 12], [90, 60], [10, 70], [70, 90]].map(([x, y], i) => star(x, y, 2.4, '#fff', i * 0.5)).join('') +
    `<circle cx="84" cy="84" r="9" fill="#f472b6"/><ellipse cx="84" cy="84" rx="15" ry="3.4" fill="none" stroke="#fde68a" stroke-width="1.6" transform="rotate(-20 84 84)"/>` +
    // 头盔
    `<circle cx="50" cy="50" r="38" fill="#e5e7eb" stroke="#64748b" stroke-width="2"/><circle cx="50" cy="50" r="31" fill="#0f172a"/>` +
    // 猫
    `<path d="M30 42L28 24L42 34ZM70 42L72 24L58 34Z" fill="#fb923c" stroke="#9a3412" stroke-width="1.2" stroke-linejoin="round"/><path d="M31 38L30 28L38 34ZM69 38L70 28L62 34Z" fill="#fecdd3"/>` +
    `<ellipse cx="50" cy="54" rx="22" ry="19" fill="#fdba74" stroke="#9a3412" stroke-width="1.2"/><path d="M44 36Q50 40 56 36M46 41Q50 44 54 41" fill="none" stroke="#ea580c" stroke-width="1.6" stroke-linecap="round"/>` +
    eye(41, 53, 5, 6, '#22d3ee') + eye(59, 53, 5, 6, '#22d3ee') +
    `<path d="M48 62L52 62L50 64.5Z" fill="#be185d"/><path d="M46 66Q50 69 50 64.5Q50 69 54 66" fill="none" stroke="#9a3412" stroke-width="1.2" stroke-linecap="round"/>` +
    `<path d="M30 60L20 58M30 64L20 66M70 60L80 58M70 64L80 66" stroke="#9a3412" stroke-width="1" stroke-linecap="round"/>` + blush(36, 62) + blush(64, 62) +
    // 面罩反光 + 天线
    `<circle cx="50" cy="50" r="31" fill="url(#gl)"/><path d="M28 34Q34 24 46 22" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>` +
    `<path d="M76 22L84 10" stroke="#64748b" stroke-width="2"/><circle class="gl" cx="85" cy="9" r="3" fill="#f43f5e"/>`),
  owl: () => svg(bg('b', '#6d28d9', '#1e0b4a'),
    `<rect width="100" height="100" fill="url(#b)"/>` + [[14, 30], [86, 36], [18, 86], [84, 84]].map(([x, y], i) => star(x, y, 2.6, '#fde68a', i * 0.6)).join('') +
    `<path d="M20 60C20 38 34 30 50 30C66 30 80 38 80 60C80 80 66 94 50 94C34 94 20 80 20 60Z" fill="#a16207" stroke="#451a03" stroke-width="1.6"/>` +
    `<path d="M34 76Q50 70 66 76Q66 90 50 92Q34 90 34 76Z" fill="#fde68a"/>` + [[42, 80], [50, 78], [58, 80], [46, 86], [54, 86]].map(([x, y]) => `<path d="M${x - 2.5} ${y}Q${x} ${y + 3} ${x + 2.5} ${y}" fill="none" stroke="#a16207" stroke-width="1"/>`).join('') +
    `<circle cx="38" cy="56" r="12" fill="#fef3c7" stroke="#451a03" stroke-width="1.2"/><circle cx="62" cy="56" r="12" fill="#fef3c7" stroke="#451a03" stroke-width="1.2"/>` +
    eye(38, 56, 7, 7.5, '#f59e0b', true) + eye(62, 56, 7, 7.5, '#f59e0b', true) +
    `<path d="M46 64L54 64L50 72Z" fill="#f59e0b" stroke="#451a03" stroke-width="1" stroke-linejoin="round"/>` +
    // 巫师帽
    `<path d="M24 38Q50 30 76 38L74 42Q50 36 26 42Z" fill="#312e81" stroke="#1e1b4b" stroke-width="1.2"/><path d="M32 38C40 30 46 14 64 4C58 16 62 28 68 36Q50 32 32 38Z" fill="#4338ca" stroke="#1e1b4b" stroke-width="1.2"/>` +
    `<path d="M33 38Q50 33 68 37L67 33Q50 29 34 34Z" fill="#facc15"/>` + star(52, 22, 4, '#fde047'), ),
  mecha: () => svg(bg('b', '#334155', '#0b1220') +
    `<linearGradient id="mt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1f5f9"/><stop offset=".5" stop-color="#94a3b8"/><stop offset="1" stop-color="#475569"/></linearGradient>`,
    `<rect width="100" height="100" fill="url(#b)"/><path d="M0 76H100M0 88H100M20 0V100M80 0V100" stroke="#22d3ee" stroke-width=".5" opacity=".25"/>` +
    `<circle cx="27" cy="30" r="11" fill="url(#mt)" stroke="#1e293b" stroke-width="1.4"/><circle cx="73" cy="30" r="11" fill="url(#mt)" stroke="#1e293b" stroke-width="1.4"/><circle cx="27" cy="30" r="5" fill="#0f172a"/><circle cx="73" cy="30" r="5" fill="#0f172a"/>` +
    `<path d="M22 48C22 34 34 28 50 28C66 28 78 34 78 48L76 70C72 80 62 86 50 86C38 86 28 80 24 70Z" fill="url(#mt)" stroke="#1e293b" stroke-width="1.6"/>` +
    `<path d="M50 28V40M30 72L40 66M70 72L60 66" stroke="#475569" stroke-width="1.2"/>` + [[30, 40], [70, 40], [32, 76], [68, 76]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#334155"/>`).join('') +
    // 目镜
    `<path d="M28 48Q50 42 72 48L70 58Q50 54 30 58Z" fill="#0f172a" stroke="#1e293b" stroke-width="1.2"/>` +
    `<g class="bl"><path class="gl" d="M33 51Q40 49 45 51L44 55Q39 54 34 55Z" fill="#22d3ee"/><path class="gl" d="M55 51Q60 49 67 51L66 55Q61 54 56 55Z" fill="#22d3ee"/></g>` +
    `<ellipse cx="50" cy="70" rx="12" ry="9" fill="#cbd5e1" stroke="#1e293b" stroke-width="1.2"/><path d="M46 66L54 66L50 70Z" fill="#1e293b"/><path d="M44 75H56" stroke="#1e293b" stroke-width="1.4" stroke-linecap="round"/>` +
    `<path d="M50 28L50 14" stroke="#64748b" stroke-width="2"/><circle class="gl" cx="50" cy="12" r="3.2" fill="#f43f5e"/>`),
};

export function genAvatars() {
  mkdirSync('avatars', { recursive: true });
  for (const [id] of MEMBER_AVATARS) writeFileSync(`avatars/${id}.svg`, ART[id]());
  return MEMBER_AVATARS.length;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(`✓ 会员专属头像：${genAvatars()} 张`);
