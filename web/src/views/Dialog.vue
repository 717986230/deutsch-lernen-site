<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { loadData } from '../api';
import { speak, canSpeak } from '../api/speak';
import { useLang } from '../store/lang';
defineOptions({ name: 'Dialog' });

const langS = useLang();
const list = ref([]); const cur = ref(null); const playing = ref(false); const at = ref(-1);
const LV = { '0':'入门', a1:'A1', a2:'A2', b1:'B1', b2:'B2' };
let timer = null;
async function load() { stop(); cur.value = null; list.value = await loadData(langS.file('dialogs')); }
onMounted(load);
watch(() => langS.lang, load);   // 切语言重载数据，并退回列表避免停在另一语言的详情页
onUnmounted(stop);

const grouped = computed(() => {
  const g = {};
  for (const d of list.value) (g[LV[String(d.lv)] || d.lv] ||= []).push(d);
  return Object.entries(g);
});

function stop() { playing.value = false; at.value = -1; if (timer) { clearTimeout(timer); timer = null; } }
// 逐句连播：按句长估时，说完再排下一句。没有 speechSynthesis 时直接退化为不可播。
function playAll() {
  if (!cur.value || !canSpeak) return;
  stop(); playing.value = true;
  const turns = cur.value.turns;
  const step = (i) => {
    if (!playing.value || i >= turns.length) { stop(); return; }
    at.value = i; speak(turns[i].de, langS.isEn ? 'en-US' : 'de-DE');
    timer = setTimeout(() => step(i + 1), 900 + turns[i].de.length * 75);
  };
  step(0);
}
function open(d) { stop(); cur.value = d; }
function back() { stop(); cur.value = null; }
</script>

<template>
  <div class="page">
    <template v-if="!cur">
      <h1 class="page-title">情景对话</h1>
      <p class="page-sub">按场景分组 · 点句子听发音</p>
      <template v-for="[lv, arr] in grouped" :key="lv">
        <div class="group">{{ lv }}</div>
        <div v-for="d in arr" :key="d.scene" class="item dl" @click="open(d)">
          <span class="ic">{{ d.icon }}</span>
          <span class="nm">
            <span class="sc">{{ d.scene }}</span>
            <span class="de" lang="de">{{ d.de }}</span>
          </span>
          <span class="ct">{{ d.turns.length }} 轮</span>
        </div>
      </template>
    </template>

    <template v-else>
      <div class="bar">
        <button class="back tap" @click="back">‹ 返回</button>
        <span class="bt">{{ cur.icon }} {{ cur.scene }}</span>
      </div>
      <button v-if="canSpeak" class="btn btn-plain play" @click="playing ? stop() : playAll()">
        {{ playing ? '■ 停止播放' : '▶ 连续播放' }}</button>
      <!-- A/B 两方左右分栏，一眼能看出谁在说 -->
      <div v-for="(t, i) in cur.turns" :key="i" class="turn" :class="[t.s === 'A' ? 'a' : 'b', { on: at === i }]"
        @click="speak(t.de, langS.isEn ? 'en-US' : 'de-DE')">
        <div class="who">{{ t.s }}</div>
        <div class="bub">
          <div class="t-de" lang="de">{{ t.de }}</div>
          <div class="t-zh">{{ t.zh }}</div>
          <div class="t-py">{{ t.py }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dl{display:flex;align-items:center;gap:12px}
.ic{font-size:22px}
.nm{flex:1;display:flex;flex-direction:column}
.sc{font-size:16px;font-weight:500}
.de{font-size:12px;color:var(--text-3);margin-top:2px}
.ct{color:var(--text-3);font-size:13px;white-space:nowrap}
.bar{display:flex;align-items:center;gap:10px;padding:12px 0 4px;position:sticky;top:0;background:var(--bg);z-index:2}
.back{background:none;border:none;color:var(--brand-text);font-size:15px;font-family:inherit;cursor:pointer;padding:4px 0}
.bt{font-weight:600}
.play{margin:8px 0 18px}
.turn{display:flex;gap:8px;margin-bottom:14px;cursor:pointer;-webkit-tap-highlight-color:transparent}
.turn.b{flex-direction:row-reverse}
.who{width:26px;height:26px;flex:none;border-radius:50%;background:var(--line);
  /* 说话人字母压在浅灰底上，用 --text-2 只有 4.39:1，差一点点，这里用正文色 */
  display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--text);margin-top:4px}
.turn.b .who{background:var(--brand);color:#14240a}
.bub{flex:1;padding:11px 13px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}
.turn.b .bub{border-color:var(--brand)}
.turn.on .bub{background:var(--tip-bg);border-color:var(--brand)}
.t-de{font-size:16px;font-weight:600;line-height:1.5}
.t-zh{font-size:14px;color:var(--text-2);margin-top:3px}
.t-py{font-size:13px;color:var(--text-3);margin-top:2px}
</style>
