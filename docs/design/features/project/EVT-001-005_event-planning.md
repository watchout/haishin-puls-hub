# EVT-001-005: イベント企画・予約AIアシスト機能仕様書

| 項目 | 内容 |
|------|------|
| 機能ID | EVT-001, EVT-002, EVT-003, EVT-004, EVT-005 |
| 機能名 | イベント企画・予約AIアシスト |
| 優先度 | P0 (MVP必須) |
| 担当 | TBD |
| ステータス | Draft |
| 作成日 | 2026-02-09 |
| 更新日 | 2026-02-09 |

---

## § 1. 概要 [CORE]

### 目的

セミナー・イベントの企画段階で、主催者や企画代行が**目的・ターゲット・規模・予算・日程候補**を入力するだけで、AIが**会場候補・開催形式・概算見積り・企画書ドラフト**を自動生成し、企画～予約までの工数を80%削減する。

### 対象ユーザー

| ロール | 利用目的 |
|--------|----------|
| organizer（主催者） | 自社イベントの企画・予約 |
| event_planner（企画代行） | クライアント代理でのイベント企画 |
| venue_sales（会場営業） | 利用人数・形式・配信有無から即時見積り |

### スコープ

#### MVP対象（本仕様）
- **EVT-001**: ゴールベースイベント作成（AI支援付き）
- **EVT-002**: 会場候補のAI自動提案（空き状況・配信条件考慮）
- **EVT-003**: 開催形式（現地/ハイブリッド/オンライン）AI提案
- **EVT-004**: 概算見積りAI自動生成（会場＋配信パッケージ込み）
- **EVT-005**: 稟議用企画書ドラフトAI生成＋PDF出力

#### MVP対象外（将来拡張）
- 過去の類似イベント参考提案（AC5）
- 会場との空き確認連携（外部カレンダー統合）
- 複数会場の自動比較表生成
- 予算最適化アルゴリズム（コスト削減提案）

### 依存関係

| 依存先 | 理由 |
|--------|------|
| AUTH-001（ログイン） | 認証済みユーザーのみ利用可能 |
| AUTH-003（組織管理） | tenant_id によるデータ分離 |
| SSOT-4（データモデル） | event, venue, estimate, streaming_package テーブル |
| SSOT-5（AIサービス） | Claude/GPT による生成機能 |

---

## § 2. ユーザーストーリー [CORE]

### EVT-001: ゴールベースイベント作成

**As a** 主催者 or 企画代行
**I want to** 目的・ターゲット・規模・予算・日程候補を入力するだけでイベント企画を開始したい
**So that** 会場探しや形式検討の工数を削減できる

#### 受け入れ条件
- **AC1**: 新規イベント作成画面で目的/ターゲット/参加者数/予算/日程候補を入力できる
- **AC2**: 入力内容からAIが会場候補・形式案・概算見積りを自動生成する
- **AC3**: 生成結果を修正・確定しイベント登録できる
- **AC4**: 企画代行がクライアント代理で作成可能（tenant切り替え）
- **AC5**: ~~過去の類似イベント参考提案~~（将来）

#### ユーザーフロー

```
[イベント一覧] → [新規作成ボタン]
  ↓
[STEP 1: 基本情報入力]
  - イベントの目的（テキストエリア）
  - ターゲット参加者（テキストエリア）
  - 想定参加者数（現地/オンライン別）
  - 予算範囲（最小～最大）
  - 日程候補（複数選択可能）
  - イベント種別（セミナー/プレゼン/社内/ワークショップ）
  ↓
[AI提案生成中...]（3-5秒）
  ↓
[STEP 2: AI提案確認・調整]
  - 会場候補リスト（空き状況付き）
  - 開催形式提案（理由付き）
  - 概算見積り（会場費+配信パッケージ）
  - 修正可能（会場変更・項目追加）
  ↓
[STEP 3: 確認・登録]
  - タイトル自動生成（編集可）
  - 概要文自動生成（編集可）
  - [下書き保存] or [企画書生成して確定]
  ↓
[イベント詳細画面] or [企画書PDF表示]
```

---

### EVT-002: 会場候補のAI自動提案

**As a** 主催者
**I want to** 参加者数・日程・配信有無から最適な会場候補を提案してほしい
**So that** 会場探しの手間を省ける

#### 受け入れ条件
- **AC1**: 参加者数・日程・配信有無から会場候補を3-5件提案
- **AC2**: 空き状況を考慮（availability APIで確認）
- **AC3**: 配信設備の有無を考慮（wifi_info, equipment）
- **AC4**: 候補ごとに選定理由を表示
- **AC5**: 手動で別会場に変更可能

---

### EVT-003: 開催形式AI提案

**As a** 主催者
**I want to** ターゲット・規模から最適な開催形式を提案してほしい
**So that** 現地/オンライン/ハイブリッドの判断を迅速化できる

#### 受け入れ条件
- **AC1**: 入力内容から形式（onsite/online/hybrid）を提案
- **AC2**: 提案理由をユーザーに表示（例: 「遠方参加者が多いためハイブリッド推奨」）
- **AC3**: 形式を手動で変更可能
- **AC4**: 変更時に見積りが再計算される

---

### EVT-004: 概算見積りAI自動生成

**As a** 会場営業
**I want to** 利用人数・形式・配信有無だけで即時見積りを出したい
**So that** 商談時間を短縮できる

#### 受け入れ条件
- **AC1**: 規模・形式に基づく会場費＋配信パッケージ費の概算自動計算
- **AC2**: 標準パッケージ選択（基本配信/フル配信+撮影/フル配信+撮影+編集）
- **AC3**: 手動調整可能（項目追加・単価修正）
- **AC4**: 会場営業が利用人数・形式・配信有無だけで即時見積り
- **AC5**: 見積りをPDF/メール共有

---

### EVT-005: 稟議用企画書ドラフトAI生成

**As a** 主催者
**I want to** イベント内容から稟議用企画書を自動生成してほしい
**So that** 社内承認プロセスを迅速化できる

#### 受け入れ条件
- **AC1**: イベント目的・概要・見積りから企画書ドラフトを生成
- **AC2**: PDFで出力可能
- **AC3**: 生成前に内容をプレビュー・編集可能
- **AC4**: 企画書テンプレート選択可能（標準/詳細）

---

## § 3. 機能要件 [CONTRACT]

### FR-EVT-001: イベント作成ウィザード

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-EVT-001-01 | 3ステップウィザード形式のイベント作成画面を提供する | MUST |
| FR-EVT-001-02 | STEP 1で目的・ターゲット・規模・予算・日程候補を入力可能 | MUST |
| FR-EVT-001-03 | STEP 1完了時にAI提案生成を自動実行（3-5秒） | MUST |
| FR-EVT-001-04 | STEP 2でAI提案結果（会場・形式・見積り）を表示 | MUST |
| FR-EVT-001-05 | STEP 2で提案内容を手動修正可能（会場変更・項目追加） | MUST |
| FR-EVT-001-06 | STEP 3で最終確認・タイトル/概要編集・登録実行 | MUST |
| FR-EVT-001-07 | 下書き保存機能（status: draft）を提供 | MUST |
| FR-EVT-001-08 | 企画代行がクライアント組織を選択して作成可能 | MUST |

### FR-EVT-002: 会場候補AI提案

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-EVT-002-01 | 参加者数・日程・配信有無から会場候補を3-5件提案 | MUST |
| FR-EVT-002-02 | 会場の空き状況をavailability APIで確認 | MUST |
| FR-EVT-002-03 | 配信有無を考慮（wifi_info, equipment確認） | MUST |
| FR-EVT-002-04 | 候補ごとに選定理由を表示 | MUST |
| FR-EVT-002-05 | 会場候補を手動で別会場に変更可能 | MUST |

### FR-EVT-003: 開催形式AI提案

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-EVT-003-01 | 入力内容から形式（onsite/online/hybrid）を提案 | MUST |
| FR-EVT-003-02 | 提案理由を表示（例: 遠方参加者多数→hybrid推奨） | MUST |
| FR-EVT-003-03 | 形式を手動で変更可能 | MUST |
| FR-EVT-003-04 | 形式変更時に見積りを自動再計算 | MUST |

### FR-EVT-004: 概算見積りAI生成

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-EVT-004-01 | 規模・形式から会場費＋配信パッケージ費を自動計算 | MUST |
| FR-EVT-004-02 | 配信パッケージ選択（基本/フル配信+撮影/フル配信+撮影+編集） | MUST |
| FR-EVT-004-03 | 見積り項目の手動追加・単価修正が可能 | MUST |
| FR-EVT-004-04 | 見積りステータス管理（draft/sent/approved） | MUST |
| FR-EVT-004-05 | 見積りをPDF出力可能 | MUST |
| FR-EVT-004-06 | 見積りをメール送信可能 | SHOULD |

### FR-EVT-005: 企画書ドラフトAI生成

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-EVT-005-01 | イベント内容から稟議用企画書を生成 | MUST |
| FR-EVT-005-02 | 企画書をPDF出力可能 | MUST |
| FR-EVT-005-03 | 生成前にプレビュー・編集可能 | MUST |
| FR-EVT-005-04 | 企画書テンプレート選択（標準/詳細） | SHOULD |

### FR-EVT-006: イベントCRUD

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-EVT-006-01 | イベント一覧表示（tenant_id別・ステータス絞り込み） | MUST |
| FR-EVT-006-02 | イベント詳細表示 | MUST |
| FR-EVT-006-03 | イベント編集（draft/planning時のみ） | MUST |
| FR-EVT-006-04 | イベント削除（draft時のみ・論理削除） | MUST |
| FR-EVT-006-05 | イベントステータス遷移（draft→planning→confirmed） | MUST |

### § 3-E. 入出力例 [CONTRACT]

| # | 操作 | メソッド / パス | リクエストボディ（抜粋） | 条件 | 期待レスポンス | 備考 |
|---|------|----------------|------------------------|------|--------------|------|
| 1 | イベント作成（正常） | POST /api/v1/events | `{ "title": "製造業DXセミナー", "event_type": "seminar", "format": "hybrid", "goal": "新製品の認知度向上", "target_audience": "製造業の経営者", "capacity_onsite": 50, "capacity_online": 100 }` | organizer ロール、認証済み | 201 Created, `{ "id": "...", "status": "draft", ... }` | 基本の正常系 |
| 2 | イベント作成（バリデーションエラー） | POST /api/v1/events | `{ "title": "", "event_type": "invalid" }` | organizer ロール | 400 Bad Request, `{ "code": "VALIDATION_ERROR", "errors": [...] }` | title 空・event_type 不正 |
| 3 | イベント詳細取得（正常） | GET /api/v1/events/:id | - | 同一 tenant 内のユーザー | 200 OK, `{ "id": "...", "title": "製造業DXセミナー", ... }` | tenant_id による分離確認 |
| 4 | イベント更新（正常） | PATCH /api/v1/events/:id | `{ "title": "製造業DXセミナー 2026春", "capacity_onsite": 80 }` | status=draft、organizer ロール | 200 OK, 更新された event オブジェクト | 部分更新 |
| 5 | イベント削除（論理削除） | DELETE /api/v1/events/:id | - | status=draft、organizer ロール | 200 OK, `{ "message": "イベントを削除しました" }` | 論理削除（is_deleted=true） |
| 6 | イベント削除（ステータスエラー） | DELETE /api/v1/events/:id | - | status=planning | 400 Bad Request, `{ "code": "INVALID_STATUS", "message": "下書き状態のイベントのみ削除できます" }` | draft 以外は削除不可 |
| 7 | 会場AI提案取得 | POST /api/v1/events/ai/suggest | `{ "goal": "新製品の認知度向上", "target_audience": "製造業経営者", "capacity_onsite": 50, "capacity_online": 100, "date_candidates": [{"date": "2026-03-15", "start_time": "14:00", "end_time": "16:00", "priority": 1}], "event_type": "seminar" }` | organizer ロール | 200 OK, `{ "venues": [...], "format": { "recommended": "hybrid", "reason": "..." }, "estimate": {...} }` | AI 提案一括取得 |
| 8 | 形式AI提案（日程候補なし） | POST /api/v1/events/ai/suggest | `{ "goal": "社内研修", "target_audience": "全社員", "date_candidates": [], "event_type": "internal" }` | organizer ロール | 400 Bad Request, `{ "code": "VALIDATION_ERROR", "message": "日程候補は必須です" }` | date_candidates 空バリデーション |
| 9 | 見積りAI生成（正常） | POST /api/v1/estimates/generate | `{ "venue_id": "...", "format": "hybrid", "capacity_onsite": 50, "capacity_online": 100, "streaming_package_id": "..." }` | organizer ロール | 201 Created, `{ "id": "...", "items": [...], "total_amount": 250000, "status": "draft", "generated_by": "ai" }` | 会場費 + 配信パッケージ費 |
| 10 | 企画書ドラフト生成 | POST /api/v1/ai/generate/proposal | `{ "event_id": "...", "template": "standard", "include_estimate": true }` | status=planning 以上 | 200 OK, `{ "title": "...", "sections": [...], "markdown": "..." }` | 5セクション構成 |

### § 3-F. 境界値 [CONTRACT]

| 項目 | 最小値 | 最大値 | 空 / NULL | 不正形式 |
|------|--------|--------|-----------|---------|
| title | 1文字 → OK | 200文字 → OK; 201文字 → 400 `VALIDATION_ERROR` | "" → 400 "タイトルを入力してください" | - (文字列なら許可) |
| description | 0文字 → OK (任意) | 5000文字 → OK; 5001文字 → 400 `VALIDATION_ERROR` | null → OK | - |
| goal | 1文字 → OK | 1000文字 → OK; 1001文字 → 400 | null → OK (任意) | - |
| target_audience | 1文字 → OK | 500文字 → OK; 501文字 → 400 | null → OK (任意) | - |
| start_at | 現在日時以降 → OK | - | null → OK (draft 時) | "not-a-date" → 400 "有効な日時を入力してください" |
| end_at | start_at + 1分 → OK | - | null → OK (draft 時) | start_at 以前 → 400 "終了日時は開始日時より後にしてください" |
| capacity_onsite | 1 → OK; 0 → 400 | 10000 → OK; 10001 → 400 | null → OK (format=online 時) | -1 → 400, 小数 → 400 |
| capacity_online | 1 → OK; 0 → 400 | 10000 → OK; 10001 → 400 | null → OK (format=onsite 時) | -1 → 400, 小数 → 400 |
| budget_min | 0 → OK | 999,999,999 → OK | null → OK | -1 → 400 |
| budget_max | budget_min → OK | 999,999,999 → OK | null → OK | budget_min 未満 → 400 "予算上限は下限以上にしてください" |
| date_candidates | 1件 → OK | 5件 → OK; 6件 → 400 "日程候補は5件までです" | [] → 400 (AI提案時は必須) | priority 範囲外 → 400 |
| event_type | 定義済み enum → OK | - | null → 400 | "invalid_type" → 400 "無効なイベント種別です" |
| format | 定義済み enum → OK | - | null → 400 | "invalid_format" → 400 "無効な開催形式です" |

### § 3-G. 例外レスポンス [CONTRACT]

| # | 例外条件 | HTTP ステータス | エラーコード | ユーザーメッセージ | リトライ可否 | 復旧方法 |
|---|---------|----------------|------------|-----------------|------------|---------|
| 1 | リクエストボディ不正（Zod バリデーション失敗） | 400 | VALIDATION_ERROR | フィールド別エラーメッセージ | Yes | 入力修正 |
| 2 | イベントが存在しない | 404 | NOT_FOUND | 指定されたイベントが見つかりません | No | ID 確認 |
| 3 | 権限不足（ロール不一致） | 403 | FORBIDDEN | この操作を行う権限がありません | No | 管理者に権限付与を依頼 |
| 4 | 他テナントのリソースへのアクセス | 403 | FORBIDDEN | この操作を行う権限がありません | No | 正しいテナントに切り替え |
| 5 | 未認証 | 401 | UNAUTHORIZED | ログインが必要です | Yes | ログイン |
| 6 | ステータス遷移不正（例: planning → draft） | 409 | CONFLICT | 現在のステータスではこの操作を実行できません | No | 正しいステータスを確認 |
| 7 | draft 以外での削除試行 | 400 | INVALID_STATUS | 下書き状態のイベントのみ削除できます | No | ステータスを確認 |
| 8 | AI 提案生成タイムアウト（10秒超過） | 504 | AI_TIMEOUT | AI提案の生成に失敗しました。手動で入力を進めてください | Yes | 手動入力 or 再試行 |
| 9 | AI API 障害 | 502 | AI_SERVICE_ERROR | AI機能が一時的に利用できません。手動で入力を進めてください | Yes | 手動入力 or 時間をおいて再試行 |
| 10 | 会場候補 0 件 | 200 (空配列) | - | 条件に合う会場が見つかりませんでした。手動で会場を選択してください | Yes | 条件変更 or 手動選択 |
| 11 | 見積り生成失敗 | 502 | ESTIMATE_GENERATION_ERROR | 見積りの自動生成に失敗しました。手動で入力してください | Yes | 手動入力 or 再試行 |
| 12 | 企画書生成失敗 | 502 | PROPOSAL_GENERATION_ERROR | 企画書の生成に失敗しました。後ほど再試行してください | Yes | 再試行 |
| 13 | レート制限 | 429 | RATE_LIMITED | しばらく時間をおいて再試行してください | Yes (60s) | 時間経過 |
| 14 | 会場が存在しない（venue_id 不正） | 404 | VENUE_NOT_FOUND | 指定された会場が見つかりません | No | venue_id 確認 |

### § 3-H. 受け入れテスト（Gherkin） [CONTRACT]

```gherkin
Feature: EVT-001-005 イベント企画・予約AIアシスト

  Background:
    Given ユーザー "organizer@example.com" がテナント "IYASAKA" に organizer ロールで所属
    And ログイン済み
    And 会場 "東京本社 セミナールームA" が venue テーブルに登録済み（capacity: 80）
    And 会場 "大阪支店 会議室B" が venue テーブルに登録済み（capacity: 60）
    And 配信パッケージ "基本配信" が streaming_package テーブルに登録済み（base_price: 80000）
    And 配信パッケージ "フル配信+撮影" が streaming_package テーブルに登録済み（base_price: 180000）

  # --- EVT-001: イベント作成ウィザード ---

  Scenario: STEP 1 基本情報入力 → AI提案生成
    Given イベント作成ウィザード（/events/new）を開いている
    When イベント種別 "セミナー" を選択する
    And 目的に "新製品の認知度向上とリード獲得" を入力する
    And ターゲットに "製造業の経営者・IT責任者" を入力する
    And 現地参加者数 50、オンライン参加者数 100 を入力する
    And 日程候補 "2026-03-15 14:00-16:00" を追加する
    And "AI提案を生成" ボタンをクリックする
    Then 3-5秒以内に STEP 2 に遷移する
    And AI提案結果（会場候補・形式・見積り）が表示される

  Scenario: STEP 2 会場候補の変更で見積り再計算
    Given STEP 2 で AI 提案結果が表示されている
    And 会場候補 "東京本社 セミナールームA" が選択されている
    When 会場を "大阪支店 会議室B" に変更する
    Then 見積りが自動再計算される
    And 会場費が "大阪支店 会議室B" の料金に更新される

  Scenario: STEP 2 開催形式の変更で見積り再計算
    Given STEP 2 で形式 "ハイブリッド" が提案されている
    When 形式を "現地のみ" に変更する
    Then 配信パッケージ費が見積りから削除される
    And 見積り合計が再計算される

  Scenario: STEP 3 企画書生成して確定
    Given STEP 3 の最終確認画面が表示されている
    When "企画書を生成して確定" を選択する
    And "完了" ボタンをクリックする
    Then イベントが status="planning" で作成される
    And 企画書 PDF が表示される

  Scenario: 下書き保存
    Given STEP 1 で基本情報を入力済み
    When "下書き保存" ボタンをクリックする
    Then イベントが status="draft" で保存される
    And イベント一覧に表示される

  # --- EVT-002: 会場AI提案 ---

  Scenario: 会場候補が空き状況付きで表示される
    Given AI 提案が生成された
    Then 会場候補が 3-5 件表示される
    And 各候補に空き状況（空きあり/要確認）が表示される
    And 各候補に選定理由が表示される

  Scenario: 条件に合う会場が 0 件
    Given 全会場が指定日程で予約済み
    When AI 提案を生成する
    Then "条件に合う会場が見つかりませんでした。手動で会場を選択してください" と表示される
    And 手動で会場を選択できる

  # --- EVT-003: 開催形式AI提案 ---

  Scenario: 形式変更時に見積り再計算
    Given 形式 "ハイブリッド" が提案されている
    And 見積りに配信パッケージ "フル配信+撮影" ¥180,000 が含まれている
    When 形式を "オンラインのみ" に変更する
    Then 見積りが再計算される
    And 会場費が除外される

  # --- EVT-004: 見積りAI生成 ---

  Scenario: 見積りPDF出力
    Given 見積りが生成済み
    When "PDF出力" ボタンをクリックする
    Then 3秒以内に PDF が表示される
    And 全見積り項目が PDF に含まれる

  # --- EVT-005: 企画書ドラフト生成 ---

  Scenario: 標準テンプレートで企画書生成
    Given イベントが status="planning" である
    When template="standard" で企画書を生成する
    Then 5セクション構成の企画書が表示される
    And "イベント概要", "開催概要", "概算予算", "スケジュール", "リスクと対策" が含まれる

  # --- 権限制御 ---

  Scenario: venue_sales によるイベント作成拒否
    Given ユーザーのロールが "venue_sales"
    When POST /api/v1/events でイベント作成を試行する
    Then 403 Forbidden が返される
    And エラーメッセージ "この操作を行う権限がありません" が返される

  Scenario: 他テナントのイベント編集拒否
    Given ユーザーがテナント "IYASAKA" に所属
    And イベント "外部セミナー" がテナント "OTHER_CORP" に属している
    When PATCH /api/v1/events/:id でイベント編集を試行する
    Then 403 Forbidden が返される

  # --- ステータス遷移 ---

  Scenario: planning 状態のイベント削除拒否
    Given イベントの status が "planning"
    When DELETE /api/v1/events/:id で削除を試行する
    Then 400 Bad Request が返される
    And エラーメッセージ "下書き状態のイベントのみ削除できます" が返される

  # --- AI障害時フォールバック ---

  Scenario: AI API タイムアウト時のフォールバック
    Given AI API が 10 秒以上応答しない
    When AI 提案を生成する
    Then "AI提案の生成に失敗しました。手動で入力を進めてください" と表示される
    And 手動入力モードに切り替わる
    And 会場・形式・見積りを手動で入力できる
```

---

## § 4. データ仕様 [CONTRACT]

### event テーブル（拡張）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | uuid | NO | gen_random_uuid() | イベントID |
| tenant_id | uuid | NO | - | テナントID（FK: tenants.id） |
| venue_id | uuid | YES | - | 会場ID（FK: venues.id） |
| title | varchar(200) | NO | - | イベントタイトル |
| description | text | YES | - | イベント概要 |
| event_type | enum | NO | 'seminar' | セミナー/プレゼン/社内/ワークショップ |
| format | enum | NO | 'onsite' | onsite/online/hybrid |
| status | enum | NO | 'draft' | draft→planning→confirmed→ready→in_progress→completed/cancelled |
| start_at | timestamp | YES | - | 開始日時 |
| end_at | timestamp | YES | - | 終了日時 |
| capacity_onsite | int | YES | - | 現地定員 |
| capacity_online | int | YES | - | オンライン定員 |
| budget_min | int | YES | - | 予算下限（円） |
| budget_max | int | YES | - | 予算上限（円） |
| streaming_url | varchar(500) | YES | - | 配信URL |
| portal_slug | varchar(100) | YES | - | 参加者ポータルslug |
| **goal** | text | YES | - | **イベントの目的（AI生成用）** |
| **target_audience** | text | YES | - | **ターゲット参加者（AI生成用）** |
| **date_candidates** | jsonb | YES | - | **日程候補リスト（AI提案用）** |
| **ai_suggestions** | jsonb | YES | - | **AI提案内容（会場・形式・理由）** |
| settings | jsonb | YES | {} | その他設定 |
| ai_generated | boolean | NO | false | AI生成フラグ |
| created_by | uuid | NO | - | 作成者ID（FK: users.id） |
| created_at | timestamp | NO | now() | 作成日時 |
| updated_at | timestamp | NO | now() | 更新日時 |

#### event_type enum
```sql
CREATE TYPE event_type AS ENUM ('seminar', 'presentation', 'internal', 'workshop');
```

#### format enum
```sql
CREATE TYPE event_format AS ENUM ('onsite', 'online', 'hybrid');
```

#### status enum
```sql
CREATE TYPE event_status AS ENUM (
  'draft',         -- 下書き
  'planning',      -- 企画中
  'confirmed',     -- 確定
  'ready',         -- 準備完了
  'in_progress',   -- 開催中
  'completed',     -- 完了
  'cancelled'      -- キャンセル
);
```

#### ai_suggestions JSONB構造
```typescript
{
  venues: [
    {
      venue_id: string,
      name: string,
      reason: string,           // 選定理由
      availability: boolean,    // 空き状況
      equipment_match: boolean  // 配信設備適合
    }
  ],
  format: {
    recommended: 'onsite' | 'online' | 'hybrid',
    reason: string
  },
  estimate_id?: string  // 生成された見積りID
}
```

#### date_candidates JSONB構造
```typescript
[
  {
    date: string,        // ISO8601形式
    start_time: string,  // HH:mm
    end_time: string,    // HH:mm
    priority: number     // 1-5（優先度）
  }
]
```

---

### estimate テーブル

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | uuid | NO | gen_random_uuid() | 見積りID |
| event_id | uuid | YES | - | イベントID（FK: events.id） |
| tenant_id | uuid | NO | - | テナントID（FK: tenants.id） |
| title | varchar(200) | NO | - | 見積りタイトル |
| items | jsonb | NO | '[]'::jsonb | 見積り項目リスト |
| total_amount | int | NO | 0 | 合計金額（円） |
| status | enum | NO | 'draft' | draft/sent/approved |
| generated_by | varchar(50) | YES | - | 生成元（'ai' or 'manual'） |
| created_by | uuid | NO | - | 作成者ID（FK: users.id） |
| created_at | timestamp | NO | now() | 作成日時 |
| updated_at | timestamp | NO | now() | 更新日時 |

#### estimate_status enum
```sql
CREATE TYPE estimate_status AS ENUM ('draft', 'sent', 'approved');
```

#### items JSONB構造
```typescript
[
  {
    category: 'venue' | 'streaming' | 'equipment' | 'other',
    name: string,
    quantity: number,
    unit_price: number,
    subtotal: number,
    note?: string
  }
]
```

---

### venue テーブル（参照のみ）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | uuid | NO | gen_random_uuid() | 会場ID |
| tenant_id | uuid | NO | - | テナントID（FK: tenants.id） |
| name | varchar(200) | NO | - | 会場名 |
| branch_name | varchar(100) | YES | - | 支店名 |
| address | text | YES | - | 住所 |
| capacity | int | YES | - | 収容人数 |
| equipment | jsonb | YES | {} | 設備情報 |
| wifi_info | jsonb | YES | {} | Wi-Fi情報 |

---

### streaming_package テーブル（参照のみ）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | uuid | NO | gen_random_uuid() | パッケージID |
| tenant_id | uuid | NO | - | テナントID（FK: tenants.id） |
| name | varchar(100) | NO | - | パッケージ名 |
| items | jsonb | NO | '[]'::jsonb | 含まれる項目リスト |
| base_price | int | NO | 0 | 基本料金（円） |

---

## § 5. API仕様 [CONTRACT]

### エンドポイント一覧

| Method | Path | 説明 | 認証 | 権限 |
|--------|------|------|------|------|
| POST | /api/v1/events | イベント作成 | 必須 | organizer, event_planner |
| GET | /api/v1/events | イベント一覧取得 | 必須 | 全ロール |
| GET | /api/v1/events/:id | イベント詳細取得 | 必須 | 全ロール |
| PATCH | /api/v1/events/:id | イベント更新 | 必須 | organizer, event_planner |
| DELETE | /api/v1/events/:id | イベント削除（論理） | 必須 | organizer, event_planner |
| POST | /api/v1/events/ai/suggest | AI提案生成 | 必須 | organizer, event_planner |
| GET | /api/v1/venues/:id/availability | 会場空き状況確認 | 必須 | 全ロール |
| POST | /api/v1/estimates/generate | 見積り自動生成 | 必須 | organizer, event_planner, venue_sales |
| GET | /api/v1/estimates/:id | 見積り詳細取得 | 必須 | 全ロール |
| PATCH | /api/v1/estimates/:id | 見積り更新 | 必須 | organizer, event_planner, venue_sales |
| POST | /api/v1/estimates/:id/pdf | 見積りPDF生成 | 必須 | 全ロール |
| POST | /api/v1/ai/generate/proposal | 企画書ドラフト生成 | 必須 | organizer, event_planner |

---

### POST /api/v1/events

イベントを作成する（AI提案結果を含む）。

#### Request

```typescript
{
  // 基本情報
  title: string,
  description?: string,
  event_type: 'seminar' | 'presentation' | 'internal' | 'workshop',
  format: 'onsite' | 'online' | 'hybrid',

  // AI生成用情報
  goal?: string,                    // イベントの目的
  target_audience?: string,         // ターゲット参加者
  capacity_onsite?: number,
  capacity_online?: number,
  budget_min?: number,
  budget_max?: number,
  date_candidates?: Array<{
    date: string,
    start_time: string,
    end_time: string,
    priority: number
  }>,

  // AI提案結果（STEP 2で選択後）
  venue_id?: string,
  start_at?: string,
  end_at?: string,
  ai_suggestions?: object,

  // その他
  settings?: object,
  ai_generated?: boolean
}
```

#### Response (201 Created)

```typescript
{
  id: string,
  tenant_id: string,
  venue_id: string | null,
  title: string,
  description: string | null,
  event_type: string,
  format: string,
  status: 'draft',
  start_at: string | null,
  end_at: string | null,
  capacity_onsite: number | null,
  capacity_online: number | null,
  budget_min: number | null,
  budget_max: number | null,
  goal: string | null,
  target_audience: string | null,
  date_candidates: object | null,
  ai_suggestions: object | null,
  ai_generated: boolean,
  created_by: string,
  created_at: string,
  updated_at: string
}
```

#### Error Responses

| Code | Message | 説明 |
|------|---------|------|
| 400 | Invalid request body | リクエストボディが不正 |
| 401 | Unauthorized | 認証エラー |
| 403 | Forbidden | 権限エラー |
| 404 | Venue not found | 会場が存在しない |
| 500 | Internal server error | サーバーエラー |

---

### POST /api/v1/events/ai/suggest

イベント基本情報からAI提案を生成する（STEP 1→STEP 2遷移時）。

#### Request

```typescript
{
  goal: string,                    // 必須: イベントの目的
  target_audience: string,         // 必須: ターゲット参加者
  capacity_onsite?: number,
  capacity_online?: number,
  budget_min?: number,
  budget_max?: number,
  date_candidates: Array<{        // 必須: 日程候補
    date: string,
    start_time: string,
    end_time: string,
    priority: number
  }>,
  event_type: 'seminar' | 'presentation' | 'internal' | 'workshop'
}
```

#### Response (200 OK)

```typescript
{
  venues: [
    {
      venue_id: string,
      name: string,
      branch_name: string | null,
      address: string,
      capacity: number,
      reason: string,              // AI選定理由
      availability: boolean,       // 空き状況
      equipment_match: boolean     // 配信設備適合
    }
  ],
  format: {
    recommended: 'onsite' | 'online' | 'hybrid',
    reason: string                 // AI提案理由
  },
  estimate: {
    id: string,
    title: string,
    items: Array<{
      category: string,
      name: string,
      quantity: number,
      unit_price: number,
      subtotal: number
    }>,
    total_amount: number
  },
  suggested_title?: string,        // タイトル案
  suggested_description?: string   // 概要文案
}
```

#### AI Tool Calling

このエンドポイントは内部で以下のAI Toolsを呼び出す:

```typescript
// Tool 1: search_available_venues
{
  name: "search_available_venues",
  description: "日程・規模・配信条件から会場候補を検索",
  parameters: {
    date_range: { start: string, end: string },
    min_capacity: number,
    requires_streaming: boolean,
    budget_max?: number
  }
}

// Tool 2: suggest_event_format
{
  name: "suggest_event_format",
  description: "ターゲット・規模から開催形式を提案",
  parameters: {
    target_audience: string,
    capacity_onsite: number,
    capacity_online: number,
    event_type: string
  }
}

// Tool 3: generate_estimate
{
  name: "generate_estimate",
  description: "会場・形式から概算見積りを生成",
  parameters: {
    venue_id: string,
    format: string,
    capacity_onsite: number,
    capacity_online: number,
    streaming_package?: string
  }
}
```

---

### GET /api/v1/venues/:id/availability

会場の空き状況を確認する。

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| start_date | string | YES | 確認開始日（YYYY-MM-DD） |
| end_date | string | YES | 確認終了日（YYYY-MM-DD） |

#### Response (200 OK)

```typescript
{
  venue_id: string,
  availability: Array<{
    date: string,              // YYYY-MM-DD
    available_slots: Array<{
      start_time: string,      // HH:mm
      end_time: string,        // HH:mm
      available: boolean
    }>
  }>
}
```

---

### POST /api/v1/estimates/generate

見積りを自動生成する。

#### Request

```typescript
{
  event_id?: string,              // イベントIDがあれば紐付け
  venue_id: string,
  format: 'onsite' | 'online' | 'hybrid',
  capacity_onsite?: number,
  capacity_online?: number,
  streaming_package_id?: string,  // 配信パッケージ選択
  additional_items?: Array<{      // 追加項目
    category: string,
    name: string,
    quantity: number,
    unit_price: number
  }>
}
```

#### Response (201 Created)

```typescript
{
  id: string,
  event_id: string | null,
  tenant_id: string,
  title: string,
  items: Array<{
    category: string,
    name: string,
    quantity: number,
    unit_price: number,
    subtotal: number,
    note?: string
  }>,
  total_amount: number,
  status: 'draft',
  generated_by: 'ai',
  created_by: string,
  created_at: string,
  updated_at: string
}
```

---

### POST /api/v1/ai/generate/proposal

稟議用企画書ドラフトを生成する。

#### Request

```typescript
{
  event_id: string,
  template?: 'standard' | 'detailed',  // デフォルト: 'standard'
  include_estimate?: boolean           // デフォルト: true
}
```

#### Response (200 OK)

```typescript
{
  title: string,
  sections: Array<{
    heading: string,
    content: string
  }>,
  pdf_url?: string,                    // PDF生成完了時のURL
  markdown: string                     // マークダウン形式
}
```

#### 企画書セクション構成

```
1. イベント概要
   - 目的
   - ターゲット
   - 期待効果

2. 開催概要
   - 日時・会場
   - 開催形式
   - 定員

3. 概算予算
   - 会場費
   - 配信費
   - その他
   - 合計

4. スケジュール
   - 企画〜準備のマイルストーン

5. リスクと対策
   - 想定リスク
   - 対応策
```

---

## § 6. UI仕様 [DETAIL]

### 画面一覧

| 画面ID | 画面名 | パス | 説明 |
|--------|--------|------|------|
| EVT-S01 | イベント一覧 | /events | イベント一覧表示 |
| EVT-S02 | イベント作成ウィザード | /events/new | 3ステップのイベント作成 |
| EVT-S03 | イベント詳細 | /events/:id | イベント詳細・編集 |
| EVT-S04 | 見積り詳細 | /estimates/:id | 見積り表示・編集 |
| EVT-S05 | 企画書プレビュー | /events/:id/proposal | 企画書プレビュー・PDF出力 |

---

### EVT-S02: イベント作成ウィザード

#### レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ ヘッダー: 新規イベント作成                                  │
├─────────────────────────────────────────────────────────────┤
│ [ステップインジケーター]                                    │
│  ① 基本情報 → ② AI提案 → ③ 確認                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [STEP 1 or STEP 2 or STEP 3 のコンテンツ]                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [戻る] [下書き保存]                          [次へ/完了] │
└─────────────────────────────────────────────────────────────┘
```

#### STEP 1: 基本情報入力

```
┌─────────────────────────────────────────────────────────────┐
│ イベントの基本情報を入力してください                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ イベント種別 *                                              │
│ [ ] セミナー  [ ] プレゼンテーション  [ ] 社内イベント    │
│ [ ] ワークショップ                                          │
│                                                             │
│ イベントの目的 *                                            │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 例: 新製品の認知度向上とリード獲得                      │   │
│ │                                                         │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ ターゲット参加者 *                                          │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 例: 製造業の経営者・IT責任者（30-50代）                 │   │
│ │                                                         │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ 想定参加者数 *                                              │
│ 現地: [   50   ] 名  オンライン: [  100   ] 名           │
│                                                             │
│ 予算範囲                                                    │
│ [  100,000  ] 円 〜 [  300,000  ] 円                      │
│                                                             │
│ 日程候補 * （複数選択可・優先順位付け）                     │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 1. 2026-03-15 (金) 14:00-16:00  [優先度: 高]          │   │
│ │ 2. 2026-03-18 (月) 10:00-12:00  [優先度: 中]          │   │
│ │ [+ 候補を追加]                                          │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                   [AI提案を生成]          │
└─────────────────────────────────────────────────────────────┘
```

#### STEP 2: AI提案確認・調整

```
┌─────────────────────────────────────────────────────────────┐
│ AIがイベント内容を分析しました                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 推奨開催形式                                                │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ [●] ハイブリッド                                        │   │
│ │ 理由: ターゲットが製造業経営者で遠方参加が多いため、    │   │
│ │       オンライン参加も可能なハイブリッド形式を推奨      │   │
│ │                                                         │   │
│ │ [ ] 現地のみ  [ ] オンラインのみ                       │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ 会場候補 (空き状況確認済み)                                 │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ [●] 東京本社 セミナールームA (収容: 80名) ✓空きあり    │   │
│ │     理由: 配信設備完備・アクセス良好・規模適合         │   │
│ │                                                         │   │
│ │ [ ] 大阪支店 会議室B (収容: 60名) ✓空きあり           │   │
│ │     理由: 西日本からのアクセス良好                     │   │
│ │                                                         │   │
│ │ [ ] 横浜会場 イベントホール (収容: 120名) △要確認      │   │
│ │     理由: 大規模対応可能だが配信設備要追加             │   │
│ └─────────────────────────────────────────────────────┘   │
│ [別の会場を検索]                                            │
│                                                             │
│ 概算見積り                                                  │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 【会場費】                                              │   │
│ │ ・セミナールームA 利用料  ¥50,000                      │   │
│ │                                                         │   │
│ │ 【配信パッケージ】                                      │   │
│ │ ・フル配信+撮影            ¥180,000                     │   │
│ │   (機材・スタッフ・配信プラットフォーム含む)           │   │
│ │                                                         │   │
│ │ ・資料共有システム         ¥20,000                      │   │
│ │                                                         │   │
│ │ ─────────────────────────────────────               │   │
│ │ 合計: ¥250,000 (税抜)                                  │   │
│ └─────────────────────────────────────────────────────┘   │
│ [項目を追加] [単価を編集]                                  │
│                                                             │
│ タイトル案                                                  │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 製造業DXセミナー：生産性向上の最新事例                  │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│                           [戻る] [下書き保存] [次へ]      │
└─────────────────────────────────────────────────────────────┘
```

#### STEP 3: 確認・登録

```
┌─────────────────────────────────────────────────────────────┐
│ 最終確認                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ イベント情報                                                │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ タイトル: 製造業DXセミナー：生産性向上の最新事例       │   │
│ │ 種別: セミナー                                          │   │
│ │ 形式: ハイブリッド                                      │   │
│ │ 会場: 東京本社 セミナールームA                         │   │
│ │ 日時: 2026-03-15 (金) 14:00-16:00                      │   │
│ │ 定員: 現地50名 / オンライン100名                       │   │
│ │ 予算: ¥250,000 (概算)                                  │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ 次のアクション                                              │
│ [ ] 下書きとして保存 (status: draft)                       │
│ [●] 企画書を生成して確定 (status: planning)                │
│                                                             │
│                       [戻る] [下書き保存] [完了]          │
└─────────────────────────────────────────────────────────────┘
```

---

### EVT-S03: イベント詳細

```
┌─────────────────────────────────────────────────────────────┐
│ 製造業DXセミナー：生産性向上の最新事例                      │
│ [ステータス: 企画中] [編集] [企画書を見る] [見積りPDF]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 基本情報                                                    │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 種別: セミナー                                          │   │
│ │ 形式: ハイブリッド                                      │   │
│ │ 会場: 東京本社 セミナールームA                         │   │
│ │ 日時: 2026-03-15 (金) 14:00-16:00                      │   │
│ │ 定員: 現地50名 / オンライン100名                       │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ イベントの目的                                              │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 新製品の認知度向上とリード獲得                          │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ ターゲット参加者                                            │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 製造業の経営者・IT責任者（30-50代）                     │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ 見積り                                                      │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 合計: ¥250,000 (税抜)                                  │   │
│ │ [見積り詳細を見る]                                      │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ AI提案内容                                                  │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 推奨形式: ハイブリッド                                  │   │
│ │ 理由: ターゲットが製造業経営者で遠方参加が多いため...  │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ [企画を確定] [削除]                                        │
└─────────────────────────────────────────────────────────────┘
```

---

### EVT-S05: 企画書プレビュー

```
┌─────────────────────────────────────────────────────────────┐
│ 企画書プレビュー                          [PDF出力] [閉じる]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │                                                         │   │
│ │          イベント企画書                                 │   │
│ │                                                         │   │
│ │ 製造業DXセミナー：生産性向上の最新事例                  │   │
│ │                                                         │   │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━          │   │
│ │                                                         │   │
│ │ 1. イベント概要                                         │   │
│ │                                                         │   │
│ │ 【目的】                                                │   │
│ │ 新製品の認知度向上とリード獲得                          │   │
│ │                                                         │   │
│ │ 【ターゲット】                                          │   │
│ │ 製造業の経営者・IT責任者（30-50代）                     │   │
│ │                                                         │   │
│ │ 【期待効果】                                            │   │
│ │ ・新製品への理解促進                                    │   │
│ │ ・見込み顧客50社以上の獲得                             │   │
│ │                                                         │   │
│ │ 2. 開催概要                                             │   │
│ │ ...                                                     │   │
│ │                                                         │   │
│ └─────────────────────────────────────────────────────┘   │
│ [スクロールして全体を確認]                                  │
│                                                             │
│                           [編集] [PDF出力] [閉じる]       │
└─────────────────────────────────────────────────────────────┘
```

---

## § 7. ビジネスルール [DETAIL]

### BR-EVT-001: イベントステータス遷移

| 現在ステータス | 遷移可能先 | 条件 |
|---------------|-----------|------|
| draft | planning | 必須項目入力完了 |
| draft | cancelled | いつでも |
| planning | confirmed | 会場・日程確定 |
| planning | cancelled | いつでも |
| confirmed | ready | 開催1週間前 |
| confirmed | cancelled | 開催3日前まで |
| ready | in_progress | 開催当日・開始時刻 |
| in_progress | completed | 終了時刻経過 |

### BR-EVT-002: AI提案生成ルール

| 項目 | ルール |
|------|--------|
| 会場候補数 | 3-5件を提案 |
| 空き状況確認 | 全候補をavailability APIで確認 |
| 配信設備確認 | format='online' or 'hybrid'の場合、wifi_info/equipmentを確認 |
| 見積り自動生成 | 会場費+配信パッケージを自動計算 |
| タイトル案生成 | event_type + goal から自動生成 |

### BR-EVT-003: 見積り計算ルール

| カテゴリ | 計算ロジック |
|---------|-------------|
| 会場費 | venue固定料金（capacity考慮なし・MVP簡易版） |
| 配信パッケージ費 | streaming_package.base_price |
| 機材費 | format='hybrid'の場合、追加機材費を加算 |
| 合計 | SUM(各カテゴリ) |

#### 配信パッケージ種類（MVP標準）

| パッケージ名 | 基本料金 | 含まれる項目 |
|-------------|---------|-------------|
| 基本配信 | ¥80,000 | 配信プラットフォーム・基本機材・オペレーター1名 |
| フル配信+撮影 | ¥180,000 | 基本配信 + カメラ2台・音響強化・録画 |
| フル配信+撮影+編集 | ¥280,000 | フル配信+撮影 + 当日編集・アーカイブ配信 |

### BR-EVT-004: 企画書生成ルール

| セクション | 生成ロジック |
|-----------|-------------|
| イベント概要 | goal, target_audience, event_type から生成 |
| 開催概要 | venue, format, start_at, capacity から生成 |
| 概算予算 | estimate.items を表形式で表示 |
| スケジュール | 開催日から逆算して企画〜準備のマイルストーンを生成 |
| リスクと対策 | event_type, format に応じた想定リスクをAI生成 |

### BR-EVT-005: 権限制御

| アクション | organizer | event_planner | venue_sales | other |
|-----------|-----------|---------------|-------------|-------|
| イベント作成 | ○（自組織） | ○（全組織） | × | × |
| イベント編集 | ○（自組織） | ○（全組織） | × | × |
| イベント削除 | ○（自組織・draft時） | ○（全組織・draft時） | × | × |
| 見積り作成 | ○ | ○ | ○ | × |
| 見積り編集 | ○ | ○ | ○ | × |
| 企画書生成 | ○ | ○ | × | × |

### BR-EVT-006: AI生成失敗時のフォールバック

| 失敗ケース | フォールバック動作 |
|-----------|------------------|
| 会場候補が0件 | 「条件に合う会場が見つかりませんでした。手動で会場を選択してください」と表示 |
| AI API タイムアウト | 「AI提案の生成に失敗しました。手動で入力を進めてください」と表示 |
| 見積り生成失敗 | デフォルト見積り（会場費のみ）を表示 |
| 企画書生成失敗 | 「企画書の生成に失敗しました。後ほど再試行してください」と表示 |

---

## § 8. 非機能要件 [DETAIL]

### パフォーマンス

| 項目 | 目標値 |
|------|--------|
| AI提案生成時間 | 3-5秒以内 |
| 企画書PDF生成時間 | 5秒以内 |
| 見積りPDF生成時間 | 3秒以内 |
| イベント一覧表示 | 1秒以内 |

### 可用性

| 項目 | 目標値 |
|------|--------|
| 稼働率 | 99.5%以上 |
| AI API障害時 | フォールバックで手動入力継続可能 |

### セキュリティ

| 項目 | 対策 |
|------|------|
| データ分離 | tenant_id による完全分離 |
| アクセス制御 | ロールベース権限チェック |
| AI入力検証 | 入力文字数制限（goal: 1000文字、target_audience: 500文字） |
| PDF出力 | 一時URLで5分間のみアクセス可能 |

---

## § 9. 制約・前提 [DETAIL]

### 技術的制約

| 制約 | 内容 |
|------|------|
| AI API | Claude (primary) + GPT (fallback) |
| PDF生成 | サーバーサイドでPuppeteerを使用 |
| 会場空き確認 | MVP版は簡易実装（手動登録データのみ） |
| 配信パッケージ | 固定3種類のみ（カスタマイズは将来） |

### ビジネス制約

| 制約 | 内容 |
|------|------|
| 見積り有効期限 | 生成日から30日間 |
| 企画書テンプレート | 標準・詳細の2種類のみ |
| 日程候補数 | 最大5件まで |
| AI提案会場数 | 3-5件 |

### 前提条件

| 前提 | 内容 |
|------|------|
| 会場マスタ | 事前に venue テーブルに登録済み |
| 配信パッケージマスタ | 事前に streaming_package テーブルに登録済み |
| ユーザー認証 | Better Auth による認証済み |
| 組織設定 | tenant_id が確定している |

---

## § 10. テストケース [CONTRACT]

### TC-EVT-001: イベント作成ウィザード（正常系）

| # | テストケース | 手順 | 期待結果 |
|---|-------------|------|---------|
| 1 | STEP 1入力完了 | 全必須項目を入力し「AI提案を生成」ボタンをクリック | STEP 2に遷移し、3-5秒以内にAI提案が表示される |
| 2 | STEP 2で会場変更 | 別の会場候補を選択 | 見積りが自動再計算される |
| 3 | STEP 2で形式変更 | 「ハイブリッド」→「現地のみ」に変更 | 配信パッケージが見積りから削除される |
| 4 | STEP 3で確定 | 「企画書を生成して確定」を選択し「完了」をクリック | status='planning'でイベントが作成され、企画書PDFが表示される |
| 5 | 下書き保存 | STEP 1で「下書き保存」をクリック | status='draft'でイベントが保存される |

### TC-EVT-002: AI提案生成（異常系）

| # | テストケース | 手順 | 期待結果 |
|---|-------------|------|---------|
| 1 | 会場候補0件 | 条件に合う会場がない日程を入力 | 「条件に合う会場が見つかりませんでした」とエラー表示 |
| 2 | AI APIタイムアウト | AI API応答が10秒超過 | 「AI提案の生成に失敗しました」とエラー表示、手動入力で継続可能 |
| 3 | 日程候補が空 | date_candidates を空で送信 | 400エラー「日程候補は必須です」 |

### TC-EVT-003: 見積り生成（正常系）

| # | テストケース | 手順 | 期待結果 |
|---|-------------|------|---------|
| 1 | 基本配信パッケージ選択 | format='online', 基本配信パッケージ選択 | 会場費+¥80,000で見積り生成 |
| 2 | フル配信+撮影パッケージ選択 | format='hybrid', フル配信+撮影パッケージ選択 | 会場費+¥180,000で見積り生成 |
| 3 | 項目追加 | 「音響機材レンタル」を手動追加 | 見積り合計が再計算される |
| 4 | 見積りPDF出力 | 「PDF出力」ボタンをクリック | 3秒以内にPDFが表示される |

### TC-EVT-004: 企画書生成（正常系）

| # | テストケース | 手順 | 期待結果 |
|---|-------------|------|---------|
| 1 | 標準テンプレート | template='standard'で生成 | 5セクション構成の企画書が表示される |
| 2 | 詳細テンプレート | template='detailed'で生成 | 標準+追加セクション（想定QA等）が表示される |
| 3 | 企画書PDF出力 | 「PDF出力」ボタンをクリック | 5秒以内にPDFが生成される |

### TC-EVT-005: 権限制御

| # | テストケース | 手順 | 期待結果 |
|---|-------------|------|---------|
| 1 | organizer作成 | organizerロールでイベント作成 | 自組織のイベントが作成される |
| 2 | event_planner作成 | event_plannerロールで別組織のイベント作成 | クライアント組織のイベントが作成される |
| 3 | venue_sales作成試行 | venue_salesロールでイベント作成試行 | 403エラー「権限がありません」 |
| 4 | 他組織イベント編集 | organizerが他組織のイベント編集試行 | 403エラー「権限がありません」 |

### TC-EVT-006: 会場空き確認

| # | テストケース | 手順 | 期待結果 |
|---|-------------|------|---------|
| 1 | 空きあり会場 | 空き日程で会場候補表示 | ✓空きありアイコンが表示される |
| 2 | 空きなし会場 | 予約済み日程で会場候補表示 | △要確認アイコンが表示される |
| 3 | 空き確認API失敗 | availability API障害時 | 「空き状況を確認できませんでした」と表示 |

### TC-EVT-007: イベントステータス遷移

| # | テストケース | 手順 | 期待結果 |
|---|-------------|------|---------|
| 1 | draft→planning | draftイベントで「企画を確定」ボタンをクリック | status='planning'に遷移 |
| 2 | planning→confirmed | planningイベントで会場・日程確定 | status='confirmed'に遷移 |
| 3 | confirmed→cancelled | confirmedイベントで「キャンセル」ボタンをクリック（開催3日前） | status='cancelled'に遷移 |
| 4 | confirmed→cancelled失敗 | confirmedイベントで「キャンセル」ボタンをクリック（開催2日前） | 400エラー「キャンセル期限を過ぎています」 |

---

## § 11. マイルストーン [DETAIL]

### フェーズ1: MVP基本実装（2週間）

| タスク | 工数 | 担当 | 期限 |
|--------|------|------|------|
| DBスキーマ作成（event, estimate拡張） | 2日 | TBD | TBD |
| イベント作成ウィザードUI実装 | 3日 | TBD | TBD |
| AI提案生成API実装（会場・形式・見積り） | 4日 | TBD | TBD |
| 会場空き確認API実装（簡易版） | 1日 | TBD | TBD |
| 見積りPDF生成実装 | 2日 | TBD | TBD |
| 単体テスト作成 | 2日 | TBD | TBD |

### フェーズ2: 企画書生成（1週間）

| タスク | 工数 | 担当 | 期限 |
|--------|------|------|------|
| 企画書生成AI実装 | 3日 | TBD | TBD |
| 企画書PDF出力実装 | 2日 | TBD | TBD |
| 統合テスト | 2日 | TBD | TBD |

### フェーズ3: 統合・E2Eテスト（3日）

| タスク | 工数 | 担当 | 期限 |
|--------|------|------|------|
| E2Eテスト作成 | 2日 | TBD | TBD |
| バグ修正 | 1日 | TBD | TBD |

---

## § 12. 参照 [CORE]

### 関連仕様書

| ドキュメント | パス | 説明 |
|-------------|------|------|
| PRD | docs/requirements/SSOT-1_PRD.md | 全体要件定義 |
| データモデル | docs/design/core/SSOT-4_DATA_MODEL.md | event, estimate, venue, streaming_package テーブル |
| API規約 | docs/design/core/SSOT-3_API_CONTRACT.md | RESTful API設計規約 |
| 横断的関心事 | docs/design/core/SSOT-5_CROSS_CUTTING.md | AIサービス・エラーハンドリング |
| 認証 | docs/design/features/common/AUTH-001_login.md | 認証前提 |
| 組織管理 | docs/design/features/common/AUTH-003_organization.md | tenant分離 |

### 外部リソース

| リソース | URL | 説明 |
|---------|-----|------|
| Vercel AI SDK | https://sdk.vercel.ai/ | AI統合SDK |
| Claude API | https://docs.anthropic.com/ | Claude API仕様 |
| Drizzle ORM | https://orm.drizzle.team/ | ORM仕様 |
| Nuxt UI v3 | https://ui3.nuxt.dev/ | UIコンポーネント |

---

## § 13. 未決定事項・制約 [DETAIL]

### 13.1 未決定事項（TBD）

| # | 項目 | 層 | 理由 | デフォルト案 |
|---|------|-----|------|------------|
| 1 | AI提案の再生成回数制限 | CONTRACT | コスト管理の方針未定 | 1イベントあたり最大5回/日 |
| 2 | 見積り有効期限の延長可否 | DETAIL | ビジネス判断が必要 | 30日固定（延長不可） |
| 3 | 企画書テンプレートのカスタマイズ範囲 | DETAIL | ユーザーニーズ未調査 | 標準/詳細の2種類のみ |
| 4 | AI生成コンテンツの著作権表示 | DETAIL | 法務確認が必要 | 「AI生成」フラグのみ |
| 5 | 外部カレンダー（Google Calendar等）との連携 | CORE | Phase 2 以降の検討事項 | MVP対象外 |

### 13.2 前提条件

- PostgreSQL 16 が稼働中
- Better Auth による認証が完了済み
- venue テーブルに会場マスタが事前登録済み
- streaming_package テーブルに配信パッケージマスタが事前登録済み
- Claude API キー（ANTHROPIC_API_KEY）が環境変数に設定済み
- tenant_id によるデータ分離が AUTH-003 で実装済み

### 13.3 制約事項

- AI提案はClaude (primary) + GPT (fallback) の2段構成だが、MVP では Claude のみ実装
- PDF生成はサーバーサイドで Puppeteer を使用（ブラウザレンダリング方式）
- 会場空き確認は MVP 版では簡易実装（手動登録データのみ、外部 API 連携なし）
- 配信パッケージは固定3種類のみ（カスタムパッケージは将来対応）
- 日程候補は最大5件まで
- AI提案で返す会場候補は3-5件
- 見積り金額は税抜表示（税込計算は Phase 2）
- 企画書テンプレートは標準・詳細の2種類のみ

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 担当 |
|------|-----------|---------|------|
| 2026-02-09 | 1.0 | 初版作成 | Claude |
| 2026-02-09 | 1.1 | §3-E〜§3-H 追加（入出力例10件、境界値13項目、例外レスポンス14件、Gherkin 16シナリオ）。§13 未決定事項・制約追加。Gold Standard化 | Claude |

---

**END OF DOCUMENT**
