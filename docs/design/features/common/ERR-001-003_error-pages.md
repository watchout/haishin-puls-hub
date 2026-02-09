# ERR-001-003: エラーページ仕様書

**機能ID**: ERR-001（404）、ERR-002（403）、ERR-003（500）
**バージョン**: 1.1.0
**最終更新**: 2026-02-09
**ステータス**: Draft
**担当者**: 未定

---

## §1 概要 [CORE]

### 機能名
エラーページ（404 / 403 / 500）

### 対象ユーザー
全ユーザー（認証済み・未認証を問わず）

### 依存機能
- **SSOT-3**: API規約（§1.9 エラーコード定義）
- **SSOT-5**: 横断的関心事（§4 エラーハンドリング）
- **AUTH-001**: ログイン機能（401エラー時のリダイレクト）
- **NAV-001**: ナビゲーション（ホーム・戻るボタン）

### 技術スタック
- **フロントエンド**: Nuxt 3 + Vue 3 Composition API
- **UI**: Nuxt UI v3 (UButton, UIcon, UCard, UInput) + Tailwind CSS v4
- **状態管理**: Nuxt composables (useError, navigateTo, useRoute)
- **エラーハンドリング**: error.vue, Nuxt error handling API
- **ダークモード**: Tailwind dark mode class strategy

---

## §2 目的 [CORE]

### ビジネス目的
ユーザーフレンドリーなエラー体験を提供し、エラー発生時もユーザーが次のアクションを取れるようにガイダンスを示すことで、離脱率を低減し、サポートコストを削減する。

### ユーザー価値
- エラーの原因と対処法が明確にわかる
- エラーページから迷わず目的のページに戻れる
- 技術的なエラーメッセージではなく、人間的なコミュニケーション

### 解決する課題
- エラーページが無機質でユーザーが戸惑う
- エラー原因がわからずサポート問い合わせが増加
- エラー発生時にユーザーが離脱してしまう

---

## §3 機能要件 [CORE]

### FR-001: 404ページ（Not Found）[MUST]
**優先度**: P0
**ユーザーストーリー**: ページが見つからない時、検索やホームへのナビゲーションを提供する

**受け入れ基準**:
- [ ] 存在しないURLにアクセスした時、404ページが表示される
- [ ] ページタイトル「ページが見つかりません」が表示される
- [ ] わかりやすい説明文が表示される
- [ ] ホームに戻るボタンが表示される
- [ ] 前のページに戻るボタンが表示される
- [ ] よく見られるページへのリンク（最大5件）が表示される
- [ ] 簡易検索バー（オプション）が表示される
- [ ] 404イラスト or アイコンが表示される

### FR-002: 403ページ（権限エラー）[MUST]
**優先度**: P0
**ユーザーストーリー**: 権限がないページにアクセスした時、現在のロールと必要な権限を説明する

**受け入れ基準**:
- [ ] 権限がないリソースにアクセスした時、403ページが表示される
- [ ] ページタイトル「アクセス権限がありません」が表示される
- [ ] 現在のユーザーロールが表示される
- [ ] 必要な権限の説明が表示される
- [ ] ホームに戻るボタンが表示される
- [ ] 権限リクエストボタン（該当する場合）が表示される
- [ ] 管理者連絡先（該当する場合）が表示される
- [ ] 403イラスト or アイコンが表示される

### FR-003: 500ページ（サーバーエラー）[MUST]
**優先度**: P0
**ユーザーストーリー**: サーバーエラー発生時、リトライとサポート連絡の手段を提供する

**受け入れ基準**:
- [ ] サーバーエラー発生時、500ページが表示される
- [ ] ページタイトル「サーバーエラーが発生しました」が表示される
- [ ] わかりやすい説明文（技術的詳細を避ける）が表示される
- [ ] リトライボタンが表示される
- [ ] ホームに戻るボタンが表示される
- [ ] エラーID（request_id）が表示される
- [ ] サポート連絡先（メール）が表示される
- [ ] 500イラスト or アイコンが表示される

### FR-004: 401エラー時の自動リダイレクト [MUST]
**優先度**: P0
**ユーザーストーリー**: 未認証ユーザーが保護されたページにアクセスした時、自動的にログインページにリダイレクトされる

**受け入れ基準**:
- [ ] 401エラー時、エラーページを表示せずログインページにリダイレクトされる
- [ ] リダイレクト時、元のURLが `redirect` クエリパラメータに保持される
- [ ] ログイン成功後、元のページに戻る

### FR-005: レスポンシブデザイン [MUST]
**優先度**: P0
**ユーザーストーリー**: モバイルでも見やすいエラーページ

**受け入れ基準**:
- [ ] モバイル（320px～）で表示が崩れない
- [ ] タブレット（768px～）で表示が最適化される
- [ ] デスクトップ（1024px～）で表示が最適化される
- [ ] ダークモード対応

### §3-E: 入出力例 [CONTRACT]

| # | 入力（トリガー） | 出力（画面遷移・表示） |
|---|-----------------|----------------------|
| 1 | 存在しないURL `/events/999999` にアクセス | `error.vue` 表示、`statusCode=404`、タイトル「ページが見つかりません」、検索バー・ホームボタン・戻るボタン表示 |
| 2 | viewer ロールで `/admin/settings` にアクセス（権限不足） | `error.vue` 表示、`statusCode=403`、currentRole=`viewer`、requiredRole=`admin` 表示、権限リクエストボタン表示 |
| 3 | サーバー内部エラー発生（DB接続障害等） | `error.vue` 表示、`statusCode=500`、requestId（UUIDv4）表示、再試行ボタン・サポートメール表示 |
| 4 | 未認証ユーザーが `/dashboard` にアクセス | `error.vue` を表示せず `/login?redirect=%2Fdashboard` へリダイレクト |
| 5 | 404ページの検索バーに「イベント」と入力しEnter | `/search?q=%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88` へ遷移 |
| 6 | 500ページの再試行ボタンをクリック | `window.location.reload()` でページリロード |
| 7 | 403ページの「権限をリクエスト」ボタンをクリック | `/request-access` へ遷移 |

### §3-F: 境界値 [CONTRACT]

| 項目 | 制約 | 備考 |
|------|------|------|
| requestId | UUIDv4形式（36文字: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`） | `crypto.randomUUID()` で生成 |
| エラーメッセージ（message） | 最大200文字 | ユーザー向け表示テキスト |
| redirectクエリパラメータ | 最大2048文字（URL長制限） | `encodeURIComponent` でエンコード |
| 未読通知バッジ（ナビゲーション内） | 99件を超える場合は `99+` 表示 | NAV-001 準拠 |
| エラーID表示 | `data.requestId` 未設定時は `N/A` 表示 | 500ページのみ |
| よく見られるページリンク | 最大5件 | 404ページのみ |
| 検索クエリ（searchQuery） | 空文字・空白のみの場合は遷移しない（`trim()` チェック） | 404ページのみ |

### §3-G: 例外レスポンス [CONTRACT]

| エラーコード | HTTPステータス | message（ユーザー向け） | 画面遷移 | data |
|-------------|---------------|----------------------|---------|------|
| NOT_FOUND | 404 | ページが見つかりません | `error.vue` → Error404 コンポーネント | なし |
| FORBIDDEN | 403 | アクセス権限がありません | `error.vue` → Error403 コンポーネント | `{ requiredRole, currentRole }` |
| INTERNAL_SERVER_ERROR | 500 | サーバーエラーが発生しました | `error.vue` → Error500 コンポーネント | `{ requestId, supportEmail, retryable }` |
| UNAUTHORIZED | 401 | （表示なし） | `/login?redirect=元URL` へリダイレクト | なし |
| SERVICE_UNAVAILABLE | 503 | サーバーエラーが発生しました | `error.vue` → Error500 コンポーネント（フォールバック） | `{ requestId, supportEmail, retryable }` |
| その他（4xx/5xx） | 該当コード | サーバーエラーが発生しました | `error.vue` → Error500 コンポーネント（フォールバック） | `{ requestId, supportEmail, retryable }` |

### §3-H: 受け入れテスト（Gherkin） [CONTRACT]

```gherkin
Feature: エラーページ表示

  Scenario: 存在しないURLで404ページが表示される
    Given ユーザーがアプリケーションにアクセスできる
    When 存在しないURL "/non-existent-page" にアクセスする
    Then 404エラーページが表示される
    And タイトル "ページが見つかりません" が表示される
    And "ホーム" ボタンが表示される
    And "前に戻る" ボタンが表示される

  Scenario: 権限不足で403ページにロール情報が表示される
    Given viewer ロールのユーザーでログイン済み
    When 管理者専用ページ "/admin/settings" にアクセスする
    Then 403エラーページが表示される
    And タイトル "アクセス権限がありません" が表示される
    And 現在のロール "viewer" が表示される
    And 必要な権限 "admin" が表示される
    And "権限をリクエスト" ボタンが表示される

  Scenario: サーバーエラーで500ページにエラーIDが表示される
    Given サーバーがエラーを返す状態にある
    When サーバーエラーが発生するページにアクセスする
    Then 500エラーページが表示される
    And タイトル "サーバーエラーが発生しました" が表示される
    And エラーID（UUID形式）が表示される
    And サポートメールアドレスが表示される

  Scenario: 未認証ユーザーがログインページにリダイレクトされる
    Given ユーザーが未認証である
    When 保護されたページ "/dashboard" にアクセスする
    Then "/login" にリダイレクトされる
    And URLクエリパラメータに "redirect=/dashboard" が含まれる

  Scenario: 404ページのホームボタンでトップに遷移する
    Given 404エラーページが表示されている
    When "ホーム" ボタンをクリックする
    Then "/" ページに遷移する

  Scenario: 500ページの再試行ボタンでリロードする
    Given 500エラーページが表示されている
    And 再試行ボタンが表示されている
    When "再試行" ボタンをクリックする
    Then ページがリロードされる

  Scenario: モバイルでエラーページがレスポンシブ表示される
    Given ビューポート幅が 375px のモバイルデバイス
    When 存在しないURLにアクセスする
    Then 404エラーページが表示される
    And テキストが読みやすいサイズで表示される
    And ボタンがタップしやすいサイズ（44x44px以上）で表示される
    And レイアウトが崩れていない

  Scenario: ダークモードでエラーページが正しく表示される
    Given ダークモードが有効である
    When サーバーエラーが発生するページにアクセスする
    Then 500エラーページがダークモードで表示される
    And 背景色が dark:bg-gray-900 である
    And テキストのコントラスト比が WCAG AA（4.5:1以上）を満たす

  Scenario: 404ページから検索を実行する
    Given 404エラーページが表示されている
    When 検索バーに "イベント" と入力する
    And Enter キーを押す
    Then "/search?q=イベント" に遷移する

  Scenario: 認証不要の503エラーが500ページにフォールバックする
    Given サーバーが 503 エラーを返す状態にある
    When 503 エラーが発生するページにアクセスする
    Then 500エラーページ（フォールバック）が表示される
    And エラーID（UUID形式）が表示される
```

---

## §4 非機能要件 [CORE]

### パフォーマンス
- エラーページの初期表示: 100ms以内
- リトライボタン押下後のリロード: 即座に実行

### アクセシビリティ
- スクリーンリーダー対応（エラーメッセージをaria-liveで通知）
- キーボード操作対応（Tabキーでボタンフォーカス移動）
- カラーコントラスト比: WCAG AA準拠（4.5:1以上）

### セキュリティ
- エラー詳細（スタックトレース等）をクライアントに送信しない
- エラーIDは推測不可能なランダム文字列（UUIDv4）

### ユーザビリティ
- エラーメッセージは日本語、わかりやすい表現
- 技術用語を避ける（例: 「サーバーエラー」ではなく「問題が発生しました」）
- ユーザーが次にとるべきアクションを明示

---

## §5 制約事項 [CORE]

### 技術的制約
- Nuxt 3の `error.vue` を使用（グローバルエラーハンドリング）
- エラーページは SSR でレンダリング（クライアント側でエラーが発生してもページが表示される）
- エラー情報は `useError()` composable で取得

### ビジネス制約
- サポートメールアドレスは環境変数 `NUXT_PUBLIC_SUPPORT_EMAIL` から取得
- エラーログはサーバー側で記録（クライアント側では記録しない）

### 運用制約
- エラーIDはサーバーログと紐付けて検索可能にする
- エラー発生頻度を監視（週次レポート）

---

## §6 UI仕様 [DETAIL]

### 6.1 404ページ

```
┌─────────────────────────────────────────────────────────────┐
│                      [Logo] Haishin+ HUB                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                         [404 Icon]                          │
│                                                              │
│                  ページが見つかりません                       │
│                                                              │
│        お探しのページは削除されたか、                         │
│        URLが変更された可能性があります。                      │
│                                                              │
│         ┌──────────────────────────────────┐               │
│         │  🔍  ページを検索...              │               │
│         └──────────────────────────────────┘               │
│                                                              │
│         ┌──────────────┐  ┌──────────────┐                │
│         │ ◀ 前に戻る   │  │ 🏠 ホーム    │                │
│         └──────────────┘  └──────────────┘                │
│                                                              │
│         よく見られるページ:                                   │
│         • ダッシュボード                                      │
│         • イベント一覧                                        │
│         • マイタスク                                          │
│         • ヘルプセンター                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**使用コンポーネント**:
- UCard: エラーカード
- UIcon: アイコン (i-heroicons-magnifying-glass, i-heroicons-home)
- UButton: アクションボタン
- UInput: 検索バー

**カラー**:
- 背景: `bg-gray-50 dark:bg-gray-900`
- テキスト: `text-gray-900 dark:text-gray-100`
- アクセント: `text-primary-600 dark:text-primary-400`

### 6.2 403ページ

```
┌─────────────────────────────────────────────────────────────┐
│                      [Logo] Haishin+ HUB                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                         [403 Icon]                          │
│                                                              │
│               アクセス権限がありません                         │
│                                                              │
│        このページにアクセスする権限がありません。              │
│                                                              │
│        現在のロール: 一般ユーザー                             │
│        必要な権限: イベント管理者                             │
│                                                              │
│         ┌──────────────┐  ┌──────────────┐                │
│         │ 権限をリクエスト│  │ 🏠 ホーム    │                │
│         └──────────────┘  └──────────────┘                │
│                                                              │
│         権限に関するご質問は管理者にお問い合わせください。      │
│         support@example.com                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**使用コンポーネント**:
- UCard: エラーカード
- UIcon: アイコン (i-heroicons-shield-exclamation, i-heroicons-home)
- UButton: アクションボタン
- UBadge: ロール表示

**カラー**:
- 背景: `bg-gray-50 dark:bg-gray-900`
- テキスト: `text-gray-900 dark:text-gray-100`
- 警告色: `text-orange-600 dark:text-orange-400`

### 6.3 500ページ

```
┌─────────────────────────────────────────────────────────────┐
│                      [Logo] Haishin+ HUB                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                         [500 Icon]                          │
│                                                              │
│             サーバーエラーが発生しました                       │
│                                                              │
│        申し訳ございません。一時的な問題が発生しました。        │
│        しばらくしてから再度お試しください。                    │
│                                                              │
│         ┌──────────────┐  ┌──────────────┐                │
│         │ 🔄 再試行     │  │ 🏠 ホーム    │                │
│         └──────────────┘  └──────────────┘                │
│                                                              │
│         問題が解決しない場合:                                 │
│         • エラーID: 550e8400-e29b-41d4-a716-446655440000    │
│         • サポート: support@example.com                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**使用コンポーネント**:
- UCard: エラーカード
- UIcon: アイコン (i-heroicons-exclamation-triangle, i-heroicons-arrow-path, i-heroicons-home)
- UButton: アクションボタン
- UKbd: エラーID表示（モノスペースフォント）

**カラー**:
- 背景: `bg-gray-50 dark:bg-gray-900`
- テキスト: `text-gray-900 dark:text-gray-100`
- エラー色: `text-red-600 dark:text-red-400`

### 6.4 共通デザイントークン

```typescript
// Tailwind CSS v4 クラス
const errorPageClasses = {
  container: 'min-h-screen flex items-center justify-center px-4 py-8',
  card: 'max-w-2xl w-full',
  icon: 'w-24 h-24 mx-auto mb-6 text-gray-400 dark:text-gray-600',
  title: 'text-3xl font-bold text-center mb-4 text-gray-900 dark:text-gray-100',
  description: 'text-base text-center mb-8 text-gray-600 dark:text-gray-400',
  actions: 'flex flex-col sm:flex-row gap-4 justify-center mb-8',
  button: 'w-full sm:w-auto',
  footer: 'text-sm text-center text-gray-500 dark:text-gray-500',
}
```

---

## §7 ビジネスルール [CONTRACT]

### BR-001: 401エラー時のリダイレクト
```typescript
if (error.statusCode === 401) {
  const currentPath = useRoute().fullPath
  await navigateTo({
    path: '/login',
    query: { redirect: currentPath }
  })
}
```

### BR-002: 403エラー時のロール表示
```typescript
// 現在のロールを取得して表示
const currentRole = useAuth().user?.role || 'ゲスト'
const requiredRole = error.data?.requiredRole || '不明'

// ロールに応じたガイダンスを表示
const guidance = {
  'viewer': '閲覧のみ可能です。編集権限が必要です。',
  'editor': '一部の機能にアクセスできません。管理者権限が必要です。',
  'admin': 'この組織のリソースにアクセスできません。',
}
```

### BR-003: 500エラー時のログ記録
```typescript
// サーバー側でエラーログを記録
const requestId = crypto.randomUUID()
logger.error('Server error occurred', {
  requestId,
  statusCode: 500,
  message: error.message,
  stack: error.stack,
  userId: event.context.auth?.userId,
  path: event.path,
  method: event.method,
  timestamp: new Date().toISOString(),
})

// クライアントにはrequestIdのみ返す
return { statusCode: 500, requestId }
```

### BR-004: エラーページのSEO対応
```typescript
// 404ページはステータスコード404を返す
setResponseStatus(event, 404)

// 403ページはステータスコード403を返す
setResponseStatus(event, 403)

// 500ページはステータスコード500を返す
setResponseStatus(event, 500)

// robots meta tag
useHead({
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})
```

---

## §8 データモデル [CONTRACT]

### 8.1 エラーオブジェクト（Nuxt Error）

```typescript
interface NuxtError {
  statusCode: number
  statusMessage?: string
  message: string
  stack?: string
  data?: Record<string, any> // カスタムデータ
}
```

### 8.2 カスタムエラーデータ

```typescript
// 403エラーの場合
interface ForbiddenErrorData {
  requiredRole: string
  currentRole: string
  resourceId?: string
  resourceType?: string
}

// 500エラーの場合
interface ServerErrorData {
  requestId: string
  supportEmail: string
  retryable: boolean
}
```

---

## §9 API仕様 [CONTRACT]

エラーページは専用のAPIエンドポイントを持たないが、Nuxt 3のエラーハンドリングメカニズムを使用する。

### 9.1 エラーの発生方法（サーバー側）

```typescript
// server/api/example.ts
export default defineEventHandler(async (event) => {
  // 404エラー
  throw createError({
    statusCode: 404,
    statusMessage: 'Not Found',
    message: 'リソースが見つかりません',
  })

  // 403エラー
  throw createError({
    statusCode: 403,
    statusMessage: 'Forbidden',
    message: 'アクセス権限がありません',
    data: {
      requiredRole: 'admin',
      currentRole: 'viewer',
    },
  })

  // 500エラー
  throw createError({
    statusCode: 500,
    statusMessage: 'Internal Server Error',
    message: 'サーバーエラーが発生しました',
    data: {
      requestId: crypto.randomUUID(),
      supportEmail: process.env.NUXT_PUBLIC_SUPPORT_EMAIL,
      retryable: true,
    },
  })
})
```

### 9.2 エラーの取得方法（クライアント側）

```typescript
// pages/example.vue or error.vue
const error = useError()

console.log(error.value?.statusCode) // 404, 403, 500
console.log(error.value?.message)    // エラーメッセージ
console.log(error.value?.data)       // カスタムデータ
```

---

## §10 テストケース [DETAIL]

### TC-ERR-001: 404ページが表示される

**前提条件**:
- ユーザーがアプリケーションにアクセスできる

**テスト手順**:
1. 存在しないURL `/non-existent-page` にアクセス
2. 404ページが表示されることを確認
3. ページタイトル「ページが見つかりません」が表示されることを確認
4. 「ホーム」ボタンをクリック
5. ホームページにリダイレクトされることを確認

**期待結果**:
- [ ] 404ページが表示される
- [ ] ホームページにリダイレクトされる

**テストタイプ**: E2E

---

### TC-ERR-002: 403ページが表示される

**前提条件**:
- 一般ユーザーでログイン済み

**テスト手順**:
1. 管理者専用ページ `/admin/settings` にアクセス
2. 403ページが表示されることを確認
3. 現在のロール「一般ユーザー」が表示されることを確認
4. 必要な権限「管理者」が表示されることを確認
5. 「ホーム」ボタンをクリック
6. ホームページにリダイレクトされることを確認

**期待結果**:
- [ ] 403ページが表示される
- [ ] ロール情報が正しく表示される
- [ ] ホームページにリダイレクトされる

**テストタイプ**: E2E

---

### TC-ERR-003: 500ページが表示される

**前提条件**:
- サーバーがエラーを返す状態にある（モック）

**テスト手順**:
1. サーバーエラーを発生させるエンドポイント `/api/trigger-error` にアクセス
2. 500ページが表示されることを確認
3. エラーID（UUID形式）が表示されることを確認
4. サポートメールアドレスが表示されることを確認
5. 「再試行」ボタンをクリック
6. ページがリロードされることを確認

**期待結果**:
- [ ] 500ページが表示される
- [ ] エラーIDが表示される
- [ ] 再試行でページがリロードされる

**テストタイプ**: E2E

---

### TC-ERR-004: 401エラー時にログインページにリダイレクト

**前提条件**:
- ユーザーが未認証

**テスト手順**:
1. 保護されたページ `/dashboard` に直接アクセス
2. ログインページ `/login` にリダイレクトされることを確認
3. URLクエリパラメータに `?redirect=/dashboard` が含まれることを確認
4. ログイン後、`/dashboard` にリダイレクトされることを確認

**期待結果**:
- [ ] ログインページにリダイレクトされる
- [ ] 元のURLが保持される
- [ ] ログイン後、元のページに戻る

**テストタイプ**: E2E

---

### TC-ERR-005: モバイルで404ページが正しく表示される

**前提条件**:
- モバイルデバイス（375px幅）でアクセス

**テスト手順**:
1. 存在しないURLにアクセス
2. 404ページが表示されることを確認
3. テキストが読みやすいサイズで表示されることを確認
4. ボタンがタップしやすいサイズで表示されることを確認
5. レイアウトが崩れていないことを確認

**期待結果**:
- [ ] モバイルで正しく表示される
- [ ] ボタンがタップ可能
- [ ] レイアウト崩れなし

**テストタイプ**: Visual

---

### TC-ERR-006: ダークモードで500ページが正しく表示される

**前提条件**:
- ダークモードが有効

**テスト手順**:
1. ダークモードを有効にする
2. サーバーエラーを発生させる
3. 500ページが表示されることを確認
4. テキストが読みやすいコントラストで表示されることを確認
5. 背景色がダークモードに適応していることを確認

**期待結果**:
- [ ] ダークモードで正しく表示される
- [ ] テキストコントラストが十分
- [ ] デザインが一貫している

**テストタイプ**: Visual

---

## §11 実装例 [DETAIL]

### 11.1 error.vue（グローバルエラーハンドラ）

```vue
<!-- error.vue -->
<script setup lang="ts">
const error = useError()
const { statusCode, message, data } = error.value || {}

// 401エラーは自動リダイレクト
if (statusCode === 401) {
  const route = useRoute()
  await navigateTo({
    path: '/login',
    query: { redirect: route.fullPath }
  })
}

// エラーページコンポーネントを動的に選択
const errorComponent = computed(() => {
  switch (statusCode) {
    case 404:
      return resolveComponent('Error404')
    case 403:
      return resolveComponent('Error403')
    case 500:
      return resolveComponent('Error500')
    default:
      return resolveComponent('Error500') // デフォルトは500
  }
})

// SEO: noindex
useHead({
  title: `エラー ${statusCode} | Haishin+ HUB`,
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})
</script>

<template>
  <NuxtLayout name="error">
    <component :is="errorComponent" :error="error" />
  </NuxtLayout>
</template>
```

---

### 11.2 Error404.vue（404ページ）

```vue
<!-- components/error/Error404.vue -->
<script setup lang="ts">
const props = defineProps<{
  error: any
}>()

const searchQuery = ref('')

const popularLinks = [
  { label: 'ダッシュボード', to: '/dashboard', icon: 'i-heroicons-home' },
  { label: 'イベント一覧', to: '/events', icon: 'i-heroicons-calendar' },
  { label: 'マイタスク', to: '/tasks', icon: 'i-heroicons-check-circle' },
  { label: 'ヘルプセンター', to: '/help', icon: 'i-heroicons-question-mark-circle' },
]

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    navigateTo(`/search?q=${encodeURIComponent(searchQuery.value)}`)
  }
}

const goBack = () => {
  if (window.history.length > 1) {
    window.history.back()
  } else {
    navigateTo('/')
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50 dark:bg-gray-900">
    <UCard class="max-w-2xl w-full">
      <div class="text-center">
        <!-- Icon -->
        <UIcon
          name="i-heroicons-question-mark-circle"
          class="w-24 h-24 mx-auto mb-6 text-gray-400 dark:text-gray-600"
        />

        <!-- Title -->
        <h1 class="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          ページが見つかりません
        </h1>

        <!-- Description -->
        <p class="text-base mb-8 text-gray-600 dark:text-gray-400">
          お探しのページは削除されたか、URLが変更された可能性があります。
        </p>

        <!-- Search Bar -->
        <form @submit.prevent="handleSearch" class="mb-8">
          <UInput
            v-model="searchQuery"
            placeholder="ページを検索..."
            size="lg"
            icon="i-heroicons-magnifying-glass"
          />
        </form>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <UButton
            variant="outline"
            size="lg"
            icon="i-heroicons-arrow-left"
            @click="goBack"
          >
            前に戻る
          </UButton>
          <UButton
            color="primary"
            size="lg"
            icon="i-heroicons-home"
            to="/"
          >
            ホーム
          </UButton>
        </div>

        <!-- Popular Links -->
        <div class="text-left">
          <h2 class="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">
            よく見られるページ
          </h2>
          <ul class="space-y-2">
            <li v-for="link in popularLinks" :key="link.to">
              <NuxtLink
                :to="link.to"
                class="flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:underline"
              >
                <UIcon :name="link.icon" class="w-5 h-5" />
                {{ link.label }}
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </UCard>
  </div>
</template>
```

---

### 11.3 Error403.vue（403ページ）

```vue
<!-- components/error/Error403.vue -->
<script setup lang="ts">
const props = defineProps<{
  error: any
}>()

const { user } = useAuth()

const currentRole = computed(() => user.value?.role || 'ゲスト')
const requiredRole = computed(() => props.error?.data?.requiredRole || '不明')

const supportEmail = useRuntimeConfig().public.supportEmail

const roleGuidance = computed(() => {
  const role = currentRole.value
  switch (role) {
    case 'viewer':
      return '閲覧のみ可能です。編集権限が必要です。'
    case 'editor':
      return '一部の機能にアクセスできません。管理者権限が必要です。'
    case 'admin':
      return 'この組織のリソースにアクセスできません。'
    default:
      return 'ログインしていない可能性があります。'
  }
})

const handleRequestAccess = () => {
  // 権限リクエストフォームに遷移
  navigateTo('/request-access')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50 dark:bg-gray-900">
    <UCard class="max-w-2xl w-full">
      <div class="text-center">
        <!-- Icon -->
        <UIcon
          name="i-heroicons-shield-exclamation"
          class="w-24 h-24 mx-auto mb-6 text-orange-400 dark:text-orange-600"
        />

        <!-- Title -->
        <h1 class="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          アクセス権限がありません
        </h1>

        <!-- Description -->
        <p class="text-base mb-6 text-gray-600 dark:text-gray-400">
          このページにアクセスする権限がありません。
        </p>

        <!-- Role Info -->
        <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-8 text-left">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
              現在のロール:
            </span>
            <UBadge color="gray" variant="subtle">
              {{ currentRole }}
            </UBadge>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
              必要な権限:
            </span>
            <UBadge color="orange" variant="subtle">
              {{ requiredRole }}
            </UBadge>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-4">
            {{ roleGuidance }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <UButton
            variant="outline"
            size="lg"
            icon="i-heroicons-envelope"
            @click="handleRequestAccess"
          >
            権限をリクエスト
          </UButton>
          <UButton
            color="primary"
            size="lg"
            icon="i-heroicons-home"
            to="/"
          >
            ホーム
          </UButton>
        </div>

        <!-- Support Contact -->
        <p class="text-sm text-gray-500 dark:text-gray-500">
          権限に関するご質問は管理者にお問い合わせください。<br>
          <a
            :href="`mailto:${supportEmail}`"
            class="text-primary-600 dark:text-primary-400 hover:underline"
          >
            {{ supportEmail }}
          </a>
        </p>
      </div>
    </UCard>
  </div>
</template>
```

---

### 11.4 Error500.vue（500ページ）

```vue
<!-- components/error/Error500.vue -->
<script setup lang="ts">
const props = defineProps<{
  error: any
}>()

const requestId = computed(() => props.error?.data?.requestId || 'N/A')
const supportEmail = useRuntimeConfig().public.supportEmail
const retryable = computed(() => props.error?.data?.retryable !== false)

const isRetrying = ref(false)

const handleRetry = async () => {
  isRetrying.value = true
  // ページをリロード
  await new Promise(resolve => setTimeout(resolve, 500)) // UX: 一瞬待つ
  window.location.reload()
}

const copyErrorId = () => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(requestId.value)
    // トースト通知（実装済みの場合）
    // useToast().add({ title: 'エラーIDをコピーしました' })
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50 dark:bg-gray-900">
    <UCard class="max-w-2xl w-full">
      <div class="text-center">
        <!-- Icon -->
        <UIcon
          name="i-heroicons-exclamation-triangle"
          class="w-24 h-24 mx-auto mb-6 text-red-400 dark:text-red-600"
        />

        <!-- Title -->
        <h1 class="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          サーバーエラーが発生しました
        </h1>

        <!-- Description -->
        <p class="text-base mb-8 text-gray-600 dark:text-gray-400">
          申し訳ございません。一時的な問題が発生しました。<br>
          しばらくしてから再度お試しください。
        </p>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <UButton
            v-if="retryable"
            variant="outline"
            size="lg"
            icon="i-heroicons-arrow-path"
            :loading="isRetrying"
            @click="handleRetry"
          >
            再試行
          </UButton>
          <UButton
            color="primary"
            size="lg"
            icon="i-heroicons-home"
            to="/"
          >
            ホーム
          </UButton>
        </div>

        <!-- Error Info -->
        <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-left">
          <h2 class="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">
            問題が解決しない場合
          </h2>
          <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div class="flex items-start gap-2">
              <span class="font-medium min-w-24">エラーID:</span>
              <button
                @click="copyErrorId"
                class="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                :title="'コピー: ' + requestId"
              >
                {{ requestId }}
              </button>
            </div>
            <div class="flex items-start gap-2">
              <span class="font-medium min-w-24">サポート:</span>
              <a
                :href="`mailto:${supportEmail}?subject=エラー報告 (ID: ${requestId})`"
                class="text-primary-600 dark:text-primary-400 hover:underline"
              >
                {{ supportEmail }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
```

---

### 11.5 エラーハンドリング Composable

```typescript
// composables/useErrorHandler.ts
export const useErrorHandler = () => {
  const handleError = (error: any) => {
    // エラーの種類に応じて処理を分岐
    if (error.statusCode) {
      // サーバーエラー（Nuxt Error）
      switch (error.statusCode) {
        case 401:
          // 401は自動リダイレクト（error.vueで処理）
          throw createError(error)
        case 403:
          // 403は権限エラーページ
          throw createError(error)
        case 404:
          // 404はNotFoundページ
          throw createError(error)
        case 500:
        default:
          // その他はサーバーエラーページ
          throw createError({
            statusCode: 500,
            message: 'サーバーエラーが発生しました',
            data: {
              requestId: crypto.randomUUID(),
              supportEmail: useRuntimeConfig().public.supportEmail,
              retryable: true,
            },
          })
      }
    } else {
      // クライアント側のエラー（予期しないエラー）
      console.error('Unexpected error:', error)
      throw createError({
        statusCode: 500,
        message: '予期しないエラーが発生しました',
        data: {
          requestId: crypto.randomUUID(),
          supportEmail: useRuntimeConfig().public.supportEmail,
          retryable: true,
        },
      })
    }
  }

  return {
    handleError,
  }
}
```

---

### 11.6 サーバーミドルウェア（エラーログ記録）

```typescript
// server/middleware/error-logger.ts
export default defineEventHandler(async (event) => {
  // エラーハンドリングはonErrorフックで行う
  event.node.res.on('finish', () => {
    const statusCode = event.node.res.statusCode
    if (statusCode >= 500) {
      // 500系エラーをログに記録
      const requestId = event.context.requestId || crypto.randomUUID()
      const logger = useLogger('error')

      logger.error('Server error occurred', {
        requestId,
        statusCode,
        path: event.path,
        method: event.method,
        userId: event.context.auth?.userId,
        timestamp: new Date().toISOString(),
      })
    }
  })
})
```

---

### 11.7 環境変数設定

```bash
# .env
NUXT_PUBLIC_SUPPORT_EMAIL=support@haishin-plus-hub.com
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      supportEmail: process.env.NUXT_PUBLIC_SUPPORT_EMAIL || 'support@example.com',
    },
  },
})
```

---

## §12 未決定事項・制約 [CONTRACT]

### 前提条件
- Nuxt 3 `error.vue` によるグローバルエラーハンドリング
- Nuxt UI v3 コンポーネント利用可能
- SSOT-5 エラーハンドリング戦略に準拠

### 制約
- 404/403/500 以外のHTTPステータスは 500ページにフォールバック
- エラー詳細（スタックトレース）はクライアントに送信しない
- robots: noindex, nofollow

### 未決定事項

| 項目ID | 項目 | 選択肢 | 期限 | 決定者 |
|--------|------|--------|------|--------|
| ERR-TBD-01 | カスタムイラスト | (1) 自作 (2) ライブラリ使用 (3) アイコンのみ | MVP前 | デザイナー |
| ERR-TBD-02 | 検索バー実装タイミング | (1) MVP (2) Post-MVP | Sprint 3 | PO |

---

## §13 変更履歴 [DETAIL]

| バージョン | 日付 | 変更内容 | 変更者 |
|-----------|------|---------|--------|
| 1.1.0 | 2026-02-09 | §3-E/F/G/H追加、§12未決定事項・制約追加 | Claude |
| 1.0.0 | 2026-02-09 | 初版作成（404/403/500ページ統合仕様） | Claude |

---

## 参考資料

- **Nuxt 3 Error Handling**: https://nuxt.com/docs/getting-started/error-handling
- **Nuxt UI v3**: https://ui.nuxt.com/
- **SSOT-3**: API規約（エラーコード定義）
- **SSOT-5**: 横断的関心事（エラーハンドリング戦略）
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/

---

**EOF**
