#!/usr/bin/env bash
# 从备份恢复 D1。⚠️ 这会覆盖线上数据，务必确认清楚再跑。
#
# 用法：bash analytics/restore.sh backups/uuoo_analytics-20260803-030000.sql.gz

set -euo pipefail
FILE="${1:?用法: bash analytics/restore.sh <备份文件.sql.gz>}"
DB="${DB_NAME:-uuoo_analytics}"
[ -f "$FILE" ] || { echo "ERROR 文件不存在: $FILE"; exit 1; }

echo "⚠️  即将用 $FILE 覆盖线上库 $DB"
echo "⚠️  当前库的数据会被替换，此操作不可撤销。"
read -r -p "确认请输入 YES： " a
[ "$a" = "YES" ] || { echo "已取消"; exit 1; }

TMP="$(mktemp -t restore-XXXX.sql)"
case "$FILE" in *.gz) zcat "$FILE" > "$TMP";; *) cp "$FILE" "$TMP";; esac
grep -q "CREATE TABLE.*users" "$TMP" || { echo "ERROR 备份内容异常，缺 users 表"; rm -f "$TMP"; exit 1; }

# 恢复前先给当前库做一次快照，万一恢复错了还能退回去
echo "先给当前库做安全快照…"
bash "$(dirname "$0")/backup.sh" || echo "（快照失败，继续需你自行承担风险）"

wrangler d1 execute "$DB" --remote --file="$TMP"
rm -f "$TMP"
echo "恢复完成。请立即在站点上验证登录与学习数据。"
