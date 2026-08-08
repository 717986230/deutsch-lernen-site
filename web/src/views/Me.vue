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
  <div class="page" v-if="acct.user">
    <div class="grp">
      <div class="hd">
        <span class="av" :style="{background: acct.user.av_bg || 'var(--brand)'}">{{ acct.user.avatar || '🦊' }}</span>
        <span class="who"><span class="nk">{{ acct.user.nickname || acct.user.username }}</span>
          <span class="un">@{{ acct.user.username }}</span></span>
      </div>
      <div class="row"><span class="k">掌握词数</span><span class="v">{{ acct.user.known || 0 }}</span></div>
      <div class="row"><span class="k">连续打卡</span><span class="v">{{ (acct.user.streak || 0) + ' 天' }}</span></div>
      <div class="row"><span class="k">排名</span><span class="v">{{ '第 ' + acct.rank + ' 名' }}</span></div>
      <div class="row"><span class="k">今日已学</span><span class="v">{{ (study.n || 0) + ' / ' + (study.goal || 20) }}</span></div>
      <div class="row"><span class="k">累计学习</span><span class="v">{{ stat.total + ' 次' }}</span></div>
    </div>

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

    <div class="grp">
      <!-- 服务端只回掩码，明文不出服务端；留空即删除 -->
      <label class="fld"><span class="k">邮箱</span><input v-model="ct.email" :placeholder="acct.user.hasEmail ? `当前 ${acct.user.email}（留空则删除）` : '未填写'"></label>
    </div>
    <div class="pad"><button class="btn" @click="saveContact">保存联系方式</button></div>

    <div class="grp">
      <label class="fld"><span class="k">当前密码</span><input v-model="pw" type="password" placeholder="重新生成需验证密码"></label>
    </div>
    <div class="pad">
      <button class="btn btn-plain" @click="regen">重新生成恢复码</button>
      <button class="btn btn-plain danger" @click="out">退出登录</button>
    </div>
  </div>
</template>
<style scoped>
.grp{border-top:1px solid var(--line);padding:4px 0;margin-bottom:6px}
.grp:first-of-type{border-top:none}
.row{display:flex;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)}
.row:last-child{border-bottom:none}
.k{color:var(--text-2);font-size:15px}
.v{margin-left:auto;color:var(--text);font-size:15px;font-variant-numeric:tabular-nums}
.hd{display:flex;align-items:center;gap:12px;padding:14px 0 16px}
.who{display:flex;flex-direction:column}
.nk{font-size:18px;font-weight:700}
.un{font-size:13px;color:var(--text-3);margin-top:2px}
.fld{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--line)}
.fld .k{flex:0 0 88px}
.fld input{flex:1;min-height:44px;border:none;background:transparent;color:var(--text);
  font-size:15px;font-family:inherit;outline:none}
.fld input::placeholder{color:var(--text-3)}
.danger{color:#c92a2e;border-color:#c92a2e}
:root[data-theme=dark] .danger{color:#ff9a9d;border-color:#ff9a9d}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]) .danger{color:#ff9a9d;border-color:#ff9a9d}}
.social{margin:14px 0 4px}
.bg{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px;margin:6px 0 18px}
.bd{border:1px solid var(--line);border-radius:12px;padding:10px 6px;text-align:center;opacity:.4}
.bd.on{opacity:1;border-color:var(--brand)}
.be{font-size:26px;line-height:1}
.bn{font-size:12px;font-weight:600;margin-top:5px}
.bp{font-size:12px;color:var(--text-3);margin-top:2px}
.bd.on .bp{color:var(--brand-text)}
.pad{padding:12px 16px}
.av{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:22px;margin-right:10px}
</style>
