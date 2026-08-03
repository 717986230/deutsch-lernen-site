#!/usr/bin/env bash
# D1 备份：导出整库为 SQL，按日期归档，自动清理过期文件。
#
# 为什么必须有：D1 没有自动备份。误删一张表、一次写错的 UPDATE、
# 或账号出问题，用户的账号与学习进度就永久没了。商业化后这是致命风险。
#
# 用法：
#   bash analytics/backup.sh                  # 备份到 ./backups
#   BACKUP_DIR=~/uuoo-backups bash analytics/backup.sh
#   KEEP_DAYS=90 bash analytics/backup.sh     # 保留 90 天（默认 30）
#
# 建议挂 cron（每天凌晨 3 点）：
#   0 3 * * * cd /path/to/repo && bash analytics/backup.sh >> /tmp/uuoo-backup.log 2>&1

set -euo pipefail

DB="${DB_NAME:-uuoo_analytics}"
DIR="${BACKUP_DIR:-./backups}"
KEEP="${KEEP_DAYS:-30}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$DIR/${DB}-${STAMP}.sql"

command -v wrangler >/dev/null 2>&1 || { echo "ERROR 未找到 wrangler，先 npm i -g wrangler"; exit 1; }
mkdir -p "$DIR"

echo "[$(date '+%F %T')] 开始导出 $DB → $OUT"
# --remote 导线上库；不加会导本地开发库，等于备了个空的
wrangler d1 export "$DB" --remote --output="$OUT"

# 校验：导出文件必须非空且含 users 表，否则视为失败并删掉，避免用坏文件覆盖好备份
if [ ! -s "$OUT" ]; then
  echo "ERROR 导出文件为空，已删除"; rm -f "$OUT"; exit 1
fi
if ! grep -q "CREATE TABLE.*users" "$OUT"; then
  echo "ERROR 导出内容缺少 users 表，可能导出失败，已删除"; rm -f "$OUT"; exit 1
fi

gzip -f "$OUT"
SIZE=$(du -h "${OUT}.gz" | cut -f1)
ROWS=$(zcat "${OUT}.gz" | grep -c "^INSERT INTO users" || true)
echo "[$(date '+%F %T')] 完成 ${OUT}.gz  大小 $SIZE  users 行数 $ROWS"

# 清理过期备份（只删本脚本产生的文件，不碰目录里其它东西）
DEL=$(find "$DIR" -name "${DB}-*.sql.gz" -type f -mtime +"$KEEP" -print -delete | wc -l | tr -d ' ')
[ "$DEL" -gt 0 ] && echo "已清理 $DEL 个超过 ${KEEP} 天的旧备份"

echo "现有备份：$(find "$DIR" -name "${DB}-*.sql.gz" | wc -l | tr -d ' ') 份"
