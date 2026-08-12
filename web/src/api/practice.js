// 学习进度：与旧站共用同一批 localStorage 键，两端数据互通，迁移期不丢进度。
//
// ⚠️ 这三个键必须跟 src.html 一字不差，改之前先 grep 旧站：
//   known      —— 掌握词。**不是 knownWords**（曾经写错，等于两端各存各的、进度不互通）
//   lastStudy  —— 「继续上次」，值是对象 {level,cat,name,t}；写成时间戳会让旧站首页那张卡渲染不出来
//   study      —— 打卡/连续天数，见 study.js
const K_KNOWN = 'known', K_WRONG = 'spWrong', K_SOUND = 'spSound', K_LAST = 'lastStudy';
const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export const getKnown = () => rd(K_KNOWN, {});
// 值的形状也得跟旧站一致：{b:盒级, t:时间戳}。旧站的 Leitner 复习按 b 算到期日，
// 写成裸时间戳会被 srsInfo 当成非法值丢掉，标了的词永远不进复习队列。
export function markKnown(de) { const m = getKnown(); m[de] = { b: 1, t: Date.now() }; wr(K_KNOWN, m); }
// 取消标记：旧站的 ✓ 按钮是可反悔的，点错了要能撤回
export function unmarkKnown(de) { const m = getKnown(); delete m[de]; wr(K_KNOWN, m); }
export const getWrong = () => rd(K_WRONG, {});
export function markWrong(item) { const m = getWrong(); m[item.de] = { zh: item.zh, py: item.py, t: Date.now() }; wr(K_WRONG, m); }
export function clearWrong(de) { const m = getWrong(); delete m[de]; wr(K_WRONG, m); }
export const soundOn = () => localStorage.getItem(K_SOUND) !== '0';
export const setSound = (v) => { try { localStorage.setItem(K_SOUND, v ? '1' : '0'); } catch {} };
// 旧站 _lastStudySet 存的是 {level,cat,name,t}，首页「▶ 继续上次：xxx」直接读 .name
export function setLastStudy(o) { wr(K_LAST, { ...o, t: Date.now() }); }

// 音效：用 WebAudio 直接合成，不引入任何音频文件（全站离线可用的前提）
let ac = null;
function beep(freq, dur, type) {
  if (!soundOn()) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    o.connect(g); g.connect(ac.destination);
    const t = ac.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  } catch {}
}
export const okBeep = () => beep(880, 0.06, 'triangle');
export const badBeep = () => beep(150, 0.14, 'sawtooth');

const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [b[i], b[j]] = [b[j], b[i]]; } return b; };

// 出题池：从分类里挑合规的词/句，已掌握的自动跳过
export function buildPool(cats, { level = 'all', unit = 'word' } = {}) {
  const known = getKnown(), seen = {}, out = [];
  for (const c of cats) {
    if (level !== 'all' && String(c.level) !== level) continue;
    for (const p of c.phrases) {
      if (unit === 'sent') {
        const s = (p.de || '').trim();
        if (s.split(/\s+/).length < 2 || s.length < 8 || s.length > 40) continue;
        if (!/^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß ,.!?'’-]*$/.test(s)) continue;
        const k = s.toLowerCase();
        if (seen[k] || known[s]) continue;
        seen[k] = 1; out.push({ de: s, zh: p.zh, py: p.py });
      } else {
        const w = (p.de || '').replace(/^[^A-Za-zÄÖÜäöüß]+/, '').replace(/[^A-Za-zÄÖÜäöüß]+$/, '');
        if (!/^[A-Za-zÄÖÜäöüß]{2,16}$/.test(w)) continue;
        const k = w.toLowerCase();
        if (seen[k] || known[w]) continue;
        seen[k] = 1; out.push({ de: w, zh: p.zh, py: p.py });
      }
    }
  }
  return shuffle(out);
}
// 判分：忽略大小写与首尾空白；德语变音字母必须打对，不做等价折算
export const isRight = (input, answer) =>
  input.trim().toLowerCase() === answer.trim().toLowerCase();
export { shuffle };

// ───────── 测验出题 ─────────
// 词汇类三种模式共用同一个池；冠词模式从 der/die/das 前缀反推答案。
export function quizPool(cats, level = 'all') {
  const out = [], seen = {};
  for (const c of cats) {
    if (level !== 'all' && String(c.level) !== level) continue;
    for (const p of c.phrases) {
      const k = (p.de || '').trim();
      if (!k || seen[k]) continue;
      seen[k] = 1; out.push(p);
    }
  }
  return out;
}
export function genderPool(cats, level = 'all') {
  return quizPool(cats, level).filter((p) => /^(der|die|das)\s+\S/.test(p.de.trim()));
}
// 抽 1 正 3 误；干扰项去重且不与正解重复
export function makeQuestion(pool, keyOf) {
  if (pool.length < 4) return null;
  const right = pool[Math.random() * pool.length | 0];
  const rk = keyOf(right), wrong = [], used = { [rk]: 1 };
  let guard = 0;
  while (wrong.length < 3 && guard++ < 200) {
    const w = pool[Math.random() * pool.length | 0], k = keyOf(w);
    if (used[k]) continue;
    used[k] = 1; wrong.push(w);
  }
  if (wrong.length < 3) return null;
  return { right, options: shuffle([right, ...wrong]) };
}

// ── Leitner 间隔复习：与旧站 SRS_IV / srsInfo / srsDueList 逐字对齐 ──
// 掌握的词按盒级 3/7/16/35 天到期回炉；老数据（值直接是 1）视为立即到期。
const SRS_IV = [0, 3, 7, 16, 35];
export function srsInfo(v) {
  if (v === 1 || v === true) return { b: 1, t: 0 };
  if (v && typeof v === 'object') return { b: Math.min(v.b || 1, 4), t: v.t || 0 };
  return null;
}
export function srsDueList() {
  const m = getKnown(), out = [], now = Date.now();
  for (const k in m) {
    const s = srsInfo(m[k]);
    if (s && now - s.t >= SRS_IV[s.b] * 864e5) out.push(k);
  }
  return out;
}
// 今日课程：到期复习词最多 8 个，其余补新词，凑满 15
export function dailyPlan() {
  const rev = Math.min(srsDueList().length, 8);
  const neu = Math.max(0, 15 - rev);
  return { rev, neu, total: rev + neu };
}
// 今日课程是否已完成（与旧站同键 dailyLesson）
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
export function dailyDone() { const d = rd('dailyLesson', {}); return d.date === today() && !!d.done; }
export function markDailyDone() { wr('dailyLesson', { date: today(), done: true }); }
