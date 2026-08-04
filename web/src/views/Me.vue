<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { showToast, showDialog } from 'vant';
import { api } from '../api';
import { useAccount } from '../store/account';
const acct = useAccount(); const router = useRouter();
const ct = ref({ email: '' }); const pw = ref('');
onMounted(() => { if (!acct.logged) router.replace('/login'); else acct.fetchMe(); });
async function saveContact() {
  const r = await api.profileUpdate(ct.value);
  if (r.ok) { showToast('已保存'); acct.fetchMe(); } else showToast(r.data.err || '保存失败');
}
async function regen() {
  const r = await api.newRecovery({ password: pw.value });
  pw.value = '';
  if (!r.ok) return showToast(r.data.err || '生成失败');
  showDialog({ title: '新的恢复码', message: `${r.data.recovery}\n\n旧的已作废，请重新保存。`,
    confirmButtonText: '我已保存' });
}
function out() { acct.signOut(); router.replace('/login'); }
</script>
<template>
  <div class="wrap" v-if="acct.user">
    <van-cell-group inset>
      <van-cell :title="acct.user.nickname || acct.user.username" :label="'@' + acct.user.username">
        <template #icon>
          <span class="av" :style="{background: acct.user.av_bg || '#58cc02'}">{{ acct.user.avatar || '🦊' }}</span>
        </template>
      </van-cell>
      <van-cell title="掌握词数" :value="acct.user.known || 0" />
      <van-cell title="连续打卡" :value="(acct.user.streak || 0) + ' 天'" />
      <van-cell title="排名" :value="'第 ' + acct.rank + ' 名'" />
    </van-cell-group>

    <van-cell-group inset title="联系方式（用于找回密码）" style="margin-top:12px">
      <!-- 服务端只回掩码，明文不出服务端；留空即删除 -->
      <van-field v-model="ct.email" label="邮箱"
        :placeholder="acct.user.hasEmail ? `当前 ${acct.user.email}（留空则删除）` : '未填写'" />
    </van-cell-group>
    <div class="pad"><van-button block @click="saveContact">保存联系方式</van-button></div>

    <van-cell-group inset title="恢复码">
      <van-field v-model="pw" type="password" label="当前密码" placeholder="重新生成需验证密码" />
    </van-cell-group>
    <div class="pad">
      <van-button block plain @click="regen">重新生成恢复码</van-button>
      <van-button block type="danger" plain style="margin-top:8px" @click="out">退出登录</van-button>
    </div>
  </div>
</template>
<style scoped>
.wrap{padding-bottom:70px}.pad{padding:12px 16px}
.av{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:22px;margin-right:10px}
</style>
