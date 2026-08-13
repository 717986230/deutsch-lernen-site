-- 可重复执行：为已部署数据库增加双语学习明细文档表。
CREATE TABLE IF NOT EXISTS user_progress_documents (
  uid INTEGER NOT NULL,
  lang TEXT NOT NULL CHECK (lang IN ('de','en')),
  rev INTEGER NOT NULL DEFAULT 0,
  document TEXT NOT NULL DEFAULT '{}',
  updated INTEGER NOT NULL,
  PRIMARY KEY (uid, lang)
);
