-- 为已有 D1 数据库新增双语学习档案。可重复执行。
CREATE TABLE IF NOT EXISTS user_language_profiles (
  uid INTEGER NOT NULL,
  lang TEXT NOT NULL CHECK (lang IN ('de','en')),
  known INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  quiz INTEGER NOT NULL DEFAULT 0,
  level TEXT NOT NULL DEFAULT 'A1',
  updated INTEGER NOT NULL,
  PRIMARY KEY (uid, lang),
  FOREIGN KEY (uid) REFERENCES users(id) ON DELETE CASCADE
);

-- 旧站只有一套统计，明确迁移为德语历史记录，英语从独立档案开始。
INSERT OR IGNORE INTO user_language_profiles
  (uid,lang,known,streak,best_streak,total,quiz,level,updated)
SELECT id,'de',known,streak,best_streak,total,quiz,level,updated FROM users;
