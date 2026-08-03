<script setup>
import { ref, onMounted } from 'vue';
import { stats } from '../api';
const rows = ref([]); const err = ref('');
onMounted(async () => {
  const r = await stats(30);
  if (r.ok) rows.value = r.data.byEvent || []; else err.value = r.err;
});
</script>
<template>
  <div>
    <el-page-header content="事件明细（近 30 天）" :icon="null" />
    <el-alert v-if="err" :title="err" type="error" show-icon style="margin-top:16px" />
    <el-table v-else :data="rows" stripe style="margin-top:16px">
      <el-table-column prop="name" label="事件名" />
      <el-table-column prop="c" label="次数" width="140" sortable />
    </el-table>
    <el-alert type="info" :closable="false" show-icon style="margin-top:16px"
      title="当前 /stats 接口只返回聚合数据。需要按用户/时间下钻时，要先在 worker.js 加对应接口——注意不要把个人信息暴露给后台。" />
  </div>
</template>
