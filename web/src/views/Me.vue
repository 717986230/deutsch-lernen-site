<script setup>
// 「我的」——**照旧站 _renderProfileCard 重做**：
//   头像 + 昵称 + @用户名·登录方式·全站排名 → 个性签名 → 关注/粉丝
//   → 四格统计（掌握词/连续打卡/最长打卡/累计学习）→ 🏅 徽章墙 → 编辑资料 / 账号设置 / 退出
// 之前那版是我自己设计的「键值行 + 折叠设置」，与旧站完全不同，这里整体覆盖掉。
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { showToast, showDialog } from 'vant';
import { api } from '../api';
import { useAccount } from '../store/account';
import { BADGES, getStudy } from '../api/study';
import { getKnown } from '../api/practice';

const acct = useAccount(); const router = useRouter();
const study = ref(getStudy());
const mode = ref('view');              // view | edit | settings

// 与旧站 AV_EMOJI / AV_BG 完全一致——头像只能从预设里选，不接受上传（AGENTS.md 1.3）
const AV_EMOJI = ['🦊', '🐼', '🐨', '🐯', '🦁', '🐶', '🐱', '🐰', '🐻', '🐸', '🐵', '🦉', '🐧', '🐢', '🦄', '🐲', '🌷', '🌟', '🍀', '🔥', '🚀', '⚽', '🎨', '🎧', '📚', '☕', '🥨', '🗼'];
const AV_BG = ['#58cc02', '#1cb0f6', '#ff9600', '#ff4b4b', '#ce82ff', '#2b70c9', '#ff86d0', '#00c2a8', '#f5b800', '#7a869a'];

const ed = ref({ nickname: '', sig: '', avatar: AV_EMOJI[0], av_bg: AV_BG[0] });
const ct = ref({ email: '' }); const pw = ref(''); const err = ref('');

const u = computed(() => acct.user || {});
// 徽章以服务端判定为准；服务端没回时用本地统计兜底显示进度条
const earned = computed(() => String(u.value.badges || '').split(',').filter(Boolean));
const stat = computed(() => ({
  known: u.value.known || Object.keys(getKnown()).length,
  best: u.value.best_streak || study.value.best || 0,
  total: u.value.total || study.value.total || 0,
  quiz: u.value.quiz || study.value.quiz || 0,
}));
const lit = (b) => earned.value.includes(b.id) || (b.m && stat.value[b.m] >= b.n);
const litCount = computed(() => BADGES.filter(lit).length);
const provName = computed(() => (u.value.provider === 'github' ? ' · GitHub'
  : u.value.provider === 'google' ? ' · Google' : ''));

onMounted(() => { if (!acct.logged) router.replace('/login'); else acct.fetchMe(); });

function openEdit() {
  ed.value = {
    nickname: u.value.nickname || '', sig: u.value.sig || '',
    avatar: u.value.avatar || AV_EMOJI[0], av_bg: u.value.av_bg || AV_BG[0],
  };
  err.value = ''; mode.value = 'edit';
}
async function save() {
  err.value = '';
  const r = await api.profileUpdate(ed.value);
  if (!r.ok) { err.value = (r.data && r.data.err) || '保存失败'; return; }
  await acct.fetchMe(); mode.value = 'view'; showToast('已保存');
}
async function saveContact() {
  const r = await api.profileUpdate({ email: ct.value.email });
  if (r.ok) { showToast('已保存'); acct.fetchMe(); } else showToast((r.data && r.data.err) || '保存失败');
}
async function regen() {
  const r = await api.newRecovery({ password: pw.value });
  pw.value = '';
  if (!r.ok) return showToast((r.data && r.data.err) || '生成失败');
  showDialog({ title: '新的恢复码', message: `${r.data.recovery}\n\n旧的已作废，请重新保存。`, confirmButtonText: '我已保存' });
}
function out() { acct.signOut(); router.replace('/login'); }
</script>

<template>
  <div class="page" v-if="acct.user">
    <!-- ── 资料卡 ── -->
    <div v-if="mode === 'view'" class="acct-card">
      <div class="prof-head">
        <span class="avatar" :style="{ background: u.av_bg || 'var(--gold)' }">{{ u.avatar || '🦊' }}</span>
        <div style="min-width:0">
          <div class="prof-nick">{{ u.nickname || u.username }}</div>
          <div class="prof-uname">@{{ u.username }}{{ provName }} · 全站第 {{ acct.rank }} 名</div>
        </div>
      </div>
      <div v-if="u.sig" class="prof-sig">{{ u.sig }}</div>

      <div class="prof-follow">
        <span class="pf-n" @click="$router.push('/following')"><b>{{ u.following || 0 }}</b> 关注</span>
        <span class="pf-n"><b>{{ u.followers || 0 }}</b> 粉丝</span>
        <button class="feed-btn" type="button" @click="$router.push('/feed')">动态</button>
      </div>

      <div class="prof-stats">
        <div class="prof-stat"><b>{{ u.known || 0 }}</b><span>掌握词</span></div>
        <div class="prof-stat"><b>{{ u.streak || 0 }}</b><span>连续打卡</span></div>
        <div class="prof-stat"><b>{{ u.best_streak || 0 }}</b><span>最长打卡</span></div>
        <div class="prof-stat"><b>{{ u.total || 0 }}</b><span>累计学习</span></div>
      </div>

      <div class="sec-title" style="margin:6px 0 4px">
        <span class="sec-title-icon">🏅</span><span class="sec-title-text">徽章墙</span>
        <span class="sec-title-count">{{ litCount }} / {{ BADGES.length }}</span>
      </div>
      <div class="badge-grid">
        <div v-for="b in BADGES" :key="b.id" class="badge" :class="{ locked: !lit(b) }">
          <div class="bemo">{{ b.emo }}</div>
          <div class="bname">{{ b.name }}</div>
          <div class="bprog">{{ lit(b) ? '已点亮' : (b.m ? stat[b.m] + '/' + b.n : b.desc) }}</div>
        </div>
      </div>

      <div class="two-btn">
        <button class="acct-btn" type="button" @click="openEdit">✏️ 编辑资料</button>
        <button class="oauth-btn" type="button" @click="mode = 'settings'">⚙️ 账号设置</button>
      </div>
      <button class="oauth-btn wide" type="button" @click="out">退出登录</button>

      <div class="foot">
        <button class="link" type="button" @click="$router.push('/support')">支持作者</button>
        <span aria-hidden="true">·</span>
        <button class="link" type="button" @click="$router.push('/legal')">隐私政策 · 用户协议</button>
      </div>
    </div>

    <!-- ── 编辑资料：昵称 / 签名 / 预设头像 / 预设底色（无上传） ── -->
    <div v-else-if="mode === 'edit'" class="acct-card">
      <h3 class="ct">编辑资料</h3>
      <div class="acct-field"><label>昵称</label>
        <input v-model="ed.nickname" class="acct-input" maxlength="20"></div>
      <div class="acct-field"><label>个性签名</label>
        <input v-model="ed.sig" class="acct-input" maxlength="60" placeholder="写句话介绍自己（≤60字）"></div>
      <div class="acct-field"><label>头像</label>
        <div class="emoji-pick">
          <button v-for="e in AV_EMOJI" :key="e" type="button" :class="{ on: ed.avatar === e }"
            :aria-label="'选择头像 ' + e" @click="ed.avatar = e">{{ e }}</button>
        </div>
      </div>
      <div class="acct-field"><label>背景色</label>
        <div class="color-pick">
          <button v-for="c in AV_BG" :key="c" type="button" :class="{ on: ed.av_bg === c }"
            :style="{ background: c }" :aria-label="'选择背景色 ' + c" @click="ed.av_bg = c"></button>
        </div>
      </div>
      <p v-if="err" class="acct-err">{{ err }}</p>
      <button class="acct-btn" type="button" @click="save">保存</button>
      <button class="oauth-btn wide" type="button" @click="mode = 'view'">取消</button>
    </div>

    <!-- ── 账号设置 ── -->
    <div v-else class="acct-card">
      <h3 class="ct">账号设置</h3>
      <div class="acct-field"><label>邮箱（找回密码用）</label>
        <input v-model="ct.email" class="acct-input"
          :placeholder="u.hasEmail ? `当前 ${u.email}（留空则删除）` : '未填写'"></div>
      <button class="acct-btn" type="button" @click="saveContact">保存邮箱</button>
      <div class="acct-field" style="margin-top:18px"><label>当前密码</label>
        <input v-model="pw" class="acct-input" type="password" placeholder="重新生成恢复码需验证"></div>
      <button class="oauth-btn wide" type="button" @click="regen">重新生成恢复码</button>
      <button class="oauth-btn wide" type="button" @click="mode = 'view'">返回</button>
    </div>
  </div>
</template>

<style scoped>
.acct-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;
  padding:20px 18px;box-shadow:var(--shadow)}
.ct{margin:0 0 14px;font-size:17px;color:var(--text)}
.avatar{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;
  flex-shrink:0;line-height:1;width:64px;height:64px;font-size:35px}
.prof-head{display:flex;align-items:center;gap:14px;margin-bottom:6px}
.prof-nick{font-size:20px;font-weight:800;color:var(--text)}
/* 旧站这行是 12px；本项目辅助文字下限 12px，正好贴线，颜色改用 --text-dim 保证 4.5:1 */
.prof-uname{font-size:12px;color:var(--text-dim)}
.prof-sig{font-size:13px;color:var(--text-dim);margin:8px 0 0;line-height:1.6}
.prof-follow{display:flex;align-items:center;gap:16px;margin:12px 0 2px;
  font-size:13px;color:var(--text-dim)}
.pf-n{cursor:pointer;min-height:44px;display:inline-flex;align-items:center}
.pf-n b{color:var(--text)}
.feed-btn{margin-left:auto;min-height:44px;padding:7px 20px;border-radius:18px;border:none;
  background:var(--gold);color:#14240a;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer}
.prof-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0}
.prof-stat{background:var(--surface-2);border:1px solid var(--border);border-radius:12px;
  padding:12px 6px;text-align:center}
.prof-stat b{display:block;font-size:20px;color:var(--gold-text);font-weight:800}
/* 旧站 11px；抬到 12px 以满足本项目的辅助文字下限 */
.prof-stat span{font-size:12px;color:var(--text-dim)}
.badge-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:10px;margin-top:10px}
.badge{background:var(--surface);border:1px solid var(--border);border-radius:12px;
  padding:12px 6px;text-align:center}
.badge.locked{opacity:.45}
.badge.locked .bemo{filter:grayscale(1)}
.bemo{font-size:30px;line-height:1}
.bname{font-size:12px;color:var(--text);font-weight:600;margin-top:6px;line-height:1.3}
.bprog{font-size:12px;color:var(--text-faint);margin-top:2px}
.badge:not(.locked) .bprog{color:var(--gold-text)}
.acct-btn{width:100%;min-height:44px;padding:11px;border:none;border-radius:12px;
  background:var(--gold);color:#14240a;font-size:15px;font-weight:700;
  font-family:inherit;cursor:pointer;margin-top:4px}
.oauth-btn{width:100%;min-height:44px;display:flex;align-items:center;justify-content:center;gap:8px;
  padding:10px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2);
  color:var(--text);font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;margin-bottom:8px}
.two-btn{display:flex;gap:10px;margin-top:18px}
.two-btn>*{flex:1;margin:0}
.wide{width:100%;margin:10px 0 0}
.acct-field{margin-bottom:12px}
.acct-field label{display:block;font-size:12px;color:var(--text-dim);margin-bottom:5px}
.acct-input{width:100%;min-height:44px;padding:11px 14px;border-radius:12px;
  border:1px solid var(--border);background:var(--bg2);color:var(--text);
  font-size:15px;font-family:inherit;outline:none}
.acct-input:focus{border-color:var(--gold-dim)}
.acct-err{color:var(--red);font-size:13px;margin:6px 0 0}
.emoji-pick,.color-pick{display:flex;flex-wrap:wrap;gap:8px}
.emoji-pick button{width:44px;height:44px;border-radius:12px;border:1px solid var(--border);
  background:var(--surface-2);font-size:22px;cursor:pointer;line-height:1;padding:0}
.emoji-pick button.on{border-color:var(--gold);background:var(--gold-faint)}
.color-pick button{width:44px;height:44px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0}
.color-pick button.on{border-color:var(--text)}
.foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;
  margin:22px 0 2px;color:var(--text-faint);font-size:13px}
.link{position:relative;background:none;border:none;font-family:inherit;font-size:13px;
  cursor:pointer;color:var(--text-dim);padding:12px 6px;text-decoration:underline;min-height:44px}
</style>
