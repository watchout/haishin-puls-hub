# AUTH-001: ログイン機能

## メタ情報

| 項目 | 内容 |
|------|------|
| 機能ID | AUTH-001 |
| 機能名 | ログイン機能 |
| カテゴリ | 認証・認可 |
| 優先度 | P0 |
| ステータス | Approved |
| 作成日 | 2026-02-09 |
| 最終更新日 | 2026-02-09 |
| ベース | common-features/auth/AUTH-001_login.md |

---

## 1. 概要

### 1.1 機能の目的（1-2文）

ユーザーがメールアドレス/パスワードまたは Google OAuth を使用してシステムにログインし、Cookie ベースの認証済みセッションを確立する機能。ログイン後はユーザーのロールに応じたダッシュボードへ自動リダイレクトし、所属テナントを自動識別する。

### 1.2 ユーザーストーリー

```
As a 登録済みユーザー,
I want to メールアドレス/パスワードまたは Google アカウントでログインしたい,
so that 自分のアカウントにアクセスしてサービスを利用できる.
```

### 1.3 スコープ

**In Scope（この機能でやること）**:
- メール/パスワード認証
- Google OAuth 認証
- Cookie セッション作成（Better Auth 標準）
- ロール別リダイレクト
- テナント自動識別（`user_tenant.is_default` を使用）
- ログイン失敗時のエラー表示
- アカウントロック機能

**Out of Scope（この機能ではやらないこと）**:
- Microsoft OAuth（Phase 2 で対応）
- パスワードリセット（AUTH-006 で対応）
- 多要素認証（AUTH-008 で対応）
- テナント選択画面（1ユーザー1テナント固定のため不要）

---

## 2. 受入条件（Acceptance Criteria）

### 2.1 正常系

| # | 条件 | 検証方法 |
|---|------|---------|
| AC-001 | ユーザーが正しいメール/パスワードを入力したとき、ログインに成功する | ユニットテスト |
| AC-002 | ログイン成功後、ロールに応じたページに遷移する（下記ルール参照） | E2Eテスト |
| AC-003 | `next` パラメータがある場合、指定されたURLに遷移する | E2Eテスト |
| AC-004 | `remember_me` にチェックした場合、セッションが30日間維持される | 統合テスト |
| AC-005 | `remember_me` にチェックしない場合、セッションが7日間維持される（Better Auth デフォルト） | 統合テスト |
| AC-006 | Google OAuth でログインに成功する | E2Eテスト |
| AC-007 | ログイン成功時、ユーザーのデフォルトテナント（`is_default = true`）が自動セットされる | 統合テスト |

**ロール別リダイレクト先:**

| ロール | リダイレクト先 | 説明 |
|-------|-------------|------|
| `system_admin` | `/app/admin` | システム管理画面 |
| `tenant_admin` | `/app` | ダッシュボード |
| `organizer` | `/app` | ダッシュボード |
| `venue_staff` | `/app` | ダッシュボード |
| `streaming_provider` | `/app` | ダッシュボード |
| `event_planner` | `/app` | ダッシュボード |
| `speaker` | `/app/events` | イベント一覧 |
| `sales_marketing` | `/app` | ダッシュボード |
| `participant` | `/app/events` | イベント一覧 |
| `vendor` | `/app/events` | イベント一覧 |

### 2.2 異常系

| # | 条件 | 検証方法 |
|---|------|---------|
| AC-101 | パスワードが間違っている場合、エラーメッセージ「メールアドレスまたはパスワードが正しくありません」を表示 | ユニットテスト |
| AC-102 | 存在しないメールアドレスの場合、同じエラーメッセージを表示（情報漏洩防止） | ユニットテスト |
| AC-103 | アカウントがロックされている場合、「アカウントがロックされています。{X}分後に再試行してください」を表示 | ユニットテスト |
| AC-104 | アカウントが無効化されている場合、「アカウントが無効化されています」を表示 | ユニットテスト |
| AC-105 | メールアドレスが空の場合、「メールアドレスを入力してください」を表示 | ユニットテスト |
| AC-106 | パスワードが空の場合、「パスワードを入力してください」を表示 | ユニットテスト |
| AC-107 | メールアドレスが不正な形式の場合、「有効なメールアドレスを入力してください」を表示 | ユニットテスト |
| AC-108 | Google OAuth がキャンセルされた場合、ログイン画面に戻りエラー表示 | E2Eテスト |

### 2.3 エッジケース

| # | 条件 | 検証方法 |
|---|------|---------|
| AC-201 | ログイン5回失敗でアカウントを30分ロック | 統合テスト |
| AC-202 | ロック後30分経過でロック解除 | 統合テスト |
| AC-203 | 同時セッション数が3を超えた場合、最古のセッションを自動的に無効化 | 統合テスト |
| AC-204 | すでにログイン済みの状態で /login にアクセスした場合、ロール別リダイレクト先に遷移 | E2Eテスト |
| AC-205 | `next` パラメータに外部URLが指定された場合、無視してロール別リダイレクト先に遷移（オープンリダイレクト防止） | E2Eテスト |
| AC-206 | Google OAuth で初回ログイン（未登録ユーザー）の場合、サインアップ画面へ誘導する | E2Eテスト |
| AC-207 | ユーザーがテナントに未所属（`user_tenant` レコードなし）の場合、エラーメッセージ表示 | 統合テスト |

### 2.4 入出力例（§3-E） [DETAIL]

| # | 入力 | 条件 | 期待出力 | 備考 |
|---|------|------|---------|------|
| 1 | email: "organizer@example.com", password: "Valid123!" | 正常・organizer ロール | 200, Cookie セット → login-context → redirectTo: "/app" | 基本の正常系 |
| 2 | email: "ADMIN@Example.COM", password: "Admin456!" | email 大文字混在・system_admin | 200, Cookie → redirectTo: "/app/admin" | email は大文字小文字区別しない |
| 3 | email: "participant@example.com", password: "Part789!", rememberMe: true | remember_me ON・participant | 200, Cookie (maxAge=30日) → redirectTo: "/app/events" | セッション30日 |
| 4 | email: "organizer@example.com", password: "WrongPass!" | パスワード不一致 | 401, "メールアドレスまたはパスワードが正しくありません" | エラーメッセージ統一 |
| 5 | email: "nonexist@example.com", password: "Any123!" | 存在しないメール | 401, "メールアドレスまたはパスワードが正しくありません" | 存在有無を漏らさない |
| 6 | email: "", password: "" | 両方空 | 400, フィールドエラー2件 | フロントエンド Zod バリデーション |
| 7 | email: "invalid", password: "Valid123!" | email 形式不正 | 400, "有効なメールアドレスを入力してください" | フロントエンド Zod |
| 8 | email: "locked@example.com", password: "Valid123!" | 5回連続失敗後のアカウント | 423, "アカウントがロックされています。30分後に再試行してください" | ロック状態 |
| 9 | email: "disabled@example.com", password: "Valid123!" | is_active=false | 401, "アカウントが無効化されています" | 無効化 |
| 10 | email: "no-tenant@example.com", password: "Valid123!" | user_tenant レコードなし | 認証成功 → login-context 422, "所属する組織がありません" | テナント未所属 |

### 2.5 境界値（§3-F） [DETAIL]

| 項目 | 最小値 | 最大値 | 空 | NULL | 不正形式 |
|------|--------|--------|-----|------|---------|
| email | "a@b.co" (6文字) → OK | 255文字 → OK | "" → VAL: "メールアドレスを入力してください" | undefined → VAL: "メールアドレスを入力してください" | "abc" → VAL: "有効なメールアドレスを入力してください" |
| password | 1文字 → OK (Better Auth 側で検証) | 128文字 → OK | "" → VAL: "パスワードを入力してください" | undefined → VAL: "パスワードを入力してください" | - (文字列なら全て許可、サーバー側で bcrypt 検証) |
| email (256文字超) | - | 256文字 → 400 (Zod maxLength) | - | - | - |
| password (129文字超) | - | 129文字 → 400 (Zod maxLength) | - | - | - |
| rememberMe | false → 7日セッション | true → 30日セッション | undefined → false | null → false | "yes" → 型エラー 400 |
| next パラメータ | "/app" → リダイレクト | "/app/events/01HXYZ..." → リダイレクト | なし → ロール別デフォルト | - | "https://evil.com" → 無視、ロール別デフォルト |
| next パラメータ | "//" → 外部URL扱い、無視 | - | - | - | "javascript:alert(1)" → 無視 |

### 2.6 例外レスポンス（§3-G） [DETAIL]

| # | 例外条件 | HTTPステータス | エラーコード | ユーザーメッセージ | リトライ可否 | 復旧方法 |
|---|---------|---------------|------------|-----------------|------------|---------|
| 1 | パスワード不一致 | 401 | INVALID_CREDENTIALS | メールアドレスまたはパスワードが正しくありません | Yes | 再入力 |
| 2 | ユーザー存在しない | 401 | INVALID_CREDENTIALS | メールアドレスまたはパスワードが正しくありません | Yes | 再入力（同じメッセージ） |
| 3 | アカウントロック | 423 | ACCOUNT_LOCKED | アカウントがロックされています。30分後に再試行してください | Yes (30min) | 時間経過 |
| 4 | アカウント無効 | 401 | ACCOUNT_DISABLED | アカウントが無効化されています。サポートにお問い合わせください | No | サポート連絡 |
| 5 | テナント未所属 | 422 | NO_TENANT | 所属する組織がありません。管理者にお問い合わせください | No | 管理者が招待 |
| 6 | レート制限 | 429 | RATE_LIMITED | しばらく時間をおいて再試行してください | Yes (60s) | 時間経過 |
| 7 | OAuth キャンセル | - (redirect) | OAUTH_CANCELLED | Google ログインがキャンセルされました | Yes | 再試行 |
| 8 | OAuth 未登録ユーザー | 302 | - | - (サインアップ画面へリダイレクト) | - | サインアップ |
| 9 | ネットワークエラー | - (fetch失敗) | NETWORK_ERROR | 通信エラーが発生しました。再試行してください | Yes | 再試行 |
| 10 | サーバーエラー | 500 | INTERNAL_ERROR | システムエラーが発生しました。しばらく経ってから再試行してください | Yes | 自動復旧待ち |

### 2.7 受け入れテスト（§3-H Gherkin） [DETAIL]

```gherkin
Feature: AUTH-001 ログイン機能

  Background:
    Given ユーザー "organizer@example.com" が登録済み
    And パスワードが "Valid123!" で設定済み
    And テナント "ビジョンセンター" にロール "organizer" で所属
    And user_tenant.is_default が true

  Scenario: 正常ログイン（メール/パスワード）
    When email "organizer@example.com" と password "Valid123!" でログインする
    Then ステータスコード 200 が返される
    And Set-Cookie ヘッダーにセッション Cookie が含まれる
    And login-context API が tenant "ビジョンセンター" と role "organizer" を返す
    And "/app" にリダイレクトされる

  Scenario: remember_me ON でセッション30日
    When email "organizer@example.com" と password "Valid123!" と rememberMe true でログインする
    Then セッション Cookie の有効期限が 30日後である

  Scenario: remember_me OFF でセッション7日
    When email "organizer@example.com" と password "Valid123!" と rememberMe false でログインする
    Then セッション Cookie の有効期限が 7日後である

  Scenario: パスワード不一致
    When email "organizer@example.com" と password "WrongPass!" でログインする
    Then ステータスコード 401 が返される
    And エラーメッセージ "メールアドレスまたはパスワードが正しくありません" が表示される

  Scenario: 存在しないメールアドレス
    When email "nonexist@example.com" と password "Any123!" でログインする
    Then ステータスコード 401 が返される
    And エラーメッセージ "メールアドレスまたはパスワードが正しくありません" が表示される
    And パスワード不一致と同一のエラーメッセージである

  Scenario: 5回連続失敗でアカウントロック
    Given ユーザー "organizer@example.com" の login_attempts が過去30分以内に4回失敗
    When 誤ったパスワードで1回ログインする
    Then ステータスコード 423 が返される
    And エラーメッセージに "30分後に再試行してください" が含まれる

  Scenario: ロック解除後のログイン
    Given ユーザー "organizer@example.com" がロック中
    And 30分が経過した
    When 正しいパスワードでログインする
    Then ステータスコード 200 が返される

  Scenario: テナント未所属ユーザー
    Given ユーザー "no-tenant@example.com" が登録済みだがテナント未所属
    When 正しいパスワードでログインする
    Then 認証は成功する
    And login-context API がステータスコード 422 を返す
    And エラーメッセージ "所属する組織がありません" が表示される

  Scenario: next パラメータによるリダイレクト
    Given URL パラメータ next="/app/settings" が付いている
    When 正しい認証情報でログインする
    Then "/app/settings" にリダイレクトされる

  Scenario: next パラメータに外部URL（オープンリダイレクト防止）
    Given URL パラメータ next="https://evil.com" が付いている
    When 正しい認証情報でログインする
    Then 外部URLは無視される
    And ロール別デフォルトリダイレクト先 "/app" にリダイレクトされる

  Scenario: ロール別リダイレクト（system_admin）
    Given ユーザーのロールが "system_admin"
    When 正しい認証情報でログインする
    Then "/app/admin" にリダイレクトされる

  Scenario: ロール別リダイレクト（participant）
    Given ユーザーのロールが "participant"
    When 正しい認証情報でログインする
    Then "/app/events" にリダイレクトされる

  Scenario: ログイン済みで /login にアクセス
    Given ユーザーが既にログイン済み
    When /login にアクセスする
    Then ロール別リダイレクト先に自動遷移する

  Scenario: Google OAuth 正常ログイン
    Given Google アカウントに紐づく account レコードが存在する
    When "Google でログイン" ボタンをクリックする
    And Google で認証を完了する
    Then /login?oauth=success にリダイレクトされる
    And セッション Cookie がセットされる
    And login-context API で テナント・ロール取得後にリダイレクトされる

  Scenario: Google OAuth 未登録ユーザー
    Given Google アカウントに紐づく account レコードが存在しない
    When "Google でログイン" ボタンをクリックする
    And Google で認証を完了する
    Then /signup にリダイレクトされる（自動登録しない）
```

---

## 3. UI仕様

### 3.1 画面一覧

| Screen ID | 画面名 | パス | 認証 | レイアウト |
|-----------|-------|------|------|----------|
| SCR-LOGIN | ログイン画面 | /login | 不要 | auth |

### 3.2 画面レイアウト

```
┌─────────────────────────────────────────────────┐
│                   [ロゴ]                         │
│              Haishin+ HUB                        │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│   ┌──────────────────────────────────────────┐   │
│   │  エラーメッセージバナー（エラー時のみ）      │   │
│   └──────────────────────────────────────────┘   │
│                                                  │
│   メールアドレス                                  │
│   ┌──────────────────────────────────────────┐   │
│   │ example@email.com                        │   │
│   └──────────────────────────────────────────┘   │
│   [フィールドエラー]                              │
│                                                  │
│   パスワード                                      │
│   ┌──────────────────────────────────────────┐   │
│   │ ••••••••                           [👁]  │   │
│   └──────────────────────────────────────────┘   │
│   [フィールドエラー]                              │
│                                                  │
│   [✓] ログイン状態を保持する                      │
│                                                  │
│   ┌──────────────────────────────────────────┐   │
│   │              ログイン                     │   │
│   └──────────────────────────────────────────┘   │
│                                                  │
│   パスワードをお忘れですか？                       │
│                                                  │
│   ──────────── または ────────────               │
│                                                  │
│   ┌──────────────────────────────────────────┐   │
│   │    [G] Googleでログイン                   │   │
│   └──────────────────────────────────────────┘   │
│                                                  │
│   アカウントをお持ちでない方 → 新規登録            │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 3.3 UI要素詳細

| 要素 | 種類 | バリデーション | 備考 |
|------|------|--------------|------|
| ロゴ | image | - | クリックで / へ遷移 |
| エラーバナー | UAlert (color="error") | - | 左にアイコン、右に閉じるボタン |
| メールアドレス | UInput (type="email") | MUST: 必須、メール形式 | プレースホルダー: "example@email.com" |
| パスワード | UInput (type="password") | MUST: 必須 | 表示/非表示トグルあり |
| 表示トグル | UButton (icon) | - | 目のアイコン、クリックで表示/非表示切替 |
| ログイン状態を保持 | UCheckbox | - | チェック時: 30日間セッション維持 |
| ログインボタン | UButton (type="submit") | - | プライマリカラー、幅100%、Nuxt UI v3 |
| パスワード忘れリンク | NuxtLink | - | → /forgot-password |
| Google ログインボタン | UButton (variant="outline") | - | Google ブランドガイドライン準拠 |
| 新規登録リンク | NuxtLink | - | → /signup |

### 3.4 状態別表示

| 状態 | 表示内容 |
|------|---------|
| 初期表示 | フォーム表示、エラーバナー非表示 |
| 入力中 | リアルタイムバリデーション（フィールド離脱時） |
| バリデーションエラー | フィールド下に赤字でエラーメッセージ、フィールド枠を赤色に |
| 送信中 | ボタン無効化、テキストを「ログイン中...」に、loading 属性 |
| サーバーエラー | フォーム上部に UAlert (color="error") 表示 |
| ログイン成功 | 即座にリダイレクト（UIフィードバックなし） |
| OAuth 処理中 | Google ログインボタンを loading 状態に |

### 3.5 レスポンシブ対応

| ブレークポイント | 対応 |
|----------------|------|
| モバイル（< 640px） | フォーム幅100%、左右 padding: 16px |
| タブレット（640-1024px） | フォーム幅80%、中央配置 |
| デスクトップ（> 1024px） | フォーム幅400px固定、中央配置 |

---

## 4. 状態遷移

### 4.1 認証状態（参照: SSOT-2）

この機能で扱う認証状態:
- S0: LOGGED_OUT（未ログイン）
- S1: LOGGED_IN（ログイン済み）

### 4.2 この機能の状態遷移

```
                    ┌─────────────┐
        ┌───────────│  S0: 未認証  │───────────┐
        │           └──────┬──────┘           │
        │                  │                  │
  already_logged_in   submit_login      validation_error
        │            / google_oauth          │
        │                  │                  │
        │           ┌──────▼──────┐           │
        │           │   処理中     │           │
        │           └──────┬──────┘           │
        │                  │                  │
        │   ┌──────────────┼──────────────┐   │
        │   │              │              │   │
        │ success      failure      locked/disabled
        │   │              │              │   │
        │   │              ▼              ▼   │
        │   │         ┌────────┐    ┌────────┐│
        │   │         │エラー表示│    │エラー表示││
        │   │         │→S0に戻る│    │        ││
        │   │         └────────┘    └────────┘│
        │   │                                  │
        │   ▼                                  │
        │ ┌──────────────────┐                 │
        │ │ S1: ログイン成功  │                 │
        │ │ テナント自動セット │                 │
        │ └───────┬──────────┘                 │
        │         │                            │
        └─────────┼────────────────────────────┘
                  │
                  ▼
          ┌────────────────┐
          │ ロール別        │
          │ リダイレクト先へ  │
          └────────────────┘
```

### 4.3 遷移ルール

| 現在の状態 | イベント | 次の状態 | アクション |
|-----------|---------|---------|-----------|
| S0 | ページアクセス | S0 | フォーム表示 |
| S0 | 入力 | S0 | リアルタイムバリデーション |
| S0 | submit（バリデーションエラー） | S0 | フィールドエラー表示 |
| S0 | submit（バリデーション成功） | 処理中 | Better Auth API 呼び出し、ボタン無効化 |
| S0 | Google OAuth クリック | 処理中 | Google OAuth フロー開始 |
| 処理中 | login_success | S1 | テナント自動セット → ロール別リダイレクト |
| 処理中 | login_failure | S0 | エラーバナー表示、フォーム有効化 |
| 処理中 | account_locked | S0 | ロックメッセージ表示 |
| 処理中 | account_disabled | S0 | 無効化メッセージ表示 |
| 処理中 | network_error | S0 | ネットワークエラー表示、リトライ可能 |
| 処理中 | oauth_cancelled | S0 | OAuth キャンセルメッセージ表示 |
| S1 | ページアクセス | S1 | ロール別リダイレクト先へ遷移 |

---

## 5. API仕様

### 5.1 エンドポイント一覧

Better Auth が提供するエンドポイントを使用する。カスタムエンドポイントは以下のみ:

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| POST | `/api/auth/sign-in/email` | メール/パスワードログイン | 不要 |
| GET | `/api/auth/sign-in/social` | Google OAuth 開始 | 不要 |
| GET | `/api/auth/callback/google` | Google OAuth コールバック | 不要 |
| GET | `/api/auth/session` | 現在のセッション取得 | 必要 |
| POST | `/api/v1/auth/login-context` | ログイン後コンテキスト取得（テナント・ロール） | 必要 |

### 5.2 POST /api/auth/sign-in/email（Better Auth 提供）

**リクエスト**:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "rememberMe": true
}
```

| フィールド | 型 | 必須 | バリデーション | 備考 |
|-----------|-----|------|--------------|------|
| email | string | MUST | メール形式、最大255文字 | |
| password | string | MUST | 1文字以上、128文字以下 | |
| rememberMe | boolean | MAY | - | デフォルト: false |

**レスポンス（成功）**: `200 OK`

```json
{
  "user": {
    "id": "01HXYZ...",
    "email": "user@example.com",
    "name": "山田 太郎",
    "emailVerified": true,
    "image": null
  },
  "session": {
    "id": "session_01ABC...",
    "expiresAt": "2026-03-11T10:00:00.000Z",
    "token": "..."
  }
}
```

> セッショントークンは `Set-Cookie` ヘッダで自動的に Cookie にセットされる。

**レスポンス（エラー）**:

| HTTPステータス | 条件 | メッセージ |
|--------------|------|-----------|
| 400 | バリデーションエラー | Better Auth 標準エラー |
| 401 | 認証失敗（パスワード不正または存在しないメール） | "Invalid credentials" |
| 423 | アカウントロック | "Account locked" |
| 429 | レート制限 | "Too many requests" |

### 5.3 POST /api/v1/auth/login-context（カスタム）

ログイン成功後にフロントエンドから呼び出し、テナント・ロール情報を取得する。

**リクエスト**: なし（Cookie セッションから自動取得）

**レスポンス（成功）**: `200 OK`

```json
{
  "data": {
    "tenant": {
      "id": "01HTENANT...",
      "name": "ビジョンセンター",
      "slug": "vision-center"
    },
    "role": "organizer",
    "redirectTo": "/app"
  }
}
```

**レスポンス（エラー）**:

| HTTPステータス | error.code | 条件 |
|--------------|------------|------|
| 401 | `UNAUTHORIZED` | セッションなし |
| 422 | `NO_TENANT` | テナント未所属 |

### 5.4 Google OAuth フロー

```
1. ユーザーが「Googleでログイン」ボタンクリック
2. フロントエンドが Better Auth の signIn.social({ provider: "google" }) を呼び出し
3. Google の認証画面にリダイレクト
4. ユーザーが Google で認証
5. /api/auth/callback/google にコールバック
6. Better Auth がセッション作成 + Cookie セット
7. フロントエンドにリダイレクト（/login?oauth=success）
8. フロントエンドが login-context API を呼び出してテナント・ロール取得
9. ロール別リダイレクト先に遷移
```

---

## 6. データモデル

### 6.1 関連テーブル

| テーブル | 用途 | 参照 |
|---------|------|------|
| user | ユーザー情報 | SSOT-4 §2.2 |
| user_tenant | ユーザー×テナント紐付（ロール含む） | SSOT-4 §2.3 |
| account | Better Auth 認証アカウント（パスワードハッシュ、OAuth） | Better Auth 管理 |
| session | Better Auth セッション管理 | Better Auth 管理 |
| login_attempts | ログイン試行記録 | 下記 |

### 6.2 新規テーブル: login_attempts

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | VARCHAR(26) | NO | - | 主キー（ULID） |
| email | VARCHAR(255) | NO | - | 試行したメールアドレス |
| ip_address | VARCHAR(45) | NO | - | IPアドレス |
| user_agent | VARCHAR(500) | YES | - | ブラウザ情報 |
| success | BOOLEAN | NO | - | 成功/失敗 |
| failure_reason | VARCHAR(50) | YES | - | 失敗理由 |
| created_at | TIMESTAMPTZ | NO | CURRENT_TIMESTAMP | 試行日時 |

**failure_reason の値**:
- `invalid_password` - パスワード不正
- `user_not_found` - ユーザーなし
- `account_locked` - アカウントロック中
- `account_disabled` - アカウント無効化
- `oauth_error` - OAuth エラー

**インデックス**:
- `idx_login_attempts_email_created` (email, created_at DESC)
- `idx_login_attempts_ip_created` (ip_address, created_at DESC)

**データ保持**: 90日経過後に自動削除

### 6.3 データ操作

| 操作 | テーブル | 条件/内容 |
|------|---------|----------|
| SELECT | user_tenant | WHERE user_id = :user_id AND is_default = true |
| INSERT | login_attempts | ログイン試行記録 |
| UPDATE | user | SET last_login_at = NOW() WHERE id = :user_id |

> `user` の検索、`session` の作成/無効化は Better Auth が内部で管理する。

---

## 7. ビジネスロジック

### 7.1 メール/パスワード ログインフロー

```
1. 入力バリデーション（フロントエンド）
   ├─ email が空 → フィールドエラー「メールアドレスを入力してください」
   ├─ email が不正形式 → フィールドエラー「有効なメールアドレスを入力してください」
   ├─ password が空 → フィールドエラー「パスワードを入力してください」
   └─ OK → 2へ

2. Better Auth signIn.email() 呼び出し
   → Better Auth 内部で以下を実行:
   ├─ ユーザー検索
   ├─ パスワード検証（bcrypt）
   ├─ セッション作成
   └─ Cookie セット

3. レート制限チェック（サーバーミドルウェア）
   ├─ 同一IP: 10回/分 超過 → 429 Too Many Requests
   └─ OK → 4へ

4. アカウントロック確認（Better Auth フック）
   ├─ 過去30分で5回以上失敗 → 423 Account Locked（残り時間を計算）
   └─ ロックなし → Better Auth の認証処理へ

5. Better Auth 認証結果
   ├─ 失敗 → login_attempts 記録 → エラー返却
   └─ 成功 → 6へ

6. login-context API 呼び出し
   ├─ user_tenant から is_default = true のレコードを取得
   ├─ テナント未所属 → 422 NO_TENANT
   └─ テナント・ロール取得成功 → 7へ

7. ロール別リダイレクト先決定
   ├─ next パラメータあり（同一オリジン）→ next パラメータの URL へ
   └─ next パラメータなし → ロール別デフォルトURL へ

8. ログイン成功処理
   ├─ login_attempts 記録（success = true）
   ├─ user.last_login_at 更新
   └─ リダイレクト
```

### 7.2 Google OAuth ログインフロー

```
1. ユーザーが「Googleでログイン」ボタンクリック

2. Better Auth signIn.social({ provider: "google" }) 呼び出し
   → Google OAuth 画面にリダイレクト

3. Google で認証完了 → /api/auth/callback/google にコールバック

4. Better Auth コールバック処理
   ├─ Google アカウントに紐づく account レコードを検索
   ├─ 存在する → 既存ユーザーとしてセッション作成
   ├─ 存在しない → ユーザー未登録とみなす
   │   └─ /signup?oauth=google&email=xxx へリダイレクト（MUST NOT 自動登録）
   └─ セッション作成 + Cookie セット

5. login-context API → テナント・ロール取得 → ロール別リダイレクト
```

### 7.3 テナント自動識別ロジック

```typescript
// server/api/v1/auth/login-context.get.ts
async function resolveLoginContext(userId: string) {
  // 1. user_tenant から is_default = true のレコードを取得
  const membership = await db
    .select()
    .from(userTenants)
    .where(and(
      eq(userTenants.userId, userId),
      eq(userTenants.isDefault, true),
    ))
    .limit(1);

  if (membership.length === 0) {
    throw createAppError('NO_TENANT', 'テナントに所属していません', 422);
  }

  const { tenantId, role } = membership[0];

  // 2. ロール別リダイレクト先を決定
  const redirectTo = getRedirectByRole(role);

  return { tenantId, role, redirectTo };
}

function getRedirectByRole(role: string): string {
  switch (role) {
    case 'system_admin':
      return '/app/admin';
    case 'speaker':
    case 'participant':
    case 'vendor':
      return '/app/events';
    default:
      return '/app';
  }
}
```

### 7.4 セキュリティ要件

| 要件 | 実装 |
|------|------|
| パスワード検証 | Better Auth 内部の bcrypt.compare（タイミング攻撃対策済み） |
| パスワード保存 | Better Auth 内部の bcrypt（cost=10, Better Auth デフォルト） |
| 情報漏洩防止 | メール存在有無を漏らさない（同じエラーメッセージ） |
| ブルートフォース対策 | レート制限 + アカウントロック |
| セッション管理 | Better Auth Cookie セッション（HttpOnly, Secure, SameSite=Lax） |
| セッション有効期限 | デフォルト: 7日（アクティブ時自動延長）、remember_me: 30日 |
| オープンリダイレクト防止 | `next` パラメータのオリジン検証 |
| OAuth セキュリティ | state パラメータ（CSRF対策）、PKCE（Better Auth 標準） |

---

## 8. エラーハンドリング

### 8.1 フロントエンド

| エラー種別 | 表示方法 | メッセージ |
|-----------|---------|-----------|
| フィールドバリデーション | フィールド直下（UFormGroup error） | バリデーションメッセージ |
| 認証エラー | フォーム上部 UAlert (color="error") | 「メールアドレスまたはパスワードが正しくありません」 |
| アカウントロック | フォーム上部 UAlert (color="error") | 「アカウントがロックされています。{X}分後に再試行してください」 |
| アカウント無効 | フォーム上部 UAlert (color="error") | 「アカウントが無効化されています。サポートにお問い合わせください」 |
| テナント未所属 | フォーム上部 UAlert (color="error") | 「所属する組織がありません。管理者にお問い合わせください」 |
| レート制限 | フォーム上部 UAlert (color="warning") | 「しばらく時間をおいて再試行してください」 |
| OAuth キャンセル | フォーム上部 UAlert (color="warning") | 「Google ログインがキャンセルされました」 |
| ネットワークエラー | フォーム上部 UAlert (color="error") | 「通信エラーが発生しました。再試行してください」 |
| サーバーエラー | フォーム上部 UAlert (color="error") | 「システムエラーが発生しました。しばらく経ってから再試行してください」 |

### 8.2 バックエンド

| エラー種別 | HTTPステータス | ログレベル | ログ内容 |
|-----------|--------------|-----------|---------|
| バリデーションエラー | 400 | DEBUG | リクエスト内容（パスワード除く） |
| 認証失敗 | 401 | INFO | email(masked), ip, user_agent, failure_reason |
| アカウントロック | 423 | WARN | email(masked), ip, lock_until |
| アカウント無効 | 401 | INFO | email(masked), user_id |
| テナント未所属 | 422 | WARN | user_id |
| レート制限 | 429 | WARN | ip, request_count |
| OAuth エラー | 500 | ERROR | provider, error_detail |
| サーバーエラー | 500 | ERROR | スタックトレース |

---

## 9. テスト仕様

### 9.1 ユニットテスト

| テストID | テストケース | 入力 | 期待結果 |
|----------|-------------|------|---------|
| TC-001 | 正常ログイン | 正しい email/password | 200 + セッション Cookie セット |
| TC-002 | パスワード不正 | 正しい email + 不正 password | 401 |
| TC-003 | メール不存在 | 存在しない email | 401（同じエラー） |
| TC-004 | email 空 | email="" | 400 |
| TC-005 | email 形式不正 | email="invalid" | 400 |
| TC-006 | password 空 | password="" | 400 |
| TC-007 | アカウント無効 | disabled 状態のユーザー | 401 |
| TC-008 | rememberMe=true | rememberMe=true | 30日有効のセッション |
| TC-009 | rememberMe=false | rememberMe=false | 7日有効のセッション |
| TC-010 | ロール別リダイレクト（organizer） | role=organizer | redirectTo="/app" |
| TC-011 | ロール別リダイレクト（participant） | role=participant | redirectTo="/app/events" |
| TC-012 | ロール別リダイレクト（system_admin） | role=system_admin | redirectTo="/app/admin" |
| TC-013 | テナント自動識別 | is_default=true のレコードあり | 正しい tenantId 返却 |
| TC-014 | テナント未所属 | user_tenant レコードなし | 422 NO_TENANT |

### 9.2 統合テスト

| テストID | テストケース | 手順 | 期待結果 |
|----------|-------------|------|---------|
| TC-101 | アカウントロック | 5回連続失敗 | 6回目で 423 |
| TC-102 | ロック解除 | ロック後30分経過 | ログイン可能 |
| TC-103 | 同時セッション制限 | 4台目でログイン | 最古セッション無効化 |
| TC-104 | ログイン試行記録 | ログイン試行 | login_attempts にレコード作成 |
| TC-105 | last_login_at 更新 | ログイン成功 | user.last_login_at 更新 |
| TC-106 | Google OAuth 成功 | 既存ユーザーで OAuth ログイン | セッション作成 + Cookie |
| TC-107 | Google OAuth 未登録 | 未登録ユーザーで OAuth | /signup へリダイレクト |

### 9.3 E2Eテスト

| テストID | テストケース | 手順 | 期待結果 |
|----------|-------------|------|---------|
| TC-201 | 正常ログインフロー（organizer） | /login → 入力 → 送信 | /app に遷移 |
| TC-202 | 正常ログインフロー（participant） | /login → 入力 → 送信 | /app/events に遷移 |
| TC-203 | next パラメータ | /login?next=/app/settings → ログイン | /app/settings に遷移 |
| TC-204 | 外部URLの next | /login?next=https://evil.com → ログイン | /app に遷移（外部URL無視） |
| TC-205 | ログイン済みでアクセス | ログイン状態で /login | ロール別リダイレクト先に遷移 |
| TC-206 | エラー表示 | 不正パスワード入力 | エラーバナー表示 |
| TC-207 | パスワード表示切替 | 目アイコンクリック | パスワード表示/非表示 |
| TC-208 | ローディング状態 | ログインボタンクリック | ボタン無効化 + loading |
| TC-209 | Google OAuth フロー | Google ログインボタンクリック | Google 認証画面表示 → ログイン成功 |

---

## 10. 非機能要件

### 10.1 パフォーマンス

| 指標 | 目標値 |
|------|-------|
| API応答時間（p95） | < 500ms |
| ページ読み込み（LCP） | < 2.5秒 |
| OAuth リダイレクト完了 | < 5秒 |

### 10.2 可用性

| 指標 | 目標値 |
|------|-------|
| 稼働率 | 99.9% |

### 10.3 セキュリティ

| 項目 | 対応 |
|------|------|
| HTTPS | MUST |
| CSRF | Better Auth セッション Cookie（SameSite=Lax）+ Origin チェック |
| XSS | Nuxt のデフォルトエスケープ |
| ブルートフォース | レート制限 + アカウントロック |
| タイミング攻撃 | Better Auth の bcrypt.compare |
| OAuth | state パラメータ + PKCE |

---

## 11. 依存関係

### 11.1 前提となる機能

| 機能ID | 機能名 | 依存内容 |
|--------|-------|---------|
| - | - | この機能は依存なし（最初に実装可能） |

### 11.2 この機能に依存する機能

| 機能ID | 機能名 | 依存内容 |
|--------|-------|---------|
| AUTH-005 | ログアウト | セッション管理 |
| AUTH-006 | パスワードリセット | user テーブル |
| AUTH-009 | セッション管理 | Better Auth session |
| ACCT-001 | サインアップ | 認証基盤 |
| 全 Protected 機能 | - | 認証状態 |

---

## 12. 未決定事項・制約 [DETAIL]

### 12.1 未決定事項（TBD）

| # | 項目 | 層 | 理由 | デフォルト案 |
|---|------|-----|------|------------|
| - | - | - | 全て決定済み | - |

> CORE層・CONTRACT層のTBDはゼロ。DETAIL層のTBDもゼロ。

### 12.2 前提条件

- Better Auth v1.4+ がインストール済み
- PostgreSQL 16 が稼働中
- BETTER_AUTH_SECRET 環境変数が設定済み
- Google OAuth のクライアントID/シークレットは任意（未設定時は Google ログインボタン非表示）

### 12.3 制約事項

- Better Auth の管理テーブル（account, session, verification）は直接操作しない
- パスワードハッシュは Better Auth 内部の bcrypt（cost=10）に委譲
- OAuth プロバイダは Google のみ（Microsoft は Phase 2）
- 多要素認証は AUTH-008 で対応（この機能のスコープ外）
- セッション Cookie は HttpOnly, Secure, SameSite=Lax（Better Auth デフォルト）

---

## 13. 実装メモ（AI向け）

### 12.1 実装順序

```
1. Better Auth セットアップ
   - server/utils/auth.ts — Better Auth インスタンス作成
   - Google OAuth プロバイダ設定
   - Organization プラグイン設定
   - server/api/auth/[...all].ts — Better Auth ハンドラ

2. DBマイグレーション
   - login_attempts テーブル作成（Drizzle スキーマ）
   - Better Auth 管理テーブル（自動マイグレーション）

3. カスタムAPI
   - POST /api/v1/auth/login-context — テナント・ロール取得
   - Better Auth フック — ログイン試行記録、アカウントロック

4. フロントエンド
   - composables/useAuth.ts — Better Auth クライアント
   - components/features/auth/LoginForm.vue
   - pages/login.vue — auth レイアウト使用
   - middleware/auth.ts — ルートガード

5. テスト
   - ユニットテスト（login-context, ロール別リダイレクト）
   - 統合テスト（Better Auth + DB）
   - E2Eテスト（ログインフロー全体）
```

### 12.2 参照すべきファイル

| 種類 | ファイル | 参照内容 |
|------|---------|---------|
| 認証共通 | SSOT-5_CROSS_CUTTING.md §1 | Better Auth 設定、ロール定義 |
| API共通 | SSOT-3_API_CONTRACT.md | エラーレスポンス形式 |
| DB共通 | SSOT-4_DATA_MODEL.md §2.2, §2.3 | user, user_tenant テーブル |
| UI共通 | SSOT-2_UI_STATE.md | 認証状態定義、ルートガード |
| コーディング規約 | CODING_STANDARDS.md | Nuxt 3 / Vue 3 規約 |
| テスト規約 | TESTING_STANDARDS.md | テストパターン |

### 12.3 Better Auth 設定例

```typescript
// server/utils/auth.ts
import { betterAuth } from 'better-auth';
import { organization } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  session: {
    expiresIn: 60 * 60 * 24 * 7,        // 7日
    updateAge: 60 * 60 * 24,             // 1日ごとに更新
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [organization()],
});
```

### 12.4 注意事項

- ⚠️ パスワードは絶対にログに出力しない
- ⚠️ メールアドレスはログ出力時にマスク（`u***@example.com`）
- ⚠️ エラーメッセージでメールの存在有無を漏らさない
- ⚠️ `next` パラメータは同一オリジンのみ許可
- ⚠️ Google OAuth で未登録ユーザーが来た場合、自動登録しない（サインアップへ誘導）
- ⚠️ Better Auth の管理テーブル（account, session 等）は直接操作しない

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 変更者 |
|------|----------|---------|-------|
| 2026-02-09 | v1.0 | 初版作成（テンプレートからカスタマイズ） | AI |
| 2026-02-09 | v1.1 | §2.4-2.7 追加（入出力例10件、境界値7項目、例外レスポンス10件、Gherkin 15シナリオ）。§12 未決定事項・制約追加。Gold Standard化 | AI |

---

## カスタマイズ差分（テンプレートとの差異）

| セクション | 変更内容 | 理由 |
|-----------|---------|------|
| §1.3 スコープ | Google OAuth を In Scope に追加 | MVP で Google OAuth 必要 |
| §2.1 AC-002 | ロール別リダイレクト先テーブル追加 | 8ロール＋管理者のリダイレクト先定義 |
| §2.1 AC-005 | 24時間 → 7日（Better Auth デフォルト） | Better Auth 標準に合わせる |
| §2.1 AC-006,007 | Google OAuth、テナント自動セット追加 | 新規要件 |
| §5 API | JWT → Cookie セッション（Better Auth） | Better Auth 標準 |
| §5 API | login-context API 追加 | テナント・ロール取得用 |
| §7.1 フロー | Better Auth 経由のフローに変更 | 認証処理は Better Auth に委譲 |
| §7.2 | Google OAuth フロー追加 | MVP 要件 |
| §7.3 | テナント自動識別ロジック追加 | 1ユーザー1テナント固定 |

---

## 承認

| 役割 | 名前 | 日付 | 承認 |
|------|------|------|------|
| 設計者 | | | ☐ |
| テックリード | | | ☐ |
| プロダクトオーナー | | | ☐ |
