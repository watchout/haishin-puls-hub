// EVT-040 サマリーレポート バリデーション ユニットテスト
// 仕様書: docs/design/features/project/EVT-040_summary-report.md §3-F

import { describe, it, expect } from 'vitest'
import {
  generateReportSchema,
  updateReportSchema,
  shareReportSchema,
  sendProposalSchema,
  reportMetadataSchema,
  isValidStatusTransition,
  canGenerateReport,
  canEditReport,
  canSendProposal,
  REPORT_TYPES,
  REPORT_STATUSES,
  REPORT_GENERATED_BY,
  MAX_REPORT_CONTENT_LENGTH,
  MAX_SHARE_MESSAGE_LENGTH,
  MAX_SHARE_RECIPIENTS,
  MAX_PROPOSAL_CONTENT_LENGTH,
  MAX_REPORT_TITLE_LENGTH,
  MAX_EDIT_COMMENT_LENGTH,
  MAX_SATISFACTION_SCORE,
  MIN_SATISFACTION_SCORE,
  MAX_NPS,
  MIN_NPS,
  MAX_PDF_FILE_SIZE_MB,
} from '~/server/utils/report-validation'

// ──────────────────────────────────────
// 定数テスト
// ──────────────────────────────────────

describe('レポートバリデーション定数', () => {
  it('レポートタイプが3つ定義されている', () => {
    expect(REPORT_TYPES).toHaveLength(3)
    expect(REPORT_TYPES).toContain('summary')
    expect(REPORT_TYPES).toContain('proposal')
    expect(REPORT_TYPES).toContain('follow_up')
  })

  it('ステータスが2つ定義されている', () => {
    expect(REPORT_STATUSES).toHaveLength(2)
    expect(REPORT_STATUSES).toContain('draft')
    expect(REPORT_STATUSES).toContain('published')
  })

  it('生成者が2つ定義されている', () => {
    expect(REPORT_GENERATED_BY).toHaveLength(2)
    expect(REPORT_GENERATED_BY).toContain('ai')
    expect(REPORT_GENERATED_BY).toContain('manual')
  })

  it('§3-F 境界値定数が正しい', () => {
    expect(MAX_REPORT_TITLE_LENGTH).toBe(200)
    expect(MAX_REPORT_CONTENT_LENGTH).toBe(100_000)
    expect(MAX_EDIT_COMMENT_LENGTH).toBe(5_000)
    expect(MAX_SHARE_MESSAGE_LENGTH).toBe(1_000)
    expect(MAX_SHARE_RECIPIENTS).toBe(10)
    expect(MAX_PROPOSAL_CONTENT_LENGTH).toBe(10_000)
    expect(MAX_SATISFACTION_SCORE).toBe(5.0)
    expect(MIN_SATISFACTION_SCORE).toBe(1.0)
    expect(MAX_NPS).toBe(100)
    expect(MIN_NPS).toBe(-100)
    expect(MAX_PDF_FILE_SIZE_MB).toBe(10)
  })
})

// ──────────────────────────────────────
// generateReportSchema テスト
// ──────────────────────────────────────

describe('generateReportSchema', () => {
  it('デフォルト値（summary）が適用される', () => {
    const result = generateReportSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reportType).toBe('summary')
    }
  })

  it('有効なレポートタイプが受け入れられる', () => {
    for (const type of REPORT_TYPES) {
      const result = generateReportSchema.safeParse({ reportType: type })
      expect(result.success).toBe(true)
    }
  })

  it('無効なレポートタイプが拒否される', () => {
    const result = generateReportSchema.safeParse({ reportType: 'invalid' })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────
// updateReportSchema テスト
// ──────────────────────────────────────

describe('updateReportSchema', () => {
  it('content のみの更新が受け入れられる', () => {
    const result = updateReportSchema.safeParse({ content: '# レポート' })
    expect(result.success).toBe(true)
  })

  it('status のみの更新が受け入れられる', () => {
    const result = updateReportSchema.safeParse({ status: 'published' })
    expect(result.success).toBe(true)
  })

  it('空オブジェクトが受け入れられる（全フィールド optional）', () => {
    const result = updateReportSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('§3-F 境界値: content 100,000文字ちょうど → OK', () => {
    const content = 'a'.repeat(MAX_REPORT_CONTENT_LENGTH)
    const result = updateReportSchema.safeParse({ content })
    expect(result.success).toBe(true)
  })

  it('§3-F 境界値: content 100,001文字 → エラー', () => {
    const content = 'a'.repeat(MAX_REPORT_CONTENT_LENGTH + 1)
    const result = updateReportSchema.safeParse({ content })
    expect(result.success).toBe(false)
  })

  it('content 空文字 → エラー（min 1）', () => {
    const result = updateReportSchema.safeParse({ content: '' })
    expect(result.success).toBe(false)
  })

  it('無効なステータスが拒否される', () => {
    const result = updateReportSchema.safeParse({ status: 'archived' })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────
// shareReportSchema テスト
// ──────────────────────────────────────

describe('shareReportSchema', () => {
  it('正常なリクエストが受け入れられる', () => {
    const result = shareReportSchema.safeParse({
      to: ['test@example.com'],
      message: 'レポートを共有します',
      attachPdf: true,
    })
    expect(result.success).toBe(true)
  })

  it('message なしでも受け入れられる', () => {
    const result = shareReportSchema.safeParse({
      to: ['test@example.com'],
      attachPdf: false,
    })
    expect(result.success).toBe(true)
  })

  it('§3-F 境界値: 宛先10件ちょうど → OK', () => {
    const to = Array.from({ length: MAX_SHARE_RECIPIENTS }, (_, i) => `user${i}@example.com`)
    const result = shareReportSchema.safeParse({ to, attachPdf: false })
    expect(result.success).toBe(true)
  })

  it('§3-F 境界値: 宛先11件 → エラー', () => {
    const to = Array.from({ length: MAX_SHARE_RECIPIENTS + 1 }, (_, i) => `user${i}@example.com`)
    const result = shareReportSchema.safeParse({ to, attachPdf: false })
    expect(result.success).toBe(false)
  })

  it('宛先0件 → エラー', () => {
    const result = shareReportSchema.safeParse({ to: [], attachPdf: false })
    expect(result.success).toBe(false)
  })

  it('無効なメールアドレス → エラー', () => {
    const result = shareReportSchema.safeParse({
      to: ['not-an-email'],
      attachPdf: false,
    })
    expect(result.success).toBe(false)
  })

  it('§3-F 境界値: message 1,000文字ちょうど → OK', () => {
    const result = shareReportSchema.safeParse({
      to: ['test@example.com'],
      message: 'a'.repeat(MAX_SHARE_MESSAGE_LENGTH),
      attachPdf: false,
    })
    expect(result.success).toBe(true)
  })

  it('§3-F 境界値: message 1,001文字 → エラー', () => {
    const result = shareReportSchema.safeParse({
      to: ['test@example.com'],
      message: 'a'.repeat(MAX_SHARE_MESSAGE_LENGTH + 1),
      attachPdf: false,
    })
    expect(result.success).toBe(false)
  })

  it('attachPdf が必須', () => {
    const result = shareReportSchema.safeParse({
      to: ['test@example.com'],
    })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────
// sendProposalSchema テスト
// ──────────────────────────────────────

describe('sendProposalSchema', () => {
  it('正常なリクエストが受け入れられる', () => {
    const result = sendProposalSchema.safeParse({
      to: ['organizer@example.com'],
      proposalContent: '## 次回開催提案\n\n次回は3月開催を推奨します。',
    })
    expect(result.success).toBe(true)
  })

  it('proposalContent 空文字 → エラー', () => {
    const result = sendProposalSchema.safeParse({
      to: ['organizer@example.com'],
      proposalContent: '',
    })
    expect(result.success).toBe(false)
  })

  it('§3-F 境界値: proposalContent 10,000文字ちょうど → OK', () => {
    const result = sendProposalSchema.safeParse({
      to: ['organizer@example.com'],
      proposalContent: 'a'.repeat(MAX_PROPOSAL_CONTENT_LENGTH),
    })
    expect(result.success).toBe(true)
  })

  it('§3-F 境界値: proposalContent 10,001文字 → エラー', () => {
    const result = sendProposalSchema.safeParse({
      to: ['organizer@example.com'],
      proposalContent: 'a'.repeat(MAX_PROPOSAL_CONTENT_LENGTH + 1),
    })
    expect(result.success).toBe(false)
  })

  it('§3-F 境界値: 宛先10件ちょうど → OK', () => {
    const to = Array.from({ length: MAX_SHARE_RECIPIENTS }, (_, i) => `user${i}@example.com`)
    const result = sendProposalSchema.safeParse({
      to,
      proposalContent: '提案内容',
    })
    expect(result.success).toBe(true)
  })

  it('§3-F 境界値: 宛先11件 → エラー', () => {
    const to = Array.from({ length: MAX_SHARE_RECIPIENTS + 1 }, (_, i) => `user${i}@example.com`)
    const result = sendProposalSchema.safeParse({
      to,
      proposalContent: '提案内容',
    })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────
// reportMetadataSchema テスト
// ──────────────────────────────────────

describe('reportMetadataSchema', () => {
  it('完全なメタデータが受け入れられる', () => {
    const result = reportMetadataSchema.safeParse({
      participantCount: { onsite: 120, online: 80, total: 200 },
      checkinRate: { onsite: 0.85, online: 0.92, total: 0.88 },
      surveyStats: { avgSatisfaction: 4.2, nps: 45, responseCount: 150 },
      questionStats: { totalQuestions: 25, answeredQuestions: 22, topCategories: ['技術', 'キャリア'] },
      generationTime: 5.2,
      version: '1.0',
    })
    expect(result.success).toBe(true)
  })

  it('空オブジェクトが受け入れられる（全フィールド optional）', () => {
    const result = reportMetadataSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('§3-F 境界値: 満足度 1.0 → OK', () => {
    const result = reportMetadataSchema.safeParse({
      surveyStats: { avgSatisfaction: MIN_SATISFACTION_SCORE, nps: 0, responseCount: 1 },
    })
    expect(result.success).toBe(true)
  })

  it('§3-F 境界値: 満足度 5.0 → OK', () => {
    const result = reportMetadataSchema.safeParse({
      surveyStats: { avgSatisfaction: MAX_SATISFACTION_SCORE, nps: 0, responseCount: 1 },
    })
    expect(result.success).toBe(true)
  })

  it('§3-F 境界値: 満足度 0.9 → エラー', () => {
    const result = reportMetadataSchema.safeParse({
      surveyStats: { avgSatisfaction: 0.9, nps: 0, responseCount: 1 },
    })
    expect(result.success).toBe(false)
  })

  it('§3-F 境界値: 満足度 5.1 → エラー', () => {
    const result = reportMetadataSchema.safeParse({
      surveyStats: { avgSatisfaction: 5.1, nps: 0, responseCount: 1 },
    })
    expect(result.success).toBe(false)
  })

  it('§3-F 境界値: NPS -100 → OK', () => {
    const result = reportMetadataSchema.safeParse({
      surveyStats: { avgSatisfaction: 3.0, nps: MIN_NPS, responseCount: 1 },
    })
    expect(result.success).toBe(true)
  })

  it('§3-F 境界値: NPS 100 → OK', () => {
    const result = reportMetadataSchema.safeParse({
      surveyStats: { avgSatisfaction: 3.0, nps: MAX_NPS, responseCount: 1 },
    })
    expect(result.success).toBe(true)
  })

  it('§3-F 境界値: NPS -101 → エラー', () => {
    const result = reportMetadataSchema.safeParse({
      surveyStats: { avgSatisfaction: 3.0, nps: -101, responseCount: 1 },
    })
    expect(result.success).toBe(false)
  })

  it('§3-F 境界値: NPS 101 → エラー', () => {
    const result = reportMetadataSchema.safeParse({
      surveyStats: { avgSatisfaction: 3.0, nps: 101, responseCount: 1 },
    })
    expect(result.success).toBe(false)
  })

  it('§3-F 境界値: チェックイン率 0.0 → OK', () => {
    const result = reportMetadataSchema.safeParse({
      checkinRate: { onsite: 0, online: 0, total: 0 },
    })
    expect(result.success).toBe(true)
  })

  it('§3-F 境界値: チェックイン率 1.0 → OK', () => {
    const result = reportMetadataSchema.safeParse({
      checkinRate: { onsite: 1, online: 1, total: 1 },
    })
    expect(result.success).toBe(true)
  })

  it('§3-F 境界値: チェックイン率 1.1 → エラー', () => {
    const result = reportMetadataSchema.safeParse({
      checkinRate: { onsite: 1.1, online: 0, total: 0 },
    })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────
// ステータス遷移テスト（BR-040-04）
// ──────────────────────────────────────

describe('isValidStatusTransition (BR-040-04)', () => {
  it('draft → published は可能', () => {
    expect(isValidStatusTransition('draft', 'published')).toBe(true)
  })

  it('published → draft は不可（不可逆）', () => {
    expect(isValidStatusTransition('published', 'draft')).toBe(false)
  })

  it('draft → draft は不可（同じステータスへの遷移は対象外）', () => {
    expect(isValidStatusTransition('draft', 'draft')).toBe(false)
  })

  it('published → published は不可', () => {
    expect(isValidStatusTransition('published', 'published')).toBe(false)
  })

  it('存在しないステータスからの遷移は不可', () => {
    expect(isValidStatusTransition('archived', 'draft')).toBe(false)
  })
})

// ──────────────────────────────────────
// ロール権限テスト（§1 対象ロール）
// ──────────────────────────────────────

describe('canGenerateReport（§1 レポート生成権限）', () => {
  it('organizer はレポート生成可能', () => {
    expect(canGenerateReport('organizer')).toBe(true)
  })

  it('sales_marketing はレポート生成可能', () => {
    expect(canGenerateReport('sales_marketing')).toBe(true)
  })

  it('venue_staff はレポート生成可能', () => {
    expect(canGenerateReport('venue_staff')).toBe(true)
  })

  it('system_admin はレポート生成可能', () => {
    expect(canGenerateReport('system_admin')).toBe(true)
  })

  it('tenant_admin はレポート生成可能', () => {
    expect(canGenerateReport('tenant_admin')).toBe(true)
  })

  it('streaming_provider はレポート生成不可', () => {
    expect(canGenerateReport('streaming_provider')).toBe(false)
  })

  it('speaker はレポート生成不可', () => {
    expect(canGenerateReport('speaker')).toBe(false)
  })

  it('participant はレポート生成不可', () => {
    expect(canGenerateReport('participant')).toBe(false)
  })
})

describe('canEditReport（§1 レポート編集権限）', () => {
  it('organizer はレポート編集可能', () => {
    expect(canEditReport('organizer')).toBe(true)
  })

  it('speaker はレポート編集不可', () => {
    expect(canEditReport('speaker')).toBe(false)
  })
})

describe('canSendProposal（§1 次回提案送信権限）', () => {
  it('venue_staff は次回提案送信可能', () => {
    expect(canSendProposal('venue_staff')).toBe(true)
  })

  it('system_admin は次回提案送信可能', () => {
    expect(canSendProposal('system_admin')).toBe(true)
  })

  it('organizer は次回提案送信不可', () => {
    expect(canSendProposal('organizer')).toBe(false)
  })

  it('speaker は次回提案送信不可', () => {
    expect(canSendProposal('speaker')).toBe(false)
  })
})
