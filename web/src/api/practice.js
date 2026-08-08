// 学习进度：与旧站共用同一批 localStorage 键，两端数据互通，迁移期不丢进度。
const K_KNOWN = 'knownWords', K_WRONG = 'spWrong', K_SOUND = 'spSound', K_LAST = 'lastStudy';
const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export const getKnown = () => rd(K_KNOWN, {});
export function markKnown(de) { const m = getKnown(); m[de] = Date.now(); wr(K_KNOWN, m); }
// 取消标记：旧站的 ✓ 按钮是可反悔的，点错了要能撤回
export function unmarkKnown(de) { const m = getKnown(); delete m[de]; wr(K_KNOWN, m); }
export const getWrong = () => rd(K_WRONG, {});
export function markWrong(item) { const m = getWrong(); m[item.de] = { zh: item.zh, py: item.py, t: Date.now() }; wr(K_WRONG, m); }
export function clearWrong(de) { const m = getWrong(); delete m[de]; wr(K_WRONG, m); }
export const soundOn = () => localStorage.getItem(K_SOUND) !== '0';
export const setSound = (v) => { try { localStorage.setItem(K_SOUND, v ? '1' : '0'); } catch {} };
export function touchStudy() { try { localStorage.setItem(K_LAST, String(Date.now())); } catch {} }

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
