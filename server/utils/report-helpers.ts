// EVT-040: レポート生成 純粋関数（DB非依存）
// 仕様書: docs/design/features/project/EVT-040_summary-report.md §3 FR-040-02, BR-040-03

// ──────────────────────────────────────
// 型定義
// ──────────────────────────────────────

export interface ParticipantStats {
  registrationCount: number
  onsiteRegistered: number
  onlineRegistered: number
  onsiteCheckinCount: number
  onlineCheckinCount: number
  totalCheckinCount: number
  walkInCount: number
}

export interface ReportMetadata {
  participantCount: {
    onsite: number
    online: number
    total: number
  }
  checkinRate: {
    onsite: number
    online: number
    total: number
  }
  surveyStats: {
    avgSatisfaction: number
    nps: number
    responseCount: number
  }
  questionStats: {
    totalQuestions: number
    answeredQuestions: number
    topCategories: string[]
  }
  generationTime: number
  version: string
}

// ──────────────────────────────────────
// AI プロンプト（BR-040-03）
// ──────────────────────────────────────

const REPORT_SYSTEM_PROMPT = `あなたはイベント運営の専門家です。
以下のイベントデータをもとに、客観的かつ実用的なサマリーレポートをMarkdown形式で生成してください。

【出力フォーマット】
以下のセクションを含めてください:
1. 開催概要（イベント名、開催日時、会場、形式）
2. 参加者統計（申込数、チェックイン数、現地/オンライン別）
3. アンケート集計結果（データがある場合）
4. AI分析・改善提案（3〜5項目の具体的な改善ポイント）

【トーン】
- 客観的・データドリブン
- 改善提案は具体的かつ実行可能
- ポジティブな表現を使いつつ、課題も明確に
- 専門用語は避け、誰でも理解できる表現を使う

【禁止事項】
- 憶測や根拠のない断定
- 過度に楽観的な表現
- データに基づかない主観的な評価`

/**
 * レポートシステムプロンプトを取得
 */
export function getSystemPrompt(): string {
  return REPORT_SYSTEM_PROMPT
}

/**
 * レポート用 AI プロンプトを構築
 */
export function buildReportPrompt(
  eventData: Record<string, unknown>,
  stats: ParticipantStats,
): string {
  const checkinRateOnsite = stats.onsiteRegistered > 0
    ? ((stats.onsiteCheckinCount / stats.onsiteRegistered) * 100).toFixed(1)
    : '0.0'
  const checkinRateOnline = stats.onlineRegistered > 0
    ? ((stats.onlineCheckinCount / stats.onlineRegistered) * 100).toFixed(1)
    : '0.0'
  const checkinRateTotal = stats.registrationCount > 0
    ? ((stats.totalCheckinCount / stats.registrationCount) * 100).toFixed(1)
    : '0.0'

  return `【イベントデータ】
イベント名: ${eventData.title ?? '不明'}
開催日時: ${eventData.startAt ?? '不明'} 〜 ${eventData.endAt ?? '不明'}
形式: ${eventData.format ?? '不明'}
ステータス: ${eventData.status ?? '不明'}

【参加者データ】
申込数合計: ${stats.registrationCount}名
- 現地参加申込: ${stats.onsiteRegistered}名
- オンライン参加申込: ${stats.onlineRegistered}名
チェックイン数合計: ${stats.totalCheckinCount}名
- 現地チェックイン: ${stats.onsiteCheckinCount}名（チェックイン率: ${checkinRateOnsite}%）
- オンラインチェックイン: ${stats.onlineCheckinCount}名（チェックイン率: ${checkinRateOnline}%）
全体チェックイン率: ${checkinRateTotal}%
当日参加者数: ${stats.walkInCount}名

上記データをもとに、サマリーレポートを生成してください。`
}

/**
 * テンプレートベースのレポートコンテンツ生成
 * LLMRouter が利用可能になるまでのフォールバック
 */
export function generateReportTemplate(
  eventData: Record<string, unknown>,
  stats: ParticipantStats,
): string {
  const checkinRateTotal = stats.registrationCount > 0
    ? ((stats.totalCheckinCount / stats.registrationCount) * 100).toFixed(1)
    : '0.0'
  const checkinRateOnsite = stats.onsiteRegistered > 0
    ? ((stats.onsiteCheckinCount / stats.onsiteRegistered) * 100).toFixed(1)
    : '0.0'
  const checkinRateOnline = stats.onlineRegistered > 0
    ? ((stats.onlineCheckinCount / stats.onlineRegistered) * 100).toFixed(1)
    : '0.0'

  return `# イベントサマリーレポート

## 1. 開催概要

| 項目 | 内容 |
|------|------|
| イベント名 | ${eventData.title ?? '―'} |
| 開催日時 | ${eventData.startAt ?? '―'} 〜 ${eventData.endAt ?? '―'} |
| 形式 | ${eventData.format ?? '―'} |
| ステータス | ${eventData.status ?? '―'} |

## 2. 参加者統計

| 指標 | 数値 |
|------|------|
| 申込数合計 | ${stats.registrationCount}名 |
| 現地参加申込 | ${stats.onsiteRegistered}名 |
| オンライン参加申込 | ${stats.onlineRegistered}名 |
| チェックイン合計 | ${stats.totalCheckinCount}名 |
| 現地チェックイン | ${stats.onsiteCheckinCount}名（${checkinRateOnsite}%） |
| オンラインチェックイン | ${stats.onlineCheckinCount}名（${checkinRateOnline}%） |
| 全体チェックイン率 | ${checkinRateTotal}% |
| 当日参加者 | ${stats.walkInCount}名 |

## 3. アンケート集計結果

アンケートデータは現在集計中です。

## 4. AI分析・改善提案

> 本セクションはAI APIが利用可能になり次第、自動生成されます。
> 現在はテンプレートベースの暫定レポートです。

### 改善ポイント

1. **チェックイン率の向上**: 全体チェックイン率${checkinRateTotal}%を向上させるため、リマインドメールの送信タイミングと内容の最適化を推奨します。
2. **当日参加者の対応**: 当日参加者${stats.walkInCount}名に対し、事前登録の促進施策を検討してください。
3. **データ分析の拡充**: アンケート機能の充実により、より詳細な参加者インサイトの取得を推奨します。
`
}

/**
 * レポートのメタデータを構築
 */
export function buildReportMetadata(
  stats: ParticipantStats,
  generationTime: number,
): ReportMetadata {
  return {
    participantCount: {
      onsite: stats.onsiteRegistered,
      online: stats.onlineRegistered,
      total: stats.registrationCount,
    },
    checkinRate: {
      onsite: stats.onsiteRegistered > 0
        ? Math.round((stats.onsiteCheckinCount / stats.onsiteRegistered) * 100) / 100
        : 0,
      online: stats.onlineRegistered > 0
        ? Math.round((stats.onlineCheckinCount / stats.onlineRegistered) * 100) / 100
        : 0,
      total: stats.registrationCount > 0
        ? Math.round((stats.totalCheckinCount / stats.registrationCount) * 100) / 100
        : 0,
    },
    surveyStats: {
      avgSatisfaction: 0,
      nps: 0,
      responseCount: 0,
    },
    questionStats: {
      totalQuestions: 0,
      answeredQuestions: 0,
      topCategories: [],
    },
    generationTime,
    version: '1.0',
  }
}
