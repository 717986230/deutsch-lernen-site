// 学习进度：打卡、连续天数、累计、徽章。
// **与旧站共用同一批 localStorage 键**（study / knownWords），算法也逐字对齐——
// 老用户从旧站切到新端时进度必须一一对得上，差一天连续记录都是事故。
const K = 'study';
const rd = () => { try { const s = JSON.parse(localStorage.getItem(K) || '{}'); if (!s.goal) s.goal = 20; return s; } catch { return { goal: 20 }; } };
const wr = (s) => { try { localStorage.setItem(K, JSON.stringify(s)); } catch {} };
const day = (t) => { const d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const today = () => day(Date.now());
const yday = () => day(Date.now() - 864e5);

export const getStudy = rd;
export const levelOf = (k) => k >= 1000 ? 'C1' : k >= 500 ? 'B2' : k >= 200 ? 'B1' : k >= 50 ? 'A2' : 'A1';

/** 记一次学习动作。n=计数，isQuiz=是否答题。返回是否刚达成今日目标。 */
export function studyTick(n = 1, isQuiz = false) {
  const s = rd(), t = today();
  if (s.d !== t) {                       // 跨天：昨天学过才续上连续，否则从 1 重来
    s.streak = (s.last === yday()) ? (s.streak || 0) + 1 : 1;
    s.last = t; s.d = t; s.n = 0;
  }
  const prev = s.n || 0;
  s.n = prev + n;
  s.total = (s.total || 0) + n;
  if (isQuiz) s.quiz = (s.quiz || 0) + 1;
  if ((s.streak || 0) > (s.best || 0)) s.best = s.streak;
  if (!s.h) s.h = {};
  s.h[t] = s.n;
  const keys = Object.keys(s.h).sort();  // 只留最近 14 天，避免无限膨胀
  for (let i = 0; i < keys.length - 14; i++) delete s.h[keys[i]];
  const goal = s.goal || 20;
  const hit = prev < goal && s.n >= goal && s.gday !== t;
  if (hit) s.gday = t;
  wr(s);
  return hit;
}

export function collectStats(knownCount) {
  const s = rd();
  return {
    known: knownCount || 0,
    streak: s.streak || 0,
    best: Math.max(s.best || 0, s.streak || 0),
    total: s.total || 0,
    quiz: s.quiz || 0,
    level: levelOf(knownCount || 0),
  };
}

// 徽章：与 worker.js 的 computeBadges 一一对应。服务端才是判定方，这里只负责展示。
export const BADGES = [
  { id: 'founder', emo: '🌟', name: '创始人', desc: '前 100 名注册' },
  { id: 'streak7', emo: '🔥', name: '一周达人', m: 'best', n: 7 },
  { id: 'streak30', emo: '🏅', name: '月度铁人', m: 'best', n: 30 },
  { id: 'streak100', emo: '💎', name: '百日筑基', m: 'best', n: 100 },
  { id: 'streak365', emo: '👑', name: '全年无休', m: 'best', n: 365 },
  { id: 'word100', emo: '🌱', name: '词汇新芽', m: 'known', n: 100 },
  { id: 'word500', emo: '📖', name: '小有词汇', m: 'known', n: 500 },
  { id: 'word1000', emo: '📚', name: '词汇达人', m: 'known', n: 1000 },
  { id: 'word2000', emo: '🏆', name: '词汇大师', m: 'known', n: 2000 },
  { id: 'study500', emo: '💪', name: '勤学不辍', m: 'total', n: 500 },
  { id: 'study2000', emo: '⚡', name: '学而不厌', m: 'total', n: 2000 },
  { id: 'study10000', emo: '🚀', name: '学海无涯', m: 'total', n: 10000 },
  { id: 'quiz200', emo: '✏️', name: '测验能手', m: 'quiz', n: 200 },
  { id: 'quiz1000', emo: '🎓', name: '测验大师', m: 'quiz', n: 1000 },
];
const SEEN = 'badges_seen';
export const seenBadges = () => { try { return JSON.parse(localStorage.getItem(SEEN) || '[]'); } catch { return []; } };
/** 挑出「服务端已点亮但本地还没庆祝过」的，用于弹窗。
 *  首次同步（本地没有 badges_seen 记录）时静默入账、不弹窗 ——
 *  否则老用户换设备或从旧站切过来，会被十几个「徽章解锁」连环轰炸。 */
export function freshBadges(list) {
  let first = false;
  try { first = localStorage.getItem(SEEN) === null; } catch {}
  if (first) {
    try { localStorage.setItem(SEEN, JSON.stringify(list || [])); } catch {}
    return [];
  }
  const seen = seenBadges(), fresh = [];
  for (const id of list || []) if (seen.indexOf(id) < 0) { seen.push(id); const b = BADGES.find((x) => x.id === id); if (b) fresh.push(b); }
  try { localStorage.setItem(SEEN, JSON.stringify(seen)); } catch {}
  return fresh;
}
