<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { showToast, showDialog } from 'vant';
import { api } from '../api';
import { useAccount } from '../store/account';
import { BADGES, getStudy } from '../api/study';
import { computed } from 'vue';
const acct = useAccount(); const router = useRouter();
const ct = ref({ email: '' }); const pw = ref('');
const study = ref(getStudy());
// 徽章以服务端判定为准；服务端没回时按本地数据兜底显示进度
const earned = computed(() => (acct.user?.badges || '').split(',').filter(Boolean));
const stat = computed(() => ({ known: acct.user?.known || 0, best: acct.user?.best_streak || study.value.best || 0,
  total: acct.user?.total || study.value.total || 0, quiz: acct.user?.quiz || study.value.quiz || 0 }));
const lit = (b) => earned.value.includes(b.id) || (b.m && stat.value[b.m] >= b.n);
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
      <van-cell title="今日已学" :value="(study.n || 0) + ' / ' + (study.goal || 20)" />
      <van-cell title="累计学习" :value="stat.total + ' 次'" />
    </van-cell-group>

    <div class="segs social">
      <button class="seg" @click="$router.push('/feed')">动态</button>
      <button class="seg" @click="$router.push('/following')">我的关注</button>
    </div>

    <div class="group">徽章 {{ BADGES.filter(lit).length }} / {{ BADGES.length }}</div>
    <div class="bg">
      <div v-for="b in BADGES" :key="b.id" class="bd" :class="{ on: lit(b) }">
        <div class="be">{{ b.emo }}</div>
        <div class="bn">{{ b.name }}</div>
        <div class="bp">{{ lit(b) ? '已点亮' : (b.m ? stat[b.m] + '/' + b.n : b.desc) }}</div>
      </div>
    </div>

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
.social{margin:14px 0 4px}
.bg{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px;margin:6px 0 18px}
.bd{border:1px solid var(--line);border-radius:12px;padding:10px 6px;text-align:center;opacity:.4}
.bd.on{opacity:1;border-color:var(--brand)}
.be{font-size:26px;line-height:1}
.bn{font-size:12px;font-weight:600;margin-top:5px}
.bp{font-size:12px;color:var(--text-3);margin-top:2px}
.bd.on .bp{color:var(--brand-text)}
.wrap{padding-bottom:70px}.pad{padding:12px 16px}
.av{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:22px;margin-right:10px}
</style>
