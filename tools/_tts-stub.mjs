// 浏览器体检用的「假朗读引擎」：照 Chromium 的行为模拟 speechSynthesis，
// 用来测接力朗读的竞态（容器里没有真实语音，speak 一调就静默 error，测不出问题）。
//   - speak 排队；轮到某句时异步派发 start，按文本长度「读」一会儿再派发 end
//   - cancel 异步给当前句派 error(interrupted)、给排队句派 error(canceled)（Chromium 就是这样）
//   - getVoices 给一个 de-DE、一个 en-US、一个 zh-CN
// 每句开读都记进 window.__ttsLog：{t:文本, lang, ts}
export async function stubTTS(page, { msPerChar = 4 } = {}) {
  await page.addInitScript((msPerChar) => {
    const log = (window.__ttsLog = []);
    const voices = [
      { name: 'Anna', lang: 'de-DE', localService: true, default: false, voiceURI: 'anna' },
      { name: 'Samantha', lang: 'en-US', localService: true, default: true, voiceURI: 'sam' },
      { name: 'Tingting', lang: 'zh-CN', localService: true, default: false, voiceURI: 'tt' },
    ];
    class Utt extends EventTarget {
      constructor(text) { super(); this.text = text; this.lang = ''; this.voice = null; this.rate = 1; this.pitch = 1; this.volume = 1;
        this.onstart = this.onend = this.onerror = this.onboundary = this.onpause = this.onresume = this.onmark = null; }
    }
    const fire = (u, type, extra) => {
      const ev = new Event(type); Object.assign(ev, extra || {});
      try { u.dispatchEvent(ev); } catch (e) {}
      const h = u['on' + type]; if (h) try { h.call(u, ev); } catch (e) { setTimeout(() => { throw e; }); }
    };
    const q = []; let cur = null, timer = 0;
    const ss = {
      speaking: false, pending: false, paused: false,
      getVoices: () => voices.slice(), onvoiceschanged: null,
      addEventListener() {}, removeEventListener() {},
      speak(u) { q.push(u); this.pending = true; if (!cur) setTimeout(run, 0); },
      cancel() {
        const c = cur, rest = q.splice(0); cur = null; clearTimeout(timer); this.speaking = this.pending = false;
        if (c) setTimeout(() => fire(c, 'error', { error: 'interrupted' }), 5);
        rest.forEach((u) => setTimeout(() => fire(u, 'error', { error: 'canceled' }), 5));
      },
      pause() { this.paused = true; }, resume() { this.paused = false; },
    };
    function run() {
      if (cur || !q.length) { ss.pending = q.length > 0; return; }
      cur = q.shift(); ss.speaking = true; ss.pending = q.length > 0;
      const u = cur;
      log.push({ t: u.text, lang: u.lang, ts: Date.now() });
      fire(u, 'start');
      timer = setTimeout(() => { if (cur !== u) return; cur = null; ss.speaking = false; fire(u, 'end'); run(); }, 30 + String(u.text).length * msPerChar);
    }
    Object.defineProperty(window, 'speechSynthesis', { value: ss, configurable: true });
    window.SpeechSynthesisUtterance = Utt;
  }, msPerChar);
}
