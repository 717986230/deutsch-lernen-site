import { defineStore } from 'pinia';

// 深浅主题：与旧站逐字对齐 —— 同一个 localStorage 键 'theme'，同样三态
// （'dark' / 'light' / 未设置=跟随系统），同样在切换时改 meta[theme-color]，
// 这样两端来回切也不会「主题被重置」。
const KEY = 'theme';
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const sysDark = () => { try { return matchMedia('(prefers-color-scheme:dark)').matches; } catch { return false; } };

function paint(t) {
  const r = document.documentElement;
  if (t === 'dark' || t === 'light') r.setAttribute('data-theme', t);
  else r.removeAttribute('data-theme');
  // 手机上状态栏跟着染色；不同步的话浅色页配深色状态栏，就是用户看到的「顶部一半是别的颜色」
  const dark = t === 'dark' || (t !== 'light' && sysDark());
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', dark ? '#111417' : '#58cc02');
  return dark;
}

export const useTheme = defineStore('theme', {
  state: () => ({ pref: read(), dark: false }),
  actions: {
    init() {
      this.dark = paint(this.pref);
      // 跟随系统时，系统切换要实时生效
      try {
        matchMedia('(prefers-color-scheme:dark)').addEventListener('change', () => {
          if (this.pref !== 'dark' && this.pref !== 'light') this.dark = paint(this.pref);
        });
      } catch {}
    },
    toggle() {
      const next = this.dark ? 'light' : 'dark';
      this.pref = next;
      try { localStorage.setItem(KEY, next); } catch {}
      this.dark = paint(next);
    },
  },
});
