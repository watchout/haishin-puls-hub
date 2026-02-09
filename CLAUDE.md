# CLAUDE.md - プロジェクト指示書（Claude Code用）

> Claude Code はこのファイルを自動で読み込みます。
> プロジェクトの全仕様書は docs/ にあります。

---

## ⚠️ AI中断プロトコル（最優先ルール）

以下の場合、即座に作業を中断しユーザーに質問すること:

1. SSOTに記載がない仕様判断が必要な時
2. SSOTの記載が曖昧で複数解釈が可能な時
3. 技術的な選択肢が複数あり判断できない時
4. SSOTと既存実装が矛盾している時
5. 制約・規約に未定義のケースに遭遇した時
6. 変更の影響範囲が判断できない時
7. ビジネス判断が必要な時

「推測で進める」「とりあえず仮で」は禁止。
詳細: docs/standards/21_AI_ESCALATION.md

## プロジェクト概要

| 項目 | 内容 |
|------|------|
| プロダクト名 | Haishin+ HUB（配信プラス HUB） |
| 概要 | セミナー・イベント運営に関わる全プレイヤー（主催・会場・配信・企画代行・登壇者・営業マーケ・参加者）が1つのWebシステムで日程・タスク・締め切り・必要情報を一元管理し、AIに「聞く／頼む」ことで運営の手間を大幅に削減するセミナー／イベント運営OS |
| 技術スタック | Nuxt 3 (Vue 3 + Nitro) / Nuxt UI v3 / Drizzle ORM / PostgreSQL 16 / Better Auth / LLM抽象化(Claude主・GPT副・切替可能) + Vercel AI SDK / Docker + VPS |
| リポジトリ | haishin-plus-hub |

---

## 最重要ルール

```
1. 仕様書がない機能は実装しない
2. 実装前に必ず該当の仕様書を読む
3. 仕様と実装の乖離を見つけたら報告する
4. コア定義（docs/design/core/）は原則変更不可
```

---

## 仕様書の参照方法

### 実装前に必ず確認するドキュメント（優先順）

```
1. 機能仕様書         → docs/design/features/
2. コア定義           → docs/design/core/
   - UI/状態遷移      → docs/design/core/SSOT-2_UI_STATE.md
   - API規約          → docs/design/core/SSOT-3_API_CONTRACT.md
   - データモデル     → docs/design/core/SSOT-4_DATA_MODEL.md
   - 横断的関心事     → docs/design/core/SSOT-5_CROSS_CUTTING.md
3. 開発規約           → docs/standards/
   - コーディング規約 → docs/standards/CODING_STANDARDS.md
   - テスト規約       → docs/standards/TESTING_STANDARDS.md
   - Git運用          → docs/standards/GIT_WORKFLOW.md
4. PRD               → docs/requirements/SSOT-0_PRD.md
```

### 機能を実装する時のフロー

```
1. 対象の機能仕様書を読む
   → docs/design/features/common/  （共通機能）
   → docs/design/features/project/ （固有機能）

2. 関連するコア定義を確認
   → API設計 → SSOT-3
   → DB設計 → SSOT-4
   → 認証/エラー/ログ → SSOT-5

3. 実装
   → コーディング規約に従う
   → テスト規約に従う

4. テスト
   → 仕様書のテストケースに基づく
```

---

## ディレクトリ構造

```
.claude/
└── agents/                   ← Agent Teams（CLI パターン）
    ├── visual-tester.md      ← ビジュアルテスト専門
    ├── code-reviewer.md      ← Adversarial Review Role B
    └── ssot-explorer.md      ← SSOT検索・要約

docs/                         ← 全仕様書（SSOT）
├── INDEX.md                  ← ドキュメント一覧・配置マッピング
├── idea/                     ← アイデア・検証
├── requirements/             ← 要件定義
├── design/                   ← 設計
│   ├── core/                 ← コア定義（変更不可）
│   ├── features/             ← 機能仕様
│   │   ├── common/           ← 共通機能（認証・アカウント等）
│   │   └── project/          ← 固有機能（イベント管理・AIアシスト等）
│   └── adr/                  ← 設計判断記録
├── standards/                ← 開発規約
├── operations/               ← 運用
├── marketing/                ← マーケティング・JV提案
├── growth/                   ← グロース戦略
└── management/               ← プロジェクト管理

# Nuxt 3 ソースコード
app.vue                       ← エントリポイント
nuxt.config.ts                ← Nuxt 設定
pages/                        ← ページ（ファイルベースルーティング）
layouts/                      ← レイアウト（default, auth, dashboard）
components/                   ← コンポーネント
composables/                  ← Composables
stores/                       ← Pinia ストア
server/                       ← Nitro サーバー
├── api/                      ← API Routes
├── middleware/                ← サーバーミドルウェア
├── utils/                    ← サーバーユーティリティ（db, ai, mail）
└── database/                 ← DB（スキーマ, マイグレーション, シード）
types/                        ← 共有型定義
tests/                        ← テスト（unit, integration, e2e, factories）
```

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Nuxt 3 (Vue 3 + Nitro Server) |
| 言語 | TypeScript |
| UI | Nuxt UI v3 (Tailwind CSS v4) |
| 状態管理 | Pinia |
| ORM | Drizzle ORM |
| DB | PostgreSQL 16 |
| 認証 | Better Auth + Organization Plugin |
| AI | @anthropic-ai/sdk (Claude) + Vercel AI SDK |
| バリデーション | Zod |
| テスト | Vitest (Unit) + Playwright (E2E) |
| ホスティング | ConoHa VPS + Docker + Nginx |
| CI/CD | GitHub Actions |
| パッケージ管理 | pnpm |

> 詳細: docs/design/adr/001_TECH_STACK.md

---

## コーディング規約（要約）

> 詳細: docs/standards/CODING_STANDARDS.md（未作成）

### 命名規則
- コンポーネント: PascalCase（`LoginForm.tsx`）
- 関数/変数: camelCase（`handleSubmit`）
- 定数: UPPER_SNAKE_CASE（`MAX_RETRY_COUNT`）
- ファイル: kebab-case（`login-form.tsx`）※コンポーネント以外
- 型/Interface: PascalCase + 接尾辞（`UserResponse`, `AuthState`）

### 基本原則
- 1ファイル200行以内を目安
- 1関数1責務
- マジックナンバー禁止（定数化する）
- any 禁止（型を明示する）
- コメントは「なぜ」を書く（「何を」はコードで表現）

---

## Git 運用（要約）

> 詳細: docs/standards/GIT_WORKFLOW.md（未作成）

### ブランチ戦略
```
main ← production
  └── develop ← 開発統合
        └── feature/XXX-description ← 機能開発
        └── fix/XXX-description ← バグ修正
        └── hotfix/XXX-description ← 緊急修正
```

### コミットメッセージ
```
<type>(<scope>): <description>

type: feat | fix | docs | style | refactor | test | chore
scope: 機能ID or モジュール名
```

---

## テスト規約（要約）

> 詳細: docs/standards/TESTING_STANDARDS.md（未作成）

### テスト種類
- ユニットテスト: 全ビジネスロジック
- 統合テスト: API エンドポイント
- E2Eテスト: クリティカルパス

### カバレッジ目標
- ビジネスロジック: 80%+
- API: 70%+
- 全体: 60%+

---

## Agent Teams（CLI パターン）

> Claude Code CLI の Agent Teams でエージェントを活用し、コンテキストを節約する。

### エージェント一覧

```
.claude/agents/
├── visual-tester.md     ← ビジュアルテスト専門
├── code-reviewer.md     ← Adversarial Review Role B
└── ssot-explorer.md     ← SSOT検索・要約
```

### 使い方

```bash
# ビジュアルテストを Agent Teams に委譲
"visual-tester エージェントで AUTH-001 のビジュアルテストを実行して"

# コードレビューを Agent Teams に委譲
"code-reviewer エージェントで実装したコードをレビューして"

# SSOT検索を Agent Teams に委譲
"ssot-explorer エージェントで AUTH-001 のAPI仕様を調べて"
```

### ルール

以下のタスクは Agent Teams に委譲してコンテキストを節約すること:

1. **ビジュアルテスト**: 実装完了後、visual-tester エージェントで画面テスト
2. **Adversarial Review**: 実装完了後、code-reviewer エージェントでコード監査
3. **SSOT検索**: 大量のドキュメントから必要な情報を抽出する時
4. **影響分析**: コード変更の影響範囲を調査する時

---

## 禁止事項

```
❌ 仕様書にない機能を勝手に実装しない
❌ コア定義を勝手に変更しない
❌ テストなしでPRを出さない
❌ any 型を使わない
❌ console.log をプロダクションコードに残さない
❌ 環境変数をハードコードしない
❌ エラーを握りつぶさない（必ずハンドリング）
```

---

## よくあるタスクのコマンド例

```bash
# 機能実装
claude "docs/design/features/common/AUTH-001_login.md の仕様に基づいて
       ログイン機能を実装して"

# テスト生成
claude "src/components/features/auth/ のテストを
       docs/standards/TESTING_STANDARDS.md に基づいて生成して"

# リファクタリング
claude "src/ 以下のエラーハンドリングを
       docs/design/core/SSOT-5_CROSS_CUTTING.md に準拠させて"

# 仕様書の更新
claude "docs/design/features/project/FEAT-003.md を
       新しい要件に基づいて更新して"
```
