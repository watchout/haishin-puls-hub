# SEC-001-007: セキュリティ機能統合仕様

---

## §1 文書情報

| 項目 | 内容 |
|------|------|
| 文書ID | SEC-001-007 |
| 文書名 | セキュリティ機能統合仕様書 |
| バージョン | 1.1.0 |
| 最終更新日 | 2026-02-09 |
| ステータス | Draft |
| 作成者 | System |
| レビュワー | - |
| 承認者 | - |

### 含まれるセキュリティ機能

| 機能ID | 機能名 | 概要 |
|--------|--------|------|
| SEC-001 | CSRF対策 | クロスサイトリクエストフォージェリ防止 |
| SEC-002 | CORS設定 | クロスオリジンリソース共有制御 |
| SEC-003 | レート制限 | API リクエスト頻度制限 |
| SEC-004 | 入力バリデーション | ユーザー入力の検証と無害化 |
| SEC-005 | SQLインジェクション対策 | データベース攻撃防止 |
| SEC-006 | XSS対策 | クロスサイトスクリプティング防止 |
| SEC-007 | HTTPSリダイレクト | 暗号化通信の強制 |

### 変更履歴

| バージョン | 日付 | 変更内容 | 変更者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-02-09 | 初版作成 | System |
| 1.1.0 | 2026-02-09 | §3-E/F/G/H（入出力例・境界値・例外レスポンス・Gherkin）追加 | Claude |

---

## §2 機能概要 [CORE]

### 2.1 目的

配信プラスHUBにおけるセキュリティ脅威を多層的に防御し、ユーザーデータとシステムの安全性を確保する。

### 2.2 スコープ [CORE]

**対象範囲:**
- すべてのHTTPリクエスト/レスポンス
- 状態変更API（POST/PATCH/DELETE）
- ユーザー入力（フォーム、ファイルアップロード、リッチテキスト）
- データベースクエリ
- セッション管理
- 外部ドメインとの通信

**対象外:**
- アプリケーション固有の認可ロジック（AUTH-002で定義）
- ビジネスロジックレベルのバリデーション（各機能仕様で定義）
- インフラレベルのファイアウォール設定

### 2.3 ユーザー価値

- **エンドユーザー**: 安心してサービスを利用できる
- **管理者**: セキュリティインシデントのリスク低減
- **開発者**: セキュリティベストプラクティスの自動適用

---

## §3 機能要件

### 3.1 SEC-001: CSRF対策

| 要件ID | 優先度 | 要件 |
|--------|--------|------|
| FR-SEC-001-01 | MUST | Better Auth のセッションクッキーに `SameSite=Lax` を設定する |
| FR-SEC-001-02 | MUST | 状態変更API（POST/PATCH/DELETE）で `Origin` ヘッダーをチェックする |
| FR-SEC-001-03 | MUST | `Origin` が許可リストに含まれない場合、`403 Forbidden` を返す |
| FR-SEC-001-04 | SHOULD | `Referer` ヘッダーも副次的にチェックする（`Origin` がない場合） |

### 3.2 SEC-002: CORS設定

| 要件ID | 優先度 | 要件 |
|--------|--------|------|
| FR-SEC-002-01 | MUST | 本番環境では明示的に許可したオリジンのみ `Access-Control-Allow-Origin` を返す |
| FR-SEC-002-02 | MUST | 開発環境では `http://localhost:3000` を許可する |
| FR-SEC-002-03 | MUST | `Access-Control-Allow-Credentials: true` を設定する（Cookie送信を許可） |
| FR-SEC-002-04 | MUST | `Access-Control-Allow-Methods` を最小限に制限する（GET, POST, PATCH, DELETE, OPTIONS） |
| FR-SEC-002-05 | MUST | `Access-Control-Allow-Headers` を必要なヘッダーのみに制限する |
| FR-SEC-002-06 | SHOULD | プリフライトリクエスト（OPTIONS）のレスポンスをキャッシュする（`Access-Control-Max-Age`） |

### 3.3 SEC-003: レート制限

| 要件ID | 優先度 | 要件 |
|--------|--------|------|
| FR-SEC-003-01 | MUST | IP アドレスとユーザーIDの二重制限を実装する |
| FR-SEC-003-02 | MUST | `/api/auth/*` に 10リクエスト/分 の制限を設ける |
| FR-SEC-003-03 | MUST | `/api/v1/ai/*` に 20リクエスト/分 の制限を設ける |
| FR-SEC-003-04 | MUST | `/api/v1/*` に 100リクエスト/分 の制限を設ける |
| FR-SEC-003-05 | MUST | `/api/v1/files/upload` に 10リクエスト/分 の制限を設ける |
| FR-SEC-003-06 | MUST | 制限超過時に `429 Too Many Requests` を返す |
| FR-SEC-003-07 | MUST | レスポンスヘッダーに `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` を含める |
| FR-SEC-003-08 | SHOULD | ユーザーが未認証の場合はIPアドレスのみで制限する |

### 3.4 SEC-004: 入力バリデーション

| 要件ID | 優先度 | 要件 |
|--------|--------|------|
| FR-SEC-004-01 | MUST | フロントエンドで Zod スキーマによる入力検証を行う（VeeValidate + Zod） |
| FR-SEC-004-02 | MUST | バックエンドでも同じ Zod スキーマで再検証する（信頼境界） |
| FR-SEC-004-03 | MUST | 無効な入力に対して `400 Bad Request` を返す |
| FR-SEC-004-04 | MUST | バリデーションエラーメッセージはフィールド単位で返す |
| FR-SEC-004-05 | SHOULD | 型強制（coerce）は最小限にし、厳密な型チェックを優先する |
| FR-SEC-004-06 | MAY | カスタムバリデーターでビジネスルール検証を追加する |

### 3.5 SEC-005: SQLインジェクション対策

| 要件ID | 優先度 | 要件 |
|--------|--------|------|
| FR-SEC-005-01 | MUST | すべてのデータベースクエリで Drizzle ORM のパラメータ化クエリを使用する |
| FR-SEC-005-02 | MUST | 生のSQL文字列連結を禁止する |
| FR-SEC-005-03 | MUST | 動的な WHERE 句は Drizzle の `eq()`, `like()` 等のヘルパーを使用する |
| FR-SEC-005-04 | SHOULD | データベースユーザーの権限を最小限にする（アプリケーション専用ユーザー） |

### 3.6 SEC-006: XSS対策

| 要件ID | 優先度 | 要件 |
|--------|--------|------|
| FR-SEC-006-01 | MUST | Vue 3 のデフォルトエスケープ機能を使用する（`{{ }}` 補間） |
| FR-SEC-006-02 | MUST | `v-html` の使用を原則禁止する |
| FR-SEC-006-03 | MUST | リッチテキスト入力（メモ、コメント）には DOMPurify で無害化する |
| FR-SEC-006-04 | MUST | セキュリティヘッダー `X-Content-Type-Options: nosniff` を設定する |
| FR-SEC-006-05 | MUST | セキュリティヘッダー `X-Frame-Options: DENY` を設定する |
| FR-SEC-006-06 | SHOULD | Content Security Policy (CSP) を設定する |
| FR-SEC-006-07 | MAY | Trusted Types API を検討する（ブラウザサポート状況次第） |

### 3.7 SEC-007: HTTPSリダイレクト

| 要件ID | 優先度 | 要件 |
|--------|--------|------|
| FR-SEC-007-01 | MUST | 本番環境では HTTP リクエストを HTTPS にリダイレクトする（301） |
| FR-SEC-007-02 | MUST | Nginx リバースプロキシで Let's Encrypt 証明書を使用する |
| FR-SEC-007-03 | MUST | `Strict-Transport-Security` ヘッダーを設定する（HSTS） |
| FR-SEC-007-04 | SHOULD | HSTS の `max-age` を最低6ヶ月（15768000秒）に設定する |
| FR-SEC-007-05 | MAY | HSTS プリロードリストへの登録を検討する |

### 3-E 入出力例 [CONTRACT]

| # | シナリオ | 入力（リクエスト） | 期待出力（レスポンス） |
|---|---------|-------------------|----------------------|
| 1 | CSRF: 正当なOrigin | `POST /api/v1/events` + `Origin: https://haishin-plus-hub.com` | `200 OK`（正常処理） |
| 2 | CSRF: 不正なOrigin | `POST /api/v1/events` + `Origin: https://evil.com` | `403 Forbidden` / `SEC_CSRF_INVALID` |
| 3 | レート制限: 制限内（5/10） | `POST /api/auth/login`（5回目） | `200 OK` + `X-RateLimit-Remaining: 5` |
| 4 | レート制限: 制限超過（11/10） | `POST /api/auth/login`（11回目） | `429 Too Many Requests` / `SEC_RATE_LIMIT` + `Retry-After: 300` |
| 5 | バリデーション: 正常入力 | `POST /api/v1/events` + `{ "title": "セミナーA", "startDate": "2026-03-01T10:00:00Z", "endDate": "2026-03-01T12:00:00Z", "organizationId": "uuid" }` | `200 OK`（イベント作成成功） |
| 6 | バリデーション: SQLインジェクション試行 | `GET /api/v1/events/search?q=' OR '1'='1' --` | `400 Bad Request` / `SEC_VALIDATION_ERROR`（Zodバリデーション拒否）または結果0件（Drizzle ORM自動エスケープ） |
| 7 | XSS: scriptタグ入力 | `POST /api/v1/events/123/memo` + `{ "content": "<script>alert('XSS')</script><p>安全</p>" }` | `200 OK` / 保存内容: `<p>安全</p>`（scriptタグ除去） |
| 8 | CORS: 正当オリジン | `OPTIONS /api/v1/events` + `Origin: https://haishin-plus-hub.com` | `204 No Content` + `Access-Control-Allow-Origin: https://haishin-plus-hub.com` |
| 9 | CORS: 不正オリジン | `OPTIONS /api/v1/events` + `Origin: https://attacker.com` | `204 No Content`（`Access-Control-Allow-Origin` ヘッダーなし） |
| 10 | HTTPS: HTTPアクセス（本番） | `GET http://haishin-plus-hub.com/` | `301 Moved Permanently` → `https://haishin-plus-hub.com/` |

### 3-F 境界値 [CONTRACT]

| # | 対象 | 境界 | 値 | 期待結果 |
|---|------|------|----|----------|
| 1 | レート制限（auth） | 制限ちょうど | 10リクエスト目（10/10） | `200 OK` + `X-RateLimit-Remaining: 0` |
| 2 | レート制限（auth） | 制限超過 | 11リクエスト目（11/10） | `429 Too Many Requests` |
| 3 | レート制限（ai） | 制限ちょうど | 20リクエスト目（20/20） | `200 OK` + `X-RateLimit-Remaining: 0` |
| 4 | レート制限（ai） | 制限超過 | 21リクエスト目（21/20） | `429 Too Many Requests` |
| 5 | レート制限（api） | 制限ちょうど | 100リクエスト目（100/100） | `200 OK` + `X-RateLimit-Remaining: 0` |
| 6 | レート制限（api） | 制限超過 | 101リクエスト目（101/100） | `429 Too Many Requests` |
| 7 | CSP | unsafe-inline許可 | `script-src 'self' 'unsafe-inline' 'unsafe-eval'` | Nuxt/Vue のインラインスクリプトが動作する |
| 8 | HSTS max-age | 最小推奨値 | 15768000秒（6ヶ月） | SHOULD 要件を満たす |
| 9 | HSTS max-age | 設定値 | 31536000秒（1年） | セキュリティヘッダーに反映される |
| 10 | 入力長（title） | 最大許可 | 200文字 | `200 OK`（バリデーション通過） |
| 11 | 入力長（title） | 最大超過 | 201文字 | `400 Bad Request` / `SEC_VALIDATION_ERROR` |
| 12 | 入力長（description） | 最大許可 | 5000文字 | `200 OK`（バリデーション通過） |
| 13 | 入力長（description） | 最大超過 | 5001文字 | `400 Bad Request` / `SEC_VALIDATION_ERROR` |
| 14 | Origin ヘッダー | 空文字 | `Origin: ""` | `403 Forbidden`（許可リスト不一致） |
| 15 | Origin ヘッダー | null | ヘッダーなし | Referer フォールバックチェック実行 |
| 16 | Origin ヘッダー | 正当値 | `Origin: https://haishin-plus-hub.com` | CSRF チェック通過 |
| 17 | Referer ヘッダー | 空文字（Origin もなし） | `Referer: ""` | `403 Forbidden` |
| 18 | Referer ヘッダー | 正当値（Originなし） | `Referer: https://haishin-plus-hub.com/events` | CSRF チェック通過 |

### 3-G 例外レスポンス [CONTRACT]

| エラーコード | HTTP ステータス | statusMessage | message | 発生条件 | 備考 |
|-------------|----------------|---------------|---------|----------|------|
| SEC_RATE_LIMIT | 429 | Too Many Requests | Rate limit exceeded. Please try again later. | 時間窓内のリクエスト数が制限値を超過 | `Retry-After` ヘッダーにブロック解除までの秒数を含む |
| SEC_CSRF_INVALID | 403 | Forbidden | Invalid origin or referer | 状態変更API（POST/PATCH/DELETE）で Origin/Referer が許可リストに不一致 | Referer フォールバック後も不一致の場合 |
| SEC_ORIGIN_INVALID | 403 | Forbidden | Invalid origin | CORS プリフライト以外で Origin が許可リストに存在しない | セキュリティイベントとしてログ記録 |
| SEC_VALIDATION_ERROR | 400 | Bad Request | Validation failed | Zod スキーマによる入力検証失敗 | `details.errors` にフィールド単位のエラーを含む |
| SEC_CORS_DENIED | 403 | Forbidden | CORS policy violation | 許可されていないオリジンからのクロスオリジンリクエスト | `Access-Control-Allow-Origin` ヘッダーを返さない |
| SEC_CONTENT_TYPE_INVALID | 415 | Unsupported Media Type | Unsupported content type | `Content-Type` が `application/json` 以外で JSON API にリクエスト | API エンドポイントが期待する Content-Type と不一致 |

**レスポンスボディ形式（共通）:**

```json
{
  "statusCode": 429,
  "statusMessage": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "code": "SEC_RATE_LIMIT",
  "details": {
    "limit": 10,
    "remaining": 0,
    "resetAt": "2026-02-09T10:45:00Z"
  },
  "timestamp": "2026-02-09T10:44:23Z",
  "path": "/api/auth/login"
}
```

### 3-H 受け入れテスト（Gherkin） [CONTRACT]

```gherkin
Feature: SEC-001-007 セキュリティ機能

  # --- SEC-001: CSRF対策 ---

  Scenario: CSRF-01 正当なOriginからの状態変更リクエストが許可される
    Given ユーザーが認証済みである
    And   リクエストの Origin ヘッダーが "https://haishin-plus-hub.com" である
    When  POST /api/v1/events にリクエストを送信する
    Then  ステータスコード 200 が返される
    And   リクエストが正常に処理される

  Scenario: CSRF-02 不正なOriginからの状態変更リクエストが拒否される
    Given ユーザーが認証済みである
    And   リクエストの Origin ヘッダーが "https://evil.com" である
    When  POST /api/v1/events にリクエストを送信する
    Then  ステータスコード 403 が返される
    And   エラーコード "SEC_CSRF_INVALID" が返される
    And   セキュリティイベント "csrf_violation" がログに記録される

  Scenario: CSRF-03 Originなし・正当なRefererでフォールバック許可
    Given ユーザーが認証済みである
    And   リクエストに Origin ヘッダーが含まれない
    And   Referer ヘッダーが "https://haishin-plus-hub.com/events/new" である
    When  POST /api/v1/events にリクエストを送信する
    Then  ステータスコード 200 が返される

  # --- SEC-003: レート制限 ---

  Scenario: RATE-01 制限内のリクエストが許可される
    Given IPアドレス "192.168.1.1" からのリクエストである
    And   直近1分間に /api/auth/login へのリクエストが 9 回である
    When  POST /api/auth/login にリクエストを送信する
    Then  ステータスコード 200 が返される
    And   レスポンスヘッダー "X-RateLimit-Remaining" が "0" である
    And   レスポンスヘッダー "X-RateLimit-Limit" が "10" である

  Scenario: RATE-02 制限超過のリクエストが拒否される
    Given IPアドレス "192.168.1.1" からのリクエストである
    And   直近1分間に /api/auth/login へのリクエストが 10 回である
    When  POST /api/auth/login にリクエストを送信する
    Then  ステータスコード 429 が返される
    And   エラーコード "SEC_RATE_LIMIT" が返される
    And   レスポンスヘッダー "Retry-After" が設定されている
    And   レスポンスヘッダー "X-RateLimit-Remaining" が "0" である

  # --- SEC-004: 入力バリデーション ---

  Scenario: VAL-01 正常な入力データでバリデーション成功
    Given ユーザーが認証済みである
    And   リクエストボディが有効なイベントデータである:
      | title    | セミナーA                  |
      | startDate | 2026-03-01T10:00:00Z      |
      | endDate   | 2026-03-01T12:00:00Z      |
    When  POST /api/v1/events にリクエストを送信する
    Then  ステータスコード 200 が返される
    And   イベントが作成される

  Scenario: VAL-02 SQLインジェクション試行が防止される
    Given ユーザーが認証済みである
    When  GET /api/v1/events/search?q=' OR '1'='1' -- にリクエストを送信する
    Then  ステータスコード 400 が返される
    And   エラーコード "SEC_VALIDATION_ERROR" が返される
    And   データベースに不正なクエリが実行されない

  # --- SEC-006: XSS対策 ---

  Scenario: XSS-01 scriptタグがサニタイズされる
    Given ユーザーが認証済みである
    And   リクエストボディの content が "<script>alert('XSS')</script><p>安全なコンテンツ</p>" である
    When  POST /api/v1/events/123/memo にリクエストを送信する
    Then  ステータスコード 200 が返される
    And   保存された content に "<script>" タグが含まれない
    And   保存された content に "<p>安全なコンテンツ</p>" が含まれる

  # --- SEC-007: HTTPSリダイレクト ---

  Scenario: HTTPS-01 HTTPリクエストがHTTPSにリダイレクトされる
    Given 本番環境で稼働している
    When  GET http://haishin-plus-hub.com/ にリクエストを送信する
    Then  ステータスコード 301 が返される
    And   Location ヘッダーが "https://haishin-plus-hub.com/" である
    And   レスポンスヘッダー "Strict-Transport-Security" に "max-age=31536000" が含まれる
```

---

## §4 データ仕様

### 4.1 レート制限設定 [CONTRACT]

```typescript
// server/utils/security/rate-limit-config.ts
export const RATE_LIMIT_CONFIG = {
  auth: {
    points: 10,        // 許可するリクエスト数
    duration: 60,      // 秒
    blockDuration: 300 // ブロック期間（秒）
  },
  ai: {
    points: 20,
    duration: 60,
    blockDuration: 180
  },
  api: {
    points: 100,
    duration: 60,
    blockDuration: 60
  },
  upload: {
    points: 10,
    duration: 60,
    blockDuration: 600
  }
} as const

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIG
```

### 4.2 セキュリティヘッダー設定 [CONTRACT]

```typescript
// server/utils/security/headers.ts
export const SECURITY_HEADERS = {
  // XSS対策
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',

  // HTTPS強制（本番環境のみ）
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',

  // CSP（段階的に厳格化）
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Nuxt/Vue の制約
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.anthropic.com",
    "frame-ancestors 'none'"
  ].join('; '),

  // その他
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
} as const
```

### 4.3 許可オリジンリスト [CONTRACT]

```typescript
// server/utils/security/allowed-origins.ts
export const ALLOWED_ORIGINS = {
  development: [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  production: [
    'https://haishin-plus-hub.com',
    'https://www.haishin-plus-hub.com'
  ]
} as const

export function getAllowedOrigins(): string[] {
  const env = process.env.NODE_ENV || 'development'
  return env === 'production'
    ? ALLOWED_ORIGINS.production
    : [...ALLOWED_ORIGINS.production, ...ALLOWED_ORIGINS.development]
}
```

---

## §5 API仕様

### 5.1 セキュリティミドルウェア（CORS・CSRF） [CONTRACT]

```typescript
// server/middleware/security.ts
import { defineEventHandler, getHeader, setResponseHeaders } from 'h3'
import { getAllowedOrigins } from '~/server/utils/security/allowed-origins'
import { SECURITY_HEADERS } from '~/server/utils/security/headers'

export default defineEventHandler((event) => {
  const method = event.node.req.method || 'GET'
  const origin = getHeader(event, 'origin')
  const allowedOrigins = getAllowedOrigins()

  // セキュリティヘッダーを設定
  setResponseHeaders(event, SECURITY_HEADERS)

  // CORS設定
  if (origin && allowedOrigins.includes(origin)) {
    setResponseHeaders(event, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400' // 24時間
    })
  }

  // OPTIONSリクエスト（プリフライト）への応答
  if (method === 'OPTIONS') {
    event.node.res.statusCode = 204
    event.node.res.end()
    return
  }

  // CSRF対策: 状態変更APIでOriginチェック
  if (['POST', 'PATCH', 'DELETE'].includes(method)) {
    if (!origin || !allowedOrigins.includes(origin)) {
      // Refererも確認
      const referer = getHeader(event, 'referer')
      const isValidReferer = referer && allowedOrigins.some(
        allowed => referer.startsWith(allowed)
      )

      if (!isValidReferer) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Forbidden',
          message: 'Invalid origin or referer'
        })
      }
    }
  }
})
```

### 5.2 レート制限ミドルウェア [CONTRACT]

```typescript
// server/middleware/rate-limit.ts
import { defineEventHandler, getHeader, getCookie } from 'h3'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import type { RateLimitType } from '~/server/utils/security/rate-limit-config'
import { RATE_LIMIT_CONFIG } from '~/server/utils/security/rate-limit-config'

// インメモリストア（本番環境ではRedis推奨）
const limiters = new Map<RateLimitType, RateLimiterMemory>()

// 初期化
Object.entries(RATE_LIMIT_CONFIG).forEach(([key, config]) => {
  limiters.set(key as RateLimitType, new RateLimiterMemory({
    points: config.points,
    duration: config.duration,
    blockDuration: config.blockDuration
  }))
})

export default defineEventHandler(async (event) => {
  const path = event.node.req.url || ''
  const ip = getHeader(event, 'x-forwarded-for') ||
             getHeader(event, 'x-real-ip') ||
             event.node.req.socket.remoteAddress ||
             'unknown'

  // レート制限タイプを判定
  let limitType: RateLimitType | null = null
  if (path.startsWith('/api/auth/')) {
    limitType = 'auth'
  } else if (path.startsWith('/api/v1/ai/')) {
    limitType = 'ai'
  } else if (path.startsWith('/api/v1/files/upload')) {
    limitType = 'upload'
  } else if (path.startsWith('/api/v1/')) {
    limitType = 'api'
  }

  if (!limitType) return // レート制限対象外

  const limiter = limiters.get(limitType)!

  // ユーザーIDを取得（認証済みの場合）
  const sessionToken = getCookie(event, 'better-auth.session_token')
  const userId = sessionToken ? await getUserIdFromSession(sessionToken) : null

  // IP + UserID でキーを生成
  const key = userId ? `user:${userId}:${limitType}` : `ip:${ip}:${limitType}`

  try {
    const rateLimitRes = await limiter.consume(key)

    // レート制限情報をヘッダーに追加
    setResponseHeaders(event, {
      'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG[limitType].points),
      'X-RateLimit-Remaining': String(rateLimitRes.remainingPoints),
      'X-RateLimit-Reset': String(new Date(Date.now() + rateLimitRes.msBeforeNext).toISOString())
    })
  } catch (rejRes: any) {
    // レート制限超過
    setResponseHeaders(event, {
      'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG[limitType].points),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(new Date(Date.now() + rejRes.msBeforeNext).toISOString()),
      'Retry-After': String(Math.ceil(rejRes.msBeforeNext / 1000))
    })

    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.'
    })
  }
})

// ヘルパー関数
async function getUserIdFromSession(sessionToken: string): Promise<string | null> {
  // Better Auth のセッションからユーザーIDを取得
  // 実装は Better Auth の仕様に依存
  try {
    const { auth } = await import('#auth')
    const session = await auth.api.getSession({ headers: { cookie: `better-auth.session_token=${sessionToken}` } })
    return session?.user?.id || null
  } catch {
    return null
  }
}
```

### 5.3 入力バリデーションパターン [CONTRACT]

```typescript
// server/api/v1/events/index.post.ts
import { z } from 'zod'
import { defineEventHandler, readBody } from 'h3'

// Zodスキーマ（フロントエンドと共有）
export const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  organizationId: z.string().uuid()
}).refine(data => new Date(data.startDate) < new Date(data.endDate), {
  message: 'End date must be after start date',
  path: ['endDate']
})

export default defineEventHandler(async (event) => {
  // バリデーション
  const body = await readBody(event)
  const result = createEventSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        errors: result.error.flatten().fieldErrors
      }
    })
  }

  const validatedData = result.data

  // ビジネスロジック...
  // ...
})
```

### 5.4 XSS対策（DOMPurify統合） [DETAIL]

```typescript
// server/utils/security/sanitize.ts
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false
  })
}

// 使用例
// server/api/v1/events/[id]/memo.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const sanitizedContent = sanitizeHtml(body.content)

  // DBに保存
  await db.insert(eventMemos).values({
    eventId: event.context.params.id,
    content: sanitizedContent,
    createdBy: event.context.user.id
  })
})
```

---

## §6 UI仕様

### 6.1 概要

セキュリティ機能は主にサーバーサイドで実装されるため、UI仕様は最小限。

### 6.2 レート制限エラー表示 [DETAIL]

```vue
<!-- components/common/RateLimitError.vue -->
<template>
  <UAlert
    v-if="show"
    icon="i-heroicons-exclamation-triangle"
    color="yellow"
    variant="soft"
    title="リクエスト制限に達しました"
    :description="`${retryAfter}秒後に再試行してください`"
  />
</template>

<script setup lang="ts">
interface Props {
  retryAfter?: number
}

const props = withDefaults(defineProps<Props>(), {
  retryAfter: 60
})

const show = ref(true)

// 自動非表示タイマー
onMounted(() => {
  setTimeout(() => {
    show.value = false
  }, props.retryAfter * 1000)
})
</script>
```

### 6.3 フロントエンドバリデーション（VeeValidate + Zod） [DETAIL]

```vue
<!-- components/features/events/CreateEventForm.vue -->
<template>
  <UForm :schema="createEventSchema" :state="state" @submit="onSubmit">
    <UFormGroup label="イベント名" name="title" required>
      <UInput v-model="state.title" />
    </UFormGroup>

    <UFormGroup label="説明" name="description">
      <UTextarea v-model="state.description" />
    </UFormGroup>

    <UFormGroup label="開始日時" name="startDate" required>
      <UInput v-model="state.startDate" type="datetime-local" />
    </UFormGroup>

    <UFormGroup label="終了日時" name="endDate" required>
      <UInput v-model="state.endDate" type="datetime-local" />
    </UFormGroup>

    <UButton type="submit">作成</UButton>
  </UForm>
</template>

<script setup lang="ts">
import { createEventSchema } from '~/server/api/v1/events/index.post'

const state = reactive({
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  organizationId: ''
})

async function onSubmit() {
  try {
    await $fetch('/api/v1/events', {
      method: 'POST',
      body: state
    })
    // 成功処理...
  } catch (error: any) {
    if (error.statusCode === 400) {
      // バリデーションエラー表示
      console.error('Validation errors:', error.data.errors)
    }
  }
}
</script>
```

---

## §7 ビジネスルール

### 7.1 セキュリティレベル [CORE]

| レベル | 対象 | 要件 |
|--------|------|------|
| 高 | 認証API、支払いAPI | CSRF + レート制限（厳格） + 監査ログ |
| 中 | データ変更API | CSRF + レート制限（標準） + バリデーション |
| 低 | 参照API | レート制限（緩和） + キャッシュ |

### 7.2 例外ルール [DETAIL]

- **開発環境**: HTTPS リダイレクトを無効化
- **ヘルスチェックエンドポイント**: `/api/health` はレート制限対象外
- **静的ファイル**: `/assets/*`, `/_nuxt/*` はCSRF対象外

---

## §8 非機能要件

### 8.1 パフォーマンス

| 項目 | 目標値 |
|------|--------|
| セキュリティミドルウェアのオーバーヘッド | < 10ms/request |
| レート制限チェック | < 5ms/request |
| バリデーション処理 | < 20ms/request |

### 8.2 可用性

- レート制限ストアの障害時はフェイルオープン（一時的に制限解除）
- セキュリティヘッダーの設定失敗は警告ログのみ（リクエストは継続）

### 8.3 監視

```typescript
// server/utils/monitoring/security-events.ts
export enum SecurityEventType {
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  CSRF_VIOLATION = 'csrf_violation',
  INVALID_ORIGIN = 'invalid_origin',
  VALIDATION_ERROR = 'validation_error',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt'
}

export function logSecurityEvent(
  type: SecurityEventType,
  metadata: Record<string, any>
) {
  // ログ記録 + アラート送信
  console.warn('[SECURITY]', type, metadata)

  // 重大度が高い場合は即座に通知
  if ([
    SecurityEventType.SQL_INJECTION_ATTEMPT,
    SecurityEventType.XSS_ATTEMPT
  ].includes(type)) {
    // Slackやメール通知
    // sendAlert(type, metadata)
  }
}
```

---

## §9 エラーハンドリング

### 9.1 エラーコード定義 [CONTRACT]

| エラーコード | HTTPステータス | メッセージ | 原因 |
|-------------|---------------|-----------|------|
| SEC_RATE_LIMIT | 429 | Rate limit exceeded | レート制限超過 |
| SEC_CSRF_INVALID | 403 | Invalid CSRF token | CSRFトークン不正 |
| SEC_ORIGIN_INVALID | 403 | Invalid origin | オリジン不正 |
| SEC_VALIDATION_ERROR | 400 | Validation failed | 入力バリデーション失敗 |
| SEC_CORS_DENIED | 403 | CORS policy violation | CORS違反 |

### 9.2 エラーレスポンス形式 [CONTRACT]

```typescript
// エラーレスポンス型
export interface SecurityErrorResponse {
  statusCode: number
  statusMessage: string
  message: string
  code: string
  details?: Record<string, any>
  timestamp: string
  path: string
}

// 例: レート制限エラー
{
  "statusCode": 429,
  "statusMessage": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "code": "SEC_RATE_LIMIT",
  "details": {
    "limit": 10,
    "remaining": 0,
    "resetAt": "2026-02-09T10:45:00Z"
  },
  "timestamp": "2026-02-09T10:44:23Z",
  "path": "/api/v1/ai/chat"
}
```

### 9.3 エラーハンドリング実装 [DETAIL]

```typescript
// server/middleware/error-handler.ts
export default defineEventHandler((event) => {
  event.node.res.on('finish', () => {
    const statusCode = event.node.res.statusCode

    // セキュリティ関連エラーをログ記録
    if ([400, 403, 429].includes(statusCode)) {
      logSecurityEvent(SecurityEventType.VALIDATION_ERROR, {
        statusCode,
        path: event.node.req.url,
        ip: getHeader(event, 'x-forwarded-for'),
        userAgent: getHeader(event, 'user-agent')
      })
    }
  })
})
```

---

## §10 テストケース

### 10.1 SEC-001: CSRF対策テスト

| テストID | テスト内容 | 期待結果 |
|---------|-----------|----------|
| TC-SEC-001-01 | 正当なOriginヘッダーでPOSTリクエスト | 200 OK |
| TC-SEC-001-02 | 不正なOriginヘッダーでPOSTリクエスト | 403 Forbidden |
| TC-SEC-001-03 | OriginヘッダーなしでPOSTリクエスト | Refererチェック実行 |
| TC-SEC-001-04 | GETリクエスト（CSRFチェック対象外） | 200 OK |

```typescript
// tests/integration/security/csrf.test.ts
import { describe, it, expect } from 'vitest'
import { createFetch } from 'ofetch'

describe('CSRF Protection', () => {
  const fetch = createFetch({
    baseURL: 'http://localhost:3000'
  })

  it('should allow POST with valid origin', async () => {
    const response = await fetch('/api/v1/events', {
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json'
      },
      body: { /* valid data */ }
    })
    expect(response).toBeDefined()
  })

  it('should reject POST with invalid origin', async () => {
    await expect(
      fetch('/api/v1/events', {
        method: 'POST',
        headers: {
          'Origin': 'https://evil.com',
          'Content-Type': 'application/json'
        },
        body: { /* data */ }
      })
    ).rejects.toThrow(/403/)
  })
})
```

### 10.2 SEC-003: レート制限テスト

| テストID | テスト内容 | 期待結果 |
|---------|-----------|----------|
| TC-SEC-003-01 | 制限内リクエスト（9/10） | 200 OK, X-RateLimit-Remaining: 1 |
| TC-SEC-003-02 | 制限超過リクエスト（11/10） | 429 Too Many Requests |
| TC-SEC-003-03 | 異なるIPアドレスから同時リクエスト | 両方とも成功（独立カウント） |
| TC-SEC-003-04 | 認証済みユーザーの制限 | ユーザーIDベースでカウント |

```typescript
// tests/integration/security/rate-limit.test.ts
describe('Rate Limiting', () => {
  it('should enforce rate limit on /api/auth/*', async () => {
    const requests = Array.from({ length: 11 }, (_, i) =>
      fetch('/api/auth/login', {
        method: 'POST',
        body: { email: 'test@example.com', password: 'password' }
      }).catch(e => e)
    )

    const results = await Promise.all(requests)
    const rateLimitErrors = results.filter(r => r.statusCode === 429)

    expect(rateLimitErrors.length).toBeGreaterThan(0)
  })
})
```

### 10.3 SEC-004: 入力バリデーションテスト

| テストID | テスト内容 | 期待結果 |
|---------|-----------|----------|
| TC-SEC-004-01 | 正常な入力データ | 200 OK |
| TC-SEC-004-02 | 必須フィールド欠落 | 400 Bad Request, エラー詳細あり |
| TC-SEC-004-03 | 型不一致（文字列→数値） | 400 Bad Request |
| TC-SEC-004-04 | 長さ制限超過 | 400 Bad Request |
| TC-SEC-004-05 | 不正なフォーマット（メール） | 400 Bad Request |

```typescript
// tests/integration/security/validation.test.ts
describe('Input Validation', () => {
  it('should reject invalid email format', async () => {
    await expect(
      fetch('/api/auth/signup', {
        method: 'POST',
        body: {
          email: 'invalid-email',
          password: 'Password123!',
          name: 'Test User'
        }
      })
    ).rejects.toThrow(/400/)
  })

  it('should return field-level errors', async () => {
    try {
      await fetch('/api/v1/events', {
        method: 'POST',
        body: {
          title: '', // empty
          startDate: 'invalid-date'
        }
      })
    } catch (error: any) {
      expect(error.data.errors).toHaveProperty('title')
      expect(error.data.errors).toHaveProperty('startDate')
    }
  })
})
```

### 10.4 SEC-005: SQLインジェクション対策テスト

| テストID | テスト内容 | 期待結果 |
|---------|-----------|----------|
| TC-SEC-005-01 | 通常のクエリ（正常系） | データ取得成功 |
| TC-SEC-005-02 | SQLインジェクション試行（`' OR '1'='1`） | バリデーションエラーまたは結果0件 |
| TC-SEC-005-03 | UNION攻撃試行 | バリデーションエラー |
| TC-SEC-005-04 | コメント記号（`--`, `/* */`）を含む入力 | エスケープされて正常処理 |

```typescript
// tests/integration/security/sql-injection.test.ts
describe('SQL Injection Protection', () => {
  it('should not be vulnerable to SQL injection in search', async () => {
    const maliciousInput = "' OR '1'='1' --"

    const response = await fetch('/api/v1/events/search', {
      method: 'GET',
      query: { q: maliciousInput }
    })

    // Drizzle ORMが自動的にエスケープするため、エラーまたは空結果
    expect([200, 400]).toContain(response.status)
    if (response.status === 200) {
      const data = await response.json()
      expect(data.results).toEqual([])
    }
  })
})
```

### 10.5 SEC-006: XSS対策テスト

| テストID | テスト内容 | 期待結果 |
|---------|-----------|----------|
| TC-SEC-006-01 | 通常のテキスト入力 | そのまま表示 |
| TC-SEC-006-02 | `<script>alert('XSS')</script>` 入力 | タグが無害化される |
| TC-SEC-006-03 | `<img src=x onerror=alert(1)>` 入力 | タグが無害化される |
| TC-SEC-006-04 | リッチテキストの許可タグ（`<strong>`） | 正常に表示 |
| TC-SEC-006-05 | セキュリティヘッダーの存在確認 | `X-Content-Type-Options: nosniff` あり |

```typescript
// tests/integration/security/xss.test.ts
describe('XSS Protection', () => {
  it('should sanitize HTML in rich text input', async () => {
    const maliciousInput = '<script>alert("XSS")</script><p>Safe content</p>'

    const response = await fetch('/api/v1/events/123/memo', {
      method: 'POST',
      body: { content: maliciousInput }
    })

    const saved = await fetch('/api/v1/events/123/memo').then(r => r.json())

    expect(saved.content).not.toContain('<script>')
    expect(saved.content).toContain('<p>Safe content</p>')
  })

  it('should include security headers', async () => {
    const response = await fetch('/api/v1/events')

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
  })
})
```

### 10.6 E2Eセキュリティテスト

```typescript
// tests/e2e/security.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Security E2E', () => {
  test('should enforce HTTPS redirect in production', async ({ page }) => {
    // 本番環境でのみ実行
    if (process.env.NODE_ENV !== 'production') {
      test.skip()
    }

    await page.goto('http://haishin-plus-hub.com')

    // HTTPSにリダイレクトされることを確認
    expect(page.url()).toMatch(/^https:/)
  })

  test('should show rate limit error after too many requests', async ({ page }) => {
    await page.goto('/login')

    // 連続してログイン試行
    for (let i = 0; i < 12; i++) {
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', 'wrong-password')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(100)
    }

    // レート制限エラーが表示されることを確認
    await expect(page.locator('text=リクエスト制限に達しました')).toBeVisible()
  })
})
```

---

## §11 依存関係

### 11.1 前提条件

| 依存先 | 依存内容 | 参照 |
|--------|----------|------|
| AUTH-001 | Better Auth セッション管理 | SSOT-5_CROSS_CUTTING.md |
| INFRA-001 | PostgreSQL データベース | ADR-001_TECH_STACK.md |
| INFRA-002 | Nginx リバースプロキシ | （未作成） |

### 11.2 影響範囲

| 影響先 | 影響内容 |
|--------|----------|
| 全API | セキュリティミドルウェア適用 |
| 全フォーム | バリデーション適用 |
| 全ページ | セキュリティヘッダー適用 |

### 11.3 外部依存

```json
// package.json 抜粋
{
  "dependencies": {
    "rate-limiter-flexible": "^5.0.0",
    "isomorphic-dompurify": "^2.9.0",
    "zod": "^3.22.4"
  }
}
```

---

## §12 未決定事項

| 項目ID | 項目 | 選択肢 | 期限 | 決定者 |
|--------|------|--------|------|--------|
| SEC-TBD-01 | レート制限ストア | (1) インメモリ (2) Redis | MVP前 | Tech Lead |
| SEC-TBD-02 | CSP の strictness | (1) 緩和（unsafe-inline許可） (2) 厳格（nonce使用） | MVP後 | Tech Lead |
| SEC-TBD-03 | WAF導入 | (1) Cloudflare (2) AWS WAF (3) なし | MVP後 | CTO |
| SEC-TBD-04 | セキュリティ監査 | (1) 外部監査実施 (2) 自動ツールのみ | 正式リリース前 | CTO |
| SEC-TBD-05 | HSTS プリロード | (1) 申請する (2) 見送り | 正式リリース後 | Tech Lead |

---

## 付録A: Nginx HTTPS設定例

```nginx
# /etc/nginx/sites-available/haishin-plus-hub
server {
    listen 80;
    server_name haishin-plus-hub.com www.haishin-plus-hub.com;

    # HTTPからHTTPSへリダイレクト
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name haishin-plus-hub.com www.haishin-plus-hub.com;

    # Let's Encrypt証明書
    ssl_certificate /etc/letsencrypt/live/haishin-plus-hub.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/haishin-plus-hub.com/privkey.pem;

    # SSL設定（Mozilla Intermediate推奨）
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # セキュリティヘッダー（Nuxtでも設定するが念のため）
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Nuxt Nitro サーバーへプロキシ
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 付録B: セキュリティチェックリスト（実装時）

- [ ] CSRF対策: Better Auth の SameSite=Lax 設定確認
- [ ] CORS設定: 本番環境の許可オリジン設定確認
- [ ] レート制限: 全エンドポイントの制限値設定確認
- [ ] 入力バリデーション: Zodスキーマの定義と適用確認
- [ ] SQLインジェクション: 生SQL文字列連結がないことを確認
- [ ] XSS対策: `v-html` 使用箇所にDOMPurify適用確認
- [ ] HTTPSリダイレクト: Nginx設定確認
- [ ] セキュリティヘッダー: レスポンスヘッダー確認
- [ ] エラーハンドリング: セキュリティエラーのログ記録確認
- [ ] テストカバレッジ: セキュリティテスト実行確認

---

**ドキュメント終了**
