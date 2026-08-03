// 旧站在 build 期给 speechSynthesis 注入了 no-op 桩；这里改为运行时探测，
// 缺失时静默降级——朗读是增强功能，不该让页面报错。
const ok = typeof window !== 'undefined' && 'speechSynthesis' in window;
export const canSpeak = ok;
export function speak(text, lang = 'de-DE', rate = 0.9) {
  if (!ok) return false;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = rate;
    speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}
