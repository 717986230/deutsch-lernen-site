<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getKey, setKey } from './api';
const route = useRoute(); const router = useRouter();
const key = ref(''); const needKey = ref(false);
onMounted(() => { needKey.value = !getKey(); });
function save() { setKey(key.value.trim()); needKey.value = false; location.reload(); }
</script>
<template>
  <el-container style="height:100vh">
    <el-aside width="200px">
      <div class="logo">uuoo 后台</div>
      <el-menu :default-active="route.path" router>
        <el-menu-item index="/dashboard">数据概览</el-menu-item>
        <el-menu-item index="/events">事件明细</el-menu-item>
      </el-menu>
    </el-aside>
    <el-main><router-view /></el-main>
  </el-container>

  <el-dialog v-model="needKey" title="请输入 STATS_KEY" width="420px" :close-on-click-modal="false">
    <el-alert type="info" :closable="false" show-icon
      title="用 wrangler secret put STATS_KEY 设置的那串。只存在本标签页会话中，关闭即失效。" />
    <el-input v-model="key" type="password" show-password placeholder="STATS_KEY" style="margin-top:12px" />
    <template #footer><el-button type="primary" @click="save">进入</el-button></template>
  </el-dialog>
</template>
<style>
.logo{height:56px;line-height:56px;text-align:center;font-weight:700;font-size:16px}
body{margin:0}
</style>
