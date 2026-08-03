<script setup>
// 一页只做一件事：登录。注册在 /register，重置密码在 /reset。
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';
import { useAccount } from '../store/account';
import AuthField from '../components/AuthField.vue';

const router = useRouter();
const acct = useAccount();
const f = ref({ username: '', password: '' });
const busy = ref(false);
const err = ref('');

async function submit() {
  if (busy.value) return;
  err.value = '';
  if (!f.value.username || !f.value.password) { err.value = '请填写用户名和密码'; return; }
  busy.value = true;
  const r = await api.login(f.value);
  busy.value = false;
  if (!r.ok) { err.value = r.data.err || (r.offline ? '网络不可用，请稍后再试' : '用户名或密码不正确'); return; }
  acct.setAuth(r.data.token, r.data.user);
  router.replace('/');
}
</script>

<template>
  <div class="auth">
    <p class="auth-brand">德语学习手册</p>
    <h1 class="auth-h1">登录</h1>
    <p class="auth-sub">继续你的学习进度</p>

    <form class="auth-form" @submit.prevent="submit">
      <AuthField v-model="f.username" label="用户名" autocomplete="username"
        placeholder="小写字母、数字或下划线" />
      <AuthField v-model="f.password" label="密码" type="password" autocomplete="current-password"
        placeholder="至少 6 位" />

      <p v-if="err" class="auth-err">{{ err }}</p>

      <div class="auth-actions">
        <button class="btn" type="submit" :disabled="busy">{{ busy ? '登录中…' : '登录' }}</button>
      </div>
    </form>

    <div class="auth-links">
      <button type="button" class="link" @click="router.push('/register')">注册新账号</button>
      <span class="link-sep" aria-hidden="true">·</span>
      <button type="button" class="link muted" @click="router.push('/reset')">忘记密码</button>
    </div>
  </div>
</template>
