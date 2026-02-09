# EVT-040: イベントサマリーレポートAI自動生成

**機能ID**: EVT-040
**機能名**: イベントサマリーレポートAI自動生成
**優先度**: P1（MVP必須）
**ステータス**: 設計完了
**最終更新**: 2026-02-09

---

## §1. 機能概要 [CORE]

### 目的

イベント終了後に、開催データ・参加者データ・アンケート・質問内容を自動集約し、AIが要約・分析した「サマリーレポート」を生成。主催者・営業・会場が次回企画や社内共有に即使えるドキュメントを自動作成する。

### 対象ロール

| ロール | 生成 | 閲覧 | 編集 | PDF出力 | 共有 |
|--------|------|------|------|---------|------|
| organizer | ✅ | ✅ | ✅ | ✅ | ✅ |
| sales_marketing | ✅ | ✅ | ✅ | ✅ | ✅ |
| venue | ✅ | ✅ | ✅ | ✅ | ✅ |
| streaming | ❌ | ✅ | ❌ | ❌ | ❌ |
| speaker | ❌ | ✅ | ❌ | ❌ | ❌ |
| agent | ❌ | ✅ | ❌ | ❌ | ❌ |

### 受入基準（AC）

- **AC1**: イベントステータスが `completed` になった時、自動的にサマリーレポート生成キューに登録される
- **AC2**: レポートには以下が含まれる：開催概要・参加者数（現地/オンライン）・チェックイン率・質問内容要約・アンケート集計結果・AI分析による改善ポイント
- **AC3**: レポートをPDF形式でエクスポート可能
- **AC4**: 社内共有用にメール送信機能（複数宛先指定可能）
- **AC5**: 会場側が「レポート＋次回提案」をセットで主催に送信可能

---

## §2. ビジネスコンテキスト [CORE]

### 背景

- 現状、イベント終了後に主催者が手動でExcelやPowerPointで報告書を作成（2〜4時間）
- 参加者数・アンケート結果・質問内容が別々のシートに散在し、集約が困難
- 会場側も主催に次回提案を送る際、過去実績を手動でまとめる手間が発生
- 営業がクライアントに実績報告する際、フォーマットが統一されていない

### 期待効果

- レポート作成時間を **2〜4時間 → 5分** に短縮
- AIによる客観的な分析（参加者満足度トレンド、改善提案）を自動付与
- 会場→主催の次回提案資料作成時間を **1時間 → 10分** に短縮
- 社内共有・クライアント報告のフォーマット統一

### 制約

- AI生成は Claude Sonnet を使用（Vercel AI SDK経由）
- レポート生成は非同期処理（キュー）で実行
- PDFエクスポートは Puppeteer または Playwright を使用
- 生成されたレポートは draft 状態で保存され、ユーザーが確認後に published に変更可能

---

## §3. 機能要件 [CORE]

### FR-040-01: イベント終了時の自動レポート生成

**説明**: イベントステータスが `completed` になった時、自動的にサマリーレポート生成ジョブをキューに登録する。

**ロジック**:
```typescript
// server/utils/queue/reportGenerator.ts
export async function enqueueReportGeneration(eventId: string) {
  const event = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event || event.status !== 'completed') return;

  // キューに登録
  await jobQueue.add('generate-event-report', {
    eventId,
    reportType: 'summary',
    tenantId: event.tenantId,
  });
}
```

**トリガー**:
- イベントステータス更新API（PATCH `/api/v1/events/:id`）で `status: completed` になった時
- または、イベント終了時刻の30分後に自動実行（スケジューラー）

---

### FR-040-02: レポートコンテンツ生成

**説明**: AIが以下のセクションを含むMarkdown形式のレポートを生成する。

**セクション構成**:

```markdown
# イベントサマリーレポート

## 1. 開催概要
- イベント名
- 開催日時
- 会場（現地/オンライン）
- 主催者
- 登壇者

## 2. 参加者統計
- 申込数 / チェックイン数（現地・オンライン別）
- チェックイン率
- 参加者属性（アンケート回答から）

## 3. アンケート集計結果
- 満足度平均スコア
- NPS（Net Promoter Score）
- フリーコメント要約（AIによる分類・キーワード抽出）

## 4. 質問内容要約
- Sli.do / Q&A で寄せられた質問のカテゴリ分類
- 回答できなかった質問のリスト

## 5. AI分析・改善提案
- 参加者満足度トレンド分析
- 次回に向けた改善ポイント（3〜5項目）
- 類似イベントとの比較（オプション）

## 6. 次回開催提案（会場向け）
- 推奨会場プラン
- 推奨開催時期
- 参加者数予測
```

**AIプロンプト設計**:
```typescript
// server/utils/ai/reportGenerator.ts
const systemPrompt = `
あなたはイベント運営の専門家です。
以下のイベントデータをもとに、客観的かつ実用的なサマリーレポートを生成してください。

【出力フォーマット】
Markdown形式で、以下のセクションを含めること：
1. 開催概要
2. 参加者統計
3. アンケート集計結果
4. 質問内容要約
5. AI分析・改善提案
6. 次回開催提案

【トーン】
- 客観的・データドリブン
- 改善提案は具体的かつ実行可能
- ポジティブな表現を使いつつ、課題も明確に
`;

const userPrompt = `
【イベントデータ】
${JSON.stringify(eventData, null, 2)}

【参加者データ】
申込数: ${stats.registrationCount}
チェックイン数（現地）: ${stats.onsiteCheckinCount}
チェックイン数（オンライン）: ${stats.onlineCheckinCount}

【アンケート結果】
満足度平均: ${survey.avgSatisfaction}
NPS: ${survey.nps}
コメント: ${survey.comments.join('\n')}

【質問データ】
${questions.map(q => `Q: ${q.content}\nA: ${q.answer || '未回答'}`).join('\n\n')}
`;
```

---

### FR-040-03: レポート一覧・詳細閲覧

**API**: `GET /api/v1/events/:eid/reports`

**レスポンス**:
```typescript
{
  reports: [
    {
      id: "rpt_xxx",
      eventId: "evt_xxx",
      reportType: "summary",
      status: "published",
      generatedBy: "ai",
      createdAt: "2026-02-09T10:00:00Z",
      updatedAt: "2026-02-09T10:05:00Z",
      metadata: {
        participantCount: { onsite: 120, online: 80 },
        avgSatisfaction: 4.2,
        nps: 45
      }
    }
  ]
}
```

**UI**: `/events/:eid/reports`
- レポート一覧をカード形式で表示
- 「新規生成」ボタン（手動生成も可能）
- レポートカードをクリックで詳細表示

---

### FR-040-04: レポート詳細表示・編集

**API**: `GET /api/v1/reports/:id`

**レスポンス**:
```typescript
{
  id: "rpt_xxx",
  eventId: "evt_xxx",
  tenantId: "tnt_xxx",
  reportType: "summary",
  content: "# イベントサマリーレポート\n\n...",
  metadata: { ... },
  generatedBy: "ai",
  status: "draft",
  createdAt: "2026-02-09T10:00:00Z",
  updatedAt: "2026-02-09T10:00:00Z"
}
```

**UI**: `/reports/:id`
- Markdown → HTML レンダリング（`marked` or `remark`）
- 編集モード切替（WYSIWYG or Markdown）
- 「公開」ボタン（draft → published）
- 「PDFエクスポート」ボタン
- 「メール共有」ボタン

**権限**:
- organizer / sales_marketing / venue: 編集・公開可能
- その他: 閲覧のみ

---

### FR-040-05: レポート編集

**API**: `PATCH /api/v1/reports/:id`

**リクエスト**:
```typescript
{
  content?: string;        // Markdown
  status?: "draft" | "published";
  metadata?: Record<string, any>;
}
```

**検証**:
- content は 100,000 文字以内
- status は draft → published のみ許可（published → draft は不可）

---

### FR-040-06: PDFエクスポート

**API**: `GET /api/v1/reports/:id/export/pdf`

**実装**:
```typescript
// server/api/v1/reports/[id]/export/pdf.get.ts
import { chromium } from 'playwright';

export default defineEventHandler(async (event) => {
  const reportId = getRouterParam(event, 'id');
  const report = await db.select().from(eventReports).where(eq(eventReports.id, reportId)).limit(1);

  if (!report) throw createError({ statusCode: 404 });

  // Markdown → HTML
  const html = marked(report.content);

  // Playwright で PDF 生成
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  const pdf = await page.pdf({ format: 'A4' });
  await browser.close();

  setHeader(event, 'Content-Type', 'application/pdf');
  setHeader(event, 'Content-Disposition', `attachment; filename="report-${reportId}.pdf"`);
  return pdf;
});
```

**UI**:
- 「PDFエクスポート」ボタンクリックで即ダウンロード
- ファイル名: `イベント名_サマリーレポート_YYYYMMDD.pdf`

---

### FR-040-07: メール共有

**API**: `POST /api/v1/reports/:id/share`

**リクエスト**:
```typescript
{
  to: string[];           // メールアドレスリスト
  message?: string;       // 任意のメッセージ
  attachPdf: boolean;     // PDF添付するか
}
```

**実装**:
```typescript
// server/api/v1/reports/[id]/share.post.ts
export default defineEventHandler(async (event) => {
  const reportId = getRouterParam(event, 'id');
  const body = await readBody(event);

  const report = await db.select().from(eventReports).where(eq(eventReports.id, reportId)).limit(1);
  if (!report) throw createError({ statusCode: 404 });

  const pdfBuffer = body.attachPdf ? await generatePdf(report) : null;

  await sendEmail({
    to: body.to,
    subject: `イベントサマリーレポート: ${report.eventName}`,
    body: body.message || 'レポートを共有します。',
    attachments: pdfBuffer ? [{ filename: 'report.pdf', content: pdfBuffer }] : [],
  });

  return { success: true };
});
```

**UI**:
- 「共有」ボタン → モーダル表示
- メールアドレス入力（複数可、カンマ区切り or タグ入力）
- 任意メッセージ入力
- 「PDF添付」チェックボックス
- 「送信」ボタン

---

### FR-040-08: 会場向け「レポート＋次回提案」セット送信

**API**: `POST /api/v1/reports/:id/send-proposal`

**リクエスト**:
```typescript
{
  to: string[];           // 主催者メールアドレス
  proposalContent: string; // 次回提案内容（Markdown）
}
```

**実装**:
- レポート本文 + 提案内容を結合してメール送信
- 提案内容は AI が生成したものをユーザーが編集可能

**UI**: `/reports/:id` ページに「次回提案を送信」ボタン（venue ロールのみ表示）
- ボタンクリック → モーダル
- 提案内容プレビュー（編集可能）
- 宛先選択（主催者のみ or 全員）
- 「送信」ボタン

---

### §3-E. 入出力例 [CONTRACT]

#### E-1: レポート生成

**リクエスト**: `POST /api/v1/events/evt_001/report`

```json
{
  "reportType": "summary"
}
```

**レスポンス**: `201 Created`

```json
{
  "id": "rpt_abc123",
  "eventId": "evt_001",
  "reportType": "summary",
  "status": "draft",
  "generatedBy": "ai",
  "jobId": "job_xyz789",
  "message": "レポート生成を開始しました。完了まで1〜2分かかります。",
  "createdAt": "2026-02-09T10:00:00Z"
}
```

#### E-2: レポート取得

**リクエスト**: `GET /api/v1/events/evt_001/report`

**レスポンス**: `200 OK`

```json
{
  "id": "rpt_abc123",
  "eventId": "evt_001",
  "tenantId": "tnt_001",
  "reportType": "summary",
  "content": "# イベントサマリーレポート\n\n## 1. 開催概要\n- イベント名: テック勉強会 Vol.5\n- 開催日時: 2026-02-08 14:00-16:00\n...",
  "metadata": {
    "participantCount": { "onsite": 120, "online": 80, "total": 200 },
    "checkinRate": { "onsite": 0.85, "online": 0.92, "total": 0.88 },
    "surveyStats": { "avgSatisfaction": 4.2, "nps": 45, "responseCount": 150 },
    "questionStats": { "totalQuestions": 25, "answeredQuestions": 22, "topCategories": ["技術", "キャリア", "運営"] }
  },
  "generatedBy": "ai",
  "status": "published",
  "createdAt": "2026-02-09T10:00:00Z",
  "updatedAt": "2026-02-09T10:05:00Z"
}
```

#### E-3: レポートPDFダウンロード

**リクエスト**: `GET /api/v1/events/evt_001/report/pdf`

**レスポンス**: `200 OK` (binary)

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="テック勉強会Vol5_サマリーレポート_20260209.pdf"
Content-Length: 245760
```

#### E-4: AI分析結果取得

**リクエスト**: `GET /api/v1/events/evt_001/report/analysis`

**レスポンス**: `200 OK`

```json
{
  "eventId": "evt_001",
  "analysis": {
    "satisfactionTrend": "上昇",
    "npsCategory": "プロモーター優勢",
    "keyInsights": [
      "参加者の85%が「内容が実務に役立つ」と回答",
      "オンライン参加者のチェックイン率が前回比+12%",
      "Q&Aセッションの質問数が前回比2倍"
    ],
    "improvements": [
      { "category": "コンテンツ", "suggestion": "ハンズオン時間を30分→45分に延長", "priority": "high" },
      { "category": "運営", "suggestion": "休憩時間をネットワーキングタイムに活用", "priority": "medium" },
      { "category": "集客", "suggestion": "SNSでのイベント告知を開催2週間前から開始", "priority": "medium" }
    ],
    "nextEventRecommendation": {
      "recommendedDate": "2026-03-15",
      "expectedAttendees": 220,
      "suggestedTopic": "クラウドネイティブ開発入門"
    }
  },
  "generatedAt": "2026-02-09T10:02:00Z"
}
```

#### E-5: レポート再生成

**リクエスト**: `POST /api/v1/events/evt_001/report/regenerate`

```json
{
  "reason": "アンケート結果の追加反映"
}
```

**レスポンス**: `200 OK`

```json
{
  "id": "rpt_def456",
  "eventId": "evt_001",
  "reportType": "summary",
  "status": "draft",
  "generatedBy": "ai",
  "jobId": "job_uvw321",
  "message": "レポートを再生成しています。完了まで1〜2分かかります。",
  "previousReportId": "rpt_abc123",
  "createdAt": "2026-02-09T15:00:00Z"
}
```

#### E-6: レポート一覧

**リクエスト**: `GET /api/v1/reports?tenantId=tnt_001&page=1&limit=20`

**レスポンス**: `200 OK`

```json
{
  "reports": [
    {
      "id": "rpt_abc123",
      "eventId": "evt_001",
      "eventName": "テック勉強会 Vol.5",
      "reportType": "summary",
      "status": "published",
      "generatedBy": "ai",
      "metadata": {
        "participantCount": { "onsite": 120, "online": 80, "total": 200 },
        "surveyStats": { "avgSatisfaction": 4.2, "nps": 45, "responseCount": 150 }
      },
      "createdAt": "2026-02-09T10:00:00Z",
      "updatedAt": "2026-02-09T10:05:00Z"
    },
    {
      "id": "rpt_ghi789",
      "eventId": "evt_002",
      "eventName": "マーケティングセミナー 2026春",
      "reportType": "summary",
      "status": "draft",
      "generatedBy": "ai",
      "metadata": {
        "participantCount": { "onsite": 50, "online": 150, "total": 200 },
        "surveyStats": { "avgSatisfaction": 3.8, "nps": 20, "responseCount": 120 }
      },
      "createdAt": "2026-02-08T16:00:00Z",
      "updatedAt": "2026-02-08T16:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

---

### §3-F. 境界値 [CONTRACT]

| 項目 | 最小値 | 最大値 | 備考 |
|------|--------|--------|------|
| レポートタイトル | 1文字 | 200文字 | 空文字不可 |
| レポート本文（content） | 1文字 | 100,000文字 | Markdown形式 |
| 編集コメント | 0文字 | 5,000文字 | 任意入力 |
| メール共有メッセージ | 0文字 | 1,000文字 | 任意入力 |
| メール送信先数 | 1件 | 10件 | 1回の送信あたり |
| 参加者数 | 0人 | 10,000人 | 現地・オンライン合算 |
| アンケート回答率 | 0% | 100% | 小数点以下2桁 |
| 満足度スコア | 1.0 | 5.0 | 小数点以下1桁 |
| NPS | -100 | 100 | 整数 |
| レポート生成時間 | - | 30秒 | 目標値、超過時はタイムアウト警告 |
| PDF最大ページ数 | 1ページ | 50ページ | 超過時は分割 or 警告 |
| PDF最大ファイルサイズ | - | 10MB | メール添付上限 |
| 提案内容（proposalContent） | 1文字 | 10,000文字 | Markdown形式 |

---

### §3-G. 例外レスポンス [CONTRACT]

| エラーコード | HTTPステータス | メッセージ | 発生条件 |
|-------------|---------------|-----------|----------|
| VALIDATION_ERROR | 400 | リクエストパラメータが不正です | 必須パラメータ欠損、型不一致、範囲外の値 |
| EVENT_NOT_COMPLETED | 400 | イベントが完了していないため、レポートを生成できません | ステータスが `completed` でないイベントに対するレポート生成リクエスト |
| NOT_FOUND | 404 | 指定されたレポートが見つかりません | 存在しないレポートID、または別テナントのレポートへのアクセス |
| FORBIDDEN | 403 | この操作を実行する権限がありません | ロール不足（例: streaming ロールが編集を試行）、公開済みレポートへの編集 |
| REPORT_ALREADY_EXISTS | 409 | このイベントの自動生成レポートは既に存在します | 同一イベントに対する自動生成の重複実行 |
| REPORT_GENERATION_FAILED | 502 | レポート生成に失敗しました。しばらく後に再試行してください | AI API エラー（3回リトライ後）、データ取得失敗 |
| REPORT_GENERATION_TIMEOUT | 504 | レポート生成がタイムアウトしました | 生成処理が制限時間（60秒）を超過 |
| PDF_GENERATION_FAILED | 502 | PDF生成に失敗しました | Playwright/Puppeteer のエラー、メモリ不足 |
| EMAIL_SEND_FAILED | 502 | メール送信に失敗しました | SMTP接続エラー、宛先不正 |
| CONTENT_TOO_LARGE | 413 | レポート本文が上限を超えています | content が 100,000文字超過 |

---

### §3-H. 受け入れテスト（Gherkin） [CONTRACT]

#### AT-040-01: イベント完了時の自動レポート生成

```gherkin
Feature: イベント完了時の自動レポート生成

  Scenario: イベントが完了したらサマリーレポートが自動生成される
    Given イベント "evt_001" がステータス "scheduled" で存在する
    And イベントに参加者データ・アンケートデータが登録されている
    When イベントステータスを "completed" に更新する
    Then レポート生成ジョブがキューに登録される
    And 30秒以内にサマリーレポートが生成される
    And レポートのステータスは "draft" である
    And レポートの generatedBy は "ai" である
```

#### AT-040-02: レポート内容の必須セクション検証

```gherkin
Feature: レポート内容の必須セクション検証

  Scenario: 生成されたレポートに必須セクションが含まれる
    Given AI生成されたサマリーレポート "rpt_001" が存在する
    When レポートの内容を取得する
    Then レポートに "開催概要" セクションが含まれる
    And レポートに "参加者統計" セクションが含まれる
    And レポートに "アンケート集計結果" セクションが含まれる
    And レポートに "AI分析・改善提案" セクションが含まれる
```

#### AT-040-03: レポートPDFエクスポート

```gherkin
Feature: レポートPDFエクスポート

  Scenario: レポートをPDF形式でダウンロードできる
    Given 公開済みレポート "rpt_001" が存在する
    And ユーザーが tenant_member ロールでログインしている
    When GET /api/v1/reports/rpt_001/export/pdf を実行する
    Then ステータスコード 200 が返る
    And Content-Type は "application/pdf" である
    And PDFファイルサイズは 100KB〜10MB の範囲内である
    And PDFにレポート内容がレンダリングされている
```

#### AT-040-04: レポートステータス遷移（draft → published）

```gherkin
Feature: レポートステータス遷移

  Scenario: 下書きレポートを公開できる
    Given レポート "rpt_001" がステータス "draft" で存在する
    And ユーザーが organizer ロールでログインしている
    When PATCH /api/v1/reports/rpt_001 で status を "published" に更新する
    Then ステータスコード 200 が返る
    And レポートのステータスは "published" である

  Scenario: 公開済みレポートを下書きに戻せない
    Given レポート "rpt_001" がステータス "published" で存在する
    And ユーザーが organizer ロールでログインしている
    When PATCH /api/v1/reports/rpt_001 で status を "draft" に更新する
    Then ステータスコード 403 が返る
    And エラーメッセージ "公開済みのレポートは編集できません" が返る
```

#### AT-040-05: メール共有（PDF添付あり）

```gherkin
Feature: レポートのメール共有

  Scenario: レポートをPDF添付付きでメール共有できる
    Given 公開済みレポート "rpt_001" が存在する
    And ユーザーが organizer ロールでログインしている
    When POST /api/v1/reports/rpt_001/share を以下の内容で実行する:
      | to                  | message          | attachPdf |
      | test@example.com    | レポートを共有します | true      |
    Then ステータスコード 200 が返る
    And test@example.com にメールが送信される
    And メールにPDFファイルが添付されている
```

#### AT-040-06: 権限不足によるレポート生成拒否

```gherkin
Feature: レポート生成の権限制御

  Scenario: streaming ロールはレポートを生成できない
    Given イベント "evt_001" が存在する
    And ユーザーが streaming ロールでログインしている
    When POST /api/v1/events/evt_001/report を実行する
    Then ステータスコード 403 が返る
    And エラーコード "FORBIDDEN" が返る

  Scenario: speaker ロールはレポートを閲覧できる
    Given 公開済みレポート "rpt_001" が存在する
    And ユーザーが speaker ロールでログインしている
    When GET /api/v1/reports/rpt_001 を実行する
    Then ステータスコード 200 が返る
    And レポートの内容が返る
```

#### AT-040-07: AI生成失敗時のリトライとエラー通知

```gherkin
Feature: AI生成失敗時のリトライ

  Scenario: AI APIエラー時に3回リトライし、全失敗でエラー通知する
    Given イベント "evt_001" がステータス "completed" で存在する
    And AI API が一時的にエラーを返す状態である
    When レポート生成ジョブが実行される
    Then 最大3回リトライされる
    And 3回とも失敗した場合、ユーザーにエラー通知が送信される
    And レポートは生成されない
    And エラーコード "REPORT_GENERATION_FAILED" がログに記録される
```

#### AT-040-08: 会場向け「レポート＋次回提案」送信

```gherkin
Feature: 会場向けレポート＋次回提案送信

  Scenario: venue ロールがレポートと次回提案を主催者に送信できる
    Given 公開済みレポート "rpt_001" が存在する
    And ユーザーが venue ロールでログインしている
    And イベントの主催者メールアドレスが "organizer@example.com" である
    When POST /api/v1/reports/rpt_001/send-proposal を以下の内容で実行する:
      | to                       | proposalContent                    |
      | organizer@example.com    | ## 次回開催提案\n\n次回は3月開催... |
    Then ステータスコード 200 が返る
    And organizer@example.com にメールが送信される
    And メール本文にレポート本文と提案内容が含まれる

  Scenario: organizer ロールは次回提案を送信できない
    Given 公開済みレポート "rpt_001" が存在する
    And ユーザーが organizer ロールでログインしている
    When POST /api/v1/reports/rpt_001/send-proposal を実行する
    Then ステータスコード 403 が返る
    And エラーコード "FORBIDDEN" が返る
```

#### AT-040-09: 未完了イベントへのレポート生成拒否

```gherkin
Feature: 未完了イベントへのレポート生成拒否

  Scenario: 完了していないイベントのレポートは生成できない
    Given イベント "evt_002" がステータス "scheduled" で存在する
    And ユーザーが organizer ロールでログインしている
    When POST /api/v1/events/evt_002/report を実行する
    Then ステータスコード 400 が返る
    And エラーコード "EVENT_NOT_COMPLETED" が返る
    And エラーメッセージ "イベントが完了していないため、レポートを生成できません" が返る
```

---

## §4. データモデル [CONTRACT]

### event_reports テーブル

```sql
CREATE TABLE event_reports (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_prefixed_id('rpt_'),
  event_id VARCHAR(255) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('summary', 'proposal', 'follow_up')),
  content TEXT NOT NULL, -- Markdown
  metadata JSONB DEFAULT '{}',
  generated_by VARCHAR(50) NOT NULL CHECK (generated_by IN ('ai', 'manual')),
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_event_reports_event_id ON event_reports(event_id);
CREATE INDEX idx_event_reports_tenant_id ON event_reports(tenant_id);
CREATE INDEX idx_event_reports_status ON event_reports(status);
```

### metadata JSONB スキーマ

```typescript
interface ReportMetadata {
  participantCount: {
    onsite: number;
    online: number;
    total: number;
  };
  checkinRate: {
    onsite: number;
    online: number;
    total: number;
  };
  surveyStats: {
    avgSatisfaction: number; // 1-5
    nps: number;             // -100 to 100
    responseCount: number;
  };
  questionStats: {
    totalQuestions: number;
    answeredQuestions: number;
    topCategories: string[];
  };
  generationTime?: number; // AI生成時間（秒）
  version?: string;        // レポートフォーマットバージョン
}
```

---

## §5. API仕様 [CONTRACT]

### GET /api/v1/events/:eid/reports

**説明**: 指定イベントのレポート一覧取得

**権限**: tenant_member

**レスポンス**:
```typescript
{
  reports: Array<{
    id: string;
    eventId: string;
    reportType: 'summary' | 'proposal' | 'follow_up';
    status: 'draft' | 'published';
    generatedBy: 'ai' | 'manual';
    metadata: ReportMetadata;
    createdAt: string;
    updatedAt: string;
  }>;
}
```

---

### POST /api/v1/events/:eid/reports/generate

**説明**: AI による新規レポート生成（非同期）

**権限**: organizer, sales_marketing, venue

**リクエスト**:
```typescript
{
  reportType?: 'summary' | 'proposal' | 'follow_up'; // default: summary
}
```

**レスポンス**:
```typescript
{
  jobId: string; // ジョブID
  message: "レポート生成を開始しました。完了まで1〜2分かかります。"
}
```

**非同期処理**:
```typescript
// server/utils/queue/reportGenerator.ts
export async function generateEventReport(eventId: string, reportType: string) {
  // 1. イベントデータ取得
  const event = await db.select().from(events).where(eq(events.id, eventId)).limit(1);

  // 2. 参加者統計取得
  const stats = await getParticipantStats(eventId);

  // 3. アンケート結果取得
  const surveyResults = await getSurveyResults(eventId);

  // 4. 質問データ取得
  const questions = await getQuestions(eventId);

  // 5. AI生成
  const content = await generateReportWithAI({
    event,
    stats,
    surveyResults,
    questions,
  });

  // 6. DB保存
  await db.insert(eventReports).values({
    eventId,
    tenantId: event.tenantId,
    reportType,
    content,
    metadata: {
      participantCount: stats.participantCount,
      checkinRate: stats.checkinRate,
      surveyStats: surveyResults.stats,
      questionStats: questions.stats,
    },
    generatedBy: 'ai',
    status: 'draft',
  });
}
```

---

### GET /api/v1/reports/:id

**説明**: レポート詳細取得

**権限**: tenant_member

**レスポンス**:
```typescript
{
  id: string;
  eventId: string;
  tenantId: string;
  reportType: string;
  content: string;
  metadata: ReportMetadata;
  generatedBy: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### PATCH /api/v1/reports/:id

**説明**: レポート編集

**権限**: organizer, sales_marketing, venue

**リクエスト**:
```typescript
{
  content?: string;
  status?: 'draft' | 'published';
  metadata?: Record<string, any>;
}
```

**検証**:
```typescript
const schema = z.object({
  content: z.string().max(100000).optional(),
  status: z.enum(['draft', 'published']).optional(),
  metadata: z.record(z.any()).optional(),
});
```

**レスポンス**:
```typescript
{
  id: string;
  content: string;
  status: string;
  updatedAt: string;
}
```

---

### GET /api/v1/reports/:id/export/pdf

**説明**: レポートをPDF形式でエクスポート

**権限**: tenant_member

**レスポンス**: PDF バイナリ（Content-Type: application/pdf）

---

### POST /api/v1/reports/:id/share

**説明**: レポートをメール共有

**権限**: organizer, sales_marketing, venue

**リクエスト**:
```typescript
{
  to: string[];
  message?: string;
  attachPdf: boolean;
}
```

**検証**:
```typescript
const schema = z.object({
  to: z.array(z.string().email()).min(1).max(10),
  message: z.string().max(1000).optional(),
  attachPdf: z.boolean(),
});
```

**レスポンス**:
```typescript
{
  success: true;
  sentTo: string[];
}
```

---

### POST /api/v1/reports/:id/send-proposal

**説明**: 会場向け「レポート＋次回提案」送信

**権限**: venue

**リクエスト**:
```typescript
{
  to: string[];
  proposalContent: string; // Markdown
}
```

**レスポンス**:
```typescript
{
  success: true;
  sentTo: string[];
}
```

---

## §6. UI/UX [DETAIL]

### レポート一覧ページ（`/events/:eid/reports`）

**レイアウト**:
```
+--------------------------------------------------+
| イベント: 〇〇セミナー                            |
+--------------------------------------------------+
| [新規生成] [自動生成設定]                         |
+--------------------------------------------------+
| +----------------------------------------------+ |
| | サマリーレポート #1                          | |
| | 生成日時: 2026-02-09 10:00                   | |
| | ステータス: 公開済み                          | |
| | 参加者: 200人 | 満足度: 4.2                   | |
| | [閲覧] [PDFエクスポート]                      | |
| +----------------------------------------------+ |
| +----------------------------------------------+ |
| | サマリーレポート #2 (下書き)                  | |
| | 生成日時: 2026-02-08 15:00                   | |
| | ステータス: 下書き                            | |
| | [編集] [削除]                                 | |
| +----------------------------------------------+ |
+--------------------------------------------------+
```

**機能**:
- 「新規生成」ボタン → AI生成開始（非同期）、進捗表示
- 「自動生成設定」 → イベント終了時の自動生成ON/OFF

---

### レポート詳細ページ（`/reports/:id`）

**レイアウト**:
```
+--------------------------------------------------+
| ← 戻る | イベントサマリーレポート                  |
+--------------------------------------------------+
| [編集] [公開] [PDFエクスポート] [共有]            |
+--------------------------------------------------+
| # イベントサマリーレポート                       |
|                                                  |
| ## 1. 開催概要                                   |
| - イベント名: 〇〇セミナー                       |
| - 開催日時: 2026-02-09 14:00-16:00              |
| ...                                              |
|                                                  |
| ## 2. 参加者統計                                 |
| - 申込数: 250人                                  |
| - チェックイン数: 200人（現地120, オンライン80） |
| ...                                              |
+--------------------------------------------------+
```

**機能**:
- 「編集」ボタン → Markdown編集モードに切替
- 「公開」ボタン → draft → published（不可逆）
- 「PDFエクスポート」ボタン → PDF即ダウンロード
- 「共有」ボタン → メール共有モーダル表示

---

### メール共有モーダル

```
+--------------------------------------------------+
| レポートを共有                                    |
+--------------------------------------------------+
| 宛先（カンマ区切り）:                             |
| [_______________________________________________] |
|                                                  |
| メッセージ（任意）:                               |
| [_______________________________________________] |
| [_______________________________________________] |
|                                                  |
| [ ] PDFを添付する                                |
|                                                  |
| [キャンセル] [送信]                               |
+--------------------------------------------------+
```

---

### 会場向け「次回提案送信」モーダル

```
+--------------------------------------------------+
| レポート＋次回提案を送信                          |
+--------------------------------------------------+
| 宛先: 主催者（自動選択）                          |
|                                                  |
| 提案内容:                                         |
| [_______________________________________________] |
| [_______________________________________________] |
| [_______________________________________________] |
| （AI生成された提案内容を編集できます）            |
|                                                  |
| [ ] PDFを添付する                                |
|                                                  |
| [キャンセル] [送信]                               |
+--------------------------------------------------+
```

---

## §7. ビジネスルール [CORE]

### BR-040-01: 自動生成トリガー

- イベントステータスが `completed` になった時、自動的にレポート生成キューに登録
- または、イベント終了時刻の **30分後** に自動実行（スケジューラー）
- 自動生成は1イベントにつき1回のみ（重複防止）

### BR-040-02: レポートセクション必須項目

以下のセクションは必須:
1. 開催概要
2. 参加者統計
3. アンケート集計結果
4. AI分析・改善提案

以下は任意:
5. 質問内容要約（質問がない場合はスキップ）
6. 次回開催提案（会場ロールのみ生成）

### BR-040-03: AIプロンプト設計

**目的**: 客観的・実用的・具体的なレポート生成

**プロンプト構成**:
```typescript
const systemPrompt = `
あなたはイベント運営の専門家です。
以下のイベントデータをもとに、客観的かつ実用的なサマリーレポートを生成してください。

【トーン】
- 客観的・データドリブン
- 改善提案は具体的かつ実行可能
- ポジティブな表現を使いつつ、課題も明確に
- 専門用語は避け、誰でも理解できる表現を使う

【禁止事項】
- 憶測や根拠のない断定
- 過度に楽観的な表現
- データに基づかない主観的な評価
`;
```

**改善提案の生成ロジック**:
- 満足度が 4.0 未満 → 改善が必要な項目を抽出
- NPS が 0 未満 → 批判的意見を分析
- チェックイン率が 70% 未満 → 申込〜参加の導線を改善提案
- 質問が多い項目 → 次回はその分野の情報を充実させる

### BR-040-04: レポートステータス遷移

- **draft**: 生成直後、編集可能
- **published**: 公開後、編集不可（新規版を作成する）

遷移ルール:
- draft → published: 可能
- published → draft: 不可（不可逆）

### BR-040-05: PDF生成

- A4サイズ、縦向き
- フォント: Noto Sans JP（日本語対応）
- ヘッダー: イベント名、生成日時
- フッター: ページ番号
- 画像・グラフがある場合は埋め込み

### BR-040-06: メール共有制限

- 1回の送信で最大 **10名** まで
- PDF添付サイズは **10MB** まで
- 送信履歴を記録（監査ログ）

---

## §8. 非機能要件 [CORE]

### パフォーマンス

- レポート生成時間: **平均 30秒以内**（AI生成含む）
- PDF生成時間: **10秒以内**
- レポート一覧取得: **500ms以内**

### スケーラビリティ

- 同時レポート生成: **10件まで**（キュー処理）
- レポート保存期間: **無期限**（削除はユーザーが手動で実行）

### 信頼性

- AI生成失敗時はリトライ（最大3回）
- リトライ失敗時はエラー通知 + 手動生成を案内
- PDF生成失敗時もリトライ（最大2回）

---

## §9. セキュリティ [CORE]

### 認可

- レポート閲覧: tenant_member
- レポート生成・編集: organizer, sales_marketing, venue
- 次回提案送信: venue のみ

### データ保護

- レポート内容は tenant_id でスコープ制限
- メール送信先はテナント内のユーザーのみ（外部送信は管理者承認必要）

### 監査ログ

以下の操作を記録:
- レポート生成（AI/手動）
- レポート公開
- PDFエクスポート
- メール共有（宛先含む）

---

## §10. テストケース [DETAIL]

### TC-040-01: イベント終了時の自動レポート生成

**前提条件**:
- イベント `evt_001` が存在
- ステータスが `scheduled`

**実行**:
1. PATCH `/api/v1/events/evt_001` で `status: completed` に更新
2. 30秒待機
3. GET `/api/v1/events/evt_001/reports` を実行

**期待結果**:
- レポートが1件生成されている
- `reportType: 'summary'`
- `generatedBy: 'ai'`
- `status: 'draft'`
- `content` に Markdown が格納されている

---

### TC-040-02: レポート手動生成

**前提条件**:
- ユーザーが organizer ロールでログイン
- イベント `evt_001` が存在

**実行**:
1. POST `/api/v1/events/evt_001/reports/generate`
2. レスポンスで `jobId` を取得
3. 60秒待機
4. GET `/api/v1/events/evt_001/reports` を実行

**期待結果**:
- レポートが1件生成されている
- `content` に以下のセクションが含まれる:
  - 開催概要
  - 参加者統計
  - アンケート集計結果
  - AI分析・改善提案

---

### TC-040-03: レポート編集

**前提条件**:
- レポート `rpt_001` が存在（status: draft）
- ユーザーが organizer ロールでログイン

**実行**:
1. PATCH `/api/v1/reports/rpt_001` で `content` を更新
2. GET `/api/v1/reports/rpt_001` を実行

**期待結果**:
- `content` が更新されている
- `updatedAt` が更新されている

---

### TC-040-04: レポート公開（draft → published）

**前提条件**:
- レポート `rpt_001` が存在（status: draft）
- ユーザーが organizer ロールでログイン

**実行**:
1. PATCH `/api/v1/reports/rpt_001` で `status: 'published'` に更新
2. GET `/api/v1/reports/rpt_001` を実行

**期待結果**:
- `status: 'published'`
- 編集不可（次回 PATCH で 403 エラー）

---

### TC-040-05: レポート公開後の編集禁止

**前提条件**:
- レポート `rpt_001` が存在（status: published）
- ユーザーが organizer ロールでログイン

**実行**:
1. PATCH `/api/v1/reports/rpt_001` で `content` を更新

**期待結果**:
- ステータスコード: 403
- エラーメッセージ: "公開済みのレポートは編集できません"

---

### TC-040-06: PDFエクスポート

**前提条件**:
- レポート `rpt_001` が存在
- ユーザーがログイン済み

**実行**:
1. GET `/api/v1/reports/rpt_001/export/pdf` を実行

**期待結果**:
- Content-Type: `application/pdf`
- ファイルサイズ: 100KB〜5MB
- ファイル名: `report-rpt_001.pdf`
- PDFを開くと Markdown がレンダリングされている

---

### TC-040-07: メール共有（PDF添付あり）

**前提条件**:
- レポート `rpt_001` が存在
- ユーザーが organizer ロールでログイン

**実行**:
1. POST `/api/v1/reports/rpt_001/share` で以下を送信:
   ```json
   {
     "to": ["test@example.com"],
     "message": "レポートを共有します",
     "attachPdf": true
   }
   ```

**期待結果**:
- ステータスコード: 200
- `test@example.com` にメールが送信される
- メールにPDFが添付されている

---

### TC-040-08: 会場向け「レポート＋次回提案」送信

**前提条件**:
- レポート `rpt_001` が存在
- ユーザーが venue ロールでログイン
- イベントの主催者メールアドレス: `organizer@example.com`

**実行**:
1. POST `/api/v1/reports/rpt_001/send-proposal` で以下を送信:
   ```json
   {
     "to": ["organizer@example.com"],
     "proposalContent": "## 次回開催提案\n\n..."
   }
   ```

**期待結果**:
- ステータスコード: 200
- `organizer@example.com` にメールが送信される
- メール本文にレポート本文 + 提案内容が含まれる

---

### TC-040-09: AI生成失敗時のリトライ

**前提条件**:
- AI APIが一時的にエラーを返す（モック）

**実行**:
1. POST `/api/v1/events/evt_001/reports/generate` を実行
2. 60秒待機
3. GET `/api/v1/events/evt_001/reports` を実行

**期待結果**:
- 3回リトライされる
- 3回とも失敗した場合、エラー通知がユーザーに送信される
- レポートは生成されない

---

### TC-040-10: metadata 検証

**前提条件**:
- レポート生成時に参加者データ・アンケートデータが存在

**実行**:
1. POST `/api/v1/events/evt_001/reports/generate` を実行
2. GET `/api/v1/reports/:id` で metadata を確認

**期待結果**:
- `metadata.participantCount.onsite` が正しい
- `metadata.participantCount.online` が正しい
- `metadata.checkinRate.total` が正しい（小数点以下2桁）
- `metadata.surveyStats.avgSatisfaction` が 1〜5 の範囲
- `metadata.surveyStats.nps` が -100〜100 の範囲

---

## §11. 依存関係 [DETAIL]

### 前提機能

- **EVT-001**: イベント基本管理（イベントデータ取得）
- **EVT-010**: 参加者管理（参加者統計取得）
- **EVT-020**: チェックイン管理（チェックイン率取得）
- **EVT-030**: アンケート管理（アンケート結果取得）
- **COM-010**: AI抽象化基盤（Claude Sonnet）
- **COM-020**: メール送信基盤

### 後続機能

- **EVT-041**: レポートテンプレート管理（カスタムレポート生成）
- **EVT-042**: レポート比較分析（複数イベントの横断分析）

---

## §12. 未決定事項・制約 [CONTRACT]

### 未決定事項

| ID | 項目 | 選択肢・論点 | 影響範囲 | 期限 |
|----|------|-------------|----------|------|
| OPEN-040-01 | レポート生成キュー基盤 | BullMQ / pg-boss / カスタム実装 | FR-040-01, §8 パフォーマンス | MVP前 |
| OPEN-040-02 | PDF生成エンジン | Playwright（現設計） / Puppeteer / サーバーレス（Gotenberg等） | FR-040-06, §8 パフォーマンス | MVP前 |
| OPEN-040-03 | レポート生成の同時実行制御 | キュー並列数（現設計: 10件）の妥当性検証 | §8 スケーラビリティ | MVP後検証 |
| OPEN-040-04 | 外部メール送信の承認フロー | 管理者承認の具体的なUI/APIフロー未定義 | FR-040-07, §9 セキュリティ | MVP前 |
| OPEN-040-05 | レポートバージョニング | 再生成時に旧版を保持するか、上書きするか | FR-040-02, §4 データモデル | MVP前 |
| OPEN-040-06 | AIモデル切替時のレポート品質担保 | Claude → GPT 切替時のプロンプト互換性 | FR-040-02, BR-040-03 | MVP後 |

### 制約事項

| ID | 制約 | 理由 | 影響 |
|----|------|------|------|
| CONST-040-01 | AI生成レポートの内容正確性は保証しない | LLMの特性上、ハルシネーションの可能性がある | ユーザーによる確認・編集を必須フローとする |
| CONST-040-02 | PDF生成にはヘッドレスブラウザが必要 | Markdown → PDF の高品質変換のため | サーバーのメモリ要件が増加（最低2GB推奨） |
| CONST-040-03 | メール送信はテナント内ユーザーに限定（MVP） | セキュリティ・スパム防止のため | 外部共有は管理者承認フローの実装後に対応 |
| CONST-040-04 | 1イベントあたりの自動生成は1回のみ | 重複防止・コスト管理のため | 再生成は手動トリガーで対応 |
| CONST-040-05 | レポート生成はイベント完了後のみ | 不完全なデータでのレポート生成を防止 | 途中経過レポートは将来対応（EVT-041） |

---

## §13. 変更履歴 [DETAIL]

| 日付 | バージョン | 変更内容 | 変更者 |
|------|-----------|----------|--------|
| 2026-02-09 | v1.0 | 初版作成 | Claude |
| 2026-02-09 | v1.1 | §3-E/F/G/H（入出力例・境界値・例外レスポンス・受け入れテスト）追加、§12 未決定事項・制約セクション追加 | Claude |

---

## 参考資料

- [SSOT-1: PRD](../../requirements/SSOT-1_PRD.md)
- [SSOT-3: API規約](../core/SSOT-3_API_CONTRACT.md)
- [SSOT-4: データモデル](../core/SSOT-4_DATA_MODEL.md)
- [SSOT-5: 横断的関心事](../core/SSOT-5_CROSS_CUTTING.md)
- [EVT-001: イベント基本管理](./EVT-001_basic.md)
- [EVT-010: 参加者管理](./EVT-010_participants.md)
- [EVT-020: チェックイン管理](./EVT-020_checkin.md)
- [EVT-030: アンケート管理](./EVT-030_survey.md)
