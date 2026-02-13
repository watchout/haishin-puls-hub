# LIST-001-003: リスト操作（ページネーション・ソート・フィルタ）

**機能ID**: LIST-001（ページネーション）, LIST-002（ソート）, LIST-003（フィルタ）
**機能名**: リスト操作統合仕様
**ステータス**: Draft
**作成日**: 2026-02-09
**最終更新**: 2026-02-09
**関連SSOT**: SSOT-2_UI_STATE.md, SSOT-3_API_CONTRACT.md, SSOT-4_DATA_MODEL.md
**優先度**: MUST（MVP必須）

---

## §1 概要 [CORE]

### 1.1 機能概要
大量データ（イベント、タスク、参加者、会場、通知等）を効率的に表示・検索・フィルタリングするための統合リスト操作機能。ページネーション・ソート・フィルタを一貫したAPI設計とUI実装パターンで提供する。

### 1.2 適用範囲
以下のリソースに横断的に適用:
- イベント一覧
- タスク一覧
- 参加者一覧
- 会場一覧
- 通知一覧
- ファイル一覧
- AIチャット履歴

### 1.3 技術スタック
- **フロントエンド**: Nuxt 3, Vue 3, Nuxt UI v3, Pinia
- **バックエンド**: Nitro Server, Drizzle ORM, PostgreSQL 16
- **API設計**: RESTful, Query Parameter方式, URL State Sync

---

## §2 目的 [CORE]

### 2.1 ビジネス目的
- **データ可視性**: 大量データを効率的に表示し、必要な情報に素早くアクセス
- **操作性向上**: 直感的なソート・フィルタでユーザーの作業効率を向上
- **パフォーマンス**: データベース負荷を抑えつつ高速なレスポンスを実現

### 2.2 ユーザー価値
- **主催者**: 多数のイベント・タスクから目的のものを素早く発見
- **配信業者**: 担当案件を絞り込んで効率的に管理
- **参加者**: イベント履歴を検索・フィルタして確認

---

## §3 機能要件 [CORE]

### 3.1 LIST-001: ページネーション

#### FR-001: オフセットベースページネーション [MUST]
**要件**: `?page=1&per_page=20` 形式のクエリパラメータでページネーション実装

**動作**:
- `page`: ページ番号（1-indexed）
- `per_page`: 1ページあたりの件数（デフォルト: 20、最大: 100）
- レスポンスに `pagination` オブジェクトを含める

**適用対象**: イベント、タスク、参加者、会場、通知一覧

#### FR-002: カーソルベースページネーション [SHOULD]
**要件**: リアルタイム性が高いデータ（通知、チャット履歴）は `?cursor=01HXYZ...` 方式

**動作**:
- `cursor`: 次のデータセットを取得する位置（ULID or ISO8601）
- `limit`: 取得件数（デフォルト: 20、最大: 100）
- レスポンスに `next_cursor` を含める

**適用対象**: 通知一覧、AIチャット履歴

### 3.2 LIST-002: ソート

#### FR-003: 単一カラムソート [MUST]
**要件**: `?sort=start_at&order=desc` 形式でソート実装

**動作**:
- `sort`: ソート対象カラム（例: `start_at`, `created_at`, `name`）
- `order`: ソート順（`asc` or `desc`、デフォルト: `desc`）
- 未指定時: `created_at desc`

**ソート可能カラム**:
- 共通: `created_at`, `updated_at`
- イベント: `start_at`, `end_at`, `name`
- タスク: `due_date`, `priority`, `status`
- 参加者: `registered_at`, `name`

### 3.3 LIST-003: フィルタ

#### FR-004: 複数値フィルタ（OR条件） [MUST]
**要件**: カンマ区切りで複数値を指定（OR条件）

**例**:
```
?status=draft,planning  ← status が draft または planning
?role=host,speaker      ← role が host または speaker
```

#### FR-005: 範囲フィルタ [MUST]
**要件**: `_gte`, `_lte`, `_gt`, `_lt` サフィックスで範囲指定

**例**:
```
?start_at_gte=2026-03-01         ← 2026-03-01 以降
?start_at_lte=2026-03-31         ← 2026-03-31 以前
?participants_count_gte=10       ← 参加者10名以上
```

#### FR-006: フリーテキスト検索 [MUST]
**要件**: `?q=keyword` で複数カラムを横断検索

**動作**:
- `q`: 検索キーワード
- 検索対象: `name`, `description`, `tags` 等（リソース毎に定義）
- 部分一致検索（`ILIKE '%keyword%'`）

**例**:
```
?q=AI活用セミナー  ← name, description, tags から検索
```

#### FR-007: フィルタ状態のURL同期 [MUST]
**要件**: フィルタ・ソート・ページ状態をURLクエリに同期

**動作**:
- URLを共有すると同じフィルタ状態を再現
- ブラウザバック/フォワードでフィルタ状態が復元
- `useRoute()` / `useRouter()` でURL State管理

#### FR-008: 結果0件時の表示 [MUST]
**要件**: フィルタ結果が0件の場合、Empty Stateを表示

**表示内容**:
- アイコン（検索アイコン）
- メッセージ: 「条件に一致する結果が見つかりませんでした」
- アクション: 「フィルタをクリア」ボタン

#### FR-009: ローディングスケルトン [MUST]
**要件**: データ取得中はスケルトンUIを表示

**動作**:
- 初回ロード: テーブル全体のスケルトン
- ページ切り替え: テーブル行のみスケルトン
- フィルタ変更: テーブル行のみスケルトン

---

### §3-E. 入出力例 [CONTRACT]

> AUTH-001 Gold Standard 準拠: リスト操作の主要I/Oパターンを網羅

#### IO-1: ページネーション（デフォルト）

**リクエスト**:
```
GET /api/v1/events?page=1&per_page=20
```

**レスポンス** (200):
```json
{
  "data": [
    {
      "id": "01HXYZ...",
      "name": "AI活用セミナー2026春",
      "status": "planning",
      "start_at": "2026-03-15T10:00:00Z",
      "participants_count": 25
    }
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "per_page": 20,
    "total_pages": 3
  }
}
```

#### IO-2: ソート（降順）

**リクエスト**:
```
GET /api/v1/events?sort=start_at&order=desc
```

**レスポンス** (200):
```json
{
  "data": [
    {
      "id": "01HXYZ...",
      "name": "DX推進講座2026夏",
      "status": "draft",
      "start_at": "2026-06-20T14:00:00Z",
      "participants_count": 0
    },
    {
      "id": "01HABC...",
      "name": "AI活用セミナー2026春",
      "status": "planning",
      "start_at": "2026-03-15T10:00:00Z",
      "participants_count": 25
    }
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "per_page": 20,
    "total_pages": 3
  }
}
```

#### IO-3: フィルタ（ステータス指定）

**リクエスト**:
```
GET /api/v1/events?status=active
```

**レスポンス** (200):
```json
{
  "data": [
    {
      "id": "01HXYZ...",
      "name": "開催中イベント",
      "status": "active",
      "start_at": "2026-02-09T10:00:00Z",
      "participants_count": 100
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "per_page": 20,
    "total_pages": 1
  }
}
```

#### IO-4: 複合条件（ソート + フィルタ + ページネーション）

**リクエスト**:
```
GET /api/v1/events?page=2&per_page=10&sort=name&order=asc&status=draft
```

**レスポンス** (200):
```json
{
  "data": [
    {
      "id": "01HDEF...",
      "name": "マーケティング講座",
      "status": "draft",
      "start_at": "2026-04-10T13:00:00Z",
      "participants_count": 0
    }
  ],
  "pagination": {
    "total": 15,
    "page": 2,
    "per_page": 10,
    "total_pages": 2
  }
}
```

#### IO-5: カーソルベースページネーション（通知）

**初回リクエスト**:
```
GET /api/v1/notifications?cursor=01HXYZ&limit=20
```

**レスポンス** (200):
```json
{
  "data": [
    {
      "id": "01HABCD...",
      "type": "task_assigned",
      "message": "新しいタスクが割り当てられました",
      "created_at": "2026-02-09T10:00:00Z"
    }
  ],
  "next_cursor": "01HXYZABC...",
  "has_more": true
}
```

#### IO-6: 空結果

**リクエスト**:
```
GET /api/v1/events?status=nonexistent
```

**レスポンス** (200):
```json
{
  "data": [],
  "pagination": {
    "total": 0,
    "page": 1,
    "per_page": 20,
    "total_pages": 0
  }
}
```

#### IO-7: フリーテキスト検索 + 範囲フィルタ

**リクエスト**:
```
GET /api/v1/events?q=AI&start_at_gte=2026-03-01&start_at_lte=2026-06-30&sort=start_at&order=asc
```

**レスポンス** (200):
```json
{
  "data": [
    {
      "id": "01HABC...",
      "name": "AI活用セミナー2026春",
      "status": "planning",
      "start_at": "2026-03-15T10:00:00Z",
      "participants_count": 25
    },
    {
      "id": "01HDEF...",
      "name": "AI最新動向講座",
      "status": "draft",
      "start_at": "2026-05-20T14:00:00Z",
      "participants_count": 0
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "per_page": 20,
    "total_pages": 1
  }
}
```

---

### §3-F. 境界値 [CONTRACT]

> パラメータの境界値とエッジケースの定義

| パラメータ | 最小値 | 最大値 | デフォルト | 不正値の挙動 |
|-----------|--------|--------|-----------|-------------|
| `page` | 1 | なし（total_pages まで） | 1 | 0以下 → 400 `INVALID_PAGE` |
| `per_page` | 1 | 100 | 20 | 0以下 → 400 `INVALID_PER_PAGE`、101以上 → 400 `INVALID_PER_PAGE` |
| `sort` | - | - | `created_at` | 許可カラムリスト外 → 400 `INVALID_SORT` |
| `order` | - | - | `desc` | `asc` / `desc` 以外 → 400 `INVALID_ORDER` |
| `cursor` | - | - | なし | 不正形式 → 400 `INVALID_CURSOR` |
| `limit`（カーソル方式） | 1 | 100 | 20 | 0以下 → 400、101以上 → 400 |
| `q`（検索） | - | 200文字 | なし | 空文字 → フィルタ無視（全件返却） |

**エッジケース**:
- `page` が `total_pages` を超える場合: 200 + 空配列（`items: [], total: N`）
- フィルタ値が空文字: フィルタ条件を無視
- SQL injection 試行文字列（`'; DROP TABLE --`）: Drizzle ORM パラメータバインディングでエスケープ
- `total` が 0件: 200 + 空配列（`items: [], total: 0, total_pages: 0`）
- `total` が 10,000件以上: ページネーション正常動作（OFFSET方式はパフォーマンス劣化の可能性あり → カーソル方式推奨）
- `per_page` が非数値（例: `abc`）: 400 `INVALID_PER_PAGE`
- `page` が浮動小数点（例: `1.5`）: 400 `INVALID_PAGE`

---

### §3-G. 例外応答 [CONTRACT]

> リスト操作で発生しうるエラーレスポンスの網羅的定義

| エラーコード | HTTP | メッセージ | 発生条件 |
|-------------|------|----------|---------|
| `INVALID_PAGE` | 400 | `page must be a positive integer` | `page` < 1 または非数値 |
| `INVALID_PER_PAGE` | 400 | `per_page must be between 1 and 100` | `per_page` < 1 または > 100 または非数値 |
| `INVALID_SORT` | 400 | `sort column '{value}' is not allowed` | 許可されていないソートカラム指定 |
| `INVALID_ORDER` | 400 | `order must be 'asc' or 'desc'` | `asc` / `desc` 以外の値 |
| `INVALID_CURSOR` | 400 | `cursor format is invalid` | カーソル形式不正（ULID/ISO8601でない） |
| `INVALID_FILTER` | 400 | `filter value for '{column}' is invalid` | フィルタ値が不正（日付形式エラー等） |
| `INVALID_DATE_FORMAT` | 400 | `{param} must be in ISO 8601 format` | 日付パラメータがISO 8601形式でない |
| `UNAUTHORIZED` | 401 | `Authentication required` | 認証なし（未ログイン） |
| `FORBIDDEN` | 403 | `Access denied to this tenant` | 他テナントのデータへのアクセス試行 |

**エラーレスポンス形式**:
```json
{
  "error": {
    "code": "INVALID_PAGE",
    "message": "page must be a positive integer",
    "details": {
      "parameter": "page",
      "value": "0",
      "constraint": "min: 1"
    }
  }
}
```

---

### §3-H. 受け入れテスト（Gherkin） [CONTRACT]

```gherkin
Feature: リスト操作（ページネーション・ソート・フィルタ）

  Background:
    Given ユーザーが "admin@example.com" でログイン済み
    And テナント "tenant-001" に所属
    And テナントにイベント50件が登録済み

  # ---- LIST-001: ページネーション ----

  Scenario: SC-01 デフォルトページネーション（page=1, per_page=20）
    When GET /api/v1/events?page=1&per_page=20
    Then ステータスコード 200
    And レスポンスに data 配列が 20件 含まれる
    And レスポンスに pagination オブジェクトが含まれる
    And pagination.total が 50
    And pagination.page が 1
    And pagination.per_page が 20
    And pagination.total_pages が 3

  Scenario: SC-02 ページ移動（page=3）
    When GET /api/v1/events?page=3&per_page=20
    Then ステータスコード 200
    And レスポンスに data 配列が 10件 含まれる
    And pagination.page が 3

  Scenario: SC-03 per_page変更（per_page=50）
    When GET /api/v1/events?page=1&per_page=50
    Then ステータスコード 200
    And レスポンスに data 配列が 50件 含まれる
    And pagination.per_page が 50
    And pagination.total_pages が 1

  # ---- LIST-002: ソート ----

  Scenario: SC-04 昇順ソート（start_at asc）
    When GET /api/v1/events?sort=start_at&order=asc
    Then ステータスコード 200
    And data[0].start_at <= data[1].start_at

  Scenario: SC-05 降順ソート（name desc）
    When GET /api/v1/events?sort=name&order=desc
    Then ステータスコード 200
    And data[0].name >= data[1].name

  # ---- LIST-003: フィルタ ----

  Scenario: SC-06 ステータスフィルタ
    Given イベント "event-001" のステータスが "draft"
    And イベント "event-002" のステータスが "planning"
    And イベント "event-003" のステータスが "completed"
    When GET /api/v1/events?status=draft,planning
    Then ステータスコード 200
    And data に "event-001" が含まれる
    And data に "event-002" が含まれる
    And data に "event-003" が含まれない

  Scenario: SC-07 複合条件（ソート + フィルタ + ページネーション）
    When GET /api/v1/events?page=1&per_page=10&sort=start_at&order=asc&status=planning&start_at_gte=2026-03-01&q=AI
    Then ステータスコード 200
    And 全てのデータの status が "planning"
    And 全てのデータの start_at >= "2026-03-01"
    And 全てのデータに "AI" が含まれる
    And データが start_at 昇順でソートされている
    And pagination.per_page が 10

  Scenario: SC-08 カーソルベースページネーション
    Given テナントに通知100件が登録済み
    When GET /api/v1/notifications?limit=20
    Then ステータスコード 200
    And レスポンスに data 配列が 20件 含まれる
    And レスポンスに next_cursor が含まれる
    And has_more が true
    When GET /api/v1/notifications?cursor={next_cursor}&limit=20
    Then ステータスコード 200
    And レスポンスに data 配列が 20件 含まれる

  Scenario: SC-09 空結果
    When GET /api/v1/events?status=nonexistent
    Then ステータスコード 200
    And data 配列が空
    And pagination.total が 0
    And pagination.total_pages が 0

  Scenario: SC-10 不正パラメータ（page=0）→ エラー
    When GET /api/v1/events?page=0
    Then ステータスコード 400
    And error.code が "INVALID_PAGE"

  Scenario: SC-11 不正パラメータ（per_page=101）→ エラー
    When GET /api/v1/events?per_page=101
    Then ステータスコード 400
    And error.code が "INVALID_PER_PAGE"

  Scenario: SC-12 不正ソートカラム → エラー
    When GET /api/v1/events?sort=password
    Then ステータスコード 400
    And error.code が "INVALID_SORT"

  Scenario: SC-13 URL State Sync（フィルタ状態がURLに同期）
    Given ユーザーがイベント一覧ページを表示
    When ステータスフィルタで "planning" を選択
    And 開始日フィルタで "2026-03-01" 以降を選択
    Then URLが "/events?status=planning&start_at_gte=2026-03-01" に更新される

  Scenario: SC-14 URL共有で同じフィルタ状態を再現
    When ユーザーが "/events?status=planning&start_at_gte=2026-03-01&q=AI" にアクセス
    Then ステータスフィルタに "planning" が選択されている
    And 開始日フィルタに "2026-03-01" が入力されている
    And 検索ボックスに "AI" が入力されている
    And イベント一覧が該当する条件で絞り込まれている
```

---

## §4 非機能要件 [CORE]

### 4.1 パフォーマンス
- **レスポンスタイム**: 1,000件以下のデータで 200ms 以内
- **ページネーション効率**: OFFSET方式で10,000件まで実用的
- **カーソル方式**: 100,000件以上のデータでも安定

### 4.2 スケーラビリティ
- **インデックス必須**: ソート・フィルタ対象カラムにインデックス作成
- **N+1問題回避**: Drizzle の `with()` でリレーション一括取得

### 4.3 ユーザビリティ
- **フィルタクリア**: ワンクリックで全フィルタをクリア
- **URL共有**: フィルタ状態をURLで共有可能
- **ブラウザ履歴**: 戻る/進むボタンでフィルタ状態が復元

---

## §5 API仕様 [CONTRACT]

### 5.1 共通クエリパラメータ

#### ページネーション（オフセット方式）
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|---|------|----------|------|
| `page` | integer | No | 1 | ページ番号（1-indexed） |
| `per_page` | integer | No | 20 | 1ページあたりの件数（最大100） |

#### ページネーション（カーソル方式）
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|---|------|----------|------|
| `cursor` | string | No | - | 次のデータセットの開始位置（ULID or ISO8601） |
| `limit` | integer | No | 20 | 取得件数（最大100） |

#### ソート
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|---|------|----------|------|
| `sort` | string | No | created_at | ソート対象カラム |
| `order` | enum | No | desc | ソート順（`asc` or `desc`） |

#### フィルタ
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|---|------|----------|------|
| `q` | string | No | - | フリーテキスト検索 |
| `{column}` | string | No | - | 完全一致（カンマ区切りでOR条件） |
| `{column}_gte` | string | No | - | 以上（Greater Than or Equal） |
| `{column}_lte` | string | No | - | 以下（Less Than or Equal） |
| `{column}_gt` | string | No | - | より大きい（Greater Than） |
| `{column}_lt` | string | No | - | より小さい（Less Than） |

### 5.2 共通レスポンス形式

#### オフセットベース
```typescript
{
  data: T[],
  pagination: {
    total: number,        // 総件数
    page: number,         // 現在のページ
    per_page: number,     // 1ページあたりの件数
    total_pages: number   // 総ページ数
  }
}
```

#### カーソルベース
```typescript
{
  data: T[],
  next_cursor: string | null,  // 次のカーソル（なければnull）
  has_more: boolean            // 次のデータが存在するか
}
```

### 5.3 エンドポイント例

#### イベント一覧
```
GET /api/v1/events
```

**クエリパラメータ**:
- 共通: `page`, `per_page`, `sort`, `order`, `q`
- フィルタ: `status`, `start_at_gte`, `start_at_lte`, `venue_id`

**ソート可能カラム**: `start_at`, `end_at`, `name`, `created_at`, `updated_at`

#### タスク一覧
```
GET /api/v1/tasks
```

**クエリパラメータ**:
- 共通: `page`, `per_page`, `sort`, `order`, `q`
- フィルタ: `status`, `priority`, `due_date_gte`, `due_date_lte`, `assigned_to`

**ソート可能カラム**: `due_date`, `priority`, `status`, `created_at`, `updated_at`

#### 参加者一覧
```
GET /api/v1/events/:event_id/participants
```

**クエリパラメータ**:
- 共通: `page`, `per_page`, `sort`, `order`, `q`
- フィルタ: `status`, `role`, `registered_at_gte`

**ソート可能カラム**: `registered_at`, `name`, `created_at`

---

## §6 UI仕様 [DETAIL]

### 6.1 コンポーネント構成

```
ListPage (pages/events/index.vue)
├── FilterBar
│   ├── UInput (検索ボックス)
│   ├── USelect (ステータスフィルタ)
│   ├── DateRangePicker (日付範囲)
│   └── UButton (フィルタクリア)
├── UTable (データテーブル)
│   ├── sortable columns
│   └── EmptyState (結果0件時)
└── UPagination (ページネーション)
```

### 6.2 レイアウト（ASCII Wireframe）

```
┌─────────────────────────────────────────────────────────────┐
│ イベント一覧                                      [+ 新規作成] │
├─────────────────────────────────────────────────────────────┤
│ 検索: [_______________] ステータス: [全て▼] 期間: [____~____]│
│ [フィルタをクリア]                                           │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ イベント名 ↓ │ ステータス │ 開始日時 ↑ │ 参加者数 │    │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ AI活用セミナー │ 企画中   │ 2026-03-15 │   25    │ [...] │
│ │ DX推進講座     │ 下書き   │ 2026-03-20 │    0    │ [...] │
│ │ ...           │ ...      │ ...        │   ...   │ [...] │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ 42件中 1-20件を表示    [<] [1] [2] [3] [>]                  │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Empty State

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│                        🔍                                     │
│                                                               │
│              条件に一致する結果が見つかりませんでした          │
│                                                               │
│                  [フィルタをクリア]                           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 6.4 ローディングスケルトン

```
┌─────────────────────────────────────────────────────────────┐
│ ████████████  ████████  ████████  ████  [...]               │
│ ████████████  ████████  ████████  ████  [...]               │
│ ████████████  ████████  ████████  ████  [...]               │
└─────────────────────────────────────────────────────────────┘
```

### 6.5 状態管理（URL Sync）

**URLクエリパラメータ**:
```
/events?page=2&per_page=20&sort=start_at&order=desc&status=planning&start_at_gte=2026-03-01&q=AI
```

**Vue Router連携**:
```typescript
// フィルタ変更時
watch(filters, (newFilters) => {
  router.push({
    query: {
      ...route.query,
      ...newFilters
    }
  })
})

// URLから復元
onMounted(() => {
  filters.value = { ...route.query }
})
```

---

## §7 ビジネスルール [CORE]

### BR-001: テナント分離 [MUST]
**ルール**: 全てのリストクエリは `tenant_id` でフィルタリング

**実装**:
```typescript
// ミドルウェアで自動付与
const tenantId = event.context.auth.tenantId
const query = db.select().from(events).where(eq(events.tenant_id, tenantId))
```

### BR-002: デフォルトソート [MUST]
**ルール**: ソート未指定時は `created_at desc`

**実装**:
```typescript
const sortColumn = query.sort || 'created_at'
const sortOrder = query.order || 'desc'
```

### BR-003: per_page上限 [MUST]
**ルール**: `per_page` は最大100

**実装**:
```typescript
const perPage = Math.min(query.per_page || 20, 100)
```

### BR-004: 空検索は全件返却 [MUST]
**ルール**: `q` が空文字列の場合は検索フィルタを適用しない

**実装**:
```typescript
if (query.q && query.q.trim() !== '') {
  queryBuilder = queryBuilder.where(
    or(
      ilike(events.name, `%${query.q}%`),
      ilike(events.description, `%${query.q}%`)
    )
  )
}
```

### BR-005: マルチテナント権限 [MUST]
**ルール**: 他テナントのデータは取得不可

**実装**: Drizzle RLS（Row Level Security）でテナント分離

---

## §8 データ設計 [CONTRACT]

### 8.1 共通カラム（ソート・フィルタ対象）

全テーブル共通:
- `id` (ULID)
- `tenant_id` (UUID, FK)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### 8.2 インデックス設計

```sql
-- イベントテーブル
CREATE INDEX idx_events_tenant_created ON events(tenant_id, created_at DESC);
CREATE INDEX idx_events_tenant_start ON events(tenant_id, start_at DESC);
CREATE INDEX idx_events_tenant_status ON events(tenant_id, status);
CREATE INDEX idx_events_name_search ON events USING gin(to_tsvector('simple', name));

-- タスクテーブル
CREATE INDEX idx_tasks_tenant_created ON tasks(tenant_id, created_at DESC);
CREATE INDEX idx_tasks_tenant_due ON tasks(tenant_id, due_date ASC);
CREATE INDEX idx_tasks_tenant_status ON tasks(tenant_id, status);

-- 参加者テーブル
CREATE INDEX idx_participants_tenant_event ON participants(tenant_id, event_id, registered_at DESC);
CREATE INDEX idx_participants_tenant_status ON participants(tenant_id, status);
```

### 8.3 クエリパフォーマンス目標

| データ件数 | ページネーション方式 | レスポンスタイム |
|----------|------------------|----------------|
| ~1,000件 | OFFSET | < 100ms |
| ~10,000件 | OFFSET | < 200ms |
| 10,000件~ | CURSOR | < 150ms |

---

## §9 実装パターン [DETAIL]

### 9.1 Composable: useList

```typescript
// composables/useList.ts
import type { LocationQueryValue } from 'vue-router'

export interface ListOptions<T> {
  endpoint: string
  defaultSort?: string
  defaultOrder?: 'asc' | 'desc'
  defaultPerPage?: number
}

export interface ListFilters {
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
  q?: string
  [key: string]: any
}

export interface PaginationMeta {
  total: number
  page: number
  per_page: number
  total_pages: number
}

export function useList<T>(options: ListOptions<T>) {
  const route = useRoute()
  const router = useRouter()

  // フィルタ状態（URLと同期）
  const filters = ref<ListFilters>({
    page: 1,
    per_page: options.defaultPerPage || 20,
    sort: options.defaultSort || 'created_at',
    order: options.defaultOrder || 'desc',
    ...parseQueryParams(route.query)
  })

  // データ
  const data = ref<T[]>([])
  const pagination = ref<PaginationMeta>({
    total: 0,
    page: 1,
    per_page: 20,
    total_pages: 0
  })
  const loading = ref(false)
  const error = ref<Error | null>(null)

  // データ取得
  const fetch = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{ data: T[], pagination: PaginationMeta }>(
        options.endpoint,
        {
          query: filters.value
        }
      )

      data.value = response.data
      pagination.value = response.pagination
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }

  // フィルタ変更
  const updateFilters = (newFilters: Partial<ListFilters>) => {
    filters.value = {
      ...filters.value,
      ...newFilters,
      page: 1 // フィルタ変更時は1ページ目に戻る
    }
    syncUrl()
    fetch()
  }

  // ページ変更
  const changePage = (page: number) => {
    filters.value.page = page
    syncUrl()
    fetch()
  }

  // ソート変更
  const changeSort = (column: string) => {
    if (filters.value.sort === column) {
      // 同じカラムなら順序を反転
      filters.value.order = filters.value.order === 'asc' ? 'desc' : 'asc'
    } else {
      filters.value.sort = column
      filters.value.order = 'desc'
    }
    filters.value.page = 1
    syncUrl()
    fetch()
  }

  // フィルタクリア
  const clearFilters = () => {
    filters.value = {
      page: 1,
      per_page: options.defaultPerPage || 20,
      sort: options.defaultSort || 'created_at',
      order: options.defaultOrder || 'desc'
    }
    syncUrl()
    fetch()
  }

  // URLと同期
  const syncUrl = () => {
    router.push({
      query: cleanQueryParams(filters.value)
    })
  }

  // 初回ロード
  onMounted(() => {
    fetch()
  })

  // URLクエリパラメータ監視
  watch(() => route.query, (newQuery) => {
    filters.value = {
      ...filters.value,
      ...parseQueryParams(newQuery)
    }
    fetch()
  })

  return {
    data,
    pagination,
    loading,
    error,
    filters,
    updateFilters,
    changePage,
    changeSort,
    clearFilters,
    fetch
  }
}

// ヘルパー関数
function parseQueryParams(query: Record<string, LocationQueryValue | LocationQueryValue[]>): ListFilters {
  const parsed: ListFilters = {}

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue

    const stringValue = Array.isArray(value) ? value[0] : value
    if (!stringValue) continue

    // 数値型パラメータ
    if (key === 'page' || key === 'per_page') {
      parsed[key] = parseInt(stringValue, 10)
    } else {
      parsed[key] = stringValue
    }
  }

  return parsed
}

function cleanQueryParams(filters: ListFilters): Record<string, string> {
  const cleaned: Record<string, string> = {}

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = String(value)
    }
  }

  return cleaned
}
```

### 9.2 API Handler: Generic List

```typescript
// server/api/v1/events/index.get.ts
import { z } from 'zod'
import { db } from '~/server/utils/db'
import { events } from '~/server/database/schema'
import { eq, and, gte, lte, or, ilike, desc, asc } from 'drizzle-orm'

// クエリパラメータバリデーション
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['start_at', 'end_at', 'name', 'created_at', 'updated_at']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  q: z.string().optional(),
  status: z.string().optional(), // カンマ区切り
  start_at_gte: z.string().datetime().optional(),
  start_at_lte: z.string().datetime().optional(),
  venue_id: z.string().optional()
})

export default defineEventHandler(async (event) => {
  // 認証チェック
  const auth = await requireAuth(event)
  const tenantId = auth.tenantId

  // クエリパラメータ検証
  const query = await getValidatedQuery(event, listQuerySchema.parse)

  // ベースクエリ（テナント分離）
  let queryBuilder = db.select().from(events).where(eq(events.tenant_id, tenantId))

  // フィルタ適用
  const conditions = []

  // ステータスフィルタ（OR条件）
  if (query.status) {
    const statuses = query.status.split(',')
    conditions.push(or(...statuses.map(s => eq(events.status, s))))
  }

  // 日付範囲フィルタ
  if (query.start_at_gte) {
    conditions.push(gte(events.start_at, new Date(query.start_at_gte)))
  }
  if (query.start_at_lte) {
    conditions.push(lte(events.start_at, new Date(query.start_at_lte)))
  }

  // 会場フィルタ
  if (query.venue_id) {
    conditions.push(eq(events.venue_id, query.venue_id))
  }

  // フリーテキスト検索
  if (query.q && query.q.trim() !== '') {
    conditions.push(
      or(
        ilike(events.name, `%${query.q}%`),
        ilike(events.description, `%${query.q}%`)
      )
    )
  }

  if (conditions.length > 0) {
    queryBuilder = queryBuilder.where(and(...conditions))
  }

  // ソート
  const sortColumn = events[query.sort as keyof typeof events]
  queryBuilder = queryBuilder.orderBy(
    query.order === 'asc' ? asc(sortColumn) : desc(sortColumn)
  )

  // 総件数取得（ページネーション用）
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(eq(events.tenant_id, tenantId))

  const total = countResult.count
  const totalPages = Math.ceil(total / query.per_page)

  // ページネーション
  const offset = (query.page - 1) * query.per_page
  queryBuilder = queryBuilder.limit(query.per_page).offset(offset)

  // データ取得
  const data = await queryBuilder

  return {
    data,
    pagination: {
      total,
      page: query.page,
      per_page: query.per_page,
      total_pages: totalPages
    }
  }
})
```

### 9.3 Page Component: ListPage

```vue
<!-- pages/events/index.vue -->
<script setup lang="ts">
import type { Event } from '~/types/event'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth']
})

// リスト管理
const {
  data: events,
  pagination,
  loading,
  filters,
  updateFilters,
  changePage,
  changeSort,
  clearFilters
} = useList<Event>({
  endpoint: '/api/v1/events',
  defaultSort: 'start_at',
  defaultOrder: 'desc'
})

// ステータスオプション
const statusOptions = [
  { label: '全て', value: '' },
  { label: '下書き', value: 'draft' },
  { label: '企画中', value: 'planning' },
  { label: '準備中', value: 'preparing' },
  { label: '開催中', value: 'ongoing' },
  { label: '完了', value: 'completed' },
  { label: '中止', value: 'cancelled' }
]

// テーブルカラム
const columns = [
  {
    key: 'name',
    label: 'イベント名',
    sortable: true
  },
  {
    key: 'status',
    label: 'ステータス'
  },
  {
    key: 'start_at',
    label: '開始日時',
    sortable: true
  },
  {
    key: 'participants_count',
    label: '参加者数'
  },
  {
    key: 'actions',
    label: ''
  }
]

// フィルタ更新ハンドラ
const handleFilterChange = () => {
  updateFilters({
    q: filters.value.q,
    status: filters.value.status,
    start_at_gte: filters.value.start_at_gte,
    start_at_lte: filters.value.start_at_lte
  })
}
</script>

<template>
  <div>
    <!-- ヘッダー -->
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">イベント一覧</h1>
      <UButton to="/events/new" icon="i-heroicons-plus">
        新規作成
      </UButton>
    </div>

    <!-- フィルタバー -->
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- 検索 -->
        <UInput
          v-model="filters.q"
          placeholder="検索..."
          icon="i-heroicons-magnifying-glass"
          @update:model-value="handleFilterChange"
        />

        <!-- ステータスフィルタ -->
        <USelect
          v-model="filters.status"
          :options="statusOptions"
          placeholder="ステータス"
          @update:model-value="handleFilterChange"
        />

        <!-- 日付範囲（開始） -->
        <UInput
          v-model="filters.start_at_gte"
          type="date"
          placeholder="開始日以降"
          @update:model-value="handleFilterChange"
        />

        <!-- 日付範囲（終了） -->
        <UInput
          v-model="filters.start_at_lte"
          type="date"
          placeholder="開始日以前"
          @update:model-value="handleFilterChange"
        />
      </div>

      <!-- フィルタクリア -->
      <div class="mt-4">
        <UButton
          variant="ghost"
          size="sm"
          @click="clearFilters"
        >
          フィルタをクリア
        </UButton>
      </div>
    </div>

    <!-- テーブル -->
    <UCard>
      <UTable
        :rows="events"
        :columns="columns"
        :loading="loading"
        @update:sort="changeSort"
      >
        <!-- スケルトンローディング -->
        <template #loading>
          <div class="space-y-2">
            <USkeleton v-for="i in 5" :key="i" class="h-10" />
          </div>
        </template>

        <!-- Empty State -->
        <template #empty>
          <div class="text-center py-12">
            <UIcon name="i-heroicons-magnifying-glass" class="text-4xl text-gray-400 mb-4" />
            <p class="text-gray-600 mb-4">
              条件に一致する結果が見つかりませんでした
            </p>
            <UButton variant="ghost" @click="clearFilters">
              フィルタをクリア
            </UButton>
          </div>
        </template>

        <!-- ステータスセル -->
        <template #status-data="{ row }">
          <UBadge :color="getStatusColor(row.status)">
            {{ getStatusLabel(row.status) }}
          </UBadge>
        </template>

        <!-- 開始日時セル -->
        <template #start_at-data="{ row }">
          {{ formatDateTime(row.start_at) }}
        </template>

        <!-- アクションセル -->
        <template #actions-data="{ row }">
          <UButton
            :to="`/events/${row.id}`"
            variant="ghost"
            icon="i-heroicons-eye"
            size="sm"
          />
        </template>
      </UTable>

      <!-- ページネーション -->
      <div class="flex justify-between items-center mt-4">
        <div class="text-sm text-gray-600">
          {{ pagination.total }}件中
          {{ (pagination.page - 1) * pagination.per_page + 1 }}-{{ Math.min(pagination.page * pagination.per_page, pagination.total) }}件を表示
        </div>

        <UPagination
          v-model="filters.page"
          :total="pagination.total_pages"
          @update:model-value="changePage"
        />
      </div>
    </UCard>
  </div>
</template>
```

---

## §10 セキュリティ [CORE]

### 10.1 テナント分離
- **実装**: 全てのクエリに `tenant_id` フィルタを自動適用
- **検証**: ミドルウェアで認証ユーザーのテナントIDを取得

### 10.2 SQLインジェクション対策
- **実装**: Drizzle ORM のパラメータバインディング使用
- **禁止**: 生SQLの動的生成

### 10.3 クエリパラメータ検証
- **実装**: Zod スキーマでバリデーション
- **検証項目**: 型、範囲、フォーマット、許可値

---

## §11 テスト [DETAIL]

### 11.1 ユニットテスト

```typescript
// tests/unit/composables/useList.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useList } from '~/composables/useList'

describe('useList', () => {
  it('初期状態でデフォルト値が設定される', () => {
    const { filters } = useList({
      endpoint: '/api/v1/events'
    })

    expect(filters.value.page).toBe(1)
    expect(filters.value.per_page).toBe(20)
    expect(filters.value.sort).toBe('created_at')
    expect(filters.value.order).toBe('desc')
  })

  it('フィルタ更新時にpage=1にリセット', async () => {
    const { filters, updateFilters } = useList({
      endpoint: '/api/v1/events'
    })

    filters.value.page = 3
    await updateFilters({ status: 'planning' })

    expect(filters.value.page).toBe(1)
    expect(filters.value.status).toBe('planning')
  })

  it('ソート変更時に順序が反転', () => {
    const { filters, changeSort } = useList({
      endpoint: '/api/v1/events'
    })

    filters.value.sort = 'name'
    filters.value.order = 'asc'

    changeSort('name')

    expect(filters.value.order).toBe('desc')
  })
})
```

### 11.2 統合テスト

```typescript
// tests/integration/api/events/list.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDatabase, seedEvents } from '~/tests/helpers'

describe('GET /api/v1/events', () => {
  beforeEach(async () => {
    await createTestDatabase()
    await seedEvents(50) // 50件のイベントを作成
  })

  it('ページネーションが正しく動作する', async () => {
    const response = await $fetch('/api/v1/events?page=1&per_page=20')

    expect(response.data).toHaveLength(20)
    expect(response.pagination.total).toBe(50)
    expect(response.pagination.total_pages).toBe(3)
  })

  it('ステータスフィルタ（OR条件）が動作する', async () => {
    const response = await $fetch('/api/v1/events?status=draft,planning')

    expect(response.data.every(e => ['draft', 'planning'].includes(e.status))).toBe(true)
  })

  it('日付範囲フィルタが動作する', async () => {
    const response = await $fetch('/api/v1/events?start_at_gte=2026-03-01&start_at_lte=2026-03-31')

    expect(response.data.every(e => {
      const startAt = new Date(e.start_at)
      return startAt >= new Date('2026-03-01') && startAt <= new Date('2026-03-31')
    })).toBe(true)
  })

  it('per_page上限を超えるとエラー', async () => {
    await expect($fetch('/api/v1/events?per_page=200')).rejects.toThrow()
  })
})
```

### 11.3 E2Eテスト

```typescript
// tests/e2e/events/list.spec.ts
import { test, expect } from '@playwright/test'

test.describe('イベント一覧', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/events')
  })

  test('イベント一覧が表示される', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'イベント一覧' })).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('ステータスフィルタで絞り込み', async ({ page }) => {
    await page.selectOption('select[name="status"]', 'planning')

    await page.waitForURL('**/events?status=planning')

    const badges = await page.locator('.badge').allTextContents()
    expect(badges.every(b => b === '企画中')).toBe(true)
  })

  test('フリーテキスト検索', async ({ page }) => {
    await page.fill('input[placeholder="検索..."]', 'AI')

    await page.waitForURL('**/events?q=AI')

    const eventNames = await page.locator('table tbody tr td:first-child').allTextContents()
    expect(eventNames.some(name => name.includes('AI'))).toBe(true)
  })

  test('ページネーションで次ページに移動', async ({ page }) => {
    await page.click('button[aria-label="Next page"]')

    await page.waitForURL('**/events?page=2')
    await expect(page.locator('button[aria-current="page"]')).toHaveText('2')
  })

  test('ソートカラムクリックで並び順変更', async ({ page }) => {
    await page.click('th:has-text("イベント名")')

    await page.waitForURL('**/events?sort=name&order=desc')

    // 降順確認
    await page.click('th:has-text("イベント名")')
    await page.waitForURL('**/events?sort=name&order=asc')
  })

  test('フィルタクリアで全件表示に戻る', async ({ page }) => {
    await page.selectOption('select[name="status"]', 'planning')
    await page.fill('input[placeholder="検索..."]', 'AI')

    await page.click('button:has-text("フィルタをクリア")')

    await page.waitForURL('/events')
    await expect(page.locator('select[name="status"]')).toHaveValue('')
    await expect(page.locator('input[placeholder="検索..."]')).toHaveValue('')
  })
})
```

---

## §12 運用 [DETAIL]

### 12.1 モニタリング

**監視項目**:
- リストAPIのレスポンスタイム（P95 < 300ms）
- スロークエリ検出（> 1秒）
- ページネーションのOFFSET値（> 10,000で警告）

### 12.2 パフォーマンスチューニング

**定期実行**:
```sql
-- インデックス使用状況確認
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;

-- スロークエリ確認
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC;
```

### 12.3 トラブルシューティング

| 問題 | 原因 | 対策 |
|-----|------|------|
| レスポンスが遅い | OFFSETが大きい | カーソル方式に切り替え |
| フィルタ結果が不正 | テナントID未適用 | ミドルウェア確認 |
| ページング異常 | total_pages計算ミス | CEIL関数確認 |

---

## §13 未決定事項・制約 [CONTRACT]

### 前提条件
- Drizzle ORM によるクエリビルド
- PostgreSQL 16 のインデックス戦略
- Nuxt UI v3 UTable / カスタムリストコンポーネント

### 制約
- `per_page` は最大100件（サーバー保護）
- ソート対象カラムはホワイトリスト制（リソース毎に定義）
- カーソルベースはリアルタイムデータ（通知・チャット履歴）のみに適用

### 未決定事項

| 項目ID | 項目 | 選択肢 | 期限 | 決定者 |
|--------|------|--------|------|--------|
| LIST-TBD-01 | 全文検索エンジン | (1) PostgreSQL pg_trgm (2) Meilisearch (3) Post-MVP | MVP前 | Tech Lead |
| LIST-TBD-02 | URL State Sync 実装方式 | (1) useUrlSearchParams (2) カスタムcomposable | Sprint 2 | Tech Lead |

---

## 付録A: 用語集

| 用語 | 説明 |
|-----|------|
| オフセットページネーション | `LIMIT` / `OFFSET` でページング |
| カーソルページネーション | カーソル（ID or timestamp）ベースでページング |
| RLS | Row Level Security（行レベルセキュリティ） |
| ILIKE | PostgreSQLの大文字小文字を区別しない部分一致 |

---

## 付録B: 変更履歴

| 日付 | バージョン | 変更内容 | 変更者 |
|------|----------|---------|--------|
| 2026-02-09 | 1.0.0 | 初版作成 | Claude |
| 2026-02-09 | 1.1.0 | §3-E/F/G/H（入出力例・境界値・例外レスポンス・Gherkin）を [CONTRACT] 形式で追加、§13 未決定事項・制約を追加 | Claude |

---

## 付録C: 参照ドキュメント

- SSOT-3: API_CONTRACT.md
- SSOT-4: DATA_MODEL.md
- SSOT-5: CROSS_CUTTING.md (エラーハンドリング、ログ)
- Nuxt UI v3: Table, Pagination コンポーネント
- Drizzle ORM: Query Builder

---

**承認者**: 未承認
**レビュアー**: 未レビュー
**実装状況**: 未実装
