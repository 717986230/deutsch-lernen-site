// 在真实 SQLite 上跑一遍 analytics/schema.sql，确保 DDL 语法有效。
// 起因：users 表某列漏了结尾逗号，本地看不出来，直到 wrangler d1 execute 才报
// 「near "known": syntax error」——那时已经在动生产库了。
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const sql = readFileSync('analytics/schema.sql', 'utf8');
const db = new DatabaseSync(':memory:');
try {
  db.exec(sql);
} catch (e) {
  console.error(`ERROR analytics/schema.sql 语法错误：${e.message}`);
  process.exit(1);
}
// 幂等性：schema 全部用 IF NOT EXISTS，重复执行不应报错
try {
  db.exec(sql);
} catch (e) {
  console.error(`ERROR analytics/schema.sql 不可重复执行（应全用 IF NOT EXISTS）：${e.message}`);
  process.exit(1);
}
const cols = db.prepare('SELECT name FROM pragma_table_info(?)').all('users').map((r) => r.name);
const required = ['username', 'pass_hash', 'email', 'phone', 'rec_hash', 'mail_hash', 'email_ok', 'known', 'badges'];
const missing = required.filter((c) => !cols.includes(c));
if (missing.length) {
  console.error(`ERROR users 表缺少列：${missing.join(', ')}`);
  process.exit(1);
}
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((r) => r.name);
console.log(`OK schema.sql 语法有效且可重复执行；${tables.length} 张表：${tables.join(', ')}`);
