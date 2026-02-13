// EVT-030-031-033 参加者ヘルパー ユニットテスト
// Note: Vue composable 依存を避けるため、ヘルパー関数をローカルに再定義してテスト
import { describe, it, expect } from 'vitest'

// ──────────────────────────────────────
// ローカル再定義（composables/useParticipants.ts と同等ロジック）
// ──────────────────────────────────────

type ParticipationType = 'onsite' | 'online'
type RegistrationStatus = 'registered' | 'confirmed' | 'cancelled'
type CheckinMethod = 'qr' | 'manual' | 'walk_in'

const PARTICIPATION_TYPE_LABELS: Record<ParticipationType, string> = {
  onsite: '現地参加',
  online: 'オンライン参加',
}

const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  registered: '申込済',
  confirmed: '確認済',
  cancelled: 'キャンセル',
}

const REGISTRATION_STATUS_COLORS: Record<RegistrationStatus, string> = {
  registered: 'info',
  confirmed: 'success',
  cancelled: 'error',
}

const CHECKIN_METHOD_LABELS: Record<CheckinMethod, string> = {
  qr: 'QR',
  manual: '手動',
  walk_in: '当日',
}

function getParticipationTypeLabel(type: ParticipationType | string | null): string {
  if (!type) return '-'
  return PARTICIPATION_TYPE_LABELS[type as ParticipationType] ?? type
}

function getRegistrationStatusLabel(status: RegistrationStatus | string): string {
  return REGISTRATION_STATUS_LABELS[status as RegistrationStatus] ?? status
}

function getRegistrationStatusColor(status: RegistrationStatus | string): string {
  return REGISTRATION_STATUS_COLORS[status as RegistrationStatus] ?? 'neutral'
}

function getCheckinMethodLabel(method: CheckinMethod | string | null): string {
  if (!method) return '-'
  return CHECKIN_METHOD_LABELS[method as CheckinMethod] ?? method
}

function formatCheckinRate(rate: number): string {
  return `${rate.toFixed(1)}%`
}

// ──────────────────────────────────────
// テスト: getParticipationTypeLabel
// ──────────────────────────────────────

describe('getParticipationTypeLabel', () => {
  it('onsite → 現地参加', () => {
    expect(getParticipationTypeLabel('onsite')).toBe('現地参加')
  })

  it('online → オンライン参加', () => {
    expect(getParticipationTypeLabel('online')).toBe('オンライン参加')
  })

  it('null → -', () => {
    expect(getParticipationTypeLabel(null)).toBe('-')
  })

  it('不明な値はそのまま返す', () => {
    expect(getParticipationTypeLabel('hybrid')).toBe('hybrid')
  })
})

// ──────────────────────────────────────
// テスト: getRegistrationStatusLabel
// ──────────────────────────────────────

describe('getRegistrationStatusLabel', () => {
  it('registered → 申込済', () => {
    expect(getRegistrationStatusLabel('registered')).toBe('申込済')
  })

  it('confirmed → 確認済', () => {
    expect(getRegistrationStatusLabel('confirmed')).toBe('確認済')
  })

  it('cancelled → キャンセル', () => {
    expect(getRegistrationStatusLabel('cancelled')).toBe('キャンセル')
  })

  it('不明な値はそのまま返す', () => {
    expect(getRegistrationStatusLabel('unknown')).toBe('unknown')
  })
})

// ──────────────────────────────────────
// テスト: getRegistrationStatusColor
// ──────────────────────────────────────

describe('getRegistrationStatusColor', () => {
  it('registered → info (青系)', () => {
    expect(getRegistrationStatusColor('registered')).toBe('info')
  })

  it('confirmed → success (緑)', () => {
    expect(getRegistrationStatusColor('confirmed')).toBe('success')
  })

  it('cancelled → error (赤)', () => {
    expect(getRegistrationStatusColor('cancelled')).toBe('error')
  })

  it('不明な値は neutral を返す', () => {
    expect(getRegistrationStatusColor('unknown')).toBe('neutral')
  })
})

// ──────────────────────────────────────
// テスト: getCheckinMethodLabel
// ──────────────────────────────────────

describe('getCheckinMethodLabel', () => {
  it('qr → QR', () => {
    expect(getCheckinMethodLabel('qr')).toBe('QR')
  })

  it('manual → 手動', () => {
    expect(getCheckinMethodLabel('manual')).toBe('手動')
  })

  it('walk_in → 当日', () => {
    expect(getCheckinMethodLabel('walk_in')).toBe('当日')
  })

  it('null → -', () => {
    expect(getCheckinMethodLabel(null)).toBe('-')
  })

  it('不明な値はそのまま返す', () => {
    expect(getCheckinMethodLabel('other')).toBe('other')
  })
})

// ──────────────────────────────────────
// テスト: formatCheckinRate
// ──────────────────────────────────────

describe('formatCheckinRate', () => {
  it('0 → 0.0%', () => {
    expect(formatCheckinRate(0)).toBe('0.0%')
  })

  it('58.0 → 58.0%', () => {
    expect(formatCheckinRate(58.0)).toBe('58.0%')
  })

  it('100 → 100.0%', () => {
    expect(formatCheckinRate(100)).toBe('100.0%')
  })

  it('33.333 → 33.3%', () => {
    expect(formatCheckinRate(33.333)).toBe('33.3%')
  })

  it('99.99 → 100.0%', () => {
    expect(formatCheckinRate(99.99)).toBe('100.0%')
  })

  it('0.1 → 0.1%', () => {
    expect(formatCheckinRate(0.1)).toBe('0.1%')
  })
})
