# 管理后台（Vue 3 + Element Plus）

桌面场景，**不需要** legacy/ES5（那是用户端为兼容微信老内核才要的）。

```bash
cd admin && npm install
npm run dev
npm run build
```

## 鉴权

用 `/stats` 接口的 `STATS_KEY`（`wrangler secret put STATS_KEY` 设置的那串）。
key 存 **sessionStorage**，关掉标签页即失效——共用电脑时不会被顺走。

## 当前能力

- 数据概览：PV / UV / 注册用户 / 人均浏览，7·30·90 天切换
- 事件排行、版块访问排行
- 事件明细

## 注意

`/stats` 目前只返回**聚合数据**，不含任何个人信息。若要按用户下钻，
需在 `worker.js` 新增接口——**务必先想清楚后台该不该看到手机号/邮箱**，
这些是个人信息，现有设计是连 `/api/me` 都只回掩码。
