// 匿名埋点。与旧站同一套协议、同一个 /collect 接口，两端数据可合并分析。
//
// 收集：匿名访客ID（本地随机串）、会话ID、页面路径、来源、UA、会话时长。
// 服务端另行记录地域与**截断后的 IP**（IPv4 末段清零 / IPv6 保留 /48）。
// 不收集任何可直接识别个人的信息。
import { API_BASE } from './index';

const URL_ = API_BASE + '/collect';
const OPT_OUT = '_noTrack';        // 用户可关闭：localStorage._noTrack = '1'
const VID = '_vid';
const QUEUE = '_tq';

// 尊重浏览器的 Do Not Track —— 旧站有这个判断，迁移时漏了，等于对 DNT 用户偷偷开了埋点
const on = () => {
  try {
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return false;
    return localStorage.getItem(OPT_OUT) !== '1';
  } catch { return false; }
};
const rnd = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
function vid() {
  try {
    let v = localStorage.getItem(VID);
    if (!v) { v = rnd(); localStorage.setItem(VID, v); }
    return v;
  } catch { return 'anon'; }
}
const sid = rnd();
// 用 performance.now 而非 Date.now —— 后者受系统改时间影响，会算出负数或天文数字
const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
const dur = () => {
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  return Math.max(0, Math.round((now - t0) / 1000));
};

let q = [];
// 断网时暂存，下次启动补发 —— 否则离线期间的行为全丢
function save(batch) {
  try {
    const old = JSON.parse(localStorage.getItem(QUEUE) || '[]');
    localStorage.setItem(QUEUE, JSON.stringify(old.concat(batch).slice(-100)));
  } catch {}
}
function flush(beacon) {
  if (!on() || !q.length) return;
  const batch = q.splice(0, q.length);
  const body = JSON.stringify({
    vid: vid(), sid, path: location.pathname + location.hash,
    ref: document.referrer || '', ua: navigator.userAgent, dur: dur(), events: batch,
  });
  try {
    if (beacon && navigator.sendBeacon) { navigator.sendBeacon(URL_, body); return; }
    fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body, keepalive: true })
      .catch(() => save(batch));
  } catch { save(batch); }
}
export function track(name, props) {
  if (!on()) return;
  q.push({ t: Date.now(), n: name, p: props || null });
  if (q.length >= 10) flush();
}
export function initTrack(router) {
  if (!on() || !API_BASE) return;
  try {   // 补发上次没送出去的
    const pending = JSON.parse(localStorage.getItem(QUEUE) || '[]');
    if (pending.length) { q = q.concat(pending); localStorage.removeItem(QUEUE); }
  } catch {}
  router.afterEach((to) => track('view', { s: to.path }));
  // 页面隐藏时用 sendBeacon 送出 —— 这是唯一能保证送达的时机，
  // 会话时长也在此刻才是准的
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true);
  });
  window.addEventListener('pagehide', () => flush(true));
  setInterval(() => flush(), 30000);   // 长时间停留也定期上报，避免一直不落库
}
