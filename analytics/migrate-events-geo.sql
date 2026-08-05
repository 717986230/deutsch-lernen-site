-- events 表补列：地域、截断 IP、会话时长。
-- 已有部署必须跑这个 —— CREATE TABLE IF NOT EXISTS 不会给已存在的表加列。
--
--   wrangler d1 execute uuoo_analytics --remote --file=migrate-events-geo.sql
--
-- 注意：ip 存的是**截断值**（IPv4 末段清零、IPv6 保留 /48）。
-- 若确需完整 IP，设 LOG_FULL_IP=1，并**同步更新隐私政策**。

ALTER TABLE events ADD COLUMN region TEXT;
ALTER TABLE events ADD COLUMN city   TEXT;
ALTER TABLE events ADD COLUMN ip     TEXT;
ALTER TABLE events ADD COLUMN dur    INTEGER;

CREATE INDEX IF NOT EXISTS idx_events_city ON events(city);
