<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { showToast, showDialog } from 'vant';
import { api } from '../api';
import { useAccount } from '../store/account';
const router = useRouter(); const acct = useAccount();
const tab = ref(0);
const f = ref({ username: '', password: '', nickname: '', email: '', phone: '' });
const g = ref({ username: '', code: '', emailCode: '', new: '' });
const busy = ref(false); const err = ref(''); const forgot = ref(false); const cd = ref(0);

async function submit() {
  err.value = ''; busy.value = true;
  const isReg = tab.value === 1;
  const r = isReg ? await api.register(f.value) : await api.login(f.value);
  busy.value = false;
  if (!r.ok) { err.value = r.data.err || (r.offline ? '网络不可用' : '操作失败'); return; }
  acct.setAuth(r.data.token, r.data.user);
  // 恢复码只在注册时返回一次，必须让用户看到并保存
  if (r.data.recovery) await showDialog({ title: '请保存恢复码', message:
    `${r.data.recovery}\n\n忘记密码时用它重置。只显示这一次，请截图或抄下来。`, confirmButtonText: '我已保存' });
  router.replace('/me');
}
async function sendCode() {
  if (!g.value.username) { err.value = '请先填写用户名'; return; }
  const r = await api.emailCode({ username: g.value.username });
  if (r.ok) { showToast(r.data.msg || '已发送'); cd.value = 60;
    const t = setInterval(() => { if (--cd.value <= 0) clearInterval(t); }, 1000); }
  else err.value = r.data.err || '发送失败';
}
async function doReset() {
  err.value = '';
  if (!g.value.username) { err.value = '请填写用户名'; return; }
  if (!g.value.code && !g.value.emailCode) { err.value = '请填写恢复码或邮箱验证码'; return; }
  const r = await api.reset(g.value);
  if (!r.ok) { err.value = r.data.err || '重置失败'; return; }
  acct.setAuth(r.data.token, { username: g.value.username });
  if (r.data.recovery) await showDialog({ title: '新的恢复码', message:
    `${r.data.recovery}\n\n旧的已作废，请重新保存。`, confirmButtonText: '我已保存' });
  router.replace('/me');
}
</script>
<template>
  <div class="wrap">
    <van-tabs v-model:active="tab"><van-tab title="登录" /><van-tab title="注册" /></van-tabs>
    <van-cell-group inset style="margin-top:12px">
      <van-field v-model="f.username" label="用户名" placeholder="3-20 位小写字母/数字/下划线" />
      <van-field v-model="f.password" type="password" label="密码" placeholder="至少 6 位" />
      <template v-if="tab === 1">
        <van-field v-model="f.nickname" label="昵称" placeholder="不填则用用户名" />
        <van-field v-model="f.email" label="邮箱" placeholder="选填，用于找回密码" />
        <van-field v-model="f.phone" label="手机号" placeholder="选填，用于找回密码" />
      </template>
    </van-cell-group>
    <p v-if="tab === 1" class="tip">邮箱/手机号<b>仅</b>用于找回密码，不推送、不提供给第三方；可留空，也可随时在「我的」里增删，注销时一并永久删除。</p>
    <div v-if="err" class="err">{{ err }}</div>
    <div class="pad">
      <van-button type="primary" block :loading="busy" @click="submit">{{ tab ? '注册' : '登录' }}</van-button>
      <van-button v-if="!tab" type="default" block plain style="margin-top:8px"
        @click="forgot = !forgot">忘记密码？用恢复码或邮箱重置</van-button>
    </div>
    <van-cell-group v-if="forgot" inset title="重置密码">
      <van-field v-model="g.username" label="用户名" />
      <van-field v-model="g.emailCode" label="邮箱验证码" placeholder="6 位">
        <template #button>
          <van-button size="small" :disabled="cd > 0" @click="sendCode">
            {{ cd > 0 ? cd + 's' : '发送' }}</van-button>
        </template>
      </van-field>
      <van-field v-model="g.code" label="恢复码" placeholder="UUOO-XXXX-XXXX-XXXX（与验证码二选一）" />
      <van-field v-model="g.new" type="password" label="新密码" placeholder="至少 6 位" />
    </van-cell-group>
    <div v-if="forgot" class="pad"><van-button type="warning" block @click="doReset">重置密码</van-button></div>
  </div>
</template>
<style scoped>
.wrap{padding-bottom:70px}.pad{padding:12px 16px}
.tip{font-size:11px;color:var(--text-faint);line-height:1.6;padding:6px 20px 0;margin:0}
.err{color:#ee0a24;font-size:13px;padding:8px 20px 0}
</style>
