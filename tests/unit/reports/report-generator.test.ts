// EVT-040 レポート生成ユーティリティ ユニットテスト
// 仕様書: docs/design/features/project/EVT-040_summary-report.md §3 FR-040-02

import { describe, it, expect } from 'vitest'
import {
  buildReportPrompt,
  buildReportMetadata,
  getSystemPrompt,
} from '~/server/utils/report-helpers'
import type { ParticipantStats } from '~/server/utils/report-helpers'

// ──────────────────────────────────────
// テストデータ
// ──────────────────────────────────────

const mockStats: ParticipantStats = {
  registrationCount: 200,
  onsiteRegistered: 120,
  onlineRegistered: 80,
  onsiteCheckinCount: 102,
  onlineCheckinCount: 74,
  totalCheckinCount: 176,
  walkInCount: 5,
}

const mockEventData = {
  title: 'テック勉強会 Vol.5',
  startAt: '2026-02-08T14:00:00Z',
  endAt: '2026-02-08T16:00:00Z',
  format: 'hybrid',
  status: 'completed',
}

const emptyStats: ParticipantStats = {
  registrationCount: 0,
  onsiteRegistered: 0,
  onlineRegistered: 0,
  onsiteCheckinCount: 0,
  onlineCheckinCount: 0,
  totalCheckinCount: 0,
  walkInCount: 0,
}

// ──────────────────────────────────────
// buildReportPrompt テスト
// ──────────────────────────────────────

describe('buildReportPrompt', () => {
  it('イベントデータが含まれる', () => {
    const prompt = buildReportPrompt(mockEventData, mockStats)
    expect(prompt).toContain('テック勉強会 Vol.5')
    expect(prompt).toContain('2026-02-08T14:00:00Z')
    expect(prompt).toContain('hybrid')
  })

  it('参加者統計が含まれる', () => {
    const prompt = buildReportPrompt(mockEventData, mockStats)
    expect(prompt).toContain('200')
    expect(prompt).toContain('120')
    expect(prompt).toContain('80')
    expect(prompt).toContain('176')
  })

  it('チェックイン率が計算される', () => {
    const prompt = buildReportPrompt(mockEventData, mockStats)
    // 現地: 102/120 = 85.0%
    expect(prompt).toContain('85.0%')
    // オンライン: 74/80 = 92.5%
    expect(prompt).toContain('92.5%')
    // 全体: 176/200 = 88.0%
    expect(prompt).toContain('88.0%')
  })

  it('当日参加者数が含まれる', () => {
    const prompt = buildReportPrompt(mockEventData, mockStats)
    expect(prompt).toContain('当日参加者数: 5名')
  })

  it('参加者0人の場合、チェックイン率が0.0%になる', () => {
    const prompt = buildReportPrompt(mockEventData, emptyStats)
    expect(prompt).toContain('0.0%')
  })

  it('イベントデータが不完全でも動作する', () => {
    const prompt = buildReportPrompt({}, emptyStats)
    expect(prompt).toContain('不明')
  })
})

// ──────────────────────────────────────
// buildReportMetadata テスト
// ──────────────────────────────────────

describe('buildReportMetadata', () => {
  it('参加者数が正しく格納される', () => {
    const metadata = buildReportMetadata(mockStats, 5.0)
    expect(metadata.participantCount.onsite).toBe(120)
    expect(metadata.participantCount.online).toBe(80)
    expect(metadata.participantCount.total).toBe(200)
  })

  it('チェックイン率が正しく計算される', () => {
    const metadata = buildReportMetadata(mockStats, 5.0)
    // 102/120 = 0.85
    expect(metadata.checkinRate.onsite).toBe(0.85)
    // 74/80 = 0.925 → 0.93 (round)
    expect(metadata.checkinRate.online).toBe(0.93)
    // 176/200 = 0.88
    expect(metadata.checkinRate.total).toBe(0.88)
  })

  it('参加者0人の場合、チェックイン率が0になる', () => {
    const metadata = buildReportMetadata(emptyStats, 1.0)
    expect(metadata.checkinRate.onsite).toBe(0)
    expect(metadata.checkinRate.online).toBe(0)
    expect(metadata.checkinRate.total).toBe(0)
  })

  it('生成時間が記録される', () => {
    const metadata = buildReportMetadata(mockStats, 5.2)
    expect(metadata.generationTime).toBe(5.2)
  })

  it('バージョンが設定される', () => {
    const metadata = buildReportMetadata(mockStats, 1.0)
    expect(metadata.version).toBe('1.0')
  })

  it('surveyStats のデフォルト値が設定される', () => {
    const metadata = buildReportMetadata(mockStats, 1.0)
    expect(metadata.surveyStats.avgSatisfaction).toBe(0)
    expect(metadata.surveyStats.nps).toBe(0)
    expect(metadata.surveyStats.responseCount).toBe(0)
  })

  it('questionStats のデフォルト値が設定される', () => {
    const metadata = buildReportMetadata(mockStats, 1.0)
    expect(metadata.questionStats.totalQuestions).toBe(0)
    expect(metadata.questionStats.answeredQuestions).toBe(0)
    expect(metadata.questionStats.topCategories).toEqual([])
  })
})

// ──────────────────────────────────────
// システムプロンプトテスト（BR-040-03）
// ──────────────────────────────────────

describe('getSystemPrompt (BR-040-03)', () => {
  it('システムプロンプトが存在する', () => {
    const prompt = getSystemPrompt()
    expect(prompt.length).toBeGreaterThan(0)
  })

  it('必須セクション指示が含まれる', () => {
    const prompt = getSystemPrompt()
    expect(prompt).toContain('開催概要')
    expect(prompt).toContain('参加者統計')
    expect(prompt).toContain('AI分析')
  })

  it('トーン指示が含まれる', () => {
    const prompt = getSystemPrompt()
    expect(prompt).toContain('客観的')
    expect(prompt).toContain('データドリブン')
  })

  it('禁止事項が含まれる', () => {
    const prompt = getSystemPrompt()
    expect(prompt).toContain('禁止事項')
    expect(prompt).toContain('憶測')
  })

  it('Markdown形式指示が含まれる', () => {
    const prompt = getSystemPrompt()
    expect(prompt).toContain('Markdown')
  })
})
