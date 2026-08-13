<script setup>
// 「情景对话」——照旧站 #dialog 重做：10 段对话一页铺开（原来那版是列表点进单段）。
// 每段：场景标题 + 级别徽章 + ▶播放全部 + ⌨️练这段；下面是左右分列的气泡，
// 每条气泡带 德语 / 🔊 / 中文 / 谐音。
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter } from 'vue-router';
import { loadData } from '../api';
import { speak } from '../api/speak';
import { useLang } from '../store/lang';
import { useLoopRead } from '../api/reader';
defineOptions({ name: 'Dialog' });

const router = useRouter();
const langS = useLang();
const list = ref([]); const loading = ref(true);
const rate = ref(0.62);
try { rate.value = JSON.parse(localStorage.getItem('spkCfg') || '{}').rate || 0.62; } catch { /* 默认 */ }

const LB = { '0': 'lb-0', a1: 'lb-a1', a2: 'lb-a2', b1: 'lb-b1', b2: 'lb-b2' };
const LN = { '0': '零基础', a1: 'A1', a2: 'A2', b1: 'B1', b2: 'B2' };

async function load() {
  loading.value = true;
  list.value = await loadData(langS.file('dialogs'));
  loading.value = false;
}
onMounted(load);
watch(() => langS.lang, load);

const { playing, at, start, stop } = useLoopRead(() => (langS.isEn ? 'en-US' : 'de-DE'));
const cur = ref(-1);
function play(i) {
  if (playing.value && cur.value === i) return void (stop(), cur.value = -1);
  cur.value = i;
  start(list.value[i].turns.map((t) => t.de), rate.value);
}
const say = (t) => { stop(); cur.value = -1; speak(t, langS.isEn ? 'en-US' : 'de-DE', rate.value); };
// 「练这段」：把这段对话的句子塞进拼写页的队列（与旧站 spStartDialog 同意图）
function drill(i) {
  const d = list.value[i];
  try {
    localStorage.setItem('spDialog', JSON.stringify(d.turns.map((t) => ({ de: t.de, zh: t.zh, py: t.py }))));
    localStorage.setItem('lastStudy', JSON.stringify({ name: '对话 · ' + d.scene, t: Date.now() }));
  } catch { /* 隐私模式下就只是跳转 */ }
  router.push('/spell?from=dialog');
}
onBeforeUnmount(stop);
</script>

<template>
  <div class="page">
    <div class="hero-label">Dialoge</div>
    <h1 class="page-title">情景对话</h1>

    <div class="jump">
      <button class="level-tab" type="button" @click="router.push('/reading')">📖 短文</button>
      <button class="level-tab" type="button" @click="router.push({ path: '/reading', query: { topic: 'restaurant' } })">🍽️ 餐厅</button>
      <button class="level-tab" type="button" @click="router.push('/series')">🎬 连载</button>
      <button class="level-tab active" type="button">💬 对话</button>
    </div>
    <p class="page-sub">真实场景 · 一问一答 · 🔊 逐句朗读 · 每句带谐音</p>

    <p v-if="loading" class="page-sub">加载中…</p>
    <div v-for="(d, i) in list" :key="i" class="card dlg">
      <div class="dlg-head">
        <span class="dlg-scene">{{ d.icon }} {{ d.scene }}
          <span v-if="d.lv" class="level-badge" :class="LB[d.lv]">{{ LN[d.lv] || d.lv }}</span>
        </span>
        <button type="button" class="dlg-play" :class="{ on: playing && cur === i }" @click="play(i)">
          {{ playing && cur === i ? '⏹ 停止' : '▶ 播放全部' }}
        </button>
        <button v-if="!langS.isEn" type="button" class="dlg-drill" @click="drill(i)">⌨️ 练这段</button>
      </div>
      <div class="dlg-body">
        <div v-for="(t, k) in d.turns" :key="k" class="dlg-turn"
          :class="[t.s === 'B' ? 'b' : 'a', { on: playing && cur === i && at === k }]">
          <div class="dlg-bubble">
            <div class="dlg-de-row">
              <span class="dlg-de" lang="de">{{ t.de }}</span>
              <button type="button" class="dlg-spk" aria-label="朗读这句" @click="say(t.de)">🔊</button>
            </div>
            <div class="dlg-zh">{{ t.zh }}</div>
            <div class="dlg-py">{{ t.py }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.jump{display:flex;gap:8px;justify-content:center;margin:2px 0 10px;flex-wrap:wrap}
.dlg{margin-bottom:14px;cursor:default}
.dlg-head{display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap}
.dlg-scene{min-width:0;font-size:16px;font-weight:600;color:var(--text)}
.level-badge{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:8px;
  font-size:12px;font-weight:600;background:var(--surface-2);border:1px solid var(--border);
  color:var(--gold-text)}
.lb-0{color:var(--lv0)}.lb-a1{color:var(--lva1)}.lb-a2{color:var(--lva2)}
.lb-b1{color:var(--lvb1)}.lb-b2{color:var(--lvb2)}
.dlg-play{position:relative;margin-left:auto;min-height:44px;border:1px solid var(--gold-dim);
  color:var(--gold-text);background:transparent;border-radius:999px;padding:4px 12px;
  font-size:12px;cursor:pointer;font-family:inherit;white-space:nowrap}
.dlg-play.on{background:#c9252b;border-color:#c9252b;color:#fff}
.dlg-drill{position:relative;min-height:44px;border:none;background:var(--gold);color:#14240a;
  border-radius:999px;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer;
  font-family:inherit;white-space:nowrap}
.dlg-body{display:flex;flex-direction:column;gap:8px}
.dlg-turn{display:flex}
.dlg-turn.b{justify-content:flex-end}
.dlg-bubble{max-width:86%;background:var(--bg);border:1px solid var(--border);
  border-radius:14px;padding:9px 12px}
.dlg-turn.b .dlg-bubble{background:var(--gold-faint);border-color:var(--gold-dim)}
.dlg-turn.on .dlg-bubble{outline:2px solid var(--gold);outline-offset:1px}
.dlg-de-row{display:flex;align-items:center;gap:6px}
.dlg-de{flex:1;min-width:0;font-size:15px;color:var(--text);font-style:italic}
.dlg-spk{position:relative;flex-shrink:0;width:26px;height:26px;border:none;border-radius:50%;
  background:transparent;color:var(--gold-text);font-size:14px;cursor:pointer;padding:0;
  display:inline-flex;align-items:center;justify-content:center;font-family:inherit}
.dlg-spk::after{content:"";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
  width:44px;height:44px}
.dlg-zh{font-size:13px;color:var(--text-dim);margin-top:2px}
/* 旧站这行用 --text-faint，压在浅绿气泡上只有 4.41:1，这里抬到 --text-dim */
.dlg-py{font-size:12px;color:var(--text-dim);margin-top:1px}
</style>
