-- D1 表结构。应用：wrangler d1 execute uuoo_analytics --file=schema.sql --remote
-- 匿名埋点事件表
CREATE TABLE IF NOT EXISTS events (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  ts      INTEGER,   -- 事件时间戳(ms)
  vid     TEXT,      -- 匿名访客ID(localStorage随机串，非个人信息)
  sid     TEXT,      -- 本次会话ID
  name    TEXT,      -- 事件名：view/study/lang/install ...
  props   TEXT,      -- 事件参数(JSON字符串)，可空
  path    TEXT,
  ref     TEXT,      -- 来源
  ua      TEXT,      -- User-Agent
  country TEXT       -- Cloudflare 边缘识别的国家码
);
CREATE INDEX IF NOT EXISTS idx_events_ts   ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(name);
CREATE INDEX IF NOT EXISTS idx_events_vid  ON events(vid);

-- 账号表（用户名+密码 或 GitHub OAuth）
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT UNIQUE,          -- 登录名（小写字母/数字/下划线）
  nickname    TEXT,                 -- 昵称（展示用）
  pass_salt   TEXT,                 -- 密码盐（OAuth 用户为空）
  pass_hash   TEXT,                 -- PBKDF2 哈希（OAuth 用户为空）
  provider    TEXT DEFAULT 'pw',    -- pw / github / google
  provider_id TEXT,                 -- 第三方用户ID
  avatar      TEXT DEFAULT '🦊',    -- emoji 头像（服务端白名单）
  av_bg       TEXT DEFAULT '#58cc02', -- 头像背景色（服务端白名单）
  sig         TEXT DEFAULT '',      -- 个性签名（≤60 字）
  -- 同步上来的学习数据（用于排行榜/徽章）
  known       INTEGER DEFAULT 0,    -- 掌握词数
  streak      INTEGER DEFAULT 0,    -- 当前连续打卡
  best_streak INTEGER DEFAULT 0,    -- 最长连续打卡
  total       INTEGER DEFAULT 0,    -- 累计学习动作
  quiz        INTEGER DEFAULT 0,    -- 累计答题数
  level       TEXT DEFAULT 'A1',
  badges      TEXT DEFAULT '',      -- 已点亮徽章ID（逗号分隔，服务端判定）
  created     INTEGER,
  updated     INTEGER
);
CREATE INDEX IF NOT EXISTS idx_users_known  ON users(known DESC);
CREATE INDEX IF NOT EXISTS idx_users_streak ON users(best_streak DESC);
CREATE INDEX IF NOT EXISTS idx_users_total  ON users(total DESC);
CREATE INDEX IF NOT EXISTS idx_users_gh     ON users(provider, provider_id);

-- 登录会话（随机 token，180 天过期）
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  uid   INTEGER,
  exp   INTEGER
);

-- GitHub OAuth 临时 state（防 CSRF，10 分钟过期）
CREATE TABLE IF NOT EXISTS oauth_state (
  state TEXT PRIMARY KEY,
  exp   INTEGER
);

-- 社交：学习动态（纯系统生成事件：点亮徽章/破纪录，无 UGC）
CREATE TABLE IF NOT EXISTS activity (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  uid  INTEGER,
  type TEXT,     -- badge=点亮徽章 / streak=打卡破纪录
  data TEXT,     -- badge: 徽章id；streak: 天数
  ts   INTEGER
);
CREATE INDEX IF NOT EXISTS idx_activity_uid_ts ON activity(uid, ts DESC);

-- 社交：关注关系（follower 关注 followee）
CREATE TABLE IF NOT EXISTS follows (
  follower INTEGER,
  followee INTEGER,
  ts       INTEGER,
  PRIMARY KEY (follower, followee)
);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower);
