// 会员专属头像：8 款原创 Q 版角色（预设 SVG，非用户上传）。画布 100×100，满幅绘制，头像位是圆形裁切。
//   会员（月卡/年卡）可选：龙崽 凤凰雏 九尾狐 宇航猫 魔法猫头鹰 机甲熊
//   永久会员独享：金龙王 暗龙王
// 存值 'm:<id>'；服务端 MEMBER_AV 白名单 + 档位校验，前端 MEMBER_AV 同步。
// 成就头像（点亮对应徽章解锁，存 'a:<id>'）：火焰狼(streak7) 铁甲骑士(streak30) 冰狐(streak100) 书海鲸(word1000)
//   赛博猫(word3000) 雷霆鹰(study2000) 樱花武士兔(quiz1000) 星穹熊(founder)。服务端 ACH_AV 校验徽章。
// 用法：node tools/gen-avatars.mjs → avatars/<id>.svg
import { writeFileSync, mkdirSync } from 'node:fs';

export const ACH_AVATARS = [
  ['flamewolf', '火焰狼', 'streak7'], ['knight', '铁甲骑士', 'streak30'], ['icefox', '冰狐', 'streak100'], ['whale', '书海鲸', 'word1000'],
  ['cybercat', '赛博猫', 'word3000'], ['thundereagle', '雷霆鹰', 'study2000'], ['sakurabunny', '樱花武士兔', 'quiz1000'], ['starbear', '星穹熊', 'founder'],
];
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
  // ───────── 成就头像 ─────────
  flamewolf: () => svg(bg('b', '#7c2d12', '#1c0a02') +
    `<linearGradient id="fe" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#dc2626"/><stop offset=".55" stop-color="#f97316"/><stop offset="1" stop-color="#fde047"/></linearGradient>` +
    `<radialGradient id="hd" cx=".45" cy=".35"><stop offset="0" stop-color="#78716c"/><stop offset="1" stop-color="#292524"/></radialGradient>`,
    `<rect width="100" height="100" fill="url(#b)"/>` +
    // 背后火焰鬃
    [[-26, 4], [-14, 0], [0, -4], [14, 0], [26, 4]].map(([dx, dy], i) => `<path class="fl" style="animation-delay:${i * 0.15}s" d="M${50 + dx - 8} ${40 + dy}C${50 + dx - 10} ${22 + dy} ${50 + dx * 1.3} ${12 + dy} ${50 + dx * 1.35} ${4 + dy}C${50 + dx + 6} ${16 + dy} ${50 + dx + 10} ${26 + dy} ${50 + dx + 8} ${40 + dy}Z" fill="url(#fe)" stroke="#7f1d1d" stroke-width="1"/>`).join('') +
    `<path d="M26 44L20 16L42 32ZM74 44L80 16L58 32Z" fill="#44403c" stroke="#1c1917" stroke-width="1.4" stroke-linejoin="round"/><path d="M28 40L25 24L38 33ZM72 40L75 24L62 33Z" fill="#f97316"/>` +
    `<path d="M22 50C22 36 36 30 50 30C64 30 78 36 78 50C78 66 66 84 50 86C34 84 22 66 22 50Z" fill="url(#hd)" stroke="#1c1917" stroke-width="1.4"/>` +
    `<path d="M34 64Q50 56 66 64Q62 80 50 82Q38 80 34 64Z" fill="#e7e5e4"/>` +
    `<path d="M28 44Q36 38 42 44M58 44Q64 38 72 44" fill="none" stroke="#f97316" stroke-width="2.4" stroke-linecap="round"/>` +
    eye(39, 52, 5.5, 6, '#fb923c', true) + eye(61, 52, 5.5, 6, '#fb923c', true) +
    `<ellipse cx="50" cy="66" rx="4" ry="3" fill="#1c1917"/><path d="M44 72Q50 76 56 72" fill="none" stroke="#1c1917" stroke-width="1.6" stroke-linecap="round"/><path d="M43 71L45 76L47 72ZM57 71L55 76L53 72Z" fill="#fff"/>` +
    star(14, 84, 2.4, '#fde047') + star(86, 80, 2, '#fde047', 0.7)),
  knight: () => svg(bg('b', '#475569', '#0f172a') +
    `<linearGradient id="mt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8fafc"/><stop offset=".5" stop-color="#94a3b8"/><stop offset="1" stop-color="#334155"/></linearGradient>` +
    `<linearGradient id="pl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#dc2626"/><stop offset="1" stop-color="#991b1b"/></linearGradient>`,
    `<rect width="100" height="100" fill="url(#b)"/>` +
    // 盔缨
    `<path d="M50 6C62 6 72 14 72 30L66 30C66 20 60 14 50 14C40 14 34 20 34 30L28 30C28 14 38 6 50 6Z" fill="url(#pl)" stroke="#450a0a" stroke-width="1"/>` +
    // 头盔
    `<path d="M24 50C24 32 36 22 50 22C64 22 76 32 76 50L76 70C76 80 64 88 50 88C36 88 24 80 24 70Z" fill="url(#mt)" stroke="#1e293b" stroke-width="1.6"/>` +
    `<path d="M50 22V40" stroke="#1e293b" stroke-width="2"/><path d="M28 60H72" stroke="#1e293b" stroke-width="1.2" opacity=".6"/>` +
    [[30, 72], [70, 72], [36, 82], [64, 82]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#1e293b"/>`).join('') +
    // 面甲 T 形开口
    `<path d="M30 44Q50 38 70 44L70 54Q50 50 30 54Z" fill="#0f172a"/><path d="M44 54L56 54L56 76L44 76Z" fill="#0f172a"/>` +
    `<path d="M44 76Q50 80 56 76" fill="none" stroke="#1e293b" stroke-width="1"/>` +
    `<g class="bl"><path class="gl" d="M34 48Q40 46 45 48L44 52Q39 51 35 52Z" fill="#38bdf8"/><path class="gl" d="M55 48Q60 46 66 48L65 52Q61 51 56 52Z" fill="#38bdf8"/></g>` +
    // 金色徽记
    `<path d="M50 60L53 66L50 72L47 66Z" fill="#facc15" stroke="#a16207" stroke-width=".8"/>` +
    star(16, 24, 2.4, '#e2e8f0') + star(84, 30, 2, '#e2e8f0', 0.8)),
  icefox: () => svg(bg('b', '#bae6fd', '#1d4ed8') +
    `<radialGradient id="hd" cx=".45" cy=".35"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e0f2fe"/></radialGradient>`,
    `<rect width="100" height="100" fill="url(#b)"/>` +
    // 冰晶
    [[12, 20, 7, -20], [88, 26, 6, 15], [14, 78, 5, 30], [86, 80, 7, -10]].map(([x, y, r, a]) => `<path transform="rotate(${a} ${x} ${y})" d="M${x} ${y - r * 1.6}L${x + r * 0.6} ${y}L${x} ${y + r * 1.6}L${x - r * 0.6} ${y}Z" fill="#fff" stroke="#7dd3fc" stroke-width=".8" opacity=".9"/>`).join('') +
    `<path d="M26 46L20 12L44 30ZM74 46L80 12L56 30Z" fill="#fff" stroke="#0ea5e9" stroke-width="1.4" stroke-linejoin="round"/><path d="M28 40L25 20L39 31ZM72 40L75 20L61 31Z" fill="#bae6fd"/>` +
    `<path d="M22 52C22 36 36 30 50 30C64 30 78 36 78 52C78 66 66 82 50 84C34 82 22 66 22 52Z" fill="url(#hd)" stroke="#0ea5e9" stroke-width="1.4"/>` +
    // 额头冰晶纹
    `<path d="M50 34L53 40L50 46L47 40Z" fill="#38bdf8"/><path d="M28 48Q34 44 40 48M60 48Q66 44 72 48" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round"/>` +
    eye(38, 55, 5.5, 6.5, '#22d3ee', true) + eye(62, 55, 5.5, 6.5, '#22d3ee', true) +
    `<ellipse cx="50" cy="65" rx="2.4" ry="1.8" fill="#0369a1"/><path d="M46 68Q50 71 54 68" fill="none" stroke="#0369a1" stroke-width="1.4" stroke-linecap="round"/>` +
    blush(31, 64) + blush(69, 64) +
    // 呼出的寒气
    `<circle class="gl" cx="62" cy="76" r="2.4" fill="#fff" opacity=".8"/><circle class="gl" style="animation-delay:.6s" cx="70" cy="82" r="3.2" fill="#fff" opacity=".7"/>`),
  whale: () => svg(bg('b', '#7dd3fc', '#0c4a6e') +
    `<linearGradient id="wb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#60a5fa"/><stop offset="1" stop-color="#1e40af"/></linearGradient>`,
    `<rect width="100" height="100" fill="url(#b)"/>` +
    // 水花
    `<path d="M50 30C46 20 48 10 50 2C52 10 54 20 50 30Z" fill="#e0f2fe" opacity=".9"/><path d="M50 28C42 20 36 18 30 20C38 22 44 26 50 30ZM50 28C58 20 64 18 70 20C62 22 56 26 50 30Z" fill="#e0f2fe" opacity=".8"/>` +
    // 鲸身
    `<path d="M14 58C14 42 30 32 50 32C70 32 86 42 86 58C86 70 76 82 50 82C24 82 14 70 14 58Z" fill="url(#wb)" stroke="#1e3a8a" stroke-width="1.4"/>` +
    `<path d="M20 66Q50 60 80 66Q70 78 50 80Q30 78 20 66Z" fill="#dbeafe"/>` +
    `<path d="M84 50C92 44 96 50 92 58C96 62 92 70 84 64Z" fill="#3b82f6" stroke="#1e3a8a" stroke-width="1.2"/>` +
    eye(36, 54, 5, 6, '#60a5fa') + eye(64, 54, 5, 6, '#60a5fa') +
    `<path d="M42 66Q50 72 58 66" fill="none" stroke="#1e3a8a" stroke-width="1.6" stroke-linecap="round"/>` + blush(28, 62) + blush(72, 62) +
    // 书本
    `<g transform="translate(50 88)"><path d="M-16 -6Q-8 -10 0 -6Q8 -10 16 -6V6Q8 2 0 6Q-8 2 -16 6Z" fill="#fef3c7" stroke="#92400e" stroke-width="1.2"/><path d="M0 -6V6" stroke="#92400e" stroke-width="1"/><path d="M-12 -2H-4M-12 1H-4M4 -2H12M4 1H12" stroke="#b45309" stroke-width=".8"/></g>` +
    star(14, 20, 2.4, '#fff') + star(86, 14, 2, '#fff', 0.7)),
  cybercat: () => svg(bg('b', '#1e1b4b', '#020617') +
    `<linearGradient id="nb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset=".5" stop-color="#e879f9"/><stop offset="1" stop-color="#facc15"/></linearGradient>`,
    `<rect width="100" height="100" fill="url(#b)"/><path d="M0 72H100M0 84H100M0 94H100M16 60L0 100M34 60L28 100M66 60L72 100M84 60L100 100" stroke="#e879f9" stroke-width=".6" opacity=".35"/>` +
    `<path d="M26 44L22 14L44 32ZM74 44L78 14L56 32Z" fill="#312e81" stroke="url(#nb)" stroke-width="1.6" stroke-linejoin="round"/><path d="M28 40L26 22L38 32ZM72 40L74 22L62 32Z" fill="#e879f9" opacity=".8"/>` +
    `<path d="M22 52C22 36 36 30 50 30C64 30 78 36 78 52C78 66 66 82 50 84C34 82 22 66 22 52Z" fill="#1e1b4b" stroke="url(#nb)" stroke-width="1.8"/>` +
    // 面罩 + 霓虹眼
    `<path d="M28 46Q50 40 72 46L72 58Q50 54 28 58Z" fill="#0f0a2e" stroke="#22d3ee" stroke-width="1"/>` +
    `<g class="bl"><path class="gl" d="M33 50Q40 47 45 50L44 55Q39 54 34 55Z" fill="#22d3ee"/><path class="gl" d="M55 50Q60 47 67 50L66 55Q61 54 56 55Z" fill="#22d3ee"/></g>` +
    `<path d="M48 64L52 64L50 66.5Z" fill="#e879f9"/><path d="M46 68Q50 71 50 66.5Q50 71 54 68" fill="none" stroke="#e879f9" stroke-width="1.2" stroke-linecap="round"/>` +
    `<path d="M30 62L20 60M30 66L20 68M70 62L80 60M70 66L80 68" stroke="#facc15" stroke-width="1" stroke-linecap="round"/>` +
    `<path d="M30 76Q50 70 70 76" fill="none" stroke="#e879f9" stroke-width="1.4" stroke-linecap="round"/>` +
    star(14, 22, 2.4, '#22d3ee') + star(86, 26, 2, '#facc15', 0.6) + star(16, 86, 2, '#e879f9', 1.1)),
  thundereagle: () => svg(bg('b', '#4c1d95', '#0f0520') +
    `<linearGradient id="fe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#facc15"/><stop offset="1" stop-color="#b45309"/></linearGradient>`,
    `<rect width="100" height="100" fill="url(#b)"/>` +
    // 闪电
    `<path class="gl" d="M14 10L8 30L16 28L10 48" fill="none" stroke="#fde047" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/><path class="gl" style="animation-delay:.8s" d="M88 14L82 32L90 30L84 50" fill="none" stroke="#fde047" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` +
    // 翅
    `<path d="M22 56C8 52 4 66 10 80C16 70 22 68 28 70ZM78 56C92 52 96 66 90 80C84 70 78 68 72 70Z" fill="#78350f" stroke="#451a03" stroke-width="1.2"/>` +
    // 羽冠
    `<path d="M36 34C40 20 48 12 50 8C52 12 60 20 64 34Z" fill="url(#fe)" stroke="#78350f" stroke-width="1"/><path d="M50 10L50 32" stroke="#78350f" stroke-width="1"/>` +
    `<path d="M22 54C22 40 36 32 50 32C64 32 78 40 78 54C78 68 66 82 50 84C34 82 22 68 22 54Z" fill="#92400e" stroke="#451a03" stroke-width="1.4"/>` +
    `<path d="M30 60Q50 52 70 60Q66 78 50 80Q34 78 30 60Z" fill="#fef3c7"/>` +
    `<path d="M28 46Q36 40 44 46M56 46Q64 40 72 46" fill="none" stroke="#451a03" stroke-width="2.6" stroke-linecap="round"/>` +
    eye(39, 52, 5.5, 6, '#facc15', true) + eye(61, 52, 5.5, 6, '#facc15', true) +
    `<path d="M43 60L57 60L52 74L48 74Z" fill="#f59e0b" stroke="#78350f" stroke-width="1.2" stroke-linejoin="round"/><path d="M43 60L57 60L50 64Z" fill="#fde047"/>`),
  sakurabunny: () => svg(bg('b', '#fce7f3', '#f9a8d4') +
    `<radialGradient id="hd" cx=".45" cy=".35"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#fdf2f8"/></radialGradient>`,
    `<rect width="100" height="100" fill="url(#b)"/>` +
    // 樱花瓣
    [[12, 16, 0], [88, 20, 40], [10, 70, -30], [90, 76, 20], [76, 92, 60]].map(([x, y, a], i) => `<g class="tw" style="animation-delay:${i * 0.4}s" transform="rotate(${a} ${x} ${y})"><path d="M${x} ${y - 4}Q${x + 4} ${y - 2} ${x + 3} ${y + 3}Q${x} ${y + 1} ${x - 3} ${y + 3}Q${x - 4} ${y - 2} ${x} ${y - 4}Z" fill="#f472b6"/></g>`).join('') +
    // 长耳
    `<path d="M36 36C30 20 32 8 38 4C44 10 46 24 44 36ZM64 36C70 20 68 8 62 4C56 10 54 24 56 36Z" fill="#fff" stroke="#be185d" stroke-width="1.2"/><path d="M38 32C35 22 36 12 38 8C41 12 42 22 41 32ZM62 32C65 22 64 12 62 8C59 12 58 22 59 32Z" fill="#fbcfe8"/>` +
    `<path d="M24 56C24 40 36 32 50 32C64 32 76 40 76 56C76 70 66 84 50 86C34 84 24 70 24 56Z" fill="url(#hd)" stroke="#be185d" stroke-width="1.2"/>` +
    // 武士头带
    `<path d="M24 42Q50 36 76 42L76 48Q50 42 24 48Z" fill="#dc2626"/><circle cx="50" cy="43" r="3" fill="#fff"/><path d="M76 44L92 36L90 42L78 48ZM76 46L90 50L88 56L78 50Z" fill="#dc2626"/>` +
    eye(39, 58, 5, 6, '#ec4899') + eye(61, 58, 5, 6, '#ec4899') +
    `<path d="M48 67L52 67L50 69.5Z" fill="#be185d"/><path d="M46 71Q50 74 50 69.5Q50 74 54 71" fill="none" stroke="#be185d" stroke-width="1.2" stroke-linecap="round"/>` +
    blush(31, 66) + blush(69, 66) +
    // 小太刀
    `<g transform="translate(78 78) rotate(-45)"><rect x="-2" y="-18" width="4" height="22" rx="1" fill="#e5e7eb" stroke="#6b7280" stroke-width=".8"/><rect x="-5" y="3" width="10" height="2.4" rx="1" fill="#facc15"/><rect x="-2" y="5" width="4" height="9" rx="1" fill="#7f1d1d"/></g>`),
  starbear: () => svg(bg('b', '#312e81', '#0b0a2a') +
    `<radialGradient id="hd" cx=".45" cy=".35"><stop offset="0" stop-color="#a5b4fc"/><stop offset="1" stop-color="#4338ca"/></radialGradient>`,
    `<rect width="100" height="100" fill="url(#b)"/>` +
    [[10, 14], [88, 10], [92, 50], [8, 56], [20, 90], [80, 92], [50, 6]].map(([x, y], i) => star(x, y, i % 2 ? 2 : 2.8, '#fde68a', i * 0.35)).join('') +
    `<path d="M80 22a8 8 0 1 0 0 .1Z" fill="#fef9c3"/><circle cx="84" cy="19" r="7" fill="#312e81"/>` +
    `<circle cx="28" cy="34" r="11" fill="url(#hd)" stroke="#1e1b4b" stroke-width="1.4"/><circle cx="72" cy="34" r="11" fill="url(#hd)" stroke="#1e1b4b" stroke-width="1.4"/><circle cx="28" cy="34" r="5" fill="#c7d2fe"/><circle cx="72" cy="34" r="5" fill="#c7d2fe"/>` +
    `<path d="M22 54C22 38 36 30 50 30C64 30 78 38 78 54C78 70 66 86 50 88C34 86 22 70 22 54Z" fill="url(#hd)" stroke="#1e1b4b" stroke-width="1.4"/>` +
    // 身上星座连线
    `<path d="M34 42L42 38L48 44L58 40L66 46" fill="none" stroke="#fde68a" stroke-width=".8" opacity=".8"/>` + [[34, 42], [42, 38], [48, 44], [58, 40], [66, 46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3" fill="#fef9c3"/>`).join('') +
    `<ellipse cx="50" cy="68" rx="14" ry="11" fill="#c7d2fe"/>` +
    eye(39, 54, 5.5, 6, '#818cf8', true) + eye(61, 54, 5.5, 6, '#818cf8', true) +
    `<ellipse cx="50" cy="64" rx="4" ry="3" fill="#1e1b4b"/><path d="M44 70Q50 75 56 70" fill="none" stroke="#1e1b4b" stroke-width="1.6" stroke-linecap="round"/>` +
    blush(30, 62) + blush(70, 62) + star(50, 36, 3.5, '#fde047')),
};

export function genAvatars() {
  mkdirSync('avatars', { recursive: true });
  for (const [id] of [...MEMBER_AVATARS, ...ACH_AVATARS]) writeFileSync(`avatars/${id}.svg`, ART[id]());
  return MEMBER_AVATARS.length + ACH_AVATARS.length;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(`✓ 会员专属头像：${genAvatars()} 张`);
