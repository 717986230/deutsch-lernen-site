<script setup>
// 打开站点时的激励卡。与旧站同一套文案（data/boosts.json）、同一套频率规则：
//   每次打开站点弹一次（sessionStorage 标记，同一次浏览里切页不再弹）；
//   点「今天不再提示」按自然日静音 —— 否则天天要手动关就变成骚扰了。
import { ref, onMounted } from 'vue';
import { loadData } from '../api';
import { useAccount } from '../store/account';
import { track } from '../api/track';

const acct = useAccount();
const item = ref(null);
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

onMounted(async () => {
  if (!acct.logged) return;                       // 登录墙内弹激励没有意义
  try {
    if (sessionStorage.getItem('boostSeen')) return;
    if (localStorage.getItem('boostMute') === today()) return;
  } catch {}
  const list = await loadData('boosts');
  if (!list || !list.length) return;
  // 按天轮换：同一天进来看到同一条，换天才换 —— 刷新一次换一句会显得很随机
  const i = Math.floor(Date.now() / 864e5) % list.length;
  item.value = list[i];
  try { sessionStorage.setItem('boostSeen', '1'); } catch {}
  try { track('boost', { i }); } catch {}
});

function close(muteToday) {
  item.value = null;
  if (muteToday) { try { localStorage.setItem('boostMute', today()); } catch {} }
}
</script>

<template>
  <div v-if="item" class="boost-overlay" role="dialog" aria-label="今日激励" @click.self="close(false)">
    <div class="boost-card">
      <div class="boost-emo">🇩🇪</div>
      <div class="boost-h">{{ item[0] }}</div>
      <div class="boost-p">{{ item[1] }}</div>
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
.boost-emo{font-size:40px;line-height:1;margin-bottom:12px}
.boost-h{font-size:19px;font-weight:800;color:var(--text);margin-bottom:10px;line-height:1.4}
.boost-p{font-size:14px;color:var(--text-dim);line-height:1.9;margin-bottom:20px}
.boost-go{width:100%;min-height:48px;border:none;border-radius:24px;background:var(--gold);
  color:#14240a;font-size:16px;font-weight:800;font-family:inherit;cursor:pointer;
  box-shadow:0 4px 14px var(--gold-dim)}
.boost-go:active{transform:translateY(1px)}
.boost-skip{margin-top:10px;background:none;border:none;color:var(--text-faint);
  font-size:12px;font-family:inherit;cursor:pointer;padding:10px;min-height:44px}
</style>
