# uuoo 后端（Cloudflare Workers + D1）

一个 Worker 干两件事：**匿名埋点**（/collect、/stats）和**账号/排行榜/徽章**（/api/*）。
自有全部数据，免费额度对个人站足够。埋点只存匿名事件；账号存用户名/昵称（密码只存哈希）。

## 一次性部署（约 5 分钟）

需要先装 Node 和 wrangler：`npm i -g wrangler`，然后 `wrangler login`。

```bash
cd analytics

# 1) 创建 D1 数据库（记下输出里的 database_id）
wrangler d1 create uuoo_analytics
#   把 database_id 填进 wrangler.toml

# 2) 建表
wrangler d1 execute uuoo_analytics --file=schema.sql --remote

# 3) 部署 Worker（得到形如 https://uuoo-analytics.<你的子域>.workers.dev 的地址）
wrangler deploy

# 4) 设置统计查询密钥；真实值不要写进 wrangler.toml 或提交到仓库
wrangler secret put STATS_KEY
```

## 让网站开始上报

把上面 Worker 地址 + `/collect` 填到 `src.html` 顶部脚本里的：

```js
var TRACK_URL="https://uuoo-analytics.<你的子域>.workers.dev/collect";
```

然后 `npm run build` 重新生成 index.html 并部署。留空则完全不采集、零请求。

## 看数据

浏览器打开（key 换成你通过 `wrangler secret put STATS_KEY` 设置的值）：

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
wrangler d1 execute uuoo_analytics --file=migrate-progress-documents.sql --remote # 已有库：增加学习明细表
wrangler d1 execute uuoo_analytics --file=schema.sql --remote   # 新库建表 / 已有表安全跳过
wrangler deploy                                                 # 部署新版 worker.js
```

接口一览：
- `POST /api/register` `{username,password,nickname,email?}` → `{token,user,recovery}`（邮箱选填，仅用于找回密码；**手机号已下线**）
- `POST /api/login` `{username,password}` → `{token,user}`
- `GET /api/progress?lang=de|en`（带 token）→ 取得该语言的词汇掌握、复习、错词、日课与最近学习明细
- `PUT /api/progress`（带 token）`{lang,rev,document}` → 写入该语言学习明细；版本冲突返回 `409` 及服务端版本，客户端合并后重试
- `POST /api/sync`（带 token）`{lang,known,streak,best,total,quiz,level}` → 更新排行榜/徽章用的摘要，明细由 `/api/progress` 单独恢复
  - 数值上限：`known` ≤ 20000、`streak`/`best` ≤ 3650、`total`/`quiz` ≤ 1000000。这几列入库走 `MAX()`（多设备合并必需，换设备时不能让本地的 0 清空云端），**代价是只能往上不能往下**，所以上限必须说得通 —— 德语 4253 条 + 英语 7192 条词，20000 已是「全站都认识」还富余一倍。彻底杜绝刷分要服务端记分，本站是离线优先、客户端权威，做不到。
  - 学习动态（`activity`）**只在 `lang=de` 时写**：去重靠 `users.badges` / `users.best_streak`，而这两列只有德语分支回写。英语分支下 `old.badges` 永远是旧值，同一批徽章每同步一次就重插一次（实测同内容连同步 9 次，`activity` 从 6 行涨到 54 行）。写入前还会查一次已有动态兜底。
- `POST /api/profile/update`（带 token）`{nickname?,avatar?,av_bg?,sig?,email?,password?}` → 改资料与邮箱；邮箱传空字符串＝删除。**phone 字段已不再接受**
  - ⚠️ **改动 `email` 必须带 `password` 重验当前密码**（与「重新生成恢复码」同规矩）：找回邮箱是账号的第二把钥匙，只凭会话就能改的话，借到一台已登录的手机即可 `email_code` → `reset` 拿走整个账号。密码错返回 400 并计入登录频控桶。
  - 第三方登录账号（`provider≠pw`）**不允许**设置找回邮箱 —— 它们没有密码可二次验证，丢失访问的正解是回去用 GitHub/Google 重新登录。
  - 邮箱一旦变更，`email_ok` 归零、未用完的验证码（`mail_*`）一并清空。
- `GET  /api/me`（带 token）→ 自己的资料 + 排名；`email` **只返回掩码**（如 `t***@qq.com`），另有 `hasEmail` 布尔位。**不再返回 phone**
- `GET  /api/leaderboard?by=known|streak|total` → Top 50（`badges` 是**数量**，不是列表）
- `GET  /api/profile?name=<用户名>` → 公开主页数据（带 token 时含 isFollowing/关注数）
- `POST /api/follow` / `POST /api/unfollow`（带 token）`{name}` → 关注 / 取关
- `GET  /api/following`（带 token）→ 我关注的人列表
- `GET  /api/feed`（带 token）→ 学习动态：关注的人+自己的系统事件（点亮徽章/打卡破纪录）
- `GET  /api/leaderboard?by=...&scope=friends`（带 token）→ 好友榜（只含我和我关注的人）
- `POST /api/account/password`（带 token）`{old,new}` → 修改密码（仅密码账号；成功后踢掉除当前外全部会话）
- `POST /api/account/delete`（带 token）密码账号传 `{password}`、第三方账号传 `{confirm:自己的用户名}` → 注销账号（硬删，不可恢复）
- `POST /api/account/recovery`（带 token）`{password}` → 重新生成恢复码（密码账号须验当前密码），返回 `{recovery}`，**旧码立即作废**
- `POST /api/account/email_code` `{username}` → 给该账号绑定的邮箱发 6 位验证码（10 分钟有效）。**无论账号/邮箱是否存在、发信成功与否，都返回同一句 200**，防账号枚举
  - 发信失败以前回 500 —— 但走到发信这步时「账号存在」和「绑了邮箱」两道门槛都已经过了，于是 500/200 的差异等于告诉攻击者哪些账号可下手（`email_code` → `reset` 接管链的第一步）。现在故障走 `console.error`，站长用 `wrangler tail` 看。
- `POST /api/account/reset` `{username,new,code?|emailCode?}` → 重置密码（无需登录）。**恢复码与邮箱验证码二选一**；成功后踢掉全部会话、返回新 token 与**一枚新恢复码**；走邮箱通道会顺带标记 `email_ok=1`
  - ⚠️ 只对**密码账号**开放：`provider≠pw` 且没有 `pass_hash` 的账号一律按失败处理。否则等于凭一封邮件给第三方账号凭空造出一条用户名+密码通道（`/api/login` 只看 `pass_hash`，不看 `provider`）。
- `POST /api/logout`（带 token）→ 登出当前会话（幂等）
- `POST /api/logout_all`（带 token）→ 踢掉除当前外全部会话，返回 `{ok,revoked}`

### 徽章：存量列 vs 读时派生

`users.badges`（逗号分隔）**只有 `POST /api/sync` 会回写**；`/api/register` 与 OAuth 建号的
INSERT 都不写它，默认空串。所以这一列不能当唯一真值——一个注册后还没同步过的账号，
它是空的。

`creator/founder` 这类**只由 `users.id` 决定、与学习进度无关**的徽章，因此在四个读接口里
统一由 `badgeList(stored, uid)` 在返回前补齐（`/api/me`、`/api/profile`、
`/api/leaderboard`、`/api/following`）。`badges` 列退化为缓存，历史数据无需迁移。

> 创始人 = `users.id <= FOUNDER_MAX`（当前 100）。`users.id` 是 AUTOINCREMENT，
> **注销的账号会永久占掉号段、不会有人补位**——想调整名额改 `FOUNDER_MAX` 常量。

`/api/leaderboard` 与 `/api/following` 为此多查了一列 `id`，仅用于本地计算，
**不进返回体**（有回归用例守着）。

频控：注册每 IP 1 小时 5 次；登录/改密/注销的验密失败按 IP 与用户名分桶限次；**恢复码校验失败每 IP、每用户名各 1 小时 8 次**。超限返回 `429 {err,retry}`（retry 为建议等待秒数）。

### 邮件服务（Resend）

找回密码的邮箱通道用 [Resend](https://resend.com) 发信（免费额度 3000 封/月、100 封/天，够个人站用）。

> ⚠️ **已有部署升级时必看**：`schema.sql` 用的是 `CREATE TABLE IF NOT EXISTS`，
> 对**已存在**的 `users` 表不会加任何新列。给老库补列必须跑迁移文件：
> ```bash
> wrangler d1 execute uuoo_analytics --remote --file=migrate-users-recovery.sql
> ```
> 漏了这步会导致 worker 查不到列、账号接口全 500，前端表现为「离线中」。

```bash
cd analytics
wrangler secret put RESEND_API_KEY     # 在 Resend 后台创建，切勿写进 wrangler.toml（明文进 git）
# 可选：自定义发件人（域名需先在 Resend 验证）
#   在 wrangler.toml 的 [vars] 里加 MAIL_FROM = "uuoo 德语学习手册 <noreply@uuoo.site>"
wrangler deploy
```

未配置 `RESEND_API_KEY` 时，`/api/account/email_code` 对外仍回那句通用提示（不暴露账号是否存在），
故障详情打在 Worker 日志里（`wrangler tail`）——恢复码通道不受影响，照常可用。
验证码只存 PBKDF2 哈希，10 分钟过期，同一枚最多试 5 次，用掉即清除。
发送频控：每用户名 1 小时 5 次、每 IP 1 小时 20 次。

**恢复码（忘记密码的自助入口，不依赖任何第三方发送）**
格式 `UUOO-XXXX-XXXX-XXXX`，字符集去掉易混的 `0/O/1/I/L`，熵约 59.5 bit。
与密码同等待遇：**库里只存 PBKDF2 哈希**（`rec_salt`/`rec_hash`），明文仅在生成时返回一次。
注册即发一枚；重置成功后旧码作废并立刻换新码。校验时忽略大小写与分隔符，容忍手抄格式差异。
失败一律返回同一句提示，不暴露「用户名是否存在 / 是否设过恢复码」。

资料字段：`nickname`(昵称) `avatar`(emoji 头像) `av_bg`(背景色) `sig`(个性签名) `email`(选填找回方式)。

**邮箱**：**选填**，只在用户主动填写时收集，用途仅限「忘记密码时找回」。
服务端规范化后以小写存储，并由唯一索引防止重复绑定；
`/api/me` 一律只回掩码，明文不出服务端；注销账号时随 users 行硬删。
邮箱验证码由 Resend 发送；未配置 `RESEND_API_KEY` 时，用户仍可用恢复码找回账号。
头像不做图片上传，只从预设 emoji + 颜色里选——零存储、零外链、零审核负担，契合站点 emoji 风格。

### 第三方登录（可选：GitHub / Google）

**GitHub**：Settings → Developer settings → **OAuth Apps** → New OAuth App
- Homepage URL：`https://www.uuoo.site`
> **OAuth 的 state 绑定浏览器**：`/start` 除了把 `state` 写进 `oauth_state` 表，还会下发同值 Cookie
> `uuoo_os`（`HttpOnly; Secure; SameSite=Lax; Path=/api/oauth; Max-Age=600`），`/callback` 两边必须对上。
> 只存库不绑浏览器挡不住登录 CSRF：攻击者自己走一遍 `start` 拿到合法 `state`，再把 callback 链接发给
> 受害者，受害者就「登录」进了攻击者的账号，之后学习进度全同步进去。`state` 用过即焚，不能重放。
>
> 前端配套：回跳带的 `#acct_token=` **只有「本标签页刚点过第三方登录」才采信**
> （`oauthLogin()` 写 `sessionStorage.oauth_go`，读后即删），否则任何人发个
> `https://www.uuoo.site/#acct_token=<自己的 token>` 就能让别人登进他的账号。

- **Authorization callback URL**：`https://uuoo-analytics.<你的子域>.workers.dev/api/oauth/github/callback`
- 拿到 **Client ID** 填 `wrangler.toml` 的 `GH_CLIENT_ID`；Secret 用 `wrangler secret put GH_CLIENT_SECRET`

**Google**：Google Cloud Console → APIs & Services → **Credentials** → Create OAuth client ID（Web application）
- **Authorized redirect URI**：`https://uuoo-analytics.<你的子域>.workers.dev/api/oauth/google/callback`
- 拿到 **Client ID** 填 `wrangler.toml` 的 `GOOGLE_CLIENT_ID`；Secret 用 `wrangler secret put GOOGLE_CLIENT_SECRET`
- 注意：Google 在国内/微信内打不开，主要服务海外与桌面 Chrome 用户。

配置完 `wrangler deploy` 生效。哪个都不配也没关系，用户名+密码照常可用。

### 密钥轮换

如果 `STATS_KEY` 曾经被提交到仓库或发给他人，视为已泄露。生成新随机值后重新运行：

```bash
wrangler secret put STATS_KEY
wrangler deploy
```

旧值不要继续使用，也不要写入 README、`wrangler.toml`、脚本或 issue。

## 合规提醒

匿名统计 + 账号信息在国内均受《个人信息保护法》约束。建议在页面底部/支持页写明
"本站仅记录匿名使用统计以改进功能；账号仅保存用户名、昵称与密码哈希"，需要时可删库。
用户可自助注销（`/api/account/delete`）：注销即从 users/sessions/follows/activity 硬删，不可恢复；匿名埋点与账号无关联，不受影响。

## 定时清理

Worker 每天凌晨 4 点自动清理（`wrangler.toml` 的 `[triggers] crons`）：

| 表 | 保留 |
|---|---|
| `events` 埋点 | **90 天** |
| `activity` 动态 | 180 天 |
| `sessions` 登录会话 | **180 天** |
| `oauth_state` / `ratelimit` | 过期即删 |

不配这个，`events` 会一直涨到 D1 的 10GB 上限；而且埋点含个人信息
（截断 IP、城市），无限留存本身也是合规风险。

改保留期：worker.js 顶部的 `RETAIN_DAYS`。

## 数据备份（必读）

D1 **没有自动备份**。误删一张表、一次写错的 UPDATE，用户账号与学习进度就永久没了。

```bash
bash analytics/backup.sh                    # 导出到 ./backups，gzip 归档
BACKUP_DIR=~/uuoo-backups bash analytics/backup.sh
KEEP_DAYS=90 bash analytics/backup.sh       # 默认保留 30 天
```

挂 cron 每天跑一次：
```
0 3 * * * cd /path/to/repo && bash analytics/backup.sh >> /tmp/uuoo-backup.log 2>&1
```

脚本会做两道校验（文件非空、含 users 表），任一不过就删掉残件并以非零码退出——
避免用一个坏文件覆盖掉好备份。

恢复：
```bash
bash analytics/restore.sh backups/uuoo_analytics-YYYYMMDD-HHMMSS.sql.gz
```
恢复前会先给当前库做一次安全快照，并要求输入 YES 二次确认。
