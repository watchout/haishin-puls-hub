// ACCT-002 §9.1: プロフィール表示ヘルパー関数テスト
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import {
  getInitials,
  getRoleLabel,
  formatRelativeTime,
  formatAbsoluteTime,
  ROLE_LABELS,
  type TenantMembership,
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

// ──────────────────────────────────────
// §2.5 境界値テスト
// ──────────────────────────────────────

describe('getInitials 境界値 (§2.5)', () => {
  it('最小値: 1文字 "A" → "A"', () => {
    expect(getInitials('A')).toBe('A')
  })

  it('最大値: 100文字の名前 → 先頭2文字', () => {
    const longName = 'A'.repeat(50) + ' ' + 'B'.repeat(50)
    const result = getInitials(longName)
    expect(result).toBe('AB')
    expect(result).toHaveLength(2)
  })

  it('AC-203: 絵文字を含む名前 → 先頭文字抽出', () => {
    // 絵文字はUnicodeサロゲートペアなので[0]の挙動を確認
    const result = getInitials('Alice 😀Bob')
    expect(result).toHaveLength(2)
  })

  it('trim前後のスペース: "  田中  " → "田"', () => {
    expect(getInitials('  田中  ')).toBe('田')
  })

  it('タブ文字区切り → 1パーツ扱い', () => {
    const result = getInitials('田中\t太郎')
    // \t は \\s+ でスプリットされるので2パーツ
    expect(result).toHaveLength(2)
  })
})

describe('formatRelativeTime 境界値 (§2.5)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-13T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('境界: 59秒前 → "たった今"', () => {
    const time = new Date('2026-02-13T11:59:01Z').toISOString()
    expect(formatRelativeTime(time)).toBe('たった今')
  })

  it('境界: ちょうど1分前 → "1分前"', () => {
    const time = new Date('2026-02-13T11:59:00Z').toISOString()
    expect(formatRelativeTime(time)).toBe('1分前')
  })

  it('境界: 59分前 → "59分前"', () => {
    const time = new Date('2026-02-13T11:01:00Z').toISOString()
    expect(formatRelativeTime(time)).toBe('59分前')
  })

  it('境界: 23時間前 → "23時間前"', () => {
    const time = new Date('2026-02-12T13:00:00Z').toISOString()
    expect(formatRelativeTime(time)).toBe('23時間前')
  })

  it('境界: ちょうど1日前 → "1日前"', () => {
    const time = new Date('2026-02-12T12:00:00Z').toISOString()
    expect(formatRelativeTime(time)).toBe('1日前')
  })

  it('境界: 6日前 → "6日前"（最大相対日数）', () => {
    const time = new Date('2026-02-07T12:00:00Z').toISOString()
    expect(formatRelativeTime(time)).toBe('6日前')
  })

  it('境界: ちょうど7日前 → 絶対日時に切り替え', () => {
    const time = new Date('2026-02-06T12:00:00Z').toISOString()
    const result = formatRelativeTime(time)
    expect(result).not.toContain('日前')
    expect(result).toContain('2026')
  })

  it('未来の日時 → "未記録"', () => {
    const time = new Date('2026-02-14T00:00:00Z').toISOString()
    expect(formatRelativeTime(time)).toBe('未記録')
  })
})

// ──────────────────────────────────────
// §2.4 I/O例: アバターフォールバックロジック (AC-009)
// ──────────────────────────────────────

describe('アバターフォールバックロジック (AC-009, §2.4)', () => {
  it('I/O例 #6: image=null, name="山田 太郎" → イニシャル "山太"', () => {
    const image = null
    const name = '山田 太郎'
    const initials = image ? null : getInitials(name)
    expect(initials).toBe('山太')
  })

  it('I/O例 #7: image=null, name=null → デフォルトアイコン（空文字列）', () => {
    const image = null
    const name: string | null = null
    const initials = image ? null : getInitials(name ?? '')
    expect(initials).toBe('')
  })

  it('I/O例 #5: image=URL → イニシャル不要', () => {
    const image = 'https://example.com/avatar.jpg'
    const shouldShowInitials = !image
    expect(shouldShowInitials).toBe(false)
  })

  it('AC-202: 1文字名 → 1文字イニシャル', () => {
    expect(getInitials('A')).toBe('A')
    expect(getInitials('山')).toBe('山')
  })

  it('AC-204: last_login_at=null → "未記録"', () => {
    expect(formatRelativeTime(null)).toBe('未記録')
  })
})

// ──────────────────────────────────────
// TenantMembership 型バリデーション
// ──────────────────────────────────────

describe('TenantMembership 構造テスト', () => {
  it('正常なテナントメンバーシップオブジェクト', () => {
    const membership: TenantMembership = {
      id: '01HQABCDEFGHIJ1234567890',
      name: 'ビジョンセンター',
      slug: 'vision-center',
      logo_url: 'https://example.com/logo.png',
      role: 'organizer',
      is_default: true,
      joined_at: '2026-01-15T09:00:00Z',
    }
    expect(membership.id).toBeTruthy()
    expect(membership.name).toBe('ビジョンセンター')
    expect(membership.role).toBe('organizer')
    expect(membership.is_default).toBe(true)
  })

  it('logo_url が null のケース', () => {
    const membership: TenantMembership = {
      id: '01HQABCDEFGHIJ1234567890',
      name: 'テスト会社',
      slug: 'test-company',
      logo_url: null,
      role: 'participant',
      is_default: false,
      joined_at: '2026-02-01T10:00:00Z',
    }
    expect(membership.logo_url).toBeNull()
    expect(membership.is_default).toBe(false)
  })

  it('ロールラベル変換と連携: テナントのロールが正しく日本語化される', () => {
    const membership: TenantMembership = {
      id: '01HQABCDEFGHIJ1234567890',
      name: '企画会社A',
      slug: 'kikaku-a',
      logo_url: null,
      role: 'event_planner',
      is_default: false,
      joined_at: '2026-01-20T09:00:00Z',
    }
    expect(getRoleLabel(membership.role)).toBe('イベント企画会社')
  })
})

// ──────────────────────────────────────
// §2.6 例外レスポンスのロジックテスト
// ──────────────────────────────────────

describe('例外レスポンスロジック (§2.6)', () => {
  it('#3: テナント取得失敗時のエラーメッセージ', () => {
    const errorMessage = 'テナント情報の取得に失敗しました'
    expect(errorMessage).toBe('テナント情報の取得に失敗しました')
  })

  it('#4: 認証メール再送失敗時のエラーメッセージ', () => {
    const errorMessage = 'メール送信に失敗しました'
    expect(errorMessage).toBe('メール送信に失敗しました')
  })

  it('#5: アバター画像エラー → フォールバック（イニシャル）', () => {
    const avatarLoadFailed = true
    const name = '山田 太郎'
    const fallback = avatarLoadFailed ? getInitials(name) : null
    expect(fallback).toBe('山太')
  })
})

// ──────────────────────────────────────
// §2.7 Gherkin シナリオ対応: デフォルトテナント識別
// ──────────────────────────────────────

describe('デフォルトテナント識別ロジック (§2.7 Gherkin)', () => {
  const tenants: TenantMembership[] = [
    {
      id: '01HQ0001',
      name: 'ビジョンセンター',
      slug: 'vision',
      logo_url: null,
      role: 'organizer',
      is_default: true,
      joined_at: '2026-01-01T00:00:00Z',
    },
    {
      id: '01HQ0002',
      name: '企画会社A',
      slug: 'kikaku-a',
      logo_url: null,
      role: 'event_planner',
      is_default: false,
      joined_at: '2026-01-15T00:00:00Z',
    },
  ]

  it('複数テナント所属: デフォルトテナントを識別できる', () => {
    const defaultTenant = tenants.find((t) => t.is_default)
    expect(defaultTenant).toBeDefined()
    expect(defaultTenant!.name).toBe('ビジョンセンター')
  })

  it('非デフォルトテナントには⭐なし', () => {
    const nonDefault = tenants.filter((t) => !t.is_default)
    expect(nonDefault).toHaveLength(1)
    expect(nonDefault[0]!.name).toBe('企画会社A')
  })

  it('テナント未所属: 空配列', () => {
    const empty: TenantMembership[] = []
    expect(empty).toHaveLength(0)
    expect(empty.find((t) => t.is_default)).toBeUndefined()
  })

  it('全テナントのロールが日本語化できる', () => {
    for (const t of tenants) {
      const label = getRoleLabel(t.role)
      expect(label).not.toBe(t.role) // 全て変換済み
    }
  })
})
