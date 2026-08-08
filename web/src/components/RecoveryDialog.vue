<script setup>
// 恢复码只在服务端生成的那一次返回，用户错过就再也拿不到 —— 所以它值一整屏，
// 而不是一个能被误点掉的 toast。确认后才由父组件跳转。
import { ref } from 'vue';

defineProps({
  code: { type: String, default: '' },
  title: { type: String, default: '请保存恢复码' },
  desc: { type: String, default: '' },
});
const emit = defineEmits(['done']);
const copied = ref(false);

function copy(code) {
  var ok = false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code);
      ok = true;
    }
  } catch (e) { ok = false; }
  if (!ok) {
    // 微信 X5 / 老 WKWebView 没有 clipboard API，退回 execCommand
    try {
      var ta = document.createElement('textarea');
      ta.value = code; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      ok = document.execCommand && document.execCommand('copy');
      document.body.removeChild(ta);
    } catch (e2) { ok = false; }
  }
  copied.value = !!ok;
}
</script>

<template>
  <div class="mask" role="dialog" aria-modal="true" aria-labelledby="rc-t">
    <div class="panel">
      <h2 id="rc-t" class="rc-h">{{ title }}</h2>
      <p class="rc-desc">{{ desc || '忘记密码时用它重置账号。' }}<b>只显示这一次，请立即截图或抄下来。</b></p>
      <p class="code" data-testid="recovery-code">{{ code }}</p>
      <button type="button" class="btn btn-plain copy" @click="copy(code)">
        {{ copied ? '已复制' : '复制恢复码' }}
      </button>
      <button type="button" class="btn go" @click="emit('done')">我已保存，继续</button>
    </div>
  </div>
</template>

<style scoped>
/* 必须高于固定顶栏(200) 和底部标签栏(300)，否则底栏会压在遮罩上面 */
.mask{position:fixed;inset:0;z-index:1500;display:flex;align-items:center;justify-content:center;
  padding:24px;background:rgba(0,0,0,.5)}
.panel{width:100%;max-width:380px;background:var(--surface);border-radius:var(--radius);
  padding:28px 24px 24px}
.rc-h{font-size:20px;font-weight:700;margin:0 0 8px}
.rc-desc{font-size:14px;line-height:1.7;color:var(--text-2);margin:0 0 20px}
.rc-desc b{color:var(--text);font-weight:600}
.code{margin:0 0 20px;padding:16px 12px;background:var(--bg);border:1px solid var(--line);
  border-radius:10px;text-align:center;font-size:18px;line-height:1.5;font-weight:600;
  letter-spacing:.06em;color:var(--text);word-break:break-all;
  font-family:ui-monospace,Menlo,Consolas,monospace;-webkit-user-select:all;user-select:all}
.copy{margin-bottom:10px}
.go{margin:0}
</style>
