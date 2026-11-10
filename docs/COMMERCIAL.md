# 会员与收款（2026-11-10 起）

**模式**：现有内容全部免费；会员解锁「会员课包」。收款在站外，站内只认兑换码。

| 项 | 现状 |
|---|---|
| 价格 | 年卡 ¥68 / €9；永久 ¥128 / €16（`src.html` 里 `PRO_CFG.plans`，改价只改这里） |
| 购买渠道 | 暂为「加作者微信」付款后发码；开了售卖页（如爱发电商品自动发码）后把链接填进 `PRO_CFG.buyUrl` |
| 发码 | `stats.html` →「生成会员兑换码」，需要 STATS_KEY；码只显示一次 |
| 兑换 | 「我的 → 会员 · 兑换码」，`POST /api/redeem` |
| 课包 | `analytics/packs/<id>.json`，在 `worker.js` 的 `PRO_PACKS` 登记，在 `PRO_CFG.packs` 加目录与 3 句试看 |
| 体检 | `tools/verify-pro.mjs`（一码一用、哈希存储、续期叠加、过期关闭、猜码限流、注销删除、课包字段/谐音） |

## 已知限制
- 仓库是公开的：课包 JSON 在 GitHub 上可以被看到。网站本身只把课包发给会员。要彻底不可见，需要把仓库设为私有
  （GitHub Pages 用私有仓库需要付费套餐），或者把课包移到不公开的存储。这件事由站长决定。
- 新增课包要部署后端（rj-yy 的「部署手册后端」workflow）才会生效。

## 新增一个课包
1. 写 `analytics/packs/<id>.json`（结构同 arzt.json：units[{id,icon,name,tip,phrases[{de,zh,py,n?,k?}]}]，`k:1` 表示「会听到的话」）
2. `worker.js` 的 `PRO_PACKS` 里 import 并登记
3. `src.html` 的 `PRO_CFG.packs` 加目录项（含 3 句试看），`data/whatsnew.json` 加一条上新
4. `npm run build && npm run verify`，合并后跑后端部署 workflow
