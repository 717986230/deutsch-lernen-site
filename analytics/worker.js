// Cloudflare Worker：接收网站匿名埋点并写入 D1。
// 路由：
//   POST /collect  接收 {vid,sid,path,ref,ua,events:[{t,n,p}]} → 批量插入
//   GET  /stats?key=SECRET&days=7  返回 PV/UV/各事件计数（需密钥）
export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(req.url);

    if (req.method === 'POST' && url.pathname === '/collect') {
      let d;
      try { d = JSON.parse(await req.text()); } catch { return new Response('bad json', { status: 400, headers: cors }); }
      const cut = (v, n) => (v == null ? '' : String(v)).slice(0, n);
      const vid = cut(d.vid, 40), sid = cut(d.sid, 20), path = cut(d.path, 200), ref = cut(d.ref, 300), ua = cut(d.ua, 300);
      const country = (req.cf && req.cf.country) || '';
      const evs = Array.isArray(d.events) ? d.events.slice(0, 50) : [];
      if (evs.length) {
        const stmt = env.DB.prepare(
          'INSERT INTO events (ts,vid,sid,name,props,path,ref,ua,country) VALUES (?,?,?,?,?,?,?,?,?)'
        );
        await env.DB.batch(evs.map(e => stmt.bind(
          e.t || Date.now(), vid, sid, cut(e.n, 40),
          e.p ? JSON.stringify(e.p).slice(0, 500) : null, path, ref, ua, country
        )));
      }
      return new Response('ok', { headers: cors });
    }

    if (req.method === 'GET' && url.pathname === '/stats') {
      if (url.searchParams.get('key') !== env.STATS_KEY) return new Response('forbidden', { status: 403 });
      const days = Math.min(90, +url.searchParams.get('days') || 7);
      const since = Date.now() - days * 86400000;
      const pv = await env.DB.prepare('SELECT COUNT(*) c FROM events WHERE ts>?').bind(since).first();
      const uv = await env.DB.prepare('SELECT COUNT(DISTINCT vid) c FROM events WHERE ts>?').bind(since).first();
      const byEvent = await env.DB.prepare('SELECT name,COUNT(*) c FROM events WHERE ts>? GROUP BY name ORDER BY c DESC LIMIT 20').bind(since).all();
      const byView = await env.DB.prepare("SELECT props,COUNT(*) c FROM events WHERE ts>? AND name='view' GROUP BY props ORDER BY c DESC LIMIT 20").bind(since).all();
      return new Response(JSON.stringify({ days, pv: pv.c, uv: uv.c, byEvent: byEvent.results, byView: byView.results }, null, 2),
        { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' } });
    }
    return new Response('uuoo analytics');
  }
};
