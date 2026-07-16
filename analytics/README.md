# uuoo 埋点后端（Cloudflare Workers + D1）

自有全部日志明细，免费额度对个人站足够。数据只存匿名事件，不含个人信息。

## 一次性部署（约 5 分钟）

需要先装 Node 和 wrangler：`npm i -g wrangler`，然后 `wrangler login`。

```bash
cd analytics

# 1) 创建 D1 数据库（记下输出里的 database_id）
wrangler d1 create uuoo_analytics
#   把 database_id 填进 wrangler.toml；再把 STATS_KEY 改成你的随机密钥

# 2) 建表
wrangler d1 execute uuoo_analytics --file=schema.sql --remote

# 3) 部署 Worker（得到形如 https://uuoo-analytics.<你的子域>.workers.dev 的地址）
wrangler deploy
```

## 让网站开始上报

把上面 Worker 地址 + `/collect` 填到 `src.html` 顶部脚本里的：

```js
var TRACK_URL="https://uuoo-analytics.<你的子域>.workers.dev/collect";
```

然后 `npm run build` 重新生成 index.html 并部署。留空则完全不采集、零请求。

## 看数据

浏览器打开（key 换成你的 STATS_KEY）：

```
https://uuoo-analytics.<你的子域>.workers.dev/stats?key=你的密钥&days=7
```

返回 JSON：`pv`(访问量) `uv`(匿名访客数) `byEvent`(各事件计数) `byView`(各页面浏览)。

## 采集了什么

只有匿名事件：`view`(看了哪个版块) `study`(发生一次学习动作) `lang`(切换语言) `install`(安装到桌面)。
每个带匿名访客ID（localStorage 随机串）、时间、页面、UA、国家码。**不采集姓名/手机/位置等个人信息。**
用户设了浏览器 Do-Not-Track，或 localStorage 里 `_noTrack=1`，则自动不采集。

## 合规提醒

采集使用统计在国内受《个人信息保护法》约束。建议在页面底部/支持页加一句
"本站仅记录匿名使用统计以改进功能"，只保留匿名数据、需要时可删库。
