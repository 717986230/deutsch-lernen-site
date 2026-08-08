# 部署与灰度

## 现状（2026-08 已切换）

**Vue 新端已成为生产**，走 GitHub Pages，无需 Cloudflare：

| 文件 | 谁 | 访问 |
|---|---|---|
| `index.html` + `assets/` + `data/` | Vue 新端 | www.uuoo.site ← **当前生产** |
| `legacy.html` + `*.dat` | 旧站（保留） | www.uuoo.site/legacy.html |

`web/` 的 vite 配置把产物直接输出到**仓库根**（`outDir:'..'`、`emptyOutDir:false`），
所以流程就是：`cd web && npm run build` → 提交 → 推 main → 上线。

**回退见 [`../ROLLBACK.md`](../ROLLBACK.md)**，两条 cp 命令即可，不用碰 DNS。

## 首次部署（约 10 分钟）

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → **Direct Upload**
   项目名填 `uuoo-web`，先手动传一次 `web/dist` 把项目建出来
2. 拿到临时域名 `uuoo-web.pages.dev`，**先自己用几天**
3. 配置 GitHub Actions 自动部署，在仓库 Settings → Secrets 添加：
   - `CF_API_TOKEN`（Cloudflare → My Profile → API Tokens → 用 "Edit Cloudflare Workers" 模板）
   - `CF_ACCOUNT_ID`（Dashboard 右侧栏可见）
   此后推 `main` 且改动 `web/` 或 `data/` 就会自动构建部署

## ⚠️ 切换域名前必读：localStorage 不跨域

学习进度（`study` / `knownWords` / `badges_seen`）存在**浏览器本地**，
而 localStorage **按域名隔离**。这意味着：

- **同域名替换**（www.uuoo.site 指向新端）→ 进度自然延续，但无法灰度
- **换域名**（如 new.uuoo.site）→ 老用户进度**不会带过去**

已登录用户的 `known/streak/total/quiz` 在服务端有副本，重新登录能恢复大部分；
但**未登录用户的本地进度会丢**。

推荐路径：
1. 用 `uuoo-web.pages.dev` 内部验证（自己用，不宣传）
2. 确认无误后，**直接把 www.uuoo.site 指向 Cloudflare Pages**——同域名替换，
   老用户 localStorage 原样延续，零感知
3. 旧站 `index.html` **保留在仓库里不要删**，出问题把 DNS 切回 GitHub Pages 即可

## 回退

DNS 切回 GitHub Pages，5 分钟内生效。代码无需任何改动。

## 一键部署脚本

仓库根目录的 `deploy.sh` 覆盖后端、Vue 端与体检：

```bash
bash deploy.sh          # 后端 + Vue 端
bash deploy.sh backend  # 只部署后端（Worker + D1 迁移）
bash deploy.sh web      # 只部署 Vue 端
bash deploy.sh check    # 只体检，不部署任何东西 ← 建议先跑这个
```

**它替你挡掉的坑**（都是实际踩过的）：

| 情况 | 脚本行为 |
|---|---|
| 在家目录运行 | 直接拒绝——wrangler 会扫 `~/.Trash`，macOS 报权限错误 |
| wrangler 未登录 | 明确提示 `wrangler login`，而不是含糊报错 |
| 动 D1 数据前 | **强制先备份**，备份失败就中止 |
| 校验不通过 | 中止部署，不会把坏数据推上线 |
| 明文词库泄漏进产物 | 中止 |
| 迁移脚本重复执行 | `duplicate column` 视为正常，不算失败 |

`analytics/deploy.sh` 是早期的独立目录版，只做最小动作、**不备份**。
在仓库里操作请用根目录这个。
