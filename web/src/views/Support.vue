<script setup>
// 「支持作者」——照旧站 #support 补全：正文说明 → 收款码 → 词典来源致谢
// → 分享按钮 → 联系作者 → 隐私政策。之前这页只有标题 + 二维码，缺了一半。
import { ref } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();
const qr = import.meta.env.BASE_URL + 'support-qr.png';
const copied = ref(false);

// 与旧站 copyShare 同行为：复制站点网址，按钮短暂变成已复制
async function copyShare() {
  const url = 'https://www.uuoo.site/';
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(url);
    else {
      // 老内核没有 clipboard API：退回临时 textarea + execCommand
      const t = document.createElement('textarea');
      t.value = url; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    }
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2500);
  } catch { /* 复制失败就什么都不做，网址本来就在地址栏里 */ }
}
</script>

<template>
  <div class="page">
    <div class="hero-label">Support</div>
    <h1 class="page-title">支持作者 · 请杯咖啡 ☕</h1>

    <p class="sp-p">
      这份手册从词句整理、发音朗读到测验复习，都是<b>业余时间一点点做出来、并持续维护</b>的；
      域名和时间都是实打实的成本。它<b>一直免费、无广告</b>。<br>
      如果它在你学德语的路上帮上了忙，欢迎扫码<b>随手打赏一点</b>，让它能继续更新下去 😊<br>
      一块两块都是心意，谢谢你的支持！
    </p>

    <div class="qr"><img :src="qr" alt="微信收款二维码" loading="lazy"></div>
    <p class="cap">微信扫一扫 · 感谢每一份支持 ❤️</p>

    <p class="src">词典兜底数据来源：<a href="https://github.com/gugray/HanDeDict" rel="license noopener" target="_blank">HanDeDict</a>（CC BY-SA 3.0）</p>

    <p class="share-tip">打赏之外 —— <b>把网站分享给同学</b>，也是莫大的支持 🙌</p>
    <div class="center">
      <button class="btn" type="button" @click="copyShare">{{ copied ? '✓ 已复制，去粘贴分享吧' : '📋 复制网址分享' }}</button>
    </div>

    <div class="contact">
      <div class="ct-h">💬 联系作者</div>
      <div class="ct-b">
        使用心得、纠错、想加的功能，都欢迎来聊：<br>
        QQ：<b class="qq">717986230</b>
      </div>
    </div>

    <div class="center back">
      <button class="ghost" type="button" aria-label="返回首页" @click="router.push('/home')">🙅 下次一定 →</button>
    </div>
    <p class="center legal">
      <button class="link" type="button" @click="router.push('/legal')">隐私政策 · 用户协议</button>
    </p>
  </div>
</template>

<style scoped>
.sp-p{font-size:14px;color:var(--text-dim);line-height:1.9;max-width:520px;margin:0 auto;text-align:center}
.sp-p b{color:var(--text)}
.qr{max-width:290px;margin:18px auto 0;background:#fff;border-radius:16px;padding:8px;box-shadow:var(--shadow)}
.qr img{width:100%;height:auto;display:block;border-radius:12px}
.cap{text-align:center;font-size:12px;color:var(--text-faint);margin-top:12px}
/* 旧站这行是 11px，本项目辅助文字下限 12px */
.src{text-align:center;font-size:12px;color:var(--text-dim);margin-top:18px}
.src a{color:var(--text-dim)}
.share-tip{text-align:center;font-size:13px;color:var(--text-dim);margin-top:22px}
.share-tip b{color:var(--text)}
.center{text-align:center}
.btn{position:relative;min-height:44px;padding:12px 24px;border-radius:24px;
  border:1px solid var(--gold-dim);background:var(--btn-bg);color:var(--gold-text);
  font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;margin-top:8px}
.contact{max-width:420px;margin:26px auto 0;padding:14px 18px;background:var(--surface-2);
  border:1px solid var(--border);border-radius:14px;text-align:center}
.ct-h{font-size:14px;color:var(--text);font-weight:600}
.ct-b{font-size:13px;color:var(--text-dim);margin-top:6px;line-height:1.8}
.qq{color:var(--gold-text);font-size:15px;letter-spacing:.5px}
.back{margin:32px 0 10px}
.ghost{position:relative;min-height:44px;border:1px solid var(--border);background:transparent;
  color:var(--text-dim);border-radius:20px;padding:6px 14px;font-size:13px;
  font-family:inherit;cursor:pointer}
.legal{margin:26px 0 4px}
.link{position:relative;background:none;border:none;font:inherit;font-size:13px;
  color:var(--text-dim);text-decoration:underline;cursor:pointer;padding:12px 8px;min-height:44px}
</style>
