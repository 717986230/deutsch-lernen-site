<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { loadData } from '../api';
import { speak } from '../api/speak';
import { buildPool, isRight, markKnown, markWrong, clearWrong, getWrong,
         okBeep, badBeep, soundOn, setSound, setLastStudy } from '../api/practice';
import { studyTick } from '../api/study';
import { useAccount } from '../store/account';
defineOptions({ name: 'Spell' });

const acct = useAccount();
const LV = [['all','全部'],['0','入门'],['a1','A1'],['a2','A2'],['b1','B1'],['b2','B2']];
const cats = ref([]); const level = ref('all'); const unit = ref('word');
const queue = ref([]); const idx = ref(0); const input = ref(''); const state = ref('idle');
const judged = ref(null); const right = ref(0); const wrongCnt = ref(0);
const sound = ref(soundOn()); const box = ref(null);
const wrongPool = ref(0);

onMounted(async () => { cats.value = await loadData('categories'); wrongPool.value = Object.keys(getWrong()).length; });

const cur = computed(() => queue.value[idx.value] || null);
const total = computed(() => queue.value.length);
const poolSize = computed(() => cats.value.length
  ? buildPool(cats.value, { level: level.value, unit: unit.value }).length : 0);

function start(src) {
  const pool = src === 'wrong'
    ? Object.entries(getWrong()).map(([de, v]) => ({ de, zh: v.zh, py: v.py }))
    : buildPool(cats.value, { level: level.value, unit: unit.value });
  if (!pool.length) return;
  queue.value = pool.slice(0, 20);
  // 与旧站同构：记一条「继续上次」，首页那张卡直接读 name
  setLastStudy({ spell: 1, level: level.value, name: '拼写记忆 · ' + ((LV.find(x => x[0] === level.value) || [, '全部'])[1]) });
  idx.value = 0; right.value = 0; wrongCnt.value = 0;
  input.value = ''; judged.value = null; state.value = 'run';
  nextTick(() => box.value && box.value.focus());
}
function submit() {
  if (!cur.value || judged.value) return;
  const ok = isRight(input.value, cur.value.de);
  judged.value = ok ? 'ok' : 'bad';
  if (ok) { right.value++; markKnown(cur.value.de); clearWrong(cur.value.de); okBeep(); }
  else { wrongCnt.value++; markWrong(cur.value); badBeep(); }
  studyTick(1, false);   // 计入今日学习量与连续打卡
  acct.syncSoon();
}
function next() {
  judged.value = null; input.value = '';
  if (idx.value + 1 >= queue.value.length) {
    state.value = 'done'; wrongPool.value = Object.keys(getWrong()).length;
  } else { idx.value++; nextTick(() => box.value && box.value.focus()); }
}
// 答对回车进下一题，未答回车提交——单键走完全程，手机上少一次点击
function onEnter() { judged.value ? next() : submit(); }
function toggleSound() { sound.value = !sound.value; setSound(sound.value); if (sound.value) okBeep(); }
// 回设置态必须重算错题数：中途退出时若不刷新，「只练错题」入口就不会出现
function toIdle() { state.value = 'idle'; wrongPool.value = Object.keys(getWrong()).length; }
</script>

<template>
  <div class="page">
    <!-- 设置态：选范围，只做一件事 -->
    <template v-if="state === 'idle'">
      <h1 class="page-title">拼写练习</h1>
      <p class="page-sub">看中文默写德语 · 每轮 20 题</p>

      <div class="group">练什么</div>
      <div class="level-tabs">
        <button v-for="[v,t] in [['word','单词'],['sent','句子']]" :key="v"
          class="level-tab" :class="{ active: unit===v }" @click="unit=v">{{ t }}</button>
      </div>
      <div class="group">难度</div>
      <div class="level-tabs">
        <button v-for="[v,t] in LV" :key="v" class="level-tab" :class="{ active: level===v }"
          @click="level=v">{{ t }}</button>
      </div>
      <p class="page-sub pool">可练 {{ poolSize }} 条（已掌握的自动跳过）</p>
      <button class="btn btn-block" :disabled="!poolSize" @click="start('new')">开始练习</button>
      <button v-if="wrongPool" class="btn btn-plain mt" @click="start('wrong')">
        只练错题（{{ wrongPool }} 条）</button>
      <button class="btn btn-plain mt" @click="$router.push('/quiz')">去做测验（四选一）</button>
      <button class="btn btn-plain mt sm" @click="toggleSound">{{ sound ? '🔔 音效开' : '🔕 音效关' }}</button>
    </template>

    <!-- 练习态：屏幕上只有题目和输入框 -->
    <template v-else-if="state === 'run'">
      <div class="bar">
        <button class="back tap" @click="toIdle">‹ 退出</button>
        <span class="prog">{{ idx + 1 }} / {{ total }}</span>
      </div>
      <div class="pbar"><i :style="{width:((idx)/total*100)+'%'}"></i></div>

      <div class="q">
        <div class="q-zh">{{ cur.zh }}</div>
        <div class="q-py">{{ cur.py }}</div>
      </div>

      <input ref="box" v-model="input" class="ans" :class="judged"
        :readonly="!!judged" autocapitalize="off" autocorrect="off" spellcheck="false"
        placeholder="在此输入德语" @keydown.enter.prevent="onEnter">

      <div v-if="judged === 'ok'" class="fb ok">✓ 正确</div>
      <div v-else-if="judged === 'bad'" class="fb bad">
        <div>✗ 正确答案</div>
        <div class="fb-de" lang="de">{{ cur.de }}</div>
      </div>

      <button v-if="!judged" class="btn btn-block" @click="submit">检查</button>
      <template v-else>
        <button class="btn btn-block" @click="next">{{ idx + 1 >= total ? '看结果' : '下一题' }}</button>
        <button class="btn btn-plain mt" @click="speak(cur.de)">🔊 听一遍</button>
      </template>
    </template>

    <!-- 结果态 -->
    <template v-else>
      <h1 class="page-title">本轮完成</h1>
      <div class="res">
        <div class="res-n">{{ right }} / {{ total }}</div>
        <div class="res-l">{{ right === total ? '全对，厉害' : wrongCnt + ' 题需要再练' }}</div>
      </div>
      <button class="btn btn-block" @click="start('new')">再来一轮</button>
      <button v-if="wrongPool" class="btn btn-plain mt" @click="start('wrong')">
        练错题（{{ wrongPool }} 条）</button>
      <button class="btn btn-plain mt" @click="toIdle">返回设置</button>
    </template>
  </div>
</template>

<style scoped>
.pool{margin:0 0 16px}
.mt{margin-top:10px}.sm{font-size:14px}
.bar{display:flex;align-items:center;padding:12px 0 6px}
.back{background:none;border:none;color:var(--brand-text);font-size:15px;font-family:inherit;cursor:pointer;padding:4px 0}
.prog{margin-left:auto;color:var(--text-3);font-size:14px;font-variant-numeric:tabular-nums}
.pbar{height:3px;background:var(--line);border-radius:2px;overflow:hidden;margin-bottom:30px}
.pbar i{display:block;height:100%;background:var(--brand);transition:width .25s}
.q{text-align:center;padding:14px 0 26px}
.q-zh{font-size:26px;font-weight:700;line-height:1.4;letter-spacing:-.02em}
.q-py{font-size:15px;color:var(--text-3);margin-top:10px}
.ans{width:100%;padding:14px 12px;font-size:19px;font-family:inherit;color:var(--text);
  background:transparent;border:none;border-bottom:2px solid var(--line);outline:none;text-align:center}
.ans:focus{border-bottom-color:var(--brand)}
.ans.ok{border-bottom-color:var(--brand)}
.ans.bad{border-bottom-color:#e5484d}
.fb{text-align:center;margin:18px 0;font-size:15px}
.fb.ok{color:var(--brand-text);font-weight:600}
.fb.bad{color:#c92a2e}
.fb-de{font-size:22px;font-weight:700;color:var(--text);margin-top:6px}
.res{text-align:center;padding:34px 0 30px}
.res-n{font-size:44px;font-weight:700;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.res-l{color:var(--text-2);margin-top:8px}
</style>
