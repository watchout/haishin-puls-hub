# EVT-010～014: マスタースケジュール（タスク・締め切り管理）

**機能ID**: EVT-010, EVT-011, EVT-012, EVT-013, EVT-014
**機能名**: イベント種別ごとの標準タスクテンプレート自動展開 / 相対日ベースのタスクスケジューリング / ロール別自動アサイン / ロール別ビュー切替 / 締め切りリマインド自動通知
**担当**: Backend + Frontend
**優先度**: P0（MVP必須）
**ステータス**: Draft
**最終更新**: 2026-02-09

---

## §1. 概要（Summary）

[CORE]

### 1.1 機能の目的

セミナー・イベント運営における「誰が」「いつまでに」「何をするか」を一元管理し、運営チーム全体の進捗を可視化するマスタースケジュール機能。イベント種別ごとに標準化されたタスクテンプレートを自動展開し、相対日（D-30, D-7, D+1等）ベースで締め切りを自動計算、ロール別に適切なタスクを自動アサインすることで、計画立案の手間を大幅に削減する。

### 1.2 解決する課題

- **現状**: Excelやスプレッドシートで個別にタスク管理しており、ロールをまたいだ進捗共有が困難
- **課題**: イベントごとに毎回ゼロからタスクリストを作成しており、漏れや遅延が発生
- **解決**: イベント種別に応じた標準タスクテンプレートを自動展開し、開催日基準で締め切りを自動計算、ロール別にタスクをフィルタリング表示することで、全プレイヤーが自分のやるべきことを即座に把握できる

### 1.3 ユーザー価値

- **主催者**: 全体進捗を一目で把握でき、遅延リスクを早期検知
- **会場担当**: 会場準備に関連するタスクのみに集中でき、漏れを防止
- **配信担当**: 配信・撮影関連タスクに特化した締め切り管理が可能
- **企画代行**: 複数クライアントのイベントを横断的に管理し、タスク進捗を一覧
- **全ロール**: 締め切りリマインド通知により、タスク漏れ・遅延を防止

---

## §2. 目的（Purpose）

[CORE]

### 2.1 ビジネス目的

1. **運営効率化**: タスクテンプレート自動展開により、計画立案時間を80%削減
2. **品質向上**: 標準化されたタスクリストにより、運営漏れ・ミスを防止
3. **透明性確保**: ロールをまたいだ進捗共有により、チーム全体の状況を可視化
4. **リスク管理**: 締め切りベースのリマインド通知により、遅延リスクを早期検知

### 2.2 技術目的

1. **再利用性**: イベント種別ごとのテンプレート管理により、知見を蓄積・再利用
2. **柔軟性**: 相対日ベースのスケジューリングにより、開催日変更に自動追従
3. **拡張性**: ロールベースのアクセス制御により、組織拡大に対応
4. **通知連携**: NOTIF-001との統合により、締め切り管理を自動化

---

## §3. 機能要件（Functional Requirements）

[CORE]

### FR-EVT-010: イベント種別ごとの標準タスクテンプレート自動展開

#### FR-EVT-010-1: テンプレート自動展開
- イベント作成時に `event_type` に応じた標準タスクテンプレートを自動展開
- システム標準テンプレート（`tenant_id=NULL`）またはテナント独自テンプレート（`tenant_id!=NULL`）を優先順位で選択
- テンプレート展開時に `relative_day` を基準に `due_at` を自動計算（§7.1参照）

#### FR-EVT-010-2: テンプレート内容
- タスク名（`title`）
- 説明（`description`）
- 担当ロール（`assigned_role`: `organizer`, `venue`, `streaming`, `event_planner`, 等）
- 相対日（`relative_day`: D-30=-30, D-7=-7, D+1=1）
- 優先度（`priority`: `high`, `medium`, `low`）
- 表示順序（`sort_order`）

#### FR-EVT-010-3: タスクの個別編集
- 展開後のタスクは個別に編集・削除・追加可能
- タスク状態: `pending`, `in_progress`, `completed`, `skipped`
- 担当ロールだけでなく特定ユーザー（`assigned_user_id`）へのアサイン可能

#### FR-EVT-010-4: テンプレート管理（管理者）
- 管理者（`tenant_admin`, `system_admin`）はテンプレートの追加・編集・削除が可能
- テンプレートの有効化/無効化（`is_active`）
- テナントごとのカスタムテンプレート作成

#### FR-EVT-010-5: 進捗管理
- タスク状態の更新（未着手→進行中→完了/スキップ）
- 完了日時（`completed_at`）の自動記録
- イベント全体の進捗率計算（完了タスク数 / 全タスク数）

---

### FR-EVT-011: 相対日ベースのタスクスケジューリング

#### FR-EVT-011-1: 相対日の定義
- `D-30`: 開催日の30日前
- `D-7`: 開催日の7日前
- `D-1`: 開催日の前日
- `D+0`: 開催日当日
- `D+1`: 開催日の翌日
- 相対日は負の整数（開催日前）、0（当日）、正の整数（開催日後）で表現

#### FR-EVT-011-2: 締め切り自動計算
- テンプレート展開時に `relative_day` と `event.scheduled_at` から `due_at` を計算
- 計算式: `due_at = event.scheduled_at + relative_day（日）`
- 開催日変更時に全タスクの `due_at` を自動再計算（§7.2参照）

#### FR-EVT-011-3: 時刻設定
- デフォルトは相対日の23:59（終日タスク）
- 個別タスクで時刻を指定可能（例: D-1 15:00）

---

### FR-EVT-012: ロール別自動アサイン

#### FR-EVT-012-1: ロールベースのアサイン
- テンプレートの `assigned_role` に基づき、タスクを自動アサイン
- イベントメンバー（`event_members`）のロールと照合し、該当ロールを持つユーザーに表示

#### FR-EVT-012-2: 複数ロール対応
- 1タスクに複数ロールを指定可能（例: `organizer`, `event_planner`）
- JSON配列または関連テーブルで管理（実装時に選択）

#### FR-EVT-012-3: 個別ユーザーアサイン
- ロールに加えて特定ユーザー（`assigned_user_id`）を指定可能
- 個別アサインがある場合はロールベースよりも優先

---

### FR-EVT-013: ロール別ビュー切替

#### FR-EVT-013-1: ロール別デフォルトビュー
- ログインユーザーのロールに応じたデフォルトダッシュボードを表示
- ロール判定は `event_members.role` または組織ロール（`member_roles.role`）を優先

#### FR-EVT-013-2: 主催者ビュー
- イベント全体の進捗（全タスクのステータス集計）
- 自分がアサインされたタスク
- 遅延リスクのあるタスク（期限超過・期限3日以内）をハイライト

#### FR-EVT-013-3: 会場担当ビュー
- 会場準備関連タスクのみフィルタリング（`assigned_role='venue'`）
- 会場に関する情報・添付資料へのクイックアクセス

#### FR-EVT-013-4: 配信担当ビュー
- 配信・撮影関連タスクのみフィルタリング（`assigned_role='streaming'`）
- 配信設定・機材チェックリストへのリンク

#### FR-EVT-013-5: 企画代行ビュー
- 担当クライアントのイベント一覧
- クライアント別のタスク進捗サマリー
- 複数イベントを横断的に管理するダッシュボード

#### FR-EVT-013-6: ビュー切替
- ユーザーは手動でビューを切り替え可能（全体/自分のタスク/ロール別）
- フィルター条件の保存（ローカルストレージまたはユーザー設定）

---

### FR-EVT-014: 締め切りリマインド自動通知

#### FR-EVT-014-1: リマインド通知タイミング
- 締め切り7日前
- 締め切り3日前
- 締め切り1日前
- 締め切り当日（未完了の場合）
- 締め切り超過（未完了の場合）

#### FR-EVT-014-2: 通知対象
- タスクにアサインされたユーザー（`assigned_user_id`）
- アサインされたロールを持つイベントメンバー（`assigned_role`）
- イベント主催者（全タスクの進捗管理のため）

#### FR-EVT-014-3: 通知内容
- タスク名
- イベント名
- 締め切り日時
- 現在のステータス
- タスク詳細ページへのリンク

#### FR-EVT-014-4: 通知チャネル
- システム内通知（NOTIF-001連携）
- メール通知（オプション）
- Slack/Teams連携（将来拡張）

#### FR-EVT-014-5: 通知設定
- ユーザーごとの通知設定（オン/オフ、タイミング調整）
- イベントごとの通知設定（重要イベントのみ強化）

---

### §3-E. 入出力例（I/O Examples）

[CONTRACT]

| # | 操作 | メソッド | エンドポイント | ステータス |
|---|------|----------|---------------|-----------|
| 1 | スケジュール作成 | POST | `/api/v1/events/:id/schedule` | 201 Created |
| 2 | スケジュール取得 | GET | `/api/v1/events/:id/schedule` | 200 OK |
| 3 | タイムライン更新 | PATCH | `/api/v1/schedule/:id` | 200 OK |
| 4 | スケジュール項目削除 | DELETE | `/api/v1/schedule/:id` | 200 OK |
| 5 | ガントチャート表示 | GET | `/api/v1/events/:id/gantt` | 200 OK |
| 6 | 自動スケジュール提案 | POST | `/api/v1/events/:id/schedule/suggest` | 200 OK |
| 7 | テンプレート自動展開 | POST | `/api/v1/events/:id/tasks/generate` | 201 Created |
| 8 | ロール別タスク一覧取得 | GET | `/api/v1/events/:id/tasks?role=:role` | 200 OK |

---

### §3-F. 境界値（Boundary Values）

[CONTRACT]

| フィールド | 制約 | 説明 |
|-----------|------|------|
| `title` | max=200文字 | タスク名。空文字不可、1文字以上 |
| `description` | max=2000文字 | タスク説明。NULL許容 |
| `duration` | min=5分, max=1440分(24h) | タスク所要時間 |
| `start / end` | ISO8601形式 | `start < end` を必ず満たすこと |
| `relative_day` | -365 ～ +365 | 開催日からの相対日数 |
| `sort_order` | 0 ～ 9999 | 表示順序 |
| `同時セッション数` | max=10 | 同一時間帯に並行するセッションの上限 |
| `1イベントあたりタスク数` | max=200 | 1イベントに紐づくタスクの上限 |

---

### §3-G. 例外レスポンス（Error Responses）

[CONTRACT]

| エラーコード | HTTPステータス | 意味 | レスポンス例 |
|-------------|---------------|------|-------------|
| `VALIDATION_ERROR` | 400 Bad Request | 入力値バリデーション失敗（title未入力、duration範囲外、start >= end 等） | `{ "error": { "code": "VALIDATION_ERROR", "message": "title is required", "details": [...] } }` |
| `NOT_FOUND` | 404 Not Found | 指定されたスケジュール・タスク・イベントが存在しない | `{ "error": { "code": "NOT_FOUND", "message": "Schedule not found" } }` |
| `SCHEDULE_CONFLICT` | 409 Conflict | タスクの時間帯が既存スケジュールと競合、または同時セッション数上限超過 | `{ "error": { "code": "SCHEDULE_CONFLICT", "message": "Time slot conflicts with existing schedule", "details": { "conflictingIds": [...] } } }` |
| `FORBIDDEN` | 403 Forbidden | 操作権限なし（ロール不足、他テナントのリソースへのアクセス） | `{ "error": { "code": "FORBIDDEN", "message": "Insufficient permissions" } }` |

---

### §3-H. 受け入れテスト（Acceptance Tests）

[CONTRACT]

#### AT-SCHED-001: スケジュール自動展開

```gherkin
Feature: マスタースケジュール自動展開
  Scenario: イベント作成時にテンプレートからタスクが自動展開される
    Given イベント種別「セミナー」のテンプレートが3件登録されている
    And 開催日が「2026-03-15」のイベントを作成する
    When テンプレート自動展開APIを実行する
    Then 3件のタスクが作成される
    And 各タスクの締め切り日が開催日基準で正しく計算されている
```

#### AT-SCHED-002: 開催日変更時の自動再計算

```gherkin
Feature: 開催日変更時の締め切り再計算
  Scenario: 開催日を変更すると相対日タスクの締め切りが再計算される
    Given イベント「event-1」の開催日が「2026-03-15」である
    And 相対日D-7のタスクが存在し締め切りが「2026-03-08」である
    When 開催日を「2026-03-22」に変更する
    Then タスクの締め切りが「2026-03-15」に更新される
    And 手動設定（relative_day=NULL）のタスクは変更されない
```

#### AT-SCHED-003: ロール別ビュー表示

```gherkin
Feature: ロール別ビュー切替
  Scenario: 会場担当がログインすると会場タスクのみ表示される
    Given ユーザー「山田」がロール「venue」でイベントに参加している
    And イベントに全ロール合計10件のタスクが存在する
    When 山田がイベントダッシュボードを開く
    Then 「venue」ロールのタスクのみ（3件）が表示される
    And 進捗率は会場タスクのみで計算される
```

#### AT-SCHED-004: 締め切りリマインド通知

```gherkin
Feature: 締め切りリマインド通知
  Scenario: 締め切り3日前にリマインド通知が送信される
    Given タスク「会場レイアウト確認」の締め切りが3日後である
    And タスクのステータスが「pending」である
    When リマインドバッチジョブが実行される
    Then アサインされたユーザーに通知が送信される
    And 主催者にも通知が送信される
```

#### AT-SCHED-005: タスクステータス遷移

```gherkin
Feature: タスクステータス遷移
  Scenario: タスクを完了にすると完了日時が記録される
    Given タスク「企画書作成」のステータスが「in_progress」である
    When タスクを「completed」に変更する
    Then ステータスが「completed」になる
    And completed_atに現在時刻が設定される
    And イベント全体の進捗率が再計算される
```

#### AT-SCHED-006: ガントチャート表示

```gherkin
Feature: ガントチャート表示
  Scenario: イベントのタスクをガントチャート形式で表示する
    Given イベント「event-1」に10件のタスクが存在する
    And 各タスクに締め切り日が設定されている
    When ガントチャートAPIを呼び出す
    Then タスクが時系列順に整列して返される
    And 開催日がマイルストーンとして含まれる
```

#### AT-SCHED-007: スケジュール競合検出

```gherkin
Feature: スケジュール競合検出
  Scenario: 同一時間帯に重複するスケジュールを作成するとエラーになる
    Given 「2026-03-15 14:00-15:00」のスケジュールが既に存在する
    And 同時セッション数の上限が10である
    When 同一時間帯に11件目のスケジュールを作成しようとする
    Then 409 SCHEDULE_CONFLICT エラーが返される
    And 競合するスケジュールIDがレスポンスに含まれる
```

#### AT-SCHED-008: AI自動スケジュール提案

```gherkin
Feature: AI自動スケジュール提案
  Scenario: AIがイベント情報に基づいてスケジュールを提案する
    Given イベント種別が「conference」で参加予定人数が100名である
    And テンプレートが存在しない
    When 自動スケジュール提案APIを実行する
    Then AIが生成したタスクリストが返される
    And 各タスクに適切なロールと相対日が設定されている
    And レスポンス時間が10秒以内である
```

---

## §4. データモデル（Data Model）

[CORE]

### 4.1 テーブル定義

#### 4.1.1 tasks テーブル

```typescript
// server/database/schema/tasks.ts
import { pgTable, uuid, text, integer, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { events } from './events';
import { tenants } from './tenants';
import { users } from './users';
import { taskTemplates } from './task-templates';

export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'completed', 'skipped']);
export const taskPriorityEnum = pgEnum('task_priority', ['high', 'medium', 'low']);

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),

  // タスク基本情報
  title: text('title').notNull(),
  description: text('description'),

  // アサイン
  assignedRole: text('assigned_role'), // 'organizer', 'venue', 'streaming', 'event_planner', etc.
  assignedUserId: uuid('assigned_user_id').references(() => users.id, { onDelete: 'set null' }),

  // ステータス・優先度
  status: taskStatusEnum('status').notNull().default('pending'),
  priority: taskPriorityEnum('priority').notNull().default('medium'),

  // スケジューリング
  relativeDay: integer('relative_day'), // D-30=-30, D+1=1, null=手動設定
  dueAt: timestamp('due_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),

  // 表示順序
  sortOrder: integer('sort_order').notNull().default(0),

  // テンプレート参照（どのテンプレートから生成されたか）
  templateId: uuid('template_id').references(() => taskTemplates.id, { onDelete: 'set null' }),

  // タイムスタンプ
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

#### 4.1.2 task_templates テーブル

```typescript
// server/database/schema/task-templates.ts
import { pgTable, uuid, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { taskPriorityEnum } from './tasks';

export const taskTemplates = pgTable('task_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }), // NULL = システム標準

  // イベント種別
  eventType: text('event_type').notNull(), // 'seminar', 'workshop', 'conference', 'webinar', etc.

  // テンプレート内容
  title: text('title').notNull(),
  description: text('description'),
  assignedRole: text('assigned_role').notNull(),
  relativeDay: integer('relative_day').notNull(), // 相対日（必須）
  priority: taskPriorityEnum('priority').notNull().default('medium'),
  sortOrder: integer('sort_order').notNull().default(0),

  // 有効化フラグ
  isActive: boolean('is_active').notNull().default(true),

  // タイムスタンプ
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### 4.2 インデックス

[DETAIL]

```typescript
// tasks テーブル
- INDEX idx_tasks_event_id ON tasks(event_id)
- INDEX idx_tasks_tenant_id ON tasks(tenant_id)
- INDEX idx_tasks_assigned_user_id ON tasks(assigned_user_id)
- INDEX idx_tasks_status ON tasks(status)
- INDEX idx_tasks_due_at ON tasks(due_at)
- INDEX idx_tasks_assigned_role ON tasks(assigned_role)

// task_templates テーブル
- INDEX idx_task_templates_tenant_id ON task_templates(tenant_id)
- INDEX idx_task_templates_event_type ON task_templates(event_type)
- INDEX idx_task_templates_is_active ON task_templates(is_active)
```

### 4.3 リレーション

[DETAIL]

```typescript
// server/database/schema/relations.ts
import { relations } from 'drizzle-orm';
import { tasks, taskTemplates, events, tenants, users } from './schema';

export const tasksRelations = relations(tasks, ({ one }) => ({
  event: one(events, {
    fields: [tasks.eventId],
    references: [events.id],
  }),
  tenant: one(tenants, {
    fields: [tasks.tenantId],
    references: [tenants.id],
  }),
  assignedUser: one(users, {
    fields: [tasks.assignedUserId],
    references: [users.id],
  }),
  template: one(taskTemplates, {
    fields: [tasks.templateId],
    references: [taskTemplates.id],
  }),
}));

export const taskTemplatesRelations = relations(taskTemplates, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [taskTemplates.tenantId],
    references: [tenants.id],
  }),
  tasks: many(tasks),
}));
```

---

## §5. API仕様（API Specification）

[CONTRACT]

### 5.1 タスク一覧取得

**エンドポイント**: `GET /api/v1/events/:eventId/tasks`

**認証**: Required
**権限**: イベントメンバーまたはテナントメンバー

**クエリパラメータ**:

```typescript
interface GetTasksQuery {
  role?: string;              // ロールでフィルタ（例: 'venue'）
  status?: TaskStatus;        // ステータスでフィルタ
  assignedUserId?: string;    // 特定ユーザーのタスクのみ
  includeCompleted?: boolean; // 完了タスクを含むか（デフォルト: true）
  sortBy?: 'due_at' | 'priority' | 'sort_order'; // ソート基準（デフォルト: 'sort_order'）
}
```

**レスポンス**:

```typescript
interface GetTasksResponse {
  tasks: Array<{
    id: string;
    eventId: string;
    title: string;
    description: string | null;
    assignedRole: string | null;
    assignedUser: {
      id: string;
      name: string;
      email: string;
    } | null;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    priority: 'high' | 'medium' | 'low';
    relativeDay: number | null;
    dueAt: string | null;
    completedAt: string | null;
    sortOrder: number;
    templateId: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  summary: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    skipped: number;
    overdue: number; // 期限超過タスク数
  };
}
```

**エラー**:
- `401`: 未認証
- `403`: 権限なし
- `404`: イベントが存在しない

---

### 5.2 タスク作成

**エンドポイント**: `POST /api/v1/events/:eventId/tasks`

**認証**: Required
**権限**: `organizer` または `event_planner`

**リクエストボディ**:

```typescript
interface CreateTaskRequest {
  title: string;
  description?: string;
  assignedRole?: string;
  assignedUserId?: string;
  priority?: 'high' | 'medium' | 'low';
  relativeDay?: number;   // 指定時は dueAt を自動計算
  dueAt?: string;         // ISO8601形式、relativeDay と排他
  sortOrder?: number;     // 未指定時は最後尾
}
```

**レスポンス**:

```typescript
interface CreateTaskResponse {
  task: Task; // GetTasksResponse の task と同型
}
```

**バリデーション**:
- `title`: 必須、1～200文字
- `relativeDay` と `dueAt` は排他（両方指定時はエラー）
- `assignedRole` または `assignedUserId` のいずれか必須

**エラー**:
- `400`: バリデーションエラー
- `401`: 未認証
- `403`: 権限なし
- `404`: イベントが存在しない

---

### 5.3 タスク更新

**エンドポイント**: `PATCH /api/v1/tasks/:taskId`

**認証**: Required
**権限**: タスクにアサインされたユーザー、または `organizer`, `event_planner`

**リクエストボディ**:

```typescript
interface UpdateTaskRequest {
  title?: string;
  description?: string;
  assignedRole?: string;
  assignedUserId?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
  priority?: 'high' | 'medium' | 'low';
  relativeDay?: number;
  dueAt?: string;
  sortOrder?: number;
}
```

**レスポンス**:

```typescript
interface UpdateTaskResponse {
  task: Task;
}
```

**ビジネスルール**:
- `status` を `completed` に変更時、`completedAt` を自動設定
- `relativeDay` 変更時、`dueAt` を自動再計算

**エラー**:
- `400`: バリデーションエラー
- `401`: 未認証
- `403`: 権限なし
- `404`: タスクが存在しない

---

### 5.4 タスク完了

**エンドポイント**: `POST /api/v1/tasks/:taskId/complete`

**認証**: Required
**権限**: タスクにアサインされたユーザー、または `organizer`, `event_planner`

**リクエストボディ**: なし

**レスポンス**:

```typescript
interface CompleteTaskResponse {
  task: Task; // status='completed', completedAt=現在時刻
}
```

**ビジネスルール**:
- `status` を `completed` に変更
- `completedAt` を現在時刻で設定

**エラー**:
- `401`: 未認証
- `403`: 権限なし
- `404`: タスクが存在しない
- `409`: 既に完了済み

---

### 5.5 タスク削除

**エンドポイント**: `DELETE /api/v1/tasks/:taskId`

**認証**: Required
**権限**: `organizer` または `event_planner`

**レスポンス**:

```typescript
interface DeleteTaskResponse {
  success: true;
}
```

**エラー**:
- `401`: 未認証
- `403`: 権限なし
- `404`: タスクが存在しない

---

### 5.6 タスクテンプレート自動生成（AI）

**エンドポイント**: `POST /api/v1/events/:eventId/tasks/generate`

**認証**: Required
**権限**: `organizer` または `event_planner`

**リクエストボディ**:

```typescript
interface GenerateTasksRequest {
  useTemplate?: boolean;      // デフォルト: true（テンプレート使用）
  customPrompt?: string;      // AI生成時の追加指示（オプション）
  overwrite?: boolean;        // 既存タスクを上書きするか（デフォルト: false）
}
```

**レスポンス**:

```typescript
interface GenerateTasksResponse {
  tasks: Task[];
  summary: {
    generated: number;
    fromTemplate: number;
    fromAI: number;
  };
}
```

**ビジネスルール**:
1. `useTemplate=true` の場合:
   - イベントの `event_type` に一致するテンプレートを検索
   - テナント独自テンプレート（`tenant_id=current`）を優先
   - なければシステム標準テンプレート（`tenant_id=NULL`）を使用
   - `is_active=true` のテンプレートのみ対象
2. テンプレートがない、または `useTemplate=false` の場合:
   - AI（Claude）にイベント情報を渡してタスクリストを生成
   - `customPrompt` があれば追加指示として利用
3. `overwrite=true` の場合:
   - 既存タスクを全削除してから生成
   - デフォルトは追加モード

**エラー**:
- `400`: バリデーションエラー
- `401`: 未認証
- `403`: 権限なし
- `404`: イベントが存在しない
- `500`: AI生成エラー

---

### 5.7 タスクテンプレート一覧取得

**エンドポイント**: `GET /api/v1/task-templates`

**認証**: Required
**権限**: `tenant_admin` または `system_admin`

**クエリパラメータ**:

```typescript
interface GetTaskTemplatesQuery {
  eventType?: string;     // イベント種別でフィルタ
  isActive?: boolean;     // 有効/無効でフィルタ
  includeSystem?: boolean; // システム標準を含むか（デフォルト: true）
}
```

**レスポンス**:

```typescript
interface GetTaskTemplatesResponse {
  templates: Array<{
    id: string;
    tenantId: string | null;
    eventType: string;
    title: string;
    description: string | null;
    assignedRole: string;
    relativeDay: number;
    priority: 'high' | 'medium' | 'low';
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
}
```

**エラー**:
- `401`: 未認証
- `403`: 権限なし

---

### 5.8 タスクテンプレート作成

**エンドポイント**: `POST /api/v1/task-templates`

**認証**: Required
**権限**: `tenant_admin` または `system_admin`

**リクエストボディ**:

```typescript
interface CreateTaskTemplateRequest {
  eventType: string;
  title: string;
  description?: string;
  assignedRole: string;
  relativeDay: number;
  priority?: 'high' | 'medium' | 'low';
  sortOrder?: number;
  isActive?: boolean;
}
```

**レスポンス**:

```typescript
interface CreateTaskTemplateResponse {
  template: TaskTemplate;
}
```

**バリデーション**:
- `title`: 必須、1～200文字
- `assignedRole`: 必須
- `relativeDay`: 必須、-365 ～ 365の範囲

**エラー**:
- `400`: バリデーションエラー
- `401`: 未認証
- `403`: 権限なし

---

### 5.9 タスクテンプレート更新

**エンドポイント**: `PATCH /api/v1/task-templates/:templateId`

**認証**: Required
**権限**: `tenant_admin` または `system_admin`

**リクエストボディ**:

```typescript
interface UpdateTaskTemplateRequest {
  title?: string;
  description?: string;
  assignedRole?: string;
  relativeDay?: number;
  priority?: 'high' | 'medium' | 'low';
  sortOrder?: number;
  isActive?: boolean;
}
```

**レスポンス**:

```typescript
interface UpdateTaskTemplateResponse {
  template: TaskTemplate;
}
```

**エラー**:
- `400`: バリデーションエラー
- `401`: 未認証
- `403`: 権限なし
- `404`: テンプレートが存在しない

---

### 5.10 タスクテンプレート削除

**エンドポイント**: `DELETE /api/v1/task-templates/:templateId`

**認証**: Required
**権限**: `tenant_admin` または `system_admin`

**レスポンス**:

```typescript
interface DeleteTaskTemplateResponse {
  success: true;
}
```

**エラー**:
- `401`: 未認証
- `403`: 権限なし
- `404`: テンプレートが存在しない

---

## §6. UI設計（UI Design）

[DETAIL]

### 6.1 タスクボード／リストビュー

#### 6.1.1 レイアウト構成

```
┌─────────────────────────────────────────────────────────────┐
│ [イベント名]  タスク管理                              [+新規]│
├─────────────────────────────────────────────────────────────┤
│ フィルター: [全体 v] [全ロール v] [全ステータス v] [検索...] │
├─────────────────────────────────────────────────────────────┤
│ ビュー切替: [○リスト] [カンバン] [カレンダー]           進捗│
│                                                    ██████░░ 65%│
├─────────────────────────────────────────────────────────────┤
│ 未着手（5件）                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [高] 会場レイアウト確認              D-14 (2026/01/26) │ │
│ │ 担当: 会場担当                            [進行中にする] │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [中] 配信機材チェックリスト作成       D-7 (2026/02/02) │ │
│ │ 担当: 配信担当                            [進行中にする] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ 進行中（3件）                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [高] 参加者リスト最終確認             D-3 (2026/02/06) │ │
│ │ 担当: 主催者（田中）                        [完了する] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ 完了（12件） [展開]                                          │
└─────────────────────────────────────────────────────────────┘
```

#### 6.1.2 UIコンポーネント

**タスクカード（TaskCard.vue）**
- タスク名（クリックで詳細モーダル）
- 優先度バッジ（高=赤、中=黄、低=グレー）
- 担当者（ロール名または個人名）
- 締め切り日時（相対日表示: D-14）
- ステータス変更ボタン
- 期限超過時の警告表示（赤背景）

**フィルターバー（TaskFilterBar.vue）**
- ビュー切替（自分のタスク/全体/ロール別）
- ロールフィルタ（複数選択可）
- ステータスフィルタ（複数選択可）
- キーワード検索
- ソート順（締め切り/優先度/作成日）

**進捗サマリー（TaskProgressSummary.vue）**
- 進捗率（完了タスク数 / 全タスク数）
- ステータス別件数
- 期限超過タスク数（警告）

---

### 6.2 カンバンビュー（オプション）

#### 6.2.1 レイアウト

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ 未着手（5） │ 進行中（3） │ 完了（12）  │ スキップ（1）│
├─────────────┼─────────────┼─────────────┼─────────────┤
│ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │
│ │[高]会場 │ │ │[高]参加 │ │ │[中]企画 │ │ │[低]予備 │ │
│ │レイアウト│ │ │者リスト │ │ │書作成   │ │ │撮影     │ │
│ │確認     │ │ │最終確認 │ │ │         │ │ │         │ │
│ │D-14     │ │ │D-3      │ │ │完了     │ │ │スキップ │ │
│ └─────────┘ │ └─────────┘ │ └─────────┘ │ └─────────┘ │
│             │             │             │             │
│ ドラッグ&   │             │             │             │
│ ドロップで  │             │             │             │
│ ステータス  │             │             │             │
│ 変更可能    │             │             │             │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

#### 6.2.2 機能
- ドラッグ&ドロップでステータス変更
- カラムごとの件数表示
- 優先度別の色分け
- 期限超過タスクの視覚的ハイライト

---

### 6.3 カレンダービュー

#### 6.3.1 レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ 2026年2月                                            [今日] │
├────┬────┬────┬────┬────┬────┬────┐
│ 日 │ 月 │ 火 │ 水 │ 木 │ 金 │ 土 │
├────┼────┼────┼────┼────┼────┼────┤
│    │    │    │    │    │    │  1 │
├────┼────┼────┼────┼────┼────┼────┤
│  2 │  3 │  4 │  5 │  6 │  7 │  8 │
│    │    │    │    │[高]│[中]│    │
│    │    │    │    │参加│配信│    │
│    │    │    │    │者  │機材│    │
│    │    │    │    │(3) │(1) │    │
├────┼────┼────┼────┼────┼────┼────┤
│  9 │ 10 │ ...                        │
│[開催日]                               │
└─────────────────────────────────────────────────────────────┘
```

#### 6.3.2 機能
- 締め切り日でタスクを表示
- 日付クリックでその日のタスク一覧
- 開催日をハイライト表示
- 月/週/日ビュー切替

---

### 6.4 タスク詳細モーダル

#### 6.4.1 レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ タスク詳細                                        [編集][×] │
├─────────────────────────────────────────────────────────────┤
│ タスク名                                                     │
│ [高] 会場レイアウト確認                                      │
│                                                              │
│ 説明                                                         │
│ 会場の座席配置・演台・プロジェクターの位置を確認し、        │
│ レイアウト図を作成する。参加人数50名想定。                  │
│                                                              │
│ 担当: 会場担当（山田太郎）                                   │
│ 締め切り: 2026-01-26 23:59（D-14）                           │
│ ステータス: [未着手 v]                                       │
│ 優先度: [高 v]                                               │
│                                                              │
│ テンプレート: セミナー標準タスク#3                           │
│ 作成日時: 2026-01-12 10:30                                   │
│ 更新日時: 2026-01-12 10:30                                   │
│                                                              │
│                                    [削除] [キャンセル] [保存]│
└─────────────────────────────────────────────────────────────┘
```

#### 6.4.2 機能
- タスク情報の表示・編集
- ステータス変更（ドロップダウン）
- 担当者変更（ロール選択 or ユーザー検索）
- 締め切り日時変更（日付ピッカー + 相対日ショートカット）
- タスク削除（確認ダイアログ）

---

### 6.5 ロール別ダッシュボード

#### 6.5.1 主催者ダッシュボード

```
┌─────────────────────────────────────────────────────────────┐
│ イベントダッシュボード（主催者）                             │
├─────────────────────────────────────────────────────────────┤
│ 全体進捗                                    ██████░░░░ 65%  │
│ 未着手: 5件  進行中: 3件  完了: 12件                        │
│                                                              │
│ ⚠️ 期限超過タスク（1件）                                     │
│ - [高] 参加者案内メール送信（D-7超過）                       │
│                                                              │
│ ⚠️ 期限間近（3日以内）のタスク（2件）                        │
│ - [高] 参加者リスト最終確認（D-3）                           │
│ - [中] 配信機材チェックリスト作成（D-3）                     │
│                                                              │
│ 自分のタスク（5件）                                          │
│ [全て表示]                                                   │
└─────────────────────────────────────────────────────────────┘
```

#### 6.5.2 会場担当ダッシュボード

```
┌─────────────────────────────────────────────────────────────┐
│ イベントダッシュボード（会場担当）                           │
├─────────────────────────────────────────────────────────────┤
│ 会場準備タスク進捗                          ████░░░░░░ 40%  │
│ 未着手: 3件  進行中: 1件  完了: 4件                          │
│                                                              │
│ 自分のタスク一覧                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [高] 会場レイアウト確認              D-14 (2026/01/26) │ │
│ │ 担当: 会場担当                            [進行中にする] │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [中] 会場音響テスト                   D-7 (2026/02/02) │ │
│ │ 担当: 会場担当                            [進行中にする] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ 関連資料                                                     │
│ - 会場レイアウト図                                           │
│ - 機材チェックリスト                                         │
└─────────────────────────────────────────────────────────────┘
```

#### 6.5.3 配信担当ダッシュボード

```
┌─────────────────────────────────────────────────────────────┐
│ イベントダッシュボード（配信担当）                           │
├─────────────────────────────────────────────────────────────┤
│ 配信準備タスク進捗                          ██████░░░░ 60%  │
│ 未着手: 2件  進行中: 1件  完了: 3件                          │
│                                                              │
│ 自分のタスク一覧                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [高] 配信機材チェックリスト作成       D-7 (2026/02/02) │ │
│ │ 担当: 配信担当                            [進行中にする] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ 配信設定                                                     │
│ - 配信URL: https://stream.example.com/event123               │
│ - 配信開始時刻: 2026-02-09 14:00                             │
│ - 機材チェックリスト: [PDF]                                  │
└─────────────────────────────────────────────────────────────┘
```

#### 6.5.4 企画代行ダッシュボード

```
┌─────────────────────────────────────────────────────────────┐
│ イベント一覧（企画代行）                                     │
├─────────────────────────────────────────────────────────────┤
│ クライアント: [全て v]  開催月: [2026年2月 v]               │
│                                                              │
│ 進行中のイベント（3件）                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [クライアントA] 技術セミナー         進捗: ██████░░ 65% │ │
│ │ 開催: 2026-02-09  タスク: 未着手5 進行中3 完了12       │ │
│ │ ⚠️ 期限超過1件                              [詳細を見る] │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [クライアントB] ワークショップ       進捗: ████░░░░ 45% │ │
│ │ 開催: 2026-02-15  タスク: 未着手8 進行中2 完了6        │ │
│ │                                             [詳細を見る] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ 横断タスクビュー                                             │
│ - 今週締め切りのタスク: 7件                                  │
│ - 期限超過タスク: 1件                                        │
│ - 自分がアサインされたタスク: 12件                           │
└─────────────────────────────────────────────────────────────┘
```

---

## §7. ビジネスルール（Business Rules）

[CORE]

### 7.1 相対日から締め切り日時への変換

#### ルール: BR-TASK-001
**内容**: テンプレート展開時またはタスク作成時、`relative_day` と `event.scheduled_at` から `due_at` を自動計算する。

**計算式**:
```typescript
due_at = event.scheduled_at + relative_day（日） + 23:59:59
```

**例**:
- イベント開催日: `2026-02-09 14:00`
- `relative_day = -7` (D-7)
- `due_at = 2026-02-02 23:59:59`

**実装時の注意**:
- タイムゾーンは `event.timezone` を使用（未指定時はテナントデフォルト）
- 時刻はデフォルトで23:59:59（終日タスク）
- タスク編集時に `relative_day` を変更した場合も再計算

---

### 7.2 開催日変更時の締め切り自動再計算

#### ルール: BR-TASK-002
**内容**: イベントの `scheduled_at` が変更された場合、`relative_day` が設定されている全タスクの `due_at` を自動再計算する。

**トリガー**: `PATCH /api/v1/events/:id` で `scheduled_at` が更新された時

**処理フロー**:
1. イベントに紐づく全タスクを取得
2. `relative_day IS NOT NULL` のタスクをフィルタ
3. 各タスクの `due_at` を BR-TASK-001 に従って再計算
4. バルク更新

**例外**:
- `relative_day = NULL` のタスク（手動設定された締め切り）は更新しない
- 完了済み（`status='completed'`）のタスクは更新しない

---

### 7.3 ロールベースの自動アサイン

#### ルール: BR-TASK-003
**内容**: テンプレート展開時、`assigned_role` に基づいてタスクを自動アサインする。ただし、実際のユーザーへの通知は `event_members` のロールを参照する。

**アサインロジック**:
1. テンプレートの `assigned_role` をタスクの `assigned_role` に設定
2. `assigned_user_id` は NULL（ロール全体に対するタスク）
3. タスク表示時、`event_members` から該当ロールを持つユーザーを動的に取得
4. 個別アサイン時のみ `assigned_user_id` を設定

**例**:
- テンプレート: `assigned_role='venue'`
- タスク展開: `assigned_role='venue'`, `assigned_user_id=NULL`
- 表示: イベントメンバーから `role='venue'` のユーザーを検索し、該当者に表示

---

### 7.4 タスク完了時のビジネスロジック

#### ルール: BR-TASK-004
**内容**: タスクが完了状態に変更された時、以下の処理を実行する。

**トリガー**: `status` が `completed` に変更された時

**処理**:
1. `completed_at` を現在時刻で設定
2. イベント全体の進捗率を再計算
3. 完了通知を主催者およびイベント管理者に送信（オプション）

**進捗率計算**:
```typescript
progress = (completed_count + skipped_count) / total_count * 100
```

---

### 7.5 締め切りリマインド通知のタイミング

#### ルール: BR-TASK-005
**内容**: 締め切りリマインド通知を以下のタイミングで送信する。

**通知タイミング**:
| タイミング | 条件 | 通知対象 |
|-----------|------|---------|
| D-7 | 締め切り7日前の09:00 | アサインされたユーザー、主催者 |
| D-3 | 締め切り3日前の09:00 | アサインされたユーザー、主催者 |
| D-1 | 締め切り1日前の09:00 | アサインされたユーザー、主催者、テナント管理者 |
| D+0 | 締め切り当日の09:00 | 上記全員（優先度: 高） |
| 超過後 | 締め切り超過後、毎日09:00 | 上記全員（警告） |

**通知対象の判定**:
- `assigned_user_id` が設定されている場合: その特定ユーザー
- `assigned_role` のみの場合: `event_members` から該当ロールを持つ全ユーザー
- 主催者: イベントの `organizer_id` または `event_members` で `role='organizer'` を持つユーザー

**通知抑制条件**:
- `status='completed'` または `status='skipped'` のタスクは通知しない
- ユーザーが通知設定でオフにしている場合は送信しない

**実装方法**:
- バッチジョブ（cron）で毎日09:00に実行
- または Nitro タスクで定期実行

---

### 7.6 タスク削除の制約

#### ルール: BR-TASK-006
**内容**: タスク削除は以下の条件を満たす場合のみ可能。

**削除可能条件**:
- ユーザーが `organizer` または `event_planner` ロールを持つ
- タスクが `completed` または `skipped` 状態でない（運用ルール）
  - ※技術的には削除可能だが、完了タスクの削除は推奨しない（監査ログのため）

**削除不可の場合**:
- 完了済みタスクを削除しようとした場合は警告を表示
- 代わりに `status='skipped'` への変更を推奨

---

### 7.7 テンプレート優先順位

#### ルール: BR-TASK-007
**内容**: タスクテンプレート自動展開時、以下の優先順位でテンプレートを選択する。

**優先順位**:
1. テナント独自テンプレート（`tenant_id = current_tenant.id`, `event_type = event.event_type`, `is_active = true`）
2. システム標準テンプレート（`tenant_id = NULL`, `event_type = event.event_type`, `is_active = true`）
3. テンプレートが見つからない場合: AI生成（Claude）にフォールバック

**複数テンプレートがある場合**:
- `sort_order` の昇順で全て展開

---

## §8. セキュリティ要件（Security Requirements）

[CORE]

### 8.1 認証・認可

- **認証**: Better Auth による JWT トークン認証
- **認可**:
  - タスク閲覧: イベントメンバーまたはテナントメンバー
  - タスク作成・編集・削除: `organizer`, `event_planner`, または `assigned_user_id` が自分
  - テンプレート管理: `tenant_admin`, `system_admin`

### 8.2 データアクセス制御

- **テナント分離**: 全タスク・テンプレートは `tenant_id` でスコープ
- **イベントスコープ**: タスクは `event_id` に紐づき、イベントメンバー以外はアクセス不可
- **ロールベース**: `assigned_role` に基づき、該当ロールを持たないユーザーは閲覧不可（オプション）

### 8.3 入力検証

- 全APIエンドポイントで Zod によるバリデーション
- XSS対策: タスク名・説明の HTML エスケープ
- SQL Injection対策: Drizzle ORM のパラメータ化クエリ

---

## §9. パフォーマンス要件（Performance Requirements）

[DETAIL]

### 9.1 レスポンス時間

- タスク一覧取得: 500ms以内（100タスクまで）
- タスク作成: 200ms以内
- タスク更新: 200ms以内
- テンプレート自動展開: 2秒以内（50タスクまで）
- AI生成: 10秒以内（タイムアウト設定）

### 9.2 スケーラビリティ

- 1イベントあたり最大200タスクを想定
- 1テナントあたり最大50テンプレートを想定
- インデックス最適化により、1000イベント規模でも高速検索を維持

### 9.3 キャッシング

- タスクテンプレート: Redis でキャッシュ（TTL: 1時間）
- タスク一覧: イベント単位でキャッシュ（タスク更新時に無効化）

---

## §10. テストケース（Test Cases）

[CORE]

### 10.1 ユニットテスト

#### TC-TASK-001: 相対日から締め切り日時への変換
**目的**: BR-TASK-001 の検証
**入力**:
- `event.scheduled_at = 2026-02-09 14:00`
- `relative_day = -7`

**期待結果**:
- `due_at = 2026-02-02 23:59:59`

**実装**:
```typescript
// tests/unit/server/utils/tasks.test.ts
describe('calculateDueAt', () => {
  it('should calculate due_at correctly for D-7', () => {
    const scheduledAt = new Date('2026-02-09T14:00:00Z');
    const relativeDay = -7;
    const dueAt = calculateDueAt(scheduledAt, relativeDay);
    expect(dueAt.toISOString()).toBe('2026-02-02T23:59:59.000Z');
  });
});
```

---

#### TC-TASK-002: テンプレート優先順位
**目的**: BR-TASK-007 の検証
**入力**:
- テナント独自テンプレート: `tenant_id='tenant-1'`, `event_type='seminar'`
- システム標準テンプレート: `tenant_id=NULL`, `event_type='seminar'`

**期待結果**:
- テナント独自テンプレートが選択される

**実装**:
```typescript
// tests/unit/server/utils/task-templates.test.ts
describe('selectTemplate', () => {
  it('should prioritize tenant template over system template', async () => {
    const template = await selectTemplate('tenant-1', 'seminar');
    expect(template.tenantId).toBe('tenant-1');
  });
});
```

---

### 10.2 統合テスト（API）

#### TC-TASK-API-001: タスク一覧取得
**エンドポイント**: `GET /api/v1/events/:eventId/tasks`
**前提条件**:
- イベント `event-1` が存在
- タスクが5件存在（未着手3件、進行中1件、完了1件）

**リクエスト**:
```http
GET /api/v1/events/event-1/tasks
Authorization: Bearer <token>
```

**期待レスポンス**:
```json
{
  "tasks": [
    { "id": "task-1", "status": "pending", ... },
    { "id": "task-2", "status": "pending", ... },
    { "id": "task-3", "status": "pending", ... },
    { "id": "task-4", "status": "in_progress", ... },
    { "id": "task-5", "status": "completed", ... }
  ],
  "summary": {
    "total": 5,
    "pending": 3,
    "inProgress": 1,
    "completed": 1,
    "skipped": 0,
    "overdue": 0
  }
}
```

**実装**:
```typescript
// tests/integration/api/tasks.test.ts
describe('GET /api/v1/events/:eventId/tasks', () => {
  it('should return all tasks with summary', async () => {
    const response = await request(app)
      .get('/api/v1/events/event-1/tasks')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.tasks).toHaveLength(5);
    expect(response.body.summary.total).toBe(5);
  });
});
```

---

#### TC-TASK-API-002: タスク作成（相対日指定）
**エンドポイント**: `POST /api/v1/events/:eventId/tasks`
**前提条件**:
- イベント `event-1` が存在（`scheduled_at = 2026-02-09 14:00`）

**リクエスト**:
```http
POST /api/v1/events/event-1/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "会場レイアウト確認",
  "assignedRole": "venue",
  "relativeDay": -7,
  "priority": "high"
}
```

**期待レスポンス**:
```json
{
  "task": {
    "id": "task-new",
    "title": "会場レイアウト確認",
    "assignedRole": "venue",
    "relativeDay": -7,
    "dueAt": "2026-02-02T23:59:59.000Z",
    "status": "pending",
    "priority": "high",
    ...
  }
}
```

**検証**:
- `due_at` が正しく計算されている（BR-TASK-001）

**実装**:
```typescript
// tests/integration/api/tasks.test.ts
describe('POST /api/v1/events/:eventId/tasks', () => {
  it('should create task with calculated due_at', async () => {
    const response = await request(app)
      .post('/api/v1/events/event-1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: '会場レイアウト確認',
        assignedRole: 'venue',
        relativeDay: -7,
        priority: 'high',
      });

    expect(response.status).toBe(201);
    expect(response.body.task.dueAt).toBe('2026-02-02T23:59:59.000Z');
  });
});
```

---

#### TC-TASK-API-003: タスク完了
**エンドポイント**: `POST /api/v1/tasks/:taskId/complete`
**前提条件**:
- タスク `task-1` が存在（`status='pending'`）

**リクエスト**:
```http
POST /api/v1/tasks/task-1/complete
Authorization: Bearer <token>
```

**期待レスポンス**:
```json
{
  "task": {
    "id": "task-1",
    "status": "completed",
    "completedAt": "2026-02-09T10:30:00.000Z",
    ...
  }
}
```

**検証**:
- `status` が `completed` に変更
- `completed_at` が現在時刻で設定

**実装**:
```typescript
// tests/integration/api/tasks.test.ts
describe('POST /api/v1/tasks/:taskId/complete', () => {
  it('should mark task as completed', async () => {
    const response = await request(app)
      .post('/api/v1/tasks/task-1/complete')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.task.status).toBe('completed');
    expect(response.body.task.completedAt).toBeTruthy();
  });
});
```

---

#### TC-TASK-API-004: タスクテンプレート自動展開
**エンドポイント**: `POST /api/v1/events/:eventId/tasks/generate`
**前提条件**:
- イベント `event-1` が存在（`event_type='seminar'`, `scheduled_at = 2026-02-09 14:00`）
- テンプレートが3件存在（`event_type='seminar'`）

**リクエスト**:
```http
POST /api/v1/events/event-1/tasks/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "useTemplate": true
}
```

**期待レスポンス**:
```json
{
  "tasks": [
    { "id": "task-1", "title": "企画書作成", "relativeDay": -30, ... },
    { "id": "task-2", "title": "会場予約", "relativeDay": -14, ... },
    { "id": "task-3", "title": "配信準備", "relativeDay": -7, ... }
  ],
  "summary": {
    "generated": 3,
    "fromTemplate": 3,
    "fromAI": 0
  }
}
```

**検証**:
- テンプレートから3件のタスクが生成
- 各タスクの `due_at` が正しく計算されている

**実装**:
```typescript
// tests/integration/api/tasks.test.ts
describe('POST /api/v1/events/:eventId/tasks/generate', () => {
  it('should generate tasks from templates', async () => {
    const response = await request(app)
      .post('/api/v1/events/event-1/tasks/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ useTemplate: true });

    expect(response.status).toBe(201);
    expect(response.body.tasks).toHaveLength(3);
    expect(response.body.summary.fromTemplate).toBe(3);
  });
});
```

---

#### TC-TASK-API-005: 開催日変更時の締め切り再計算
**エンドポイント**: `PATCH /api/v1/events/:eventId`
**前提条件**:
- イベント `event-1` が存在（`scheduled_at = 2026-02-09 14:00`）
- タスク `task-1` が存在（`relative_day=-7`, `due_at = 2026-02-02 23:59:59`）

**リクエスト**:
```http
PATCH /api/v1/events/event-1
Authorization: Bearer <token>
Content-Type: application/json

{
  "scheduledAt": "2026-02-16T14:00:00Z"
}
```

**期待動作**:
- イベントの `scheduled_at` が更新される
- タスク `task-1` の `due_at` が自動再計算される（`2026-02-09 23:59:59`）

**検証**:
```typescript
// tests/integration/api/events.test.ts
describe('PATCH /api/v1/events/:eventId (reschedule)', () => {
  it('should recalculate task due dates when scheduled_at changes', async () => {
    const response = await request(app)
      .patch('/api/v1/events/event-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ scheduledAt: '2026-02-16T14:00:00Z' });

    expect(response.status).toBe(200);

    // タスクの due_at を確認
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, 'task-1'),
    });
    expect(task.dueAt.toISOString()).toBe('2026-02-09T23:59:59.000Z');
  });
});
```

---

### 10.3 E2Eテスト

#### TC-TASK-E2E-001: タスク一覧表示とフィルタリング
**シナリオ**:
1. 主催者としてログイン
2. イベント詳細ページに移動
3. タスク一覧が表示される
4. ロールフィルタで「会場担当」を選択
5. 会場関連タスクのみ表示される

**実装**:
```typescript
// tests/e2e/tasks.spec.ts
test('should filter tasks by role', async ({ page }) => {
  await page.goto('/events/event-1');
  await page.click('text=タスク管理');

  // 初期状態: 全タスク表示
  await expect(page.locator('[data-testid="task-card"]')).toHaveCount(10);

  // ロールフィルタ適用
  await page.selectOption('[data-testid="role-filter"]', 'venue');
  await expect(page.locator('[data-testid="task-card"]')).toHaveCount(3);
  await expect(page.locator('text=会場レイアウト確認')).toBeVisible();
});
```

---

#### TC-TASK-E2E-002: タスク作成とステータス変更
**シナリオ**:
1. 主催者としてログイン
2. イベント詳細ページに移動
3. 「新規タスク追加」をクリック
4. タスク情報を入力（タイトル、担当ロール、相対日）
5. 保存
6. タスクが一覧に追加される
7. タスクカードの「進行中にする」をクリック
8. ステータスが「進行中」に変更される

**実装**:
```typescript
// tests/e2e/tasks.spec.ts
test('should create and update task status', async ({ page }) => {
  await page.goto('/events/event-1');
  await page.click('text=タスク管理');
  await page.click('[data-testid="new-task-button"]');

  // タスク作成
  await page.fill('[data-testid="task-title"]', '新規タスク');
  await page.selectOption('[data-testid="assigned-role"]', 'organizer');
  await page.fill('[data-testid="relative-day"]', '-7');
  await page.click('[data-testid="save-task"]');

  await expect(page.locator('text=新規タスク')).toBeVisible();

  // ステータス変更
  await page.click('[data-testid="task-card"] >> text=進行中にする');
  await expect(page.locator('[data-testid="task-card"] >> text=進行中')).toBeVisible();
});
```

---

#### TC-TASK-E2E-003: ロール別ビュー切替
**シナリオ**:
1. 会場担当としてログイン
2. ダッシュボードに会場タスクのみ表示される
3. 「全体ビュー」に切り替え
4. 全タスクが表示される

**実装**:
```typescript
// tests/e2e/tasks.spec.ts
test('should switch between role-based views', async ({ page }) => {
  // 会場担当としてログイン
  await loginAs(page, 'venue-user@example.com');
  await page.goto('/events/event-1/dashboard');

  // デフォルト: 会場タスクのみ
  await expect(page.locator('[data-testid="task-card"]')).toHaveCount(3);
  await expect(page.locator('text=会場レイアウト確認')).toBeVisible();

  // 全体ビューに切替
  await page.selectOption('[data-testid="view-filter"]', 'all');
  await expect(page.locator('[data-testid="task-card"]')).toHaveCount(10);
});
```

---

## §11. 非機能要件（Non-Functional Requirements）

[DETAIL]

### 11.1 可用性
- システム稼働率: 99.5%以上
- タスク管理機能の障害時、イベント基本情報は引き続き閲覧可能

### 11.2 保守性
- タスクテンプレートは管理画面から編集可能
- ログ出力: タスク作成・更新・削除・完了の操作ログを記録
- エラーハンドリング: 全APIエンドポイントで統一されたエラーレスポンス

### 11.3 拡張性
- カスタムフィールド: 将来的にタスクにカスタムフィールドを追加可能（JSONB列を準備）
- 外部カレンダー連携: Google Calendar, Outlook Calendar への同期（将来拡張）
- Slack/Teams連携: 通知チャネルの拡張

### 11.4 ユーザビリティ
- タスク一覧は直感的なUI（カード/リスト/カンバン/カレンダービュー）
- ドラッグ&ドロップによるステータス変更（カンバンビュー）
- モバイルレスポンシブ対応

---

## §12. 実装順序（Implementation Order）

[DETAIL]

### フェーズ1: 基本機能（P0）
1. データモデル・マイグレーション作成（`tasks`, `task_templates`）
2. タスクCRUD API実装（GET, POST, PATCH, DELETE）
3. タスク一覧表示UI（リストビュー）
4. タスク作成・編集モーダル
5. ステータス変更機能
6. 相対日から締め切り計算ロジック（BR-TASK-001）

### フェーズ2: テンプレート機能（P0）
7. タスクテンプレート管理API（CRUD）
8. テンプレート自動展開API（`POST /api/v1/events/:eventId/tasks/generate`）
9. テンプレート管理UI（管理者向け）
10. テンプレート優先順位ロジック（BR-TASK-007）

### フェーズ3: ロール別ビュー（P0）
11. ロール別フィルター実装
12. ロール別ダッシュボード（主催者/会場/配信/企画代行）
13. 進捗サマリー表示

### フェーズ4: 通知連携（P1）
14. 締め切りリマインド通知バッチジョブ
15. NOTIF-001との統合
16. 通知設定UI

### フェーズ5: 高度なビュー（P2）
17. カンバンビュー実装
18. カレンダービュー実装
19. ドラッグ&ドロップ機能

### フェーズ6: AI生成（P2）
20. AI生成API（Claude連携）
21. カスタムプロンプト対応
22. 生成結果のプレビュー・編集UI

---

## §13. 未決定事項・制約（Open Issues & Constraints）

[CONTRACT]

### 13.1 未決定事項

| # | 項目 | 内容 | 影響範囲 | 期限目安 |
|---|------|------|---------|---------|
| 1 | 複数ロールアサインの実装方式 | FR-EVT-012-2 で「JSON配列または関連テーブル」と記載。どちらを採用するか未決定 | DB設計、API設計 | フェーズ1着手前 |
| 2 | テンプレートのバージョニング | テンプレート更新時に既存タスクへの影響をどう扱うか（展開済みタスクは変更しない方針を仮置き） | テンプレート管理 | フェーズ2着手前 |
| 3 | 通知バッチの実行基盤 | cron vs Nitro タスク vs 外部ジョブスケジューラの選択 | インフラ、NOTIF-001連携 | フェーズ4着手前 |
| 4 | カンバンビューのD&Dライブラリ選定 | Vue 3対応のドラッグ&ドロップライブラリ（vue-draggable-plus, @vueuse/integrations 等） | フロントエンド | フェーズ5着手前 |
| 5 | AI生成タスクの品質保証 | AI生成結果のバリデーション基準、不適切な出力時のフォールバック方針 | AI-001連携 | フェーズ6着手前 |
| 6 | ガントチャートのUI表示ライブラリ | ガントチャート表示に使用するライブラリの選定（自前実装 vs OSS） | フロントエンド | フェーズ5着手前 |

### 13.2 制約事項

| # | 制約 | 理由 |
|---|------|------|
| 1 | 1イベントあたりタスク数上限200件 | パフォーマンス維持のため。超過時は警告を表示 |
| 2 | テンプレートはテナント単位で管理 | マルチテナント分離の原則に準拠 |
| 3 | 通知はNOTIF-001経由で統一 | 通知チャネルの一元管理のため、独自通知実装は禁止 |
| 4 | 相対日の範囲は -365 ～ +365 | 年単位を超えるイベント運営は対象外 |
| 5 | タイムゾーンはイベント単位で管理 | テナントデフォルトTZをフォールバックとし、タスク個別のTZ設定は行わない |

### 13.3 前提条件

- EVT-001（イベント作成）が先行実装済みであること
- NOTIF-001（通知基盤）がフェーズ4着手までに利用可能であること
- Better Auth による認証・認可基盤が稼働済みであること
- ROLE-001～004（ロール管理）が実装済みであること

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|---------|--------|
| 2026-02-09 | 1.0 | 初版作成 | Claude Code |
| 2026-02-09 | 1.1 | §3-E 入出力例、§3-F 境界値、§3-G 例外レスポンス、§3-H 受け入れテスト（Gherkin）、§13 未決定事項・制約を追加 | Claude Code |

---

## 参照ドキュメント

- [SSOT-1: Product Requirements](../../requirements/SSOT-1_PRODUCT_REQUIREMENTS.md) - EVT-010～014の受け入れ基準
- [SSOT-3: API Contract](../../design/core/SSOT-3_API_CONTRACT.md) - API規約
- [SSOT-4: Data Model](../../design/core/SSOT-4_DATA_MODEL.md) - データモデル定義
- [SSOT-5: Cross-Cutting Concerns](../../design/core/SSOT-5_CROSS_CUTTING.md) - 認証・エラーハンドリング
- [NOTIF-001: System Notifications](./NOTIF-001_system-notifications.md) - 通知連携
- [EVT-001: Event Creation](./EVT-001_event-creation.md) - イベント作成（開催日設定）

---

**ステータス**: Draft
**レビュー**: 未実施
**承認**: 未承認
