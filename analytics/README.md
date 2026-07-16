# uuoo 后端（Cloudflare Workers + D1）

一个 Worker 干两件事：**匿名埋点**（/collect、/stats）和**账号/排行榜/徽章**（/api/*）。
自有全部数据，免费额度对个人站足够。埋点只存匿名事件；账号存用户名/昵称（密码只存哈希）。

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

## 账号 / 排行榜 / 徽章（/api/*）

已有部署要**更新代码 + 补建表**（在 analytics 目录）：

```bash
wrangler d1 execute uuoo_analytics --file=schema.sql --remote   # 新增 users/sessions/oauth_state 表（IF NOT EXISTS，安全重跑）
wrangler deploy                                                 # 部署新版 worker.js
```

接口一览：
- `POST /api/register` `{username,password,nickname}` → `{token,user}`
- `POST /api/login` `{username,password}` → `{token,user}`
- `POST /api/sync`（带 `Authorization: Bearer <token>`）`{known,streak,best,total,quiz,level}` → 更新数据、返回已点亮徽章
- `GET  /api/me`（带 token）→ 自己的资料 + 排名
- `GET  /api/leaderboard?by=known|streak|total` → Top 50
- `GET  /api/profile?name=<用户名>` → 公开主页数据

### GitHub 登录（可选）

1. GitHub → Settings → Developer settings → **OAuth Apps** → New OAuth App
   - Homepage URL：`https://www.uuoo.site`
   - **Authorization callback URL**：`https://uuoo-analytics.<你的子域>.workers.dev/api/oauth/github/callback`
2. 拿到 **Client ID** 填进 `wrangler.toml` 的 `GH_CLIENT_ID`；**Client Secret** 用密钥方式存：
   ```bash
   wrangler secret put GH_CLIENT_SECRET   # 回车后粘贴 secret
   wrangler deploy
   ```
   不配置 GitHub 登录也没关系，用户名+密码照常可用。

## 合规提醒

匿名统计 + 账号信息在国内均受《个人信息保护法》约束。建议在页面底部/支持页写明
"本站仅记录匿名使用统计以改进功能；账号仅保存用户名、昵称与密码哈希"，需要时可删库。
