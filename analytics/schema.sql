-- D1 表结构：一行一个事件。应用：wrangler d1 execute uuoo_analytics --file=analytics/schema.sql --remote
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
