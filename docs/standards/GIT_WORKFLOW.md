# GIT_WORKFLOW.md - Git運用規約

> ブランチ戦略、コミット規約、PR運用ルール

---

## 基本情報

| 項目 | 内容 |
|------|------|
| プロジェクト名 | Haishin+ HUB |
| ブランチ戦略 | Git Flow（main + develop） |
| 最終更新日 | 2026-02-08 |

---

## 1. ブランチ戦略

### 1.1 Git Flow

```
main ─────●───────────────────────●─────→  (本番)
           \                     /
develop ────●─────●─────●─────●─────────→  (開発統合)
             \   /       \   /
              feature     feature
```

| ブランチ | 用途 | 保護 |
|---------|------|------|
| `main` | 本番環境 | ✅ 保護 |
| `develop` | 開発統合 | ✅ 保護 |
| `feature/*` | 機能開発 | - |
| `fix/*` | バグ修正 | - |
| `hotfix/*` | 緊急修正（main から分岐） | - |
| `release/*` | リリース準備 | - |

---

## 2. ブランチ命名規則

### 2.1 フォーマット

```
{type}/{feature-id}-{short-description}
```

### 2.2 タイプ一覧

| タイプ | 用途 | 例 |
|-------|------|-----|
| `feature` | 新機能 | `feature/AUTH-001-login` |
| `fix` | バグ修正 | `fix/AUTH-001-validation-error` |
| `hotfix` | 緊急修正 | `hotfix/security-patch` |
| `refactor` | リファクタリング | `refactor/api-client` |
| `docs` | ドキュメント | `docs/readme-update` |
| `chore` | 雑務（依存更新等） | `chore/upgrade-nuxt` |

### 2.3 命名ルール

- 英小文字のみ
- 単語はハイフン区切り
- 50文字以内
- 機能IDを含める（あれば）

```bash
# ✅ Good
feature/AUTH-001-login
feature/EVT-001-event-planning-ai
fix/AUTH-001-email-validation

# ❌ Bad
Feature/UserAuth           # 大文字
feature/user_auth          # アンダースコア
feature/implementUserAuthenticationFeature  # 長すぎる
```

---

## 3. コミットメッセージ

### 3.1 Conventional Commits

```
{type}({scope}): {subject}

{body}

{footer}
```

### 3.2 タイプ一覧

| タイプ | 用途 | 例 |
|-------|------|-----|
| `feat` | 新機能 | `feat(auth): add login endpoint` |
| `fix` | バグ修正 | `fix(auth): validate email format` |
| `docs` | ドキュメント | `docs(readme): add setup guide` |
| `style` | フォーマット | `style: format with eslint` |
| `refactor` | リファクタリング | `refactor(api): extract validation` |
| `test` | テスト | `test(auth): add login tests` |
| `chore` | 雑務 | `chore(deps): upgrade nuxt to 3.x` |
| `perf` | パフォーマンス | `perf(db): add index to events` |
| `ci` | CI/CD | `ci: add lint workflow` |
| `revert` | リバート | `revert: feat(auth): add login` |

### 3.3 scope 一覧

| scope | 対象 |
|-------|------|
| `auth` | 認証・認可（AUTH-xxx） |
| `acct` | アカウント（ACCT-xxx） |
| `event` | イベント管理（EVT-xxx） |
| `venue` | 会場・JV（VENUE-xxx） |
| `task` | タスク管理 |
| `ai` | AIアシスト（AI-xxx） |
| `ui` | UIコンポーネント |
| `db` | データベース |
| `api` | API全般 |
| `deps` | 依存パッケージ |
| `infra` | インフラ・Docker |

### 3.4 ルール

| ルール | 説明 |
|-------|------|
| 現在形 | `add` not `added` |
| 小文字開始 | `add feature` not `Add feature` |
| 末尾ピリオドなし | `add feature` not `add feature.` |
| 50文字以内（subject） | 簡潔に |
| 命令形 | `add` not `adds` / `adding` |

### 3.5 例

```bash
# ✅ Good
feat(auth): add email/password login with Better Auth

Implement login flow:
- Add server/api/auth/[...all].ts handler
- Add login page with form validation
- Add useAuth composable

Refs: AUTH-001

# ❌ Bad
updated login stuff    # タイプなし、曖昧
feat: Add New Feature  # 大文字、曖昧
```

---

## 4. プルリクエスト

### 4.1 PRテンプレート

```markdown
## 概要
<!-- このPRで何を実現するか -->

## 関連機能ID
<!-- AUTH-001, EVT-002 等 -->

## 変更内容
-
-
-

## 確認項目
- [ ] ローカルで動作確認済み
- [ ] テストを追加/更新した
- [ ] lint/型チェックが通る
- [ ] 仕様書（SSOT）と整合している

## スクリーンショット（UI変更がある場合）
<!-- 変更前後のスクリーンショット -->
```

### 4.2 PRルール

| ルール | 設定 |
|-------|------|
| タイトル形式 | Conventional Commits 形式 |
| マージ方式 | Squash and merge |
| マージ後のブランチ | 自動削除 |
| CI必須 | lint, test, typecheck |

### 4.3 PRサイズ

| サイズ | 行数目安 | 推奨 |
|-------|---------|------|
| XS | < 50行 | ✅ 理想的 |
| S | 50-200行 | ✅ 良い |
| M | 200-500行 | ⚠️ 分割を検討 |
| L | 500行以上 | ❌ 分割必須 |

---

## 5. マージ戦略

### 5.1 feature → develop: Squash and Merge

```bash
feature/xxx: a → b → c → d
            ↓
develop: ●─────────────────●
                            └── feat(auth): add login (#123)
```

### 5.2 develop → main: Merge Commit

```bash
main: ●─────────────────●
       \               /
develop: ──●──●──●──●──┘
```

---

## 6. 保護ブランチ設定

### 6.1 main ブランチ

| 設定 | 値 |
|------|-----|
| 直接プッシュ | ❌ 禁止 |
| ステータスチェック必須 | lint, test, typecheck |
| 最新コミット必須 | ✅ |

### 6.2 develop ブランチ

| 設定 | 値 |
|------|-----|
| 直接プッシュ | ❌ 禁止 |
| ステータスチェック必須 | lint, test |

---

## 7. 運用フロー

### 7.1 機能開発

```bash
# 1. 最新の develop から分岐
git checkout develop
git pull origin develop
git checkout -b feature/AUTH-001-login

# 2. 開発・コミット
git add .
git commit -m "feat(auth): add login form"

# 3. プッシュ
git push origin feature/AUTH-001-login

# 4. develop へ PR を作成

# 5. マージ（Squash and merge）

# 6. ローカルブランチ削除
git checkout develop
git pull origin develop
git branch -d feature/AUTH-001-login
```

### 7.2 緊急修正（Hotfix）

```bash
# 1. main から分岐
git checkout main
git pull origin main
git checkout -b hotfix/security-patch

# 2. 修正・コミット
git add .
git commit -m "fix(auth): patch security vulnerability"

# 3. main へ PR を作成（優先レビュー）

# 4. マージ後、develop にも反映
git checkout develop
git merge main
```

---

## 8. Git Hooks

### 8.1 pre-commit

```bash
#!/bin/sh
# .husky/pre-commit
pnpm lint-staged
```

### 8.2 commit-msg

```bash
#!/bin/sh
# .husky/commit-msg
npx --no -- commitlint --edit $1
```

### 8.3 commitlint 設定

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci', 'revert'],
    ],
    'subject-max-length': [2, 'always', 72],
  },
};
```

---

## 9. 禁止事項

| 禁止事項 | 理由 |
|---------|------|
| main への直接プッシュ | レビューを経由しない |
| `--force` プッシュ（共有ブランチ） | 他の人の作業を消す可能性 |
| 巨大なPR（500行以上） | レビュー品質低下 |
| WIPコミットのまま放置 | 履歴が汚れる |
| 機密情報のコミット | セキュリティリスク |

---

## 変更履歴

| 日付 | 変更内容 | 変更者 |
|------|---------|-------|
| 2026-02-08 | 初版作成（Git Flow + Conventional Commits + 機能ID連携） | AI |
