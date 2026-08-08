<script setup>
import { ref, computed, onMounted } from 'vue';
import { loadData } from '../api';
import { speak } from '../api/speak';
import { quizPool, genderPool, makeQuestion, okBeep, badBeep, touchStudy,
         markWrong, markKnown } from '../api/practice';
import { studyTick } from '../api/study';
import { useAccount } from '../store/account';
defineOptions({ name: 'Quiz' });

const acct = useAccount();
const MODES = [
  ['phrase', '中→德', '看中文选德语'],
  ['reverse', '德→中', '看德语选中文'],
  ['listen', '听力', '听发音选中文'],
  ['gender', '冠词', '选 der / die / das'],
];
const LV = [['all','全部'],['0','入门'],['a1','A1'],['a2','A2'],['b1','B1'],['b2','B2']];
const ROUND = 10;

const cats = ref([]); const mode = ref('phrase'); const level = ref('all');
const state = ref('idle'); const q = ref(null); const picked = ref(null);
const n = ref(0); const score = ref(0);

onMounted(async () => { cats.value = await loadData('categories'); });

const pool = computed(() => mode.value === 'gender'
  ? genderPool(cats.value, level.value) : quizPool(cats.value, level.value));
// 每种模式比对的字段不同：中→德比德语，其余比中文；冠词只比冠词本身
const keyOf = (p) => mode.value === 'phrase' ? p.de
  : mode.value === 'gender' ? (p._art || p.de.trim().split(/\s+/)[0]) : p.zh;

const ARTICLES = ['der', 'die', 'das'];
function draw() {
  if (mode.value === 'gender') {
    // 冠词的答案空间只有三个，凑不出第四个干扰项——这里就该是三选一
    const p = pool.value[Math.random() * pool.value.length | 0];
    q.value = p ? { right: p, options: ARTICLES.map((a) => ({ de: a + ' x', zh: a, py: '', _art: a })) } : null;
  } else {
    q.value = makeQuestion(pool.value, keyOf);
  }
  picked.value = null;
  if (mode.value === 'listen' && q.value) setTimeout(() => speak(q.value.right.de), 250);
}
function start() { if (pool.value.length < 4) return; state.value = 'run'; n.value = 0; score.value = 0; draw(); }
function pick(o) {
  if (picked.value) return;
  picked.value = o;
  const ok = keyOf(o) === keyOf(q.value.right);
  if (ok) { score.value++; okBeep(); markKnown(q.value.right.de); }
  else { badBeep(); markWrong(q.value.right); }
  touchStudy();
  studyTick(1, true);    // 测验计入 quiz 计数，徽章按它判定
  acct.syncSoon();
}
function next() {
  if (n.value + 1 >= ROUND) { state.value = 'done'; return; }
  n.value++; draw();
}
// 冠词模式只显示名词本体，把答案藏起来
const stem = (de) => de.trim().replace(/^(der|die|das)\s+/, '');
const optText = (o) => mode.value === 'phrase' ? o.de
  : mode.value === 'gender' ? (o._art || keyOf(o)) : o.zh;
const cls = (o) => !picked.value ? ''
  : keyOf(o) === keyOf(q.value.right) ? 'ok'
  : (o === picked.value ? 'bad' : 'dim');
</script>

<template>
  <div class="page">
    <template v-if="state === 'idle'">
      <h1 class="page-title">测验</h1>
      <p class="page-sub">四选一 · 每轮 {{ ROUND }} 题</p>
      <div class="group">题型</div>
      <div class="modes">
        <button v-for="[v,t,d] in MODES" :key="v" class="mode" :class="{on:mode===v}" @click="mode=v">
          <span class="m-t">{{ t }}</span><span class="m-d">{{ d }}</span>
        </button>
      </div>
      <div class="group">难度</div>
      <div class="level-tabs">
        <button v-for="[v,t] in LV" :key="v" class="level-tab" :class="{ active: level===v }" @click="level=v">{{ t }}</button>
      </div>
      <p class="page-sub pool">题库 {{ pool.length }} 条</p>
      <button class="btn btn-block" :disabled="pool.length < 4" @click="start">开始测验</button>
      <p v-if="pool.length < 4" class="page-sub">该范围题目不足，换个难度试试</p>
    </template>

    <template v-else-if="state === 'run' && q">
      <div class="bar">
        <button class="back tap" @click="state='idle'">‹ 退出</button>
        <span class="prog">{{ n + 1 }} / {{ ROUND }}</span>
      </div>
      <div class="pbar"><i :style="{width:(n/ROUND*100)+'%'}"></i></div>

      <div class="q">
        <template v-if="mode === 'listen'">
          <button class="spk tap" @click="speak(q.right.de)">🔊</button>
          <div class="q-h">听发音，选出正确的中文</div>
        </template>
        <template v-else-if="mode === 'gender'">
          <div class="q-de" lang="de">{{ stem(q.right.de) }}</div>
          <div class="q-h">这个名词用哪个冠词？</div>
        </template>
        <template v-else-if="mode === 'phrase'">
          <div class="q-zh">{{ q.right.zh }}</div>
          <div class="q-h">选出正确的德语</div>
        </template>
        <template v-else>
          <div class="q-de" lang="de">{{ q.right.de }}</div>
          <div class="q-h">选出正确的中文</div>
        </template>
      </div>

      <button v-for="(o,i) in q.options" :key="i" class="opt" :class="cls(o)"
        :lang="mode==='phrase'||mode==='gender' ? 'de' : null" @click="pick(o)">{{ optText(o) }}</button>

      <template v-if="picked">
        <div class="ex">
          <span lang="de">{{ q.right.de }}</span> — {{ q.right.zh }}
          <div class="ex-py">{{ q.right.py }}</div>
        </div>
        <button class="btn btn-block" @click="next">{{ n + 1 >= ROUND ? '看结果' : '下一题' }}</button>
        <button class="btn btn-plain mt" @click="speak(q.right.de)">🔊 听一遍</button>
      </template>
    </template>

    <template v-else-if="state === 'done'">
      <h1 class="page-title">本轮完成</h1>
      <div class="res"><div class="res-n">{{ score }} / {{ ROUND }}</div>
        <div class="res-l">{{ score === ROUND ? '全对，厉害' : (ROUND - score) + ' 题答错，已记入错题本' }}</div></div>
      <button class="btn btn-block" @click="start">再来一轮</button>
      <button class="btn btn-plain mt" @click="state='idle'">换个题型</button>
    </template>
  </div>
</template>

<style scoped>
.modes{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:6px 0 14px}
.mode{display:flex;flex-direction:column;gap:2px;padding:12px 10px;min-height:44px;
  border:1px solid var(--line);background:transparent;border-radius:12px;
  font-family:inherit;cursor:pointer;text-align:left}
.mode.on{border-color:var(--brand);background:var(--brand);color:#14240a}
.m-t{font-size:15px;font-weight:600;color:var(--text)}
.mode.on .m-t{color:#14240a}
.m-d{font-size:12px;color:var(--text-3)}
.mode.on .m-d{color:#2d4a10}
.pool{margin:0 0 16px}
.mt{margin-top:10px}
.bar{display:flex;align-items:center;padding:12px 0 6px}
.back{background:none;border:none;color:var(--brand-text);font-size:15px;font-family:inherit;cursor:pointer;padding:4px 0}
.prog{margin-left:auto;color:var(--text-3);font-size:14px;font-variant-numeric:tabular-nums}
.pbar{height:3px;background:var(--line);border-radius:2px;overflow:hidden;margin-bottom:26px}
.pbar i{display:block;height:100%;background:var(--brand);transition:width .25s}
.q{text-align:center;padding:8px 0 24px}
.q-zh{font-size:25px;font-weight:700;line-height:1.4;letter-spacing:-.02em}
.q-de{font-size:24px;font-weight:700;line-height:1.4}
.q-h{font-size:13px;color:var(--text-3);margin-top:10px}
.spk{width:66px;height:66px;border-radius:50%;border:1px solid var(--line);
  background:var(--surface);font-size:28px;cursor:pointer}
.opt{display:block;width:100%;padding:14px 12px;margin-bottom:9px;min-height:44px;
  border:1px solid var(--line);background:transparent;color:var(--text);
  border-radius:12px;font-size:16px;font-family:inherit;cursor:pointer;text-align:left}
.opt.ok{border-color:var(--brand);background:var(--brand);color:#14240a;font-weight:600}
.opt.bad{border-color:#e5484d;color:#c92a2e}
.opt.dim{opacity:.45}
.ex{text-align:center;font-size:15px;color:var(--text-2);margin:16px 0 18px}
.ex-py{font-size:13px;color:var(--text-3);margin-top:4px}
.res{text-align:center;padding:34px 0 30px}
.res-n{font-size:44px;font-weight:700;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.res-l{color:var(--text-2);margin-top:8px}
</style>
