<script setup>
// 结构逐块照搬旧站 #home：hero → 学习看板 → 语音包提示 → 零基础入门 → 功能卡九宫格
// → 学习方法折叠区 → 支持作者。文案、图标、顺序都不改。
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAccount } from '../store/account';
import { useLang } from '../store/lang';
import { getStudy, BADGES } from '../api/study';
import { getKnown } from '../api/practice';
defineOptions({ name: 'Home' });

const router = useRouter(); const acct = useAccount(); const lang = useLang();
const study = ref(getStudy());
const known = ref(0);
const goalPick = ref(false);
const voiceGuide = ref(false);

const day = (t) => { const d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const today = () => day(Date.now());
const yday = () => day(Date.now() - 864e5);

onMounted(() => {
  study.value = getStudy();
  try { known.value = Object.keys(getKnown()).length; } catch { known.value = 0; }
});

const todayN = computed(() => (study.value.d === today() ? (study.value.n || 0) : 0));
const goal = computed(() => study.value.goal || 20);
const streak = computed(() => (study.value.last === today() || study.value.last === yday()) ? (study.value.streak || 0) : 0);
const pct = computed(() => Math.min(100, Math.round(todayN.value / goal.value * 100)));
const nick = computed(() => acct.user?.nickname || acct.user?.username || '同学');
const badgeCount = computed(() => {
  const earned = (acct.user?.badges || '').split(',').filter(Boolean);
  return earned.length || BADGES.filter((b) => b.m === 'known' && known.value >= b.n).length;
});
const hi = computed(() => pct.value >= 100 ? '今日目标已达成，太棒了 🎉'
  : todayN.value > 0 ? `继续保持，今天已学 ${todayN.value} 次` : '今天还没开始，来一组拼写吧');
// 最近 14 天的学习量柱状图（旧站 _dashTrend）
const trend = computed(() => {
  const h = study.value.h || {}, out = [];
  for (let i = 13; i >= 0; i--) {
    const d = day(Date.now() - i * 864e5);
    out.push({ d, n: h[d] || 0, today: i === 0 });
  }
  const max = Math.max(1, ...out.map((x) => x.n));
  return out.map((x) => ({ ...x, h: Math.round(x.n / max * 100) }));
});
function setGoal(g) {
  const s = getStudy(); s.goal = g;
  try { localStorage.setItem('study', JSON.stringify(s)); } catch {}
  study.value = getStudy(); goalPick.value = false;
}

// 功能卡：与旧站 de-only-block 里的七张一一对应（图标、标题、副标题、去处都不变）
const CARDS = [
  { to: '/ref/pron', ic: 'fic-green', t: '发音规律', s: '字母发音·变音·组合音' },
  { to: '/ref/numbers', ic: 'fic-blue', t: '数字规律', s: '0-100万·规律·测验' },
  { to: '/ref/grammar', ic: 'fic-orange', t: '语法速记', s: '冠词·动词变位·格' },
  { to: '/phrases', ic: 'fic-purple', t: '词句大全', s: '20大类·含谐音' },
  { to: '/reading', ic: 'fic-teal', t: '阅读·连载', s: '分级短文·留学连续剧' },
  { to: '/quiz', ic: 'fic-red', t: '练习测验', s: '数字·单词·句子·听力' },
  { to: '/boards', ic: 'fic-pink', t: '图解词典', s: '人体·动物·食物·交通…' },
];
// 英语模式下旧站换成另一组卡（en-only-block），去处相同、文案不同
const EN_CARDS = [
  { to: '/ref/pron', ic: 'fic-green', t: '英语发音', s: '元音·组合音·谐音示例' },
  { to: '/ref/numbers', ic: 'fic-blue', t: '英语数字', s: 'teen/ty·大数·序数词' },
  { to: '/ref/grammar', ic: 'fic-orange', t: '英语语法', s: 'be动词·冠词·时态·语序' },
  { to: '/phrases', ic: 'fic-purple', t: '词句大全', s: '常用英语·含中文谐音' },
  { to: '/quiz', ic: 'fic-red', t: '练习测验', s: '看中文·选英语' },
];
const cards = computed(() => lang.isEn ? EN_CARDS : CARDS);

// 学习方法：旧站 home-more 里的十三条，原文照搬
const TIPS = [
  ['① 发音先行，规则极强', '德语「所见即所读」，1-2 天拿下字母表 + 变音(ä ö ü) + 组合音(ei/ie/ch/sch)，看词就能拼读。谐音只是拐杖，能拼读后就扔掉。'],
  ['② 名词永远连冠词一起背', 'der/die/das 决定格与词尾。背单词 = 冠词 + 名词 + 复数三件套。规律：-ung/-heit/-ion→die；-er/-ling→der；-chen/-lein→das。'],
  ['③ 借英语同源词滚雪球', '德英同源词极多：Haus/house、Wasser/water、Buch/book、gut/good、trinken/drink。见到生词先想英语近亲。'],
  ['④ 死磕高频词，别啃生僻', '约 600-800 高频词覆盖日常 80%。先把 Goethe A1/A2 核心词吃透（本手册已收录），扩词比求全更划算。'],
  ['⑤ 抓动词框架这根骨架', '陈述句动词永远第二位，可分动词前缀甩句尾，从句动词到句末。记牢 sein/haben/können/möchten + 动词不定式。'],
  ['⑥ 四个格先攻「第一格 + 第四格」', '日常主要用主格和宾语(第四格)，二三格后补。别被「4 格 × 3 性」吓住，先够用再求全。'],
  ['⑦ 数字记规律不硬背', '1-12 硬记，13-19 = 数字 + zehn，整十 = 词根 + zig，21-99 是个位 + und + 十位（倒序！）。'],
  ['⑧ 场景化 + 每天开口跟读', '按场景成块学（问候/点餐/问路），影子跟读(Shadowing)模仿语调。开口比默记有效 10 倍。'],
  ['⑨ 间隔重复，少量多次', '按遗忘曲线复习，每天 15-20 分钟，胜过周末突击 3 小时。'],
  ['⑩ 磨耳朵：先熟语流再听懂', '听德语慢速新闻(langsam gesprochene Nachrichten / DW)、儿歌、播客。先求「听惯」，再求「听懂」。'],
  ['⑪ 长词是「拼」出来的，会拆就会懂', '德语复合词从右往左读，最后一节是核心：Handschuh = Hand(手) + Schuh(鞋) → 手套。'],
  ['⑫ 句中大写的词，基本就是名词', '德语所有名词首字母大写。这不是麻烦，是阅读路标——一眼挑出名词、快速抓住句子主干。'],
  ['⑬ 给名词「上色」记性别', '背单词时脑内给冠词上色：der 蓝 / die 红 / das 绿。视觉记忆比死记「阳性阴性中性」牢得多。'],
];
</script>

<template>
  <div class="page home">
    <!-- HERO：标题 + 德国三色条 + 一句话介绍 -->
    <div class="hero">
      <div class="hero-label">{{ lang.isEn ? 'English · 英语学习' : 'Deutsche Sprache · 德语学习' }}</div>
      <h1>{{ lang.isEn ? '英语学习手册' : '德语学习手册' }}</h1>
      <div v-if="!lang.isEn" class="flag-strip" aria-hidden="true"><i></i><i></i><i></i></div>
      <p>发音 · 数字 · 语法 · 3900+ 词句 · 5阶段进阶 · 互动测验</p>
    </div>

    <!-- 学习看板 -->
    <div class="dash">
      <div class="dash-top">
        <span class="avatar" :style="{ background: acct.user?.av_bg || '#58cc02' }">{{ acct.user?.avatar || '🦉' }}</span>
        <div class="dash-hi">Hallo, {{ nick }}！<small>{{ hi }}</small></div>
      </div>
      <div class="dash-stats">
        <div class="dash-stat" @click="router.push('/me')"><b>{{ streak }}</b><span>🔥 连续打卡</span></div>
        <div class="dash-stat" @click="router.push('/spell')"><b>{{ known }}</b><span>📖 掌握词</span></div>
        <div class="dash-stat" @click="router.push('/me')"><b>{{ badgeCount }}</b><span>🏅 徽章</span></div>
      </div>
      <div class="dash-goal">
        <div class="dash-goal-row" @click="goalPick = !goalPick" title="调整每日目标">
          <span>今日目标 ✏️</span><span>{{ todayN }} / {{ goal }}</span>
        </div>
        <div class="dash-goal-bar"><i :style="{ width: pct + '%' }"></i></div>
        <div v-if="goalPick" class="dash-cta">
          <button v-for="g in [10, 20, 50, 100]" :key="g" type="button"
            :class="{ on: goal === g }" @click="setGoal(g)">{{ g }}</button>
        </div>
      </div>
      <div class="dash-trend">
        <i v-for="(d, i) in trend" :key="i" :class="{ today: d.today }" :style="{ height: Math.max(2, d.h) + '%' }"></i>
      </div>
      <div class="dash-trend-lab"><span>14 天前</span><span>今天</span></div>
      <div class="dash-cta">
        <button type="button" @click="router.push('/spell')">⌨️ 拼写记忆</button>
        <button type="button" @click="router.push('/quiz')">🎯 练习测验</button>
        <button type="button" @click="router.push('/rank')">🏆 排行榜</button>
      </div>
    </div>

    <!-- 语音包提示（点开展开安装指引） -->
    <div class="voice-tip" @click="voiceGuide = !voiceGuide">
      <span style="font-size:22px;flex-shrink:0">🎧</span>
      <div><b>发音不地道？</b>一次装好系统语音包（免费 · 离线），朗读从"机器腔"变接近真人
        <span class="vt-more">{{ voiceGuide ? '收起 ▾' : '怎么装 ▸' }}</span></div>
    </div>
    <div v-if="voiceGuide" class="voice-guide">
      <div class="vg-h">为什么要装语音包？</div>
      朗读用的是<b>系统自带的神经语音引擎</b>（完全离线）。装上原生德语/中文语音后，发音从"机器味"变成接近真人。
      <div class="vg-t">🍎 iPhone / iPad</div>
      设置 → 辅助功能 → 朗读内容 → 声音 → <b>德语</b>（选 Anna/Petra/Markus）下载；中文选「普通话」。
      <div class="vg-t">💻 Mac</div>
      系统设置 → 辅助功能 → 朗读内容 → 系统声音 → 管理声音 → 勾选<b>德语 Anna/Petra</b> + <b>中文 婷婷</b> 下载。
      <div class="vg-t">🤖 安卓</div>
      设置 → 搜索"文字转语音/TTS" → 选 Google 语音引擎 → 安装语音数据 → 下载<b>德语 + 中文</b>。
      <div class="vg-t">🌐 电脑 Chrome / Edge</div>
      自带在线德语/中文语音（Google/Microsoft），通常无需额外安装，音质已很好。
      <div class="vg-note">装好后回到本页刷新，🔊 会自动选用新语音。</div>
    </div>

    <!-- 零基础入门 -->
    <button v-if="!lang.isEn" class="beginner" @click="router.push('/phrases?level=0')">🌱 零基础入门</button>

    <!-- 功能卡 -->
    <div class="fgrid">
      <div v-for="c in cards" :key="c.t" class="card fcard" @click="router.push(c.to)">
        <div class="fic" :class="c.ic">
          <svg v-if="c.ic === 'fic-green'" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6.2 9H3.5v6h2.7L11 19z" fill="#fff"/><path d="M14.8 9.2a4 4 0 0 1 0 5.6M17.4 6.6a7.6 7.6 0 0 1 0 10.8" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
          <svg v-else-if="c.ic === 'fic-blue'" viewBox="0 0 24 24" aria-hidden="true"><text x="12" y="16.8" text-anchor="middle" font-size="12.5" font-family="Georgia,serif" font-weight="bold" fill="#fff">123</text></svg>
          <svg v-else-if="c.ic === 'fic-orange'" viewBox="0 0 24 24" aria-hidden="true"><text x="12" y="18" text-anchor="middle" font-size="19" font-family="Georgia,serif" font-weight="bold" fill="#fff">§</text></svg>
          <svg v-else-if="c.ic === 'fic-purple'" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H4a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 16h3v4l5-4h8a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 20 4z" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><circle cx="8.5" cy="10" r="1.15" fill="#fff"/><circle cx="12" cy="10" r="1.15" fill="#fff"/><circle cx="15.5" cy="10" r="1.15" fill="#fff"/></svg>
          <svg v-else-if="c.ic === 'fic-teal'" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.2C9.6 4.7 6.6 4.5 4 5.5V19c2.6-1 5.6-.8 8 .7 2.4-1.5 5.4-1.7 8-.7V5.5c-2.6-1-5.6-.8-8 .7z" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M12 6.2v13.5" stroke="#fff" stroke-width="2"/></svg>
          <svg v-else-if="c.ic === 'fic-red'" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.2" fill="none" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="4.4" fill="none" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="1.4" fill="#fff"/></svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="6" r="3.2" fill="#fff"/><path d="M12 10.5c-3 0-4.5 1.6-4.5 3.6V17h2.4l.7 4h2.8l.7-4h2.4v-2.9c0-2-1.5-3.6-4.5-3.6z" fill="#fff"/></svg>
        </div>
        <div class="ft">{{ c.t }}</div>
        <div class="fs">{{ c.s }}</div>
      </div>
    </div>

    <!-- 学习方法 & 秘诀 -->
    <details class="home-more">
      <summary>💡 学习方法 &amp; 秘诀（点开查看）</summary>
      <div class="home-more-body">
        <div class="tip-h">🔑 学习秘诀 · 中国人学德语最优方法</div>
        <p v-for="(t, i) in TIPS" :key="i" class="tip"><b>{{ t[0] }}</b><br>{{ t[1] }}</p>
      </div>
    </details>

    <button class="btn btn-block sup" @click="router.push('/support')">❤️ 支持作者 · 请我一杯咖啡</button>
  </div>
</template>

<style scoped>
/* 以下取值逐条对齐旧站 src.html，只把当文字用的 --gold 换成 --gold-text（浅底 2.1:1 不合格） */
/* hero 要通栏。用负外边距把它顶出 .page 的 20px 左右内边距，
   而不是把 .page 的内边距清零、再给每个子元素加 20px 外边距 ——
   后者会让 width:100% 的按钮（.btn-block）在 100% 之外再加 40px，整页横向溢出 20px。 */
.hero{margin-left:-20px;margin-right:-20px;
  text-align:center;padding:38px 16px 32px;
  background:linear-gradient(180deg,rgba(88,204,2,.07) 0%,transparent 100%)}
.hero-label{font-size:12px;letter-spacing:8px;color:var(--gold-text);text-transform:uppercase;margin-bottom:12px}
.hero h1{font-size:clamp(26px,6vw,46px);font-weight:400;letter-spacing:3px;color:var(--text);margin:0 0 8px}
.hero p{font-size:14px;color:var(--text-dim);line-height:1.6;margin:0}
.flag-strip{width:56px;height:6px;margin:12px auto 10px;border-radius:3px;overflow:hidden;
  display:flex;box-shadow:0 1px 4px rgba(0,0,0,.15)}
.flag-strip i{flex:1}
.flag-strip i:nth-child(1){background:#2b2b2b}
.flag-strip i:nth-child(2){background:#dd0000}
.flag-strip i:nth-child(3){background:#ffce00}

.dash{background:var(--surface);border:1px solid var(--border);border-radius:18px;
  padding:16px 16px 14px;margin:14px 0 4px;box-shadow:var(--shadow)}
.dash-top{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.avatar{width:44px;height:44px;flex:none;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:24px}
.dash-hi{font-size:16px;font-weight:800;color:var(--text);min-width:0;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* 旧站这里是 11px；本项目规定辅助文字 ≥12px */
.dash-hi small{display:block;font-size:12px;font-weight:400;color:var(--text-faint);
  letter-spacing:1px;margin-top:2px;white-space:normal}
.dash-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.dash-stat{background:var(--surface-2);border:1px solid var(--border);border-radius:12px;
  padding:10px 4px;text-align:center;cursor:pointer}
/* 旧站用 --gold 当数字色，浅底 2.1:1 不合格 → --gold-text */
.dash-stat b{display:block;font-size:19px;color:var(--gold-text);font-weight:800}
.dash-stat span{font-size:12px;color:var(--text-dim)}
.dash-goal{margin-top:12px}
.dash-goal-row{display:flex;justify-content:space-between;font-size:12px;color:var(--text-dim);
  margin-bottom:5px;cursor:pointer;min-height:44px;align-items:center}
.dash-goal-bar{height:8px;border-radius:5px;background:var(--surface-2);overflow:hidden}
.dash-goal-bar i{display:block;height:100%;border-radius:5px;background:var(--gold);transition:width .4s}
.dash-trend{display:flex;align-items:flex-end;gap:4px;height:34px;margin-top:12px}
.dash-trend i{flex:1;background:var(--border);border-radius:4px 4px 0 0;min-height:2px}
.dash-trend i.today{background:var(--gold)}
.dash-trend-lab{display:flex;justify-content:space-between;font-size:12px;color:var(--text-faint);margin-top:3px}
.dash-cta{display:flex;gap:8px;margin-top:12px}
.dash-cta button{flex:1;min-height:44px;padding:9px;border:none;border-radius:11px;font-family:inherit;
  font-size:13px;font-weight:700;cursor:pointer;background:var(--btn-bg);color:var(--gold-text)}
.dash-cta button.on{background:var(--gold);color:#14240a}
.dash-cta button:active{transform:translateY(1px)}

.voice-tip{display:flex;align-items:center;gap:12px;margin-top:20px;background:var(--surface);
  border:1px solid var(--border);border-radius:14px;padding:13px 16px;cursor:pointer;
  font-size:13px;color:var(--text);line-height:1.6;box-shadow:var(--shadow)}
.voice-tip:active{background:var(--gold-faint)}
.vt-more{color:var(--gold-text);font-weight:600;white-space:nowrap}
.voice-guide{background:var(--surface);border:1px solid var(--border);border-radius:14px;
  padding:14px 16px;margin:10px 0 0;font-size:13px;color:var(--text-dim);line-height:1.8}
.vg-h{font-weight:600;color:var(--text);margin-bottom:6px}
.vg-t{font-weight:600;color:var(--gold-text);margin:12px 0 4px}
.vg-note{font-size:12px;color:var(--text-faint);margin-top:10px}

/* 旧站这里是贴左边缘的竖排常驻长条；本端已有底部标签栏和右下角浮钮，
   再加一条固定侧标签只会继续抢位置，故改成首页内的一枚普通按钮，去处不变。 */
.beginner{display:block;width:100%;min-height:44px;margin:16px 0 0;padding:12px;border:none;
  border-radius:14px;background:var(--gold);color:#14240a;font-size:15px;font-weight:700;
  font-family:inherit;letter-spacing:2px;cursor:pointer;box-shadow:0 4px 14px var(--gold-dim)}
.beginner:active{transform:translateY(1px)}

/* minmax 下限用 min(150px,100%)：容器比 150px 还窄时退化成整宽，
   否则 150px 是硬地板，窄屏/高倍缩放下整页横向溢出。正常宽度下取值不变。 */
.fgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(150px,100%),1fr));gap:12px;margin-top:22px}
.fcard{text-align:center;padding:24px 16px;cursor:pointer;margin:0}
.fic{width:54px;height:54px;border-radius:16px;display:flex;align-items:center;
  justify-content:center;margin:0 auto 10px}
.fic svg{width:28px;height:28px;display:block}
.fic-green{background:linear-gradient(135deg,#6fdb1e,#46a302);box-shadow:0 6px 14px rgba(88,204,2,.32)}
.fic-blue{background:linear-gradient(135deg,#3ec2ff,#0e8fd0);box-shadow:0 6px 14px rgba(28,176,246,.32)}
.fic-orange{background:linear-gradient(135deg,#ffb340,#e07f00);box-shadow:0 6px 14px rgba(255,150,0,.32)}
.fic-purple{background:linear-gradient(135deg,#a878ff,#6f3fd6);box-shadow:0 6px 14px rgba(142,92,246,.32)}
.fic-teal{background:linear-gradient(135deg,#2fd4b2,#0d9488);box-shadow:0 6px 14px rgba(20,184,166,.32)}
.fic-red{background:linear-gradient(135deg,#ff7a6e,#e03131);box-shadow:0 6px 14px rgba(255,75,75,.32)}
.fic-pink{background:linear-gradient(135deg,#ff8fb5,#e0447e);box-shadow:0 6px 14px rgba(224,68,126,.32)}
.ft{font-size:15px;color:var(--text);font-weight:700;margin-bottom:6px}
.fs{font-size:12px;color:var(--text-dim)}

.home-more{margin-top:24px;background:var(--surface);border:1px solid var(--border);
  border-radius:14px;box-shadow:var(--shadow);overflow:hidden}
.home-more>summary{cursor:pointer;padding:14px 16px;min-height:44px;display:flex;align-items:center;
  font-size:14px;color:var(--text);font-weight:600;list-style:none;user-select:none}
.home-more>summary::-webkit-details-marker{display:none}
.home-more>summary::after{content:"▸";margin-left:auto;color:var(--gold-text)}
.home-more[open]>summary::after{content:"▾"}
.home-more[open]>summary{border-bottom:1px solid var(--border)}
.home-more-body{padding:6px 16px 14px}
.tip-h{font-weight:700;color:var(--text);margin:10px 0 6px}
.tip{font-size:13px;color:var(--text-dim);line-height:1.85;margin:0 0 12px}
.tip b{color:var(--text)}
.sup{margin-top:24px}
</style>
