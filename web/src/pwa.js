// Service Worker 注册。离线可用是本项目的核心承诺（AGENTS.md 1.3），
// Vue 端必须补上，否则替换旧站会让用户失去这个能力。
export function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {});
  });
}
