import { defineStore } from 'pinia';

// 语言不是全局开关，而是「内容维度」。
// 旧站把切换按钮挂在顶栏、所有页面都显示，但短文/连载/对话根本没有英语数据，
// 用户切了却发现内容没变——这里改为：页面自己声明有没有双语版，没有就不显示控件。
export const useLang = defineStore('lang', {
  state: () => ({ lang: (() => { try { return localStorage.getItem('siteLang') || 'de'; } catch { return 'de'; } })() }),
  getters: {
    isEn: (s) => s.lang === 'en',
    // 数据文件名后缀：德语用原名，英语加 en_ 前缀
    file: (s) => (base) => s.lang === 'en' ? 'en_' + base : base,
  },
  actions: {
    set(v) { this.lang = v; try { localStorage.setItem('siteLang', v); } catch {} },
    toggle() { this.set(this.lang === 'de' ? 'en' : 'de'); },
  },
});
