# EVT-020/021: 登壇者情報管理

## メタ情報

| 項目 | 内容 |
|------|------|
| 機能ID | EVT-020, EVT-021 |
| 機能名 | 登壇者情報フォーム自動生成・回収・ステータス管理 |
| カテゴリ | イベント管理 - ステークホルダー・ワークフロー |
| 優先度 | P0 |
| ステータス | Draft |
| 作成日 | 2026-02-09 |
| 最終更新日 | 2026-02-09 |
| ベース | SSOT-1 §13.3 |

---

## 1. 概要

### 1.1 機能の目的（1-2文）

イベント主催者が登壇者情報を効率的に収集するための専用フォームを自動生成し、登壇者が入力した情報（氏名・肩書き・プロフィール・顔写真・使用機材・登壇形式・資料ファイル）をイベントカードに自動反映しながら、提出状況（未提出/提出済/確認済）をリアルタイムで管理する機能。

### 1.2 ユーザーストーリー

```
As a イベント主催者,
I want to 登壇者情報フォームを自動生成し、URLを登壇者にメール送信したい,
so that 登壇者情報を手作業で収集することなく、効率的に情報を集約できる.

As a 登壇者,
I want to 専用フォームから自分のプロフィール・顔写真・資料をアップロードしたい,
so that イベントページに自分の情報が正確に表示され、事前に資料も共有できる.
```

### 1.3 スコープ

**In Scope（この機能でやること）**:
- イベント作成時の登壇者情報フォーム自動生成
- 登壇者情報フォーム公開URL発行
- 登壇者へのフォームURLメール送信
- 登壇者による情報入力・ファイルアップロード（認証不要）
- 資料ファイルアップロード（PDF, PPT, PPTX, JPG, PNG / 最大50MB）
- 提出状況（pending/submitted/confirmed）管理
- 主催者による登壇者一覧・ステータス確認
- 主催者による提出内容確認・承認
- 主催者による登壇者情報の手動編集
- 登壇者の並び順管理（sort_order）

**Out of Scope（この機能ではやらないこと）**:
- AI による登壇者紹介文生成（EVT-022 で対応）
- 登壇者への自動リマインド（EVT-024 で対応）
- 複数イベント登壇者の情報再利用
- 登壇者同士のチャット機能
- 発表資料のバージョン管理

---

## 2. 受入条件（Acceptance Criteria）

### 2.1 正常系（EVT-020）

| # | 条件 | 検証方法 |
|---|------|---------|
| AC-001 | イベント作成時、登壇者情報フォームが自動生成される | E2Eテスト |
| AC-002 | 生成されたフォームに一意のURLが割り当てられる（例: `/speaker-form/:token`） | ユニットテスト |
| AC-003 | フォームURLを登壇者にメール送信できる | 統合テスト |
| AC-004 | 登壇者がフォームにアクセスし、情報入力・送信できる（認証不要） | E2Eテスト |
| AC-005 | 登壇者が入力した情報がイベントカードに自動反映される | 統合テスト |

### 2.2 正常系（EVT-021）

| # | 条件 | 検証方法 |
|---|------|---------|
| AC-011 | 主催者が登壇者一覧で提出状況を確認できる（未提出/提出済/確認済） | E2Eテスト |
| AC-012 | 登壇者が情報を送信すると、ステータスが `pending` → `submitted` に変わる | 統合テスト |
| AC-013 | 主催者が提出内容を確認し、承認すると `submitted` → `confirmed` に変わる | E2Eテスト |
| AC-014 | 登壇者が資料ファイル（PDF, PPT, PPTX, JPG, PNG / 最大50MB）をアップロードできる | E2Eテスト |
| AC-015 | アップロードされた資料URLが `speaker.materials_url` に保存される | 統合テスト |

### 2.3 異常系

| # | 条件 | 検証方法 |
|---|------|---------|
| AC-101 | 不正なトークンでフォームアクセス → 404エラー | E2Eテスト |
| AC-102 | 氏名が空の場合、エラーメッセージ「氏名を入力してください」 | ユニットテスト |
| AC-103 | 50MBを超えるファイルアップロード → エラーメッセージ「ファイルサイズは50MB以下にしてください」 | E2Eテスト |
| AC-104 | 非対応形式のファイル（.exe等）アップロード → エラーメッセージ「対応していない形式です」 | E2Eテスト |
| AC-105 | 同じ登壇者が同じフォームURLから2回目の送信 → 上書き更新（重複作成しない） | 統合テスト |

### 2.4 エッジケース

| # | 条件 | 検証方法 |
|---|------|---------|
| AC-201 | 主催者が登壇者を削除 → フォームURLは無効化される | 統合テスト |
| AC-202 | イベントキャンセル後に登壇者がフォームアクセス → 「イベントはキャンセルされました」表示 | E2Eテスト |
| AC-203 | 登壇者が送信後、主催者が手動で情報を編集 → 編集内容が保持される | 統合テスト |
| AC-204 | 画像ファイル（JPG, PNG）アップロード → `photo_url` に保存、サムネイル生成 | 統合テスト |
| AC-205 | 顔写真が未アップロードの場合、デフォルトアバター画像を表示 | E2Eテスト |

---

## 3. 機能要件（Functional Requirements）

### [CORE] 3.1 フォーム自動生成

| FR-ID | 要件 | 詳細 |
|-------|------|------|
| FR-001 | イベント作成時にフォーム自動生成 | イベント作成時、`speaker` テーブルに空レコードは作成しない。登壇者追加時に個別フォームURL生成 |
| FR-002 | 一意のフォームトークン生成 | ULID ベースのトークンを生成し、`speaker.id` と紐付け |
| FR-003 | 公開フォームURL | `/speaker-form/:token` で認証なしでアクセス可能 |
| FR-004 | フォーム項目 | 氏名(必須)、肩書き、所属、プロフィール、顔写真、登壇タイトル、登壇開始時刻、持ち時間、登壇形式(onsite/online)、資料ファイル |

### [CORE] 3.2 メール送信

| FR-ID | 要件 | 詳細 |
|-------|------|------|
| FR-011 | フォームURLメール送信 | 主催者が「メール送信」ボタンクリックでメールテンプレートに基づき送信 |
| FR-012 | メールテンプレート | 件名: 「【{イベント名}】登壇者情報のご提出のお願い」、本文にフォームURL・締め切り・注意事項を含む |
| FR-013 | 送信記録 | メール送信日時を記録（将来的にリマインドで活用） |

### [CORE] 3.3 情報入力・送信

| FR-ID | 要件 | 詳細 |
|-------|------|------|
| FR-021 | 認証不要フォーム | トークンベースでアクセス、ログイン不要 |
| FR-022 | リアルタイムバリデーション | 氏名必須、ファイルサイズ・形式チェック |
| FR-023 | ファイルアップロード | 顔写真（photo_url）、資料（materials_url）を別々にアップロード |
| FR-024 | 送信処理 | 送信時に `submission_status` を `pending` → `submitted` に更新 |
| FR-025 | 上書き更新 | 同じトークンから2回目の送信時は既存レコードを UPDATE |

### [CORE] 3.4 ステータス管理

| FR-ID | 要件 | 詳細 |
|-------|------|------|
| FR-031 | ステータス定義 | `pending`: 未提出、`submitted`: 提出済、`confirmed`: 確認済 |
| FR-032 | 主催者一覧表示 | 登壇者一覧で各登壇者のステータスを色分け表示（pending: 灰色、submitted: 黄色、confirmed: 緑色） |
| FR-033 | 承認アクション | 主催者が「確認済みにする」ボタンクリックで `submitted` → `confirmed` |
| FR-034 | 未提出者フィルタ | 登壇者一覧で「未提出のみ表示」フィルタ提供 |

### [CONTRACT] 3.5 API要件

| FR-ID | 要件 | 詳細 |
|-------|------|------|
| FR-041 | GET /api/v1/events/:eid/speakers | 登壇者一覧取得（主催者用、認証必須） |
| FR-042 | POST /api/v1/events/:eid/speakers | 登壇者追加（フォームトークン生成、主催者用） |
| FR-043 | PATCH /api/v1/speakers/:id | 登壇者情報更新（主催者・登壇者本人） |
| FR-044 | DELETE /api/v1/speakers/:id | 登壇者削除（主催者のみ） |
| FR-045 | POST /api/v1/speakers/:id/materials | 資料アップロード（登壇者） |
| FR-046 | GET /api/v1/speaker-form/:token | フォーム情報取得（認証不要） |
| FR-047 | POST /api/v1/speaker-form/:token | フォーム送信（認証不要） |
| FR-048 | POST /api/v1/speakers/:id/send-form-email | フォームURLメール送信（主催者のみ） |

### [DETAIL] 3.6 ファイルアップロード

| FR-ID | 要件 | 詳細 |
|-------|------|------|
| FR-051 | 対応形式 | 顔写真: JPG, PNG / 資料: PDF, PPT, PPTX, JPG, PNG |
| FR-052 | 最大サイズ | 50MB / ファイル |
| FR-053 | ストレージ | ファイルは `/uploads/speakers/:event_id/:speaker_id/` に保存 |
| FR-054 | サムネイル生成 | 顔写真は 200x200px のサムネイル自動生成 |
| FR-055 | ファイル削除 | 登壇者削除時、関連ファイルも物理削除 |

### [CONTRACT] 3-E 入出力例

| # | 操作 | リクエスト | レスポンス |
|---|------|-----------|-----------|
| 1 | 登壇者作成 | `POST /api/v1/events/:eid/speakers` `{ "name": "山田 太郎", "email": "yamada@example.com" }` | `201 Created` `{ "data": { "id": "01HSPK...", "submission_status": "pending", "form_url": "https://example.com/speaker-form/01HTOKEN..." } }` |
| 2 | 登壇者一覧取得 | `GET /api/v1/events/:eid/speakers?status=pending&sort=sort_order&order=asc` | `200 OK` `{ "data": [ { "id": "01HSPK...", "name": "山田 太郎", "submission_status": "pending", ... } ] }` |
| 3 | 登壇者詳細取得 | `GET /api/v1/speakers/:id` | `200 OK` `{ "data": { "id": "01HSPK...", "name": "山田 太郎", "title": "取締役CTO", "submission_status": "confirmed", ... } }` |
| 4 | 登壇者更新 | `PATCH /api/v1/speakers/:id` `{ "name": "山田 太郎（更新）", "submission_status": "confirmed" }` | `200 OK` `{ "data": { "id": "01HSPK...", "name": "山田 太郎（更新）", "updated_at": "2026-02-09T12:00:00Z" } }` |
| 5 | 登壇者削除 | `DELETE /api/v1/speakers/:id` | `200 OK` `{ "data": { "deleted": true } }` |
| 6 | 登壇者招待（メール送信） | `POST /api/v1/speakers/:id/send-form-email` `{ "email": "speaker@example.com" }` | `200 OK` `{ "data": { "email_sent": true, "sent_at": "2026-02-09T13:00:00Z" } }` |
| 7 | 公開フォーム取得 | `GET /api/v1/speaker-form/:token` | `200 OK` `{ "data": { "event": { "title": "AI活用セミナー", ... }, "speaker": { "id": "01HSPK...", ... } } }` |
| 8 | 公開フォーム送信 | `POST /api/v1/speaker-form/:token` `multipart/form-data (name, title, photo, ...)` | `200 OK` `{ "data": { "submission_status": "submitted" }, "message": "登壇者情報を受け付けました" }` |

### [CONTRACT] 3-F 境界値

| フィールド | 下限 | 上限 | 備考 |
|-----------|------|------|------|
| name | 1文字 | 100文字 | 必須。空文字不可 |
| bio | 0文字 | 2000文字 | 任意。空文字許容 |
| email | - | - | RFC 5322 準拠のメール形式 |
| company（organization） | 0文字 | 100文字 | 任意。空文字許容 |
| position（title） | 0文字 | 100文字 | 任意。空文字許容 |
| presentation_title | 0文字 | 500文字 | 任意 |
| duration_minutes | 1 | 240 | 任意。指定時は整数のみ |
| sort_order | 0 | 2147483647 | 整数（INTEGER） |
| photo ファイルサイズ | 1 byte | 50 MB | JPG, PNG のみ |
| materials ファイルサイズ | 1 byte | 50 MB | PDF, PPT, PPTX, JPG, PNG のみ |

### [CONTRACT] 3-G 例外レスポンス

| error.code | HTTPステータス | 発生条件 | レスポンス例 |
|-----------|--------------|---------|-------------|
| VALIDATION_ERROR | 400 | 必須フィールド未入力、形式不正、文字数超過 | `{ "error": { "code": "VALIDATION_ERROR", "message": "氏名を入力してください", "details": [{ "field": "name", "rule": "required" }] } }` |
| NOT_FOUND | 404 | 指定された登壇者ID/トークンが存在しない | `{ "error": { "code": "NOT_FOUND", "message": "登壇者が見つかりません" } }` |
| CONFLICT | 409 | 同一イベント内で同一メールアドレスの登壇者が既に存在する | `{ "error": { "code": "CONFLICT", "message": "この登壇者は既に登録されています" } }` |
| FORBIDDEN | 403 | 操作権限がない（例: 非主催者が削除を試行） | `{ "error": { "code": "FORBIDDEN", "message": "この操作を行う権限がありません" } }` |
| FILE_TOO_LARGE | 400 | ファイルサイズが50MBを超過 | `{ "error": { "code": "FILE_TOO_LARGE", "message": "ファイルサイズは50MB以下にしてください" } }` |
| UNSUPPORTED_FILE_TYPE | 400 | 非対応のファイル形式 | `{ "error": { "code": "UNSUPPORTED_FILE_TYPE", "message": "対応していない形式です" } }` |
| EVENT_CANCELLED | 410 | イベントがキャンセル済みの状態でフォームアクセス | `{ "error": { "code": "EVENT_CANCELLED", "message": "イベントはキャンセルされました" } }` |

### [CONTRACT] 3-H 受け入れテスト（Gherkin）

```gherkin
Feature: EVT-020/021 登壇者情報管理

  Scenario: 主催者が登壇者を追加する
    Given 主催者がイベント詳細ページにいる
    When 「登壇者追加」ボタンをクリックする
    And 氏名に「山田 太郎」、メールに「yamada@example.com」を入力する
    And 「追加」ボタンをクリックする
    Then 登壇者一覧に「山田 太郎」が追加される
    And ステータスが「未提出」（灰色）で表示される
    And フォームURLメールが送信される

  Scenario: 登壇者が公開フォームから情報を送信する
    Given 登壇者がフォームURL「/speaker-form/:token」にアクセスしている
    When 氏名に「山田 太郎」を入力する
    And 登壇形式で「現地登壇」を選択する
    And 「送信する」ボタンをクリックする
    Then 送信完了画面が表示される
    And 登壇者のステータスが「提出済」に更新される

  Scenario: 主催者が提出済みの登壇者を承認する
    Given 登壇者「山田 太郎」のステータスが「提出済」である
    When 主催者が「確認済みにする」ボタンをクリックする
    Then ステータスが「確認済」（緑色）に変わる

  Scenario: 登壇者が顔写真と資料をアップロードする
    Given 登壇者がフォームURL「/speaker-form/:token」にアクセスしている
    When 顔写真（JPG, 5MB）を選択する
    And 資料ファイル（PDF, 10MB）を選択する
    And 必須項目を入力して「送信する」ボタンをクリックする
    Then 顔写真が photo_url に保存される
    And サムネイル（200x200px）が生成される
    And 資料が materials_url に保存される

  Scenario: 50MBを超えるファイルをアップロードしようとする
    Given 登壇者がフォームURL「/speaker-form/:token」にアクセスしている
    When 51MBの顔写真を選択する
    Then エラーメッセージ「ファイルサイズは50MB以下にしてください」が表示される
    And フォームは送信されない

  Scenario: 無効なトークンでフォームにアクセスする
    Given 存在しないトークン「invalid-token」がある
    When 「/speaker-form/invalid-token」にアクセスする
    Then 404エラーページ「フォームが見つかりません」が表示される

  Scenario: キャンセル済みイベントのフォームにアクセスする
    Given イベントがキャンセル済みである
    When 登壇者がフォームURLにアクセスする
    Then 「イベントはキャンセルされました」バナーが表示される
    And フォームは入力不可になる

  Scenario: 登壇者が同じフォームURLから2回目の送信をする
    Given 登壇者が既に1回フォームを送信済みである
    When 同じフォームURLから再度情報を入力して送信する
    Then 既存の登壇者レコードが上書き更新される
    And 新しいレコードは作成されない
    And ステータスが「提出済」に更新される

  Scenario: 主催者が登壇者を削除する
    Given 登壇者「山田 太郎」が一覧に存在する
    When 主催者が操作メニューから「削除」を選択する
    Then 登壇者「山田 太郎」が一覧から削除される
    And 関連するフォームURLが無効化される
    And アップロードされたファイルが物理削除される

  Scenario: 権限のないユーザーが登壇者を削除しようとする
    Given 一般メンバーがイベント詳細ページにいる
    When 登壇者の削除APIを呼び出す
    Then 403エラー「この操作を行う権限がありません」が返される
```

---

## 4. UI仕様

### 4.1 画面一覧

| Screen ID | 画面名 | パス | 認証 | レイアウト |
|-----------|-------|------|------|----------|
| SCR-SPK-LIST | 登壇者一覧（主催者） | /app/events/:eid/speakers | 要 | dashboard |
| SCR-SPK-ADD | 登壇者追加モーダル | - | 要 | modal |
| SCR-SPK-FORM | 登壇者情報フォーム（公開） | /speaker-form/:token | 不要 | public |
| SCR-SPK-DETAIL | 登壇者詳細（主催者） | /app/speakers/:id | 要 | dashboard |

### 4.2 登壇者一覧画面（主催者）

```
┌─────────────────────────────────────────────────┐
│ イベント: AI活用セミナー                         │
│                                                  │
│ ┌───────────┐ ┌───────────┐                    │
│ │ + 登壇者追加 │ │ 並び替え ▼ │                    │
│ └───────────┘ └───────────┘                    │
│                                                  │
│ フィルタ: [すべて ▼] [未提出のみ ☐]              │
│                                                  │
├──────────────────────────────────────────────────┤
│ # │ 氏名    │ 所属      │ 登壇形式 │ ステータス │ 操作 │
├──────────────────────────────────────────────────┤
│ 1 │ 山田太郎 │ ABC社     │ 現地    │ ●確認済   │ ⋮   │
│   │         │          │         │ (緑色)    │     │
├──────────────────────────────────────────────────┤
│ 2 │ 鈴木花子 │ XYZ研究所 │ オンライン│ ●提出済   │ ⋮   │
│   │         │          │         │ (黄色)    │     │
├──────────────────────────────────────────────────┤
│ 3 │ 佐藤次郎 │ -        │ -       │ ○未提出   │ ⋮   │
│   │         │          │         │ (灰色)    │     │
└──────────────────────────────────────────────────┘

【操作メニュー(⋮)】
- 詳細を見る
- フォームURLをコピー
- メール送信
- 編集
- 削除
```

### 4.3 登壇者追加モーダル

```
┌─────────────────────────────────────────────────┐
│ 登壇者を追加                              [×]   │
├──────────────────────────────────────────────────┤
│                                                  │
│ 登壇者のメールアドレス（任意）                    │
│ ┌──────────────────────────────────────────┐   │
│ │ speaker@example.com                      │   │
│ └──────────────────────────────────────────┘   │
│ ※ 入力した場合、フォームURLが自動送信されます      │
│                                                  │
│ 登壇者氏名（任意）                               │
│ ┌──────────────────────────────────────────┐   │
│ │ 山田太郎                                  │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ ┌──────────────────────────────────────────┐   │
│ │          キャンセル    │    追加           │   │
│ └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘

【追加後の動作】
- speaker レコード作成（submission_status = 'pending'）
- フォームトークン生成
- メールアドレスが入力されていれば自動送信
- 一覧に追加された行が表示される
```

### 4.4 登壇者情報フォーム（公開）

```
┌─────────────────────────────────────────────────┐
│               [ロゴ] Haishin+ HUB                │
│                                                  │
│           登壇者情報のご提出                      │
│        イベント: AI活用セミナー                  │
│        日時: 2026年3月15日（土）14:00〜          │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│ 氏名 *                                           │
│ ┌──────────────────────────────────────────┐   │
│ │ 山田 太郎                                 │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ 肩書き                                           │
│ ┌──────────────────────────────────────────┐   │
│ │ 取締役CTO                                  │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ 所属                                             │
│ ┌──────────────────────────────────────────┐   │
│ │ 株式会社ABC                               │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ プロフィール（100文字以内）                       │
│ ┌──────────────────────────────────────────┐   │
│ │                                          │   │
│ │                                          │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ 顔写真                                           │
│ ┌──────────────────────────────────────────┐   │
│ │ [📷] ファイルを選択                        │   │
│ └──────────────────────────────────────────┘   │
│ ※ JPG, PNG / 最大50MB                           │
│                                                  │
│ 登壇タイトル                                      │
│ ┌──────────────────────────────────────────┐   │
│ │ AI×DXで変わる未来                         │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ 登壇開始時刻                                      │
│ ┌──────────────────────────────────────────┐   │
│ │ 14:30                                     │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ 持ち時間（分）                                    │
│ ┌──────────────────────────────────────────┐   │
│ │ 45                                        │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ 登壇形式                                          │
│ ◉ 現地登壇    ○ オンライン登壇                   │
│                                                  │
│ 発表資料（任意）                                  │
│ ┌──────────────────────────────────────────┐   │
│ │ [📄] ファイルを選択                        │   │
│ └──────────────────────────────────────────┘   │
│ ※ PDF, PPT, PPTX, JPG, PNG / 最大50MB          │
│                                                  │
│ ┌──────────────────────────────────────────┐   │
│ │               送信する                     │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ お問い合わせ: organizer@example.com              │
└──────────────────────────────────────────────────┘
```

### 4.5 送信完了画面

```
┌─────────────────────────────────────────────────┐
│                     ✓                            │
│                                                  │
│         登壇者情報を受け付けました                 │
│                                                  │
│   ご提出ありがとうございました。                   │
│   主催者が内容を確認次第、ご連絡いたします。        │
│                                                  │
│   このウィンドウは閉じていただいて構いません。      │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 4.6 UI要素詳細

| 要素 | 種類 | バリデーション | 備考 |
|------|------|--------------|------|
| 氏名 | UInput | MUST: 必須、255文字以内 | |
| 肩書き | UInput | MAY: 255文字以内 | |
| 所属 | UInput | MAY: 255文字以内 | |
| プロフィール | UTextarea | MAY: 1000文字以内 | rows=5 |
| 顔写真 | UFileInput | MAY: JPG, PNG, 最大50MB | accept="image/jpeg,image/png" |
| 登壇タイトル | UInput | MAY: 500文字以内 | |
| 登壇開始時刻 | UInput (type="time") | MAY | |
| 持ち時間 | UInput (type="number") | MAY: 1〜240分 | |
| 登壇形式 | URadioGroup | MUST: onsite/online | |
| 発表資料 | UFileInput | MAY: PDF, PPT, PPTX, JPG, PNG, 最大50MB | |
| 送信ボタン | UButton (type="submit") | - | プライマリカラー、幅100% |

### 4.7 状態別表示

| 状態 | 表示内容 |
|------|---------|
| 初期表示 | フォーム表示、イベント情報表示 |
| 入力中 | リアルタイムバリデーション（フィールド離脱時） |
| バリデーションエラー | フィールド下に赤字でエラー、フィールド枠赤色 |
| ファイル選択中 | ファイル名表示、プログレスバー |
| 送信中 | ボタン無効化、「送信中...」表示、loading |
| 送信成功 | 送信完了画面に遷移 |
| トークン無効 | 404エラーページ「フォームが見つかりません」 |
| イベントキャンセル | 「イベントはキャンセルされました」バナー表示 |

### 4.8 レスポンシブ対応

| ブレークポイント | 対応 |
|----------------|------|
| モバイル（< 640px） | フォーム幅100%、padding: 16px |
| タブレット（640-1024px） | フォーム幅80%、中央配置 |
| デスクトップ（> 1024px） | フォーム幅600px固定、中央配置 |

---

## 5. 状態遷移

### 5.1 登壇者ステータス遷移

```
                  ┌─────────────┐
        ┌─────────│   pending   │◄──────────┐
        │         │  (未提出)    │           │
        │         └──────┬──────┘           │
        │                │                  │
        │         speaker_submits       organizer_rejects
        │                │                  │
        │         ┌──────▼──────┐           │
        │         │  submitted  │───────────┘
        │         │  (提出済)    │
        │         └──────┬──────┘
        │                │
        │      organizer_confirms
        │                │
        │         ┌──────▼──────┐
        └────────►│  confirmed  │
   organizer_edit │  (確認済)    │
                  └─────────────┘
```

### 5.2 遷移ルール

| 現在の状態 | イベント | 次の状態 | アクション |
|-----------|---------|---------|-----------|
| - | organizer_adds_speaker | pending | speaker レコード作成、トークン生成 |
| pending | speaker_submits | submitted | フォーム送信、情報保存 |
| submitted | organizer_confirms | confirmed | 主催者が承認 |
| submitted | organizer_rejects | pending | 主催者が差し戻し（将来機能） |
| confirmed | organizer_edit | confirmed | 主催者が手動編集 |
| * | organizer_deletes | - | レコード削除 |

---

## 6. API仕様

### 6.1 エンドポイント一覧

| メソッド | パス | 説明 | 認証 | 権限 |
|---------|------|------|------|------|
| GET | `/api/v1/events/:eid/speakers` | 登壇者一覧取得 | 要 | event_member |
| POST | `/api/v1/events/:eid/speakers` | 登壇者追加 | 要 | organizer, event_planner |
| GET | `/api/v1/speakers/:id` | 登壇者詳細取得 | 要 | event_member |
| PATCH | `/api/v1/speakers/:id` | 登壇者情報更新 | 要 | organizer, speaker(自分) |
| DELETE | `/api/v1/speakers/:id` | 登壇者削除 | 要 | organizer |
| POST | `/api/v1/speakers/:id/materials` | 資料アップロード | 要 | speaker |
| POST | `/api/v1/speakers/:id/send-form-email` | フォームURLメール送信 | 要 | organizer |
| GET | `/api/v1/speaker-form/:token` | フォーム情報取得（公開） | 不要 | - |
| POST | `/api/v1/speaker-form/:token` | フォーム送信（公開） | 不要 | - |

### 6.2 GET /api/v1/events/:eid/speakers

登壇者一覧を取得する（主催者用）。

**リクエスト**: なし

**クエリパラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| status | string | MAY | フィルタ: `pending`, `submitted`, `confirmed` |
| sort | string | MAY | ソート: `sort_order`, `name`, `start_at` |
| order | string | MAY | 順序: `asc`, `desc` |

**レスポンス（成功）**: `200 OK`

```json
{
  "data": [
    {
      "id": "01HSPK...",
      "event_id": "01HEVT...",
      "tenant_id": "01HTNT...",
      "user_id": null,
      "name": "山田 太郎",
      "title": "取締役CTO",
      "organization": "株式会社ABC",
      "bio": "AIとDXの専門家。業界歴15年。",
      "photo_url": "https://cdn.example.com/speakers/photo_01.jpg",
      "presentation_title": "AI×DXで変わる未来",
      "start_at": "2026-03-15T14:30:00+09:00",
      "duration_minutes": 45,
      "format": "onsite",
      "materials_url": "https://cdn.example.com/speakers/materials_01.pdf",
      "submission_status": "confirmed",
      "ai_generated_bio": null,
      "sort_order": 1,
      "created_at": "2026-02-09T10:00:00Z",
      "updated_at": "2026-02-09T11:00:00Z"
    }
  ]
}
```

### 6.3 POST /api/v1/events/:eid/speakers

登壇者を追加する（主催者用）。

**リクエスト**:

```json
{
  "name": "山田 太郎",
  "email": "speaker@example.com"
}
```

| フィールド | 型 | 必須 | バリデーション | 備考 |
|-----------|-----|------|--------------|------|
| name | string | MAY | 255文字以内 | 空の場合は未入力として登録 |
| email | string | MAY | メール形式 | フォームURLメール送信用 |

**レスポンス（成功）**: `201 Created`

```json
{
  "data": {
    "id": "01HSPK...",
    "event_id": "01HEVT...",
    "name": "山田 太郎",
    "submission_status": "pending",
    "form_token": "01HTOKEN...",
    "form_url": "https://example.com/speaker-form/01HTOKEN...",
    "email_sent": true
  }
}
```

**レスポンス（エラー）**:

| HTTPステータス | error.code | 条件 |
|--------------|------------|------|
| 403 | `FORBIDDEN` | 権限なし |
| 404 | `NOT_FOUND` | イベントが見つからない |

### 6.4 PATCH /api/v1/speakers/:id

登壇者情報を更新する（主催者または登壇者本人）。

**リクエスト**:

```json
{
  "name": "山田 太郎",
  "title": "取締役CTO",
  "organization": "株式会社ABC",
  "bio": "AIとDXの専門家。",
  "photo_url": "https://cdn.example.com/speakers/photo_01.jpg",
  "presentation_title": "AI×DXで変わる未来",
  "start_at": "2026-03-15T14:30:00+09:00",
  "duration_minutes": 45,
  "format": "onsite",
  "materials_url": "https://cdn.example.com/speakers/materials_01.pdf",
  "submission_status": "confirmed"
}
```

| フィールド | 型 | 必須 | バリデーション | 備考 |
|-----------|-----|------|--------------|------|
| name | string | MAY | 255文字以内 | |
| title | string | MAY | 255文字以内 | |
| organization | string | MAY | 255文字以内 | |
| bio | string | MAY | 1000文字以内 | |
| photo_url | string | MAY | URL形式 | |
| presentation_title | string | MAY | 500文字以内 | |
| start_at | string | MAY | ISO 8601 | |
| duration_minutes | integer | MAY | 1〜240 | |
| format | string | MAY | `onsite` or `online` | |
| materials_url | string | MAY | URL形式 | |
| submission_status | string | MAY | `pending`, `submitted`, `confirmed` | 主催者のみ変更可 |

**レスポンス（成功）**: `200 OK`

```json
{
  "data": {
    "id": "01HSPK...",
    "name": "山田 太郎",
    "updated_at": "2026-02-09T12:00:00Z"
  }
}
```

### 6.5 POST /api/v1/speakers/:id/materials

資料ファイルをアップロードする。

**リクエスト**: `multipart/form-data`

```
Content-Type: multipart/form-data

file: (binary)
```

| フィールド | 型 | 必須 | バリデーション | 備考 |
|-----------|-----|------|--------------|------|
| file | File | MUST | PDF, PPT, PPTX, JPG, PNG / 最大50MB | |

**レスポンス（成功）**: `200 OK`

```json
{
  "data": {
    "materials_url": "https://cdn.example.com/speakers/01HSPK.../materials_01.pdf",
    "file_size": 1024000,
    "uploaded_at": "2026-02-09T12:30:00Z"
  }
}
```

**レスポンス（エラー）**:

| HTTPステータス | error.code | 条件 |
|--------------|------------|------|
| 400 | `FILE_TOO_LARGE` | ファイルサイズ > 50MB |
| 400 | `UNSUPPORTED_FILE_TYPE` | 非対応形式 |
| 413 | `PAYLOAD_TOO_LARGE` | リクエストボディ > 50MB |

### 6.6 POST /api/v1/speakers/:id/send-form-email

登壇者にフォームURLをメール送信する（主催者用）。

**リクエスト**:

```json
{
  "email": "speaker@example.com"
}
```

| フィールド | 型 | 必須 | バリデーション | 備考 |
|-----------|-----|------|--------------|------|
| email | string | MUST | メール形式 | |

**レスポンス（成功）**: `200 OK`

```json
{
  "data": {
    "email_sent": true,
    "sent_at": "2026-02-09T13:00:00Z"
  }
}
```

### 6.7 GET /api/v1/speaker-form/:token

公開フォームの情報を取得する（認証不要）。

**リクエスト**: なし

**レスポンス（成功）**: `200 OK`

```json
{
  "data": {
    "event": {
      "title": "AI活用セミナー",
      "start_at": "2026-03-15T14:00:00+09:00",
      "status": "confirmed"
    },
    "speaker": {
      "id": "01HSPK...",
      "name": "山田 太郎",
      "title": "取締役CTO",
      "organization": "株式会社ABC",
      "bio": "AIとDXの専門家。",
      "photo_url": "https://cdn.example.com/speakers/photo_01.jpg",
      "presentation_title": "AI×DXで変わる未来",
      "start_at": "2026-03-15T14:30:00+09:00",
      "duration_minutes": 45,
      "format": "onsite",
      "submission_status": "submitted"
    },
    "form_url": "https://example.com/speaker-form/01HTOKEN..."
  }
}
```

**レスポンス（エラー）**:

| HTTPステータス | error.code | 条件 |
|--------------|------------|------|
| 404 | `NOT_FOUND` | トークン無効 |
| 410 | `EVENT_CANCELLED` | イベントがキャンセル済み |

### 6.8 POST /api/v1/speaker-form/:token

公開フォームから登壇者情報を送信する（認証不要）。

**リクエスト**: `multipart/form-data`

```
Content-Type: multipart/form-data

name: 山田 太郎
title: 取締役CTO
organization: 株式会社ABC
bio: AIとDXの専門家。
photo: (binary)
presentation_title: AI×DXで変わる未来
start_at: 2026-03-15T14:30:00+09:00
duration_minutes: 45
format: onsite
materials: (binary)
```

| フィールド | 型 | 必須 | バリデーション | 備考 |
|-----------|-----|------|--------------|------|
| name | string | MUST | 255文字以内 | |
| title | string | MAY | 255文字以内 | |
| organization | string | MAY | 255文字以内 | |
| bio | string | MAY | 1000文字以内 | |
| photo | File | MAY | JPG, PNG / 最大50MB | |
| presentation_title | string | MAY | 500文字以内 | |
| start_at | string | MAY | ISO 8601 | |
| duration_minutes | integer | MAY | 1〜240 | |
| format | string | MUST | `onsite` or `online` | |
| materials | File | MAY | PDF, PPT, PPTX, JPG, PNG / 最大50MB | |

**レスポンス（成功）**: `200 OK`

```json
{
  "data": {
    "submission_status": "submitted",
    "submitted_at": "2026-02-09T14:00:00Z"
  },
  "message": "登壇者情報を受け付けました"
}
```

---

## 7. データモデル

### 7.1 関連テーブル

| テーブル | 用途 | 参照 |
|---------|------|------|
| speaker | 登壇者情報 | SSOT-4 §2.9 |
| event | イベント情報 | SSOT-4 §2.5 |
| file_upload | ファイルアップロード | SSOT-4 §2.20 |

### 7.2 speaker テーブル（既存）

> SSOT-4 §2.9 で定義済み。確認のため再掲。

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | VARCHAR(26) | NO | - | 主キー（ULID） |
| event_id | VARCHAR(26) | NO | - | FK → event.id |
| tenant_id | VARCHAR(26) | NO | - | FK → tenant.id |
| user_id | VARCHAR(26) | YES | - | FK → user.id（HUBユーザーの場合） |
| name | VARCHAR(255) | NO | - | 氏名 |
| title | VARCHAR(255) | YES | - | 肩書き |
| organization | VARCHAR(255) | YES | - | 所属 |
| bio | TEXT | YES | - | プロフィール |
| photo_url | TEXT | YES | - | 顔写真URL |
| presentation_title | VARCHAR(500) | YES | - | 登壇タイトル |
| start_at | TIMESTAMPTZ | YES | - | 登壇開始時刻 |
| duration_minutes | INTEGER | YES | - | 持ち時間（分） |
| format | VARCHAR(50) | YES | - | 登壇形式（onsite / online） |
| materials_url | TEXT | YES | - | 資料URL |
| submission_status | VARCHAR(50) | NO | `'pending'` | 提出状態（pending / submitted / confirmed） |
| ai_generated_bio | TEXT | YES | - | AI生成の紹介文 |
| sort_order | INTEGER | NO | `0` | 表示順 |
| created_at | TIMESTAMPTZ | NO | CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMPTZ | NO | CURRENT_TIMESTAMP | |

**インデックス**:
- `idx_speaker_event` (event_id, sort_order)
- `idx_speaker_status` (event_id, submission_status)
- `idx_speaker_tenant` (tenant_id)

### 7.3 データ操作

| 操作 | テーブル | 条件/内容 |
|------|---------|----------|
| INSERT | speaker | 登壇者追加（organizer） |
| UPDATE | speaker | 情報更新（organizer, speaker本人） |
| UPDATE | speaker | ステータス変更（organizer） |
| DELETE | speaker | 登壇者削除（organizer） |
| SELECT | speaker | WHERE event_id = :event_id ORDER BY sort_order |
| INSERT | file_upload | ファイルアップロード時 |

---

## 8. ビジネスロジック

### 8.1 登壇者追加フロー（主催者）

```
1. 主催者が「登壇者追加」ボタンクリック
   └─ 登壇者追加モーダル表示

2. 氏名・メールアドレス入力（任意）→「追加」ボタンクリック

3. サーバーサイド処理
   ├─ speaker レコード作成（submission_status = 'pending'）
   ├─ フォームトークン（ULID）生成 → speaker.id と紐付け
   ├─ メールアドレスが入力されている場合:
   │   └─ フォームURLメール送信（下記8.2参照）
   └─ レスポンス返却

4. フロントエンド
   ├─ 一覧に新規登壇者行を追加
   └─ ステータス「未提出」表示
```

### 8.2 フォームURLメール送信フロー

```
1. メールテンプレート生成
   ├─ 件名: 「【{イベント名}】登壇者情報のご提出のお願い」
   ├─ 本文:
   │   {登壇者氏名} 様
   │
   │   {イベント名} にご登壇いただく登壇者情報のご提出をお願いします。
   │
   │   フォームURL: {form_url}
   │
   │   ご提出期限: {イベント日時の3日前}
   │
   │   よろしくお願いいたします。
   │
   │   ---
   │   {主催者氏名}
   │   {主催者メールアドレス}
   └─ 送信

2. 送信記録
   ├─ notification テーブルに記録（将来的にリマインド用）
   └─ speaker.updated_at 更新
```

### 8.3 登壇者情報送信フロー（公開フォーム）

```
1. 登壇者がフォームURL（/speaker-form/:token）にアクセス

2. トークン検証
   ├─ speaker レコードを token (= speaker.id) で検索
   ├─ 見つからない → 404エラー
   ├─ イベントがキャンセル済み → 410エラー「イベントはキャンセルされました」
   └─ OK → フォーム表示

3. 登壇者が情報入力・ファイルアップロード → 「送信する」ボタンクリック

4. サーバーサイド処理
   ├─ バリデーション
   │   ├─ 氏名必須チェック
   │   ├─ ファイルサイズ・形式チェック
   │   └─ NG → 400エラー
   │
   ├─ ファイルアップロード
   │   ├─ 顔写真 → /uploads/speakers/:event_id/:speaker_id/photo_:timestamp.jpg
   │   ├─ サムネイル生成（200x200px）
   │   ├─ 資料 → /uploads/speakers/:event_id/:speaker_id/materials_:timestamp.pdf
   │   └─ file_upload レコード作成
   │
   ├─ speaker レコード更新
   │   ├─ 送信内容を speaker テーブルに保存
   │   ├─ submission_status = 'submitted'
   │   └─ updated_at 更新
   │
   └─ レスポンス返却

5. フロントエンド
   └─ 送信完了画面表示
```

### 8.4 主催者による承認フロー

```
1. 主催者が登壇者一覧で「提出済」の登壇者を確認

2. 詳細画面で内容確認

3. 「確認済みにする」ボタンクリック

4. サーバーサイド処理
   ├─ 権限チェック（organizer or event_planner）
   ├─ speaker.submission_status = 'confirmed'
   └─ speaker.updated_at 更新

5. フロントエンド
   └─ ステータス表示が「確認済」（緑色）に変更
```

### 8.5 ファイルアップロードロジック

```typescript
// server/api/v1/speaker-form/[token].post.ts
async function handleFileUploads(files: FormData, speakerId: string, eventId: string) {
  const uploadResults = {
    photo_url: null,
    materials_url: null,
  };

  // 顔写真アップロード
  if (files.photo) {
    const photoFile = files.photo;

    // バリデーション
    if (photoFile.size > 50 * 1024 * 1024) {
      throw createAppError('FILE_TOO_LARGE', 'ファイルサイズは50MB以下にしてください', 400);
    }
    if (!['image/jpeg', 'image/png'].includes(photoFile.type)) {
      throw createAppError('UNSUPPORTED_FILE_TYPE', '対応していない形式です', 400);
    }

    // ファイル保存
    const timestamp = Date.now();
    const ext = photoFile.type === 'image/jpeg' ? 'jpg' : 'png';
    const filename = `photo_${timestamp}.${ext}`;
    const uploadPath = `/uploads/speakers/${eventId}/${speakerId}/${filename}`;

    await saveFile(photoFile, uploadPath);

    // サムネイル生成
    await generateThumbnail(uploadPath, 200, 200);

    uploadResults.photo_url = `https://cdn.example.com${uploadPath}`;

    // file_upload レコード作成
    await createFileUploadRecord({
      entity_type: 'speaker',
      entity_id: speakerId,
      file_name: photoFile.name,
      file_type: photoFile.type,
      file_size: photoFile.size,
      storage_path: uploadPath,
    });
  }

  // 資料ファイルアップロード（同様の処理）
  if (files.materials) {
    // ... 同様のロジック
  }

  return uploadResults;
}
```

### 8.6 セキュリティ要件

| 要件 | 実装 |
|------|------|
| トークン検証 | ULID ベースのトークン（推測困難） |
| ファイルアップロード検証 | MIMEタイプ・拡張子・サイズチェック |
| 権限チェック | 主催者のみ削除・承認可能 |
| CSRF対策 | 公開フォームは CSRF トークン不要（stateless） |
| ファイルスキャン | アンチウイルススキャン（将来検討） |

---

## 9. エラーハンドリング

### 9.1 フロントエンド

| エラー種別 | 表示方法 | メッセージ |
|-----------|---------|-----------|
| フィールドバリデーション | フィールド直下（UFormGroup error） | バリデーションメッセージ |
| ファイルサイズ超過 | UAlert (color="error") | 「ファイルサイズは50MB以下にしてください」 |
| 非対応形式 | UAlert (color="error") | 「対応していない形式です（PDF, PPT, PPTX, JPG, PNG）」 |
| トークン無効 | 404ページ | 「フォームが見つかりません」 |
| イベントキャンセル | UAlert (color="warning") | 「イベントはキャンセルされました」 |
| ネットワークエラー | UAlert (color="error") | 「通信エラーが発生しました。再試行してください」 |
| サーバーエラー | UAlert (color="error") | 「システムエラーが発生しました。しばらく経ってから再試行してください」 |

### 9.2 バックエンド

| エラー種別 | HTTPステータス | ログレベル | ログ内容 |
|-----------|--------------|-----------|---------|
| バリデーションエラー | 400 | DEBUG | フィールド名、エラー内容 |
| ファイルサイズ超過 | 400 | INFO | file_size, speaker_id |
| 非対応形式 | 400 | INFO | file_type, speaker_id |
| トークン無効 | 404 | WARN | token |
| イベントキャンセル | 410 | INFO | event_id, token |
| 権限なし | 403 | WARN | user_id, speaker_id |
| ファイル保存失敗 | 500 | ERROR | スタックトレース |
| サーバーエラー | 500 | ERROR | スタックトレース |

---

## 10. テスト仕様

### 10.1 ユニットテスト

| テストID | テストケース | 入力 | 期待結果 |
|----------|-------------|------|---------|
| TC-001 | 登壇者追加 | 氏名・メールアドレス | 201 + speaker レコード作成 |
| TC-002 | フォームトークン生成 | speaker.id | ULID 形式のトークン |
| TC-003 | 氏名必須バリデーション | name="" | 400 + エラーメッセージ |
| TC-004 | ファイルサイズチェック | 51MB ファイル | 400 + FILE_TOO_LARGE |
| TC-005 | ファイル形式チェック | .exe ファイル | 400 + UNSUPPORTED_FILE_TYPE |
| TC-006 | ステータス更新（submitted） | 正しいフォーム送信 | submission_status = 'submitted' |
| TC-007 | ステータス更新（confirmed） | 主催者が承認 | submission_status = 'confirmed' |
| TC-008 | トークン検証（有効） | 正しいトークン | フォーム情報返却 |
| TC-009 | トークン検証（無効） | 存在しないトークン | 404 |
| TC-010 | イベントキャンセル検証 | cancelled イベント | 410 + EVENT_CANCELLED |

### 10.2 統合テスト

| テストID | テストケース | 手順 | 期待結果 |
|----------|-------------|------|---------|
| TC-101 | 登壇者追加→メール送信 | 登壇者追加（メールあり） | メール送信成功 |
| TC-102 | フォーム送信→ステータス更新 | フォーム送信 | submission_status = 'submitted' |
| TC-103 | ファイルアップロード→URL生成 | 顔写真アップロード | photo_url 生成 |
| TC-104 | サムネイル生成 | 顔写真アップロード | 200x200px サムネイル生成 |
| TC-105 | 上書き更新 | 同じトークンから2回送信 | 既存レコード UPDATE |
| TC-106 | 主催者承認 | 主催者が確認済みボタンクリック | submission_status = 'confirmed' |
| TC-107 | 登壇者削除→ファイル削除 | 登壇者削除 | ファイル物理削除 |

### 10.3 E2Eテスト

| テストID | テストケース | 手順 | 期待結果 |
|----------|-------------|------|---------|
| TC-201 | 登壇者追加フロー | 主催者が登壇者追加 | 一覧に表示、ステータス「未提出」 |
| TC-202 | フォームURL送信 | 登壇者にメール送信 | メール受信、URL クリック可能 |
| TC-203 | フォーム入力・送信 | 登壇者がフォーム送信 | 送信完了画面表示 |
| TC-204 | ステータス反映 | フォーム送信後、主催者が一覧確認 | ステータス「提出済」（黄色） |
| TC-205 | 承認フロー | 主催者が確認済みボタンクリック | ステータス「確認済」（緑色） |
| TC-206 | ファイルアップロード | 顔写真・資料アップロード | ファイル表示、ダウンロード可能 |
| TC-207 | バリデーションエラー | 氏名空で送信 | エラーメッセージ表示 |
| TC-208 | トークン無効 | 不正なURLでアクセス | 404ページ表示 |
| TC-209 | イベントキャンセル後アクセス | キャンセル後にフォームアクセス | 「イベントはキャンセルされました」表示 |

---

## 11. 非機能要件

### 11.1 パフォーマンス

| 指標 | 目標値 |
|------|-------|
| API応答時間（p95） | < 500ms |
| ファイルアップロード（10MB） | < 5秒 |
| サムネイル生成 | < 2秒 |

### 11.2 可用性

| 指標 | 目標値 |
|------|-------|
| 稼働率 | 99.9% |

### 11.3 セキュリティ

| 項目 | 対応 |
|------|------|
| HTTPS | MUST |
| ファイルアップロード検証 | MIMEタイプ・拡張子・サイズチェック |
| トークン推測防止 | ULID（128bit ランダム） |
| 権限チェック | 主催者のみ削除・承認可能 |

---

## 12. 依存関係

### 12.1 前提となる機能

| 機能ID | 機能名 | 依存内容 |
|--------|-------|---------|
| EVT-001 | イベント作成 | イベントレコードが存在すること |
| AUTH-001 | ログイン | 主催者認証 |
| ROLE-001 | ロール管理 | organizer, event_planner ロール |

### 12.2 この機能に依存する機能

| 機能ID | 機能名 | 依存内容 |
|--------|-------|---------|
| EVT-022 | 登壇者紹介文AI生成 | speaker レコード |
| EVT-030 | イベントポータル | 登壇者情報表示 |

---

## 13. 実装メモ（AI向け）

### 13.1 実装順序

```
1. DBマイグレーション
   - speaker テーブル確認（既存）
   - インデックス追加

2. API実装
   - POST /api/v1/events/:eid/speakers — 登壇者追加
   - GET /api/v1/events/:eid/speakers — 登壇者一覧
   - PATCH /api/v1/speakers/:id — 登壇者更新
   - DELETE /api/v1/speakers/:id — 登壇者削除
   - POST /api/v1/speakers/:id/materials — 資料アップロード
   - GET /api/v1/speaker-form/:token — フォーム情報取得（公開）
   - POST /api/v1/speaker-form/:token — フォーム送信（公開）
   - POST /api/v1/speakers/:id/send-form-email — メール送信

3. フロントエンド（主催者）
   - pages/app/events/[eid]/speakers/index.vue — 登壇者一覧
   - components/features/event/SpeakerList.vue
   - components/features/event/SpeakerAddModal.vue
   - components/features/event/SpeakerDetailModal.vue

4. フロントエンド（公開フォーム）
   - pages/speaker-form/[token].vue — 公開フォーム
   - components/features/speaker/SpeakerForm.vue

5. メール送信
   - server/utils/mail/templates/speaker-form-invitation.ts

6. テスト
   - ユニットテスト（API、バリデーション）
   - 統合テスト（DB操作、ファイルアップロード）
   - E2Eテスト（登壇者追加→フォーム送信→承認フロー）
```

### 13.2 参照すべきファイル

| 種類 | ファイル | 参照内容 |
|------|---------|---------|
| API共通 | SSOT-3_API_CONTRACT.md | エラーレスポンス形式 |
| DB共通 | SSOT-4_DATA_MODEL.md §2.9 | speaker テーブル |
| ファイルアップロード | SSOT-5_CROSS_CUTTING.md | ファイルアップロード共通処理 |
| メール送信 | SSOT-5_CROSS_CUTTING.md | メール送信共通処理 |
| コーディング規約 | CODING_STANDARDS.md | Nuxt 3 / Vue 3 規約 |
| テスト規約 | TESTING_STANDARDS.md | テストパターン |

### 13.3 ファイルアップロード実装例

```typescript
// server/utils/file-upload.ts
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export async function saveFile(file: File, uploadPath: string): Promise<void> {
  const fullPath = path.join(process.cwd(), 'public', uploadPath);
  const dir = path.dirname(fullPath);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(fullPath, Buffer.from(await file.arrayBuffer()));
}

export async function generateThumbnail(
  imagePath: string,
  width: number,
  height: number
): Promise<string> {
  const fullPath = path.join(process.cwd(), 'public', imagePath);
  const thumbnailPath = imagePath.replace(/(\.\w+)$/, '_thumb$1');
  const fullThumbnailPath = path.join(process.cwd(), 'public', thumbnailPath);

  await sharp(fullPath)
    .resize(width, height, { fit: 'cover' })
    .toFile(fullThumbnailPath);

  return thumbnailPath;
}
```

### 13.4 注意事項

- ⚠️ フォームトークンは `speaker.id` をそのまま使用（ULID なので推測困難）
- ⚠️ ファイルアップロードは MIMEタイプ・拡張子の両方をチェック
- ⚠️ サムネイル生成は非同期処理（バックグラウンドジョブ推奨）
- ⚠️ 登壇者削除時、関連ファイルを物理削除すること
- ⚠️ 公開フォームは CSRF トークン不要（stateless）
- ⚠️ メール送信失敗時はログ記録し、リトライ機構で対応

---

## 14. 未決定事項・制約 [CONTRACT]

### 14.1 未決定事項

| # | 項目 | 現状 | 決定期限 | 影響範囲 |
|---|------|------|---------|---------|
| TBD-001 | 登壇者の重複チェック基準 | 同一イベント内のメールアドレス一致で CONFLICT(409) を返す方針だが、メールアドレス未入力の登壇者が存在する場合の扱いが未定 | 実装前 | POST /api/v1/events/:eid/speakers |
| TBD-002 | サムネイル生成の実行方式 | 「バックグラウンドジョブ推奨」（§13.4）とあるが、具体的なジョブキュー基盤（BullMQ等）の選定が未定。MVP では同期生成で可とするか要判断 | 実装前 | ファイルアップロード処理 |
| TBD-003 | アンチウイルススキャン | §8.6 にて「将来検討」とあり、MVP ではスキップする想定。導入タイミングの判断が必要 | MVP後 | ファイルアップロード検証 |
| TBD-004 | フォームURL有効期限 | 現状はトークンに有効期限なし。セキュリティ上、期限付きにすべきか未決定 | 実装前 | GET/POST /api/v1/speaker-form/:token |
| TBD-005 | 登壇者差し戻しフロー | §5.2 遷移ルールで `organizer_rejects` が「将来機能」。MVP での対応可否が未決定 | 実装前 | ステータス遷移 |

### 14.2 制約

| # | 制約 | 理由 |
|---|------|------|
| CON-001 | 登壇者情報フォームは認証不要（トークンベース） | 外部の登壇者がHUBアカウントを持たない前提 |
| CON-002 | ファイルアップロード上限は50MB/ファイル | VPSストレージ容量・ネットワーク帯域の制約 |
| CON-003 | 対応ファイル形式は JPG, PNG, PDF, PPT, PPTX のみ | セキュリティリスク低減のため最小限に限定 |
| CON-004 | 登壇者削除は物理削除（論理削除なし） | SSOT-4 のデータモデル定義に従う |
| CON-005 | 登壇者のメールアドレスは speaker テーブルに永続化されない | フォーム送信用のみ。send-form-email API のリクエストパラメータで都度指定 |
| CON-006 | 公開フォームは CSRF トークン不要 | stateless なトークンベース認証のため |

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 変更者 |
|------|----------|---------|-------|
| 2026-02-09 | v1.1 | §3-E/F/G/H（入出力例・境界値・例外レスポンス・受け入れテスト）、§14 未決定事項・制約を追加 | AI |
| 2026-02-09 | v1.0 | 初版作成 | AI |

---

## 承認

| 役割 | 名前 | 日付 | 承認 |
|------|------|------|------|
| 設計者 | | | ☐ |
| テックリード | | | ☐ |
| プロダクトオーナー | | | ☐ |
