-- 给「已存在」的 users 表补列（找回密码相关）。
-- 为什么需要单独一个文件：schema.sql 里是 CREATE TABLE IF NOT EXISTS，
-- 对已存在的表什么都不做，新列永远加不上——只有 ALTER TABLE 能补。
--
-- 用法：
--   wrangler d1 execute uuoo_analytics --remote --file=migrate-users-recovery.sql
--
-- D1/SQLite 不支持 ADD COLUMN IF NOT EXISTS。若某列已存在会报
-- 「duplicate column name: xxx」并中止后续语句——此时删掉已建好的那几行再跑一次即可，
-- 或改用 README 里的逐条命令方式。

ALTER TABLE users ADD COLUMN email     TEXT;
ALTER TABLE users ADD COLUMN phone     TEXT;
ALTER TABLE users ADD COLUMN rec_salt  TEXT;
ALTER TABLE users ADD COLUMN rec_hash  TEXT;
ALTER TABLE users ADD COLUMN rec_at    INTEGER;
ALTER TABLE users ADD COLUMN mail_salt TEXT;
ALTER TABLE users ADD COLUMN mail_hash TEXT;
ALTER TABLE users ADD COLUMN mail_exp  INTEGER;
ALTER TABLE users ADD COLUMN mail_try  INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN email_ok  INTEGER DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
