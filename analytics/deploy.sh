#!/usr/bin/env bash
# uuoo 后端一键部署：拉取最新代码 → 建表 → 部署 Worker
# 用法（在 ~/uuoo-analytics 目录）：bash deploy.sh
set -e
BASE="https://raw.githubusercontent.com/717986230/deutsch-lernen-site/main/analytics"

echo "① 拉取最新 worker.js / schema.sql ..."
curl -fsSL "$BASE/worker.js"  -o worker.js
curl -fsSL "$BASE/schema.sql" -o schema.sql

if [ ! -f wrangler.toml ]; then
  echo "   未发现 wrangler.toml，下载默认配置（记得填 GH_CLIENT_ID / GOOGLE_CLIENT_ID）"
  curl -fsSL "$BASE/wrangler.toml" -o wrangler.toml
else
  echo "   ✓ 保留你现有的 wrangler.toml（含已填好的 Client ID / database_id）"
fi

echo "② 建表（D1 远程，若表已存在会自动跳过）..."
wrangler d1 execute uuoo_analytics --file=schema.sql --remote

echo "③ 部署 Worker ..."
wrangler deploy

echo ""
echo "✅ 部署完成！Worker 地址：https://uuoo-analytics.uuoo.workers.dev"
echo "   首次配第三方登录密钥（只需一次，之后不用再跑）："
echo "     wrangler secret put GH_CLIENT_SECRET      # GitHub 登录"
echo "     wrangler secret put GOOGLE_CLIENT_SECRET  # Google 登录"
