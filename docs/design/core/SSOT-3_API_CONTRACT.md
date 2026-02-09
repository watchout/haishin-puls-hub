# SSOT-3: API規約（API Contract）

> 全エンドポイントの仕様・リクエスト/レスポンス形式・エラー設計を管理する

---

## 基本情報

| 項目 | 内容 |
|------|------|
| フレームワーク | Nitro (Nuxt 3 Server) |
| API スタイル | REST (JSON) |
| ベースパス | `/api` |
| 認証方式 | Better Auth Session Cookie |
| 作成日 | 2026-02-06 |
| ステータス | Draft |

---

## 1. 共通規約

### 1.1 URL設計ルール

```
/api/{version}/{resource}/{id?}/{sub-resource?}

例:
  GET    /api/v1/events              → イベント一覧
  POST   /api/v1/events              → イベント作成
  GET    /api/v1/events/:id          → イベント詳細
  PATCH  /api/v1/events/:id          → イベント更新
  DELETE /api/v1/events/:id          → イベント削除（論理削除）
  GET    /api/v1/events/:id/tasks    → イベント配下タスク一覧

  POST   /api/v1/ai/chat             → AI チャット
  POST   /api/v1/ai/generate         → AI 生成（企画書・見積り等）
```

**命名規則:**
- リソース名は複数形の英語小文字（`events`, `tasks`, `venues`）
- ケバブケース（`streaming-packages`）
- ネストは最大2階層まで

### 1.2 バージョニング

```
/api/v1/...    ← MVP〜v1.x
/api/v2/...    ← 破壊的変更がある場合のみ
```

- マイナー変更（フィールド追加等）はバージョンを上げない
- 削除・型変更は v2 へ
- ヘッダによるバージョニングは使わない（URLで明示）

---

### 1.3 認証・認可ヘッダ

```http
Cookie: better-auth.session_token=<session_token>
X-Tenant-Id: <tenant_id>    ← マルチテナント時、操作対象テナントの指定
```

- 認証は Better Auth のセッション Cookie を使用
- `X-Tenant-Id` はユーザーが複数テナントに所属する場合に必須
- テナント未指定時はデフォルトテナントを使用

### 1.4 共通リクエストヘッダ

| ヘッダ | 必須 | 説明 |
|-------|------|------|
| `Content-Type` | 条件 | POST/PATCH 時: `application/json` |
| `Accept` | NO | `application/json`（デフォルト） |
| `X-Tenant-Id` | 条件 | 複数テナント所属時 |
| `Accept-Language` | NO | `ja`（デフォルト） |

---

### 1.5 共通レスポンス形式

#### 成功（単一リソース）

```json
{
  "data": {
    "id": "01HXYZ...",
    "title": "AI活用セミナー",
    "status": "draft",
    "created_at": "2026-02-06T10:00:00+09:00",
    "updated_at": "2026-02-06T10:00:00+09:00"
  }
}
```

#### 成功（リスト）

```json
{
  "data": [
    { "id": "01HXYZ...", "title": "..." },
    { "id": "01HABC...", "title": "..." }
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "per_page": 20,
    "total_pages": 3
  }
}
```

#### 成功（操作系 — 副作用あり）

```json
{
  "data": null,
  "message": "タスクを完了しました"
}
```

### 1.6 ページネーション

```
?page=1&per_page=20    ← オフセットベース（デフォルト）
?cursor=01HXYZ...      ← カーソルベース（大量データ・リアルタイム用）
```

| パラメータ | デフォルト | 最大 | 説明 |
|-----------|----------|------|------|
| `page` | 1 | - | ページ番号 |
| `per_page` | 20 | 100 | 1ページあたりの件数 |
| `cursor` | - | - | カーソル位置（ULID） |

### 1.7 ソート・フィルタ

```
?sort=start_at&order=desc           ← ソート
?status=draft,planning              ← カンマ区切りで OR 検索
?start_at_gte=2026-03-01            ← 日付範囲（_gte, _lte, _gt, _lt）
?q=AI活用                            ← フリーテキスト検索
```

---

### 1.8 エラーレスポンス形式

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に問題があります",
    "details": [
      {
        "field": "title",
        "message": "タイトルは必須です",
        "code": "required"
      },
      {
        "field": "start_at",
        "message": "開始日時は未来の日時を指定してください",
        "code": "future_date"
      }
    ]
  }
}
```

### 1.9 エラーコード一覧

| HTTP Status | error.code | 説明 |
|------------|------------|------|
| 400 | `VALIDATION_ERROR` | バリデーションエラー（details 配列あり） |
| 400 | `BAD_REQUEST` | 不正なリクエスト |
| 401 | `UNAUTHORIZED` | 未認証 |
| 403 | `FORBIDDEN` | 権限不足 |
| 403 | `TENANT_ACCESS_DENIED` | テナントへのアクセス権なし |
| 404 | `NOT_FOUND` | リソースが見つからない |
| 409 | `CONFLICT` | 競合（重複、状態不整合） |
| 422 | `UNPROCESSABLE_ENTITY` | 処理不能（ビジネスルール違反） |
| 429 | `RATE_LIMITED` | レート制限超過 |
| 500 | `INTERNAL_ERROR` | サーバー内部エラー |
| 503 | `SERVICE_UNAVAILABLE` | サービス一時停止 |
| 503 | `AI_SERVICE_UNAVAILABLE` | AI プロバイダー接続エラー |

---

## 2. エンドポイント一覧

### 2.1 認証（Auth）— Better Auth 管理

> Better Auth のエンドポイント。カスタマイズは最小限

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| POST | `/api/auth/sign-up/email` | メール登録 | 不要 |
| POST | `/api/auth/sign-in/email` | メールログイン | 不要 |
| POST | `/api/auth/sign-out` | ログアウト | 要 |
| GET | `/api/auth/session` | セッション取得 | 要 |
| POST | `/api/auth/forgot-password` | パスワードリセット要求 | 不要 |
| POST | `/api/auth/reset-password` | パスワードリセット実行 | 不要 |
| POST | `/api/auth/verify-email` | メール認証 | 不要 |

### 2.2 テナント管理（Tenant）

| Method | Path | 説明 | 認証 | 権限 |
|--------|------|------|------|------|
| GET | `/api/v1/tenants` | 所属テナント一覧 | 要 | 全ロール |
| POST | `/api/v1/tenants` | テナント作成 | 要 | system_admin |
| GET | `/api/v1/tenants/:id` | テナント詳細 | 要 | tenant_admin |
| PATCH | `/api/v1/tenants/:id` | テナント更新 | 要 | tenant_admin |
| POST | `/api/v1/tenants/:id/invite` | メンバー招待 | 要 | tenant_admin |
| GET | `/api/v1/tenants/:id/members` | メンバー一覧 | 要 | tenant_admin |
| PATCH | `/api/v1/tenants/:id/members/:uid` | メンバーロール変更 | 要 | tenant_admin |
| DELETE | `/api/v1/tenants/:id/members/:uid` | メンバー削除 | 要 | tenant_admin |

### 2.3 会場管理（Venue）

| Method | Path | 説明 | 認証 | 権限 |
|--------|------|------|------|------|
| GET | `/api/v1/venues` | 会場一覧 | 要 | 全ロール |
| POST | `/api/v1/venues` | 会場登録 | 要 | tenant_admin, venue_staff |
| GET | `/api/v1/venues/:id` | 会場詳細 | 要 | 全ロール |
| PATCH | `/api/v1/venues/:id` | 会場更新 | 要 | tenant_admin, venue_staff |
| DELETE | `/api/v1/venues/:id` | 会場削除（論理） | 要 | tenant_admin |
| GET | `/api/v1/venues/:id/availability` | 空き状況照会 | 要 | 全ロール |

### 2.4 イベント管理（Event）

| Method | Path | 説明 | 認証 | 権限 |
|--------|------|------|------|------|
| GET | `/api/v1/events` | イベント一覧 | 要 | 全ロール（ロール別フィルタ） |
| POST | `/api/v1/events` | イベント作成 | 要 | organizer, event_planner |
| GET | `/api/v1/events/:id` | イベント詳細 | 要 | event_member |
| PATCH | `/api/v1/events/:id` | イベント更新 | 要 | organizer, event_planner |
| DELETE | `/api/v1/events/:id` | イベント削除（論理） | 要 | organizer |
| POST | `/api/v1/events/:id/status` | ステータス変更 | 要 | organizer |
| GET | `/api/v1/events/:id/members` | 関係者一覧 | 要 | event_member |
| POST | `/api/v1/events/:id/members` | 関係者追加 | 要 | organizer, event_planner |
| DELETE | `/api/v1/events/:id/members/:uid` | 関係者削除 | 要 | organizer |
| GET | `/api/v1/events/:id/dashboard` | ダッシュボード集計 | 要 | event_member |

### 2.5 タスク管理（Task）

| Method | Path | 説明 | 認証 | 権限 |
|--------|------|------|------|------|
| GET | `/api/v1/events/:eid/tasks` | タスク一覧 | 要 | event_member |
| POST | `/api/v1/events/:eid/tasks` | タスク作成 | 要 | organizer, event_planner |
| PATCH | `/api/v1/tasks/:id` | タスク更新 | 要 | assigned_user or organizer |
| POST | `/api/v1/tasks/:id/complete` | タスク完了 | 要 | assigned_user |
| DELETE | `/api/v1/tasks/:id` | タスク削除 | 要 | organizer |
| POST | `/api/v1/events/:eid/tasks/generate` | AI タスク自動生成 | 要 | organizer, event_planner |

### 2.6 登壇者管理（Speaker）

| Method | Path | 説明 | 認証 | 権限 |
|--------|------|------|------|------|
| GET | `/api/v1/events/:eid/speakers` | 登壇者一覧 | 要 | event_member |
| POST | `/api/v1/events/:eid/speakers` | 登壇者追加 | 要 | organizer, event_planner |
| PATCH | `/api/v1/speakers/:id` | 登壇者更新 | 要 | organizer, speaker(自分) |
| DELETE | `/api/v1/speakers/:id` | 登壇者削除 | 要 | organizer |
| POST | `/api/v1/speakers/:id/materials` | 資料アップロード | 要 | speaker |

### 2.7 参加者管理（Participant）

| Method | Path | 説明 | 認証 | 権限 |
|--------|------|------|------|------|
| GET | `/api/v1/events/:eid/participants` | 参加者一覧 | 要 | event_member |
| POST | `/api/v1/events/:eid/participants` | 参加者登録 | 要 | organizer, sales_marketing |
| PATCH | `/api/v1/participants/:id` | 参加者更新 | 要 | organizer |
| DELETE | `/api/v1/participants/:id` | 参加者削除 | 要 | organizer |
| POST | `/api/v1/events/:eid/participants/import` | CSV一括インポート | 要 | organizer |
| GET | `/api/v1/events/:eid/participants/export` | CSV一括エクスポート | 要 | organizer, sales_marketing |

### 2.8 チェックイン（Checkin）

| Method | Path | 説明 | 認証 | 権限 |
|--------|------|------|------|------|
| POST | `/api/v1/events/:eid/checkins` | チェックイン実行 | 要 | venue_staff, organizer |
| POST | `/api/v1/events/:eid/checkins/qr` | QRチェックイン | 要 | venue_staff |
| GET | `/api/v1/events/:eid/checkins` | チェックイン履歴 | 要 | event_member |
| GET | `/api/v1/events/:eid/checkins/stats` | リアルタイム集計 | 要 | event_member |

### 2.9 見積り（Estimate）

| Method | Path | 説明 | 認証 | 権限 |
|--------|------|------|------|------|
| GET | `/api/v1/estimates` | 見積り一覧 | 要 | organizer, streaming_provider |
| POST | `/api/v1/estimates` | 見積り作成 | 要 | organizer, streaming_provider |
| GET | `/api/v1/estimates/:id` | 見積り詳細 | 要 | 関係者 |
| PATCH | `/api/v1/estimates/:id` | 見積り更新 | 要 | 作成者 |
| POST | `/api/v1/estimates/generate` | AI見積り生成 | 要 | organizer |

### 2.10 アンケート（Survey）

| Method | Path | 説明 | 認証 | 権限 |
|--------|------|------|------|------|
| POST | `/api/v1/events/:eid/surveys` | アンケート作成 | 要 | organizer |
| GET | `/api/v1/events/:eid/surveys` | アンケート一覧 | 要 | event_member |
| GET | `/api/v1/surveys/:id` | アンケート詳細 | 要 | event_member |
| POST | `/api/v1/surveys/:id/responses` | 回答送信 | 条件 | participant |
| GET | `/api/v1/surveys/:id/responses` | 回答一覧 | 要 | organizer |
| GET | `/api/v1/surveys/:id/stats` | 回答集計 | 要 | event_member |

### 2.11 配信パッケージ（Streaming Package）

| Method | Path | 説明 | 認証 | 権限 |
|--------|------|------|------|------|
| GET | `/api/v1/streaming-packages` | パッケージ一覧 | 要 | 全ロール |
| POST | `/api/v1/streaming-packages` | パッケージ作成 | 要 | tenant_admin, streaming_provider |
| PATCH | `/api/v1/streaming-packages/:id` | パッケージ更新 | 要 | tenant_admin, streaming_provider |

### 2.12 レポート（Report）

| Method | Path | 説明 | 認証 | 権限 |
|--------|------|------|------|------|
| GET | `/api/v1/events/:eid/reports` | レポート一覧 | 要 | event_member |
| POST | `/api/v1/events/:eid/reports/generate` | AIレポート生成 | 要 | organizer, sales_marketing |
| GET | `/api/v1/reports/:id` | レポート詳細 | 要 | event_member |
| PATCH | `/api/v1/reports/:id` | レポート編集 | 要 | organizer |

### 2.13 通知（Notification）

| Method | Path | 説明 | 認証 | 権限 |
|--------|------|------|------|------|
| GET | `/api/v1/notifications` | 通知一覧 | 要 | 全ロール（自分宛のみ） |
| PATCH | `/api/v1/notifications/:id/read` | 既読マーク | 要 | 全ロール（自分宛のみ） |
| POST | `/api/v1/notifications/read-all` | 全既読 | 要 | 全ロール |
| GET | `/api/v1/notifications/unread-count` | 未読件数 | 要 | 全ロール |

### 2.14 AI アシスタント（AI）

| Method | Path | 説明 | 認証 | 権限 |
|--------|------|------|------|------|
| POST | `/api/v1/ai/chat` | チャット（ストリーミング） | 要 | 全ロール |
| POST | `/api/v1/ai/generate/proposal` | 企画書生成 | 要 | organizer, event_planner |
| POST | `/api/v1/ai/generate/estimate` | 見積り生成 | 要 | organizer, streaming_provider |
| POST | `/api/v1/ai/generate/email` | メール文生成 | 要 | 全ロール |
| POST | `/api/v1/ai/generate/report` | レポート生成 | 要 | organizer, sales_marketing |
| POST | `/api/v1/ai/generate/bio` | 登壇者紹介文生成 | 要 | organizer, speaker |
| POST | `/api/v1/ai/generate/tasks` | タスク自動生成 | 要 | organizer, event_planner |
| GET | `/api/v1/ai/conversations` | 会話履歴一覧 | 要 | 全ロール（自分のみ） |

### 2.15 ファイル（File）

| Method | Path | 説明 | 認証 | 権限 |
|--------|------|------|------|------|
| POST | `/api/v1/files/upload` | ファイルアップロード | 要 | 全ロール |
| GET | `/api/v1/files/:id` | ファイルダウンロード | 要 | 関係者 |
| DELETE | `/api/v1/files/:id` | ファイル削除 | 要 | アップロード者 |

### 2.16 参加者ポータル（Public）

> 認証不要。portal_slug ベースでアクセス

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| GET | `/api/v1/portal/:slug` | ポータルページデータ | 不要 |
| POST | `/api/v1/portal/:slug/register` | 参加登録 | 不要 |
| GET | `/api/v1/portal/:slug/speakers` | 登壇者一覧 | 不要 |
| GET | `/api/v1/portal/:slug/schedule` | タイムテーブル | 不要 |

---

## 3. AI チャット ストリーミング仕様

### リクエスト

```json
POST /api/v1/ai/chat
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "100人規模のAIセミナーを企画したいです" }
  ],
  "context": {
    "event_id": "01HXYZ...",
    "usecase": "planning"
  }
}
```

### レスポンス（Server-Sent Events）

```
Content-Type: text/event-stream

data: {"type":"text","content":"100人規模"}
data: {"type":"text","content":"のAIセミナーの企画について"}
data: {"type":"tool_call","name":"create_event_draft","args":{...}}
data: {"type":"tool_result","name":"create_event_draft","result":{...}}
data: {"type":"text","content":"以下のような企画案を作成しました。"}
data: {"type":"done","usage":{"input_tokens":150,"output_tokens":420}}
```

---

## 4. レート制限

| エンドポイント | 制限 | ウィンドウ |
|--------------|------|----------|
| `/api/auth/*` | 10回 | 1分 |
| `/api/v1/ai/*` | 20回 | 1分 |
| `/api/v1/*`（その他） | 100回 | 1分 |
| `/api/v1/files/upload` | 10回 | 1分 |

レート超過時は `429 RATE_LIMITED` を返す。

---

## 5. 日付・時刻形式

```
- 全て ISO 8601 形式 (UTC オフセット付き)
- 例: "2026-03-15T14:00:00+09:00"
- レスポンスは常に UTC: "2026-03-15T05:00:00Z"
- リクエストはタイムゾーン付きを推奨
```

---

## 変更履歴

| 日付 | 変更内容 | 変更者 |
|------|---------|-------|
| 2026-02-06 | 初版作成（16カテゴリ・80+エンドポイント） | AI |
