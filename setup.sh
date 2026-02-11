#!/usr/bin/env bash
set -euo pipefail

# Haishin+ HUB - 開発環境セットアップスクリプト
# 14_IMPLEMENTATION_ORDER.md Layer 0 要件

echo "=== Haishin+ HUB 開発環境セットアップ ==="

# 1. Node.js バージョン確認
NODE_VERSION=$(node -v 2>/dev/null || echo "none")
echo "Node.js: $NODE_VERSION"
if [[ "$NODE_VERSION" == "none" ]]; then
  echo "❌ Node.js がインストールされていません。v22 以上をインストールしてください。"
  exit 1
fi
NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')
if (( NODE_MAJOR < 22 )); then
  echo "❌ Node.js v22 以上が必要です（現在: $NODE_VERSION）"
  exit 1
fi
echo "✅ Node.js バージョン OK"

# 2. pnpm 確認
if ! command -v pnpm &>/dev/null; then
  echo "❌ pnpm がインストールされていません。corepack enable を実行してください。"
  exit 1
fi
echo "✅ pnpm: $(pnpm -v)"

# 3. Docker 確認
if ! command -v docker &>/dev/null; then
  echo "⚠️  Docker が見つかりません。DB に Docker を使う場合はインストールしてください。"
else
  echo "✅ Docker: $(docker --version | awk '{print $3}' | tr -d ',')"
fi

# 4. 依存パッケージインストール
echo ""
echo "--- 依存パッケージをインストール ---"
pnpm install

# 5. 環境変数ファイル
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "✅ .env.example → .env にコピーしました。値を設定してください。"
  else
    echo "⚠️  .env.example が見つかりません"
  fi
else
  echo "✅ .env は既に存在します"
fi

# 6. Docker Compose でDB起動
if command -v docker &>/dev/null; then
  echo ""
  echo "--- PostgreSQL コンテナを起動 ---"
  docker compose up -d
  echo "✅ PostgreSQL 起動完了"

  # DB接続待ち
  echo "--- DB接続を待機中 ---"
  for i in {1..10}; do
    if docker compose exec -T db pg_isready -U postgres &>/dev/null; then
      echo "✅ DB接続 OK"
      break
    fi
    if [ "$i" -eq 10 ]; then
      echo "❌ DB接続タイムアウト"
      exit 1
    fi
    sleep 2
  done
fi

# 7. Nuxt prepare
echo ""
echo "--- Nuxt prepare ---"
pnpm nuxi prepare

# 8. マイグレーション
echo ""
echo "--- DBマイグレーション ---"
pnpm db:migrate

echo ""
echo "========================================="
echo "✅ セットアップ完了！"
echo ""
echo "  開発サーバー起動: pnpm dev"
echo "  DB GUI:          pnpm db:studio"
echo "========================================="
