<script setup>
// 一页只做一件事：重置密码。两条找回通道（邮箱验证码 / 恢复码）二选一，
// 用一个二选一开关切换，同时只出现一条通道对应的输入框。
import { ref, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';
import { useAccount } from '../store/account';
import AuthField from '../components/AuthField.vue';
import RecoveryDialog from '../components/RecoveryDialog.vue';

const router = useRouter();
const acct = useAccount();
const way = ref('email');                 // 'email' | 'code'
const g = ref({ username: '', code: '', emailCode: '', new: '' });
const busy = ref(false);
const err = ref('');
const sent = ref('');
const cd = ref(0);
const recovery = ref('');
let timer = 0;
onUnmounted(() => { if (timer) clearInterval(timer); });

const sendLabel = computed(() => (cd.value > 0 ? cd.value + 's' : '发送'));

async function sendCode() {
  err.value = ''; sent.value = '';
  if (!g.value.username) { err.value = '请先填写用户名'; return; }
  if (cd.value > 0) return;
  const r = await api.emailCode({ username: g.value.username });
  if (!r.ok) { err.value = r.data.err || (r.offline ? '网络不可用，请稍后再试' : '发送失败'); return; }
  sent.value = r.data.msg || '验证码已发到账号绑定的邮箱';
  cd.value = 60;
  timer = setInterval(() => { if (--cd.value <= 0) { clearInterval(timer); timer = 0; } }, 1000);
}

async function submit() {
  if (busy.value) return;
  err.value = '';
  if (!g.value.username) { err.value = '请填写用户名'; return; }
  if (way.value === 'email' && !g.value.emailCode) { err.value = '请填写邮箱验证码'; return; }
  if (way.value === 'code' && !g.value.code) { err.value = '请填写恢复码'; return; }
  if ((g.value.new || '').length < 6) { err.value = '新密码至少 6 位'; return; }
  busy.value = true;
  const r = await api.reset({
    username: g.value.username,
    code: way.value === 'code' ? g.value.code : '',
    emailCode: way.value === 'email' ? g.value.emailCode : '',
    new: g.value.new,
  });
  busy.value = false;
  if (!r.ok) { err.value = r.data.err || (r.offline ? '网络不可用，请稍后再试' : '重置失败，请核对验证码'); return; }
  acct.setAuth(r.data.token, { username: g.value.username });
  if (r.data.recovery) { recovery.value = r.data.recovery; return; }
  router.replace('/');
}
</script>

<template>
  <div class="auth">
    <p class="auth-brand">德语学习手册</p>
    <h1 class="auth-h1">重置密码</h1>
    <p class="auth-sub">用邮箱验证码或注册时保存的恢复码，设一个新密码</p>

    <form class="auth-form" @submit.prevent="submit">
      <AuthField v-model="g.username" label="用户名" autocomplete="username" placeholder="要重置的账号" />

      <div class="ways" role="group" aria-label="找回方式">
        <button type="button" class="way" :class="{ on: way === 'email' }"
          @click="way = 'email'; err = ''">邮箱验证码</button>
        <button type="button" class="way" :class="{ on: way === 'code' }"
          @click="way = 'code'; err = ''">恢复码</button>
      </div>

      <AuthField v-if="way === 'email'" v-model="g.emailCode" label="邮箱验证码"
        inputmode="numeric" maxlength="6" placeholder="6 位数字" :hint="sent">
        <template #suffix>
          <button type="button" class="send" :disabled="cd > 0" @click="sendCode">{{ sendLabel }}</button>
        </template>
      </AuthField>
      <AuthField v-else v-model="g.code" label="恢复码"
        placeholder="UUOO-XXXX-XXXX-XXXX" hint="注册时让你截图保存的那一串" />

      <AuthField v-model="g.new" label="新密码" type="password"
        autocomplete="new-password" placeholder="至少 6 位" />

      <p v-if="err" class="auth-err">{{ err }}</p>

      <div class="auth-actions">
        <button class="btn" type="submit" :disabled="busy">{{ busy ? '提交中…' : '重置密码' }}</button>
      </div>
    </form>

    <div class="auth-links">
      <button type="button" class="link muted" @click="router.replace('/login')">返回登录</button>
    </div>

    <RecoveryDialog v-if="recovery" :code="recovery" title="新的恢复码"
      desc="旧的已作废。" @done="router.replace('/')" />
  </div>
</template>

<style scoped>
/* 二选一开关：不是 tab，只是一个选项；用细线和字重区分，不铺色块 */
.ways{display:flex;gap:8px;margin-top:26px}
.way{flex:1;min-height:44px;padding:11px 8px;border:1px solid var(--line);border-radius:10px;
  background:transparent;color:var(--text-2);font-family:inherit;font-size:14px;
  cursor:pointer;-webkit-tap-highlight-color:transparent}
.way.on{border-color:var(--brand-text);color:var(--brand-text);font-weight:600}
.send{flex:none;min-height:44px;min-width:56px;padding:12px 8px;background:none;border:none;
  font-family:inherit;font-size:14px;line-height:20px;color:var(--brand-text);
  cursor:pointer;-webkit-tap-highlight-color:transparent}
.send:disabled{color:var(--text-3);cursor:default}
</style>
