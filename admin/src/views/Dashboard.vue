<script setup>
import { ref, onMounted, watch } from 'vue';
import { stats } from '../api';
const days = ref(7); const d = ref(null); const err = ref(''); const loading = ref(false);
async function load() {
  loading.value = true; err.value = '';
  const r = await stats(days.value);
  loading.value = false;
  if (r.ok) d.value = r.data; else err.value = r.err;
}
onMounted(load); watch(days, load);
</script>
<template>
  <div>
    <el-page-header content="数据概览" :icon="null" />
    <el-radio-group v-model="days" style="margin:16px 0">
      <el-radio-button :value="7">7 天</el-radio-button>
      <el-radio-button :value="30">30 天</el-radio-button>
      <el-radio-button :value="90">90 天</el-radio-button>
    </el-radio-group>
    <el-alert v-if="err" :title="err" type="error" show-icon />
    <el-skeleton v-else-if="loading" :rows="4" animated />
    <template v-else-if="d">
      <el-row :gutter="16">
        <el-col :span="6"><el-card><div class="lab">浏览量 PV</div><div class="num">{{ d.pv }}</div></el-card></el-col>
        <el-col :span="6"><el-card><div class="lab">访客数 UV</div><div class="num">{{ d.uv }}</div></el-card></el-col>
        <el-col :span="6"><el-card><div class="lab">注册用户</div><div class="num">{{ d.users }}</div></el-card></el-col>
        <el-col :span="6"><el-card><div class="lab">人均浏览</div>
          <div class="num">{{ d.uv ? (d.pv / d.uv).toFixed(1) : '—' }}</div></el-card></el-col>
      </el-row>
      <el-row :gutter="16" style="margin-top:16px">
        <el-col :span="12"><el-card header="事件排行">
          <el-table :data="d.byEvent" size="small" max-height="360">
            <el-table-column prop="name" label="事件" /><el-table-column prop="c" label="次数" width="100" />
          </el-table></el-card></el-col>
        <el-col :span="12"><el-card header="版块访问">
          <el-table :data="d.byView" size="small" max-height="360">
            <el-table-column prop="props" label="版块" /><el-table-column prop="c" label="次数" width="100" />
          </el-table></el-card></el-col>
      </el-row>
    </template>
  </div>
</template>
<style scoped>.lab{color:#909399;font-size:13px}.num{font-size:26px;font-weight:700;margin-top:6px}</style>
