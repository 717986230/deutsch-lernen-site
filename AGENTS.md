# 协作规则（Claude Code / Codex 共同遵守）

> 本文件是**给 AI 编码助手看的操作规则**。架构说明见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)，
> 面向用户的变更记录见 [`CHANGELOG.md`](CHANGELOG.md)。
> Codex 原生读 `AGENTS.md`；Claude Code 通过 `CLAUDE.md` 导入本文件。**两边规矩完全一致。**

---

## 0. 一句话

德语学习手册（www.uuoo.site）：**纯静态前端**（GitHub Pages）+ **一个 Cloudflare Worker + 一个 D1**。
面向中文母语者，主力场景是**手机浏览器**。

> **2026-08 变更**：站长决定**不再支持微信内置浏览器**，只需现代浏览器可用。
> 这解除了下面 1.2 的 ES5 约束，也让新端（`web/`）不再产出 legacy 包（省 195KB gz）。
> 迁移进度与新架构见 [`MIGRATION.md`](MIGRATION.md)。

---

## 1. 铁律（违反即返工）

### 1.1 构建产物一律不许手改
| 文件 | 性质 |
|---|---|
| `index.html` | **构建产物**，由 `src.html` + `data/*.json` 生成 |
| `sw.js` | **构建产物**（含内容哈希版本号） |
| `de.<hash>.dat` / `en.<hash>.dat` | **构建产物**（加密词库切片，文件名带内容哈希） |

改页面/功能 → 改 **`src.html`**；改词句/短文数据 → 改 **`data/*.json`**；然后：

```bash
npm run build        # = node build.mjs
```

这三类文件**要提交**（GitHub Pages 直接部署它们），但**只能由构建生成**。
手改 = 下次构建被覆盖 + git 冲突地狱（`index.html` 每次构建整文件变动）。

> 若 `node build.mjs` 报 `Cannot find package 'terser'`：容器/环境回收过 `node_modules`，跑 `npm install` 即可。

### 1.2 老内核兼容（ES5）——**仅对旧站 `src.html` 仍然有效**
> ⚠️ **新端 `web/` 不受此约束**（不再支持微信，见上）。本节只约束仍在服役的 `src.html`。

`src.html` 里的运行时 JS 原本面向**微信 X5、老 iOS WKWebView**：
- 用 `var` / `function`，避免 `let const` 之外的新语法进入热路径；**不用**可选链 `?.`、空值合并 `??`、`async/await`（构建不转译，只做 terser 压缩）
- `build.mjs` 已注入垫片：`Array.prototype.flatMap`、`Object.values/assign`、`TextDecoder` 兜底、
  `speechSynthesis` 缺失时的 no-op 桩。**不要假设这些 API 一定存在**。
- terser 配置带 `safari10:true`，规避老 WKWebView 的 let 循环 bug。

### 1.3 内容红线
- **不做 UGC**：不接受用户上传的文本/图片/头像。头像只能从预设 emoji + 预设背景色里选。
  （零存储、零外链、零审核负担——这是刻意的产品决策，别"顺手"加上传功能。）
- **不引外部资源**：无 CDN、无外链字体/图片/脚本。全站离线可用。
- 词库数据在构建时 XOR+Base64 加密，**不要把明文词库写进 `src.html`**。
  自检：`grep -c '"de":"Guten Morgen' index.html` 必须为 `0`。

### 1.4 运维极简
**一个 Worker + 一个 D1**，不新增服务、不新增第三方依赖。后端改动同步更新
`analytics/schema.sql` 与 `analytics/README.md` 的接口表。

---

## 2. 分工（两个 agent 同时在场时）

`src.html` 是 36 万字的单文件，**两边同时改必定冲突**。按**领域**分工，不要按时间穿插：

| 领域 | 文件 | 建议归属 |
|---|---|---|
| 内容数据 | `data/*.json`、`dict/*.json` | 适合 Codex（纯数据，冲突少、易合并） |
| 前端代码/样式/构建 | `src.html`、`build.mjs` | 适合 Claude Code（单文件，需全局上下文） |
| 后端 | `analytics/worker.js`、`schema.sql` | 谁动谁负责，同步改 README 接口表 |

**同一时刻只让一方改 `src.html`。** 另一方要动，先说一声或等对方提交完。

---

## 3. Git 约定

- `main` = 生产分支，推上去 GitHub Pages 自动部署到 www.uuoo.site
- 开发在特性分支，完成后 `git checkout main && git merge --ff-only <branch>`
- **提交前必须**：`git pull --rebase` → `npm run build` → 确认 `git status` 干净
- 别把已合并的历史再堆新提交；分支被 rebase 过就用 `--force-with-lease`
- 提交信息用中文，说清**为什么**改，附实测数据（体积/耗时/对比度等）

---

## 4. 提交前自检（最低标准）

```bash
npm run build                                   # 必须打印「✓ 构建完成」
grep -c '"de":"Guten Morgen' index.html         # 必须是 0（无明文泄漏）
```

改了前端逻辑，**必须**跑一次浏览器验证（本仓库用 Playwright + 预装 Chromium）：

```js
// 关键点：登录墙会挡住一切，先塞 token；file:// 取不到 .dat，必须起 http server
import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', e => console.log('ERR', e));            // 必须为 0
await p.addInitScript(() => localStorage.setItem('acct_token', 't1'));
await p.goto('http://localhost:8000/index.html', { waitUntil: 'networkidle' });
await p.waitForFunction(() => window._DEC);               // 等德语词库到货
```

回归至少覆盖这些版块：
`home phrases reading series dialog spell quiz rank grammar pronunciation numbers support me`

---

## 5. 数据结构备忘

| 文件 | 结构 |
|---|---|
| `data/categories.json` | `[{name, level, icon, phrases:[{de, zh, py}]}]`，level ∈ `0/a1/a2/b1/b2` |
| `data/readings.json` | `[{level, title, zh, topic?, paras:[[de, zh, py]]}]` — **三元素**，全部 673 句已有谐音 |
| `data/series.json` | 同上 **三元素**（留学连载，96 句已于 2026-08 全部补齐谐音） |
| `data/read_gloss.json` | `{小写词: [显示形, 中文]}`，逐词小注兜底表 |

- 短文渲染层以 `p[2]` 是否存在为条件（历史上 `series` 只有两元素）。现在两份数据都是三元素，
  `tools/verify-data.mjs` 对二者都强制校验谐音，**加新短文/新连载时必须一并补谐音**，否则 `npm run verify` 直接失败。
- `topic:"restaurant"` 的短文归入「🍽️ 餐厅」标签，且**不出现在**分级短文列表里。
- 谐音风格：逐词以空格分隔、标点用全角（例：`古腾 阿本特！瓦斯 麦希腾 齐 特林肯？`）。

---

## 6. 已经踩过的坑（别再踩）

1. **JS 字符串里拼 HTML，引号必须转义**
   `ed.innerHTML='... onkeydown="if(event.key===\'Enter\')..."'` —— 漏了 `\` 会提前截断字符串，
   terser 直接报 `Unexpected token`，且 `index.html` **不会重新生成**（构建抛错即中止），
   于是"改了没生效"。构建失败时先看是不是这个。

2. **深浅双主题 + 对比度**：新颜色一律走 CSS 变量（`:root` 与 `:root[data-theme=dark]` 两处都要给值）。
   小字（<18px）对比度需 ≥ 4.5:1。**品牌绿 `#58cc02` 在浅色底上当文字只有 2.1:1**，
   浅色底上的绿字请用 `--gold-text`。

3. **分批渲染要带代号**：`renderReadings` 用 rAF 分批追加；切换标签/级别时旧循环必须作废
   （`_rdGen`），否则旧文章会继续追加进新列表。

4. **触摸目标**：视觉尺寸可以小，但可点范围要 ≥44px——用透明 `::after` 撑开，别改视觉尺寸。

5. **别把可访问性/对比度问题"看截图"下结论**：本仓库的容器只有点阵中文字体，
   竖排（`writing-mode`）渲染不可信；判断要靠**量数值**（`getBoundingClientRect`、对比度计算），
   不要凭截图观感就改。
