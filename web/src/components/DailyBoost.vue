<script setup>
// 每日一句：打开站点弹一次，德语原句 + 朗读 + 中文 + 谐音。
// 句子直接取自词库（data/categories.json），不额外维护一份文案。
// 频率：每次打开站点弹一次（sessionStorage 标记，同一次浏览里切页不再弹）；
//       「今天不再提示」按自然日静音 —— 否则每次进来都要手动关就成骚扰了。
import { ref, onMounted } from 'vue';
import { loadData } from '../api';
import { speak } from '../api/speak';
import { useAccount } from '../store/account';
import { useLang } from '../store/lang';
import { track } from '../api/track';

const acct = useAccount(); const lang = useLang();
const item = ref(null);
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

// 「完整的日常句」：多词、首字母大写、以 . ! ? 收尾、有谐音、长度适中。
// 实测 4016 条词条里 779 条合格，覆盖入门/A1/A2/B1。
function pool(cats) {
  const out = [];
  for (const c of cats || []) {
    for (const p of c.phrases || []) {
      const de = (p.de || '').trim(), zh = (p.zh || '').trim(), py = (p.py || '').trim();
      if (!py || de.includes('↔') || zh.includes('↔')) continue;
      if (!de.includes(' ')) continue;
      if (!/^[A-ZÄÖÜ]/.test(de)) continue;
      if (!/[.!?]$/.test(de)) continue;
      if (de.length < 10 || de.length > 46) continue;
      out.push({ de, zh, py });
    }
  }
  // 排序保证「第几天取第几条」在所有设备上一致
  out.sort((a, b) => (a.de < b.de ? -1 : a.de > b.de ? 1 : 0));
  return out;
}

onMounted(async () => {
  if (!acct.logged) return;                       // 登录墙内弹这个没有意义
  try {
    if (sessionStorage.getItem('boostSeen')) return;
    if (localStorage.getItem('boostMute') === today()) return;
  } catch {}
  const cats = await loadData(lang.file('categories'));
  const list = pool(cats);
  if (!list.length) return;
  const i = Math.floor(Date.now() / 864e5) % list.length;
  item.value = list[i];
  try { sessionStorage.setItem('boostSeen', '1'); } catch {}
  try { track('boost', { i }); } catch {}
  // 弹出即朗读一遍：这是「每日一句」，听到才算数
  setTimeout(() => say(), 350);
});

function say() {
  if (item.value) speak(item.value.de, lang.isEn ? 'en-US' : 'de-DE');
}
function close(muteToday) {
  item.value = null;
  if (muteToday) { try { localStorage.setItem('boostMute', today()); } catch {} }
}
</script>

<template>
  <div v-if="item" class="boost-overlay" role="dialog" aria-label="每日一句" @click.self="close(false)">
    <div class="boost-card">
      <div class="boost-label">每日一句 · Satz des Tages</div>
      <div class="boost-de" lang="de">{{ item.de }}</div>
      <button class="boost-spk" type="button" aria-label="朗读这句" @click="say">🔊 朗读</button>
      <div class="boost-zh">{{ item.zh }}</div>
      <div class="boost-py">谐音：{{ item.py }}</div>
      <button class="boost-go" type="button" @click="close(false)">开始今天的学习</button>
      <button class="boost-skip" type="button" @click="close(true)">今天不再提示</button>
    </div>
  </div>
</template>

<style scoped>
/* z-index 要高过固定顶栏(200) 和底部标签栏(300)，否则遮罩底下会露出一条导航 */
.boost-overlay{position:fixed;inset:0;z-index:1400;background:rgba(0,0,0,.5);
  display:flex;align-items:center;justify-content:center;padding:24px}
.boost-card{background:var(--surface);border:1px solid var(--gold-dim);border-radius:20px;
  max-width:400px;width:100%;padding:26px 22px 20px;text-align:center;
  box-shadow:0 18px 50px rgba(0,0,0,.34)}
.boost-label{font-size:12px;letter-spacing:3px;color:var(--gold-text);margin-bottom:14px}
.boost-de{font-size:22px;font-weight:700;color:var(--text);line-height:1.45;
  margin-bottom:12px;font-style:italic}
.boost-spk{min-height:44px;padding:8px 20px;margin-bottom:12px;border-radius:22px;
  border:1px solid var(--gold-dim);background:var(--btn-bg);color:var(--gold-text);
  font-size:14px;font-weight:600;font-family:inherit;cursor:pointer}
.boost-spk:active{transform:scale(.96)}
.boost-zh{font-size:16px;color:var(--text-dim);line-height:1.7;margin-bottom:6px}
.boost-py{font-size:13px;color:var(--gold-text);line-height:1.7;margin-bottom:20px}
.boost-go{width:100%;min-height:48px;border:none;border-radius:24px;background:var(--gold);
  color:#14240a;font-size:16px;font-weight:800;font-family:inherit;cursor:pointer;
  box-shadow:0 4px 14px var(--gold-dim)}
.boost-go:active{transform:translateY(1px)}
.boost-skip{margin-top:10px;background:none;border:none;color:var(--text-faint);
  font-size:12px;font-family:inherit;cursor:pointer;padding:10px;min-height:44px}
</style>
