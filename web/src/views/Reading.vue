<script setup>
import { ref, computed, onMounted } from 'vue';
import { loadData } from '../api';
import { speak } from '../api/speak';
defineOptions({ name: 'Reading' });
const list = ref([]); const loading = ref(true);
const level = ref('all'); const cur = ref(null);
const LEVELS = [['all','全部'],['0','入门'],['a1','A1'],['a2','A2'],['b1','B1'],['b2','B2']];
onMounted(async () => { list.value = await loadData('readings'); loading.value = false; });
// 餐厅专题不进分级列表（与旧站规则一致）
const shown = computed(() => list.value.filter(
  (r) => r.topic !== 'restaurant' && (level.value === 'all' || String(r.level) === level.value)));
</script>
<template>
  <div class="wrap">
    <template v-if="!cur">
      <van-tabs v-model:active="level" sticky>
        <van-tab v-for="[v,t] in LEVELS" :key="v" :name="v" :title="t" />
      </van-tabs>
      <van-loading v-if="loading" class="ld">加载中…</van-loading>
      <van-cell v-for="(r,i) in shown" :key="i" :title="r.title" :label="r.zh"
        is-link @click="cur = r" />
    </template>
    <template v-else>
      <van-nav-bar :title="cur.title" left-text="返回" left-arrow @click-left="cur = null" />
      <div class="art">
        <!-- readings 是三元素 [de,zh,py]，series 是两元素 —— p[2] 存在与否决定是否显示谐音 -->
        <div v-for="(p,i) in cur.paras" :key="i" class="para" @click="speak(p[0])">
          <div class="de" lang="de">{{ p[0] }}</div>
          <div class="zh">{{ p[1] }}</div>
          <div v-if="p[2]" class="py">{{ p[2] }}</div>
        </div>
      </div>
    </template>
  </div>
</template>
<style scoped>
.wrap{padding-bottom:70px}
.ld{padding:40px;text-align:center}
.art{padding:12px 16px}
.para{padding:10px 0;border-bottom:1px solid var(--border)}
.de{font-size:16px;line-height:1.6}
.zh{font-size:13px;color:var(--text-dim);margin-top:3px}
.py{font-size:12px;color:var(--text-faint);margin-top:2px}
</style>
