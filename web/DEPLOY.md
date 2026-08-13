# 部署与灰度

## 现状（2026-08）

**生产已切到 Vue 新端。** 旧站保留为同域回退文件；Vue 页面以旧站为视觉和交互基准。

> **方向决策（2026-08-13）**：后续只维护 Vue 端；旧站作为视觉和交互基准以及回退
> 方案。Vue 不再引入新的页面风格，逐页一致性验收后直接发布到同域 GitHub Pages。

| 文件 | 谁 | 访问 |
|---|---|---|
| `index.html` + `assets/` + `data/` | Vue 新端 | www.uuoo.site ← **当前生产** |
| `legacy.html` + `sw-legacy.js` + `*.dat` | 旧站 | 同域回退文件 |
| `web/dist/` | Vue 构建中间产物 | `.gitignore` 中 |

`web/` 的 vite 产物输出到 `web/dist`，每次构建自清。
**不要**把 Vite 的 `outDir` 指回仓库根——文件名带内容哈希，那样每构建一次会留孤儿文件。
上线时由 `deploy.sh web` 或手工将 `web/dist/.` 整份覆盖到根；旧站回退文件必须保留。

**切换与回退的完整命令见 [`../ROLLBACK.md`](../ROLLBACK.md)**，不用碰 DNS。

## 回退

按 [`../ROLLBACK.md`](../ROLLBACK.md) 恢复 `legacy.html` 和 `sw-legacy.js`，推送 `main` 后 GitHub Pages 会自动发布。

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
