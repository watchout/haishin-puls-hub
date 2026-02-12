# SSOT-4: データモデル定義 [CONTRACT]

> 全エンティティの定義・リレーション・制約を管理する
> RFC 2119 準拠: MUST（必須）/ SHOULD（推奨）/ MAY（任意）

---

## 基本情報

| 項目 | 内容 |
|------|------|
| DB | PostgreSQL 16 |
| ORM | Drizzle ORM |
| マルチテナント戦略 | 共有DB + `tenant_id` カラム（Row Level Security） |
| 作成日 | 2026-02-06 |
| ステータス | Draft |

---

## §1. ER図（概要） [CORE]

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  tenant  │────<│     user     │────<│  user_role   │
│(会場ﾁｪｰﾝ)│     │              │     │              │
└────┬─────┘     └──────┬───────┘     └──────────────┘
     │                  │
     │    ┌─────────────┼─────────────────────┐
     │    │             │                     │
┌────▼────▼──┐   ┌──────▼───────┐     ┌───────▼──────┐
│   venue    │   │    event     │────<│  event_member │
│  (会議室)   │   │  (ｲﾍﾞﾝﾄ)     │     │ (関係者紐付)  │
└────────────┘   └──┬───┬───┬──┘     └──────────────┘
                    │   │   │
          ┌─────────┘   │   └─────────┐
          │             │             │
   ┌──────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐
   │    task     │ │ speaker  │ │participant │
   │  (ﾀｽｸ)      │ │ (登壇者)  │ │ (参加者)    │
   └─────────────┘ └──────────┘ └────────────┘
                                      │
                               ┌──────▼──────┐
                               │  checkin    │
                               │ (ﾁｪｯｸｲﾝ)    │
                               └─────────────┘

   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
   │  ai_log      │   │ notification │   │ event_report │
   │ (AI利用ﾛｸﾞ)   │   │ (通知)        │   │ (ﾚﾎﾟｰﾄ)      │
   └──────────────┘   └──────────────┘   └──────────────┘
```

---

## §2. テーブル定義 [CONTRACT]

### 共通カラム規約

全テーブルに以下のカラムを持つ:

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | `VARCHAR(26)` | 主キー（ULID） |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | 作成日時 |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | 更新日時 |

テナント分離対象テーブルにはさらに:

| カラム | 型 | 説明 |
|--------|-----|------|
| `tenant_id` | `VARCHAR(26)` | FK → tenant.id. RLS で自動フィルタ |

**ID戦略: ULID**
- ソート可能（時系列順）
- UUID互換（26文字）
- DB側でのインデックス効率が良い

---

### 2.1 tenant（テナント / 会場チェーン）

> Better Auth の Organization に対応

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| id | VARCHAR(26) | NO | PK (ULID) |
| name | VARCHAR(255) | NO | テナント名（例: ビジョンセンター） |
| slug | VARCHAR(100) | NO | URLスラッグ（例: vision-center）UNIQUE |
| logo_url | TEXT | YES | ロゴ画像URL |
| settings | JSONB | NO | テナント設定（デフォルト: `{}`) |
| plan | VARCHAR(50) | NO | 契約プラン（pilot / standard / enterprise） |
| is_active | BOOLEAN | NO | 有効/無効 |
| created_at | TIMESTAMPTZ | NO | |
| updated_at | TIMESTAMPTZ | NO | |

**インデックス:** `UNIQUE(slug)`

---

### 2.2 user（ユーザー）

> Better Auth の User に対応

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| id | VARCHAR(26) | NO | PK (ULID) |
| email | VARCHAR(255) | NO | メールアドレス UNIQUE |
| name | VARCHAR(255) | NO | 氏名 |
| avatar_url | TEXT | YES | プロフィール画像 |
| email_verified | BOOLEAN | NO | メール認証済みフラグ |
| is_active | BOOLEAN | NO | 有効/無効 |
| last_login_at | TIMESTAMPTZ | YES | 最終ログイン日時 |
| created_at | TIMESTAMPTZ | NO | |
| updated_at | TIMESTAMPTZ | NO | |

**インデックス:** `UNIQUE(email)`

**注意:** パスワードハッシュ等の認証情報は Better Auth が管理するテーブル（`account`, `session` 等）に格納。

---

### 2.3 user_tenant（ユーザー×テナント紐付）

> Better Auth の Member に対応。1ユーザーが複数テナントに所属可能

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| id | VARCHAR(26) | NO | PK |
| user_id | VARCHAR(26) | NO | FK → user.id |
| tenant_id | VARCHAR(26) | NO | FK → tenant.id |
| role | VARCHAR(50) | NO | ロール（下記参照） |
| is_default | BOOLEAN | NO | デフォルトテナントフラグ |
| joined_at | TIMESTAMPTZ | NO | 参加日時 |
| created_at | TIMESTAMPTZ | NO | |
| updated_at | TIMESTAMPTZ | NO | |

**インデックス:** `UNIQUE(user_id, tenant_id)`

**ロール定義:**

| role 値 | 説明 |
|---------|------|
| `system_admin` | システム管理者（全テナントアクセス可） |
| `tenant_admin` | テナント管理者 |
| `organizer` | セミナー主催者 |
| `venue_staff` | 会場スタッフ |
| `streaming_provider` | 動画配信業者 |
| `event_planner` | イベント企画会社（代行） |
| `speaker` | 登壇者 |
| `sales_marketing` | 営業・マーケ |
| `participant` | 参加者（イベント単位で自動付与） |
| `vendor` | その他関連業者 |

---

### 2.4 venue（会場 / 会議室）

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| id | VARCHAR(26) | NO | PK |
| tenant_id | VARCHAR(26) | NO | FK → tenant.id |
| name | VARCHAR(255) | NO | 会場名（例: ビジョンセンター丸の内 Aルーム） |
| branch_name | VARCHAR(255) | NO | 拠点名（例: 丸の内） |
| address | TEXT | NO | 住所 |
| latitude | DECIMAL(10,7) | YES | 緯度 |
| longitude | DECIMAL(10,7) | YES | 経度 |
| capacity | INTEGER | NO | 収容人数 |
| floor_map_url | TEXT | YES | フロアマップ画像URL |
| equipment | JSONB | NO | 常設機材情報（プロジェクター/スクリーン/マイク/LAN等） |
| wifi_info | JSONB | YES | Wi-Fi情報（SSID / パスワード） |
| notes | TEXT | YES | 備考（搬入口情報等） |
| is_active | BOOLEAN | NO | |
| created_at | TIMESTAMPTZ | NO | |
| updated_at | TIMESTAMPTZ | NO | |

**インデックス:** `(tenant_id)`, `(tenant_id, branch_name)`

---

### 2.5 event（イベント）

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| id | VARCHAR(26) | NO | PK |
| tenant_id | VARCHAR(26) | NO | FK → tenant.id |
| venue_id | VARCHAR(26) | YES | FK → venue.id |
| title | VARCHAR(500) | NO | イベント名 |
| description | TEXT | YES | 概要 |
| event_type | VARCHAR(50) | NO | 種別（seminar / presentation / internal / workshop） |
| format | VARCHAR(50) | NO | 形式（onsite / online / hybrid） |
| status | VARCHAR(50) | NO | ステータス（下記参照） |
| start_at | TIMESTAMPTZ | NO | 開始日時 |
| end_at | TIMESTAMPTZ | NO | 終了日時 |
| capacity_onsite | INTEGER | YES | 現地定員 |
| capacity_online | INTEGER | YES | オンライン定員 |
| budget_min | INTEGER | YES | 予算下限（円） |
| budget_max | INTEGER | YES | 予算上限（円） |
| streaming_url | TEXT | YES | 配信URL |
| portal_slug | VARCHAR(100) | YES | 参加者ポータルのスラッグ UNIQUE |
| settings | JSONB | NO | イベント設定（デフォルト: `{}`） |
| ai_generated | JSONB | YES | AI生成データ（企画書ドラフト等） |
| created_by | VARCHAR(26) | NO | FK → user.id |
| created_at | TIMESTAMPTZ | NO | |
| updated_at | TIMESTAMPTZ | NO | |

**インデックス:** `(tenant_id)`, `(tenant_id, status)`, `(tenant_id, start_at)`, `UNIQUE(portal_slug)`

**status 値:**

| status | 説明 |
|--------|------|
| `draft` | 下書き（企画中） |
| `planning` | 企画確定・準備中 |
| `confirmed` | 確定（会場・配信確定） |
| `ready` | 準備完了（当日待ち） |
| `in_progress` | 開催中 |
| `completed` | 終了 |
| `cancelled` | キャンセル |

---

### 2.6 event_member（イベント×関係者紐付）

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| id | VARCHAR(26) | NO | PK |
| event_id | VARCHAR(26) | NO | FK → event.id |
| user_id | VARCHAR(26) | NO | FK → user.id |
| role | VARCHAR(50) | NO | このイベントでのロール |
| tenant_id | VARCHAR(26) | NO | FK → tenant.id |
| created_at | TIMESTAMPTZ | NO | |

**インデックス:** `UNIQUE(event_id, user_id)`, `(tenant_id)`

---

### 2.7 task（タスク）

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| id | VARCHAR(26) | NO | PK |
| event_id | VARCHAR(26) | NO | FK → event.id |
| tenant_id | VARCHAR(26) | NO | FK → tenant.id |
| title | VARCHAR(500) | NO | タスク名 |
| description | TEXT | YES | 詳細 |
| assigned_role | VARCHAR(50) | YES | 担当ロール |
| assigned_user_id | VARCHAR(26) | YES | FK → user.id（個人アサイン） |
| status | VARCHAR(50) | NO | 状態（pending / in_progress / completed / skipped） |
| priority | VARCHAR(20) | NO | 優先度（high / medium / low） |
| relative_day | INTEGER | YES | イベント日からの相対日（D-30 = -30, D+1 = 1） |
| due_at | TIMESTAMPTZ | YES | 絶対締め切り日時 |
| completed_at | TIMESTAMPTZ | YES | 完了日時 |
| sort_order | INTEGER | NO | 表示順 |
| template_id | VARCHAR(26) | YES | 元になったテンプレートのID |
| created_at | TIMESTAMPTZ | NO | |
| updated_at | TIMESTAMPTZ | NO | |

**インデックス:** `(event_id)`, `(tenant_id)`, `(assigned_user_id)`, `(event_id, status)`, `(event_id, due_at)`

---

### 2.8 task_template（タスクテンプレート）

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| id | VARCHAR(26) | NO | PK |
| tenant_id | VARCHAR(26) | YES | NULL = システム共通テンプレート |
| event_type | VARCHAR(50) | NO | 対象イベント種別 |
| title | VARCHAR(500) | NO | タスク名 |
| description | TEXT | YES | 詳細 |
| assigned_role | VARCHAR(50) | NO | 担当ロール |
| relative_day | INTEGER | NO | 相対日（D-XX） |
| priority | VARCHAR(20) | NO | 優先度 |
| sort_order | INTEGER | NO | 表示順 |
| is_active | BOOLEAN | NO | |
| created_at | TIMESTAMPTZ | NO | |
| updated_at | TIMESTAMPTZ | NO | |

**インデックス:** `(event_type)`, `(tenant_id, event_type)`

---

### 2.9 speaker（登壇者情報）

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| id | VARCHAR(26) | NO | PK |
| event_id | VARCHAR(26) | NO | FK → event.id |
| tenant_id | VARCHAR(26) | NO | FK → tenant.id |
| user_id | VARCHAR(26) | YES | FK → user.id（HUBユーザーの場合） |
| name | VARCHAR(255) | NO | 氏名 |
| title | VARCHAR(255) | YES | 肩書き |
| organization | VARCHAR(255) | YES | 所属 |
| bio | TEXT | YES | プロフィール |
| photo_url | TEXT | YES | 顔写真URL |
| presentation_title | VARCHAR(500) | YES | 登壇タイトル |
| start_at | TIMESTAMPTZ | YES | 登壇開始時刻 |
| duration_minutes | INTEGER | YES | 持ち時間（分） |
| format | VARCHAR(50) | YES | 登壇形式（onsite / online） |
| materials_url | TEXT | YES | 資料URL |
| submission_status | VARCHAR(50) | NO | 提出状態（pending / submitted / confirmed） |
| ai_generated_bio | TEXT | YES | AI生成の紹介文 |
| sort_order | INTEGER | NO | 表示順 |
| created_at | TIMESTAMPTZ | NO | |
| updated_at | TIMESTAMPTZ | NO | |

**インデックス:** `(event_id)`, `(tenant_id)`

---

### 2.10 participant（参加者）

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| id | VARCHAR(26) | NO | PK |
| event_id | VARCHAR(26) | NO | FK → event.id |
| tenant_id | VARCHAR(26) | NO | FK → tenant.id |
| user_id | VARCHAR(26) | YES | FK → user.id（HUBユーザーの場合） |
| name | VARCHAR(255) | NO | 氏名 |
| email | VARCHAR(255) | NO | メール |
| organization | VARCHAR(255) | YES | 所属 |
| participation_type | VARCHAR(50) | NO | 参加形態（onsite / online） |
| registration_status | VARCHAR(50) | NO | 登録状態（registered / confirmed / cancelled） |
| qr_code | VARCHAR(255) | YES | QRコード値 UNIQUE |
| custom_fields | JSONB | YES | カスタムフィールド |
| registered_at | TIMESTAMPTZ | NO | 登録日時 |
| created_at | TIMESTAMPTZ | NO | |
| updated_at | TIMESTAMPTZ | NO | |

**インデックス:** `(event_id)`, `(tenant_id)`, `UNIQUE(qr_code)`, `(event_id, email)`

---

### 2.11 checkin（チェックイン）

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| id | VARCHAR(26) | NO | PK |
| participant_id | VARCHAR(26) | NO | FK → participant.id |
| event_id | VARCHAR(26) | NO | FK → event.id |
| tenant_id | VARCHAR(26) | NO | FK → tenant.id |
| checked_in_at | TIMESTAMPTZ | NO | チェックイン日時 |
| method | VARCHAR(50) | NO | 方法（qr / manual / walk_in） |
| created_at | TIMESTAMPTZ | NO | |

**インデックス:** `(event_id)`, `(participant_id)`

---

### 2.12 survey（アンケート）

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| id | VARCHAR(26) | NO | PK |
| event_id | VARCHAR(26) | NO | FK → event.id |
| tenant_id | VARCHAR(26) | NO | FK → tenant.id |
| title | VARCHAR(500) | NO | アンケートタイトル |
| questions | JSONB | NO | 質問定義（配列） |
| is_active | BOOLEAN | NO | |
| created_at | TIMESTAMPTZ | NO | |
| updated_at | TIMESTAMPTZ | NO | |

---

### 2.13 survey_response（アンケート回答）

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| id | VARCHAR(26) | NO | PK |
| survey_id | VARCHAR(26) | NO | FK → survey.id |
| participant_id | VARCHAR(26) | YES | FK → participant.id |
| event_id | VARCHAR(26) | NO | FK → event.id |
| tenant_id | VARCHAR(26) | NO | FK → tenant.id |
| answers | JSONB | NO | 回答データ |
| submitted_at | TIMESTAMPTZ | NO | 回答日時 |
| created_at | TIMESTAMPTZ | NO | |

---

### 2.14 event_report（イベントレポート）

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| id | VARCHAR(26) | NO | PK |
| event_id | VARCHAR(26) | NO | FK → event.id |
| tenant_id | VARCHAR(26) | NO | FK → tenant.id |
| report_type | VARCHAR(50) | NO | 種別（summary / proposal / follow_up） |
| content | TEXT | NO | レポート本文（Markdown） |
| metadata | JSONB | YES | 集計データ（参加者数等） |
| generated_by | VARCHAR(50) | NO | 生成者（ai / manual） |
| status | VARCHAR(50) | NO | 状態（draft / published） |
| created_at | TIMESTAMPTZ | NO | |
| updated_at | TIMESTAMPTZ | NO | |

---

### 2.15 estimate（見積り）

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| id | VARCHAR(26) | NO | PK |
| event_id | VARCHAR(26) | YES | FK → event.id |
| tenant_id | VARCHAR(26) | NO | FK → tenant.id |
| title | VARCHAR(500) | NO | 見積りタイトル |
| items | JSONB | NO | 明細（配列: [{name, quantity, unit_price, subtotal}]） |
| total_amount | INTEGER | NO | 合計金額（円） |
| status | VARCHAR(50) | NO | 状態（draft / sent / approved） |
| created_by | VARCHAR(26) | NO | FK → user.id |
| notes | TEXT | YES | 備考 |
| created_at | TIMESTAMPTZ | NO | |
| updated_at | TIMESTAMPTZ | NO | |

---

### 2.16 streaming_package（配信パッケージマスタ）

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| id | VARCHAR(26) | NO | PK |
| tenant_id | VARCHAR(26) | YES | NULL = 全テナント共通 |
| name | VARCHAR(255) | NO | パッケージ名（基本配信 / フル配信+撮影 等） |
| description | TEXT | YES | 説明 |
| items | JSONB | NO | 構成内容（配列） |
| base_price | INTEGER | NO | 基本価格（円） |
| is_active | BOOLEAN | NO | |
| sort_order | INTEGER | NO | 表示順 |
| created_at | TIMESTAMPTZ | NO | |
| updated_at | TIMESTAMPTZ | NO | |

---

### 2.17 notification（通知）

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| id | VARCHAR(26) | NO | PK |
| tenant_id | VARCHAR(26) | NO | FK → tenant.id |
| user_id | VARCHAR(26) | NO | FK → user.id（宛先） |
| event_id | VARCHAR(26) | YES | FK → event.id |
| type | VARCHAR(50) | NO | 種別（task_reminder / event_update / system） |
| title | VARCHAR(500) | NO | 通知タイトル |
| body | TEXT | NO | 通知本文 |
| is_read | BOOLEAN | NO | 既読フラグ |
| sent_via | VARCHAR(50) | NO | 送信方法（in_app / email / both） |
| email_sent_at | TIMESTAMPTZ | YES | メール送信日時 |
| read_at | TIMESTAMPTZ | YES | 既読日時 |
| created_at | TIMESTAMPTZ | NO | |

**インデックス:** `(user_id, is_read)`, `(tenant_id)`, `(event_id)`

---

### 2.18 ai_conversation（AI会話ログ）

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| id | VARCHAR(26) | NO | PK |
| tenant_id | VARCHAR(26) | NO | FK → tenant.id |
| user_id | VARCHAR(26) | NO | FK → user.id |
| event_id | VARCHAR(26) | YES | FK → event.id（イベント文脈） |
| messages | JSONB | NO | メッセージ履歴（配列: [{role, content, timestamp}]） |
| usecase | VARCHAR(100) | YES | ユースケース（planning / faq / report 等） |
| model_provider | VARCHAR(50) | NO | 使用プロバイダー（claude / openai） |
| model_name | VARCHAR(100) | NO | 使用モデル名 |
| total_input_tokens | INTEGER | NO | 入力トークン合計 |
| total_output_tokens | INTEGER | NO | 出力トークン合計 |
| estimated_cost_jpy | DECIMAL(10,2) | YES | 推定コスト（円） |
| created_at | TIMESTAMPTZ | NO | |
| updated_at | TIMESTAMPTZ | NO | |

**インデックス:** `(tenant_id, user_id)`, `(event_id)`, `(created_at)`

---

### 2.19 prompt_template（プロンプトテンプレート）

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| id | VARCHAR(26) | NO | PK |
| tenant_id | VARCHAR(26) | YES | NULL = システム共通 |
| usecase | VARCHAR(100) | NO | ユースケース |
| name | VARCHAR(255) | NO | テンプレート名 |
| system_prompt | TEXT | NO | システムプロンプト |
| user_prompt_template | TEXT | NO | ユーザープロンプトテンプレート（変数埋め込み可） |
| variables | JSONB | YES | 利用可能な変数定義 |
| model_config | JSONB | NO | モデル設定（provider, model, temperature, max_tokens） |
| version | INTEGER | NO | バージョン番号 |
| is_active | BOOLEAN | NO | |
| created_at | TIMESTAMPTZ | NO | |
| updated_at | TIMESTAMPTZ | NO | |

**インデックス:** `(usecase, is_active)`, `(tenant_id)`

---

### 2.20 file_upload（ファイルアップロード）

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| id | VARCHAR(26) | NO | PK |
| tenant_id | VARCHAR(26) | NO | FK → tenant.id |
| uploaded_by | VARCHAR(26) | NO | FK → user.id |
| event_id | VARCHAR(26) | YES | FK → event.id |
| entity_type | VARCHAR(50) | NO | 紐付先エンティティ種別（speaker / venue / event） |
| entity_id | VARCHAR(26) | NO | 紐付先エンティティID |
| file_name | VARCHAR(255) | NO | オリジナルファイル名 |
| file_type | VARCHAR(100) | NO | MIMEタイプ |
| file_size | INTEGER | NO | ファイルサイズ（bytes） |
| storage_path | TEXT | NO | ストレージ上のパス |
| created_at | TIMESTAMPTZ | NO | |

---

## §3. Better Auth 管理テーブル [CONTRACT]

Better Auth が自動生成・管理するテーブル（直接操作しない）:

| テーブル | 内容 |
|---------|------|
| `account` | 認証アカウント（メール/パスワード, OAuth） |
| `session` | セッション管理 |
| `verification` | メール認証トークン |
| `organization` | → `tenant` テーブルと同期 |
| `member` | → `user_tenant` テーブルと同期 |
| `invitation` | 招待管理 |

---

## §4. マルチテナント分離ルール [CORE]

```
1. tenant_id カラムを持つテーブルは、全クエリで tenant_id フィルタを必須とする
2. Drizzle のグローバル filter で自動付与する
3. API のミドルウェアで、ログインユーザーの所属テナントを取得し、
   リクエストコンテキストに注入する
4. テナント横断アクセスは system_admin ロールのみ許可
```

---

## §5. JSONB フィールド設計方針 [DETAIL]

| テーブル.カラム | 用途 | スキーマ例 |
|---------------|------|-----------|
| `tenant.settings` | テナント固有設定 | `{ "timezone": "Asia/Tokyo", "default_language": "ja" }` |
| `venue.equipment` | 常設機材情報 | `{ "projector": true, "screen": true, "mic_wireless": 2, "lan_ports": 4 }` |
| `venue.wifi_info` | Wi-Fi情報 | `{ "ssid": "VC-Guest", "password": "xxx" }` |
| `event.settings` | イベント固有設定 | `{ "allow_walk_in": true, "survey_enabled": true }` |
| `event.ai_generated` | AI生成物 | `{ "proposal_draft": "...", "estimate_draft": {...} }` |
| `estimate.items` | 見積り明細 | `[{ "name": "会場費", "quantity": 1, "unit_price": 50000, "subtotal": 50000 }]` |
| `survey.questions` | アンケート質問 | `[{ "id": "q1", "type": "rating", "text": "満足度", "options": [1,2,3,4,5] }]` |
| `prompt_template.model_config` | モデル設定 | `{ "provider": "claude", "model": "claude-sonnet", "temperature": 0.7, "max_tokens": 4096 }` |

---

## §6. マイグレーション方針 [DETAIL]

- マイグレーションはDrizzle ORM kitを使用する（MUST）
- マイグレーションファイルは手動編集しない（MUST NOT）
- 本番環境へのマイグレーション前にステージングで検証する（MUST）
- 破壊的変更（カラム削除等）は段階的に実施する（SHOULD）

---

## §7. インデックス方針 [DETAIL]

- 外部キーには自動的にインデックスを作成する（MUST）
- tenant_id を含む複合インデックスを主要なクエリパターンに設定する（MUST）
- 全文検索が必要な場合はGINインデックスを検討する（MAY）

---

## §8. テスト方針 [DETAIL]

| テスト種別 | 対象 | 方法 |
|----------|------|------|
| スキーマ整合性 | マイグレーション | Drizzle kit check |
| データ整合性 | FK制約・ユニーク制約 | 統合テスト |
| テナント分離 | RLS相当のwhere句 | 統合テスト |

- テナント間データ漏洩がないことをテストで検証すること（MUST）
- シードデータで複数テナントのテストデータを用意すること（SHOULD）

---

## §9. バックアップ・リカバリ [DETAIL]

- 日次でデータベースバックアップを取得する（MUST）
- Point-in-Time Recovery（PITR）を有効化する（SHOULD）
- リカバリ手順を文書化し、定期的にテストする（SHOULD）

---

## §10. パフォーマンス [DETAIL]

- N+1クエリを防止するためJOINまたはバッチ取得を使用する（MUST）
- 大量データの一覧取得にはカーソルベースページネーションを検討する（MAY）
- スロークエリログを有効化する（SHOULD）

---

## §11. 実装優先順位 [DETAIL]

1. Phase 1（MVP）: tenant, user, user_tenant, event, task, venue, ai_conversation
2. Phase 1.5: participant, form_submission, event_report
3. Phase 2: crm_integration, analytics

---

## §12. 未解決課題（Open Questions） [DETAIL]

| ID | 課題 | 影響範囲 | 担当 |
|----|------|---------|------|
| DB-OQ-001 | PostgreSQL RLSの導入タイミング | マルチテナント分離 | 技術 |
| DB-OQ-002 | 監査ログテーブルのパーティショニング | パフォーマンス | 技術 |

---

## 変更履歴

| 日付 | 変更内容 | 変更者 |
|------|---------|-------|
| 2026-02-06 | 初版作成（20テーブル + Better Auth管理テーブル） | AI |
| 2026-02-12 | フレームワーク形式適合（§記法、RFC 2119、レイヤーラベル、§6-§12追加） | AI |
