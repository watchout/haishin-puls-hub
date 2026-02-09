# ACCT-002: プロフィール表示機能

## メタ情報

| 項目 | 内容 |
|------|------|
| 機能ID | ACCT-002 |
| 機能名 | プロフィール表示機能 |
| カテゴリ | アカウント |
| 優先度 | P0 |
| ステータス | Draft |
| 作成日 | 2026-02-09 |
| 最終更新日 | 2026-02-09 |

---

## 1. 概要

### 1.1 機能の目的 [CORE]

ログインユーザーが自分のプロフィール情報（氏名、メールアドレス、アバター、所属テナント、ロール、セキュリティ情報）を確認できる機能。自己情報の確認と設定画面への導線を提供する。

### 1.2 ユーザーストーリー [CORE]

```
As a ログインユーザー,
I want to 自分のプロフィール情報を確認したい,
so that 登録情報やセキュリティ状態を把握し、必要に応じて編集できる.
```

### 1.3 スコープ [CORE]

**In Scope**:
- 自分のプロフィール情報の表示（名前、メール、アバター、メール認証状態）
- 所属テナント一覧とロールの表示
- 現在のデフォルトテナントの表示
- 最終ログイン日時の表示
- プロフィール編集画面への導線
- パスワード変更画面への導線
- アバターのフォールバック表示（イニシャル）

**Out of Scope**:
- プロフィール編集機能（ACCT-003）
- パスワード変更機能（ACCT-005）
- 他のユーザーのプロフィール表示（MVP対象外）
- アバター画像のアップロード（ACCT-003）

---

## 2. 受入条件（Acceptance Criteria）

### 2.1 正常系 [CONTRACT]

| # | 条件 | 検証方法 |
|---|------|---------|
| AC-001 | ログインユーザーの氏名、メールアドレス、アバターが表示される | E2Eテスト |
| AC-002 | メール認証済みの場合、認証済みバッジが表示される | E2Eテスト |
| AC-003 | メール未認証の場合、「メール認証してください」警告と認証メール再送ボタンが表示される | E2Eテスト |
| AC-004 | 所属テナント一覧が表示され、各テナントのロールが確認できる | E2Eテスト |
| AC-005 | 現在のデフォルトテナントが強調表示される | E2Eテスト |
| AC-006 | 最終ログイン日時が表示される（相対時刻 + 絶対時刻） | E2Eテスト |
| AC-007 | プロフィール編集ボタンをクリックすると編集画面に遷移する | E2Eテスト |
| AC-008 | パスワード変更ボタンをクリックするとパスワード変更画面に遷移する | E2Eテスト |
| AC-009 | アバター画像がない場合、名前のイニシャルをアバターとして表示する | ユニットテスト |

### 2.2 異常系 [CONTRACT]

| # | 条件 | 検証方法 |
|---|------|---------|
| AC-101 | 未認証状態で /dashboard/profile にアクセスした場合、ログイン画面にリダイレクトされる | E2Eテスト |
| AC-102 | セッションが無効な場合、ログイン画面にリダイレクトされる | 統合テスト |
| AC-103 | テナント未所属の場合でもプロフィール情報は表示される（テナント一覧は空） | E2Eテスト |

### 2.3 エッジケース [DETAIL]

| # | 条件 | 検証方法 |
|---|------|---------|
| AC-201 | 複数テナントに所属する場合、全テナントがリスト表示される | E2Eテスト |
| AC-202 | 氏名が1文字の場合、イニシャルはその1文字のみ表示 | ユニットテスト |
| AC-203 | 氏名に絵文字が含まれる場合、正しくイニシャル抽出される | ユニットテスト |
| AC-204 | last_login_at が null の場合、「未記録」と表示される | ユニットテスト |

### 2.4 入出力例（§3-E） [DETAIL]

| # | 入力 | 条件 | 期待出力 | 備考 |
|---|------|------|---------|------|
| 1 | GET /dashboard/profile | 認証済み＋テナント所属＋メール認証済み | 200, 基本情報＋テナント一覧＋セキュリティ情報表示 | 基本の正常系 |
| 2 | GET /dashboard/profile | emailVerified=false | 200, 警告バナー「メールアドレスが未認証です」＋認証メール再送ボタン表示 | メール未認証ユーザー |
| 3 | GET /dashboard/profile | user_tenant レコードなし | 200, 基本情報表示、テナント一覧は空 | テナント未所属ユーザー |
| 4 | GET /dashboard/profile | 2テナント所属（is_default=true が1件） | 200, 全テナント表示、デフォルトテナントに⭐マーク | 複数テナント所属 |
| 5 | GET /dashboard/profile | image="https://example.com/avatar.jpg" | UAvatar に画像表示 | アバター画像あり |
| 6 | GET /dashboard/profile | image=null, name="山田 太郎" | UAvatar にイニシャル "YT" 表示 | アバター画像なし（名前あり） |
| 7 | GET /dashboard/profile | image=null, name=null | UAvatar にデフォルト人型アイコン表示 | アバター画像なし（名前なし） |
| 8 | GET /dashboard/profile | セッションなし（未認証） | 302, /login へリダイレクト | 未認証アクセス |
| 9 | POST /api/auth/send-verification-email | email="yamada@example.com" | 200, トースト「認証メールを送信しました」 | 認証メール再送成功 |
| 10 | GET /dashboard/profile | last_login_at=null | 200, 最終ログイン欄に「未記録」表示 | last_login_at が null |

### 2.5 境界値（§3-F） [DETAIL]

| 項目 | 最小値 | 最大値 | 空 | NULL | 不正形式 |
|------|--------|--------|-----|------|---------|
| user.name | 1文字 "A" → イニシャル "A" 表示 | 100文字 → 正常表示（トランケーションなし） | "" → デフォルト人型アイコン | null → デフォルト人型アイコン | - |
| user.email | 標準形式 → 正常表示 | 255文字 → 正常表示 | "" → (DB制約 NOT NULL でありえない) | - | - |
| user_tenant 数 | 0件 → テナント一覧セクション空（「所属テナントなし」表示） | 1件 → 1件表示 | - | - | - |
| user_tenant 数（多数） | - | 10件 → 全件表示（スクロール対応） | - | - | - |
| last_login_at | 1秒前 → "たった今" | 59分前 → "59分前" | - | null → "未記録" | - |
| last_login_at（時間） | - | 23時間前 → "23時間前" | - | - | - |
| last_login_at（日） | - | 6日前 → "6日前" | - | - | - |
| last_login_at（7日以降） | 7日前 → 絶対日時（YYYY-MM-DD HH:mm） | - | - | - | - |
| avatar_url | 有効URL → 画像表示 | - | - | null → イニシャルまたはデフォルトアイコン | 無効URL（404）→ フォールバック（イニシャル表示） |
| name（イニシャル） | "A" → "A" | "山田 太郎" → "YT" | - | - | "  田中  " → "T"（trim後1単語） |
| name（イニシャル2） | "John Doe" → "JD" | - | - | - | - |

### 2.6 例外レスポンス（§3-G） [DETAIL]

| # | 例外条件 | HTTPステータス | エラーコード | ユーザーメッセージ | リトライ可否 | 復旧方法 |
|---|---------|---------------|------------|-----------------|------------|---------|
| 1 | 未認証アクセス | 401 | UNAUTHORIZED | (メッセージなし、/login リダイレクト) | No | ログイン |
| 2 | セッション期限切れ | 401 | UNAUTHORIZED | (メッセージなし、/login リダイレクト) | No | 再ログイン |
| 3 | テナント一覧取得失敗 | 500 | INTERNAL_ERROR | テナント情報の取得に失敗しました | Yes | リロード |
| 4 | 認証メール再送失敗 | 500 | MAIL_SEND_FAILED | メール送信に失敗しました | Yes | 再試行 |
| 5 | アバター画像読み込みエラー | - (画像404) | - | (フォールバックでイニシャル表示) | - | 自動フォールバック |
| 6 | ネットワークエラー | - (fetch失敗) | NETWORK_ERROR | 通信エラーが発生しました | Yes | リロード |
| 7 | サーバーエラー | 500 | INTERNAL_ERROR | システムエラーが発生しました | Yes | 自動復旧待ち |

### 2.7 受け入れテスト（§3-H Gherkin） [DETAIL]

```gherkin
Feature: ACCT-002 プロフィール表示機能

  Background:
    Given ユーザー "yamada@example.com" が登録済み
    And パスワードが設定済みでログイン済み
    And テナント "ビジョンセンター" にロール "organizer" で所属
    And user_tenant.is_default が true

  Scenario: 正常プロフィール表示（基本情報＋テナント＋セキュリティ）
    When /dashboard/profile にアクセスする
    Then 基本情報セクションにユーザー名 "山田 太郎" が表示される
    And メールアドレス "yamada@example.com" が表示される
    And 所属テナントセクションに "ビジョンセンター" が表示される
    And セキュリティセクションにアカウント種別が表示される

  Scenario: メール認証済みユーザー（認証バッジ表示）
    Given ユーザーの emailVerified が true
    When /dashboard/profile にアクセスする
    Then メールアドレスの横に "✓ 認証済み" バッジが表示される
    And 未認証警告バナーは表示されない

  Scenario: メール未認証ユーザー（警告バナー＋再送ボタン）
    Given ユーザーの emailVerified が false
    When /dashboard/profile にアクセスする
    Then ページ上部に警告バナー「メールアドレスが未認証です」が表示される
    And 「認証メールを再送する」ボタンが表示される

  Scenario: 認証メール再送成功
    Given ユーザーの emailVerified が false
    When /dashboard/profile にアクセスする
    And 「認証メールを再送する」ボタンをクリックする
    Then トーストメッセージ「認証メールを送信しました」が表示される

  Scenario: テナント未所属ユーザー（テナント一覧空）
    Given ユーザーがテナントに未所属
    When /dashboard/profile にアクセスする
    Then 基本情報セクションは正常に表示される
    And 所属テナントセクションは空表示

  Scenario: 複数テナント所属（全テナント表示＋デフォルト⭐）
    Given ユーザーが "ビジョンセンター"（デフォルト）と "企画会社A" に所属
    When /dashboard/profile にアクセスする
    Then 所属テナントセクションに2件のテナントが表示される
    And "ビジョンセンター" に⭐マークが表示される
    And "企画会社A" に⭐マークは表示されない

  Scenario: アバター画像あり
    Given ユーザーの image が "https://example.com/avatar.jpg"
    When /dashboard/profile にアクセスする
    Then UAvatar にアバター画像が表示される

  Scenario: アバター画像なし（イニシャル表示）
    Given ユーザーの image が null
    And ユーザーの name が "山田 太郎"
    When /dashboard/profile にアクセスする
    Then UAvatar にイニシャル "YT" が表示される

  Scenario: 未認証アクセス→/loginリダイレクト
    Given ユーザーが未認証状態
    When /dashboard/profile にアクセスする
    Then /login にリダイレクトされる

  Scenario: last_login_atがnull→"未記録"表示
    Given ユーザーの last_login_at が null
    When /dashboard/profile にアクセスする
    Then 最終ログイン欄に「未記録」と表示される

  Scenario: プロフィール編集ボタン→/dashboard/profile/edit遷移
    When /dashboard/profile にアクセスする
    And 「プロフィール編集」ボタンをクリックする
    Then /dashboard/profile/edit に遷移する

  Scenario: パスワード変更ボタン→/dashboard/profile/password遷移
    When /dashboard/profile にアクセスする
    And 「パスワード変更」ボタンをクリックする
    Then /dashboard/profile/password に遷移する
```

---

## 3. UI仕様 [CORE]

### 3.1 画面一覧 [CORE]

| Screen ID | 画面名 | パス | 認証 | レイアウト |
|-----------|-------|------|------|----------|
| SCR-PROFILE | プロフィール表示画面 | /dashboard/profile | 要 | dashboard |

### 3.2 画面レイアウト [DETAIL]

```
┌──────────────────────────────────────────────────┐
│  [← ダッシュボード]           プロフィール        │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ ⚠️ メールアドレスが未認証です                │  │
│  │ [認証メールを再送する]                       │  │
│  └─────────────────────────────────────────────┘  │
│  ↑ メール未認証の場合のみ表示                     │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │               基本情報                        │  │
│  ├─────────────────────────────────────────────┤  │
│  │                                              │  │
│  │    ┌────────┐                                │  │
│  │    │   YT   │  山田 太郎                     │  │
│  │    │        │  yamada@example.com ✓ 認証済み │  │
│  │    └────────┘                                │  │
│  │    ↑ アバターなしの場合はイニシャル表示         │  │
│  │                                              │  │
│  │    最終ログイン: 5分前（2026-02-09 14:32）   │  │
│  │                                              │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  │  │
│  │  │ プロフィール編集 │  │ パスワード変更   │  │  │
│  │  └──────────────────┘  └──────────────────┘  │  │
│  │                                              │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │               所属テナント                    │  │
│  ├─────────────────────────────────────────────┤  │
│  │                                              │  │
│  │  ┌──────────────────────────────────────┐   │  │
│  │  │ ビジョンセンター                  ⭐  │   │  │
│  │  │ ロール: 会場スタッフ                  │   │  │
│  │  │ 参加日: 2026-01-15                   │   │  │
│  │  └──────────────────────────────────────┘   │  │
│  │  ↑ デフォルトテナントには⭐マーク            │  │
│  │                                              │  │
│  │  ┌──────────────────────────────────────┐   │  │
│  │  │ 企画会社A                            │   │  │
│  │  │ ロール: イベント企画                  │   │  │
│  │  │ 参加日: 2026-02-01                   │   │  │
│  │  └──────────────────────────────────────┘   │  │
│  │                                              │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │               セキュリティ                    │  │
│  ├─────────────────────────────────────────────┤  │
│  │                                              │  │
│  │  アカウント種別: メール/パスワード           │  │
│  │  メール認証: ✓ 認証済み                      │  │
│  │  2段階認証: 未設定                           │  │
│  │                                              │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
└──────────────────────────────────────────────────┘
```

### 3.3 UI要素詳細 [DETAIL]

| 要素 | 種類 | 説明 | 備考 |
|------|------|------|------|
| 未認証警告バナー | UAlert (color="warning") | メール未認証の場合のみ表示 | 認証メール再送ボタン付き |
| アバター | UAvatar | 画像またはイニシャル | サイズ: xl (96x96px) |
| 名前 | Typography (h2) | user.name | font-bold, text-2xl |
| メールアドレス | Typography (p) | user.email + 認証バッジ | text-gray-600 |
| 認証バッジ | UBadge (color="success") | メール認証済みの場合のみ | "✓ 認証済み" |
| 最終ログイン | Typography (p) | 相対時刻 + 絶対時刻 | text-sm, text-gray-500 |
| プロフィール編集ボタン | UButton (variant="solid") | ACCT-003 へ遷移 | プライマリカラー |
| パスワード変更ボタン | UButton (variant="outline") | ACCT-005 へ遷移 | グレー |
| テナントカード | UCard | テナント情報表示 | hover効果なし |
| デフォルトテナントマーク | Icon (⭐) | is_default = true の場合 | 黄色 |
| ロール表示 | UBadge (color="primary") | user_tenant.role | ロール名を日本語化 |

### 3.4 アバターフォールバックルール [DETAIL]

| 条件 | 表示 |
|------|------|
| avatar_url あり | 画像表示 |
| avatar_url なし + 名前あり | イニシャル（最大2文字） |
| avatar_url なし + 名前なし | デフォルトアイコン（人型） |

**イニシャル抽出ロジック**:
```typescript
// 例: "山田 太郎" → "YT"
// 例: "山田" → "Y"
// 例: "John Doe" → "JD"
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return parts[0][0].toUpperCase()
}
```

---

## 4. 状態遷移 [CORE]

### 4.1 遷移ルール [CORE]

| 現在の状態 | イベント | 次の状態 | アクション |
|-----------|---------|---------|-----------|
| S0 | ページアクセス（認証済み） | S1 | プロフィールデータ取得 + 表示 |
| S0 | ページアクセス（未認証） | - | /login へリダイレクト |
| S1 | プロフィール編集ボタンクリック | - | /dashboard/profile/edit へ遷移 |
| S1 | パスワード変更ボタンクリック | - | /dashboard/profile/password へ遷移 |
| S1 | 認証メール再送ボタンクリック | S1 | メール送信 + トーストメッセージ |

---

## 5. API仕様 [CONTRACT]

### 5.1 エンドポイント [CONTRACT]

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | /api/auth/session | 現在のセッション情報取得（Better Auth） | 要 |
| GET | /api/v1/tenants | ユーザーの所属テナント一覧取得 | 要 |
| POST | /api/auth/send-verification-email | メール認証メール再送（Better Auth） | 要 |

### 5.2 GET /api/auth/session（Better Auth 提供） [CONTRACT]

**リクエスト**: なし（Cookie セッション）

**レスポンス（成功）**: `200 OK`

```json
{
  "user": {
    "id": "01HXYZ...",
    "email": "yamada@example.com",
    "name": "山田 太郎",
    "image": "https://example.com/avatar.jpg",
    "emailVerified": true,
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-02-09T05:00:00Z"
  },
  "session": {
    "id": "session_01ABC...",
    "expiresAt": "2026-02-16T14:32:00Z",
    "token": "...",
    "userId": "01HXYZ...",
    "activeOrganizationId": "01HTENANT..."
  }
}
```

**レスポンス（未認証）**: `401 UNAUTHORIZED`

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証が必要です"
  }
}
```

### 5.3 GET /api/v1/tenants（カスタム） [CONTRACT]

ユーザーの所属テナント一覧を取得。

**リクエスト**: なし（Cookie セッション）

**レスポンス（成功）**: `200 OK`

```json
{
  "data": [
    {
      "id": "01HTENANT1...",
      "name": "ビジョンセンター",
      "slug": "vision-center",
      "logo_url": "https://example.com/logo.png",
      "role": "venue_staff",
      "is_default": true,
      "joined_at": "2026-01-15T10:00:00+09:00"
    },
    {
      "id": "01HTENANT2...",
      "name": "企画会社A",
      "slug": "planner-a",
      "logo_url": null,
      "role": "event_planner",
      "is_default": false,
      "joined_at": "2026-02-01T09:00:00+09:00"
    }
  ]
}
```

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | テナントID（ULID） |
| name | string | テナント名 |
| slug | string | URLスラッグ |
| logo_url | string \| null | ロゴ画像URL |
| role | string | ユーザーのロール |
| is_default | boolean | デフォルトテナントフラグ |
| joined_at | string | 参加日時（ISO 8601） |

**レスポンス（エラー）**:

| HTTPステータス | error.code | 条件 |
|--------------|------------|------|
| 401 | UNAUTHORIZED | 未認証 |
| 500 | INTERNAL_ERROR | サーバーエラー |

### 5.4 POST /api/auth/send-verification-email（Better Auth 提供） [DETAIL]

メール認証メールを再送信。

**リクエスト**:

```json
{
  "email": "yamada@example.com"
}
```

**レスポンス（成功）**: `200 OK`

```json
{
  "message": "認証メールを送信しました"
}
```

---

## 6. データモデル [CONTRACT]

### 6.1 関連テーブル [CONTRACT]

| テーブル | 操作 | 内容 |
|---------|------|------|
| user | SELECT | ユーザー基本情報 |
| user_tenant | SELECT | ユーザー×テナント紐付 |
| tenant | SELECT | テナント情報 |
| account（Better Auth） | SELECT | アカウント種別確認（OAuth or Email） |

### 6.2 使用するカラム [DETAIL]

**user テーブル**:
- id, email, name, avatar_url, email_verified, is_active, last_login_at

**user_tenant テーブル**:
- user_id, tenant_id, role, is_default, joined_at

**tenant テーブル**:
- id, name, slug, logo_url

---

## 7. ビジネスロジック [CORE]

### 7.1 プロフィール表示フロー [CORE]

```
1. ページアクセス
   ├─ 未認証 → /login へリダイレクト
   └─ 認証済み → プロフィールデータ取得

2. プロフィールデータ取得
   ├─ GET /api/auth/session（Better Auth）
   │  → user 情報取得
   └─ GET /api/v1/tenants
      → 所属テナント一覧取得

3. データ整形・表示
   ├─ アバター: avatar_url あり → 画像 / なし → イニシャル
   ├─ メール認証: email_verified false → 警告バナー表示
   ├─ 最終ログイン: last_login_at → 相対時刻変換（5分前、2時間前 etc）
   └─ テナント一覧: is_default true → ⭐マーク表示

4. インタラクション
   ├─ 認証メール再送ボタン → POST /api/auth/send-verification-email
   ├─ プロフィール編集ボタン → /dashboard/profile/edit へ遷移
   └─ パスワード変更ボタン → /dashboard/profile/password へ遷移
```

### 7.2 ロール名の日本語化 [DETAIL]

| role 値 | 日本語表示 |
|---------|----------|
| system_admin | システム管理者 |
| tenant_admin | テナント管理者 |
| organizer | セミナー主催者 |
| venue_staff | 会場スタッフ |
| streaming_provider | 動画配信業者 |
| event_planner | イベント企画会社 |
| speaker | 登壇者 |
| sales_marketing | 営業・マーケティング |
| participant | 参加者 |
| vendor | その他関連業者 |

### 7.3 相対時刻変換ルール [DETAIL]

| 経過時間 | 表示 |
|---------|------|
| < 1分 | たった今 |
| < 1時間 | X分前 |
| < 24時間 | X時間前 |
| < 7日 | X日前 |
| >= 7日 | 絶対日時のみ（YYYY-MM-DD HH:mm） |

---

## 8. エラーハンドリング [DETAIL]

### 8.1 フロントエンド [DETAIL]

| エラー種別 | 表示方法 | メッセージ |
|-----------|---------|-----------|
| セッション取得失敗 | リダイレクト | /login へ遷移（メッセージなし） |
| テナント一覧取得失敗 | UAlert (color="error") | 「テナント情報の取得に失敗しました」 |
| 認証メール再送失敗 | Toast (color="error") | 「メール送信に失敗しました」 |
| 認証メール再送成功 | Toast (color="success") | 「認証メールを送信しました」 |

### 8.2 バックエンド [DETAIL]

| エラー種別 | HTTPステータス | ログレベル |
|-----------|--------------|-----------|
| 未認証 | 401 | INFO |
| テナント取得失敗 | 500 | ERROR |
| メール送信失敗 | 500 | WARN |

---

## 9. テスト仕様 [CONTRACT]

### 9.1 ユニットテスト [CONTRACT]

| テストID | テストケース | 期待結果 |
|----------|-------------|---------|
| TC-001 | getInitials("山田 太郎") | "YT" |
| TC-002 | getInitials("山田") | "Y" |
| TC-003 | getInitials("John Doe") | "JD" |
| TC-004 | getInitials("田中   次郎") | "TJ"（スペース正規化） |
| TC-005 | 相対時刻変換（30秒前） | "たった今" |
| TC-006 | 相対時刻変換（45分前） | "45分前" |
| TC-007 | 相対時刻変換（3時間前） | "3時間前" |
| TC-008 | 相対時刻変換（2日前） | "2日前" |
| TC-009 | 相対時刻変換（10日前） | 絶対日時 |

### 9.2 統合テスト [CONTRACT]

| テストID | テストケース | 期待結果 |
|----------|-------------|---------|
| TC-101 | GET /api/v1/tenants（認証済み） | 200 + テナント一覧 |
| TC-102 | GET /api/v1/tenants（未認証） | 401 エラー |
| TC-103 | POST /api/auth/send-verification-email | 200 + メール送信 |

### 9.3 E2Eテスト [CONTRACT]

| テストID | テストケース | 期待結果 |
|----------|-------------|---------|
| TC-201 | ログイン後 /dashboard/profile アクセス | プロフィール情報表示 |
| TC-202 | 未認証で /dashboard/profile アクセス | /login へリダイレクト |
| TC-203 | メール未認証ユーザーで表示 | 警告バナー + 再送ボタン表示 |
| TC-204 | メール認証済みユーザーで表示 | 認証バッジ表示、警告なし |
| TC-205 | 複数テナント所属ユーザーで表示 | 全テナント表示、デフォルトに⭐ |
| TC-206 | プロフィール編集ボタンクリック | /dashboard/profile/edit へ遷移 |
| TC-207 | パスワード変更ボタンクリック | /dashboard/profile/password へ遷移 |

---

## 10. 非機能要件 [DETAIL]

| 指標 | 目標値 |
|------|-------|
| API 応答時間（p95） | < 500ms |
| ページ読み込み（LCP） | < 2.0秒 |
| アバター画像読み込み | 遅延読み込み対応 |

---

## 11. 依存関係 [CORE]

### 11.1 前提となる機能 [CORE]

| 機能ID | 機能名 | 依存内容 |
|--------|-------|---------|
| AUTH-001 | ログイン | Better Auth セッション |
| ACCT-001 | サインアップ | user テーブル |

### 11.2 この機能に依存する機能 [CORE]

| 機能ID | 機能名 | 依存内容 |
|--------|-------|---------|
| ACCT-003 | プロフィール編集 | 編集画面への導線 |
| ACCT-005 | パスワード変更 | パスワード変更画面への導線 |

---

## 12. 未決定事項・制約 [DETAIL]

### 12.1 未決定事項（TBD）

| # | 項目 | 層 | 理由 | デフォルト案 |
|---|------|-----|------|------------|
| - | - | - | 全て決定済み | - |

> CORE層・CONTRACT層のTBDはゼロ。DETAIL層のTBDもゼロ。

### 12.2 前提条件

- AUTH-001 ログイン機能が実装済み
- Better Auth セッション管理が稼働中
- user_tenant テーブルが作成済み
- tenant テーブルが作成済み

### 12.3 制約事項

- プロフィール情報は読み取り専用（編集は ACCT-003）
- パスワード変更は別機能（ACCT-005）
- アバター画像のアップロードは ACCT-003 で対応
- 他のユーザーのプロフィール表示は MVP 対象外
- 相対時刻変換は7日以降は絶対日時のみ表示
- イニシャルは最大2文字（スペース区切りの先頭2文字）

---

## 13. 実装メモ（AI向け） [DETAIL]

### 13.1 実装順序 [DETAIL]

```
1. useProfile composable 作成
   - GET /api/auth/session 呼び出し
   - GET /api/v1/tenants 呼び出し
   - getInitials() ユーティリティ
   - 相対時刻変換ユーティリティ

2. server/api/v1/tenants.get.ts 作成
   - Better Auth セッション検証
   - user_tenant + tenant JOIN クエリ
   - レスポンス整形

3. pages/dashboard/profile/index.vue 作成
   - useProfile() 呼び出し
   - UCard ベースのレイアウト
   - UAvatar + イニシャルフォールバック
   - メール未認証警告バナー
   - テナント一覧表示

4. テスト作成
   - useProfile.test.ts
   - tenants.get.test.ts
   - profile.spec.ts（E2E）
```

### 13.2 ファイル構成 [DETAIL]

```
composables/
└── useProfile.ts                 ← プロフィールデータ取得

server/
└── api/
    └── v1/
        └── tenants.get.ts        ← 所属テナント一覧API

pages/
└── dashboard/
    └── profile/
        └── index.vue             ← プロフィール表示画面

utils/
├── getInitials.ts               ← イニシャル抽出
└── formatRelativeTime.ts        ← 相対時刻変換

tests/
├── unit/
│   └── useProfile.test.ts
├── integration/
│   └── api/v1/tenants.get.test.ts
└── e2e/
    └── profile.spec.ts
```

### 13.3 注意事項 [DETAIL]

- ⚠️ セッション検証はミドルウェアで共通化する
- ⚠️ アバター画像は lazy load で最適化
- ⚠️ テナント一覧は user_tenant.joined_at でソート（降順）
- ⚠️ is_default は必ず1つのみ（DB制約で保証）
- ⚠️ メール未認証でもプロフィール表示は可能（警告のみ）
- ⚠️ last_login_at は null の場合「未記録」表示
- ⚠️ role の日本語化は共通ユーティリティで実装

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 変更者 |
|------|----------|---------|-------|
| 2026-02-09 | v1.0 | 初版作成 | AI |
| 2026-02-09 | v1.1 | §2.4-2.7 追加（入出力例10件、境界値6項目、例外レスポンス7件、Gherkin 12シナリオ）。§12 未決定事項・制約追加 | AI |
