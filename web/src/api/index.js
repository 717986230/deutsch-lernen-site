// 后端沿用现有 Cloudflare Worker（analytics/worker.js），接口契约完全不变。
// 这样前端可以独立迁移、灰度切换，后端零改动。
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://uuoo-analytics.uuoo.workers.dev';

const TOKEN_KEY = 'acct_token';
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} };

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const tk = getToken();
  if (auth && tk) headers.Authorization = 'Bearer ' + tk;
  let res;
  try {
    res = await fetch(API_BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    // 离线或网络故障：调用方据此显示「离线中」，而不是当成业务失败
    return { ok: false, offline: true, data: { err: '网络不可用' } };
  }
  let data = {};
  try { data = await res.json(); } catch {}
  if (res.status === 401) setToken('');       // token 失效即清本地，避免反复 401
  return { ok: res.ok, status: res.status, data };
}

export const api = {
  register: (b) => request('/api/register', { method: 'POST', body: b, auth: false }),
  login: (b) => request('/api/login', { method: 'POST', body: b, auth: false }),
  me: () => request('/api/me'),
  sync: (b) => request('/api/sync', { method: 'POST', body: b }),
  profileUpdate: (b) => request('/api/profile/update', { method: 'POST', body: b }),
  // 排行榜：Worker 的接口是 /api/leaderboard?by=known|streak|total（无 /api/rank）
  leaderboard: (by = 'known') => request('/api/leaderboard?by=' + by, { auth: false }),
  // 找回密码：恢复码与邮箱验证码双通道（见 analytics/README.md）
  emailCode: (b) => request('/api/account/email_code', { method: 'POST', body: b, auth: false }),
  reset: (b) => request('/api/account/reset', { method: 'POST', body: b, auth: false }),
  newRecovery: (b) => request('/api/account/recovery', { method: 'POST', body: b }),
  logout: () => request('/api/logout', { method: 'POST' }),
  // 社交
  profile: (name) => request('/api/profile?name=' + encodeURIComponent(name), { auth: true }),
  follow: (name) => request('/api/follow', { method: 'POST', body: { username: name } }),
  unfollow: (name) => request('/api/unfollow', { method: 'POST', body: { username: name } }),
  feed: () => request('/api/feed'),
  following: (name) => request('/api/following' + (name ? '?u=' + encodeURIComponent(name) : '')),
};

// 数据源：与旧站共用 public/data/*.json，按需加载不进 bundle
const cache = {};
export async function loadData(name) {
  if (cache[name]) return cache[name];
  const r = await fetch(import.meta.env.BASE_URL + 'data/' + name + '.json');
  if (!r.ok) throw new Error('数据加载失败: ' + name);
  return (cache[name] = await r.json());
}
