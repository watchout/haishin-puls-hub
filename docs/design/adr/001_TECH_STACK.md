# ADR-001: 技術スタック選定

> Architecture Decision Record - Haishin+ HUB の技術基盤を決定する

---

## メタ情報

| 項目 | 内容 |
|------|------|
| ステータス | **Accepted** |
| 決定日 | 2026-02-06 |
| 決定者 | 配信プラス |
| 影響範囲 | 全プロダクト |

---

## 1. コンテキスト

Haishin+ HUB はセミナー・イベント運営の全プレイヤーが利用する Web アプリケーションであり、以下の要件を満たす技術スタックが必要：

- **マルチテナント**: 会場チェーンごとのデータ分離
- **ロールベースアクセス制御（RBAC）**: 8ロール＋管理者
- **AI統合**: LLM（Claude / GPT）によるストリーミング応答
- **レスポンシブ**: PC／タブレット／スマホ対応
- **SSR**: SEO不要だがパフォーマンス・初期表示速度のためSSRを活用
- **コスト効率**: スモールチームでの開発・運用を前提
- **日本国内ホスティング**: レイテンシ・法令対応

---

## 2. 決定事項

### 技術スタック一覧

```
┌──────────────────────────────────────────────────────┐
│                  Haishin+ HUB Tech Stack              │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Frontend + Backend (フルスタック)                     │
│  ┌────────────────────────────────────────────┐      │
│  │  Nuxt 3 (Vue 3 + Nitro Server)             │      │
│  │  ├── Pages / Layouts / Components          │      │
│  │  ├── server/api/ (REST API Routes)         │      │
│  │  ├── server/middleware/ (Auth / Tenant)     │      │
│  │  └── composables/ (共有ロジック)            │      │
│  └────────────────────────────────────────────┘      │
│                                                      │
│  UI                   │  ORM          │  Validation   │
│  Nuxt UI v3           │  Drizzle ORM  │  Zod          │
│  (Tailwind CSS v4)    │               │               │
│                                                      │
│  認証                  │  状態管理                      │
│  Better Auth          │  Pinia                        │
│  + Organization Plugin│                               │
│                                                      │
│  AI                                                   │
│  @anthropic-ai/sdk (Claude直接API)                    │
│  + Vercel AI SDK (ストリーミングUI)                    │
│                                                      │
│  Database                                             │
│  PostgreSQL 16                                        │
│                                                      │
│  Infrastructure                                       │
│  ConoHa VPS / さくらVPS                               │
│  + Docker + Nginx + Let's Encrypt                    │
│                                                      │
│  CI/CD                                                │
│  GitHub Actions → Docker Image → VPS Deploy          │
│                                                      │
│  Testing                                              │
│  Vitest (Unit) + Playwright (E2E)                    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 3. 各技術の選定理由

### 3.1 フロントエンド＋バックエンド: Nuxt 3

| 項目 | 内容 |
|------|------|
| 決定 | **Nuxt 3**（Vue 3 + Nitro Server Engine） |
| 不採用 | Next.js（React系）、Remix（React系） |

**選定理由:**

- ユーザー（配信プラス）チームが Vue / Nuxt に馴染みがある
- Nuxt 3 の **Nitro Server Engine** により、フロント＋バックエンドを1つのコードベースで管理できる
  - `server/api/` でREST APIを定義
  - `server/middleware/` で認証・テナント判定を共通処理
  - BFF（Backend For Frontend）パターンが自然に実現
- SSR + クライアントサイドハイドレーションにより、初期表示が速い
- Nuxt UI（公式UIライブラリ）との親和性が高い

**バックエンドを分離しない理由:**

- Phase 1（MVP）ではビジネスロジックの複雑度が Nitro の server routes で十分対応可能
- 1コードベースにすることで開発・デプロイの効率を最大化
- 将来的にバックエンドの分離が必要になった場合、Nitro の API routes をそのまま別サービスに切り出せる

---

### 3.2 UI: Nuxt UI v3 + Tailwind CSS v4

| 項目 | 内容 |
|------|------|
| 決定 | **Nuxt UI v3**（Tailwind CSS v4 ベース） |
| 不採用 | Vuetify（重い）、shadcn-vue（Nuxt UIの方がNuxtとの統合度が高い） |

**選定理由:**

- Nuxt 公式のUIライブラリであり、Nuxt 3 との統合がシームレス
- ダッシュボード・フォーム・テーブル・モーダルなど業務アプリに必要なコンポーネントが揃っている
- Tailwind CSS v4 ベースでカスタマイズ性が高い
- ダークモード・レスポンシブ対応が標準
- アクセシビリティ（a11y）対応済み

---

### 3.3 ORM: Drizzle ORM

| 項目 | 内容 |
|------|------|
| 決定 | **Drizzle ORM** |
| 不採用 | Prisma（バンドルサイズ大・生成ステップが重い）、Kysely（型安全だがORM機能が薄い） |

**選定理由:**

- **軽量**: バンドルサイズ ~7.4KB（Prisma 7 の ~1.6MB と比較して圧倒的に小さい）
- **高速**: クエリレイテンシが Prisma の 2〜3倍速い（ベンチマーク結果）
- **SQL に近い**: SQL の知識がそのまま活きる。マルチテナントの複雑なクエリも書きやすい
- **コード生成不要**: TypeScript のスキーマ定義から直接型推論。`prisma generate` のようなビルドステップが不要
- **マイグレーション**: `drizzle-kit` によるスキーマ管理・マイグレーション生成が可能
- **Nuxt 3 との相性**: `nuxt-drizzle` モジュールが利用可能

**Prisma を選ばない理由:**

Prisma 7 で大幅に改善されたが、以下の点で Drizzle が優位：
- バンドルサイズが依然として大きい
- `.prisma` スキーマファイルと TypeScript の二重管理
- SQL から離れた独自 API により、複雑なクエリで制約を感じることがある

---

### 3.4 データベース: PostgreSQL 16

| 項目 | 内容 |
|------|------|
| 決定 | **PostgreSQL 16** |
| 不採用 | MySQL（JSON/配列型の機能が弱い）、SQLite（マルチテナントに不向き） |

**選定理由:**

- マルチテナント設計に最適（Row Level Security / スキーマ分離が可能）
- JSON / JSONB 型によるフレキシブルなデータ格納（イベント設定・AIプロンプト等）
- 全文検索機能（`tsvector`）で日本語検索にも対応可能
- VPS上で直接運用可能。マネージドサービスへの移行も容易

**マルチテナント戦略:**

```
Phase 1: 共有DB + tenant_id カラム（Row Level Security）
  - 実装がシンプル。MVP に最適
  - Drizzle のグローバル filter で tenant_id を自動付与

Phase 2（必要に応じて）: スキーマ分離
  - テナントごとに PostgreSQL スキーマを分離
  - より強固なデータ分離が必要になった場合に移行
```

---

### 3.5 認証: Better Auth + Organization Plugin

| 項目 | 内容 |
|------|------|
| 決定 | **Better Auth** + Organization プラグイン |
| 不採用 | sidebase/nuxt-auth（機能が限定的）、Auth0/Clerk（SaaS依存・コスト）、自前実装（工数大） |

**選定理由:**

- **Nuxt 3 ネイティブ対応**: `server/api/auth/[...all].ts` に1ファイルでセットアップ。Vue 用フック（`useSession()` 等）が提供される
- **Organization プラグイン**: マルチテナント（会場チェーン＝Organization）とRBACを標準機能で実現
  - テナント（Organization）の作成・メンバー招待・ロール割り当てが組み込み
  - カスタムロール定義が可能（主催者・会場スタッフ・配信業者 等の8ロール）
  - テナントごとの権限チェックが API レベルで動作
- **フレキシブル**: メール/パスワード認証 + OAuth（Google, Microsoft 365）を柔軟に追加可能
- **セルフホスト**: SaaS依存なし。VPS上で完全に自前運用できる
- **Drizzle ORM 対応**: Better Auth のアダプターとして Drizzle を直接使用可能

**Auth0 / Clerk を選ばない理由:**

- 月額コストがユーザー数に比例して増加（スケール時に高額になるリスク）
- SaaS 依存により、障害時のコントロールが効かない
- 日本国内 VPS 運用の方針と合わない（データの所在地）

**Better Auth の Organization モデル ↔ HUB のマッピング:**

```
Better Auth          │  Haishin+ HUB
─────────────────────┼─────────────────────────
Organization         │  テナント（会場チェーン）
  └─ Member          │    └─ ユーザー
       └─ Role       │         └─ ロール（主催者/会場/配信/...）
```

---

### 3.6 AI基盤: LLMプロバイダー抽象化 + Vercel AI SDK

| 項目 | 内容 |
|------|------|
| 決定 | **LLMプロバイダー抽象化レイヤー** + **Vercel AI SDK**（ストリーミングUI） |
| 主LLM | **Claude**（Anthropic）— 長文・Tool Use・日本語品質で推奨 |
| 副LLM | **GPT-4o**（OpenAI）— フォールバック＋コスト最適化 |
| 小型モデル | **Claude Haiku / GPT-4o-mini** — FAQ回答等の軽量タスク |
| 不採用 | LangChain（抽象化が過剰・デバッグが困難） |

**設計方針: LLM を固定しない**

LLM の性能・コスト・可用性は半年単位で変動するため、プロバイダーを差し替え可能にする。

**3層構成:**

```
┌─────────────────────────────────────────────────┐
│  Layer 1: LLMプロバイダー抽象化レイヤー             │
│  server/utils/ai.ts                               │
│                                                   │
│  ・プロバイダー切替（Claude / GPT / Gemini）        │
│  ・ユースケース別モデルルーティング                  │
│  ・フォールバック（主LLM障害時に副LLMへ自動切替）    │
│  ・コスト管理・利用量モニタリング・ログ記録           │
│  ・PII マスキング処理（プロバイダー共通）             │
│                                                   │
│  createLLMClient(usecase) → provider + model       │
│    企画書生成   → Claude Sonnet（長文・高品質）      │
│    FAQ回答      → Claude Haiku / GPT-4o-mini（安い）│
│    メール文面   → Claude / GPT-4o（交換可能）        │
│    見積り生成   → Claude Sonnet（Tool Use）          │
│    レポート生成 → Claude Sonnet（長文集約）          │
└─────────────┬───────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────┐
│  Layer 2: AI ロジック層（サーバーサイド）           │
│                                                   │
│  ・プロンプトテンプレート管理・適用                  │
│  ・Tool Use（Function Calling）によるエージェント    │
│  ・構造化出力（JSON Mode）                         │
│  ※ プロバイダー非依存のインターフェースで実装        │
└─────────────┬───────────────────────────────────┘
              │ ストリーミングレスポンス
┌─────────────▼───────────────────────────────────┐
│  Layer 3: ストリーミングUI層（クライアント）        │
│  Vercel AI SDK（@ai-sdk/vue）                     │
│                                                   │
│  ・useChat() / useCompletion() でストリーミング表示│
│  ・ローディング・エラー状態の管理                   │
│  ・メッセージ履歴の管理                            │
└─────────────────────────────────────────────────┘
```

**ユースケース別モデルルーティング:**

| ユースケース | 推奨モデル | 理由 | フォールバック |
|-------------|-----------|------|--------------|
| 企画書ドラフト生成 | Claude Sonnet | 長文出力・日本語品質 | GPT-4o |
| 見積りAI生成 | Claude Sonnet | Tool Use 安定性 | GPT-4o |
| メール文面生成 | Claude Sonnet / GPT-4o | 交換可能 | 相互フォールバック |
| 参加者AI FAQ | Claude Haiku | 低コスト・高速 | GPT-4o-mini |
| レポート自動生成 | Claude Sonnet | 長文集約・要約 | GPT-4o |
| Runbook生成 | Claude Sonnet | 構造化出力 | GPT-4o |
| フォローメール生成 | GPT-4o-mini / Haiku | 低コスト | 相互フォールバック |

**LLM を固定しない理由:**

| リスク | 対策 |
|-------|------|
| 特定プロバイダーの料金値上げ | 抽象化レイヤーで別プロバイダーに切替 |
| API障害 | 自動フォールバックで可用性確保 |
| 性能の逆転（新モデル登場） | ルーティング設定の変更だけで新モデル採用可能 |
| コスト最適化 | 軽量タスクは小型モデル、重要タスクは大型モデルに振り分け |

**Vercel AI SDK を使うメリット（Nuxt 3 対応）:**

- `@ai-sdk/vue` パッケージで Vue / Nuxt 用のリアクティブフック提供
- `useChat()`: チャットUIのストリーミング・メッセージ履歴・ローディング状態を自動管理
- `useCompletion()`: テキスト生成のストリーミング
- サーバー側の `streamText()` で Nitro API routes から SSE ストリーミング
- **Vercel にデプロイしなくても使える**（ライブラリとしての利用は無料・制限なし）
- **プロバイダー抽象化に対応**: `@ai-sdk/anthropic`, `@ai-sdk/openai` 等のプロバイダーパッケージで、サーバー側でもプロバイダー切替が容易

**Claude を主LLM（デフォルト）に推奨する理由:**

- 200K トークンのコンテキストウィンドウ（企画書全文・過去イベント情報の一括投入に強い）
- Tool Use（Function Calling）によるエージェント構成が安定
- 日本語のビジネス文書品質が高い
- ただし固定ではなく、設定で変更可能な設計とする

---

### 3.7 インフラ: ConoHa VPS + Docker

| 項目 | 内容 |
|------|------|
| 決定 | **ConoHa VPS**（または さくらVPS）+ **Docker Compose** |
| 不採用 | Vercel（サーバーレス制限・コスト予測困難）、AWS/GCP（オーバースペック） |

**選定理由:**

- **固定コスト**: 月額料金が予測可能（VPS: 月 ¥1,000〜3,000 程度）
- **日本国内DC**: 低レイテンシ、個人情報保護法の観点で安心
- **フルコントロール**: Node.js、PostgreSQL、Nginx を自由に構成
- **Docker Compose** で以下を一括管理:

```yaml
# docker-compose.yml（構成イメージ）
services:
  app:
    # Nuxt 3 (Nitro) - Node.js 22 Alpine
    build: .
    ports: ["3000:3000"]
    depends_on: [db]

  db:
    # PostgreSQL 16
    image: postgres:16-alpine
    volumes: ["pgdata:/var/lib/postgresql/data"]

  nginx:
    # Reverse Proxy + SSL
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    # Let's Encrypt (certbot) で SSL 自動更新
```

**Vercel を選ばない理由:**

- AI ストリーミング応答は長時間実行になることがあり、サーバーレスの実行時間制限（10秒〜60秒）と相性が悪い
- PostgreSQL を別途ホスティングする必要がある（追加コスト＋レイテンシ）
- 従量課金のため、AI利用が増えるとコストが予測困難
- ただし開発・ステージング環境としての Vercel 活用は可能

**デプロイフロー:**

```
GitHub Push → GitHub Actions → Docker Image Build
  → GitHub Container Registry にプッシュ
  → VPS で docker compose pull && docker compose up -d
```

---

### 3.8 テスト: Vitest + Playwright

| 項目 | 内容 |
|------|------|
| ユニットテスト | **Vitest**（Vue / Nuxt 標準。Jest互換・高速） |
| E2Eテスト | **Playwright**（マルチブラウザ対応・AI生成コンテンツの検証） |
| コンポーネントテスト | **@vue/test-utils** + Vitest |

---

### 3.9 その他のツール

| カテゴリ | ツール | 用途 |
|---------|-------|------|
| 状態管理 | **Pinia** | Vue 3 / Nuxt 3 標準の状態管理 |
| バリデーション | **Zod** | API リクエスト/レスポンスの型安全なバリデーション。Drizzle のスキーマからも生成可能 |
| メール送信 | **Resend** or **nodemailer** | 通知・リマインド・案内メール |
| ファイルストレージ | **S3互換**（ConoHa Object Storage / MinIO） | 顔写真・資料・レイアウト図のアップロード |
| リアルタイム | **WebSocket**（Nitro built-in） | AI ストリーミング、チェックインのリアルタイム表示 |
| ログ・監視 | **Pino**（ロガー）+ **Sentry**（エラー監視） | 運用監視 |
| コード品質 | **ESLint** + **Prettier** + **@nuxt/eslint** | コーディング規約の自動適用 |
| パッケージ管理 | **pnpm** | 高速・ディスク効率の良いパッケージマネージャ |

---

## 4. 技術スタック全体図

```
┌─ Client（ブラウザ）────────────────────────────────────────┐
│                                                           │
│  Vue 3 + Nuxt 3                                           │
│  ├── Nuxt UI v3 (Tailwind CSS v4)   ← UI コンポーネント    │
│  ├── Pinia                          ← 状態管理            │
│  ├── @ai-sdk/vue (useChat)          ← AI ストリーミングUI（プロバイダー非依存） │
│  └── Better Auth Client (useSession)← 認証状態            │
│                                                           │
└───────────────────────┬───────────────────────────────────┘
                        │ HTTP / SSE
┌───────────────────────▼───────────────────────────────────┐
│  Nuxt 3 Nitro Server                                      │
│                                                           │
│  server/api/                                               │
│  ├── auth/[...all].ts        ← Better Auth ハンドラ        │
│  ├── events/                 ← イベント CRUD               │
│  ├── tasks/                  ← タスク管理                  │
│  ├── ai/chat.post.ts         ← AI チャット（ストリーミング・プロバイダー切替対応） │
│  └── ai/generate.post.ts    ← AI 生成（企画書・レポート等・モデルルーティング）    │
│                                                           │
│  server/middleware/                                         │
│  ├── auth.ts                 ← 認証チェック                 │
│  └── tenant.ts               ← テナント判定                │
│                                                           │
│  server/utils/                                              │
│  ├── db.ts                   ← Drizzle ORM インスタンス     │
│  ├── ai.ts                   ← LLM 抽象化レイヤー（Claude/GPT/Gemini切替） │
│  └── mail.ts                 ← メール送信                  │
│                                                           │
└───────────────────────┬───────────────────────────────────┘
                        │
┌───────────────────────▼───────────────────────────────────┐
│  PostgreSQL 16                                             │
│  ├── public schema (共通マスタ)                              │
│  └── Row Level Security (tenant_id ベース)                  │
└───────────────────────────────────────────────────────────┘

┌─ External Services ──────────────────────────────────────┐
│  Claude API (Anthropic)     ← 主 LLM（推奨デフォルト）     │
│  GPT-4o API (OpenAI)        ← 副 LLM（フォールバック）     │
│  Claude Haiku / GPT-4o-mini ← 軽量タスク用                │
│  Gemini API (Google)        ← 将来の選択肢として対応可能    │
│  Resend / SMTP              ← メール配信                  │
│  S3互換 Object Storage      ← ファイルアップロード          │
└──────────────────────────────────────────────────────────┘
```

---

## 5. コスト見積り（月額・MVP期間）

| 項目 | 月額目安 | 備考 |
|------|---------|------|
| ConoHa VPS (4GB RAM) | ¥2,000〜3,000 | Nuxt + PostgreSQL + Nginx を同居 |
| ドメイン | ¥100〜200 | .jp or .com |
| SSL証明書 | ¥0 | Let's Encrypt |
| Claude API | ¥5,000〜20,000 | 利用量に依存。開発中は少額 |
| Resend（メール） | ¥0〜 | 無料枠: 月3,000通 |
| Sentry（エラー監視） | ¥0〜 | 無料枠: 月5,000イベント |
| GitHub | ¥0 | パブリック or 無料プラン |
| **合計** | **¥7,000〜25,000** | MVP期間。本番運用時はスケールに応じて調整 |

---

## 6. リスクと対策

| リスク | 影響度 | 対策 |
|-------|-------|------|
| Nuxt 3 Nitro のサーバーサイドで性能限界 | 中 | Phase 2 で API を別サービスに分離可能（Nitro の API routes をそのまま切り出せる） |
| Better Auth の Organization プラグインが成熟不足 | 中 | 認証基盤の差し替えが比較的容易な設計にする。最悪カスタム実装に切替 |
| VPS の運用負荷 | 低 | Docker Compose + GitHub Actions で自動化。手動オペを最小化 |
| Drizzle ORM のエコシステムが Prisma より小さい | 低 | SQL に近い設計のため、ORM 依存度が低い。移行も容易 |
| AI SDK のバージョンアップ頻度が高い | 低 | ストリーミングUI層のみの利用に限定し、依存度を抑える |

---

## 7. 今後のスケール計画

| フェーズ | インフラ構成 | トリガー |
|---------|------------|---------|
| MVP | VPS 1台（App + DB 同居） | 開発開始〜パイロット |
| Phase 1.5 | VPS 2台（App / DB 分離） | パイロット拠点のトラフィック増 |
| Phase 2 | App: 複数台 + LB / DB: マネージド PostgreSQL | 複数会場チェーン導入 |
| Phase 3 | コンテナオーケストレーション（k8s or ECS） | 大規模スケール時 |

---

## 変更履歴

| 日付 | 変更内容 | 変更者 |
|------|---------|-------|
| 2026-02-06 | 初版作成 | AI |
