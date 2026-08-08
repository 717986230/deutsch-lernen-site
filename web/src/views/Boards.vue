<script setup>
import { ref, computed, onMounted } from 'vue';
import { loadData } from '../api';
import { speak } from '../api/speak';
import { studyTick } from '../api/study';
import { useAccount } from '../store/account';
defineOptions({ name: 'Boards' });
const acct = useAccount();
const boards = ref([]); const cur = ref(null); const picked = ref(null);
onMounted(async () => { boards.value = await loadData('boards'); cur.value = boards.value[0] || null; });
function pick(it) {
  picked.value = it;
  speak(it[0]);
  studyTick(1, false);        // 点图学词也算学习动作
  acct.syncSoon();
}
</script>
<template>
  <div class="page">
    <h1 class="page-title">图解词典</h1>
    <p class="page-sub">点图听发音</p>

    <div class="tabs">
      <button v-for="b in boards" :key="b.id" class="tb" :class="{ on: cur && cur.id === b.id }"
        @click="cur = b; picked = null">{{ b.icon }} {{ b.name }}</button>
    </div>

    <!-- 选中的词单独放大展示，不挤在网格里 -->
    <div v-if="picked" class="out">
      <div class="o-em">{{ picked[3] }}</div>
      <div class="o-de" lang="de">{{ picked[0] }}</div>
      <div class="o-zh">{{ picked[1] }}</div>
      <div class="o-py">{{ picked[2] }}</div>
      <button class="btn btn-plain o-spk" @click="speak(picked[0])">🔊 再听一遍</button>
    </div>

    <div v-if="cur" class="grid">
      <button v-for="(it, i) in cur.items" :key="i" class="cd"
        :class="{ on: picked === it }" @click="pick(it)">
        <span class="e">{{ it[3] }}</span>
        <span class="z">{{ it[1] }}</span>
      </button>
    </div>
  </div>
</template>
<style scoped>
.tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin:0 0 16px;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tb{flex:0 0 auto;min-height:44px;padding:9px 14px;border:1px solid var(--line);background:transparent;
  color:var(--text-2);border-radius:22px;font-size:14px;font-family:inherit;cursor:pointer;white-space:nowrap}
.tb.on{background:var(--brand);color:#14240a;border-color:var(--brand);font-weight:600}
.out{text-align:center;padding:18px 0 22px;border-bottom:1px solid var(--line);margin-bottom:18px}
.o-em{font-size:56px;line-height:1}
.o-de{font-size:24px;font-weight:700;margin-top:10px}
.o-zh{font-size:16px;color:var(--text-2);margin-top:4px}
.o-py{font-size:14px;color:var(--text-3);margin-top:3px}
.o-spk{width:auto;padding:10px 18px;margin:14px auto 0;font-size:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:8px}
.cd{min-height:84px;border:1px solid var(--line);border-radius:14px;background:transparent;
  padding:10px 4px;display:flex;flex-direction:column;align-items:center;gap:5px;
  font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.cd.on{border-color:var(--brand);background:var(--tip-bg)}
.e{font-size:28px;line-height:1}
.z{font-size:13px;color:var(--text-2)}
</style>
