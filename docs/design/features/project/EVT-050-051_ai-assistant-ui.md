# EVT-050-051: AIアシスタントUI（HUBコンシェルジュ）

## §1. 機能ID・概要

| 項目 | 内容 |
|------|------|
| 機能ID | EVT-050（全画面共通AIアシスタントUI）<br>EVT-051（ロール別コンテキスト応答） |
| 機能名 | HUBコンシェルジュ（AI統合アシスタント） |
| 説明 | 全画面から常時アクセス可能なAIアシスタント。自然言語で質問・依頼を入力し、ロール・ページコンテキストに基づいた応答と実行アクション（イベント作成・見積生成・タスク追加等）を提供 |
| 優先度 | P0（MVP Core） |
| 依存機能 | AUTH-001（認証）<br>AUTH-002（組織・ロール）<br>SSOT-5 §3（AI抽象化層） |
| 関連SSOT | SSOT-3 §3（AI API規約）<br>SSOT-4（ai_conversation テーブル）<br>SSOT-5 §3（AI Service Layer） |

---

## §2. ユースケース・ユーザーストーリー [CORE]

### UC-050-1: 全画面からのAIアシスト起動
**アクター**: 全ロール
**前提**: ログイン済み
**トリガー**: ヘッダーのAI入力欄をクリック、または `Cmd+K` / `Ctrl+K` ショートカット

**基本フロー**:
1. ユーザーがAI入力欄をクリック or ショートカット実行
2. 右スライドオーバーでチャットパネル展開
3. 現在のページコンテキスト（イベント詳細・タスク一覧等）を自動注入
4. ユーザーが自然言語で質問・依頼を入力
5. AIがストリーミング形式で応答（文字が順次表示）
6. Tool Call実行結果（イベント作成・見積生成等）がUIに反映

**期待結果**: 現在画面のコンテキストを理解したAI応答を受け取り、必要なアクションが自動実行される

---

### UC-051-1: ロール別情報スコープ制御
**アクター**: 全ロール
**前提**: ログイン済み、特定ロールに所属
**トリガー**: AIに質問を入力

**基本フロー**:
1. **主催者（Organizer）**: 自組織の全イベント・参加者・タスク・見積にアクセス可能
2. **会場スタッフ（Venue Staff）**: 自会場に関連するイベント・レイアウト・設備にアクセス可能
3. **配信スタッフ（Streaming Staff）**: 担当イベントの配信情報・機材にアクセス可能
4. **登壇者（Speaker）**: 自分が登壇するイベント・スライド・タイムテーブルにアクセス可能
5. **参加者（Participant）**: 自分が参加登録したイベント情報にアクセス可能

**期待結果**: ロールに応じた情報のみがAI応答に含まれ、権限外の情報は参照されない

---

### UC-050-2: 会話履歴の参照と継続
**アクター**: 全ロール
**前提**: 過去にAIと会話済み
**トリガー**: チャットパネル内の「履歴」タブをクリック

**基本フロー**:
1. 過去の会話スレッド一覧が表示（最新順）
2. スレッドをクリックすると過去の会話が復元
3. 過去の会話に続けて新しい質問が可能
4. コンテキストウィンドウ制限（10万トークン）を超える場合は古い会話を自動トリミング

**期待結果**: 過去の会話コンテキストを維持したまま対話を継続できる

---

## §3. 機能要件（FR）[CORE]

| FR ID | 要件 | 優先度 | 検証方法 |
|-------|------|--------|----------|
| FR-050-1 | 全画面ヘッダーに常時表示のAI入力欄（プレースホルダー: "AIに聞く／頼む（⌘K）"） | P0 | 目視 |
| FR-050-2 | `Cmd+K` / `Ctrl+K` でチャットパネルを開く | P0 | E2E |
| FR-050-3 | 右スライドオーバー形式のチャットパネル（幅: 480px、背景オーバーレイ） | P0 | 目視 |
| FR-050-4 | メッセージ入力欄（マルチライン、最大2000文字、Shift+Enter改行、Enter送信） | P0 | Unit |
| FR-050-5 | AIメッセージのストリーミング表示（SSE、文字が順次追加） | P0 | E2E |
| FR-050-6 | Tool Call実行結果のカード表示（例: "イベント「○○」を作成しました"） | P0 | E2E |
| FR-050-7 | 会話履歴タブ（過去のスレッド一覧、クリックで復元） | P1 | E2E |
| FR-050-8 | ページコンテキスト自動注入（例: イベント詳細画面では event_id を自動送信） | P0 | Unit |
| FR-050-9 | エラー時の再試行ボタン（「もう一度試す」） | P1 | E2E |
| FR-051-1 | ロールに基づいた情報スコープ制御（Organizer: 全イベント、Venue Staff: 自会場のみ） | P0 | Integration |
| FR-051-2 | ロールに基づいたTool Call権限制御（Organizer: create_event 可、Venue Staff: 不可） | P0 | Integration |
| FR-051-3 | テナント境界の厳格な隔離（他組織の情報は参照不可） | P0 | Integration |
| FR-051-4 | レート制限（20リクエスト/分/ユーザー） | P1 | Unit |
| FR-051-5 | コンテキストウィンドウ管理（10万トークン超過時は古い会話を自動トリミング） | P1 | Unit |

---

### §3-E. 入出力例 [CONTRACT]

#### E-1: AIチャット送信

**リクエスト**: `POST /api/v1/ai/chat`
```json
{
  "message": "来週のセミナーの見積を作成して",
  "context": {
    "type": "event_detail",
    "id": "evt-001-uuid",
    "metadata": {
      "event_title": "AI活用セミナー",
      "event_date": "2026-03-15",
      "status": "planning"
    }
  },
  "stream": true
}
```

**レスポンス**: `200 OK`（SSE stream）
```
data: {"type":"text","content":"かしこまりました。"}
data: {"type":"text","content":"セミナーの見積を作成します。"}
data: {"type":"tool_call_start","tool":"generate_estimate","args":{"event_id":"evt-001-uuid"}}
data: {"type":"tool_call_result","tool":"generate_estimate","result":{"success":true,"estimate_id":"est-001-uuid","total":450000}}
data: {"type":"text","content":"見積書を作成しました。合計金額は¥450,000です。"}
data: {"type":"done","conversation_id":"conv-001-uuid","tokens":1234}
```

---

#### E-2: チャット履歴取得

**リクエスト**: `GET /api/v1/ai/conversations?limit=20&offset=0`

**レスポンス**: `200 OK`
```json
{
  "conversations": [
    {
      "id": "conv-001-uuid",
      "title": "来週のセミナー見積作成",
      "context_type": "event_detail",
      "last_message": "見積書を作成しました。合計金額は¥450,000です。",
      "updated_at": "2026-02-09T16:23:00Z"
    },
    {
      "id": "conv-002-uuid",
      "title": "会場設備の確認",
      "context_type": "venue_management",
      "last_message": "渋谷会場の設備は以下の通りです...",
      "updated_at": "2026-02-09T11:00:00Z"
    }
  ],
  "total": 15
}
```

---

#### E-3: 会話詳細取得

**リクエスト**: `GET /api/v1/ai/conversations/conv-001-uuid`

**レスポンス**: `200 OK`
```json
{
  "id": "conv-001-uuid",
  "title": "来週のセミナー見積作成",
  "context_type": "event_detail",
  "context_id": "evt-001-uuid",
  "messages": [
    {
      "role": "user",
      "content": "来週のセミナーの見積を作成して",
      "timestamp": "2026-02-09T16:23:00Z"
    },
    {
      "role": "assistant",
      "content": "かしこまりました。セミナーの見積を作成します。",
      "timestamp": "2026-02-09T16:23:02Z",
      "tool_calls": [
        {
          "id": "tc-001",
          "type": "function",
          "function": {
            "name": "generate_estimate",
            "arguments": "{\"event_id\":\"evt-001-uuid\"}"
          }
        }
      ],
      "tool_call_results": [
        {
          "tool_call_id": "tc-001",
          "result": { "success": true, "estimate_id": "est-001-uuid", "total": 450000 }
        }
      ]
    }
  ],
  "model_used": "claude-sonnet-4",
  "total_tokens": 1234,
  "created_at": "2026-02-09T16:23:00Z",
  "updated_at": "2026-02-09T16:23:05Z"
}
```

---

#### E-4: AIアクション実行

**リクエスト**: `POST /api/v1/ai/actions`
```json
{
  "action": "create_event_draft",
  "params": {
    "title": "AI活用セミナー",
    "date": "2026-03-15",
    "venue_name": "渋谷カンファレンスセンター"
  },
  "context": {
    "type": "general"
  }
}
```

**レスポンス**: `200 OK`
```json
{
  "success": true,
  "action": "create_event_draft",
  "result": {
    "event_id": "evt-002-uuid",
    "title": "AI活用セミナー",
    "status": "draft",
    "message": "イベント「AI活用セミナー」を作成しました"
  }
}
```

---

#### E-5: 提案適用

**リクエスト**: `POST /api/v1/ai/suggestions/sug-001-uuid/apply`
```json
{
  "conversation_id": "conv-001-uuid"
}
```

**レスポンス**: `200 OK`
```json
{
  "success": true,
  "suggestion_id": "sug-001-uuid",
  "applied_changes": {
    "type": "event_update",
    "entity_id": "evt-001-uuid",
    "changes": {
      "venue_name": "渋谷カンファレンスセンター",
      "capacity": 100
    }
  },
  "message": "提案を適用しました"
}
```

---

#### E-6: 会話削除

**リクエスト**: `DELETE /api/v1/ai/conversations/conv-001-uuid`

**レスポンス**: `200 OK`
```json
{
  "success": true,
  "deleted_id": "conv-001-uuid",
  "message": "会話を削除しました"
}
```

---

### §3-F. 境界値 [CONTRACT]

| 項目 | 下限 | 上限 | 超過時の挙動 |
|------|------|------|-------------|
| メッセージ文字数 | 1文字 | 4,000文字 | バリデーションエラー（VALIDATION_ERROR） |
| 会話タイトル文字数 | 1文字 | 200文字 | 200文字で切り詰め（自動生成のため） |
| 1会話あたりメッセージ数 | 1件 | 200件 | "会話が長くなりました。新しい会話を開始してください。" と通知 |
| AI応答時間 | — | 3秒（目標） | 3秒超過でもストリーミング中は継続。30秒超過で AI_TIMEOUT |
| 添付ファイルサイズ | — | 10MB | バリデーションエラー（VALIDATION_ERROR: "ファイルサイズは10MB以下にしてください"） |
| 会話履歴取得件数（limit） | 1 | 100 | 100に丸める |
| レート制限 | — | 20リクエスト/分/ユーザー | RATE_LIMIT エラー（429） |
| コンテキストウィンドウ | — | 100,000トークン | 古いメッセージを自動トリミング |

---

### §3-G. 例外レスポンス [CONTRACT]

| エラーコード | HTTPステータス | メッセージ（日本語） | 発生条件 |
|-------------|---------------|---------------------|---------|
| VALIDATION_ERROR | 400 | "入力内容に誤りがあります" | メッセージ空文字、文字数超過、不正なcontext_type |
| AI_SERVICE_UNAVAILABLE | 503 | "AIサービスが一時的に利用できません。しばらくしてから再試行してください" | Claude API / GPT API 両方が応答不可 |
| AI_TIMEOUT | 504 | "AIの応答がタイムアウトしました。もう一度お試しください" | 30秒以内にAI応答が開始されない |
| RATE_LIMIT | 429 | "送信回数が上限に達しました。1分後に再試行してください" | 20リクエスト/分を超過 |
| FORBIDDEN | 403 | "この操作を実行する権限がありません" | ロールに許可されていないTool Call実行試行、他テナントのリソースアクセス |
| CONVERSATION_NOT_FOUND | 404 | "指定された会話が見つかりません" | 存在しない・削除済みの conversation_id を指定 |

---

### §3-H. 受け入れテスト（Gherkin） [CONTRACT]

#### AT-050-1: AIチャットの基本送受信

```gherkin
Feature: AIチャットの基本送受信
  Scenario: ユーザーがAIにメッセージを送信し、ストリーミング応答を受け取る
    Given ユーザーがログイン済みである
    And チャットパネルが展開されている
    When メッセージ入力欄に "来週のイベントを教えて" と入力する
    And 送信ボタンをクリックする
    Then ユーザーメッセージが右側にバブル表示される
    And AIの応答が左側にストリーミング表示される
    And 応答完了後にメッセージが確定表示される
```

---

#### AT-050-2: ショートカットによるチャットパネル起動

```gherkin
Feature: ショートカットによるチャットパネル起動
  Scenario: Cmd+K でチャットパネルを開く（Mac）
    Given ユーザーがログイン済みである
    And チャットパネルが閉じている
    When "Cmd+K" を押下する
    Then 右スライドオーバーでチャットパネルが展開される
    And メッセージ入力欄にフォーカスが当たる

  Scenario: Ctrl+K でチャットパネルを開く（Windows）
    Given ユーザーがログイン済みである
    And チャットパネルが閉じている
    When "Ctrl+K" を押下する
    Then 右スライドオーバーでチャットパネルが展開される
    And メッセージ入力欄にフォーカスが当たる
```

---

#### AT-050-3: Tool Call結果の表示

```gherkin
Feature: Tool Call結果の表示
  Scenario: Organizerがイベント作成をAIに依頼する
    Given ユーザーが "organizer" ロールでログイン済みである
    And チャットパネルが展開されている
    When "「AI活用セミナー」というイベントを作成して" と送信する
    Then AIが create_event_draft Tool Call を実行する
    And Tool Call結果カードが表示される
    And カードに "イベントを作成しました" と表示される
    And "[イベント詳細を見る]" ボタンが表示される
```

---

#### AT-050-4: 会話履歴の表示と復元

```gherkin
Feature: 会話履歴の表示と復元
  Scenario: 過去の会話を履歴から復元する
    Given ユーザーがログイン済みである
    And 過去に3件以上の会話が存在する
    When チャットパネルの "履歴" タブをクリックする
    Then 過去の会話スレッド一覧が最新順で表示される
    When 任意の会話スレッドをクリックする
    Then "チャット" タブに切り替わる
    And 選択した会話の全メッセージが復元表示される
```

---

#### AT-051-1: ロール別情報スコープ制御（Organizer）

```gherkin
Feature: ロール別情報スコープ制御
  Scenario: Organizerは自組織の全イベント情報にアクセスできる
    Given ユーザーが "organizer" ロールでログイン済みである
    And 自組織に3件のイベントが存在する
    When "今月のイベント一覧を教えて" と送信する
    Then 自組織の3件全てのイベントが応答に含まれる
    And 他組織のイベントは応答に含まれない
```

---

#### AT-051-2: ロール別情報スコープ制御（Venue Staff）

```gherkin
Feature: ロール別情報スコープ制御（Venue Staff）
  Scenario: Venue Staffは自会場のイベントのみアクセスできる
    Given ユーザーが "venue_staff" ロールでログイン済みである
    And "渋谷会場" に所属している
    And "渋谷会場" で2件、"新宿会場" で1件のイベントが存在する
    When "今月のイベント一覧を教えて" と送信する
    Then "渋谷会場" の2件のイベントのみが応答に含まれる
    And "新宿会場" のイベントは応答に含まれない
```

---

#### AT-051-3: Tool Call権限制御の拒否

```gherkin
Feature: Tool Call権限制御
  Scenario: Venue StaffがOrganizerのみ許可されたTool Callを試行する
    Given ユーザーが "venue_staff" ロールでログイン済みである
    When "新しいイベントを作成して" と送信する
    Then AIが create_event_draft Tool Call を試行する
    And 権限チェックにより拒否される
    And "この操作を実行する権限がありません" とエラーメッセージが表示される
```

---

#### AT-050-5: レート制限の適用

```gherkin
Feature: レート制限
  Scenario: 1分間に20回を超えるリクエストを送信する
    Given ユーザーがログイン済みである
    And 直近1分間に20回メッセージを送信済みである
    When 21回目のメッセージを送信する
    Then HTTPステータス 429 が返却される
    And "送信回数が上限に達しました。1分後に再試行してください" と表示される
    And 60秒経過後に再送信が可能になる
```

---

#### AT-050-6: メッセージバリデーション

```gherkin
Feature: メッセージバリデーション
  Scenario: 空文字のメッセージを送信しようとする
    Given チャットパネルが展開されている
    When メッセージ入力欄が空の状態で送信ボタンをクリックする
    Then 送信ボタンが無効化されており送信されない

  Scenario: 4000文字を超えるメッセージを入力する
    Given チャットパネルが展開されている
    When メッセージ入力欄に4001文字以上を入力する
    Then 文字数カウンターが赤色で "4001/4000" と表示される
    And 送信ボタンが無効化される
```

---

## §4. データモデル [CONTRACT]

### ai_conversation テーブル

```typescript
// server/database/schema/ai-conversation.ts
import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { tenants } from './tenants';

export const aiConversations = pgTable('ai_conversation', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenant_id: uuid('tenant_id').references(() => tenants.id).notNull(),
  user_id: uuid('user_id').references(() => users.id).notNull(),

  // 会話メタデータ
  title: text('title'), // 最初のメッセージから自動生成
  context_type: text('context_type'), // 'event_detail' | 'task_list' | 'venue_management' | 'general'
  context_id: uuid('context_id'), // event_id, venue_id 等

  // 会話内容（メッセージ配列）
  messages: jsonb('messages').notNull(), // Message[]

  // モデル情報
  model_used: text('model_used').notNull(), // 'claude-sonnet-4' | 'gpt-4o'
  total_tokens: integer('total_tokens').default(0),

  // タイムスタンプ
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('ai_conversation_tenant_idx').on(table.tenant_id),
  userIdx: index('ai_conversation_user_idx').on(table.user_id),
  contextIdx: index('ai_conversation_context_idx').on(table.context_type, table.context_id),
}));

// 型定義
export type AIMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string; // ISO 8601
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string; // 'create_event_draft' | 'generate_estimate' 等
      arguments: string; // JSON文字列
    };
  }>;
  tool_call_results?: Array<{
    tool_call_id: string;
    result: any; // Tool実行結果
  }>;
};

export type AIConversation = typeof aiConversations.$inferSelect;
export type NewAIConversation = typeof aiConversations.$inferInsert;
```

---

## §5. API仕様 [CONTRACT]

### POST /api/v1/ai/chat (ストリーミング)

**目的**: AIチャット会話（SSE形式でストリーミング応答）

**リクエスト**:
```typescript
{
  conversation_id?: string; // 既存会話の継続時
  message: string; // ユーザーメッセージ（最大2000文字）
  context?: {
    type: 'event_detail' | 'task_list' | 'venue_management' | 'general';
    id?: string; // event_id, venue_id 等
    metadata?: Record<string, any>; // 追加コンテキスト
  };
  stream?: boolean; // default: true
}
```

**レスポンス（SSE形式）**:
```typescript
// data: <JSON>\n\n の繰り返し

// 1. テキストチャンク
data: {"type":"text","content":"こんにちは"}

// 2. Tool Call開始
data: {"type":"tool_call_start","tool":"create_event_draft","args":{...}}

// 3. Tool Call結果
data: {"type":"tool_call_result","tool":"create_event_draft","result":{...}}

// 4. エラー
data: {"type":"error","code":"RATE_LIMIT_EXCEEDED","message":"..."}

// 5. 完了
data: {"type":"done","conversation_id":"uuid","tokens":1234}
```

**エラーコード**:
- `RATE_LIMIT_EXCEEDED`: レート制限超過（20req/min）
- `CONTEXT_TOO_LARGE`: コンテキスト超過（10万トークン）
- `UNAUTHORIZED_TOOL_CALL`: 権限外のTool Call実行試行
- `AI_SERVICE_ERROR`: LLM API エラー

---

### GET /api/v1/ai/conversations

**目的**: 会話履歴一覧取得

**クエリパラメータ**:
```typescript
{
  limit?: number; // default: 20, max: 100
  offset?: number; // default: 0
  context_type?: string; // フィルタ
}
```

**レスポンス**:
```typescript
{
  conversations: Array<{
    id: string;
    title: string;
    context_type: string;
    last_message: string; // 最後のメッセージ（100文字まで）
    updated_at: string; // ISO 8601
  }>;
  total: number;
}
```

---

### GET /api/v1/ai/conversations/:id

**目的**: 特定会話の詳細取得

**レスポンス**:
```typescript
{
  id: string;
  title: string;
  context_type: string;
  context_id: string | null;
  messages: AIMessage[];
  model_used: string;
  total_tokens: number;
  created_at: string;
  updated_at: string;
}
```

---

## §6. UI仕様 [DETAIL]

### 6.1 ヘッダーAI入力欄

```
┌─────────────────────────────────────────────────────────────────────┐
│ 配信プラス HUB                                  👤 山田太郎  🔔 ⚙️ │
├─────────────────────────────────────────────────────────────────────┤
│  [🤖 AIに聞く／頼む（⌘K）                                      ] │
└─────────────────────────────────────────────────────────────────────┘
```

**仕様**:
- 常時表示（全画面共通）
- クリックでチャットパネル展開
- `Cmd+K` / `Ctrl+K` ショートカット
- プレースホルダー: "AIに聞く／頼む（⌘K）"
- アイコン: 🤖（robot）
- 幅: 400px（固定）
- Nuxt UI v3 Input コンポーネント

---

### 6.2 チャットパネル（スライドオーバー）

```
┌─────────────────────────────────────────────────────────┐
│ HUBコンシェルジュ                             [×]      │
├───────────────────────────────────────────┬─────────────┤
│ [チャット] [履歴]                         │             │
├───────────────────────────────────────────┴─────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 山田太郎 (16:23)                               │   │
│  │ 来週のセミナーの見積を作成して               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🤖 HUBコンシェルジュ (16:23)                   │   │
│  │ かしこまりました。以下の内容で見積を作成し    │   │
│  │ ます：                                         │   │
│  │                                                 │   │
│  │ ┌───────────────────────────────────────────┐  │   │
│  │ │ ✅ 見積書を作成しました                    │  │   │
│  │ │ イベント: "AI活用セミナー"                │  │   │
│  │ │ 合計: ¥450,000                            │  │   │
│  │ │ [詳細を見る]                              │  │   │
│  │ └───────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 山田太郎 (16:24)                               │   │
│  │ 会場の設備を確認したい                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🤖 HUBコンシェルジュ (16:24)                   │   │
│  │ ▮                                              │ ← ストリーミング中
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ [                                                  ]    │
│ [メッセージを入力（Shift+Enterで改行）   ] [送信]     │
└─────────────────────────────────────────────────────────┘
```

**仕様**:
- スライドオーバー（右から展開）
- 幅: 480px
- 背景オーバーレイ: rgba(0,0,0,0.5)
- 閉じる: Escキー、オーバーレイクリック、[×]ボタン
- タブ: [チャット] [履歴]
- メッセージ表示エリア: スクロール可能、最新メッセージまで自動スクロール
- 入力欄: マルチライン（最大5行表示）、最大2000文字、Shift+Enter改行、Enter送信

---

### 6.3 メッセージバブル

#### ユーザーメッセージ
```
┌─────────────────────────────────────────────────┐
│ 山田太郎 (16:23)                               │
│ 来週のセミナーの見積を作成して               │
└─────────────────────────────────────────────────┘
```

#### AIメッセージ
```
┌─────────────────────────────────────────────────┐
│ 🤖 HUBコンシェルジュ (16:23)                   │
│ かしこまりました。セミナーの見積を作成します。│
└─────────────────────────────────────────────────┘
```

**仕様**:
- ユーザー: 右寄せ、背景 gray-100
- AI: 左寄せ、背景 white、border gray-200
- タイムスタンプ: HH:MM形式
- Markdown対応（太字・リスト・コードブロック）
- リンクは自動リンク化

---

### 6.4 Tool Call結果カード

#### イベント作成
```
┌───────────────────────────────────────────┐
│ ✅ イベントを作成しました                  │
│ タイトル: "AI活用セミナー"               │
│ 日時: 2026-03-15 14:00                  │
│ [イベント詳細を見る]                     │
└───────────────────────────────────────────┘
```

#### 見積生成
```
┌───────────────────────────────────────────┐
│ ✅ 見積書を作成しました                    │
│ イベント: "AI活用セミナー"               │
│ 合計: ¥450,000                          │
│ [詳細を見る]                            │
└───────────────────────────────────────────┘
```

#### タスク追加
```
┌───────────────────────────────────────────┐
│ ✅ タスクを3件追加しました                 │
│ • 会場予約確認                           │
│ • 配信機材手配                           │
│ • 登壇者スライド依頼                     │
│ [タスク一覧を見る]                       │
└───────────────────────────────────────────┘
```

**仕様**:
- 背景: green-50
- border: green-200
- アイコン: ✅
- ボタン: Nuxt UI v3 Button (secondary)

---

### 6.5 会話履歴タブ

```
┌─────────────────────────────────────────────────────────┐
│ HUBコンシェルジュ                             [×]      │
├───────────────────────────────────────────┬─────────────┤
│ [チャット] [履歴]                         │             │
├───────────────────────────────────────────┴─────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 来週のセミナーの見積作成                       │   │
│  │ "かしこまりました。見積を作成します..."        │   │
│  │ 2時間前                                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 会場の設備確認                                 │   │
│  │ "渋谷会場の設備は以下の通りです..."          │   │
│  │ 5時間前                                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ タスクの期限変更                               │   │
│  │ "タスク「会場予約確認」の期限を..."          │   │
│  │ 昨日                                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**仕様**:
- 会話スレッド一覧（最新順）
- 各カード: タイトル（自動生成）、最後のメッセージ（100文字まで）、相対時間
- クリックで会話を復元してチャットタブに切り替え
- スクロール可能
- 無限スクロール（20件ずつ追加読み込み）

---

## §7. ビジネスルール [DETAIL]

### 7.1 ロール別情報スコープ

| ロール | アクセス可能な情報 | Tool Call権限 |
|--------|-------------------|--------------|
| **Organizer（主催者）** | 自組織の全イベント・参加者・タスク・見積・ドキュメント | create_event_draft<br>generate_estimate<br>generate_tasks<br>search_venues<br>send_notification |
| **Venue Staff（会場スタッフ）** | 自会場に関連するイベント・レイアウト・設備・予約状況 | update_venue_status |
| **Streaming Staff（配信スタッフ）** | 担当イベントの配信情報・機材・タイムテーブル | update_streaming_status |
| **Speaker（登壇者）** | 自分が登壇するイベント・スライド・タイムテーブル | upload_slide |
| **Participant（参加者）** | 自分が参加登録したイベント情報・チケット | なし（読み取りのみ） |

---

### 7.2 コンテキスト注入ルール

#### イベント詳細画面（/events/:id）
```typescript
{
  context: {
    type: 'event_detail',
    id: 'event-uuid',
    metadata: {
      event_title: 'AI活用セミナー',
      event_date: '2026-03-15',
      status: 'planning',
      participant_count: 45
    }
  }
}
```

#### タスク一覧画面（/tasks）
```typescript
{
  context: {
    type: 'task_list',
    metadata: {
      total_tasks: 12,
      overdue_tasks: 2,
      today_tasks: 3
    }
  }
}
```

#### 会場管理画面（/venues/:id）
```typescript
{
  context: {
    type: 'venue_management',
    id: 'venue-uuid',
    metadata: {
      venue_name: '渋谷カンファレンスセンター',
      upcoming_events: 3
    }
  }
}
```

---

### 7.3 Tool Call権限制御

```typescript
// server/utils/ai/tools/tool-permission.ts
export const TOOL_PERMISSIONS: Record<string, string[]> = {
  create_event_draft: ['organizer', 'admin'],
  generate_estimate: ['organizer', 'admin'],
  generate_tasks: ['organizer', 'admin'],
  search_venues: ['organizer', 'admin'],
  send_notification: ['organizer', 'admin'],
  update_venue_status: ['venue_staff', 'admin'],
  update_streaming_status: ['streaming_staff', 'admin'],
  upload_slide: ['speaker', 'admin'],
};

export function hasToolPermission(
  userRole: string,
  toolName: string
): boolean {
  const allowedRoles = TOOL_PERMISSIONS[toolName];
  if (!allowedRoles) return false;
  return allowedRoles.includes(userRole);
}
```

**動作**:
- AI が Tool Call を試行する前に権限チェック
- 権限がない場合は `UNAUTHORIZED_TOOL_CALL` エラーを返す
- ユーザーには "この操作を実行する権限がありません" と表示

---

### 7.4 テナント境界の隔離

```typescript
// Context Builder 内部ロジック
async function buildContext(userId: string, tenantId: string) {
  // 必ず tenant_id でフィルタリング
  const events = await db.select()
    .from(events)
    .where(eq(events.tenant_id, tenantId));

  const tasks = await db.select()
    .from(tasks)
    .where(eq(tasks.tenant_id, tenantId));

  // 他組織の情報は絶対に含めない
  return { events, tasks };
}
```

---

### 7.5 レート制限

- **制限**: 20リクエスト/分/ユーザー
- **実装**: Redis + Sliding Window
- **超過時**: `RATE_LIMIT_EXCEEDED` エラー、60秒後にリセット
- **UI**: "送信回数が上限に達しました。1分後に再試行してください。"

---

### 7.6 コンテキストウィンドウ管理

- **上限**: 10万トークン（Claude Sonnet 4の制限）
- **超過時**: 古いメッセージから自動トリミング
  - システムメッセージ（最初の1件）は保持
  - 直近10件のメッセージは保持
  - 11件目以降から古い順に削除
- **ユーザー通知**: "会話が長くなったため、古いメッセージを省略しました。"

---

## §8. 非機能要件（NFR）[DETAIL]

| NFR ID | 項目 | 目標値 | 検証方法 |
|--------|------|--------|----------|
| NFR-050-1 | ストリーミング初回応答時間 | < 2秒 | Performance Test |
| NFR-050-2 | ストリーミング文字表示レート | 30-50文字/秒 | 目視 |
| NFR-050-3 | チャットパネル展開アニメーション | < 300ms | 目視 |
| NFR-050-4 | 会話履歴読み込み時間 | < 500ms（20件） | Performance Test |
| NFR-050-5 | 同時接続数 | 100ユーザー | Load Test |
| NFR-051-1 | ロール別コンテキスト切り替え時間 | < 100ms | Unit Test |

---

## §9. 技術制約・設計判断 [DETAIL]

### 9.1 フロントエンド実装

```typescript
// composables/useAIChat.ts
import { useChat } from '@ai-sdk/vue';

export function useAIChat(conversationId?: string) {
  const { messages, input, append, isLoading, error, reload } = useChat({
    api: '/api/v1/ai/chat',
    body: {
      conversation_id: conversationId,
      context: getCurrentPageContext(),
    },
    onFinish: (message) => {
      // Tool Call結果を処理
      handleToolCallResults(message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    messages,
    input,
    sendMessage: append,
    isLoading,
    error,
    retry: reload,
  };
}
```

---

### 9.2 バックエンド実装（AI Service Layer）

```typescript
// server/api/v1/ai/chat.post.ts
export default defineEventHandler(async (event) => {
  const { conversation_id, message, context } = await readBody(event);
  const { userId, tenantId, role } = await requireAuth(event);

  // レート制限チェック
  await checkRateLimit(userId);

  // Context Builder
  const contextData = await buildContextForRole(
    tenantId,
    role,
    context
  );

  // LLM Router（Claude → GPT fallback）
  const stream = await aiService.chat({
    conversationId: conversation_id,
    message,
    context: contextData,
    userId,
    tenantId,
    tools: getToolsForRole(role),
  });

  // SSE ストリーミング
  return sendStream(event, stream);
});
```

---

### 9.3 Tool Call実装例（create_event_draft）

```typescript
// server/utils/ai/tools/create-event-draft.ts
export const createEventDraftTool = {
  name: 'create_event_draft',
  description: 'イベントのドラフトを作成する',
  parameters: z.object({
    title: z.string().describe('イベントタイトル'),
    date: z.string().describe('開催日（YYYY-MM-DD）'),
    venue_name: z.string().optional().describe('会場名'),
  }),
  execute: async (params, context) => {
    // 権限チェック
    if (!hasToolPermission(context.role, 'create_event_draft')) {
      throw new Error('この操作を実行する権限がありません');
    }

    // イベント作成
    const event = await db.insert(events).values({
      tenant_id: context.tenantId,
      created_by: context.userId,
      title: params.title,
      date: params.date,
      status: 'draft',
    }).returning();

    return {
      success: true,
      event_id: event[0].id,
      message: `イベント「${params.title}」を作成しました`,
    };
  },
};
```

---

## §10. テストケース [DETAIL]

### TC-050-1: ヘッダーAI入力欄の表示
**前提**: ログイン済み
**手順**:
1. 任意の画面にアクセス
2. ヘッダーを確認

**期待結果**:
- AI入力欄が常時表示されている
- プレースホルダー: "AIに聞く／頼む（⌘K）"

---

### TC-050-2: チャットパネルの展開
**前提**: ログイン済み
**手順**:
1. ヘッダーのAI入力欄をクリック

**期待結果**:
- 右からスライドオーバーでチャットパネルが展開
- 背景オーバーレイが表示
- 入力欄にフォーカス

---

### TC-050-3: ショートカット起動
**前提**: ログイン済み
**手順**:
1. `Cmd+K`（Mac）または `Ctrl+K`（Windows）を押下

**期待結果**:
- チャットパネルが展開
- 入力欄にフォーカス

---

### TC-050-4: メッセージ送信とストリーミング表示
**前提**: チャットパネル展開済み
**手順**:
1. "来週のイベントを教えて" と入力して送信
2. AIの応答を観察

**期待結果**:
- ユーザーメッセージが右側に表示
- AIメッセージが左側に順次表示（ストリーミング）
- 文字が滑らかに追加される（30-50文字/秒）

---

### TC-050-5: Tool Call結果の表示
**前提**: Organizerロールでログイン
**手順**:
1. "「AI活用セミナー」というイベントを作成して" と送信
2. 応答を確認

**期待結果**:
- AI応答に Tool Call結果カードが表示
- "✅ イベントを作成しました" というメッセージ
- [イベント詳細を見る] ボタンが表示

---

### TC-050-6: 会話履歴の表示と復元
**前提**: 過去に会話済み
**手順**:
1. チャットパネルの [履歴] タブをクリック
2. 会話スレッドをクリック

**期待結果**:
- 過去の会話スレッド一覧が表示（最新順）
- クリックした会話が [チャット] タブに復元
- 過去のメッセージが全て表示される

---

### TC-051-1: Organizerロールの情報スコープ
**前提**: Organizerロールでログイン
**手順**:
1. "今月のイベント一覧を教えて" と送信

**期待結果**:
- 自組織の全イベントが応答に含まれる
- 他組織のイベントは含まれない

---

### TC-051-2: Venue Staffロールの情報スコープ
**前提**: Venue Staffロールでログイン、渋谷会場に所属
**手順**:
1. "今月のイベント一覧を教えて" と送信

**期待結果**:
- 渋谷会場で開催されるイベントのみが応答に含まれる
- 他会場のイベントは含まれない

---

### TC-051-3: Participantロールの情報スコープ
**前提**: Participantロールでログイン、1件のイベントに参加登録済み
**手順**:
1. "参加予定のイベントを教えて" と送信

**期待結果**:
- 自分が参加登録したイベントのみが応答に含まれる
- 他の参加者のイベントは含まれない

---

### TC-051-4: Tool Call権限制御（Organizer）
**前提**: Organizerロールでログイン
**手順**:
1. "「AI活用セミナー」というイベントを作成して" と送信

**期待結果**:
- Tool Call（create_event_draft）が実行される
- イベントが作成される
- 成功メッセージが表示

---

### TC-051-5: Tool Call権限制御（Venue Staff）
**前提**: Venue Staffロールでログイン
**手順**:
1. "「AI活用セミナー」というイベントを作成して" と送信

**期待結果**:
- Tool Call（create_event_draft）が拒否される
- エラーメッセージ: "この操作を実行する権限がありません"

---

### TC-050-7: レート制限
**前提**: ログイン済み
**手順**:
1. 1分間に21回メッセージを送信

**期待結果**:
- 21回目のリクエストがエラー
- エラーメッセージ: "送信回数が上限に達しました。1分後に再試行してください。"

---

### TC-050-8: コンテキストウィンドウ超過
**前提**: 既存会話が9万トークン消費済み
**手順**:
1. 長文メッセージ（2万トークン相当）を送信

**期待結果**:
- 古いメッセージが自動トリミング
- 通知: "会話が長くなったため、古いメッセージを省略しました。"
- 応答は正常に生成される

---

### TC-050-9: エラー時の再試行
**前提**: ログイン済み
**手順**:
1. ネットワークエラーを発生させる（DevTools → Offline）
2. メッセージを送信
3. [もう一度試す] ボタンをクリック

**期待結果**:
- エラーメッセージ: "送信に失敗しました"
- [もう一度試す] ボタンが表示
- ボタンクリックで再送信される

---

## §11. 実装優先順位・段階的リリース [DETAIL]

### Phase 1（MVP）
- [x] FR-050-1: ヘッダーAI入力欄
- [x] FR-050-2: Cmd+K ショートカット
- [x] FR-050-3: チャットパネル
- [x] FR-050-4: メッセージ入力
- [x] FR-050-5: ストリーミング表示
- [x] FR-050-6: Tool Call結果カード
- [x] FR-051-1: ロール別情報スコープ
- [x] FR-051-2: Tool Call権限制御
- [x] FR-051-3: テナント境界隔離

### Phase 2（Post-MVP）
- [ ] FR-050-7: 会話履歴タブ
- [ ] FR-050-8: ページコンテキスト自動注入
- [ ] FR-050-9: エラー時の再試行
- [ ] FR-051-4: レート制限
- [ ] FR-051-5: コンテキストウィンドウ管理

---

## §12. 未解決課題（Open Questions）[DETAIL]

| ID | 課題 | 期限 | 担当 |
|----|------|------|------|
| OQ-050-1 | ストリーミング中のブラウザバック時の挙動をどうするか？（接続切断 or バックグラウンド継続） | Phase 1 | Backend |
| OQ-050-2 | Tool Call実行中のキャンセル機能は必要か？ | Phase 2 | Product |
| OQ-051-1 | 複数ロールを持つユーザーのコンテキスト切り替えUIは必要か？（例: Organizer + Venue Staff） | Phase 2 | Product |
| OQ-050-3 | 音声入力機能は必要か？（Web Speech API） | Future | Product |
| OQ-050-4 | 画像添付機能は必要か？（図面・レイアウト等） | Future | Product |

---

## 変更履歴

| 日付 | 変更内容 | 変更者 |
|------|----------|--------|
| 2026-02-09 | 初版作成 | Claude Code |
| 2026-02-09 | v1.1: §3-E 入出力例、§3-F 境界値、§3-G 例外レスポンス、§3-H 受け入れテスト（Gherkin）を追加 | Claude Code |
