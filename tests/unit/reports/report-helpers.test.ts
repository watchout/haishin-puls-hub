// EVT-040 レポートヘルパー関数 ユニットテスト
// 仕様書: docs/design/features/project/EVT-040_summary-report.md

import { describe, it, expect } from 'vitest'

// Vue import を避けてテスト用にヘルパー関数を再定義
type ReportType = 'summary' | 'proposal' | 'follow_up'
type ReportStatus = 'draft' | 'published'
type ReportGeneratedBy = 'ai' | 'manual'

interface ReportMetadata {
  participantCount?: {
    onsite: number
    online: number
    total: number
  }
  checkinRate?: {
    onsite: number
    online: number
    total: number
  }
  surveyStats?: {
    avgSatisfaction: number
    nps: number
    responseCount: number
  }
}

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  summary: 'サマリーレポート',
  proposal: '提案レポート',
  follow_up: 'フォローアップ',
}

const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  draft: '下書き',
  published: '公開済み',
}

const REPORT_STATUS_COLORS: Record<ReportStatus, string> = {
  draft: 'warning',
  published: 'success',
}

const REPORT_GENERATED_BY_LABELS: Record<ReportGeneratedBy, string> = {
  ai: 'AI生成',
  manual: '手動作成',
}

function getReportTypeLabel(type: ReportType | string): string {
  return REPORT_TYPE_LABELS[type as ReportType] ?? type
}

function getReportStatusLabel(status: ReportStatus | string): string {
  return REPORT_STATUS_LABELS[status as ReportStatus] ?? status
}

function getReportStatusColor(status: ReportStatus | string): string {
  return REPORT_STATUS_COLORS[status as ReportStatus] ?? 'neutral'
}

function getGeneratedByLabel(generatedBy: ReportGeneratedBy | string): string {
  return REPORT_GENERATED_BY_LABELS[generatedBy as ReportGeneratedBy] ?? generatedBy
}

function formatParticipantCount(metadata: ReportMetadata | null): string {
  if (!metadata?.participantCount) return '―'
  const { onsite, online, total } = metadata.participantCount
  return `${total}名（現地${onsite} / オンライン${online}）`
}

function formatCheckinRate(metadata: ReportMetadata | null): string {
  if (!metadata?.checkinRate) return '―'
  return `${(metadata.checkinRate.total * 100).toFixed(1)}%`
}

function formatSatisfaction(metadata: ReportMetadata | null): string {
  if (!metadata?.surveyStats || metadata.surveyStats.avgSatisfaction === 0) return '―'
  return `${metadata.surveyStats.avgSatisfaction.toFixed(1)} / 5.0`
}

function formatNps(metadata: ReportMetadata | null): string {
  if (!metadata?.surveyStats) return '―'
  return String(metadata.surveyStats.nps)
}

// ──────────────────────────────────────
// レポートタイプラベルテスト
// ──────────────────────────────────────

describe('getReportTypeLabel', () => {
  it('summary → サマリーレポート', () => {
    expect(getReportTypeLabel('summary')).toBe('サマリーレポート')
  })

  it('proposal → 提案レポート', () => {
    expect(getReportTypeLabel('proposal')).toBe('提案レポート')
  })

  it('follow_up → フォローアップ', () => {
    expect(getReportTypeLabel('follow_up')).toBe('フォローアップ')
  })

  it('未知のタイプ → そのまま返す', () => {
    expect(getReportTypeLabel('unknown')).toBe('unknown')
  })
})

// ──────────────────────────────────────
// レポートステータスラベルテスト
// ──────────────────────────────────────

describe('getReportStatusLabel', () => {
  it('draft → 下書き', () => {
    expect(getReportStatusLabel('draft')).toBe('下書き')
  })

  it('published → 公開済み', () => {
    expect(getReportStatusLabel('published')).toBe('公開済み')
  })

  it('未知のステータス → そのまま返す', () => {
    expect(getReportStatusLabel('archived')).toBe('archived')
  })
})

// ──────────────────────────────────────
// レポートステータスカラーテスト
// ──────────────────────────────────────

describe('getReportStatusColor', () => {
  it('draft → warning', () => {
    expect(getReportStatusColor('draft')).toBe('warning')
  })

  it('published → success', () => {
    expect(getReportStatusColor('published')).toBe('success')
  })

  it('未知のステータス → neutral', () => {
    expect(getReportStatusColor('archived')).toBe('neutral')
  })
})

// ──────────────────────────────────────
// generatedBy ラベルテスト
// ──────────────────────────────────────

describe('getGeneratedByLabel', () => {
  it('ai → AI生成', () => {
    expect(getGeneratedByLabel('ai')).toBe('AI生成')
  })

  it('manual → 手動作成', () => {
    expect(getGeneratedByLabel('manual')).toBe('手動作成')
  })

  it('未知の値 → そのまま返す', () => {
    expect(getGeneratedByLabel('unknown')).toBe('unknown')
  })
})

// ──────────────────────────────────────
// フォーマットヘルパーテスト
// ──────────────────────────────────────

describe('formatParticipantCount', () => {
  it('メタデータがない場合 → ―', () => {
    expect(formatParticipantCount(null)).toBe('―')
  })

  it('participantCount がない場合 → ―', () => {
    expect(formatParticipantCount({})).toBe('―')
  })

  it('正常なデータ → フォーマット', () => {
    const metadata = {
      participantCount: { onsite: 120, online: 80, total: 200 },
    }
    expect(formatParticipantCount(metadata)).toBe('200名（現地120 / オンライン80）')
  })

  it('0人の場合', () => {
    const metadata = {
      participantCount: { onsite: 0, online: 0, total: 0 },
    }
    expect(formatParticipantCount(metadata)).toBe('0名（現地0 / オンライン0）')
  })
})

describe('formatCheckinRate', () => {
  it('メタデータがない場合 → ―', () => {
    expect(formatCheckinRate(null)).toBe('―')
  })

  it('checkinRate がない場合 → ―', () => {
    expect(formatCheckinRate({})).toBe('―')
  })

  it('正常なデータ → パーセント表示', () => {
    const metadata = {
      checkinRate: { onsite: 0.85, online: 0.92, total: 0.88 },
    }
    expect(formatCheckinRate(metadata)).toBe('88.0%')
  })

  it('0の場合', () => {
    const metadata = {
      checkinRate: { onsite: 0, online: 0, total: 0 },
    }
    expect(formatCheckinRate(metadata)).toBe('0.0%')
  })

  it('100%の場合', () => {
    const metadata = {
      checkinRate: { onsite: 1, online: 1, total: 1 },
    }
    expect(formatCheckinRate(metadata)).toBe('100.0%')
  })
})

describe('formatSatisfaction', () => {
  it('メタデータがない場合 → ―', () => {
    expect(formatSatisfaction(null)).toBe('―')
  })

  it('surveyStats がない場合 → ―', () => {
    expect(formatSatisfaction({})).toBe('―')
  })

  it('満足度 0 の場合 → ―', () => {
    const metadata = {
      surveyStats: { avgSatisfaction: 0, nps: 0, responseCount: 0 },
    }
    expect(formatSatisfaction(metadata)).toBe('―')
  })

  it('正常なデータ → スコア表示', () => {
    const metadata = {
      surveyStats: { avgSatisfaction: 4.2, nps: 45, responseCount: 150 },
    }
    expect(formatSatisfaction(metadata)).toBe('4.2 / 5.0')
  })
})

describe('formatNps', () => {
  it('メタデータがない場合 → ―', () => {
    expect(formatNps(null)).toBe('―')
  })

  it('surveyStats がない場合 → ―', () => {
    expect(formatNps({})).toBe('―')
  })

  it('正のNPS', () => {
    const metadata = {
      surveyStats: { avgSatisfaction: 4.0, nps: 45, responseCount: 100 },
    }
    expect(formatNps(metadata)).toBe('45')
  })

  it('負のNPS', () => {
    const metadata = {
      surveyStats: { avgSatisfaction: 2.0, nps: -30, responseCount: 100 },
    }
    expect(formatNps(metadata)).toBe('-30')
  })

  it('NPS 0', () => {
    const metadata = {
      surveyStats: { avgSatisfaction: 3.0, nps: 0, responseCount: 100 },
    }
    expect(formatNps(metadata)).toBe('0')
  })
})
