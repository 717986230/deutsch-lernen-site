#!/usr/bin/env bash
# uuoo 一键部署：后端（Worker + D1）与当前生产旧站。
#
# 用法（在仓库根目录）：
#   bash deploy.sh              # 全部
#   bash deploy.sh backend      # 只部署后端
#   bash deploy.sh site         # 只构建旧站产物，提交并推送 main 后由 Pages 发布
#   bash deploy.sh check        # 只体检，不部署任何东西
#
# 设计原则：动数据前必先备份；任何一步失败立即停；能自动修的自动修，
# 不能的给出确切的下一步命令而不是笼统报错。

set -euo pipefail
cd "$(dirname "$0")"
REPO="$(pwd)"
TARGET="${1:-all}"
DB="${DB_NAME:-uuoo_analytics}"

RED=$'\033[31m'; GRN=$'\033[32m'; YEL=$'\033[33m'; DIM=$'\033[2m'; OFF=$'\033[0m'
say()  { echo "${GRN}▶${OFF} $*"; }
warn() { echo "${YEL}⚠${OFF}  $*"; }
die()  { echo "${RED}✘ $*${OFF}" >&2; exit 1; }
step() { echo; echo "${DIM}────────────────────────────────${OFF}"; echo "${GRN}$*${OFF}"; }

# ─────────────────────────────────────────────
# 0. 环境自检 —— 把实际踩过的坑都挡在前面
# ─────────────────────────────────────────────
preflight() {
  step "① 环境自检"

  command -v node >/dev/null || die "未找到 node，请先安装 Node 22+"
  local nv; nv=$(node -v | sed 's/v\([0-9]*\).*/\1/')
  [ "$nv" -ge 20 ] || die "Node 版本过低（当前 $(node -v)），需要 20+"
  say "node $(node -v)"

  if [ "$TARGET" = "all" ] || [ "$TARGET" = "backend" ]; then
    command -v wrangler >/dev/null || die "未找到 wrangler，请先 npm i -g wrangler"
    say "wrangler $(wrangler --version 2>/dev/null | head -1)"

    # 坑一：在家目录跑 wrangler 会扫到 ~/.Trash，macOS 拒绝访问
    case "$REPO" in
      "$HOME") die "请勿在家目录运行；wrangler 会扫描 ~/.Trash 导致权限错误" ;;
    esac

    # 坑二：没登录时报错很含糊
    if ! wrangler whoami >/dev/null 2>&1; then
      die "wrangler 未登录。请先运行：wrangler login"
    fi
    say "Cloudflare 已登录"

    [ -f analytics/wrangler.toml ] || warn "analytics/wrangler.toml 不存在，将使用仓库内默认配置（可能缺 database_id）"
  fi
}

# ─────────────────────────────────────────────
# 1. 体检：构建 + 三项校验，任何一项不过就不部署
# ─────────────────────────────────────────────
check() {
  step "② 体检（构建 + 校验）"
  [ -d node_modules ] || { say "安装根依赖…"; npm ci --silent 2>/dev/null || npm install --silent; }
  say "构建旧站产物…"; npm run build >/dev/null
  say "校验构建产物 / schema / 内容数据…"
  npm run verify || die "校验未通过，已中止部署"

  # 明文词库不得进产物（AGENTS.md 1.3）
  local leak; leak=$(grep -c '"de":"Guten Morgen' index.html || true)
  [ "$leak" = "0" ] || die "index.html 存在明文词库泄漏（$leak 处），已中止"
  say "明文泄漏检查通过"

  if [ ! -z "$(git status --porcelain -- index.html sw.js '*.dat' 2>/dev/null)" ]; then
    warn "构建产物有未提交的改动 —— 记得 git add & commit，否则线上和仓库会不一致"
  fi
}

# ─────────────────────────────────────────────
# 2. 后端：备份 → 补列 → 清手机号 → 部署 Worker
# ─────────────────────────────────────────────
backend() {
  step "③ 后端（Worker + D1）"
  cd "$REPO/analytics"

  # ── 先备份。动数据前不备份就是赌博 ──
  say "备份 D1（动任何数据之前）…"
  BACKUP_DIR="${BACKUP_DIR:-$REPO/backups}" bash backup.sh || die "备份失败，已中止 —— 没有备份不动数据"

  # ── 补列：已有库不会因 CREATE TABLE IF NOT EXISTS 而加列，必须 ALTER ──
  say "补齐 users 表新列…"
  if [ -f migrate-users-recovery.sql ]; then
    # 重复执行会报 duplicate column，属正常，不当作失败
    wrangler d1 execute "$DB" --remote --file=migrate-users-recovery.sql 2>&1 \
      | grep -v "duplicate column" || true
  fi

  say "补齐 events 表地域/IP/时长列…"
  if [ -f migrate-events-geo.sql ]; then
    wrangler d1 execute "$DB" --remote --file=migrate-events-geo.sql 2>&1 \
      | grep -v "duplicate column" || true
  fi

  say "清空存量手机号（已下线该字段）…"
  if [ -f migrate-drop-phone.sql ]; then
    wrangler d1 execute "$DB" --remote --file=migrate-drop-phone.sql
  fi

  say "迁移双语学习档案…"
  if [ -f migrate-language-profiles.sql ]; then
    wrangler d1 execute "$DB" --remote --file=migrate-language-profiles.sql
  fi

  say "应用表结构（新表会建，已存在的跳过）…"
  wrangler d1 execute "$DB" --remote --file=schema.sql 2>&1 \
    | grep -viE "already exists|duplicate column" || true

  say "部署 Worker…"
  wrangler deploy

  cd "$REPO"
  echo
  say "后端完成。${DIM}如需设置密钥：wrangler secret put RESEND_API_KEY / STATS_KEY${OFF}"
}

# ─────────────────────────────────────────────
# 3. 当前生产旧站 → GitHub Pages 根目录
# ─────────────────────────────────────────────
site() {
  step "④ 旧站静态产物"
  say "构建…"; npm run build
  say "旧站 index.html / sw.js 已更新；提交并推送 main 后由 GitHub Pages 自动发布。"
}

# ─────────────────────────────────────────────
main() {
  preflight
  check
  [ "$TARGET" = "check" ] && { echo; say "体检通过，未执行任何部署"; exit 0; }
  case "$TARGET" in
    all)     backend; site ;;
    backend) backend ;;
    site)    site ;;
    *)       die "未知参数「$TARGET」。可用：all / backend / site / check" ;;
  esac

  step "完成"
  echo "  旧站：推送 main 后 GitHub Pages 自动部署 → https://www.uuoo.site"
  echo "  后端：https://uuoo-analytics.uuoo.workers.dev"
  echo
  echo "${DIM}  备份在 ${BACKUP_DIR:-$REPO/backups}/，恢复用 bash analytics/restore.sh <文件>${OFF}"
}
main
