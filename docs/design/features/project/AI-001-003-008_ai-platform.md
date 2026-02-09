# AI-001/003/008: AIプラットフォーム基盤（プロンプト管理・ストリーミング・PII対策）

## §1 文書情報

| 項目 | 内容 |
|------|------|
| 機能ID | AI-001, AI-003, AI-008 |
| 機能名 | AIプラットフォーム基盤 |
| 優先度 | P0（MVPコア機能） |
| 担当 | バックエンド・AI基盤チーム |
| ステータス | Draft |
| 作成日 | 2026-02-09 |
| 最終更新 | 2026-02-09 |

### 機能ID詳細

- **AI-001**: プロンプト管理（テンプレート管理・変数埋め込み・バージョン管理）
- **AI-003**: AI応答のストリーミング
- **AI-008**: PII対策（個人情報マスキング）

---

## §2 機能概要 [CORE]

### 2.1 目的

Haishin+ HUBの全AI機能を支えるプラットフォーム基盤。プロンプトの一元管理、リアルタイムストリーミング、個人情報保護を実現し、LLM利用のコスト・品質・安全性を担保する。

### 2.2 ビジネス価値

- **プロンプト管理（AI-001）**: プロンプトの版管理・A/Bテストにより品質向上とメンテナンス性を確保
- **ストリーミング（AI-003）**: 応答速度の体感改善によりUX向上
- **PII対策（AI-008）**: 個人情報漏洩リスクを最小化し、GDPR/個人情報保護法に準拠

### 2.3 主要機能

1. **プロンプトテンプレート管理**: CRUD、バージョン管理、変数埋め込み構文
2. **LLMルーター**: ユースケース別モデル選択、フォールバック戦略
3. **ストリーミング応答**: SSE形式でリアルタイム配信
4. **PII自動マスキング**: LLM送信前にマスク、応答後にアンマスク
5. **コスト追跡**: トークン使用量とコストをリクエスト単位で記録

---

## §3 機能要件 [CORE]

### 3.1 プロンプト管理（AI-001）

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-AI-001-001 | プロンプトテンプレートのCRUD操作（テナント管理者のみ） | P0 |
| FR-AI-001-002 | 変数埋め込み構文 `{{category.field}}` をサポート | P0 |
| FR-AI-001-003 | システムプロンプトとユーザープロンプトを分離管理 | P0 |
| FR-AI-001-004 | バージョン管理（version, is_active）でロールバック可能 | P0 |
| FR-AI-001-005 | 変数定義（variables JSONB）で型・必須性・デフォルト値を指定 | P0 |
| FR-AI-001-006 | モデル設定（model_config JSONB）でtemperature, max_tokens等を指定 | P0 |
| FR-AI-001-007 | ユースケース（usecase）で分類（email_draft, schedule_suggest等） | P0 |
| FR-AI-001-008 | A/Bテスト用に複数バージョンを同時にis_active=trueにできる | P1 |

### 3.2 ストリーミング（AI-003）

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-AI-003-001 | SSE（Server-Sent Events）形式で応答をストリーミング | P0 |
| FR-AI-003-002 | ストリーム形式: `data: {"type":"text","content":"..."}` | P0 |
| FR-AI-003-003 | ツール呼び出し: `data: {"type":"tool_call","name":"...","args":{...}}` | P0 |
| FR-AI-003-004 | 完了通知: `data: {"type":"done","usage":{"input_tokens":...,"output_tokens":...}}` | P0 |
| FR-AI-003-005 | エラー通知: `data: {"type":"error","code":"...","message":"..."}` | P0 |
| FR-AI-003-006 | クライアント切断時はストリーム即座に停止 | P0 |
| FR-AI-003-007 | タイムアウト（60秒）でストリーム強制終了 | P0 |

### 3.3 PII対策（AI-008）

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-AI-008-001 | LLM送信前に氏名・メールアドレス・電話番号を自動検出しマスク | P0 |
| FR-AI-008-002 | マスク形式: `[NAME_1]`, `[EMAIL_1]`, `[PHONE_1]` | P0 |
| FR-AI-008-003 | 同一テキスト内で同じ値には同じインデックスを付与 | P0 |
| FR-AI-008-004 | マスク前の元データはメモリ上にのみ保持（DBに保存しない） | P0 |
| FR-AI-008-005 | LLM応答後、マスク値を元の値にアンマスク | P0 |
| FR-AI-008-006 | 日本語氏名パターン: `[姓][名]` 2-10文字 | P0 |
| FR-AI-008-007 | メールパターン: RFC 5322準拠の正規表現 | P0 |
| FR-AI-008-008 | 電話番号パターン: 日本国内形式（ハイフン有無対応） | P0 |

### 3.4 LLMルーター

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-AI-R-001 | ユースケース別にモデルを自動選択 | P0 |
| FR-AI-R-002 | Claude Sonnet 4.5: 複雑タスク（email_draft, schedule_suggest） | P0 |
| FR-AI-R-003 | Claude Haiku 3.5: 簡易タスク（venue_search, quick_qa） | P0 |
| FR-AI-R-004 | GPT-4o: Claude障害時のフォールバック | P0 |
| FR-AI-R-005 | フォールバック戦略: Sonnet → GPT-4o → エラー | P0 |
| FR-AI-R-006 | リクエスト単位でトークン使用量とコストを計算 | P0 |
| FR-AI-R-007 | コスト計算式をモデル別に定義（円/1Kトークン） | P0 |

### 3.5 会話履歴管理

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-AI-C-001 | ai_conversationテーブルに会話履歴を保存 | P0 |
| FR-AI-C-002 | messages JSONB形式: `[{"role":"user","content":"..."},{"role":"assistant","content":"..."}]` | P0 |
| FR-AI-C-003 | イベント紐付け（event_id）で文脈を保持 | P0 |
| FR-AI-C-004 | トークン使用量（total_input_tokens, total_output_tokens）を記録 | P0 |
| FR-AI-C-005 | 推定コスト（estimated_cost_jpy）を記録 | P0 |

### §3-E 入出力例 [CONTRACT]

| # | シナリオ | リクエスト | レスポンス |
|---|---------|-----------|-----------|
| 1 | Claude API呼び出し | `POST /api/v1/ai/generate` `{"usecase":"email_draft","variables":{"event":{"title":"AI活用セミナー"},"user":{"name":"山田太郎"}}}` | `200 (stream)` SSE形式でテキストチャンクを順次返却、最後にdoneイベント |
| 2 | プロンプトテンプレート取得 | `GET /api/v1/ai/templates?usecase=email_draft` | `200` `{"templates":[{"id":"uuid","usecase":"email_draft","name":"メール下書き","version":1,"isActive":true}]}` |
| 3 | GPTフォールバック | `POST /api/v1/ai/generate` `{"usecase":"email_draft",...}` （Claude障害時） | `200 (stream)` GPT-4oにフォールバックし同一SSE形式で返却。`modelProvider:"openai"` |
| 4 | 会話コンテキスト付き | `POST /api/v1/ai/chat` `{"usecase":"email_draft","conversationId":"existing-uuid","userMessage":"もう少しカジュアルに"}` | `200 (stream)` 既存会話コンテキストを含めてSSE形式で返却 |
| 5 | トークン使用量取得 | `GET /api/v1/ai/usage?period=monthly&tenantId=uuid` | `200` `{"totalInputTokens":150000,"totalOutputTokens":320000,"estimatedCostJpy":1250,"byModel":{"claude-sonnet-4.5":{"input":120000,"output":280000}}}` |
| 6 | プロンプトテンプレート更新 | `PATCH /api/v1/ai/templates/:id` `{"systemPrompt":"更新後のシステムプロンプト","modelConfig":{"temperature":0.5}}` | `200` `{"id":"uuid","version":2,"isActive":true}` 旧バージョンは `isActive:false` に |
| 7 | AI応答キャッシュヒット | `POST /api/v1/ai/generate` `{"usecase":"quick_qa","variables":{"question":"配信プラスとは？"}}` （同一入力のキャッシュ有効期間内） | `200 (stream)` キャッシュから即時返却。`usage.cached:true` |
| 8 | レート制限超過 | `POST /api/v1/ai/generate` `{"usecase":"email_draft",...}` （20req/min超過時） | `429` `{"error":{"code":"AI_RATE_LIMIT_EXCEEDED","message":"Rate limit exceeded. Max 20 requests per minute.","retryAfter":30}}` |

### §3-F 境界値 [CONTRACT]

| 項目 | 下限 | 上限 | 備考 |
|------|------|------|------|
| prompt（ユーザープロンプト） | 1文字 | 4,000文字 | 4,001文字以上は `VALIDATION_ERROR` |
| max_tokens | 1 | 4,096 | モデル設定の最大トークン数 |
| temperature | 0.0 | 2.0 | 0.01刻み。範囲外は `VALIDATION_ERROR` |
| 1日あたりトークン上限 | — | テナントごとに設定 | 超過時 `TOKEN_LIMIT_EXCEEDED (402)` |
| 会話履歴保持 | 1メッセージ | 200メッセージ | 201メッセージ目追加時は最古のメッセージを削除 |
| テンプレート名（name） | 1文字 | 255文字 | varchar(255) |
| ユースケース（usecase） | 1文字 | 100文字 | varchar(100) |
| variables JSONB | — | 64KB | PostgreSQL JSONB制限内 |
| ストリーミングタイムアウト | — | 60秒 | 超過時ストリーム強制終了 |
| レート制限 | — | 20リクエスト/分 | テナント×ユーザー単位 |

### §3-G 例外レスポンス [CONTRACT]

| エラーコード | HTTPステータス | 発生条件 | レスポンス例 |
|-------------|---------------|---------|-------------|
| AI_SERVICE_UNAVAILABLE | 503 | 全LLMプロバイダー（Claude・GPT-4o）が利用不可 | `{"error":{"code":"AI_SERVICE_UNAVAILABLE","message":"All AI providers are currently unavailable. Please try again later."}}` |
| AI_TIMEOUT | 504 | ストリーミング応答が60秒以内に完了しない | `{"error":{"code":"AI_TIMEOUT","message":"AI response timed out after 60 seconds."}}` |
| AI_RATE_LIMIT | 429 | テナント×ユーザー単位で20req/minを超過 | `{"error":{"code":"AI_RATE_LIMIT","message":"Rate limit exceeded.","retryAfter":30}}` |
| VALIDATION_ERROR | 400 | リクエストボディのバリデーション失敗（prompt超過、temperature範囲外等） | `{"error":{"code":"VALIDATION_ERROR","message":"prompt must be at most 4000 characters","details":{"field":"prompt","max":4000,"actual":4500}}}` |
| TEMPLATE_NOT_FOUND | 404 | 指定usecaseのアクティブなプロンプトテンプレートが存在しない | `{"error":{"code":"TEMPLATE_NOT_FOUND","message":"No active template found for usecase 'unknown_usecase'."}}` |
| TOKEN_LIMIT_EXCEEDED | 402 | テナントの1日あたりトークン上限を超過 | `{"error":{"code":"TOKEN_LIMIT_EXCEEDED","message":"Daily token limit exceeded for this tenant.","details":{"limit":1000000,"used":1000500}}}` |
| FORBIDDEN | 403 | 権限不足（テナント管理者専用APIに一般ユーザーがアクセス等） | `{"error":{"code":"FORBIDDEN","message":"Insufficient permissions. Tenant admin role required."}}` |

### §3-H 受け入れテスト（Gherkin） [CONTRACT]

```gherkin
# 1. Claude API正常呼び出し
Feature: Claude API正常呼び出し
  Scenario: 有効なプロンプトテンプレートでClaude APIを呼び出す
    Given テナント管理者が "email_draft" のプロンプトテンプレートを登録済み
    And ログイン済みユーザーが存在する
    When POST /api/v1/ai/chat を以下のボディで呼び出す
      | usecase     | email_draft                          |
      | variables   | {"event":{"title":"AI活用セミナー","startDate":"2026-03-15"},"user":{"name":"山田太郎"}} |
      | eventId     | 550e8400-e29b-41d4-a716-446655440000 |
    Then SSEストリームが開始される
    And type="text" のイベントが1回以上送信される
    And 最後に type="done" のイベントが送信される
    And done イベントに conversationId, usage が含まれる
    And ai_conversation テーブルにレコードが保存される

# 2. GPTフォールバック
Feature: GPTフォールバック
  Scenario: Claude API障害時にGPT-4oへフォールバックする
    Given Claude APIが503エラーを返す状態である
    And GPT-4o APIは正常に応答する
    When POST /api/v1/ai/chat を呼び出す
    Then SSEストリームが開始される
    And GPT-4oモデルで応答が生成される
    And done イベントの usage に modelProvider="openai" が記録される

# 3. レート制限
Feature: レート制限
  Scenario: 1分間に20リクエストを超過した場合429を返す
    Given ログイン済みユーザーが存在する
    And 直近1分間に20回のAIリクエストを送信済み
    When POST /api/v1/ai/chat を呼び出す
    Then HTTPステータス 429 が返される
    And レスポンスに "AI_RATE_LIMIT" エラーコードが含まれる
    And retryAfter フィールドに待機秒数が含まれる

# 4. トークン使用量追跡
Feature: トークン使用量追跡
  Scenario: AI呼び出し後にトークン使用量が正確に記録される
    Given ログイン済みユーザーが存在する
    When POST /api/v1/ai/chat を正常に呼び出す
    Then ai_conversation テーブルに以下が記録される
      | total_input_tokens  | 0より大きい整数 |
      | total_output_tokens | 0より大きい整数 |
      | estimated_cost_jpy  | コスト計算式に基づく値 |
    And GET /api/v1/ai/usage で累計使用量が取得できる

# 5. プロンプトテンプレート適用
Feature: プロンプトテンプレート適用
  Scenario: テンプレートの変数が正しく埋め込まれる
    Given usecase="email_draft" のテンプレートが登録済み
    And テンプレートに "{{event.title}}" と "{{user.name}}" の変数が含まれる
    When POST /api/v1/ai/chat を variables={"event":{"title":"セミナー"},"user":{"name":"田中"}} で呼び出す
    Then LLMに送信されるプロンプトに "セミナー" と "田中" が埋め込まれている
    And 変数プレースホルダー "{{...}}" が残っていない

# 6. ストリーミングレスポンス
Feature: ストリーミングレスポンス
  Scenario: SSE形式でリアルタイムに応答が配信される
    Given ログイン済みユーザーが存在する
    When POST /api/v1/ai/chat を呼び出す
    Then レスポンスヘッダーに Content-Type: text/event-stream が設定される
    And Cache-Control: no-cache が設定される
    And 各チャンクが "data: " プレフィックスで送信される
    And テキストチャンクは {"type":"text","content":"..."} 形式である

# 7. キャッシュヒット
Feature: キャッシュヒット
  Scenario: 同一入力でキャッシュ有効期間内の場合キャッシュから返却する
    Given usecase="quick_qa" で同一の variables を持つリクエストが直近に成功済み
    And キャッシュ有効期間内である
    When POST /api/v1/ai/generate を同一パラメータで呼び出す
    Then キャッシュされた応答が返却される
    And usage.cached が true である
    And LLMへの実際のAPI呼び出しは行われない

# 8. タイムアウト処理
Feature: タイムアウト処理
  Scenario: LLM応答が60秒を超過した場合ストリームを強制終了する
    Given LLM APIの応答が60秒以上かかる状態である
    When POST /api/v1/ai/chat を呼び出す
    Then 60秒経過後にストリームが強制終了される
    And type="error" のイベントが送信される
    And エラーコードが "AI_TIMEOUT" である
    And サーバー側のリソースが適切に解放される
```

---

## §4 データ仕様 [CONTRACT]

### 4.1 prompt_templateテーブル

```typescript
export const promptTemplate = pgTable('prompt_template', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenant.id, { onDelete: 'cascade' }),

  // プロンプト分類
  usecase: varchar('usecase', { length: 100 }).notNull(), // email_draft, schedule_suggest, venue_search等
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  // プロンプト本体
  systemPrompt: text('system_prompt').notNull(),
  userPromptTemplate: text('user_prompt_template').notNull(), // 変数埋め込み用: {{event.title}}

  // メタデータ
  variables: jsonb('variables').notNull(), // {event: {type: 'object', required: ['title'], fields: {title: {type: 'string'}}}}
  modelConfig: jsonb('model_config').notNull(), // {temperature: 0.7, max_tokens: 2000}

  // バージョン管理
  version: integer('version').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => user.id),

  // 複合ユニーク制約（同じusecaseで同じバージョンは1つのみ）
});
```

### 4.2 ai_conversationテーブル

```typescript
export const aiConversation = pgTable('ai_conversation', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  eventId: uuid('event_id').references(() => event.id, { onDelete: 'cascade' }), // nullable: イベント紐付けなしの場合あり

  // 会話データ
  messages: jsonb('messages').notNull(), // [{role: 'user', content: '...'}, {role: 'assistant', content: '...'}]
  usecase: varchar('usecase', { length: 100 }).notNull(),

  // モデル情報
  modelProvider: varchar('model_provider', { length: 50 }).notNull(), // anthropic, openai
  modelName: varchar('model_name', { length: 100 }).notNull(), // claude-sonnet-4.5, gpt-4o

  // コスト追跡
  totalInputTokens: integer('total_input_tokens').notNull().default(0),
  totalOutputTokens: integer('total_output_tokens').notNull().default(0),
  estimatedCostJpy: integer('estimated_cost_jpy').notNull().default(0), // 円単位（小数点なし）

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### 4.3 変数定義スキーマ（variables JSONB）

```typescript
type VariableDefinition = {
  [category: string]: {
    type: 'object';
    required: string[];
    fields: {
      [field: string]: {
        type: 'string' | 'number' | 'boolean' | 'date';
        description?: string;
        default?: any;
      };
    };
  };
};

// 例
const exampleVariables: VariableDefinition = {
  event: {
    type: 'object',
    required: ['title', 'startDate'],
    fields: {
      title: { type: 'string', description: 'イベントタイトル' },
      startDate: { type: 'date', description: '開始日時' },
      venue: { type: 'string', description: '会場名', default: '未定' },
    },
  },
  user: {
    type: 'object',
    required: ['name'],
    fields: {
      name: { type: 'string', description: 'ユーザー名' },
      email: { type: 'string', description: 'メールアドレス' },
    },
  },
};
```

### 4.4 モデル設定スキーマ（model_config JSONB）

```typescript
type ModelConfig = {
  temperature: number; // 0.0-1.0
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
};

// 例
const exampleModelConfig: ModelConfig = {
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1.0,
};
```

---

## §5 API仕様 [CONTRACT]

### 5.1 POST /api/v1/ai/chat（ストリーミング）

**概要**: AI会話をストリーミング形式で実行

**認証**: Required（Bearer Token）

**リクエスト**:

```typescript
type AIChatRequest = {
  usecase: string; // プロンプトテンプレートのusecase
  variables: Record<string, any>; // 変数値（{{category.field}}に埋め込まれる）
  eventId?: string; // イベント紐付け（オプション）
  conversationId?: string; // 会話継続の場合は既存ID
  userMessage?: string; // 追加のユーザーメッセージ（オプション）
};

// 例
{
  "usecase": "email_draft",
  "variables": {
    "event": {
      "title": "AI活用セミナー",
      "startDate": "2026-03-15T14:00:00+09:00",
      "venue": "東京国際フォーラム"
    },
    "user": {
      "name": "山田太郎",
      "email": "yamada@example.com"
    }
  },
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "userMessage": "参加者向けにカジュアルなトーンでお願いします"
}
```

**レスポンス（SSE）**:

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"type":"text","content":"こんにちは"}

data: {"type":"text","content":"！"}

data: {"type":"text","content":"山田様"}

data: {"type":"tool_call","id":"call_123","name":"search_venue","args":{"location":"東京","capacity":100}}

data: {"type":"done","conversationId":"uuid","usage":{"inputTokens":150,"outputTokens":320,"estimatedCostJpy":12}}

```

**SSEメッセージ型**:

```typescript
type SSEMessage =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; id: string; name: string; args: Record<string, any> }
  | { type: 'tool_result'; id: string; result: any }
  | { type: 'done'; conversationId: string; usage: { inputTokens: number; outputTokens: number; estimatedCostJpy: number } }
  | { type: 'error'; code: string; message: string };
```

### 5.2 POST /api/v1/ai/generate/email

**概要**: メール本文生成（非ストリーミング）

**認証**: Required

**リクエスト**:

```typescript
type GenerateEmailRequest = {
  eventId: string;
  recipientType: 'speaker' | 'participant' | 'venue'; // 宛先タイプ
  tone?: 'formal' | 'casual'; // トーン（デフォルト: formal）
  additionalInstructions?: string;
};
```

**レスポンス**:

```typescript
type GenerateEmailResponse = {
  subject: string;
  body: string;
  conversationId: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    estimatedCostJpy: number;
  };
};
```

### 5.3 POST /api/v1/ai/generate/schedule

**概要**: スケジュール提案生成

**認証**: Required

**リクエスト**:

```typescript
type GenerateScheduleRequest = {
  eventId: string;
  constraints: {
    startDate: string; // ISO8601
    endDate: string;
    excludeDates?: string[]; // 除外日
  };
  preferences?: {
    preferredDayOfWeek?: number[]; // 0=日曜, 6=土曜
    preferredTime?: 'morning' | 'afternoon' | 'evening';
  };
};
```

**レスポンス**:

```typescript
type GenerateScheduleResponse = {
  suggestions: Array<{
    date: string; // ISO8601
    reason: string; // 提案理由
    score: number; // 0-100
  }>;
  conversationId: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    estimatedCostJpy: number;
  };
};
```

### 5.4 GET /api/v1/ai/conversations

**概要**: 会話履歴一覧取得

**認証**: Required

**クエリパラメータ**:

```typescript
type GetConversationsQuery = {
  eventId?: string; // イベント絞り込み
  usecase?: string; // ユースケース絞り込み
  limit?: number; // デフォルト: 20
  offset?: number;
};
```

**レスポンス**:

```typescript
type GetConversationsResponse = {
  conversations: Array<{
    id: string;
    usecase: string;
    eventId?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    modelProvider: string;
    modelName: string;
    totalInputTokens: number;
    totalOutputTokens: number;
    estimatedCostJpy: number;
    createdAt: string;
  }>;
  total: number;
};
```

### 5.5 管理者API: プロンプトテンプレート管理

#### POST /api/v1/admin/ai/prompt-templates

**権限**: テナント管理者のみ

**リクエスト**:

```typescript
type CreatePromptTemplateRequest = {
  usecase: string;
  name: string;
  description?: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: VariableDefinition;
  modelConfig: ModelConfig;
};
```

#### PUT /api/v1/admin/ai/prompt-templates/:id

**権限**: テナント管理者のみ

**リクエスト**: CreatePromptTemplateRequestと同じ

**動作**: 既存テンプレートをis_active=falseにし、新バージョン（version+1）を作成

#### GET /api/v1/admin/ai/prompt-templates

**権限**: テナント管理者のみ

**レスポンス**:

```typescript
type GetPromptTemplatesResponse = {
  templates: Array<{
    id: string;
    usecase: string;
    name: string;
    version: number;
    isActive: boolean;
    createdAt: string;
  }>;
};
```

---

## §6 UI仕様 [DETAIL]

### 6.1 プロンプトテンプレート管理画面（管理者専用）

**パス**: `/admin/ai/prompt-templates`

**レイアウト**: AdminLayout

**構成要素**:

1. **テンプレート一覧**:
   - テーブル形式: usecase / name / version / isActive / 操作
   - フィルタ: usecase, isActive
   - 操作: 編集 / バージョン履歴 / 削除

2. **テンプレート編集フォーム**:
   - usecase（セレクト: email_draft, schedule_suggest, venue_search等）
   - name（テキスト）
   - description（テキストエリア）
   - systemPrompt（コードエディタ）
   - userPromptTemplate（コードエディタ）
   - variables（JSONエディタ）
   - modelConfig（フォーム: temperature, maxTokens等）
   - プレビュー機能: 変数埋め込み後のプロンプトを表示

3. **バージョン履歴モーダル**:
   - 過去バージョン一覧
   - 差分表示
   - ロールバック機能（該当バージョンをis_active=trueに変更）

### 6.2 PII対策UI

**なし**: PIIマスキング/アンマスキングは完全に透過的に動作するため、ユーザーに特別なUIは不要。

---

## §7 ビジネスルール [CORE]

### 7.1 変数埋め込み構文

**構文**: `{{category.field}}`

**例**:

```
ユーザープロンプトテンプレート:
「{{event.title}}について、{{user.name}}様向けにメール本文を作成してください。開催日は{{event.startDate}}です。」

変数値:
{
  "event": {"title": "AI活用セミナー", "startDate": "2026-03-15T14:00:00+09:00"},
  "user": {"name": "山田太郎"}
}

埋め込み後:
「AI活用セミナーについて、山田太郎様向けにメール本文を作成してください。開催日は2026-03-15T14:00:00+09:00です。」
```

**ルール**:

- 存在しない変数はエラー（`VariableNotFoundError`）
- required変数が未指定の場合はエラー（`RequiredVariableMissingError`）
- 型不一致の場合はエラー（`VariableTypeMismatchError`）
- date型は自動でISO8601にフォーマット

### 7.2 モデル選択ロジック

| ユースケース | モデル | 理由 |
|-------------|--------|------|
| email_draft | Claude Sonnet 4.5 | 長文生成・文脈理解が必要 |
| schedule_suggest | Claude Sonnet 4.5 | 複雑な制約条件の処理 |
| venue_search | Claude Haiku 3.5 | 簡易検索・コスト重視 |
| quick_qa | Claude Haiku 3.5 | 短文応答・速度重視 |
| 上記以外 | Claude Sonnet 4.5 | デフォルト |

### 7.3 フォールバック戦略

```
1. プライマリ: Claude Sonnet 4.5
   ↓ エラー（429, 500, timeout）
2. セカンダリ: GPT-4o
   ↓ エラー
3. 最終: エラーレスポンス（AI_PROVIDER_UNAVAILABLE）
```

### 7.4 コスト計算式（2026年2月時点）

| モデル | Input（円/1K tokens） | Output（円/1K tokens） |
|--------|----------------------|----------------------|
| Claude Sonnet 4.5 | 0.45 | 2.25 |
| Claude Haiku 3.5 | 0.12 | 0.75 |
| GPT-4o | 0.75 | 2.25 |

**計算式**:

```typescript
const estimatedCostJpy = Math.ceil(
  (inputTokens / 1000) * inputCostPerK +
  (outputTokens / 1000) * outputCostPerK
);
```

### 7.5 PII検出パターン

**氏名（日本語）**:

```typescript
const namePattern = /[一-龯ぁ-んァ-ヶー]{2,10}/g;
// マッチ例: 山田太郎, 佐藤花子
// 除外: 1文字（姓・名のみ）、11文字以上（誤検出防止）
```

**メールアドレス**:

```typescript
const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// RFC 5322準拠の簡易版
```

**電話番号（日本）**:

```typescript
const phonePattern = /0\d{1,4}-?\d{1,4}-?\d{4}|0\d{9,10}/g;
// マッチ例: 03-1234-5678, 090-1234-5678, 09012345678
```

### 7.6 マスキングルール

**マスク形式**: `[TYPE_INDEX]`

**例**:

```
元テキスト:
「山田太郎さん（yamada@example.com）と鈴木花子さん（suzuki@example.com）、そして山田太郎さんの連絡先は090-1234-5678です。」

マスク後:
「[NAME_1]さん（[EMAIL_1]）と[NAME_2]さん（[EMAIL_2]）、そして[NAME_1]さんの連絡先は[PHONE_1]です。」
```

**ルール**:

- 同じ値には同じインデックスを付与（例: 山田太郎 → 全て[NAME_1]）
- インデックスは出現順に採番（1始まり）
- マスク前後のマッピングはメモリ上のみ保持（リクエストスコープ）

---

## §8 非機能要件 [DETAIL]

### 8.1 パフォーマンス

| 項目 | 目標値 |
|------|--------|
| ストリーミング初回応答 | 1秒以内 |
| プロンプトレンダリング | 50ms以内 |
| PIIマスキング/アンマスキング | 100ms以内 |
| 会話履歴取得 | 200ms以内 |

### 8.2 可用性

- LLMプロバイダー障害時の自動フォールバック: 5秒以内
- タイムアウト設定: 60秒（ストリーミング）

### 8.3 セキュリティ

- PIIマスクデータはメモリ上にのみ保持（DB/ログに記録しない）
- 会話履歴は暗号化せず平文で保存（テナント分離で保護）
- プロンプトテンプレートの変更履歴を監査ログに記録

### 8.4 コスト管理

- 月間コスト上限アラート: テナント単位で設定可能
- リクエスト単位でコスト記録
- 管理画面でコスト集計レポート表示

---

## §9 エラーハンドリング [DETAIL]

### 9.1 エラーコード

| コード | 説明 | HTTPステータス |
|--------|------|---------------|
| PROMPT_TEMPLATE_NOT_FOUND | 指定usecaseのプロンプトテンプレートが存在しない | 404 |
| VARIABLE_NOT_FOUND | 必要な変数が見つからない | 400 |
| REQUIRED_VARIABLE_MISSING | required変数が未指定 | 400 |
| VARIABLE_TYPE_MISMATCH | 変数の型が不一致 | 400 |
| AI_PROVIDER_UNAVAILABLE | 全LLMプロバイダーが利用不可 | 503 |
| AI_RATE_LIMIT_EXCEEDED | レート制限超過 | 429 |
| AI_STREAMING_ERROR | ストリーミング中のエラー | 500 |
| PII_MASKING_ERROR | PIIマスキング失敗 | 500 |
| CONVERSATION_NOT_FOUND | 会話履歴が見つからない | 404 |
| TENANT_COST_LIMIT_EXCEEDED | テナントのコスト上限超過 | 402 |

### 9.2 エラーレスポンス（非ストリーミング）

```typescript
type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
};

// 例
{
  "error": {
    "code": "REQUIRED_VARIABLE_MISSING",
    "message": "Required variable 'event.title' is missing",
    "details": {
      "missingVariables": ["event.title", "user.name"]
    }
  }
}
```

### 9.3 エラーレスポンス（ストリーミング）

```
data: {"type":"error","code":"AI_RATE_LIMIT_EXCEEDED","message":"Rate limit exceeded. Please try again later."}
```

### 9.4 リトライ戦略

- **AI_RATE_LIMIT_EXCEEDED**: 指数バックオフでリトライ（最大3回、1s → 2s → 4s）
- **AI_PROVIDER_UNAVAILABLE**: フォールバック戦略に従う
- **上記以外**: リトライしない（即座にエラー返却）

---

## §10 テストケース

### 10.1 プロンプトレンダリングテスト

| ケース | 入力 | 期待結果 |
|--------|------|---------|
| 正常系: 全変数埋め込み | テンプレート: `"{{event.title}}は{{event.startDate}}開催"`, 変数: `{event: {title: "セミナー", startDate: "2026-03-15"}}` | `"セミナーは2026-03-15開催"` |
| 異常系: 変数なし | テンプレート: `"{{event.title}}"`, 変数: `{}` | `VARIABLE_NOT_FOUND` |
| 異常系: required変数未指定 | variables定義でrequired: `['title']`, 変数: `{event: {}}` | `REQUIRED_VARIABLE_MISSING` |
| 異常系: 型不一致 | variables定義でtype: `'number'`, 変数: `{event: {capacity: "100"}}` | `VARIABLE_TYPE_MISMATCH` |
| エッジケース: ネスト深い | テンプレート: `"{{event.venue.address.city}}"`, 変数: `{event: {venue: {address: {city: "東京"}}}}` | `"東京"` |

### 10.2 PIIマスキング/アンマスキングテスト

| ケース | 入力 | マスク後 | アンマスク後 |
|--------|------|---------|-------------|
| 氏名のみ | `"山田太郎さん"` | `"[NAME_1]さん"` | `"山田太郎さん"` |
| 同一氏名複数 | `"山田太郎と山田太郎"` | `"[NAME_1]と[NAME_1]"` | `"山田太郎と山田太郎"` |
| メールアドレス | `"test@example.com"` | `"[EMAIL_1]"` | `"test@example.com"` |
| 電話番号 | `"090-1234-5678"` | `"[PHONE_1]"` | `"090-1234-5678"` |
| 複合 | `"山田太郎（yamada@example.com, 090-1234-5678）"` | `"[NAME_1]（[EMAIL_1], [PHONE_1]）"` | `"山田太郎（yamada@example.com, 090-1234-5678）"` |
| PII含まず | `"イベントは明日です"` | `"イベントは明日です"` | `"イベントは明日です"` |

### 10.3 ストリーミングテスト

| ケース | 検証内容 |
|--------|---------|
| 正常系: テキストストリーム | SSEフォーマット準拠、data: {"type":"text","content":"..."}が複数回送信 |
| 正常系: 完了通知 | 最後にdata: {"type":"done",...}が送信される |
| 異常系: クライアント切断 | ストリームが即座に停止、リソースが解放される |
| 異常系: タイムアウト | 60秒でストリーム強制終了、data: {"type":"error",...}送信 |

### 10.4 LLMルーティングテスト

| ケース | usecase | 期待モデル |
|--------|---------|----------|
| 正常系: 複雑タスク | `email_draft` | Claude Sonnet 4.5 |
| 正常系: 簡易タスク | `quick_qa` | Claude Haiku 3.5 |
| 異常系: Claude障害 | `email_draft` | GPT-4o（フォールバック） |
| 異常系: 全プロバイダー障害 | `email_draft` | `AI_PROVIDER_UNAVAILABLE` |

### 10.5 コスト計算テスト

| ケース | inputTokens | outputTokens | モデル | 期待コスト（円） |
|--------|-------------|--------------|--------|----------------|
| Sonnet | 1000 | 2000 | Claude Sonnet 4.5 | Math.ceil(0.45 + 4.5) = 5 |
| Haiku | 1000 | 2000 | Claude Haiku 3.5 | Math.ceil(0.12 + 1.5) = 2 |
| GPT-4o | 1000 | 2000 | GPT-4o | Math.ceil(0.75 + 4.5) = 6 |

---

## §11 依存関係

### 11.1 前提となる機能

- AUTH-001: ログイン認証（Bearer Token取得）
- AUTH-002: テナント分離（テナントIDによるデータ分離）

### 11.2 依存する外部サービス

- Anthropic Claude API: claude-sonnet-4.5, claude-haiku-3.5
- OpenAI API: gpt-4o
- Vercel AI SDK: ストリーミング抽象化

### 11.3 この機能に依存する機能

- AI-002: メール自動作成
- AI-004: スケジュール提案
- AI-005: 会場検索アシスト
- AI-006: 参加者Q&A自動応答
- AI-007: ダッシュボードインサイト

---

## §12 未決定事項

| 項目 | 内容 | 期限 | 担当 |
|------|------|------|------|
| A/Bテスト機能の実装詳細 | 複数バージョンのis_active=true時の選択ロジック（ランダム？ユーザーID %？） | 2026-02-15 | バックエンド |
| コスト上限アラートの通知方法 | メール？Slack？ダッシュボード内通知？ | 2026-02-15 | PdM |
| PIIマスキング対象の拡張 | 住所、クレジットカード番号等も対象にするか | 2026-02-20 | セキュリティ |
| ストリーミングのリトライ戦略 | ネットワーク切断時のリトライ仕様 | 2026-02-20 | バックエンド |

---

## Appendix: 実装例

### A.1 LLMRouterサービス

```typescript
// server/utils/ai/llm-router.ts

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { streamText } from 'ai';

type ModelProvider = 'anthropic' | 'openai';
type ModelName = 'claude-sonnet-4.5' | 'claude-haiku-3.5' | 'gpt-4o';

type LLMConfig = {
  provider: ModelProvider;
  model: ModelName;
  inputCostPerK: number; // 円/1K tokens
  outputCostPerK: number;
};

const MODEL_CONFIG: Record<string, LLMConfig> = {
  'claude-sonnet-4.5': {
    provider: 'anthropic',
    model: 'claude-sonnet-4.5-20241022',
    inputCostPerK: 0.45,
    outputCostPerK: 2.25,
  },
  'claude-haiku-3.5': {
    provider: 'anthropic',
    model: 'claude-haiku-3.5-20241022',
    inputCostPerK: 0.12,
    outputCostPerK: 0.75,
  },
  'gpt-4o': {
    provider: 'openai',
    model: 'gpt-4o',
    inputCostPerK: 0.75,
    outputCostPerK: 2.25,
  },
};

const USECASE_MODEL_MAP: Record<string, ModelName> = {
  email_draft: 'claude-sonnet-4.5',
  schedule_suggest: 'claude-sonnet-4.5',
  venue_search: 'claude-haiku-3.5',
  quick_qa: 'claude-haiku-3.5',
  default: 'claude-sonnet-4.5',
};

export class LLMRouter {
  private anthropic: Anthropic;
  private openai: OpenAI;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  selectModel(usecase: string): LLMConfig {
    const modelName = USECASE_MODEL_MAP[usecase] || USECASE_MODEL_MAP.default;
    return MODEL_CONFIG[modelName];
  }

  async streamChat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    usecase: string,
    modelConfig: { temperature: number; maxTokens: number }
  ): Promise<{
    stream: ReadableStream;
    usage: { inputTokens: number; outputTokens: number };
  }> {
    const config = this.selectModel(usecase);

    try {
      return await this._streamWithProvider(config, messages, modelConfig);
    } catch (error) {
      // フォールバック: GPT-4o
      console.error(`Primary model ${config.model} failed, falling back to GPT-4o`, error);
      const fallbackConfig = MODEL_CONFIG['gpt-4o'];
      return await this._streamWithProvider(fallbackConfig, messages, modelConfig);
    }
  }

  private async _streamWithProvider(
    config: LLMConfig,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    modelConfig: { temperature: number; maxTokens: number }
  ) {
    if (config.provider === 'anthropic') {
      const stream = await this.anthropic.messages.stream({
        model: config.model,
        max_tokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature,
        messages,
      });

      let inputTokens = 0;
      let outputTokens = 0;

      const transformedStream = new ReadableStream({
        async start(controller) {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue({
                type: 'text',
                content: event.delta.text,
              });
            } else if (event.type === 'message_start') {
              inputTokens = event.message.usage.input_tokens;
            } else if (event.type === 'message_delta') {
              outputTokens = event.usage.output_tokens;
            }
          }
          controller.close();
        },
      });

      return {
        stream: transformedStream,
        usage: { inputTokens, outputTokens },
      };
    } else {
      // OpenAI
      const stream = await this.openai.chat.completions.create({
        model: config.model,
        max_tokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature,
        messages,
        stream: true,
      });

      let inputTokens = 0;
      let outputTokens = 0;

      const transformedStream = new ReadableStream({
        async start(controller) {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              controller.enqueue({
                type: 'text',
                content: delta,
              });
            }
            // OpenAI usage は最後のchunkにのみ含まれる
            if (chunk.usage) {
              inputTokens = chunk.usage.prompt_tokens;
              outputTokens = chunk.usage.completion_tokens;
            }
          }
          controller.close();
        },
      });

      return {
        stream: transformedStream,
        usage: { inputTokens, outputTokens },
      };
    }
  }

  calculateCost(
    inputTokens: number,
    outputTokens: number,
    modelName: ModelName
  ): number {
    const config = MODEL_CONFIG[modelName];
    return Math.ceil(
      (inputTokens / 1000) * config.inputCostPerK +
      (outputTokens / 1000) * config.outputCostPerK
    );
  }
}
```

### A.2 PIIMaskerユーティリティ

```typescript
// server/utils/ai/pii-masker.ts

type PIIType = 'NAME' | 'EMAIL' | 'PHONE';

type MaskMap = {
  [key: string]: string; // 元の値 → マスク値（例: "yamada@example.com" → "[EMAIL_1]"）
};

type UnmaskMap = {
  [key: string]: string; // マスク値 → 元の値（例: "[EMAIL_1]" → "yamada@example.com"）
};

const PATTERNS: Record<PIIType, RegExp> = {
  NAME: /[一-龯ぁ-んァ-ヶー]{2,10}/g,
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  PHONE: /0\d{1,4}-?\d{1,4}-?\d{4}|0\d{9,10}/g,
};

export class PIIMasker {
  private maskMap: MaskMap = {};
  private unmaskMap: UnmaskMap = {};
  private counters: Record<PIIType, number> = {
    NAME: 0,
    EMAIL: 0,
    PHONE: 0,
  };

  mask(text: string): string {
    let masked = text;

    for (const [type, pattern] of Object.entries(PATTERNS)) {
      masked = masked.replace(pattern, (match) => {
        // 既にマスク済みの値か確認
        if (this.maskMap[match]) {
          return this.maskMap[match];
        }

        // 新しいマスク値を生成
        this.counters[type as PIIType]++;
        const maskValue = `[${type}_${this.counters[type as PIIType]}]`;

        // マッピングを保存
        this.maskMap[match] = maskValue;
        this.unmaskMap[maskValue] = match;

        return maskValue;
      });
    }

    return masked;
  }

  unmask(text: string): string {
    let unmasked = text;

    for (const [maskValue, originalValue] of Object.entries(this.unmaskMap)) {
      unmasked = unmasked.replaceAll(maskValue, originalValue);
    }

    return unmasked;
  }

  // デバッグ用
  getMaskMap(): MaskMap {
    return { ...this.maskMap };
  }

  // リクエストスコープ終了時にクリア
  clear() {
    this.maskMap = {};
    this.unmaskMap = {};
    this.counters = { NAME: 0, EMAIL: 0, PHONE: 0 };
  }
}
```

### A.3 PromptRendererユーティリティ

```typescript
// server/utils/ai/prompt-renderer.ts

type VariableValue = Record<string, any>;

export class PromptRenderer {
  render(template: string, variables: VariableValue): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this._getNestedValue(variables, path.trim());

      if (value === undefined) {
        throw new Error(`VARIABLE_NOT_FOUND: ${path}`);
      }

      return String(value);
    });
  }

  validate(
    variables: VariableValue,
    definition: VariableDefinition
  ): void {
    for (const [category, categoryDef] of Object.entries(definition)) {
      const categoryData = variables[category];

      // カテゴリが存在するか
      if (!categoryData) {
        throw new Error(`VARIABLE_NOT_FOUND: ${category}`);
      }

      // required変数が全て存在するか
      for (const requiredField of categoryDef.required) {
        if (!(requiredField in categoryData)) {
          throw new Error(`REQUIRED_VARIABLE_MISSING: ${category}.${requiredField}`);
        }
      }

      // 型チェック
      for (const [field, fieldDef] of Object.entries(categoryDef.fields)) {
        const value = categoryData[field];
        if (value === undefined) continue; // requiredチェックは上で済んでいる

        const actualType = typeof value;
        const expectedType = fieldDef.type;

        if (expectedType === 'date' && !(value instanceof Date) && typeof value !== 'string') {
          throw new Error(`VARIABLE_TYPE_MISMATCH: ${category}.${field} (expected date, got ${actualType})`);
        } else if (expectedType !== 'date' && actualType !== expectedType) {
          throw new Error(`VARIABLE_TYPE_MISMATCH: ${category}.${field} (expected ${expectedType}, got ${actualType})`);
        }
      }
    }
  }

  private _getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// 型定義（§4.3より再掲）
type VariableDefinition = {
  [category: string]: {
    type: 'object';
    required: string[];
    fields: {
      [field: string]: {
        type: 'string' | 'number' | 'boolean' | 'date';
        description?: string;
        default?: any;
      };
    };
  };
};
```

### A.4 ストリーミングAPIハンドラ

```typescript
// server/api/v1/ai/chat.post.ts

import { LLMRouter } from '~/server/utils/ai/llm-router';
import { PIIMasker } from '~/server/utils/ai/pii-masker';
import { PromptRenderer } from '~/server/utils/ai/prompt-renderer';
import { db } from '~/server/utils/db';
import { promptTemplate, aiConversation } from '~/server/database/schema';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const body = await readBody<AIChatRequest>(event);
  const { usecase, variables, eventId, conversationId, userMessage } = body;

  // 認証チェック
  const session = await requireAuth(event);
  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  try {
    // 1. プロンプトテンプレート取得
    const [template] = await db
      .select()
      .from(promptTemplate)
      .where(
        and(
          eq(promptTemplate.tenantId, tenantId),
          eq(promptTemplate.usecase, usecase),
          eq(promptTemplate.isActive, true)
        )
      )
      .limit(1);

    if (!template) {
      throw createError({
        statusCode: 404,
        message: 'PROMPT_TEMPLATE_NOT_FOUND',
      });
    }

    // 2. プロンプトレンダリング
    const renderer = new PromptRenderer();
    renderer.validate(variables, template.variables as VariableDefinition);
    const renderedUserPrompt = renderer.render(template.userPromptTemplate, variables);

    // 3. PIIマスキング
    const masker = new PIIMasker();
    const maskedUserPrompt = masker.mask(renderedUserPrompt);
    const maskedUserMessage = userMessage ? masker.mask(userMessage) : undefined;

    // 4. メッセージ構築
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      { role: 'user', content: maskedUserPrompt },
    ];
    if (maskedUserMessage) {
      messages.push({ role: 'user', content: maskedUserMessage });
    }

    // 5. LLMストリーミング
    const router = new LLMRouter();
    const { stream, usage } = await router.streamChat(
      messages,
      usecase,
      template.modelConfig as ModelConfig
    );

    // 6. SSE送信（PIIアンマスク含む）
    const encoder = new TextEncoder();
    let fullResponse = '';

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          const reader = stream.getReader();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            if (value.type === 'text') {
              fullResponse += value.content;
              // リアルタイムでアンマスク
              const unmaskedContent = masker.unmask(value.content);
              const sseData = `data: ${JSON.stringify({ type: 'text', content: unmaskedContent })}\n\n`;
              controller.enqueue(encoder.encode(sseData));
            }
          }

          // 7. コスト計算
          const config = router.selectModel(usecase);
          const estimatedCostJpy = router.calculateCost(
            usage.inputTokens,
            usage.outputTokens,
            config.model
          );

          // 8. 会話履歴保存
          const [conversation] = await db
            .insert(aiConversation)
            .values({
              tenantId,
              userId,
              eventId: eventId || null,
              messages: JSON.stringify([
                { role: 'user', content: renderedUserPrompt },
                { role: 'assistant', content: masker.unmask(fullResponse) },
              ]),
              usecase,
              modelProvider: config.provider,
              modelName: config.model,
              totalInputTokens: usage.inputTokens,
              totalOutputTokens: usage.outputTokens,
              estimatedCostJpy,
            })
            .returning();

          // 9. 完了通知
          const doneData = `data: ${JSON.stringify({
            type: 'done',
            conversationId: conversation.id,
            usage: {
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              estimatedCostJpy,
            },
          })}\n\n`;
          controller.enqueue(encoder.encode(doneData));

          controller.close();
        } catch (error) {
          const errorData = `data: ${JSON.stringify({
            type: 'error',
            code: 'AI_STREAMING_ERROR',
            message: error.message,
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        } finally {
          // メモリクリア
          masker.clear();
        }
      },
    });

    return sendStream(event, responseStream);

  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: error.message,
    });
  }
});

type AIChatRequest = {
  usecase: string;
  variables: Record<string, any>;
  eventId?: string;
  conversationId?: string;
  userMessage?: string;
};

type ModelConfig = {
  temperature: number;
  maxTokens: number;
};

type VariableDefinition = any; // §4.3より
```

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 変更者 |
|------|-----------|---------|--------|
| 2026-02-09 | 1.0 | 初版作成 | Claude Code |
| 2026-02-09 | 1.1 | §3-E 入出力例、§3-F 境界値、§3-G 例外レスポンス、§3-H 受け入れテスト（Gherkin）を追加 | Claude Code |
