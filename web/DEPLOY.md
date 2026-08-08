# 部署与灰度

## 现状（2026-08-08 已切换）

**Vue 用户端是唯一生产入口**，走 GitHub Pages，无需 Cloudflare Pages：

| 文件 | 谁 | 访问 |
|---|---|---|
| `index.html` + `assets/` + `data/` + `sw.js` | Vue 用户端 | www.uuoo.site ← **当前生产** |
| 旧站发布产物 | 已删除 | 不再公开提供 |

`web/` 的 vite 配置把产物直接输出到**仓库根**（`outDir:'..'`、`emptyOutDir:false`），
所以流程就是：`cd web && npm run build` → 提交 → 推 main → 上线。

推送 `main` 后，GitHub Pages 会从根目录自动发布；`.github/workflows/deploy-web.yml`
只负责构建一致性和内容校验，不再尝试上传不存在的 `web/dist`。

## ⚠️ 切换域名前必读：localStorage 不跨域

学习进度（`study` / `knownWords` / `badges_seen`）存在**浏览器本地**，
而 localStorage **按域名隔离**。这意味着：

- **同域名替换**（www.uuoo.site 指向新端）→ 进度自然延续，但无法灰度
- **换域名**（如 new.uuoo.site）→ 老用户进度**不会带过去**

已登录用户的 `known/streak/total/quiz` 在服务端有副本，重新登录能恢复大部分；
但**未登录用户的本地进度会丢**。

同域名替换后，老用户的 localStorage 原样延续。旧站发布产物已删除；如需回退，
使用 Git 历史恢复上一版根目录产物，再推送 `main`。

## 一键部署脚本

仓库根目录的 `deploy.sh` 覆盖后端、Vue 端与体检：

```bash
bash deploy.sh          # 后端 + Vue 端
bash deploy.sh backend  # 只部署后端（Worker + D1 迁移）
bash deploy.sh web      # 构建 Vue 根产物，推 main 后上线
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
