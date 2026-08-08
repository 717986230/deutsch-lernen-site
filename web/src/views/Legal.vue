<script setup>
// 隐私政策与用户协议。收集邮箱/手机号的合规前提，注册页在同意前必须能看到全文。
// 运营主体与联系邮箱为公开信息——隐私政策必须能被联系到，否则政策不成立。
const OWNER = 'uuoo.site 站长';
const CONTACT = 'xinglyang717@gmail.com';
</script>

<template>
  <div class="page">
    <h1 class="page-title">隐私政策 · 用户协议</h1>
    <p class="page-sub">最后更新：2026 年 8 月</p>

    <h2 class="lg-h">一、我们收集什么</h2>
    <p class="lg-p">本站坚持<b>最小必要</b>原则，只收集下面这些：</p>
    <ul class="lg-ul">
      <li><b>账号信息</b>：用户名、昵称、密码。密码<b>不以明文存储</b>，只保存加盐哈希（PBKDF2-SHA256，10 万次迭代），任何人（包括站方）都无法反推出你的原始密码。</li>
      <li><b>邮箱（选填）</b>：<b>仅用于你忘记密码时找回账号</b>，不会用于推送、营销，也不会提供给任何第三方。可以不填，也可随时在「我的」里修改或删除。<b>本站不收集手机号。</b></li>
      <li><b>学习数据</b>：掌握词数、连续打卡天数、答题数，用于生成学习进度与排行榜。</li>
      <li><b>匿名访问统计</b>：页面访问量、点击的功能名、浏览器类型、<b>所在城市</b>、<b>停留时长</b>，以及<b>截断后的 IP</b>（如 <code>1.2.3.4</code> 只记为 <code>1.2.3.0</code>，IPv6 只保留前段）。截断后无法定位到具体个人，仅用于了解访客来自哪些地区、哪些功能有人用。这部分<b>不与账号关联</b>。<br>如需关闭，在浏览器控制台执行 <code>localStorage._noTrack='1'</code> 即可。</li>
    </ul>
    <p class="lg-p"><b>我们不收集</b>：<b>手机号</b>、真实姓名、身份证号、住址、精确位置、通讯录、相册。本站<b>不接受任何用户上传</b>（无头像上传、无评论、无图片），头像只能从预设 emoji 中选择。</p>

    <h2 class="lg-h">二、如何使用与保护</h2>
    <ul class="lg-ul">
      <li>邮箱在页面上<b>始终以掩码显示</b>（如 <code>t***@qq.com</code>），完整内容不会返回浏览器。</li>
      <li>登录凭证为随机令牌，全站通过 HTTPS 加密传输。</li>
      <li>数据存储于 Cloudflare D1，仅站方运维人员可访问。</li>
      <li><b>我们不出售、不出租、不交换你的任何个人信息。</b></li>
    </ul>

    <h2 class="lg-h">三、你的权利</h2>
    <ul class="lg-ul">
      <li><b>查看与更正</b>：在「我的」中查看和修改资料。</li>
      <li><b>删除邮箱</b>：把邮箱清空保存即为删除。</li>
      <li><b>注销账号</b>：注销后账号、昵称、邮箱、学习数据将被<b>永久删除且不可恢复</b>。</li>
      <li><b>撤回同意</b>：删除邮箱或注销账号即视为撤回相应授权。</li>
    </ul>

    <h2 class="lg-h">四、Cookie 与本地存储</h2>
    <p class="lg-p">本站使用浏览器本地存储保存登录状态、学习进度与偏好设置。这些数据存在你自己的设备上。清除浏览器数据会导致本地进度丢失，但已同步的数据可在重新登录后恢复。</p>

    <h2 class="lg-h">五、未成年人</h2>
    <p class="lg-p">本站为语言学习工具，不针对 14 周岁以下儿童设计。若你未满 18 周岁，请在监护人指导下使用。如发现误收集了儿童个人信息，我们会尽快删除。</p>

    <h2 class="lg-h">六、用户协议</h2>
    <ul class="lg-ul">
      <li>本站内容<b>仅供语言学习参考</b>。释义与谐音由人工整理，可能存在疏漏，<b>不构成任何专业建议</b>。</li>
      <li>请勿利用本站从事违法活动，勿尝试攻击、爬取或干扰服务。</li>
      <li>本站为个人业余项目，<b>免费提供、不作可用性承诺</b>，可能因维护或不可抗力中断。</li>
      <li>在法律允许范围内，站方不对使用本站产生的间接损失承担责任。</li>
      <li>本站保留修改本协议的权利，重大变更会在本页公示。</li>
    </ul>

    <h2 class="lg-h">七、联系我们</h2>
    <p class="lg-p">对隐私或本协议有疑问，或需行使上述权利，请联系：<br><a :href="`mailto:${CONTACT}`" class="mail">{{ CONTACT }}</a></p>
    <p class="lg-p lg-owner">运营主体：<b>{{ OWNER }}</b></p>
  </div>
</template>

<style scoped>
.lg-h{font-size:17px;font-weight:600;margin:26px 0 8px}
.lg-p{font-size:14px;color:var(--text-2);line-height:1.85;margin:0 0 10px}
.lg-ul{margin:0 0 10px;padding-left:20px}
.lg-ul li{font-size:14px;color:var(--text-2);line-height:1.85;margin-bottom:8px}
/* 长串必须能断行：这段代码片段和下面的邮箱都是不可断的整词，
   窄屏/放大到 200% 时会把整个文档撑宽，全站出现横向滚动条 */
/* 必须显式给 color：继承 .lg-p 的 --text-2 压在 code 的浅灰底上只有 4.39:1 */
code{background:var(--line);color:var(--text);padding:1px 5px;border-radius:4px;font-size:13px;
  overflow-wrap:anywhere;word-break:break-all}
.lg-owner{font-size:12px;color:var(--text-3)}
/* 邮箱是这一页唯一的可点目标，行内 16px 高远不够 44px —— 撑成块级并加内边距 */
.mail{display:inline-block;padding:14px 0;color:var(--brand-text);font-weight:600;overflow-wrap:anywhere}
</style>
