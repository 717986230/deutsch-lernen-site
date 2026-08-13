// 阅读页共用：逐词小注 + 连续朗读队列。
// 短文 / 连载 / 对话三页结构几乎一样，逻辑放这里，三个视图只管排版。
import { ref } from 'vue';
import { loadData } from './index';

// ── 逐词小注 ──
// 旧站的 rdLookup 会查加密词库（_deWordMap），Vue 端没有那份 .dat，
// 所以退一步：read_gloss.json（508 条兜底表）+ 已加载的 categories.json 现建索引。
// 覆盖不到的词就不注 —— 与旧站一致：查不到或释义太长都返回 null，宁可不注也不注错。
let glossMap = null;
export async function loadGloss(cats) {
  if (glossMap) return glossMap;
  const m = Object.create(null);
  try {
    const tbl = await loadData('read_gloss');
    for (const k in tbl) m[k] = tbl[k][1];
  } catch { /* 兜底表缺失就只用词库 */ }
  for (const c of cats || []) {
    for (const p of c.phrases || []) {
      const w = (p.de || '').trim();
      // 只收单词词条，句子不进小注索引
      if (!/^[A-Za-zÄÖÜäöüß]{2,20}$/.test(w)) continue;
      const k = w.toLowerCase();
      if (!m[k]) m[k] = p.zh;
    }
  }
  glossMap = m;
  return m;
}
const SUF = ['est', 'en', 'er', 'em', 'es', 'st', 'e', 'n', 't', 's'];
export function glossOf(word) {
  if (!glossMap) return null;
  // 句中大写 Sie 是敬语「您」（小写 sie 才是她/他们）。礼貌对话里 Sie 极常见，
  // 注成「她」会让「möchten Sie…」这类句子彻底读歪。
  if (/^Sie[^A-Za-zÄÖÜäöüß]*$/.test(word)) return '您';
  const t = word.toLowerCase().replace(/^[^a-zäöüß]+|[^a-zäöüß]+$/g, '');
  if (!t) return null;
  let hit = glossMap[t];
  if (!hit) {
    for (const f of SUF) {
      if (t.length <= f.length + 2 || !t.endsWith(f)) continue;
      const b = t.slice(0, -f.length);
      // 变音还原：Zähne → Zahn
      const u = b.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u');
      hit = glossMap[b] || glossMap[b + 'en'] || glossMap[b + 'e'] || (u !== b ? (glossMap[u] || glossMap[u + 'en']) : null);
      if (hit) break;
    }
  }
  if (!hit) return null;
  const z = String(hit).split(/[，,、/；;（(]/)[0].replace(/[。！？!?.]+$/, '');
  return (z && z.length <= 6) ? z : null;
}
/** 把一句德语切成词，带上小注 —— 对应旧站的 wrapWords */
export function splitWords(text) {
  return String(text || '').split(/(\s+)/).filter(Boolean).map((t) => (
    /\S/.test(t) ? { w: t, g: glossOf(t) } : { sp: t }
  ));
}

// ── 连续朗读队列 ──
// 逐句念，念完自动下一句；切页/切筛选要能立刻作废旧队列，否则旧循环会继续念。
// ⚠️ Safari 的 speechSynthesis.cancel() 会**同步**派发 end/error（Chromium 是异步），
// 所以推进游标前必须先摘掉上一条的回调，否则同步回调会把游标推越界。
export function useLoopRead(speakLang = () => 'de-DE') {
  const playing = ref(false);
  const at = ref(-1);
  let seq = [], gen = 0, cur = null;

  function stop() {
    playing.value = false; at.value = -1; gen++;
    if (cur) { cur.onend = null; cur.onerror = null; cur = null; }
    try { speechSynthesis.cancel(); } catch { /* 无 TTS 时静默 */ }
  }
  function start(list, rate = 0.62, from = 0) {
    stop();
    if (!list || !list.length) return;
    seq = list; at.value = from; playing.value = true;
    const my = ++gen;
    step(my, rate);
  }
  function step(my, rate) {
    if (my !== gen || !playing.value) return;
    const text = seq[at.value];
    if (!text) return stop();
    if (cur) { cur.onend = null; cur.onerror = null; cur = null; }
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = speakLang(); u.rate = rate;
      const next = () => { if (my !== gen || !playing.value || cur !== u) return; at.value++; step(my, rate); };
      u.onend = next; u.onerror = next;
      cur = u;
      speechSynthesis.speak(u);
    } catch { stop(); }
  }
  return { playing, at, start, stop };
}

// 「隐藏词义」开关：与旧站同键 gloss（'0' = 关）
export const glossVisible = ref(localStorage.getItem('gloss') !== '0');
export function toggleGloss() {
  glossVisible.value = !glossVisible.value;
  try { localStorage.setItem('gloss', glossVisible.value ? '1' : '0'); } catch { /* 隐私模式 */ }
}
