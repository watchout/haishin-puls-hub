# DEV_ENVIRONMENT.md - 開発環境定義書

> 開発環境の構築手順と必要なツールを定義

---

## 基本情報

| 項目 | 内容 |
|------|------|
| プロジェクト名 | Haishin+ HUB |
| フレームワーク | Nuxt 3 (Vue 3 + Nitro) |
| ランタイム | Node.js 22.x LTS |
| パッケージマネージャ | pnpm |
| DB | PostgreSQL 16 |
| 最終更新日 | 2026-02-08 |
| 対象OS | macOS / Linux |

---

## 1. 必要なツール

### 1.1 必須ツール

| ツール | バージョン | 用途 | インストール方法 |
|-------|-----------|------|----------------|
| Node.js | v22.x LTS | ランタイム | `nvm install 22` |
| pnpm | 9.x | パッケージ管理 | `corepack enable && corepack prepare pnpm@latest` |
| Git | 2.40+ | バージョン管理 | OS標準 or Homebrew |
| Docker | 24.x+ | コンテナ（PostgreSQL） | Docker Desktop |

### 1.2 推奨ツール

| ツール | 用途 | インストール方法 |
|-------|------|----------------|
| VS Code / Cursor | エディタ | 公式サイト |
| TablePlus / DBeaver | DBクライアント | 公式サイト |
| Bruno / Insomnia | API テスト | 公式サイト |

---

## 2. 環境構築手順

### 2.1 リポジトリのクローン

```bash
git clone https://github.com/your-org/haishin-plus-hub.git
cd haishin-plus-hub
```

### 2.2 依存パッケージのインストール

```bash
pnpm install
```

### 2.3 環境変数の設定

```bash
cp .env.example .env
# 必要な値を設定（下記「環境変数一覧」参照）
```

### 2.4 データベースのセットアップ

```bash
# PostgreSQL コンテナ起動
docker compose up -d

# マイグレーション実行
pnpm db:migrate

# シードデータ投入（任意）
pnpm db:seed
```

### 2.5 開発サーバーの起動

```bash
pnpm dev
```

アクセス: http://localhost:3000

---

## 3. 環境変数一覧

### 3.1 必須

| 変数名 | 説明 | 例 | 取得方法 |
|--------|------|-----|---------|
| `DATABASE_URL` | DB接続文字列 | `postgresql://postgres:postgres@localhost:5432/haishin_plus_hub` | ローカル設定 |
| `BETTER_AUTH_SECRET` | Better Auth シークレット | ランダム文字列 | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Better Auth コールバック URL | `http://localhost:3000` | 固定値 |

### 3.2 AI（開発時はどちらか一方でOK）

| 変数名 | 説明 | 必要な機能 | 取得方法 |
|--------|------|-----------|---------|
| `ANTHROPIC_API_KEY` | Claude API キー | AI機能（主LLM） | Anthropic Console |
| `OPENAI_API_KEY` | OpenAI API キー | AI機能（副LLM） | OpenAI Dashboard |

### 3.3 任意（機能別）

| 変数名 | 説明 | 必要な機能 | 取得方法 |
|--------|------|-----------|---------|
| `GOOGLE_CLIENT_ID` | Google OAuth | OAuth認証 | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | OAuth認証 | Google Cloud Console |
| `RESEND_API_KEY` | メール送信 | メール通知 | Resend ダッシュボード |

### 3.4 環境変数テンプレート（.env.example）

```bash
# ===================
# Database
# ===================
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/haishin_plus_hub"

# ===================
# Authentication (Better Auth)
# ===================
BETTER_AUTH_SECRET=""
BETTER_AUTH_URL="http://localhost:3000"

# Google OAuth（任意）
# GOOGLE_CLIENT_ID=""
# GOOGLE_CLIENT_SECRET=""

# ===================
# AI / LLM
# ===================
# Claude API（主LLM）
ANTHROPIC_API_KEY=""

# OpenAI API（副LLM / フォールバック）
# OPENAI_API_KEY=""

# ===================
# External Services（任意）
# ===================
# RESEND_API_KEY=""
```

---

## 4. Docker構成

### 4.1 docker-compose.yml（開発環境）

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: haishin_plus_hub
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 4.2 Docker コマンド

| コマンド | 説明 |
|---------|------|
| `docker compose up -d` | コンテナ起動 |
| `docker compose down` | コンテナ停止 |
| `docker compose logs -f db` | DBログ確認 |
| `docker compose down -v` | コンテナ + ボリューム削除（データリセット） |

---

## 5. よく使うコマンド

### 5.1 開発

| コマンド | 説明 |
|---------|------|
| `pnpm dev` | 開発サーバー起動（Nuxt 3） |
| `pnpm build` | プロダクションビルド |
| `pnpm preview` | ビルド結果のプレビュー |
| `pnpm lint` | ESLint 実行 |
| `pnpm lint:fix` | ESLint 自動修正 |
| `pnpm typecheck` | 型チェック（`nuxi typecheck`） |

### 5.2 データベース（Drizzle ORM）

| コマンド | 説明 |
|---------|------|
| `pnpm db:generate` | マイグレーションファイル生成（`drizzle-kit generate`） |
| `pnpm db:migrate` | マイグレーション実行（`drizzle-kit migrate`） |
| `pnpm db:push` | スキーマを直接DBに反映（開発用、`drizzle-kit push`） |
| `pnpm db:studio` | Drizzle Studio 起動（DB GUI） |
| `pnpm db:seed` | シードデータ投入 |

### 5.3 テスト

| コマンド | 説明 |
|---------|------|
| `pnpm test` | テスト実行（Vitest） |
| `pnpm test:watch` | ウォッチモード |
| `pnpm test:coverage` | カバレッジ付き |
| `pnpm test:e2e` | E2Eテスト（Playwright） |

---

## 6. IDE設定

### 6.1 VS Code 推奨拡張機能

```json
// .vscode/extensions.json
{
  "recommendations": [
    "Vue.volar",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "nuxtr.nuxtr-vscode",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

### 6.2 VS Code 設定

```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "dbaeumer.vscode-eslint",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## 7. トラブルシューティング

### 7.1 よくある問題

| 問題 | 原因 | 解決策 |
|------|------|-------|
| `pnpm install` が失敗する | Node.jsバージョン不一致 | `nvm use 22` でバージョン切り替え |
| DBに接続できない | コンテナ未起動 | `docker compose up -d` |
| ポートが使用中 | 他プロセスが使用中 | `lsof -i :3000` で確認・終了 |
| 環境変数が読み込まれない | .envがない | `.env.example`からコピー |
| マイグレーションエラー | DBスキーマ不整合 | `docker compose down -v && docker compose up -d && pnpm db:migrate` |
| Nuxt の型エラー | 型定義未生成 | `pnpm nuxi prepare` |

### 7.2 キャッシュクリア

```bash
# Node modules 再インストール
rm -rf node_modules
pnpm install

# Nuxt キャッシュクリア
rm -rf .nuxt .output
pnpm nuxi prepare
```

---

## 8. 初回セットアップチェックリスト

| # | 項目 | 完了 |
|---|------|------|
| 1 | Node.js v22.x がインストールされている | ☐ |
| 2 | pnpm がインストールされている | ☐ |
| 3 | Docker Desktop が起動している | ☐ |
| 4 | リポジトリをクローンした | ☐ |
| 5 | `pnpm install` が成功した | ☐ |
| 6 | `.env` を作成した | ☐ |
| 7 | 必須の環境変数を設定した | ☐ |
| 8 | `docker compose up -d` が成功した | ☐ |
| 9 | `pnpm db:migrate` が成功した | ☐ |
| 10 | `pnpm dev` で起動し、ブラウザで確認できた | ☐ |

**全てチェックできたら環境構築完了！**

---

## 変更履歴

| 日付 | 変更内容 | 変更者 |
|------|---------|-------|
| 2026-02-08 | 初版作成（Nuxt 3 / Drizzle ORM / PostgreSQL 16 / Better Auth 向けにカスタマイズ） | AI |
