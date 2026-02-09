# EVT-030-031-033: 参加者ポータル & チェックイン & AIコンシェルジュ

**機能ID**: EVT-030（イベントポータル自動生成）/ EVT-031（QRチェックイン）/ EVT-033（AIコンシェルジュ）
**優先度**: 🔴 MVP必須
**作成日**: 2026-02-09
**最終更新**: 2026-02-09
**ステータス**: Draft
**依存機能**: EVT-001（イベント基本情報）、EVT-011（タイムテーブル管理）、COMMON-AUTH（認証基盤）
**関連SSOT**: SSOT-3（API規約）、SSOT-4（データモデル）、SSOT-5（横断的関心事）

---

## §1. 概要 [CORE]

### 目的
参加者向けに「イベント情報の一元的な閲覧」「スムーズな受付」「リアルタイムなQ&A対応」を提供し、参加者体験を最大化する。

### ビジネス価値
- **参加者**: 必要な情報に即座にアクセス、受付待機時間ゼロ、疑問を即解決
- **主催者**: 受付業務の省力化、参加者からの問い合わせ削減、リアルタイムな参加状況把握
- **会場スタッフ**: 案内業務の削減、トラブル時の迅速な対応

### スコープ
**含む**:
- EVT-030: イベント情報を集約した参加者向けポータルページの自動生成
- EVT-031: QRコードによる参加者チェックイン機能
- EVT-033: 参加者向けAIコンシェルジュ（FAQ対応）

**含まない**:
- 参加申込フロー（別機能で実装）
- 決済機能（将来拡張）
- 参加者間のコミュニケーション機能（将来拡張）

---

## §2. ユーザーストーリー [CORE]

### US-1: イベントポータルへのアクセス
**As a** 参加者
**I want to** メールで受け取ったURLから1クリックでイベント情報ページにアクセスしたい
**So that** 必要な情報をすぐに確認できる

**受入基準**:
- AC1: イベント情報からポータルページが自動生成される
- AC2: イベント名・日時・タイムテーブル・住所+地図・Wi-Fi・登壇者・資料DL・配信URLが含まれる
- AC3: スマホで閲覧しやすいレスポンシブデザイン
- AC4: ユニークURL（`/portal/:slug`）でアクセス可能
- AC5: 主催者がイベント情報を更新すると、ポータルにリアルタイム反映される
- AC6: イベント終了後もアーカイブとしてアクセス可能

### US-2: QRコードによる受付
**As a** 事前申込済み参加者
**I want to** メールで受け取った受付票のQRコードをスキャンするだけでチェックインしたい
**So that** 受付の待ち時間を削減できる

**受入基準**:
- AC1: 事前申込者に個別QRコード付き受付票がメール送信される
- AC2: 会場スタッフがQRスキャンすると即座にチェックイン完了
- AC3: チェックイン状況が管理画面でリアルタイム表示される
- AC4: 同じQRコードで重複チェックインできない

### US-3: AIコンシェルジュへの質問
**As a** 参加者
**I want to** ポータル上のチャットで会場やイベントについて質問したい
**So that** 主催者や会場スタッフに直接聞かなくても疑問を解決できる

**受入基準**:
- AC1: ポータルにチャットUIが配置され、自然言語で質問できる
- AC2: 会場案内（トイレ・喫煙所・最寄駅・駐車場等）の質問に回答できる
- AC3: イベント情報（開始時間・登壇者・持ち物等）の質問に回答できる
- AC4: Wi-Fi・配信URL等、主催者が登録した情報に基づいて回答する
- AC5: AIが回答できない場合はエスカレーション導線（主催者連絡先）を表示

### US-4: 当日参加者の受付
**As a** 会場スタッフ
**I want to** 事前申込のない当日参加者を手動で登録・チェックインしたい
**So that** 現地参加希望者も適切に受付できる

**受入基準**:
- AC1: スタッフ用画面で参加者情報（名前・組織・メール）を入力して登録
- AC2: 登録後、即座にチェックイン完了状態にする
- AC3: 参加者統計に反映される

---

## §3. 機能要件 [CONTRACT]

### FR-1: ポータルページ生成
- FR-1.1: イベント作成時、ユニークな `portal_slug` を自動生成（例: `event-2026-tech-summit-a3f9`）
- FR-1.2: ポータルURL: `https://example.com/portal/:slug`
- FR-1.3: 認証不要で誰でもアクセス可能（Public API）
- FR-1.4: ポータル表示内容:
  - イベント名、説明文
  - 開催日時、開催形態（オンライン/オフライン/ハイブリッド）
  - 会場情報（住所・地図・最寄駅・駐車場・アクセス方法）
  - タイムテーブル（セッション一覧・時間・登壇者）
  - 登壇者一覧（名前・所属・プロフィール・写真）
  - 資料ダウンロードリンク（公開設定された資料のみ）
  - 配信URL（オンライン参加者向け）
  - Wi-Fi情報（SSID・パスワード）
  - 主催者連絡先
  - AIコンシェルジュチャットウィジェット
- FR-1.5: スマホ最適化レスポンシブデザイン（Mobile First）
- FR-1.6: OGP設定（SNSシェア時のプレビュー対応）

### FR-2: リアルタイム情報更新
- FR-2.1: イベント情報が更新されたら、ポータルに即反映（キャッシュ戦略: SWR推奨）
- FR-2.2: タイムテーブル変更時、ポータルに自動反映
- FR-2.3: 登壇者情報変更時、ポータルに自動反映

### FR-3: アーカイブモード
- FR-3.1: イベント終了後もポータルはアクセス可能
- FR-3.2: アーカイブモードでは「このイベントは終了しました」バナーを表示
- FR-3.3: 配信URLがアーカイブ録画URLに自動切り替え（設定されている場合）

### FR-4: 参加者登録
- FR-4.1: ポータルから参加申込可能（Public API: `POST /api/v1/portal/:slug/register`）
- FR-4.2: 必須項目: 名前、メールアドレス、参加形態（現地/オンライン）
- FR-4.3: 任意項目: 組織名、役職、電話番号
- FR-4.4: 申込完了後、確認メールを自動送信
- FR-4.5: 確認メールに受付票（QRコード画像埋め込み）を添付
- FR-4.6: 申込時のステータス: `registered` → 確認メール承認後: `confirmed`

### FR-5: QRコード生成
- FR-5.1: 参加者登録時、ユニークなQRコードを生成（形式: `participant_id` をBase64エンコード + チェックサム）
- FR-5.2: QRコードは `participant.qr_code` カラムに保存
- FR-5.3: QRコード画像生成（PNG形式、300x300px）
- FR-5.4: 受付票テンプレート: イベント名、参加者名、QRコード画像、注意事項

### FR-6: QRスキャンチェックイン
- FR-6.1: スタッフ用チェックイン画面（要認証、staff/admin ロール必須）
- FR-6.2: カメラでQRコードスキャン（ブラウザのカメラAPI使用）
- FR-6.3: QRコードデコード → `participant_id` 抽出
- FR-6.4: `POST /api/v1/events/:eid/checkins/qr` でチェックイン記録
- FR-6.5: チェックイン成功時: 参加者名・組織名を画面表示、効果音再生
- FR-6.6: チェックイン失敗時: エラーメッセージ表示（無効なQR / 既にチェックイン済み / 別イベントのQR）
- FR-6.7: チェックイン情報を `checkin` テーブルに記録

### FR-7: 重複チェックイン防止
- FR-7.1: 同一 `participant_id` で既にチェックイン済みの場合、エラーを返す
- FR-7.2: エラーレスポンス: `{ error: "ALREADY_CHECKED_IN", checked_in_at: "2026-02-09T10:30:00Z" }`
- FR-7.3: スタッフ画面に「既にチェックイン済み（時刻表示）」と警告表示

### FR-8: 手動チェックイン
- FR-8.1: QRコードがない参加者向けに手動チェックイン機能
- FR-8.2: スタッフが参加者を検索（名前/メール/組織名で部分一致検索）
- FR-8.3: 検索結果から選択してチェックインボタン押下
- FR-8.4: `checkin.method = "manual"` で記録

### FR-9: 当日参加者登録
- FR-9.1: スタッフ画面で当日参加者を新規登録
- FR-9.2: 入力項目: 名前、メールアドレス、組織名、参加形態
- FR-9.3: 登録完了後、即座にチェックイン完了状態にする（`method = "walk_in"`）
- FR-9.4: 後日フォローアップメール送信可能

### FR-10: チェックイン統計
- FR-10.1: リアルタイムチェックイン状況表示
- FR-10.2: 表示項目:
  - 事前登録者数（現地/オンライン別）
  - チェックイン済み人数
  - 未チェックイン人数
  - 当日参加者数
  - チェックイン率（%）
- FR-10.3: 時系列グラフ（30分刻みでチェックイン数推移）
- FR-10.4: CSV出力機能（参加者リスト + チェックイン時刻）

### FR-11: AIコンシェルジュUI
- FR-11.1: ポータル右下に固定チャットウィジェット配置
- FR-11.2: クリックでチャット画面展開
- FR-11.3: 初回メッセージ: 「このイベントについて何でもお聞きください」
- FR-11.4: サジェスト質問表示:
  - 「会場の最寄駅は?」
  - 「Wi-Fiのパスワードは?」
  - 「タイムテーブルを教えて」
  - 「トイレはどこ?」
- FR-11.5: ユーザーが質問を入力 → Enterで送信
- FR-11.6: AI回答を吹き出しで表示（ストリーミング形式）

### FR-12: AIコンシェルジュコンテキスト
- FR-12.1: AIへの質問時、以下のコンテキストを自動付与:
  - イベント基本情報（名前・日時・会場住所・アクセス）
  - タイムテーブル
  - 登壇者情報
  - Wi-Fi情報
  - 配信URL
  - 主催者が登録した会場案内情報（トイレ・喫煙所・駐車場等）
- FR-12.2: コンテキストは JSON 形式でシステムプロンプトに埋め込み
- FR-12.3: ユーザーの質問をそのまま user メッセージとして送信

### FR-13: AI回答品質
- FR-13.1: 回答は簡潔で分かりやすい文体（です・ます調）
- FR-13.2: 会場案内は具体的な場所・階数を明記
- FR-13.3: タイムテーブルは時刻順に整形して回答
- FR-13.4: 情報がコンテキストにない場合は「申し訳ございませんが、その情報は登録されていません」と回答
- FR-13.5: エスカレーション: 主催者連絡先を提示

### FR-14: AI利用制限
- FR-14.1: 1参加者あたり30回/日までチャット可能（レート制限）
- FR-14.2: 制限超過時: 「本日の質問上限に達しました。主催者までお問い合わせください」
- FR-14.3: IPアドレスベースで制限（認証不要のため）

### FR-15: 多言語対応（将来拡張）
- FR-15.1: MVP: 日本語のみ
- FR-15.2: 将来: 英語・中国語対応（AIが質問言語を自動検知して同言語で回答）

### FR-16: アクセシビリティ
- FR-16.1: ポータルはWCAG 2.1 AA準拠
- FR-16.2: スクリーンリーダー対応
- FR-16.3: キーボード操作対応
- FR-16.4: カラーコントラスト比確保

### FR-17: セキュリティ
- FR-17.1: ポータルはrate limit適用（IP単位: 100req/min）
- FR-17.2: QRコードは推測不可能な形式（UUID + HMAC署名）
- FR-17.3: チェックインAPIは認証必須（staff/admin ロール）
- FR-17.4: XSS対策: ユーザー入力は全てサニタイズ

### FR-18: パフォーマンス
- FR-18.1: ポータル初回表示: 3秒以内（4G環境）
- FR-18.2: AIチャット応答: 2秒以内に最初のトークン返却（ストリーミング）
- FR-18.3: QRスキャン → チェックイン完了: 1秒以内

### FR-19: 通知
- FR-19.1: チェックイン完了時、参加者に確認メール送信（オプション）
- FR-19.2: イベント開始30分前、未チェックイン参加者にリマインドメール送信（オプション）

### FR-20: 運用機能
- FR-20.1: 管理画面で特定参加者のチェックイン記録を手動削除可能（誤操作時の救済）
- FR-20.2: チェックイン記録にメモ欄追加（スタッフが備考記入可能）
- FR-20.3: ポータルの公開/非公開切り替え

### §3-E. 入出力例 [CONTRACT]

| # | 操作 | エンドポイント | メソッド | 期待ステータス | 備考 |
|---|------|---------------|---------|---------------|------|
| 1 | 参加者ポータルトップ | `/api/v1/portal/events` | GET | 200 | 参加者が自身の参加イベント一覧を取得 |
| 2 | イベント詳細 | `/api/v1/portal/events/:id` | GET | 200 | ポータル上のイベント詳細情報を取得 |
| 3 | チェックイン | `/api/v1/portal/events/:id/checkin` | POST | 200 | QR/手動でチェックイン実行 |
| 4 | アンケート回答 | `/api/v1/portal/surveys/:id/responses` | POST | 201 | 参加者がアンケートに回答を送信 |
| 5 | アンケート取得 | `/api/v1/portal/surveys/:id` | GET | 200 | アンケートの設問・選択肢を取得 |
| 6 | プロフィール確認 | `/api/v1/portal/profile` | GET | 200 | 参加者自身のプロフィール情報を取得 |
| 7 | 参加キャンセル | `/api/v1/portal/events/:id/cancel` | POST | 200 | 参加者がイベント参加をキャンセル |
| 8 | 資料ダウンロード | `/api/v1/portal/events/:id/files` | GET | 200 | 公開資料の一覧・ダウンロードURLを取得 |

### §3-F. 境界値 [CONTRACT]

| 項目 | 制約 | 備考 |
|------|------|------|
| 回答テキスト | 最大 2,000 文字 | アンケート自由記述欄の上限 |
| チェックインコード | 6 文字固定 | 英数字（大文字）、手動入力用の短縮コード |
| アンケート設問数 | 最大 50 問 | 1アンケートあたりの設問上限 |
| ファイルサイズ | 最大 50 MB | 資料ダウンロード対象ファイルの上限 |

### §3-G. 例外レスポンス [CONTRACT]

| エラーコード | HTTPステータス | 発生条件 | レスポンス例 |
|-------------|---------------|---------|-------------|
| `VALIDATION_ERROR` | 400 | リクエストボディのバリデーション失敗（必須項目未入力、型不正等） | `{ "error": "VALIDATION_ERROR", "message": "入力内容に誤りがあります", "details": [...] }` |
| `NOT_FOUND` | 404 | 指定されたリソース（イベント、アンケート、参加者等）が存在しない | `{ "error": "NOT_FOUND", "message": "指定されたリソースが見つかりません" }` |
| `FORBIDDEN` | 403 | 権限不足（他人のプロフィール参照、非公開イベントへのアクセス等） | `{ "error": "FORBIDDEN", "message": "このリソースへのアクセス権限がありません" }` |
| `ALREADY_CHECKED_IN` | 409 | 同一参加者が同一イベントに対して2回目以降のチェックインを試行 | `{ "error": "ALREADY_CHECKED_IN", "message": "既にチェックイン済みです", "checked_in_at": "2026-03-15T08:30:00Z" }` |
| `SURVEY_CLOSED` | 400 | 回答期限が過ぎたアンケートへの回答を試行 | `{ "error": "SURVEY_CLOSED", "message": "このアンケートの回答期限は終了しています" }` |

### §3-H. 受け入れテスト（Gherkin） [CONTRACT]

```gherkin
Feature: 参加者ポータル & チェックイン & AIコンシェルジュ

  # --- ポータル閲覧 ---

  Scenario: 参加者がポータルトップでイベント一覧を確認する
    Given 参加者がログイン済みである
    And 参加者が2件のイベントに登録している
    When GET /api/v1/portal/events を実行する
    Then ステータスコード 200 が返る
    And レスポンスに2件のイベント情報が含まれる

  Scenario: 参加者がイベント詳細を表示する
    Given 参加者がイベント "evt_123" に登録済みである
    When GET /api/v1/portal/events/evt_123 を実行する
    Then ステータスコード 200 が返る
    And レスポンスにイベント名・日時・会場・タイムテーブルが含まれる

  Scenario: 非公開イベントの詳細表示が拒否される
    Given イベント "evt_999" は portal_published = false である
    When GET /api/v1/portal/events/evt_999 を実行する
    Then ステータスコード 404 が返る
    And エラーコード "NOT_FOUND" が返る

  # --- チェックイン ---

  Scenario: 有効なQRコードでチェックインに成功する
    Given 参加者 "prt_abc123" がイベント "evt_123" に登録済みである
    And 参加者はまだチェックインしていない
    When POST /api/v1/portal/events/evt_123/checkin を有効なQRコードで実行する
    Then ステータスコード 200 が返る
    And checkin テーブルにレコードが作成される
    And レスポンスに参加者名と組織名が含まれる

  Scenario: 同一参加者の重複チェックインが拒否される
    Given 参加者 "prt_abc123" は既にチェックイン済みである
    When POST /api/v1/portal/events/evt_123/checkin を実行する
    Then ステータスコード 409 が返る
    And エラーコード "ALREADY_CHECKED_IN" が返る
    And レスポンスに前回のチェックイン日時が含まれる

  # --- アンケート ---

  Scenario: 参加者がアンケートの設問を取得する
    Given アンケート "srv_001" が公開中である
    When GET /api/v1/portal/surveys/srv_001 を実行する
    Then ステータスコード 200 が返る
    And レスポンスに設問一覧と選択肢が含まれる

  Scenario: 参加者がアンケートに回答を送信する
    Given アンケート "srv_001" が公開中である
    And 参加者がまだ回答していない
    When POST /api/v1/portal/surveys/srv_001/responses を有効な回答で実行する
    Then ステータスコード 201 が返る
    And 回答がデータベースに保存される

  Scenario: 回答期限切れのアンケートへの回答が拒否される
    Given アンケート "srv_002" の回答期限は 2026-03-14 である
    And 現在日時は 2026-03-16 である
    When POST /api/v1/portal/surveys/srv_002/responses を実行する
    Then ステータスコード 400 が返る
    And エラーコード "SURVEY_CLOSED" が返る

  # --- プロフィール・キャンセル ---

  Scenario: 参加者が自身のプロフィールを確認する
    Given 参加者がログイン済みである
    When GET /api/v1/portal/profile を実行する
    Then ステータスコード 200 が返る
    And レスポンスに名前・メール・組織名が含まれる

  Scenario: 参加者がイベント参加をキャンセルする
    Given 参加者がイベント "evt_123" に登録済みである
    And イベントはまだ開始していない
    When POST /api/v1/portal/events/evt_123/cancel を実行する
    Then ステータスコード 200 が返る
    And registration_status が "cancelled" に更新される

  # --- 資料ダウンロード ---

  Scenario: 参加者が公開資料一覧を取得する
    Given イベント "evt_123" に3件の公開資料が登録されている
    When GET /api/v1/portal/events/evt_123/files を実行する
    Then ステータスコード 200 が返る
    And レスポンスに3件の資料情報とダウンロードURLが含まれる

  # --- バリデーション ---

  Scenario: アンケート回答が2000文字を超えた場合にエラーになる
    Given アンケート "srv_001" が公開中である
    When POST /api/v1/portal/surveys/srv_001/responses を2001文字の回答テキストで実行する
    Then ステータスコード 400 が返る
    And エラーコード "VALIDATION_ERROR" が返る
```

---

## §4. データモデル [CONTRACT]

### participant テーブル

```typescript
{
  id: string; // UUID
  event_id: string; // FK: events.id
  name: string;
  email: string;
  organization: string | null;
  job_title: string | null;
  phone: string | null;
  participation_type: 'onsite' | 'online'; // 参加形態
  registration_status: 'registered' | 'confirmed' | 'cancelled'; // 申込ステータス
  qr_code: string; // ユニークQRコード文字列（Base64エンコード済み）
  created_at: Date;
  updated_at: Date;
}
```

**Index**:
- `event_id` (複合検索用)
- `email` (重複チェック用)
- `qr_code` (UNIQUE, チェックイン時の検索用)

**Business Rules**:
- `qr_code` は `participant_id` + `event_id` + タイムスタンプをHMAC署名してBase64エンコード
- `email` は同一イベント内で重複不可
- `participation_type` が `online` の場合、QRチェックインは不要（ただし登録は可能）

### checkin テーブル

```typescript
{
  id: string; // UUID
  participant_id: string; // FK: participants.id
  event_id: string; // FK: events.id
  checked_in_at: Date; // チェックイン日時
  method: 'qr' | 'manual' | 'walk_in'; // チェックイン方法
  checked_in_by: string | null; // FK: users.id (スタッフ)
  notes: string | null; // 備考
  created_at: Date;
}
```

**Index**:
- `participant_id` (UNIQUE, 重複チェックイン防止)
- `event_id` (統計クエリ用)
- `checked_in_at` (時系列分析用)

**Business Rules**:
- `participant_id` は1回のみチェックイン可能（UNIQUE制約）
- `method = 'walk_in'` の場合、`participant` レコードも同時作成

### event テーブル（既存）拡張

```typescript
{
  // 既存フィールド...
  portal_slug: string; // UNIQUE, ポータルURL用スラッグ
  portal_published: boolean; // ポータル公開状態
  wifi_ssid: string | null; // Wi-Fi SSID
  wifi_password: string | null; // Wi-Fi パスワード
  venue_info: JSON | null; // 会場案内情報（トイレ・喫煙所等）
  // 例: { parking: "地下駐車場あり", restrooms: "2F・3F", smoking_area: "1F屋外" }
}
```

---

## §5. API仕様 [CONTRACT]

### 5.1 Public API（認証不要）

#### GET /api/v1/portal/:slug

ポータル情報取得

**Request**:
```http
GET /api/v1/portal/event-2026-tech-summit-a3f9
```

**Response** (200):
```json
{
  "event": {
    "id": "evt_123",
    "name": "Tech Summit 2026",
    "description": "最新技術トレンドを学ぶ",
    "start_date": "2026-03-15T09:00:00Z",
    "end_date": "2026-03-15T18:00:00Z",
    "format": "hybrid",
    "venue": {
      "name": "渋谷コンファレンスセンター",
      "address": "東京都渋谷区...",
      "access": "JR渋谷駅から徒歩5分",
      "map_url": "https://maps.google.com/...",
      "parking": "地下駐車場あり（有料）",
      "restrooms": "各階にあり",
      "smoking_area": "1F屋外"
    },
    "wifi": {
      "ssid": "TechSummit2026",
      "password": "summit2026!"
    },
    "streaming_url": "https://zoom.us/j/123456789",
    "organizer": {
      "name": "株式会社テックイベント",
      "email": "info@techevents.com",
      "phone": "03-1234-5678"
    }
  },
  "schedule": [
    {
      "id": "sess_1",
      "title": "AIの未来",
      "start_time": "2026-03-15T10:00:00Z",
      "end_time": "2026-03-15T11:00:00Z",
      "speaker": {
        "name": "山田太郎",
        "organization": "AI研究所",
        "bio": "AI研究の第一人者"
      }
    }
  ],
  "speakers": [
    {
      "id": "spk_1",
      "name": "山田太郎",
      "organization": "AI研究所",
      "bio": "...",
      "photo_url": "https://..."
    }
  ],
  "materials": [
    {
      "id": "mat_1",
      "title": "資料1.pdf",
      "download_url": "https://..."
    }
  ]
}
```

**Error** (404):
```json
{
  "error": "PORTAL_NOT_FOUND",
  "message": "ポータルが見つかりません"
}
```

#### POST /api/v1/portal/:slug/register

参加申込

**Request**:
```json
{
  "name": "鈴木花子",
  "email": "hanako@example.com",
  "organization": "株式会社サンプル",
  "job_title": "エンジニア",
  "phone": "090-1234-5678",
  "participation_type": "onsite"
}
```

**Response** (201):
```json
{
  "participant_id": "prt_abc123",
  "qr_code": "eyJwYXJ0aWNpcGFudF9pZCI6InBydF9hYmMxMjMi...",
  "message": "申込が完了しました。確認メールをご確認ください。"
}
```

**Error** (400):
```json
{
  "error": "DUPLICATE_EMAIL",
  "message": "このメールアドレスは既に登録されています"
}
```

**Business Rules**:
- 同一イベント内で同じメールアドレスでの重複登録は不可
- `participation_type` は `onsite` または `online`
- 登録完了後、確認メール送信（受付票PDF添付）

#### GET /api/v1/portal/:slug/speakers

登壇者一覧取得

**Response** (200):
```json
{
  "speakers": [
    {
      "id": "spk_1",
      "name": "山田太郎",
      "organization": "AI研究所",
      "bio": "...",
      "photo_url": "https://...",
      "sessions": ["sess_1"]
    }
  ]
}
```

#### GET /api/v1/portal/:slug/schedule

タイムテーブル取得

**Response** (200):
```json
{
  "schedule": [
    {
      "id": "sess_1",
      "title": "AIの未来",
      "start_time": "2026-03-15T10:00:00Z",
      "end_time": "2026-03-15T11:00:00Z",
      "speaker_id": "spk_1",
      "location": "メインホール"
    }
  ]
}
```

### 5.2 Authenticated API（staff/admin ロール必須）

#### POST /api/v1/events/:eid/checkins/qr

QRコードチェックイン

**Request**:
```json
{
  "qr_code": "eyJwYXJ0aWNpcGFudF9pZCI6InBydF9hYmMxMjMi..."
}
```

**Response** (201):
```json
{
  "checkin_id": "chk_xyz789",
  "participant": {
    "id": "prt_abc123",
    "name": "鈴木花子",
    "organization": "株式会社サンプル",
    "participation_type": "onsite"
  },
  "checked_in_at": "2026-03-15T08:45:00Z"
}
```

**Error** (400 - 既にチェックイン済み):
```json
{
  "error": "ALREADY_CHECKED_IN",
  "message": "この参加者は既にチェックイン済みです",
  "checked_in_at": "2026-03-15T08:30:00Z"
}
```

**Error** (404 - 無効なQR):
```json
{
  "error": "INVALID_QR_CODE",
  "message": "QRコードが無効です"
}
```

**Error** (403 - 別イベントのQR):
```json
{
  "error": "WRONG_EVENT",
  "message": "このQRコードは別のイベントのものです"
}
```

**Business Rules**:
- QRコードをデコードして `participant_id` と `event_id` を抽出
- `event_id` がリクエストの `:eid` と一致するか検証
- HMAC署名検証
- 既に `checkin` レコードが存在する場合はエラー

#### POST /api/v1/events/:eid/checkins/manual

手動チェックイン

**Request**:
```json
{
  "participant_id": "prt_abc123"
}
```

**Response** (201):
```json
{
  "checkin_id": "chk_xyz789",
  "participant": {
    "id": "prt_abc123",
    "name": "鈴木花子",
    "organization": "株式会社サンプル"
  },
  "checked_in_at": "2026-03-15T08:45:00Z"
}
```

#### POST /api/v1/events/:eid/checkins/walk-in

当日参加者登録 + チェックイン

**Request**:
```json
{
  "name": "田中次郎",
  "email": "jiro@example.com",
  "organization": "フリーランス",
  "participation_type": "onsite"
}
```

**Response** (201):
```json
{
  "participant_id": "prt_def456",
  "checkin_id": "chk_uvw123",
  "checked_in_at": "2026-03-15T09:00:00Z"
}
```

**Business Rules**:
- `participant` レコードと `checkin` レコードを同時作成
- `checkin.method = 'walk_in'`
- QRコードは生成するが、メール送信はしない（オプションで後日送信可能）

#### GET /api/v1/events/:eid/checkins/stats

チェックイン統計

**Response** (200):
```json
{
  "total_registered": 150,
  "checked_in": 87,
  "not_checked_in": 63,
  "walk_in": 12,
  "checkin_rate": 58.0,
  "by_participation_type": {
    "onsite": {
      "registered": 100,
      "checked_in": 60
    },
    "online": {
      "registered": 50,
      "checked_in": 27
    }
  },
  "timeline": [
    {
      "time": "2026-03-15T08:00:00Z",
      "count": 5
    },
    {
      "time": "2026-03-15T08:30:00Z",
      "count": 15
    }
  ]
}
```

#### GET /api/v1/events/:eid/participants

参加者一覧取得（検索・フィルタ機能付き）

**Query Parameters**:
- `q`: 検索キーワード（名前・メール・組織名で部分一致）
- `participation_type`: フィルタ（onsite/online）
- `registration_status`: フィルタ（registered/confirmed/cancelled）
- `checked_in`: フィルタ（true/false）

**Response** (200):
```json
{
  "participants": [
    {
      "id": "prt_abc123",
      "name": "鈴木花子",
      "email": "hanako@example.com",
      "organization": "株式会社サンプル",
      "participation_type": "onsite",
      "registration_status": "confirmed",
      "checked_in": true,
      "checked_in_at": "2026-03-15T08:45:00Z"
    }
  ],
  "total": 150
}
```

#### DELETE /api/v1/events/:eid/checkins/:cid

チェックイン記録削除（誤操作時の救済）

**Response** (204): No Content

**Business Rules**:
- admin ロールのみ実行可能
- 削除理由をログに記録

### 5.3 AI Chat API

#### POST /api/v1/ai/chat

AIコンシェルジュチャット

**Request**:
```json
{
  "event_id": "evt_123",
  "usecase": "faq",
  "messages": [
    {
      "role": "user",
      "content": "会場の最寄駅はどこですか?"
    }
  ]
}
```

**Response** (200 - Streaming):
```
data: {"type":"text","text":"会場の最寄駅は"}
data: {"type":"text","text":"JR渋谷駅"}
data: {"type":"text","text":"です。"}
data: {"type":"text","text":"徒歩5分です。"}
data: [DONE]
```

**Response** (200 - Non-streaming):
```json
{
  "message": {
    "role": "assistant",
    "content": "会場の最寄駅はJR渋谷駅です。徒歩5分です。"
  }
}
```

**Business Rules**:
- `usecase: "faq"` の場合、イベント情報をコンテキストに埋め込み
- システムプロンプト: 「あなたはイベント参加者向けのコンシェルジュです。以下の情報に基づいて回答してください: [イベント情報JSON]」
- 回答は簡潔で分かりやすく（150文字以内推奨）
- コンテキストにない情報は「登録されていません」と回答
- レート制限: IP単位30回/日

---

## §6. UI/UX仕様 [DETAIL]

### 6.1 参加者ポータル（Mobile First）

**レイアウト構成**:

```
┌─────────────────────────────┐
│ Header                      │
│ [イベント名]                │
│ 2026/03/15 (土) 09:00-18:00│
├─────────────────────────────┤
│ Hero Image                  │
│ [イベントビジュアル]        │
├─────────────────────────────┤
│ Quick Access                │
│ [Wi-Fi] [配信URL] [地図]   │
├─────────────────────────────┤
│ イベント概要                │
│ [説明文]                    │
├─────────────────────────────┤
│ タイムテーブル              │
│ 10:00 - 11:00               │
│ [セッション1]               │
│ 登壇者: 山田太郎            │
│ ―――――――――――――――――          │
│ 11:00 - 12:00               │
│ [セッション2]               │
├─────────────────────────────┤
│ 登壇者紹介                  │
│ [写真] 山田太郎             │
│ AI研究所                    │
├─────────────────────────────┤
│ 会場案内                    │
│ [地図]                      │
│ 住所: 東京都渋谷区...       │
│ アクセス: JR渋谷駅徒歩5分   │
│ 駐車場: 地下駐車場あり      │
│ トイレ: 各階                │
├─────────────────────────────┤
│ 資料ダウンロード            │
│ [PDF] 資料1.pdf             │
│ [PDF] 資料2.pdf             │
├─────────────────────────────┤
│ お問い合わせ                │
│ 主催: 株式会社テックイベント│
│ Email: info@techevents.com  │
├─────────────────────────────┤
│ [AIチャットウィジェット]    │ ← 右下固定
│ 💬                          │
└─────────────────────────────┘
```

**デザインガイドライン**:
- フォント: システムフォント（-apple-system, BlinkMacSystemFont, "Segoe UI"）
- カラー: プライマリ（ブルー系）、セカンダリ（グレー系）
- スペーシング: 16px基準（8px刻み）
- タップターゲット: 最小44x44px
- 画像: WebP形式、遅延読み込み

**アクセシビリティ**:
- セマンティックHTML使用
- alt属性必須
- フォーカスインジケーター明示
- カラーコントラスト比 4.5:1以上

### 6.2 QRスキャン画面（スタッフ用）

```
┌─────────────────────────────┐
│ チェックイン - Tech Summit  │
├─────────────────────────────┤
│ [カメラプレビュー]          │
│                             │
│   ┌─────────────┐           │
│   │             │           │
│   │   QRコード  │           │
│   │  をスキャン │           │
│   │             │           │
│   └─────────────┘           │
│                             │
│ カメラをQRコードに向けて    │
│ ください                    │
├─────────────────────────────┤
│ [手動チェックインに切替]    │
├─────────────────────────────┤
│ 本日のチェックイン状況      │
│ ━━━━━━━━━━━━━━━━━━━━━━━   │
│ 87 / 150 人 (58%)          │
│ 当日参加: 12人              │
└─────────────────────────────┘
```

**チェックイン成功時のフィードバック**:
- 全画面グリーン背景フラッシュ
- ✅ アイコン + 「チェックイン完了」
- 参加者名・組織名表示
- 効果音再生（ピコン）
- 2秒後に自動的にスキャン画面に戻る

**チェックイン失敗時のフィードバック**:
- 全画面レッド背景フラッシュ
- ❌ アイコン + エラーメッセージ
- 警告音再生
- [再試行] ボタン表示

### 6.3 手動チェックイン画面

```
┌─────────────────────────────┐
│ 手動チェックイン            │
├─────────────────────────────┤
│ [検索] 名前・メール・組織名 │
│ ┌─────────────────────────┐ │
│ │ 🔍 鈴木                  │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ 検索結果 (3件)              │
│ ―――――――――――――――――          │
│ ☐ 鈴木花子                  │
│    株式会社サンプル         │
│    hanako@example.com       │
│    [チェックイン]           │
│ ―――――――――――――――――          │
│ ☑ 鈴木太郎 (済)             │
│    08:30チェックイン済み    │
│ ―――――――――――――――――          │
│ ☐ 鈴木一郎                  │
│    個人                     │
│    [チェックイン]           │
└─────────────────────────────┘
```

### 6.4 当日参加者登録画面

```
┌─────────────────────────────┐
│ 当日参加者登録              │
├─────────────────────────────┤
│ 名前 *                      │
│ ┌─────────────────────────┐ │
│ │                         │ │
│ └─────────────────────────┘ │
│                             │
│ メールアドレス *            │
│ ┌─────────────────────────┐ │
│ │                         │ │
│ └─────────────────────────┘ │
│                             │
│ 組織名                      │
│ ┌─────────────────────────┐ │
│ │                         │ │
│ └─────────────────────────┘ │
│                             │
│ 参加形態 *                  │
│ ◉ 現地参加                  │
│ ○ オンライン参加            │
├─────────────────────────────┤
│ [登録してチェックイン]      │
└─────────────────────────────┘
```

### 6.5 AIチャットウィジェット

**閉じた状態**:
```
┌─────┐
│ 💬  │ ← 右下固定、常に表示
└─────┘
```

**開いた状態**:
```
┌─────────────────────────────┐
│ イベントコンシェルジュ   [×]│
├─────────────────────────────┤
│ 🤖 このイベントについて     │
│    何でもお聞きください     │
├─────────────────────────────┤
│ よくある質問                │
│ [会場の最寄駅は?]           │
│ [Wi-Fiのパスワードは?]      │
│ [タイムテーブルを教えて]    │
│ [トイレはどこ?]             │
├─────────────────────────────┤
│ 👤 会場の最寄駅は?          │
│                             │
│ 🤖 会場の最寄駅はJR渋谷駅   │
│    です。徒歩5分です。      │
├─────────────────────────────┤
│ [メッセージを入力...] [送信]│
└─────────────────────────────┘
```

**デザイン**:
- 幅: 320px（モバイル）、400px（デスクトップ）
- 高さ: 500px（最大）
- 吹き出し: ユーザー（右寄せ・ブルー）、AI（左寄せ・グレー）
- スクロール: 自動スクロール（最新メッセージ）
- ストリーミング: タイピングアニメーション

---

## §7. ビジネスルール [DETAIL]

### BR-1: QRコード生成ルール
- フォーマット: `participant_id` + `event_id` + `timestamp` を連結
- HMAC-SHA256署名（秘密鍵: `process.env.QR_SECRET_KEY`）
- Base64エンコード
- 例: `eyJwYXJ0aWNpcGFudF9pZCI6InBydF9hYmMxMjMiLCJldmVudF9pZCI6ImV2dF8xMjMiLCJ0aW1lc3RhbXAiOjE3MDk5NjY0MDAsInNpZ25hdHVyZSI6IjEyM2FiYyJ9`

### BR-2: QRコード検証ルール
1. Base64デコード
2. HMAC署名検証
3. `event_id` が現在のイベントと一致するか確認
4. タイムスタンプが有効期限内か確認（デフォルト: 30日間）
5. `participant_id` が存在するか確認
6. 既にチェックイン済みでないか確認

### BR-3: 重複チェックイン防止
- `checkin.participant_id` にUNIQUE制約
- INSERT時にエラーが発生した場合、`ALREADY_CHECKED_IN` エラーを返す
- 既存の `checked_in_at` を含めてエラーメッセージに含める

### BR-4: ポータル公開ルール
- デフォルト: `portal_published = false`
- 主催者が明示的に公開設定を行うまで、ポータルはアクセス不可（404）
- イベント終了後も `portal_published = true` の場合はアクセス可能（アーカイブモード）

### BR-5: AIコンテキスト範囲
- システムプロンプトに含める情報:
  - イベント基本情報（名前・日時・会場・説明）
  - タイムテーブル（全セッション）
  - 登壇者情報（名前・所属・プロフィール）
  - 会場案内情報（`event.venue_info` JSON）
  - Wi-Fi情報（SSID・パスワード）
  - 配信URL
  - 主催者連絡先
- ユーザーの個人情報（参加者リスト等）は**含めない**

### BR-6: AI回答ポリシー
- 回答は簡潔（150文字以内推奨）
- コンテキストにない情報は推測しない
- 主観的な評価・推奨は行わない
- エスカレーション: 「詳細は主催者までお問い合わせください: [連絡先]」

### BR-7: レート制限
- ポータルAPI: IP単位 100req/min
- AIチャットAPI: IP単位 30回/日
- チェックインAPI: ユーザー単位 60req/min
- 超過時: 429 Too Many Requests

### BR-8: メール送信タイミング
- 参加申込完了時: 確認メール（受付票PDF添付）
- イベント前日: リマインドメール（ポータルURL含む）
- イベント開始30分前: 未チェックイン者へリマインド（オプション）
- チェックイン完了時: 確認メール（オプション）

### BR-9: 受付票PDF生成
- テンプレート: HTML + CSS
- 含める情報: イベント名、参加者名、QRコード画像、日時、会場、注意事項
- QRコード画像: PNG形式、300x300px
- PDF変換: Puppeteer使用
- ファイル名: `ticket_[participant_id].pdf`

### BR-10: データ保持ポリシー
- イベント終了後1年間はデータ保持
- 1年後、主催者に削除確認メール送信
- 削除承認後、参加者情報を匿名化（名前・メール等を削除、統計データのみ保持）

---

## §8. 非機能要件 [DETAIL]

### パフォーマンス
- ポータル初回表示: 3秒以内（4G環境、Lighthouse Performance Score 80+）
- AIチャット応答: 最初のトークン返却まで2秒以内
- QRスキャン → チェックイン完了: 1秒以内
- チェックイン統計API: 500ms以内

### スケーラビリティ
- 同時接続数: 1000ユーザー
- 同時チェックイン処理: 50req/秒
- データベース: Read Replica使用（統計クエリ）

### セキュリティ
- QRコード: HMAC-SHA256署名
- API: Rate Limiting（express-rate-limit）
- XSS対策: DOMPurify使用
- CSRF対策: Better Auth組み込み機能使用
- SQL Injection対策: Drizzle ORMのパラメータバインディング

### 可用性
- SLA: 99.5%（月間ダウンタイム3.6時間以内）
- ヘルスチェック: `/api/health` エンドポイント
- エラー監視: Sentry統合

### 監視・ログ
- アクセスログ: Nginx
- アプリケーションログ: Winston（構造化ログ）
- メトリクス: チェックイン数、AIチャット利用数、エラー率
- アラート: チェックインAPI障害、AI応答遅延

---

## §9. 依存関係 [DETAIL]

### 前提機能
- EVT-001: イベント基本情報管理
- EVT-011: タイムテーブル管理
- COMMON-AUTH: 認証基盤（スタッフ用画面）
- CROSS-AI: AI抽象化レイヤー

### 外部サービス
- Google Maps API: 会場地図埋め込み
- SendGrid: メール送信
- Anthropic API: AIチャット（Claude）
- Puppeteer: PDF生成

### 技術的依存
- `qrcode`: QRコード画像生成
- `jsQR`: QRコードデコード（ブラウザ側）
- `@anthropic-ai/sdk`: Claude API SDK
- `ai`: Vercel AI SDK（ストリーミング）
- `puppeteer`: PDF生成

---

## §10. テストケース [DETAIL]

### 10.1 ポータル表示

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| T-PORTAL-001 | 有効な `portal_slug` でアクセス | イベント情報が表示される |
| T-PORTAL-002 | 無効な `portal_slug` でアクセス | 404エラー |
| T-PORTAL-003 | `portal_published = false` のポータルにアクセス | 404エラー |
| T-PORTAL-004 | イベント情報更新後、ポータル再読み込み | 更新内容が反映される |
| T-PORTAL-005 | スマホ（375px幅）で表示 | レスポンシブレイアウト正常 |
| T-PORTAL-006 | イベント終了後のポータルアクセス | アーカイブモードで表示 |
| T-PORTAL-007 | OGP設定確認（SNSシェア時） | タイトル・画像が正しく表示 |

### 10.2 参加申込

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| T-REG-001 | 有効な情報で申込 | 201 Created、確認メール送信 |
| T-REG-002 | 必須項目未入力で申込 | 400 Bad Request |
| T-REG-003 | 同じメールアドレスで2回申込 | 400 Duplicate Email |
| T-REG-004 | `participation_type` に無効な値 | 400 Bad Request |
| T-REG-005 | 申込完了後、受付票PDF受信 | PDF内にQRコード画像あり |
| T-REG-006 | 申込後、`participant` レコード作成確認 | DBに正しく保存 |
| T-REG-007 | 申込後、`qr_code` 生成確認 | UNIQUE値が生成される |

### 10.3 QRチェックイン

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| T-QR-001 | 有効なQRコードでチェックイン | 201 Created、チェックイン完了 |
| T-QR-002 | 無効なQRコード（改ざん） | 404 Invalid QR Code |
| T-QR-003 | 別イベントのQRコード | 403 Wrong Event |
| T-QR-004 | 既にチェックイン済みのQRコード | 400 Already Checked In |
| T-QR-005 | 有効期限切れQRコード | 400 Expired QR Code |
| T-QR-006 | QRスキャン成功時のUI | グリーンフラッシュ + 参加者名表示 |
| T-QR-007 | QRスキャン失敗時のUI | レッドフラッシュ + エラー表示 |
| T-QR-008 | チェックイン後、統計に反映 | チェックイン数+1 |

### 10.4 手動チェックイン

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| T-MANUAL-001 | 名前で検索 | 部分一致で候補表示 |
| T-MANUAL-002 | メールアドレスで検索 | 完全一致で候補表示 |
| T-MANUAL-003 | 検索結果から選択してチェックイン | 201 Created |
| T-MANUAL-004 | 既にチェックイン済みの参加者を選択 | 「チェックイン済み」表示 |
| T-MANUAL-005 | 検索結果0件 | 「該当者なし」表示 |

### 10.5 当日参加者登録

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| T-WALKIN-001 | 有効な情報で登録 | `participant` + `checkin` 作成 |
| T-WALKIN-002 | 必須項目未入力 | 400 Bad Request |
| T-WALKIN-003 | 登録後、統計に反映 | 当日参加者数+1 |
| T-WALKIN-004 | 登録後、QRコード生成 | `qr_code` カラムに値あり |

### 10.6 チェックイン統計

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| T-STATS-001 | 統計API呼び出し | 正しい数値が返る |
| T-STATS-002 | チェックイン実行後、統計再取得 | 即座に反映される |
| T-STATS-003 | 時系列グラフデータ | 30分刻みで集計される |
| T-STATS-004 | CSV出力 | 全参加者データが含まれる |

### 10.7 AIコンシェルジュ

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| T-AI-001 | 「最寄駅は?」と質問 | 会場の最寄駅情報を回答 |
| T-AI-002 | 「Wi-Fiのパスワードは?」と質問 | Wi-Fiパスワードを回答 |
| T-AI-003 | 「タイムテーブルは?」と質問 | セッション一覧を時刻順に回答 |
| T-AI-004 | 「トイレはどこ?」と質問 | 会場案内情報を回答 |
| T-AI-005 | コンテキストにない情報を質問 | 「登録されていません」と回答 |
| T-AI-006 | 30回以上質問（レート制限） | 429 Too Many Requests |
| T-AI-007 | ストリーミング応答 | リアルタイムでテキスト表示 |
| T-AI-008 | エスカレーション導線 | 主催者連絡先が表示される |

### 10.8 権限・認証

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| T-AUTH-001 | スタッフロールでチェックインAPI | 200 OK |
| T-AUTH-002 | 一般ユーザーでチェックインAPI | 403 Forbidden |
| T-AUTH-003 | 未認証でチェックインAPI | 401 Unauthorized |
| T-AUTH-004 | AdminロールでCSV出力 | 200 OK |
| T-AUTH-005 | スタッフロールでCSV出力 | 200 OK |

### 10.9 パフォーマンス

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| T-PERF-001 | ポータル初回表示時間（4G） | 3秒以内 |
| T-PERF-002 | AIチャット応答時間 | 2秒以内（最初のトークン） |
| T-PERF-003 | QRチェックイン処理時間 | 1秒以内 |
| T-PERF-004 | 統計API応答時間 | 500ms以内 |
| T-PERF-005 | 同時50QRスキャン | エラーなく処理完了 |

### 10.10 エラーハンドリング

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| T-ERR-001 | DB接続エラー時 | 500エラー、ログ記録 |
| T-ERR-002 | AI API障害時 | エラーメッセージ + 主催者連絡先表示 |
| T-ERR-003 | メール送信失敗時 | ログ記録、リトライキュー登録 |
| T-ERR-004 | QRコード生成失敗時 | 500エラー、管理者通知 |
| T-ERR-005 | 不正なリクエストボディ | 400 Bad Request + 詳細エラー |

---

## §11. 実装ガイド [DETAIL]

### 11.1 ディレクトリ構成

```
server/
├── api/
│   └── v1/
│       ├── portal/
│       │   └── [slug]/
│       │       ├── index.get.ts        # ポータル情報取得
│       │       ├── register.post.ts     # 参加申込
│       │       ├── speakers.get.ts      # 登壇者一覧
│       │       └── schedule.get.ts      # タイムテーブル
│       └── events/
│           └── [eid]/
│               ├── checkins/
│               │   ├── qr.post.ts       # QRチェックイン
│               │   ├── manual.post.ts   # 手動チェックイン
│               │   ├── walk-in.post.ts  # 当日参加者登録
│               │   └── stats.get.ts     # 統計
│               └── participants/
│                   └── index.get.ts     # 参加者一覧
├── utils/
│   ├── qr.ts                            # QRコード生成・検証
│   ├── pdf.ts                           # 受付票PDF生成
│   └── ai/
│       └── concierge.ts                 # AIコンシェルジュ
└── database/
    └── schema/
        ├── participants.ts
        └── checkins.ts

pages/
├── portal/
│   └── [slug].vue                       # 参加者ポータル
└── staff/
    └── events/
        └── [eid]/
            └── checkin.vue              # スタッフチェックイン画面

components/
├── portal/
│   ├── EventHero.vue                    # ヒーローセクション
│   ├── QuickAccess.vue                  # クイックアクセス
│   ├── TimeTable.vue                    # タイムテーブル
│   ├── SpeakerList.vue                  # 登壇者一覧
│   ├── VenueMap.vue                     # 会場地図
│   └── AIChatWidget.vue                 # AIチャット
└── checkin/
    ├── QRScanner.vue                    # QRスキャナー
    ├── ManualCheckin.vue                # 手動チェックイン
    ├── WalkInRegistration.vue           # 当日参加者登録
    └── CheckinStats.vue                 # チェックイン統計
```

### 11.2 実装優先順位

**Phase 1: ポータル基本機能（Week 1）**
1. `event.portal_slug` カラム追加 + マイグレーション
2. `participant` / `checkin` テーブル作成
3. ポータルAPI実装（GET /api/v1/portal/:slug）
4. ポータルページUI実装（/portal/[slug].vue）
5. 参加申込API実装（POST /api/v1/portal/:slug/register）

**Phase 2: QRチェックイン（Week 2）**
1. QRコード生成・検証ロジック実装（server/utils/qr.ts）
2. 受付票PDF生成実装（server/utils/pdf.ts）
3. チェックインAPI実装（POST /api/v1/events/:eid/checkins/qr）
4. QRスキャナーUI実装（components/checkin/QRScanner.vue）
5. 手動チェックイン・当日参加者登録実装

**Phase 3: AIコンシェルジュ（Week 3）**
1. AIコンシェルジュAPI実装（POST /api/v1/ai/chat）
2. コンテキスト生成ロジック実装
3. チャットウィジェットUI実装（components/portal/AIChatWidget.vue）
4. ストリーミング応答対応
5. レート制限実装

**Phase 4: 統計・運用機能（Week 4）**
1. チェックイン統計API実装
2. 統計ダッシュボードUI実装
3. CSV出力機能
4. メール送信（確認・リマインド）
5. エラーハンドリング・ログ

### 11.3 QRコード生成サンプル

```typescript
// server/utils/qr.ts
import crypto from 'crypto';
import QRCode from 'qrcode';

const QR_SECRET_KEY = process.env.QR_SECRET_KEY!;

export interface QRPayload {
  participant_id: string;
  event_id: string;
  timestamp: number;
}

export function generateQRCode(payload: QRPayload): string {
  const data = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', QR_SECRET_KEY)
    .update(data)
    .digest('hex');

  const signedPayload = { ...payload, signature };
  return Buffer.from(JSON.stringify(signedPayload)).toString('base64');
}

export function verifyQRCode(qrCode: string): QRPayload | null {
  try {
    const decoded = JSON.parse(
      Buffer.from(qrCode, 'base64').toString('utf-8')
    );

    const { signature, ...payload } = decoded;
    const expectedSignature = crypto
      .createHmac('sha256', QR_SECRET_KEY)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSignature) {
      return null; // 署名不一致
    }

    // 有効期限チェック（30日間）
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - payload.timestamp > thirtyDaysInMs) {
      return null; // 期限切れ
    }

    return payload as QRPayload;
  } catch {
    return null;
  }
}

export async function generateQRCodeImage(
  qrCode: string
): Promise<Buffer> {
  return await QRCode.toBuffer(qrCode, {
    width: 300,
    margin: 2,
  });
}
```

### 11.4 AIコンシェルジュサンプル

```typescript
// server/utils/ai/concierge.ts
import { anthropic } from '~/server/utils/ai';
import { streamText } from 'ai';

interface EventContext {
  event_id: string;
  name: string;
  venue: object;
  schedule: array;
  speakers: array;
  // ...
}

export async function chatWithConcierge(
  context: EventContext,
  userMessage: string
) {
  const systemPrompt = `
あなたは「${context.name}」のイベントコンシェルジュです。
参加者からの質問に、以下の情報に基づいて簡潔に回答してください。

【イベント情報】
${JSON.stringify(context, null, 2)}

【回答ルール】
- 簡潔で分かりやすく（150文字以内推奨）
- 上記情報にない内容は「登録されていません」と回答
- 主観的な評価は避ける
- 詳細が必要な場合は主催者連絡先を案内
`;

  return streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });
}
```

---

## §12. 未決定事項・制約 [CONTRACT]

### 未決定事項

| # | 項目 | 内容 | 影響範囲 | 期限 | ステータス |
|---|------|------|---------|------|-----------|
| TBD-1 | アンケート機能の詳細設計 | 設問タイプ（単一選択/複数選択/自由記述/評価スケール）の完全な定義、回答集計・可視化仕様が未策定 | §3-E #4/#5, §3-H アンケート関連シナリオ | 2026-02-28 | Open |
| TBD-2 | 参加キャンセルポリシー | キャンセル可能期限（イベント何日前まで可能か）、キャンセル後の再登録可否、キャンセル時のメール通知内容が未確定 | §3-E #7, FR-4 | 2026-02-28 | Open |
| TBD-3 | 資料ファイルのストレージ方式 | S3互換ストレージ vs ローカルファイルシステム、署名付きURL方式 vs 直接配信、CDN利用有無が未決定 | §3-E #8, §3-F ファイルサイズ | 2026-03-07 | Open |
| TBD-4 | チェックインコードの用途と生成ルール | 6文字固定コードとQRコードの使い分け（QR読取不可時のフォールバック想定）、文字種（英数大文字のみ or 数字のみ）の確定 | §3-F チェックインコード, FR-6/FR-8 | 2026-02-21 | Open |
| TBD-5 | ポータル認証方式の詳細 | 参加者向けポータルAPIにおける認証方式（マジックリンク / トークンベース / セッション）、未登録ユーザーのアクセス範囲の確定 | §3-E #6, FR-1.3, FR-17 | 2026-02-21 | Open |

### 既知の制約

| # | 制約 | 理由 | 影響 |
|---|------|------|------|
| C-1 | AIコンシェルジュは日本語のみ対応（MVP） | 多言語プロンプト設計・検証の工数確保が困難 | FR-15.1 に準拠。英語圏の参加者には主催者連絡先を案内 |
| C-2 | QRコード有効期限は生成から30日間固定 | BR-2 の有効期限ロジック。イベント日程に連動した動的制御は将来拡張 | 30日以上前に申込した参加者のQRが失効する可能性あり |
| C-3 | 同時チェックイン処理は50req/秒が上限 | VPS 単体構成における DB 書き込み性能の制約 | 大規模イベント（500人以上の一斉チェックイン）で遅延が発生する可能性 |
| C-4 | 受付票PDF生成は Puppeteer に依存 | サーバーサイドPDF生成の技術選定。コンテナ環境でのヘッドレスブラウザ運用が前提 | Docker イメージサイズ増大、メモリ消費に注意が必要 |
| C-5 | ポータルのオフライン対応は対象外 | PWA / Service Worker の実装は MVP スコープ外 | ネットワーク切断時はポータル閲覧・AIチャット不可 |

---

## §13. 変更履歴 [DETAIL]

| 日付 | バージョン | 変更内容 | 変更者 |
|------|-----------|---------|--------|
| 2026-02-09 | 1.0 | 初版作成 | Claude |
| 2026-02-09 | 1.1 | §3-E/F/G/H（入出力例・境界値・例外レスポンス・受け入れテスト）追加、§12 未決定事項・制約セクション追加 | Claude |
