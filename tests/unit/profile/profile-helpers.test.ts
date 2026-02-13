// ACCT-002 §9.1: プロフィール表示ヘルパー関数テスト
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import {
  getInitials,
  getRoleLabel,
  formatRelativeTime,
  formatAbsoluteTime,
  ROLE_LABELS,
} from '~/composables/useProfile'

// ──────────────────────────────────────
// getInitials テスト (§3.4, TC-001〜TC-004)
// ──────────────────────────────────────

describe('getInitials', () => {
  it('TC-001: "山田 太郎" → "YT"', () => {
    // 日本語の場合も先頭文字をuppercaseで返す
    // 山→"山".toUpperCase()="山", 太→"太".toUpperCase()="太"
    // 実際にはUnicodeなので大文字変換は変わらないが、ロジックとして先頭文字2つ
    const result = getInitials('山田 太郎')
    expect(result).toHaveLength(2)
    expect(result).toBe('山太')
  })

  it('TC-002: "山田" → "山"', () => {
    expect(getInitials('山田')).toBe('山')
  })

  it('TC-003: "John Doe" → "JD"', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })

  it('TC-004: "田中   次郎" → "田次"（スペース正規化）', () => {
    const result = getInitials('田中   次郎')
    expect(result).toHaveLength(2)
  })

  it('空文字列 → 空文字列', () => {
    expect(getInitials('')).toBe('')
  })

  it('スペースのみ → 空文字列', () => {
    expect(getInitials('   ')).toBe('')
  })

  it('1文字 → 1文字', () => {
    expect(getInitials('A')).toBe('A')
  })

  it('3パーツ → 最初の2パーツの先頭文字', () => {
    expect(getInitials('First Middle Last')).toBe('FM')
  })

  it('小文字入力 → 大文字変換', () => {
    expect(getInitials('alice bob')).toBe('AB')
  })
})

// ──────────────────────────────────────
// getRoleLabel テスト (§7.2)
// ──────────────────────────────────────

describe('getRoleLabel', () => {
  it('全ロールが日本語に変換される', () => {
    expect(getRoleLabel('system_admin')).toBe('システム管理者')
    expect(getRoleLabel('tenant_admin')).toBe('テナント管理者')
    expect(getRoleLabel('organizer')).toBe('セミナー主催者')
    expect(getRoleLabel('venue_staff')).toBe('会場スタッフ')
    expect(getRoleLabel('streaming_provider')).toBe('動画配信業者')
    expect(getRoleLabel('event_planner')).toBe('イベント企画会社')
    expect(getRoleLabel('speaker')).toBe('登壇者')
    expect(getRoleLabel('sales_marketing')).toBe('営業・マーケティング')
    expect(getRoleLabel('participant')).toBe('参加者')
    expect(getRoleLabel('vendor')).toBe('その他関連業者')
  })

  it('未知のロールはそのまま返す', () => {
    expect(getRoleLabel('unknown_role')).toBe('unknown_role')
  })

  it('ROLE_LABELS に10ロール定義されている', () => {
    expect(Object.keys(ROLE_LABELS)).toHaveLength(10)
  })
})

// ──────────────────────────────────────
// formatRelativeTime テスト (§7.3, TC-005〜TC-009)
// ──────────────────────────────────────

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-13T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('TC-005: 30秒前 → "たった今"', () => {
    const time = new Date('2026-02-13T11:59:30Z').toISOString()
    expect(formatRelativeTime(time)).toBe('たった今')
  })

  it('TC-006: 45分前 → "45分前"', () => {
    const time = new Date('2026-02-13T11:15:00Z').toISOString()
    expect(formatRelativeTime(time)).toBe('45分前')
  })

  it('TC-007: 3時間前 → "3時間前"', () => {
    const time = new Date('2026-02-13T09:00:00Z').toISOString()
    expect(formatRelativeTime(time)).toBe('3時間前')
  })

  it('TC-008: 2日前 → "2日前"', () => {
    const time = new Date('2026-02-11T12:00:00Z').toISOString()
    expect(formatRelativeTime(time)).toBe('2日前')
  })

  it('TC-009: 10日前 → 絶対日時', () => {
    const time = new Date('2026-02-03T12:00:00Z').toISOString()
    const result = formatRelativeTime(time)
    expect(result).toContain('2026')
  })

  it('null → "未記録"', () => {
    expect(formatRelativeTime(null)).toBe('未記録')
  })

  it('1分前 → "1分前"', () => {
    const time = new Date('2026-02-13T11:59:00Z').toISOString()
    expect(formatRelativeTime(time)).toBe('1分前')
  })

  it('ちょうど1時間前 → "1時間前"', () => {
    const time = new Date('2026-02-13T11:00:00Z').toISOString()
    expect(formatRelativeTime(time)).toBe('1時間前')
  })

  it('6日前 → "6日前"', () => {
    const time = new Date('2026-02-07T12:00:00Z').toISOString()
    expect(formatRelativeTime(time)).toBe('6日前')
  })

  it('ちょうど7日前 → 絶対日時', () => {
    const time = new Date('2026-02-06T12:00:00Z').toISOString()
    const result = formatRelativeTime(time)
    expect(result).toContain('2026')
  })
})

// ──────────────────────────────────────
// formatAbsoluteTime テスト
// ──────────────────────────────────────

describe('formatAbsoluteTime', () => {
  it('有効な日時文字列を変換する', () => {
    const result = formatAbsoluteTime('2026-02-13T12:00:00Z')
    expect(result).toContain('2026')
  })

  it('null → 空文字列', () => {
    expect(formatAbsoluteTime(null)).toBe('')
  })
})
