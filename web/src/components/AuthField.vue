<script setup>
// 自绘输入框：透明底 + 一条 --line 细线，聚焦变 --brand-text。
// 不用 van-field，是为了摆脱 Vant 的灰底圆角块（三页叠起来像收据）。
import { ref, computed } from 'vue';

const props = defineProps({
  label: String,
  type: { type: String, default: 'text' },
  placeholder: String,
  hint: String,
  optional: Boolean,
  autocomplete: String,
  inputmode: String,
  maxlength: [String, Number],
});
const model = defineModel({ type: String, default: '' });

let seq = 0;
const uid = 'af' + Math.random().toString(36).slice(2, 8) + ++seq;
const focus = ref(false);
const reveal = ref(false);
const isPw = computed(() => props.type === 'password');
const realType = computed(() => (isPw.value && reveal.value ? 'text' : props.type));
</script>

<template>
  <div class="fld" :class="{ on: focus }">
    <label class="fld-lb" :for="uid">
      {{ label }}<span v-if="optional" class="fld-opt">选填</span>
    </label>
    <div class="fld-row">
      <input
        :id="uid"
        class="fld-in"
        :type="realType"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        :maxlength="maxlength"
        v-model="model"
        @focus="focus = true"
        @blur="focus = false"
      />
      <!-- 空密码框上的「显示」只是噪音，有内容再出现 -->
      <button v-if="isPw && model" type="button" class="fld-act" @click="reveal = !reveal">
        {{ reveal ? '隐藏' : '显示' }}
      </button>
      <slot name="suffix" />
    </div>
    <p v-if="hint" class="fld-hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.fld{margin-top:22px}
.fld-lb{display:block;font-size:13px;line-height:20px;color:var(--text-2);margin-bottom:2px}
.fld-opt{margin-left:6px;font-size:12px;color:var(--text-3)}
.fld-row{display:flex;align-items:center;gap:8px;
  border-bottom:1px solid var(--line);transition:border-color .15s}
.fld.on .fld-row{border-bottom-color:var(--brand-text)}
.fld-in{flex:1;min-width:0;height:48px;padding:0;border:none;outline:none;
  background:transparent;color:var(--text);font-size:17px;font-family:inherit;
  line-height:24px;border-radius:0;-webkit-appearance:none;appearance:none}
.fld-in::placeholder{color:var(--text-3);opacity:1}
/* Chrome 自动填充会强塞浅黄底，深色主题下会糊掉 */
.fld-in:-webkit-autofill{-webkit-text-fill-color:var(--text);
  -webkit-box-shadow:0 0 0 40px var(--bg) inset;caret-color:var(--text)}
/* 视觉是 13px 小字，可点范围仍是 44px */
.fld-act{flex:none;min-height:44px;min-width:44px;padding:12px 4px;background:none;
  border:none;font-family:inherit;font-size:13px;line-height:20px;color:var(--text-2);
  cursor:pointer;-webkit-tap-highlight-color:transparent}
.fld-hint{margin:6px 0 0;font-size:13px;line-height:1.6;color:var(--text-3)}
</style>
