# 德语学习手册 · www.uuoo.site

中国人自学德语，一个网页全搞定：3900+ 词句（含中文谐音与拼读拆解）、点词即听朗读、
语法全例句拆解 + 即学即练、分级阅读与留学连载（逐词中文标注）、互动测验。
完全免费、无广告、离线可用。

- 正式站：https://www.uuoo.site/
- 备用地址：https://717986230.github.io/deutsch-lernen-site/

## 项目架构

```
data/
  categories.json      德语词库（分类 → 词句，一条目一行，改词只动这里）
  en_categories.json   英语词库
  readings.json        分级阅读短文
  series.json          留学连载
dict/                  HanDeDict 兜底词典分片：de_* 单词 8.2万 / ph_* 短语 4万（按需加载）
tools/make_dict.py     从 HanDeDict 源数据再生成 dict/ 分片
tools/make_readgloss.py 为阅读/连载预生成小注词表 data/read_gloss.json（内联加密）
web/                   Vue 用户端源码（待再次发布）
web/dist/              Vue 构建中间产物（不提交）
index.html + sw.js     当前旧端部署产物，由 GitHub Pages 发布
legacy.html            旧端备用入口；再次切换 Vue 前用于同域回退
src.html + build.mjs   旧端源码与构建器
de/en.<hash>.dat       旧端词库切片
manifest.webmanifest   PWA 清单
```

## 日常维护

```bash
cd web && npm install       # 首次
npm run build               # 生成 web/dist
cd .. && bash deploy.sh web # 同步 Vue 产物到站点根目录
npm run verify              # 校验生产与旧端回退文件
```

- **加词/改词/加分类**：改 `data/*.json`，然后构建 Vue 端。
- **改页面/样式/功能**：改 `web/src/`，然后执行 `bash deploy.sh web`。
- **发布 Vue**：提交同步后的根目录 `index.html`、`assets/`、`data/`、`sw.js`，推到 `main`；GitHub Pages 自动发布。
- **旧端维护或切换**：参见 [ROLLBACK.md](ROLLBACK.md)。

## 词典兜底

点词查义 / 拼读器翻译：先查站内人工词库（3900+，含谐音），查不到再按首字母
懒加载 `dict/de_*.json`（约 8.2 万键，反向抽取自
[HanDeDict](https://github.com/gugray/HanDeDict)，CC BY-SA 3.0，已在支持页署名），
含变位/复数/变音词形还原。重新生成：`python3 tools/make_dict.py <handedict.u8>`。

## 兼容性要点

构建时会在首个数据声明前注入 ES5 解码器与垫片（TextDecoder 回退、flatMap/Object.values/
Object.assign polyfill、speechSynthesis no-op 桩），保证微信安卓 X5 等老内核可用；
朗读在无 Web Speech API 的环境静默降级。
