// EVT-020-021 登壇者ヘルパー ユニットテスト
// Note: Vue composable 依存を避けるため、ヘルパー関数をローカルに再定義してテスト
import { describe, it, expect } from 'vitest'

// ──────────────────────────────────────
// ローカル再定義（composables/useSpeakers.ts と同等ロジック）
// ──────────────────────────────────────

type SubmissionStatus = 'pending' | 'submitted' | 'confirmed'
type SpeakerFormat = 'onsite' | 'online'

const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  pending: '未提出',
  submitted: '提出済',
  confirmed: '確認済',
}

const SUBMISSION_STATUS_COLORS: Record<SubmissionStatus, string> = {
  pending: 'neutral',
  submitted: 'warning',
  confirmed: 'success',
}

const SPEAKER_FORMAT_LABELS: Record<SpeakerFormat, string> = {
  onsite: '現地登壇',
  online: 'オンライン登壇',
}

function getSubmissionStatusLabel(status: SubmissionStatus): string {
  return SUBMISSION_STATUS_LABELS[status] ?? status
}

function getSubmissionStatusColor(status: SubmissionStatus): string {
  return SUBMISSION_STATUS_COLORS[status] ?? 'neutral'
}

function getSpeakerFormatLabel(format: string | null): string {
  if (!format) return '-'
  return SPEAKER_FORMAT_LABELS[format as SpeakerFormat] ?? format
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return '-'
  if (minutes < 60) return `${minutes}分`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`
}

// ──────────────────────────────────────
// テスト
// ──────────────────────────────────────

describe('getSubmissionStatusLabel', () => {
  it('pending → 未提出', () => {
    expect(getSubmissionStatusLabel('pending')).toBe('未提出')
  })

  it('submitted → 提出済', () => {
    expect(getSubmissionStatusLabel('submitted')).toBe('提出済')
  })

  it('confirmed → 確認済', () => {
    expect(getSubmissionStatusLabel('confirmed')).toBe('確認済')
  })

  it('不明な値はそのまま返す', () => {
    expect(getSubmissionStatusLabel('unknown' as SubmissionStatus)).toBe('unknown')
  })
})

describe('getSubmissionStatusColor', () => {
  it('pending → neutral (灰色)', () => {
    expect(getSubmissionStatusColor('pending')).toBe('neutral')
  })

  it('submitted → warning (黄色)', () => {
    expect(getSubmissionStatusColor('submitted')).toBe('warning')
  })

  it('confirmed → success (緑色)', () => {
    expect(getSubmissionStatusColor('confirmed')).toBe('success')
  })

  it('不明な値は neutral を返す', () => {
    expect(getSubmissionStatusColor('unknown' as SubmissionStatus)).toBe('neutral')
  })
})

describe('getSpeakerFormatLabel', () => {
  it('onsite → 現地登壇', () => {
    expect(getSpeakerFormatLabel('onsite')).toBe('現地登壇')
  })

  it('online → オンライン登壇', () => {
    expect(getSpeakerFormatLabel('online')).toBe('オンライン登壇')
  })

  it('null → -', () => {
    expect(getSpeakerFormatLabel(null)).toBe('-')
  })

  it('不明な値はそのまま返す', () => {
    expect(getSpeakerFormatLabel('hybrid')).toBe('hybrid')
  })
})

describe('formatDuration', () => {
  it('null → -', () => {
    expect(formatDuration(null)).toBe('-')
  })

  it('30 → 30分', () => {
    expect(formatDuration(30)).toBe('30分')
  })

  it('45 → 45分', () => {
    expect(formatDuration(45)).toBe('45分')
  })

  it('59 → 59分', () => {
    expect(formatDuration(59)).toBe('59分')
  })

  it('60 → 1時間', () => {
    expect(formatDuration(60)).toBe('1時間')
  })

  it('90 → 1時間30分', () => {
    expect(formatDuration(90)).toBe('1時間30分')
  })

  it('120 → 2時間', () => {
    expect(formatDuration(120)).toBe('2時間')
  })

  it('240 → 4時間', () => {
    expect(formatDuration(240)).toBe('4時間')
  })

  it('1 → 1分', () => {
    expect(formatDuration(1)).toBe('1分')
  })

  it('150 → 2時間30分', () => {
    expect(formatDuration(150)).toBe('2時間30分')
  })
})
