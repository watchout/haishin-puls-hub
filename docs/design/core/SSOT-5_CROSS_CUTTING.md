# SSOT-5: 横断的関心事（Cross-Cutting Concerns） [CONTRACT]

> 認証・認可・マルチテナント・AI統合・エラーハンドリング・ログ等の横断的設計を管理する
> RFC 2119 準拠: MUST（必須）/ SHOULD（推奨）/ MAY（任意）

---

## 基本情報

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-02-06 |
| ステータス | Draft |
| 関連ADR | ADR-001 (技術スタック) |

---

## §1. 認証・認可（Authentication & Authorization） [CORE]

### 1.1 認証方式

| 項目 | 内容 |
|------|------|
| ライブラリ | Better Auth v1.x |
| セッション管理 | Cookie ベースセッション |
| セッション有効期限 | 7日（アクティブ時は自動延長） |
| パスワード要件 | 8文字以上・英数記号混在 |
| メール認証 | 必須 |
| OAuth | Phase 2（Google / Microsoft） |

### 1.2 認可モデル

```
RBAC（Role-Based Access Control）
  ├── システムレベルロール → system_admin
  └── テナントレベルロール → tenant_admin / organizer / venue_staff / ...

  + イベントレベル権限 → event_member テーブルで制御
```

### 1.3 ロール別権限マトリクス

```
Permission Matrix:

C = Create, R = Read, U = Update, D = Delete, * = Own only

Resource         | sys_admin | tenant_admin | organizer | venue_staff | streaming | planner | speaker | sales  | participant |
─────────────────┼───────────┼──────────────┼───────────┼─────────────┼───────────┼─────────┼─────────┼────────┼─────────────│
tenant           | CRUD      | RU           | -         | -           | -         | -       | -       | -      | -           │
tenant_member    | CRUD      | CRUD         | -         | -           | -         | -       | -       | -      | -           │
venue            | CRUD      | CRUD         | R         | CRU         | -         | R       | -       | -      | -           │
event            | CRUD      | CRUD         | CRUD*     | R           | R         | CRU*    | R*      | R      | -           │
event_member     | CRUD      | CRUD         | CRD*      | R           | R         | CR*     | R*      | R      | -           │
task             | CRUD      | CRUD         | CRUD*     | RU*         | RU*       | CRUD*   | RU*     | R*     | -           │
speaker          | CRUD      | CRUD         | CRU*      | R           | R         | CRU*    | RU*     | R      | -           │
participant      | CRUD      | CRUD         | CRUD*     | R           | -         | CRU*    | -       | CR*    | -           │
checkin          | CRUD      | CRUD         | CR*       | CR          | -         | R       | -       | -      | -           │
estimate         | CRUD      | CRUD         | CRU*      | -           | CRU*      | CRU*    | -       | -      | -           │
survey           | CRUD      | CRUD         | CRUD*     | R           | -         | CRU*    | -       | R      | -           │
report           | CRUD      | CRUD         | CRUD*     | R           | -         | CRU*    | -       | R      | -           │
notification     | CRUD      | R*           | R*        | R*          | R*        | R*      | R*      | R*     | -           │
ai               | CRUD      | CRU          | CRU       | CRU         | CRU       | CRU     | CRU     | CRU    | -           │
```

### 1.4 権限チェック実装方針

```typescript
// server/middleware/auth.ts — 全APIに適用
export default defineEventHandler(async (event) => {
  // 1. セッション取得（Better Auth）
  const session = await getSession(event);
  if (!session) throw createError({ statusCode: 401, message: 'UNAUTHORIZED' });

  // 2. テナント解決
  const tenantId = getHeader(event, 'x-tenant-id') || session.defaultTenantId;
  const membership = await getUserTenantRole(session.userId, tenantId);
  if (!membership) throw createError({ statusCode: 403, message: 'TENANT_ACCESS_DENIED' });

  // 3. コンテキスト注入
  event.context.auth = {
    userId: session.userId,
    tenantId,
    role: membership.role,
  };
});

// composables/usePermission.ts — フロントエンド用
export function usePermission() {
  const { user, tenant } = useAuth();

  function can(action: string, resource: string): boolean {
    return checkPermission(tenant.value.role, action, resource);
  }

  return { can };
}
```

---

## §2. マルチテナント設計 [CORE]

### 2.1 テナント分離戦略

| 項目 | 内容 |
|------|------|
| 方式 | 共有データベース + `tenant_id` カラム |
| RLS | PostgreSQL Row Level Security（実装予定） |
| アプリ層フィルタ | Drizzle ORM グローバルフィルタで二重防御 |

### 2.2 テナント分離レイヤー

```
┌──────────────────────────────────────┐
│  Layer 1: API Middleware              │
│  → X-Tenant-Id ヘッダから tenant_id 解決 │
│  → ユーザーの所属確認                   │
├──────────────────────────────────────┤
│  Layer 2: ORM (Drizzle) Filter       │
│  → 全クエリに .where(eq(table.tenant_id, ctx.tenantId)) │
│  → グローバルフィルタで自動付与           │
├──────────────────────────────────────┤
│  Layer 3: PostgreSQL RLS (Plan)       │
│  → SET app.current_tenant_id = '...'  │
│  → RLS ポリシーで行レベルフィルタ        │
└──────────────────────────────────────┘
```

### 2.3 テナント横断アクセス

```
- system_admin ロールのみ許可
- 管理ダッシュボードから全テナントの統計を閲覧可能
- 通常のAPIリクエストでは tenant_id 必須（省略時はデフォルトテナント）
```

### 2.4 テナント間データ共有

| データ | 共有方式 |
|-------|---------|
| タスクテンプレート | `tenant_id = NULL` のレコード = 全テナント共通 |
| 配信パッケージ | `tenant_id = NULL` のレコード = 全テナント共通 |
| プロンプトテンプレート | `tenant_id = NULL` のレコード = システムデフォルト |
| ユーザー | user テーブルはテナント非依存。`user_tenant` で紐付け |

---

## §3. AI 統合設計 [CONTRACT]

### 3.1 アーキテクチャ

```
┌─────────────────────────────────────────────────┐
│  Frontend (Nuxt)                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  useChat (Vercel AI SDK @ai-sdk/vue)      │  │
│  │  → ストリーミング表示                       │  │
│  │  → Tool Call 結果のリアルタイム反映         │  │
│  └───────────────┬───────────────────────────┘  │
│                  │ SSE (Server-Sent Events)       │
├──────────────────┼──────────────────────────────┤
│  Backend (Nitro) │                               │
│  ┌───────────────▼───────────────────────────┐  │
│  │  AI Service Layer                          │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  Context Builder                     │  │  │
│  │  │  → イベント情報・タスク・参加者情報    │  │  │
│  │  │  → ユーザーロール・権限              │  │  │
│  │  │  → プロンプトテンプレート取得         │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  LLM Router                          │  │  │
│  │  │  → ユースケース別のモデル選択         │  │  │
│  │  │  → フォールバック制御                │  │  │
│  │  │  → コスト追跡                        │  │  │
│  │  └────────┬───────────────┬────────────┘  │  │
│  │           │               │               │  │
│  │  ┌────────▼─────┐  ┌─────▼──────────┐   │  │
│  │  │ Claude API   │  │ OpenAI API     │   │  │
│  │  │ (Primary)    │  │ (Secondary)    │   │  │
│  │  └──────────────┘  └────────────────┘   │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  Tool Executor                       │  │  │
│  │  │  → create_event_draft                │  │  │
│  │  │  → generate_estimate                 │  │  │
│  │  │  → search_venues                     │  │  │
│  │  │  → generate_tasks                    │  │  │
│  │  │  → send_notification                 │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 3.2 LLM ルーティング

| ユースケース | 推奨モデル | フォールバック | 理由 |
|------------|----------|-------------|------|
| 企画書生成 | Claude Sonnet | GPT-4o | 長文生成・構造化・日本語品質 |
| 見積り生成 | Claude Haiku | GPT-4o-mini | 構造化データ・コスト最適化 |
| メール生成 | Claude Sonnet | GPT-4o | 自然な日本語 |
| チャット（一般） | Claude Sonnet | GPT-4o | Tool Use + 文脈理解 |
| FAQ回答 | Claude Haiku | GPT-4o-mini | 低コスト・高速 |
| レポート生成 | Claude Sonnet | GPT-4o | 集計分析・長文 |
| タスク自動生成 | Claude Haiku | GPT-4o-mini | 構造化・高速 |

### 3.3 Tool Calling 設計

```typescript
// server/ai/tools/index.ts
export const aiTools = {
  create_event_draft: {
    description: "イベントの企画ドラフトを作成する",
    parameters: z.object({
      title: z.string(),
      event_type: z.enum(["seminar", "presentation", "internal", "workshop"]),
      format: z.enum(["onsite", "online", "hybrid"]),
      capacity: z.number(),
      start_at: z.string(),
      duration_hours: z.number(),
    }),
    execute: async (args, ctx) => { /* ... */ },
  },

  generate_estimate: {
    description: "見積りを自動生成する",
    parameters: z.object({
      event_id: z.string(),
      package_id: z.string().optional(),
    }),
    execute: async (args, ctx) => { /* ... */ },
  },

  search_available_venues: {
    description: "空き会場を検索する",
    parameters: z.object({
      date: z.string(),
      capacity_min: z.number(),
      branch: z.string().optional(),
    }),
    execute: async (args, ctx) => { /* ... */ },
  },

  generate_tasks: {
    description: "イベント種別に応じたタスクを自動生成する",
    parameters: z.object({
      event_id: z.string(),
    }),
    execute: async (args, ctx) => { /* ... */ },
  },

  send_notification: {
    description: "関係者に通知を送信する",
    parameters: z.object({
      event_id: z.string(),
      target_role: z.string().optional(),
      message: z.string(),
    }),
    execute: async (args, ctx) => { /* ... */ },
  },
};
```

### 3.4 プロンプト管理

```
- システムプロンプトは prompt_template テーブルで管理
- テナント固有のカスタマイズ可能
- バージョニングあり（ロールバック可能）
- 変数埋め込み対応: {{event.title}}, {{user.name}} 等
```

### 3.5 AI コスト管理

```
- 全リクエストのトークン数を ai_conversation テーブルに記録
- 推定コスト（円）を計算して保存
- テナント別の月次コスト集計
- 上限設定機能（Phase 2）
```

---

## §4. エラーハンドリング [CONTRACT]

### 4.1 エラー分類

| レベル | 対応 | 例 |
|-------|------|-----|
| ユーザーエラー | フォームバリデーション表示 | 必須項目未入力 |
| ビジネスエラー | トースト通知 + ガイダンス | 権限不足、状態遷移不可 |
| インフラエラー | エラーページ + 自動リトライ | DB接続エラー |
| AI エラー | フォールバック + ユーザー通知 | LLM API タイムアウト |

### 4.2 フロントエンド エラーハンドリング

```typescript
// plugins/error-handler.ts
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.config.errorHandler = (error, instance, info) => {
    // 1. エラーログ送信
    logError({ error, info, route: useRoute().fullPath });

    // 2. ユーザーへのフィードバック
    const toast = useToast();
    if (error.statusCode === 403) {
      toast.add({ title: 'この操作の権限がありません', color: 'red' });
    } else if (error.statusCode >= 500) {
      toast.add({ title: 'サーバーエラーが発生しました。しばらくしてから再試行してください', color: 'red' });
    }
  };
});
```

### 4.3 バックエンド エラーハンドリング

```typescript
// server/utils/error.ts
export function createAppError(
  code: string,
  message: string,
  statusCode: number = 400,
  details?: any[]
) {
  return createError({
    statusCode,
    data: {
      error: { code, message, details },
    },
  });
}

// 使用例
throw createAppError('VALIDATION_ERROR', '入力内容に問題があります', 400, [
  { field: 'title', message: 'タイトルは必須です', code: 'required' },
]);
```

### 4.4 AI フォールバック戦略

```
1. Primary LLM (Claude) にリクエスト
2. タイムアウト（30秒）or エラーの場合:
   → Secondary LLM (GPT-4o) にフォールバック
3. Secondary もエラーの場合:
   → ユーザーに「AI機能が一時的に利用できません」と通知
   → エラーログに記録
4. レート制限超過の場合:
   → キューイング（待ち行列）で順番処理
```

---

## §5. ロギング・監視 [DETAIL]

### 5.1 ログ設計

| ログ種別 | 保存先 | 保持期間 | 内容 |
|---------|-------|---------|------|
| アクセスログ | ファイル → ローテーション | 90日 | 全APIリクエスト |
| エラーログ | ファイル + 通知 | 180日 | 4xx/5xx エラー |
| AIログ | DB (ai_conversation) | 無期限 | AI利用履歴・トークン数 |
| 監査ログ | DB (audit_log) | 無期限 | 重要操作（Phase 2） |

### 5.2 ログフォーマット

```json
{
  "timestamp": "2026-03-15T14:00:00.000Z",
  "level": "info",
  "method": "POST",
  "path": "/api/v1/events",
  "status": 201,
  "duration_ms": 45,
  "tenant_id": "01HXYZ...",
  "user_id": "01HABC...",
  "request_id": "req_01DEF..."
}
```

### 5.3 監視項目

| 監視項目 | アラート条件 | 通知先 |
|---------|------------|-------|
| API レスポンスタイム | p95 > 3s | Slack / メール |
| エラー率 | 5xx > 1% / 5分 | Slack / メール |
| AI API レイテンシ | p95 > 30s | Slack |
| AI API エラー率 | > 5% / 15分 | Slack / メール |
| ディスク使用量 | > 80% | メール |
| DB コネクション数 | > 80% pool | Slack |

---

## §6. セキュリティ [CORE]

### 6.1 入力バリデーション

```
- 全入力を Zod スキーマでバリデーション
- フロントエンド（VeeValidate + Zod）+ バックエンド（Zod）の二重チェック
- SQLインジェクション: Drizzle ORM のパラメータバインドで防止
- XSS: Nuxt のデフォルト エスケープ + DOMPurify（リッチテキスト時）
```

### 6.2 CSRF 対策

```
- Better Auth のセッションクッキーは SameSite=Lax
- 状態変更API（POST/PATCH/DELETE）はOriginヘッダチェック
```

### 6.3 レート制限

```
- IPベース + ユーザーベースの二重制限
- AI APIは特に厳しい制限（20回/分）
- 認証エンドポイントは最も厳しい制限（10回/分）
```

### 6.4 ファイルアップロードセキュリティ

```
- 許可する拡張子: pdf, doc, docx, ppt, pptx, xls, xlsx, jpg, png, gif, mp4
- 最大ファイルサイズ: 50MB
- ウイルススキャン: Phase 2
- ストレージ: ローカルディスク（VPS）→ Phase 2 で S3互換ストレージ検討
```

### 6.5 機密情報管理

```
- 環境変数で管理（.env ファイル、Gitに含めない）
- LLM API キー: 環境変数
- DB接続文字列: 環境変数
- セッションシークレット: Better Auth 設定
```

---

## §7. 国際化（i18n） [DETAIL]

### 7.1 MVP方針

```
- MVP は日本語のみ
- ただし、i18n 対応の土台は最初から組み込む
- @nuxtjs/i18n + Vue I18n
- メッセージファイル: locales/ja.json
```

### 7.2 対応計画

| Phase | 言語 |
|-------|------|
| MVP | 日本語のみ |
| Phase 2 | 英語追加 |
| Phase 3+ | 中国語・韓国語（市場次第） |

---

## §8. パフォーマンス [DETAIL]

### 8.1 パフォーマンス目標

| 指標 | 目標 |
|------|------|
| TTFB (Time to First Byte) | < 200ms |
| FCP (First Contentful Paint) | < 1.5s |
| LCP (Largest Contentful Paint) | < 2.5s |
| API レスポンス (p95) | < 500ms |
| AI レスポンス (初回チャンク) | < 3s |

### 8.2 最適化戦略

| 層 | 対策 |
|-----|------|
| Frontend | Nuxt のコード分割 + Lazy Loading |
| Frontend | 画像最適化（Nuxt Image） |
| API | PostgreSQL インデックス最適化 |
| API | Nitro のレスポンスキャッシュ（会場一覧等の静的データ） |
| AI | ストリーミング（チャンク送信） |
| DB | コネクションプール（pg-pool） |
| 全体 | CDN（静的アセット） |

---

## §9. デプロイ・運用 [DETAIL]

### 9.1 デプロイ構成

```
┌─────────────────────────────────────┐
│  VPS (ConoHa / さくら)               │
│  ┌───────────────────────────────┐  │
│  │  Docker Compose               │  │
│  │  ┌─────────┐ ┌─────────────┐ │  │
│  │  │  Nuxt   │ │ PostgreSQL  │ │  │
│  │  │  (Node) │ │   16        │ │  │
│  │  │  :3000  │ │   :5432     │ │  │
│  │  └────┬────┘ └─────────────┘ │  │
│  │       │                       │  │
│  │  ┌────▼────┐                  │  │
│  │  │  Nginx  │ ← リバースプロキシ │  │
│  │  │  :443   │ ← Let's Encrypt  │  │
│  │  └─────────┘                  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 9.2 バックアップ

| 対象 | 方式 | 頻度 | 保持 |
|------|------|------|------|
| PostgreSQL | pg_dump | 日次 | 30日 |
| ファイルアップロード | rsync | 日次 | 30日 |
| 設定ファイル | Git管理 | 変更時 | 永久 |

### 9.3 CI/CD

```
GitHub Actions:
  1. Push to main → テスト実行（Vitest + Playwright）
  2. テスト通過 → Docker イメージビルド
  3. ビルド成功 → VPS にデプロイ（SSH + docker compose up）
  4. ヘルスチェック → 完了通知
```

---

## §10. テスト戦略 [DETAIL]

### 10.1 テストピラミッド

```
        ╱╲
       ╱  ╲      E2E テスト (Playwright)
      ╱ 10 ╲     → 主要ユーザーフロー
     ╱──────╲
    ╱        ╲    統合テスト (Vitest)
   ╱   30     ╲   → API エンドポイント
  ╱────────────╲
 ╱              ╲  ユニットテスト (Vitest)
╱      60        ╲ → ビジネスロジック・ユーティリティ
╲________________╱
```

### 10.2 テスト対象

| テスト種別 | 対象 | ツール |
|----------|------|------|
| Unit | composables, utils, ビジネスロジック | Vitest |
| Integration | API エンドポイント, DB操作 | Vitest + テスト用DB |
| E2E | 主要フロー（ログイン→イベント作成→タスク管理） | Playwright |
| Visual | UIコンポーネント（Phase 2） | Storybook + Chromatic |

---

## §11. 実装優先順位 [DETAIL]

1. Phase 1（MVP）: 認証・認可 + マルチテナント + エラーハンドリング + AI基盤（Claude）
2. Phase 1.5: ロギング・監視強化 + セキュリティ監査
3. Phase 2: 国際化 + パフォーマンス最適化 + 運用自動化

---

## §12. 未解決課題（Open Questions） [DETAIL]

| ID | 課題 | 影響範囲 | 担当 |
|----|------|---------|------|
| CC-OQ-001 | LLMフォールバック戦略の詳細（Claude → GPT切替条件） | AI統合 | 技術 |
| CC-OQ-002 | 構造化ログのフォーマット（JSON vs structured text） | ロギング | 技術 |

---

## 変更履歴

| 日付 | 変更内容 | 変更者 |
|------|---------|-------|
| 2026-02-06 | 初版作成（10セクション） | AI |
| 2026-02-12 | フレームワーク形式適合（§記法、RFC 2119、レイヤーラベル、§11-§12追加） | AI |
