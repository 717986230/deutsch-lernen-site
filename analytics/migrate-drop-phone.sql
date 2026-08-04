-- 下线手机号收集：清空已存的手机号并删掉唯一索引。
--
-- 为什么下线：手机号在国内属强监管个人信息，合规负担重；
-- 而找回密码用「邮箱验证码 + 恢复码」双通道已经够用，收它不增加任何能力。
--
-- 用法（务必先备份）：
--   bash analytics/backup.sh
--   wrangler d1 execute uuoo_analytics --remote --file=migrate-drop-phone.sql
--
-- 注意：这里只清数据、不 DROP COLUMN。
-- SQLite 的 DROP COLUMN 支持有限，留着空列无害；worker.js 已不再读写它。

DROP INDEX IF EXISTS idx_users_phone;
UPDATE users SET phone = NULL WHERE phone IS NOT NULL;
