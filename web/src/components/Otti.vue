<script setup>
/* 吉祥物「小獭 Otti」：水彩绘本风的水獭女孩（暖棕皮毛、奶白肚皮、淡青鳞片指尖、水草绳贝壳吊坠）。
   图片是站长提供的设定稿抠图，放在 public/otti/，按场景换姿势和表情——不要到处用同一张：

   | scene   | 图                   | 用在哪里                               |
   |---------|----------------------|----------------------------------------|
   | hello   | 正面站立、举手挥动   | 首页问候                               |
   | face    | 正脸头像             | 登录                                   |
   | curious | 睁大眼（带刘海）     | 注册、找回密码                         |
   | swim    | 浮在水面上           | 各页「加载中」                         |
   | nap     | 浮在水面上睡着       | 空状态（没有动态、没人上榜、筛选为空） |
   | happy   | 眯眼笑               | 答对 / 拼对                            |
   | sorry   | 闭眼抿嘴             | 答错 / 拼错、出错提示                  |
   | cheers  | 坐着捧小罐子         | 一轮全对、支持作者（请喝一杯）         |
   | study   | 坐着捧罐子侧头看     | 每日一句弹窗、一轮有错题：再练练       |
   | walk    | 侧身站立             | 关注列表为空：去逛逛排行榜             |
   | bye     | 背影                 | 404                                    |
*/
const props = defineProps({
  scene: { type: String, default: 'hello' },
  /** 高度（px）；swim / nap 是横图，默认矮一些 */
  h: { type: Number, default: 0 },
  bob: { type: Boolean, default: false },
});
const ALT = {
  hello: 'Otti 在打招呼', face: 'Otti', curious: 'Otti 好奇地看着你', swim: 'Otti 在水里游',
  nap: 'Otti 睡着了', happy: 'Otti 开心地笑', sorry: 'Otti 有点难过', cheers: 'Otti 捧着小罐子',
  study: 'Otti 认真地看', walk: 'Otti 侧身站着', bye: 'Otti 的背影',
};
const HEAD = ['face', 'curious', 'happy', 'sorry'];
const WIDE = ['swim', 'nap'];
const height = () => props.h || (WIDE.includes(props.scene) ? 52 : HEAD.includes(props.scene) ? 72 : 132);
const base = import.meta.env.BASE_URL;
const src = () => `${import.meta.env.BASE_URL}otti/${props.scene}.webp`;
</script>

<template>
  <figure class="otti" :class="{ bob }">
    <!-- 打招呼：身体和举起的手臂分两层，手臂绕肩膀挥 -->
    <span v-if="scene === 'hello'" class="otti-wave" role="img" :aria-label="ALT.hello" :style="{ height: height() + 'px' }">
      <img :src="`${base}otti/hello-body.webp`" alt="" draggable="false" decoding="async">
      <img class="otti-arm" :src="`${base}otti/hello-arm.webp`" alt="" draggable="false" decoding="async">
    </span>
    <img v-else :src="src()" :alt="ALT[scene] || 'Otti'" :style="{ height: height() + 'px' }" draggable="false" decoding="async">
    <figcaption v-if="$slots.default"><slot /></figcaption>
  </figure>
</template>

<style scoped>
.otti{display:flex;flex-direction:column;align-items:center;gap:6px;margin:0}
.otti img{width:auto;max-width:100%;object-fit:contain;user-select:none;-webkit-user-drag:none}
.otti figcaption{font-size:14px;color:var(--text-2);text-align:center;line-height:1.6}
.otti.bob img{animation:otti-bob 1.6s ease-in-out infinite}
@keyframes otti-bob{50%{transform:translateY(-4px) rotate(-1.5deg)}}
.otti-wave{position:relative;display:inline-block;aspect-ratio:450/560;animation:otti-hop 2.6s ease-in-out infinite}
.otti-wave img{position:absolute;inset:0;width:100%;height:100%}
.otti-arm{transform-origin:20.8% 46.5%;animation:otti-arm 2.6s ease-in-out infinite}
@keyframes otti-arm{0%,60%,100%{transform:rotate(0)}12%{transform:rotate(-16deg)}24%{transform:rotate(10deg)}36%{transform:rotate(-14deg)}48%{transform:rotate(6deg)}}
@keyframes otti-hop{0%,60%,100%{transform:translateY(0)}18%,42%{transform:translateY(-5px)}}
@media (prefers-reduced-motion:reduce){.otti.bob img,.otti-wave,.otti-arm{animation:none}}
</style>
