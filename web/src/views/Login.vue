<script setup>
// 一页只做一件事：登录。注册在 /register，重置密码在 /reset。
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { API_BASE, api } from '../api';
import { useAccount } from '../store/account';
import AuthField from '../components/AuthField.vue';

const router = useRouter();
const route = useRoute();
const acct = useAccount();
const f = ref({ username: '', password: '' });
const busy = ref(false);
const err = ref('');

if (route.query.err === 'oauth') err.value = '第三方登录失败，请重试';
if (route.query.err === 'oauth_unavailable') err.value = '该第三方登录暂未配置，请使用用户名密码登录';

function oauth(provider) {
  window.location.assign(`${API_BASE}/api/oauth/${provider}/start`);
}

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
    <p class="auth-note" role="status"><b>登录说明（2026 年 8 月 8 日）</b><br>今天维护时误清理了登录会话，给你带来不便，我们诚恳道歉。学习数据没有受影响，但需要重新登录；你的本地学习记录仍在。</p>

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

    <div class="oauth-divider"><span>或使用第三方登录</span></div>
    <div class="oauth-actions">
      <button type="button" class="oauth-btn" @click="oauth('github')">🐙 GitHub 登录</button>
      <button type="button" class="oauth-btn" @click="oauth('google')">🌈 Google 登录</button>
    </div>
  </div>
</template>

<style scoped>
.oauth-divider{display:flex;align-items:center;gap:10px;margin:24px 0 12px;
  color:var(--text-3);font-size:12px}
.oauth-divider::before,.oauth-divider::after{content:"";height:1px;flex:1;background:var(--line)}
.oauth-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.oauth-btn{min-height:44px;padding:10px 8px;border:1px solid var(--line);border-radius:var(--radius);
  background:transparent;color:var(--text-2);font:600 14px/20px inherit;cursor:pointer}
.oauth-btn:active{transform:translateY(1px)}
@media (max-width:360px){.oauth-actions{grid-template-columns:1fr}}
</style>
