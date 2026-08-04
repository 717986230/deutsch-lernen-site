<script setup>
// 一页只做一件事：注册。必填只有 2 个；昵称/邮箱/手机号收进「选填」区，
// 但隐私告知常驻在选填区外 —— 折叠起来的告知不成立为「同意」。
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';
import { useAccount } from '../store/account';
import AuthField from '../components/AuthField.vue';
import RecoveryDialog from '../components/RecoveryDialog.vue';

const router = useRouter();
const acct = useAccount();
const f = ref({ username: '', password: '', nickname: '', email: '' });
const more = ref(false);
const busy = ref(false);
const err = ref('');
const recovery = ref('');

async function submit() {
  if (busy.value) return;
  err.value = '';
  if (!f.value.username) { err.value = '请填写用户名'; return; }
  if ((f.value.password || '').length < 6) { err.value = '密码至少 6 位'; return; }
  busy.value = true;
  const r = await api.register(f.value);
  busy.value = false;
  if (!r.ok) { err.value = r.data.err || (r.offline ? '网络不可用，请稍后再试' : '注册失败'); return; }
  acct.setAuth(r.data.token, r.data.user);
  // 恢复码只返回这一次，必须先让用户确认保存，再放行
  if (r.data.recovery) { recovery.value = r.data.recovery; return; }
  router.replace('/');
}
</script>

<template>
  <div class="auth">
    <p class="auth-brand">德语学习手册</p>
    <h1 class="auth-h1">注册</h1>
    <p class="auth-sub">两项必填，30 秒就能开始学</p>

    <form class="auth-form" @submit.prevent="submit">
      <AuthField v-model="f.username" label="用户名" autocomplete="username"
        placeholder="登录时用它" hint="3–20 位，小写字母、数字或下划线" maxlength="20" />
      <AuthField v-model="f.password" label="密码" type="password" autocomplete="new-password"
        placeholder="至少 6 位" />

      <!-- 隐私告知：常驻可见，不随选填区折叠 -->
      <p class="auth-note">
        下面的<b>邮箱 / 手机号仅用于找回密码</b>：不推送、不提供给第三方；
        可以留空，之后也能随时在「我的」里增删，注销账号时永久删除。
      </p>

      <button type="button" class="auth-more" :class="{ open: more }"
        :aria-expanded="more ? 'true' : 'false'" @click="more = !more">
        <span>选填：昵称、邮箱、手机号</span>
        <span class="chev" aria-hidden="true">▾</span>
      </button>

      <div v-if="more">
        <AuthField v-model="f.nickname" label="昵称" optional
          placeholder="排行榜上显示，留空则用用户名" maxlength="16" />
        <AuthField v-model="f.email" label="邮箱" optional type="email"
          inputmode="email" autocomplete="email" placeholder="用于邮箱验证码找回" />
      </div>

      <p v-if="err" class="auth-err">{{ err }}</p>

      <div class="auth-actions">
        <button class="btn" type="submit" :disabled="busy">{{ busy ? '注册中…' : '注册' }}</button>
      </div>
    </form>

    <div class="auth-links">
      <button type="button" class="link muted" @click="router.replace('/login')">已有账号，去登录</button>
    </div>

    <RecoveryDialog v-if="recovery" :code="recovery" title="请保存恢复码"
      desc="没填邮箱也能靠它找回账号。" @done="router.replace('/')" />
  </div>
</template>
