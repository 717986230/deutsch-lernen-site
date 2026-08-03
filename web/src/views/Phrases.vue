<script setup>
import { ref, computed, onMounted } from 'vue';
import { loadData } from '../api';
import { speak } from '../api/speak';
defineOptions({ name: 'Phrases' });            // keep-alive 靠 name 匹配

const cats = ref([]);
const level = ref('all');
const loading = ref(true);
const LEVELS = [['all','全部'],['0','入门'],['a1','A1'],['a2','A2'],['b1','B1'],['b2','B2']];
onMounted(async () => { cats.value = await loadData('categories'); loading.value = false; });
const shown = computed(() =>
  level.value === 'all' ? cats.value : cats.value.filter((c) => String(c.level) === level.value));
</script>
<template>
  <div class="wrap">
    <van-tabs v-model:active="level" sticky>
      <van-tab v-for="[v,t] in LEVELS" :key="v" :name="v" :title="t" />
    </van-tabs>
    <van-loading v-if="loading" class="ld">加载中…</van-loading>
    <van-collapse v-else v-model="openNames" accordion>
      <van-collapse-item v-for="c in shown" :key="c.name" :name="c.name"
        :title="`${c.icon} ${c.name}`" :value="`${c.phrases.length} 句`">
        <div v-for="(p,i) in c.phrases" :key="i" class="row" @click="speak(p.de)">
          <div class="de" lang="de">{{ p.de }}</div>
          <div class="zh">{{ p.zh }}</div>
          <div class="py">{{ p.py }}</div>
        </div>
      </van-collapse-item>
    </van-collapse>
  </div>
</template>
<script>export default { data: () => ({ openNames: '' }) };</script>
<style scoped>
.wrap{padding-bottom:70px}
.ld{padding:40px;text-align:center}
.row{padding:10px 0;border-bottom:1px solid var(--border)}
.de{font-size:16px;font-weight:600}
.zh{font-size:13px;color:var(--text-dim);margin-top:2px}
.py{font-size:12px;color:var(--text-faint);margin-top:1px}
</style>
