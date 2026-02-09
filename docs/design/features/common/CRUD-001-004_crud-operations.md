# CRUD-001-004: CRUD操作共通パターン

**機能ID**: CRUD-001 (Create), CRUD-002 (Read), CRUD-003 (Update), CRUD-004 (Delete)
**機能名**: CRUD操作共通パターン
**作成日**: 2026-02-09
**最終更新**: 2026-02-09
**ステータス**: Draft
**関連**: SSOT-3 (API契約), SSOT-4 (データモデル), SSOT-5 (横断的関心事)

---

## §1. 概要 [CORE]

本仕様書は、Haishin+ HUBにおける全リソースに共通するCRUD操作（作成・参照・更新・削除）の統一パターンを定義する。この仕様に準拠することで、実装の一貫性を保ち、開発速度を向上させる。

**適用範囲**: イベント、プロジェクト、タスク、アカウント、組織など、全てのエンティティ

**スコープ**:
- **IN**: 新規作成、詳細表示、編集、論理削除、バリデーション、権限チェック、テナント分離、楽観的ロック
- **OUT**: 物理削除、一括操作、インポート/エクスポート、バージョン履歴（別仕様）

---

## §2. 目的・背景 [CORE]

### 2.1 目的

1. **開発効率化**: 共通パターンにより、新機能追加時の実装工数を削減
2. **品質保証**: 統一されたエラーハンドリング・バリデーションパターンによる品質向上
3. **保守性向上**: 一貫性のあるコードベースによる保守性の向上
4. **UX統一**: 全画面で一貫したユーザー体験を提供

### 2.2 背景

セミナー/イベント運営OSとして、多数のリソース（イベント、タスク、プロジェクト等）を管理する必要がある。各リソースの CRUD 操作を個別実装すると、以下の問題が発生する:

- コードの重複
- 品質のばらつき
- エラーハンドリングの不統一
- UXの不一致

これらを防ぐため、共通パターンを定義し、全リソースに適用する。

---

## §3. 機能要件 [CONTRACT]

### 3.1 新規作成（Create）- CRUD-001 [MUST]

**FR-001: フォームバリデーション**
- Zod スキーマによるリアルタイムバリデーション
- フロントエンド・バックエンド共通のバリデーションスキーマ
- フィールドごとのエラー表示
- 送信前の全体バリデーション

**FR-002: 成功時の処理**
- 成功トースト通知（"〇〇を作成しました"）
- 詳細画面または一覧画面へのリダイレクト
- フォームのリセット（連続作成の場合）

**FR-003: エラー時の処理**
- エラートースト通知（"〇〇の作成に失敗しました"）
- フォーム入力内容の保持
- バリデーションエラーの表示

**FR-004: ローディング状態**
- 送信中のボタンの無効化
- ローディングインジケーター表示
- 二重送信の防止

### 3.2 詳細表示（Read）- CRUD-002 [MUST]

**FR-005: データ取得**
- ULID による一意識別
- テナント分離の自動適用
- 権限チェック（閲覧権限）

**FR-006: ローディング状態**
- スケルトンローディング表示
- データ取得中のUI表示

**FR-007: エラー状態**
- 404: リソースが見つからない場合のエラー画面
- 403: 権限がない場合のエラー画面
- 500: サーバーエラー時のエラー画面

**FR-008: 空状態**
- 関連データがない場合の空状態表示
- 新規作成への誘導

### 3.3 編集（Update）- CRUD-003 [MUST]

**FR-009: フォーム初期化**
- 既存データの自動取得
- フォームへの事前入力
- ローディング状態の表示

**FR-010: 差分検知**
- 変更がない場合は更新ボタンを無効化
- 変更内容のハイライト（オプション）

**FR-011: 楽観的ロック**
- `updated_at` による競合検知
- 競合時のエラー表示とリロード提案

**FR-012: 成功時の処理**
- 成功トースト通知（"〇〇を更新しました"）
- 詳細画面へのリダイレクト
- データの再取得

**FR-013: エラー時の処理**
- エラートースト通知（"〇〇の更新に失敗しました"）
- フォーム入力内容の保持
- 競合エラーの場合は特別な処理

### 3.4 削除（Delete）- CRUD-004 [MUST]

**FR-014: 確認ダイアログ**
- 削除前の確認モーダル表示
- リソース名の表示
- "削除する" ボタン（危険色）

**FR-015: 論理削除**
- `is_active = false` または `deleted_at` への日時設定
- 物理削除は行わない
- 削除後も管理者は閲覧可能

**FR-016: 復元機能（オプション）**
- Undo トースト通知（5秒間表示）
- 復元ボタンクリックで `is_active = true` に戻す

**FR-017: 成功時の処理**
- 成功トースト通知（"〇〇を削除しました"）
- 一覧画面へのリダイレクト

**FR-018: エラー時の処理**
- エラートースト通知（"〇〇の削除に失敗しました"）
- モーダルを閉じる

### 3.5 共通要件 [MUST]

**FR-019: 権限チェック**
- 全操作前に RBAC による権限チェック
- 権限がない場合は 403 エラー
- UI上で操作不可能なボタンは非表示または無効化

**FR-020: テナント分離**
- 全クエリに `tenant_id` フィルタを自動適用
- クロステナントアクセスの防止

**FR-021: ローディング状態**
- 全非同期操作でローディング状態を表示
- ボタンの無効化
- スケルトンまたはスピナー表示

**FR-022: トースト通知**
- 成功時: 緑色トースト（3秒間表示）
- エラー時: 赤色トースト（5秒間表示）
- 情報: 青色トースト（3秒間表示）

### 3.6 入出力例 [CONTRACT]

CRUD全操作の代表的な入出力パターンを示す。

#### 3.6.1 Create 成功

**リクエスト**:
```http
POST /api/v1/events
Content-Type: application/json
Authorization: Bearer <session_token>

{
  "title": "春の経営セミナー 2026",
  "description": "中小企業向け経営戦略セミナー",
  "start_date": "2026-04-15T10:00:00Z",
  "end_date": "2026-04-15T17:00:00Z"
}
```

**レスポンス** (201 Created):
```json
{
  "data": {
    "id": "01HQZX1234567890ABCDEFGH",
    "tenant_id": "01HQZY9876543210ZYXWVUTS",
    "title": "春の経営セミナー 2026",
    "description": "中小企業向け経営戦略セミナー",
    "start_date": "2026-04-15T10:00:00Z",
    "end_date": "2026-04-15T17:00:00Z",
    "created_at": "2026-02-09T10:00:00Z",
    "created_by": "01HQZXUSER001234ABCDEFGH",
    "updated_at": "2026-02-09T10:00:00Z",
    "updated_by": "01HQZXUSER001234ABCDEFGH",
    "is_active": true
  }
}
```

#### 3.6.2 Create 失敗（バリデーションエラー）

**リクエスト**:
```http
POST /api/v1/events
Content-Type: application/json
Authorization: Bearer <session_token>

{
  "title": "",
  "start_date": "invalid-date"
}
```

**レスポンス** (400 Bad Request):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラー",
    "details": {
      "title": ["タイトルは必須です"],
      "start_date": ["日付の形式が不正です"]
    }
  }
}
```

#### 3.6.3 Read 成功

**リクエスト**:
```http
GET /api/v1/events/01HQZX1234567890ABCDEFGH
Authorization: Bearer <session_token>
```

**レスポンス** (200 OK):
```json
{
  "data": {
    "id": "01HQZX1234567890ABCDEFGH",
    "tenant_id": "01HQZY9876543210ZYXWVUTS",
    "title": "春の経営セミナー 2026",
    "description": "中小企業向け経営戦略セミナー",
    "start_date": "2026-04-15T10:00:00Z",
    "end_date": "2026-04-15T17:00:00Z",
    "created_at": "2026-02-09T10:00:00Z",
    "created_by": "01HQZXUSER001234ABCDEFGH",
    "updated_at": "2026-02-09T10:00:00Z",
    "updated_by": "01HQZXUSER001234ABCDEFGH",
    "is_active": true
  }
}
```

#### 3.6.4 Read 失敗（404）

**リクエスト**:
```http
GET /api/v1/events/INVALID_OR_NONEXISTENT_ID
Authorization: Bearer <session_token>
```

**レスポンス** (404 Not Found):
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "イベントが見つかりません"
  }
}
```

#### 3.6.5 Update 成功

**リクエスト**:
```http
PATCH /api/v1/events/01HQZX1234567890ABCDEFGH
Content-Type: application/json
Authorization: Bearer <session_token>

{
  "title": "春の経営セミナー 2026【更新版】",
  "updated_at": "2026-02-09T10:00:00Z"
}
```

**レスポンス** (200 OK):
```json
{
  "data": {
    "id": "01HQZX1234567890ABCDEFGH",
    "tenant_id": "01HQZY9876543210ZYXWVUTS",
    "title": "春の経営セミナー 2026【更新版】",
    "description": "中小企業向け経営戦略セミナー",
    "start_date": "2026-04-15T10:00:00Z",
    "end_date": "2026-04-15T17:00:00Z",
    "created_at": "2026-02-09T10:00:00Z",
    "created_by": "01HQZXUSER001234ABCDEFGH",
    "updated_at": "2026-02-09T14:30:00Z",
    "updated_by": "01HQZXUSER001234ABCDEFGH",
    "is_active": true
  }
}
```

#### 3.6.6 Update 失敗（楽観的ロック競合）

**リクエスト**:
```http
PATCH /api/v1/events/01HQZX1234567890ABCDEFGH
Content-Type: application/json
Authorization: Bearer <session_token>

{
  "title": "変更後のタイトル",
  "updated_at": "2026-02-09T10:00:00Z"
}
```

**レスポンス** (409 Conflict):
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "このリソースは他のユーザーによって更新されています。最新のデータをリロードしてください。"
  }
}
```

#### 3.6.7 Delete 成功

**リクエスト**:
```http
DELETE /api/v1/events/01HQZX1234567890ABCDEFGH
Authorization: Bearer <session_token>
```

**レスポンス** (200 OK):
```json
{
  "data": {
    "id": "01HQZX1234567890ABCDEFGH",
    "is_active": false,
    "deleted_at": "2026-02-09T15:00:00Z",
    "deleted_by": "01HQZXUSER001234ABCDEFGH"
  }
}
```

#### 3.6.8 Delete 失敗（権限不足）

**リクエスト**:
```http
DELETE /api/v1/events/01HQZX1234567890ABCDEFGH
Authorization: Bearer <session_token_viewer>
```

**レスポンス** (403 Forbidden):
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "この操作を実行する権限がありません"
  }
}
```

### 3.7 境界値 [CONTRACT]

| フィールド | 制約 | 最小値 | 最大値 | デフォルト | 備考 |
|-----------|------|--------|--------|-----------|------|
| title | 必須・文字列 | 1文字 | 200文字 | - | 空文字不可 |
| description | 任意・文字列 | - | 5,000文字 | `null` | 未入力許可 |
| per_page | 任意・整数 | 1 | 100 | 20 | 一覧取得のページサイズ |
| page | 任意・整数 | 1 | - | 1 | ページ番号 |
| id (ULID) | 必須・文字列 | 26文字 | 26文字 | - | Crockford Base32 固定長 |
| updated_at | 条件付き必須 | - | - | - | ISO 8601 形式。更新操作時の楽観的ロック用 |
| tenant_id | 自動付与 | - | - | - | UUID v4 形式。認証情報から自動設定 |

**バリデーション例（Zod）**:
```typescript
const boundarySchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(200, 'タイトルは200文字以内で入力してください'),
  description: z.string().max(5000, '説明は5000文字以内で入力してください').nullable().optional(),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
});
```

### 3.8 例外レスポンス [CONTRACT]

全CRUD操作で発生しうるエラーレスポンスの一覧。

| エラーコード | HTTP ステータス | メッセージ（日本語） | 発生条件 |
|-------------|----------------|---------------------|---------|
| `VALIDATION_ERROR` | 400 Bad Request | バリデーションエラー | 入力値が Zod スキーマのバリデーションに失敗した場合 |
| `UNAUTHORIZED` | 401 Unauthorized | 認証が必要です | セッションが無効または期限切れの場合 |
| `FORBIDDEN` | 403 Forbidden | この操作を実行する権限がありません | RBAC 権限チェックに失敗した場合 |
| `TENANT_MISMATCH` | 403 Forbidden | アクセスが拒否されました | 異なるテナントのリソースにアクセスしようとした場合 |
| `NOT_FOUND` | 404 Not Found | {resource}が見つかりません | 指定IDのリソースが存在しない、または `is_active=false` の場合 |
| `CONFLICT` | 409 Conflict | このリソースは他のユーザーによって更新されています | 楽観的ロック競合。クライアント送信の `updated_at` とDB上の値が不一致の場合 |
| `UNPROCESSABLE_ENTITY` | 422 Unprocessable Entity | ビジネスルール違反 | バリデーションは通過したがビジネスルールに違反する場合（例: 外部キー制約違反） |
| `INTERNAL_ERROR` | 500 Internal Server Error | 内部サーバーエラー | 予期しないサーバー内部エラーが発生した場合 |

**エラーレスポンス共通フォーマット**:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "ユーザー向けメッセージ",
    "details": {}
  }
}
```

- `details` はエラーコードにより内容が異なる
  - `VALIDATION_ERROR`: `{ "fieldName": ["エラーメッセージ1", "エラーメッセージ2"] }`
  - `CONFLICT`: `{ "server_updated_at": "2026-02-09T14:30:00Z" }`（最新のタイムスタンプを返却）
  - その他: `{}` または省略

### 3.9 受け入れテスト（Gherkin） [CONTRACT]

#### AT-CRUD-001: 新規作成 - 成功

```gherkin
Feature: CRUD共通 - 新規作成

  Scenario: リソースの新規作成が成功する
    Given ログイン済みのユーザーがリソース作成画面を表示している
    And ユーザーは "member" 以上の権限を持つ
    When 必須フィールドに有効な値を入力する
    And "作成する" ボタンをクリックする
    Then 成功トースト "〇〇を作成しました" が表示される
    And 詳細画面または一覧画面にリダイレクトされる
    And 作成したリソースがデータベースに保存されている
```

#### AT-CRUD-002: 新規作成 - バリデーションエラー

```gherkin
  Scenario: バリデーションエラーでフォームが保持される
    Given ログイン済みのユーザーがリソース作成画面を表示している
    When 必須フィールドを空のまま "作成する" ボタンをクリックする
    Then バリデーションエラーが各フィールドの下に赤色で表示される
    And フォームの入力内容は保持されている
    And リソースはデータベースに保存されていない
```

#### AT-CRUD-003: 詳細表示 - 成功

```gherkin
Feature: CRUD共通 - 詳細表示

  Scenario: リソースの詳細が正常に表示される
    Given ログイン済みのユーザーが存在する
    And 同一テナントに対象リソースが存在する
    When リソースの詳細画面にアクセスする
    Then リソースのデータが正しく表示される
    And 権限に応じたアクションボタンが表示される
```

#### AT-CRUD-004: 詳細表示 - 404エラー

```gherkin
  Scenario: 存在しないリソースへのアクセスで404が表示される
    Given ログイン済みのユーザーが存在する
    When 存在しないリソースIDの詳細画面にアクセスする
    Then 404 エラー画面が表示される
    And "リソースが見つかりません" メッセージが表示される
```

#### AT-CRUD-005: 編集 - 成功

```gherkin
Feature: CRUD共通 - 編集

  Scenario: リソースの編集が成功する
    Given ログイン済みのユーザーがリソース編集画面を表示している
    And フォームに既存データが事前入力されている
    When フィールドの値を変更する
    And "更新する" ボタンをクリックする
    Then 成功トースト "〇〇を更新しました" が表示される
    And 詳細画面にリダイレクトされる
    And 変更内容がデータベースに反映されている
```

#### AT-CRUD-006: 編集 - 楽観的ロック競合

```gherkin
  Scenario: 楽観的ロック競合が検知される
    Given ログイン済みのユーザーがリソース編集画面を表示している
    And 別のユーザーが同じリソースを更新済みである
    When フィールドの値を変更する
    And "更新する" ボタンをクリックする
    Then 競合エラートースト "このリソースは他のユーザーによって更新されています" が表示される
    And ページのリロードが提案される
    And データベースの値は変更されていない
```

#### AT-CRUD-007: 論理削除 - 成功

```gherkin
Feature: CRUD共通 - 削除

  Scenario: リソースの論理削除が成功する
    Given ログイン済みのユーザーがリソース詳細画面を表示している
    And ユーザーは削除権限を持つ
    When "削除" ボタンをクリックする
    Then 確認ダイアログ "「〇〇」を削除しますか？" が表示される
    When 確認ダイアログで "削除する" をクリックする
    Then 成功トースト "〇〇を削除しました" が表示される
    And 一覧画面にリダイレクトされる
    And リソースの is_active が false に設定されている
    And リソースは物理削除されていない
```

#### AT-CRUD-008: 論理削除 - 権限不足

```gherkin
  Scenario: 権限不足でリソースが削除できない
    Given ログイン済みのユーザーが "viewer" 権限である
    When リソース詳細画面を表示する
    Then "削除" ボタンは表示されない
    When API経由で DELETE リクエストを送信する
    Then 403 Forbidden レスポンスが返される
```

#### AT-CRUD-009: テナント分離

```gherkin
Feature: CRUD共通 - テナント分離

  Scenario: 他テナントのデータが表示されない
    Given テナントAのユーザーがログイン済みである
    And テナントBにリソースが存在する
    When リソース一覧画面を表示する
    Then テナントAのリソースのみが表示される
    And テナントBのリソースは表示されない
    When テナントBのリソースIDで直接アクセスする
    Then 404 エラーが返される
```

#### AT-CRUD-010: ローディング状態

```gherkin
Feature: CRUD共通 - ローディング状態

  Scenario: データ取得中にスケルトンが表示される
    Given ログイン済みのユーザーが存在する
    When リソース詳細画面にアクセスする
    Then データ取得中はスケルトンローディングが表示される
    And データ取得完了後にスケルトンが消えリソースデータが表示される
```

#### AT-CRUD-011: 二重送信防止

```gherkin
Feature: CRUD共通 - 二重送信防止

  Scenario: フォーム送信中にボタンが無効化される
    Given ログイン済みのユーザーがリソース作成画面を表示している
    When 必須フィールドに有効な値を入力する
    And "作成する" ボタンをクリックする
    Then "作成する" ボタンが即座に無効化される
    And ローディングインジケーターが表示される
    And APIレスポンスが返るまでボタンはクリックできない
```

#### AT-CRUD-012: 権限によるUIの出し分け

```gherkin
Feature: CRUD共通 - 権限チェック

  Scenario: 権限に応じてアクションボタンが制御される
    Given "viewer" 権限のユーザーがログイン済みである
    When リソース一覧画面を表示する
    Then "新規作成" ボタンは表示されない
    When リソース詳細画面を表示する
    Then "編集" ボタンは表示されない
    And "削除" ボタンは表示されない
    And リソースデータは閲覧できる
```

---

## §4. データ仕様 [CONTRACT]

### 4.1 共通カラム

全てのエンティティテーブルは以下のカラムを持つ:

```typescript
{
  id: string;              // ULID (Primary Key)
  tenant_id: string;       // テナントID (Foreign Key)
  created_at: Date;        // 作成日時
  created_by: string;      // 作成者ID (Foreign Key to users.id)
  updated_at: Date;        // 更新日時
  updated_by: string;      // 更新者ID (Foreign Key to users.id)
  is_active: boolean;      // 論理削除フラグ (true: 有効, false: 削除済み)
  // または
  deleted_at: Date | null; // 削除日時 (null: 有効, Date: 削除済み)
  deleted_by: string | null; // 削除者ID
}
```

### 4.2 論理削除パターン

**パターンA: is_active フラグ**
```typescript
{
  is_active: boolean; // デフォルト: true
}
```

**パターンB: deleted_at タイムスタンプ**
```typescript
{
  deleted_at: Date | null;   // デフォルト: null
  deleted_by: string | null; // デフォルト: null
}
```

**推奨**: パターンB（削除日時・削除者を記録できるため）

### 4.3 楽観的ロックパターン

```typescript
// 更新時に updated_at を送信
const response = await $fetch(`/api/v1/resources/${id}`, {
  method: 'PATCH',
  body: {
    ...data,
    updated_at: currentUpdatedAt, // クライアント側で保持している更新日時
  },
});

// サーバー側で競合チェック
if (resource.updated_at.getTime() !== body.updated_at.getTime()) {
  throw createError({
    statusCode: 409,
    message: 'このリソースは他のユーザーによって更新されています',
  });
}
```

---

## §5. API仕様 [CONTRACT]

### 5.1 エンドポイント一覧

| 操作 | Method | URL | 説明 |
|------|--------|-----|------|
| 一覧取得 | GET | `/api/v1/{resource}` | リソース一覧を取得 |
| 詳細取得 | GET | `/api/v1/{resource}/{id}` | 単一リソースを取得 |
| 新規作成 | POST | `/api/v1/{resource}` | リソースを作成 |
| 更新 | PATCH | `/api/v1/{resource}/{id}` | リソースを部分更新 |
| 削除 | DELETE | `/api/v1/{resource}/{id}` | リソースを論理削除 |

### 5.2 リクエスト仕様

#### 5.2.1 新規作成 (POST)

```typescript
// POST /api/v1/events
{
  "name": "セミナー名",
  "description": "説明文",
  "start_date": "2026-03-15T10:00:00Z",
  // tenant_id, created_by は認証情報から自動設定
}
```

#### 5.2.2 更新 (PATCH)

```typescript
// PATCH /api/v1/events/01HQZX1234567890ABCDEFGH
{
  "name": "更新後のセミナー名",
  "updated_at": "2026-02-09T12:00:00Z" // 楽観的ロック用
}
```

#### 5.2.3 削除 (DELETE)

```typescript
// DELETE /api/v1/events/01HQZX1234567890ABCDEFGH
// Body なし
```

### 5.3 レスポンス仕様

#### 5.3.1 成功レスポンス（単一リソース）

```typescript
{
  "data": {
    "id": "01HQZX1234567890ABCDEFGH",
    "tenant_id": "01HQZY1234567890ABCDEFGH",
    "name": "セミナー名",
    "created_at": "2026-02-09T10:00:00Z",
    "updated_at": "2026-02-09T10:00:00Z",
    "is_active": true
  }
}
```

#### 5.3.2 成功レスポンス（一覧）

```typescript
{
  "data": [
    { "id": "01HQZX...", "name": "..." },
    { "id": "01HQZY...", "name": "..." }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

#### 5.3.3 エラーレスポンス

```typescript
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラー",
    "details": {
      "name": ["名前は必須です"],
      "start_date": ["日付の形式が不正です"]
    }
  }
}
```

### 5.4 ステータスコード

| コード | 意味 | 使用場面 |
|--------|------|----------|
| 200 | OK | 取得・更新・削除成功 |
| 201 | Created | 作成成功 |
| 400 | Bad Request | バリデーションエラー |
| 401 | Unauthorized | 認証エラー |
| 403 | Forbidden | 権限エラー |
| 404 | Not Found | リソースが存在しない |
| 409 | Conflict | 楽観的ロック競合 |
| 422 | Unprocessable Entity | ビジネスルール違反 |
| 500 | Internal Server Error | サーバーエラー |

---

## §6. UI仕様 [DETAIL]

### 6.1 新規作成フォーム

**コンポーネント構成**:
```vue
<template>
  <UForm :state="formState" :schema="schema" @submit="handleSubmit">
    <UFormField name="name" label="名前">
      <UInput v-model="formState.name" />
    </UFormField>

    <UFormField name="description" label="説明">
      <UTextarea v-model="formState.description" />
    </UFormField>

    <UButton type="submit" :loading="isLoading">
      作成する
    </UButton>
  </UForm>
</template>
```

**デザイン要件**:
- ラベルはフィールドの上に配置
- 必須フィールドには `*` を表示
- エラーメッセージはフィールドの下に赤色で表示
- 送信ボタンは右下に配置

### 6.2 詳細表示

**コンポーネント構成**:
```vue
<template>
  <UCard v-if="!isLoading && data">
    <template #header>
      <h2>{{ data.name }}</h2>
      <div class="flex gap-2">
        <UButton to="./edit">編集</UButton>
        <UButton color="red" @click="handleDelete">削除</UButton>
      </div>
    </template>

    <dl>
      <dt>説明</dt>
      <dd>{{ data.description }}</dd>
      <dt>作成日時</dt>
      <dd>{{ formatDate(data.created_at) }}</dd>
    </dl>
  </UCard>

  <USkeleton v-else class="h-96" />
</template>
```

**デザイン要件**:
- カード形式で表示
- ヘッダーにタイトルとアクションボタン
- 定義リスト形式でフィールドを表示
- ローディング時はスケルトン表示

### 6.3 編集フォーム

新規作成フォームと同じUIを使用。既存データを事前入力する点が異なる。

```typescript
// Composable での実装例
const { data, pending } = await useFetch(`/api/v1/resources/${id}`);

// フォームに事前入力
watchEffect(() => {
  if (data.value) {
    formState.value = { ...data.value };
  }
});
```

### 6.4 削除確認モーダル

**コンポーネント構成**:
```vue
<template>
  <UModal v-model="isOpen">
    <UCard>
      <template #header>
        <h3>削除の確認</h3>
      </template>

      <p>「{{ resourceName }}」を削除しますか？</p>
      <p class="text-sm text-gray-500">この操作は取り消せません。</p>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="gray" @click="isOpen = false">
            キャンセル
          </UButton>
          <UButton color="red" :loading="isDeleting" @click="confirmDelete">
            削除する
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>
```

**デザイン要件**:
- モーダルは画面中央に表示
- 削除ボタンは赤色（危険色）
- リソース名を明示
- 取り消し不可の警告文を表示

### 6.5 トースト通知

```typescript
// 成功時
const toast = useToast();
toast.add({
  title: 'イベントを作成しました',
  color: 'green',
  timeout: 3000,
});

// エラー時
toast.add({
  title: 'イベントの作成に失敗しました',
  description: error.message,
  color: 'red',
  timeout: 5000,
});

// Undo付き削除通知
toast.add({
  title: 'イベントを削除しました',
  color: 'green',
  timeout: 5000,
  actions: [{
    label: '元に戻す',
    click: () => handleUndo(),
  }],
});
```

---

## §7. ビジネスルール [CORE]

### BR-001: 論理削除原則 [MUST]

**ルール**: 全ての削除操作は論理削除とし、物理削除は行わない。

**理由**:
- データの復元可能性
- 監査ログの保持
- 関連データの整合性維持

**実装**:
```typescript
// ❌ 物理削除（禁止）
await db.delete(events).where(eq(events.id, id));

// ✅ 論理削除（推奨）
await db.update(events)
  .set({
    deleted_at: new Date(),
    deleted_by: userId,
  })
  .where(eq(events.id, id));
```

### BR-002: 権限チェック [MUST]

**ルール**: 全てのCRUD操作前に、RBAC による権限チェックを実行する。

**権限マトリクス**:
| ロール | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| Admin | ✓ | ✓ | ✓ | ✓ |
| Member | ✓ | ✓ | ✓ (own) | ✓ (own) |
| Viewer | ✗ | ✓ | ✗ | ✗ |

**実装**:
```typescript
// サーバーミドルウェア
export default defineEventHandler(async (event) => {
  const user = event.context.user;
  const permission = 'events:update';

  if (!hasPermission(user, permission)) {
    throw createError({
      statusCode: 403,
      message: '権限がありません',
    });
  }
});
```

### BR-003: テナント分離 [MUST]

**ルール**: 全てのクエリに `tenant_id` フィルタを自動適用し、クロステナントアクセスを防止する。

**実装**:
```typescript
// ❌ テナント分離なし（禁止）
const events = await db.select().from(eventsTable);

// ✅ テナント分離あり（必須）
const events = await db.select()
  .from(eventsTable)
  .where(eq(eventsTable.tenant_id, tenantId));
```

**自動化**:
Drizzle ORM の拡張または Composable で自動適用する。

```typescript
// composables/useTenantQuery.ts
export const useTenantQuery = () => {
  const user = useUser();
  const tenantId = user.value.tenant_id;

  return {
    where: (table: any) => eq(table.tenant_id, tenantId),
  };
};
```

### BR-004: 楽観的ロック [MUST]

**ルール**: 更新操作時は `updated_at` による競合検知を実装する。

**競合時の処理**:
1. 409 Conflict エラーを返す
2. クライアント側でエラーを検知
3. ユーザーに最新データのリロードを提案
4. リロード後、再編集を促す

**実装**:
```typescript
// サーバー側
const [resource] = await db.select()
  .from(resourcesTable)
  .where(eq(resourcesTable.id, id));

if (resource.updated_at.getTime() !== body.updated_at) {
  throw createError({
    statusCode: 409,
    message: 'このリソースは他のユーザーによって更新されています',
  });
}
```

### BR-005: 監査ログ [SHOULD]

**ルール**: 全てのCRUD操作を監査ログに記録する。

**記録内容**:
- 操作タイプ（CREATE / UPDATE / DELETE）
- リソースタイプ・ID
- 実行ユーザー
- 実行日時
- 変更前後の値（UPDATE の場合）

---

## §8. 実装パターン [DETAIL]

### 8.1 Composable: useCrud

汎用的な CRUD 操作を提供する Composable。

```typescript
// composables/useCrud.ts
import type { z } from 'zod';

interface UseCrudOptions<T> {
  resource: string;          // リソース名（例: 'events'）
  schema?: z.ZodSchema<T>;   // バリデーションスキーマ
  redirectOnSuccess?: string; // 成功時のリダイレクト先
}

export const useCrud = <T extends Record<string, any>>(
  options: UseCrudOptions<T>
) => {
  const { resource, schema, redirectOnSuccess } = options;
  const toast = useToast();
  const router = useRouter();

  // 一覧取得
  const list = async (params?: Record<string, any>) => {
    const { data, error } = await useFetch(`/api/v1/${resource}`, {
      query: params,
    });

    if (error.value) {
      toast.add({
        title: `${resource}の取得に失敗しました`,
        color: 'red',
      });
    }

    return { data, error };
  };

  // 詳細取得
  const get = async (id: string) => {
    const { data, error, pending } = await useFetch(
      `/api/v1/${resource}/${id}`
    );

    if (error.value) {
      toast.add({
        title: `${resource}の取得に失敗しました`,
        color: 'red',
      });
    }

    return { data, error, pending };
  };

  // 作成
  const create = async (payload: T) => {
    const { data, error } = await useFetch(`/api/v1/${resource}`, {
      method: 'POST',
      body: payload,
    });

    if (error.value) {
      toast.add({
        title: `${resource}の作成に失敗しました`,
        description: error.value.message,
        color: 'red',
      });
      return { data: null, error };
    }

    toast.add({
      title: `${resource}を作成しました`,
      color: 'green',
    });

    if (redirectOnSuccess) {
      await router.push(redirectOnSuccess);
    }

    return { data, error: null };
  };

  // 更新
  const update = async (id: string, payload: Partial<T>) => {
    const { data, error } = await useFetch(`/api/v1/${resource}/${id}`, {
      method: 'PATCH',
      body: payload,
    });

    if (error.value) {
      if (error.value.statusCode === 409) {
        toast.add({
          title: '競合エラー',
          description: 'このリソースは他のユーザーによって更新されています。ページをリロードしてください。',
          color: 'red',
          timeout: 10000,
        });
      } else {
        toast.add({
          title: `${resource}の更新に失敗しました`,
          description: error.value.message,
          color: 'red',
        });
      }
      return { data: null, error };
    }

    toast.add({
      title: `${resource}を更新しました`,
      color: 'green',
    });

    return { data, error: null };
  };

  // 削除
  const remove = async (id: string, name?: string) => {
    const confirmed = await confirm(`「${name || 'このリソース'}」を削除しますか？`);
    if (!confirmed) return { data: null, error: null };

    const { data, error } = await useFetch(`/api/v1/${resource}/${id}`, {
      method: 'DELETE',
    });

    if (error.value) {
      toast.add({
        title: `${resource}の削除に失敗しました`,
        description: error.value.message,
        color: 'red',
      });
      return { data: null, error };
    }

    toast.add({
      title: `${resource}を削除しました`,
      color: 'green',
      timeout: 5000,
      actions: [{
        label: '元に戻す',
        click: () => restore(id),
      }],
    });

    if (redirectOnSuccess) {
      await router.push(redirectOnSuccess);
    }

    return { data, error: null };
  };

  // 復元（論理削除の取り消し）
  const restore = async (id: string) => {
    const { error } = await useFetch(`/api/v1/${resource}/${id}/restore`, {
      method: 'POST',
    });

    if (error.value) {
      toast.add({
        title: `${resource}の復元に失敗しました`,
        color: 'red',
      });
    } else {
      toast.add({
        title: `${resource}を復元しました`,
        color: 'green',
      });
    }
  };

  return {
    list,
    get,
    create,
    update,
    remove,
    restore,
  };
};
```

**使用例**:
```typescript
// pages/events/create.vue
const { create } = useCrud({
  resource: 'events',
  redirectOnSuccess: '/events',
});

const handleSubmit = async (data: CreateEventInput) => {
  await create(data);
};
```

### 8.2 サーバー側: 汎用CRUDハンドラー

```typescript
// server/utils/crud.ts
import { eq, and } from 'drizzle-orm';
import type { z } from 'zod';

interface CrudOptions<T> {
  table: any;                    // Drizzle テーブル定義
  createSchema?: z.ZodSchema<T>; // 作成用バリデーション
  updateSchema?: z.ZodSchema<Partial<T>>; // 更新用バリデーション
  resourceName: string;          // リソース名（エラーメッセージ用）
}

export const createCrudHandlers = <T>(options: CrudOptions<T>) => {
  const { table, createSchema, updateSchema, resourceName } = options;

  // 一覧取得
  const list = defineEventHandler(async (event) => {
    const user = event.context.user;
    const tenantId = user.tenant_id;
    const query = getQuery(event);

    const data = await useDB().select()
      .from(table)
      .where(and(
        eq(table.tenant_id, tenantId),
        eq(table.is_active, true)
      ))
      .limit(query.per_page || 20)
      .offset((query.page - 1) * (query.per_page || 20));

    const total = await useDB().select({ count: count() })
      .from(table)
      .where(and(
        eq(table.tenant_id, tenantId),
        eq(table.is_active, true)
      ));

    return {
      data,
      pagination: {
        page: query.page || 1,
        per_page: query.per_page || 20,
        total: total[0].count,
        total_pages: Math.ceil(total[0].count / (query.per_page || 20)),
      },
    };
  });

  // 詳細取得
  const get = defineEventHandler(async (event) => {
    const user = event.context.user;
    const tenantId = user.tenant_id;
    const id = getRouterParam(event, 'id');

    const [data] = await useDB().select()
      .from(table)
      .where(and(
        eq(table.id, id),
        eq(table.tenant_id, tenantId),
        eq(table.is_active, true)
      ));

    if (!data) {
      throw createError({
        statusCode: 404,
        message: `${resourceName}が見つかりません`,
      });
    }

    return { data };
  });

  // 作成
  const create = defineEventHandler(async (event) => {
    const user = event.context.user;
    const tenantId = user.tenant_id;
    const body = await readBody(event);

    // バリデーション
    if (createSchema) {
      const result = createSchema.safeParse(body);
      if (!result.success) {
        throw createError({
          statusCode: 400,
          message: 'バリデーションエラー',
          data: result.error.flatten().fieldErrors,
        });
      }
    }

    // 権限チェック
    await checkPermission(event, `${resourceName}:create`);

    const [data] = await useDB().insert(table)
      .values({
        ...body,
        id: ulid(),
        tenant_id: tenantId,
        created_by: user.id,
        updated_by: user.id,
        is_active: true,
      })
      .returning();

    return { data };
  });

  // 更新
  const update = defineEventHandler(async (event) => {
    const user = event.context.user;
    const tenantId = user.tenant_id;
    const id = getRouterParam(event, 'id');
    const body = await readBody(event);

    // バリデーション
    if (updateSchema) {
      const result = updateSchema.safeParse(body);
      if (!result.success) {
        throw createError({
          statusCode: 400,
          message: 'バリデーションエラー',
          data: result.error.flatten().fieldErrors,
        });
      }
    }

    // 権限チェック
    await checkPermission(event, `${resourceName}:update`);

    // 既存データ取得
    const [existing] = await useDB().select()
      .from(table)
      .where(and(
        eq(table.id, id),
        eq(table.tenant_id, tenantId)
      ));

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: `${resourceName}が見つかりません`,
      });
    }

    // 楽観的ロックチェック
    if (body.updated_at && existing.updated_at.getTime() !== new Date(body.updated_at).getTime()) {
      throw createError({
        statusCode: 409,
        message: 'このリソースは他のユーザーによって更新されています',
      });
    }

    const [data] = await useDB().update(table)
      .set({
        ...body,
        updated_by: user.id,
        updated_at: new Date(),
      })
      .where(eq(table.id, id))
      .returning();

    return { data };
  });

  // 削除（論理削除）
  const remove = defineEventHandler(async (event) => {
    const user = event.context.user;
    const tenantId = user.tenant_id;
    const id = getRouterParam(event, 'id');

    // 権限チェック
    await checkPermission(event, `${resourceName}:delete`);

    const [data] = await useDB().update(table)
      .set({
        deleted_at: new Date(),
        deleted_by: user.id,
        is_active: false,
      })
      .where(and(
        eq(table.id, id),
        eq(table.tenant_id, tenantId)
      ))
      .returning();

    if (!data) {
      throw createError({
        statusCode: 404,
        message: `${resourceName}が見つかりません`,
      });
    }

    return { data };
  });

  // 復元
  const restore = defineEventHandler(async (event) => {
    const user = event.context.user;
    const tenantId = user.tenant_id;
    const id = getRouterParam(event, 'id');

    // 権限チェック
    await checkPermission(event, `${resourceName}:restore`);

    const [data] = await useDB().update(table)
      .set({
        deleted_at: null,
        deleted_by: null,
        is_active: true,
      })
      .where(and(
        eq(table.id, id),
        eq(table.tenant_id, tenantId)
      ))
      .returning();

    return { data };
  });

  return { list, get, create, update, remove, restore };
};
```

**使用例**:
```typescript
// server/api/v1/events/index.get.ts
import { events } from '~/server/database/schema';

const { list } = createCrudHandlers({
  table: events,
  resourceName: 'events',
});

export default list;
```

### 8.3 バリデーションスキーマパターン

```typescript
// types/event.schema.ts
import { z } from 'zod';

// 共通フィールド
const baseEventSchema = z.object({
  name: z.string().min(1, '名前は必須です').max(100, '名前は100文字以内で入力してください'),
  description: z.string().optional(),
  start_date: z.string().datetime('日付の形式が不正です'),
  end_date: z.string().datetime('日付の形式が不正です'),
});

// 作成用スキーマ
export const createEventSchema = baseEventSchema;

// 更新用スキーマ（部分更新）
export const updateEventSchema = baseEventSchema.partial().extend({
  updated_at: z.string().datetime(), // 楽観的ロック用
});

// 型推論
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
```

### 8.4 UForm統合パターン

```vue
<script setup lang="ts">
import { createEventSchema, type CreateEventInput } from '~/types/event.schema';

const { create } = useCrud<CreateEventInput>({
  resource: 'events',
  schema: createEventSchema,
  redirectOnSuccess: '/events',
});

const formState = reactive<CreateEventInput>({
  name: '',
  description: '',
  start_date: '',
  end_date: '',
});

const handleSubmit = async (data: CreateEventInput) => {
  await create(data);
};
</script>

<template>
  <UForm
    :state="formState"
    :schema="createEventSchema"
    @submit="handleSubmit"
  >
    <UFormField name="name" label="イベント名" required>
      <UInput v-model="formState.name" placeholder="例: 春の経営セミナー" />
    </UFormField>

    <UFormField name="description" label="説明">
      <UTextarea v-model="formState.description" rows="4" />
    </UFormField>

    <UFormField name="start_date" label="開始日時" required>
      <UInput v-model="formState.start_date" type="datetime-local" />
    </UFormField>

    <UFormField name="end_date" label="終了日時" required>
      <UInput v-model="formState.end_date" type="datetime-local" />
    </UFormField>

    <div class="flex justify-end gap-2">
      <UButton to="/events" color="gray">キャンセル</UButton>
      <UButton type="submit">作成する</UButton>
    </div>
  </UForm>
</template>
```

---

## §9. エラーハンドリング [DETAIL]

### 9.1 クライアント側エラー処理

```typescript
// composables/useErrorHandler.ts
export const useErrorHandler = () => {
  const toast = useToast();

  const handleError = (error: any, context?: string) => {
    // バリデーションエラー
    if (error.statusCode === 400) {
      toast.add({
        title: 'バリデーションエラー',
        description: '入力内容を確認してください',
        color: 'red',
      });
      return;
    }

    // 認証エラー
    if (error.statusCode === 401) {
      toast.add({
        title: '認証エラー',
        description: 'ログインしてください',
        color: 'red',
      });
      navigateTo('/login');
      return;
    }

    // 権限エラー
    if (error.statusCode === 403) {
      toast.add({
        title: '権限エラー',
        description: 'この操作を実行する権限がありません',
        color: 'red',
      });
      return;
    }

    // 404エラー
    if (error.statusCode === 404) {
      toast.add({
        title: 'リソースが見つかりません',
        color: 'red',
      });
      return;
    }

    // 競合エラー
    if (error.statusCode === 409) {
      toast.add({
        title: '競合エラー',
        description: 'このリソースは他のユーザーによって更新されています。ページをリロードしてください。',
        color: 'red',
        timeout: 10000,
      });
      return;
    }

    // その他のエラー
    toast.add({
      title: `エラーが発生しました${context ? `: ${context}` : ''}`,
      description: error.message || '不明なエラー',
      color: 'red',
    });
  };

  return { handleError };
};
```

### 9.2 サーバー側エラー処理

```typescript
// server/utils/error.ts
export const handleApiError = (error: any) => {
  console.error('[API Error]', error);

  // Zod バリデーションエラー
  if (error.name === 'ZodError') {
    throw createError({
      statusCode: 400,
      message: 'バリデーションエラー',
      data: error.flatten().fieldErrors,
    });
  }

  // Drizzle エラー
  if (error.code === '23505') { // Unique制約違反
    throw createError({
      statusCode: 409,
      message: 'このリソースは既に存在します',
    });
  }

  if (error.code === '23503') { // 外部キー制約違反
    throw createError({
      statusCode: 422,
      message: '関連するリソースが存在しません',
    });
  }

  // デフォルトエラー
  throw createError({
    statusCode: 500,
    message: '内部サーバーエラー',
  });
};
```

---

## §10. テスト仕様 [DETAIL]

### 10.1 ユニットテスト（Composable）

```typescript
// tests/unit/composables/useCrud.test.ts
import { describe, it, expect, vi } from 'vitest';
import { useCrud } from '~/composables/useCrud';

describe('useCrud', () => {
  it('should create resource successfully', async () => {
    const { create } = useCrud({
      resource: 'events',
    });

    const mockData = { name: 'Test Event' };
    const { data, error } = await create(mockData);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.name).toBe('Test Event');
  });

  it('should handle validation error', async () => {
    const { create } = useCrud({
      resource: 'events',
    });

    const mockData = { name: '' }; // Invalid
    const { data, error } = await create(mockData);

    expect(error).toBeDefined();
    expect(error.statusCode).toBe(400);
  });
});
```

### 10.2 統合テスト（API）

```typescript
// tests/integration/api/events.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestUser, createTestEvent } from '~/tests/factories';

describe('Events API', () => {
  let user: any;
  let token: string;

  beforeEach(async () => {
    user = await createTestUser();
    token = await generateToken(user);
  });

  it('POST /api/v1/events - should create event', async () => {
    const response = await $fetch('/api/v1/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        name: 'Test Event',
        start_date: '2026-03-15T10:00:00Z',
        end_date: '2026-03-15T12:00:00Z',
      },
    });

    expect(response.data).toBeDefined();
    expect(response.data.name).toBe('Test Event');
  });

  it('PATCH /api/v1/events/:id - should detect conflict', async () => {
    const event = await createTestEvent(user);

    // 別のユーザーが更新
    await updateEventByAnotherUser(event.id);

    // 古い updated_at で更新試行
    const response = await $fetch(`/api/v1/events/${event.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        name: 'Updated Name',
        updated_at: event.updated_at, // 古い値
      },
    });

    expect(response.error.statusCode).toBe(409);
  });
});
```

### 10.3 E2Eテスト（Playwright）

```typescript
// tests/e2e/events-crud.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Events CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should create, read, update, delete event', async ({ page }) => {
    // 作成
    await page.goto('/events/create');
    await page.fill('[name="name"]', 'E2E Test Event');
    await page.fill('[name="start_date"]', '2026-03-15T10:00');
    await page.fill('[name="end_date"]', '2026-03-15T12:00');
    await page.click('button[type="submit"]');

    // 成功トーストを確認
    await expect(page.getByText('イベントを作成しました')).toBeVisible();

    // 詳細画面に遷移
    await expect(page).toHaveURL(/\/events\/.+/);
    await expect(page.getByText('E2E Test Event')).toBeVisible();

    // 編集
    await page.click('text=編集');
    await page.fill('[name="name"]', 'Updated E2E Test Event');
    await page.click('button[type="submit"]');
    await expect(page.getByText('イベントを更新しました')).toBeVisible();

    // 削除
    await page.click('text=削除');
    await page.click('button:has-text("削除する")'); // モーダル内
    await expect(page.getByText('イベントを削除しました')).toBeVisible();
    await expect(page).toHaveURL('/events');
  });
});
```

---

## §11. 非機能要件 [DETAIL]

### 11.1 パフォーマンス

| 項目 | 目標 |
|------|------|
| API応答時間 | 200ms以内（95パーセンタイル） |
| フォーム送信時間 | 500ms以内 |
| 一覧取得時間 | 300ms以内（20件） |
| スケルトン表示遅延 | 100ms以内 |

### 11.2 セキュリティ

- 全APIエンドポイントで認証必須
- RBAC による権限チェック
- テナント分離の徹底
- SQL インジェクション対策（Drizzle ORM）
- XSS 対策（Vue の自動エスケープ）
- CSRF 対策（Better Auth）

### 11.3 アクセシビリティ

- フォームフィールドに適切な label
- キーボード操作対応
- スクリーンリーダー対応（aria-label）
- エラーメッセージの明確な表示

### 11.4 監視・ログ

- 全 CRUD 操作を監査ログに記録
- エラー発生時のスタックトレース記録
- パフォーマンスメトリクス記録

---

## §12. 未決定事項・制約 [CONTRACT]

### 前提条件

- Drizzle ORM によるクエリビルド
- Zod スキーマによるバリデーション
- Better Auth によるセッション管理
- ROLE-001 による権限チェック

### 制約

- 物理削除は使用しない（論理削除のみ）
- 一括操作は本仕様の範囲外
- 楽観的ロックは updated_at ベース

### 未決定事項

| 項目ID | 項目 | 選択肢 | 期限 | 決定者 |
|--------|------|--------|------|--------|
| CRUD-TBD-01 | 楽観的ロック実装方式 | (1) updated_at比較 (2) versionカラム追加 | MVP前 | Tech Lead |
| CRUD-TBD-02 | 連続作成モード | (1) MVP実装 (2) Post-MVP | Sprint 3 | PO |
| CRUD-TBD-03 | 論理削除後の復元UI | (1) 管理画面のみ (2) ユーザー向けUI | Post-MVP | PO |

---

## §13. 変更履歴 [CORE]

| 日付 | バージョン | 変更者 | 変更内容 |
|------|-----------|--------|---------|
| 2026-02-09 | 1.0 | Claude | 初版作成 |
| 2026-02-09 | 1.1 | Claude | §3-E 入出力例, §3-F 境界値, §3-G 例外レスポンス, §3-H 受け入れテスト, §12 未決定事項・制約を追加 |
