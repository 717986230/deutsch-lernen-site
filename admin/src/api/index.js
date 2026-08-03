// 后台复用同一个 Worker。/stats 用 STATS_KEY 鉴权（只读匿名统计，不含任何个人信息）。
// key 存 sessionStorage：关掉标签页即失效，降低共用电脑时被顺走的风险。
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://uuoo-analytics.uuoo.workers.dev';
const K = 'stats_key';
export const getKey = () => sessionStorage.getItem(K) || '';
export const setKey = (v) => v ? sessionStorage.setItem(K, v) : sessionStorage.removeItem(K);

export async function stats(days = 7) {
  const r = await fetch(`${API_BASE}/stats?key=${encodeURIComponent(getKey())}&days=${days}`);
  if (r.status === 403) return { ok: false, err: 'STATS_KEY 不正确' };
  if (!r.ok) return { ok: false, err: '请求失败 ' + r.status };
  return { ok: true, data: await r.json() };
}
