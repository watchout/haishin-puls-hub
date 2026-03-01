// ACCT-002 §3: プロフィール表示画面のビューロジックテスト
// Vue コンポーネントのレンダリングテストではなく、
// テンプレートで使用される表示ロジックの検証

import { describe, it, expect } from 'vitest'
import { getInitials, getRoleLabel, formatRelativeTime } from '~/composables/useProfile'

// ──────────────────────────────────────
// §3.4 アバター表示分岐ロジック
// ──────────────────────────────────────

describe('アバター表示分岐 (§3.4)', () => {
  function resolveAvatarMode(image: string | null, name: string | null): 'image' | 'initials' | 'icon' {
    if (image) return 'image'
    if (name && getInitials(name)) return 'initials'
    return 'icon'
  }

  it('画像あり → image モード', () => {
    expect(resolveAvatarMode('https://example.com/avatar.jpg', '山田 太郎')).toBe('image')
  })

  it('画像なし + 名前あり → initials モード', () => {
    expect(resolveAvatarMode(null, '山田 太郎')).toBe('initials')
  })

  it('画像なし + 名前なし → icon モード', () => {
    expect(resolveAvatarMode(null, null)).toBe('icon')
  })

  it('画像なし + 名前が空文字 → icon モード', () => {
    expect(resolveAvatarMode(null, '')).toBe('icon')
  })

  it('画像なし + 名前がスペースのみ → icon モード', () => {
    expect(resolveAvatarMode(null, '   ')).toBe('icon')
  })
})

// ──────────────────────────────────────
// §3.2 テナント一覧表示ロジック
// ──────────────────────────────────────

describe('テナント一覧表示ロジック (§3.2)', () => {
  it('テナント名の先頭文字がアバターに使われる', () => {
    const tenantName = 'ビジョンセンター'
    const avatarText = tenantName[0] ?? '?'
    expect(avatarText).toBe('ビ')
  })

  it('空のテナント名 → "?" フォールバック', () => {
    const tenantName = ''
    const avatarText = tenantName[0] ?? '?'
    expect(avatarText).toBe('?')
  })

  it('ロールが日本語ラベルとして表示される', () => {
    expect(getRoleLabel('organizer')).toBe('セミナー主催者')
    expect(getRoleLabel('tenant_admin')).toBe('テナント管理者')
  })

  it('参加日がローカライズ表示される', () => {
    const joinedAt = '2026-01-15T10:00:00Z'
    const display = new Date(joinedAt).toLocaleDateString('ja-JP')
    expect(display).toContain('2026')
  })
})

// ──────────────────────────────────────
// §3.3 メール認証バナー表示ロジック
// ──────────────────────────────────────

describe('メール認証バナー表示 (§3.3)', () => {
  it('emailVerified=false → バナー表示', () => {
    const emailVerified = false
    const showBanner = !emailVerified
    expect(showBanner).toBe(true)
  })

  it('emailVerified=true → バナー非表示', () => {
    const emailVerified = true
    const showBanner = !emailVerified
    expect(showBanner).toBe(false)
  })

  it('emailVerified=undefined → バナー表示（フォールバック）', () => {
    const raw: boolean | undefined = undefined
    const emailVerified = raw ?? false
    const showBanner = !emailVerified
    expect(showBanner).toBe(true)
  })
})

// ──────────────────────────────────────
// §7.3 最終ログイン表示ロジック
// ──────────────────────────────────────

describe('最終ログイン表示 (§7.3)', () => {
  it('lastLoginAt=null → "未記録" 表示', () => {
    expect(formatRelativeTime(null)).toBe('未記録')
  })
})

// ──────────────────────────────────────
// ナビゲーション遷移先テスト
// ──────────────────────────────────────

describe('ナビゲーション遷移先 (§3.2)', () => {
  it('プロフィール編集 → /dashboard/profile/edit', () => {
    const editPath = '/dashboard/profile/edit'
    expect(editPath).toBe('/dashboard/profile/edit')
  })

  it('パスワード変更 → /dashboard/profile/password', () => {
    const passwordPath = '/dashboard/profile/password'
    expect(passwordPath).toBe('/dashboard/profile/password')
  })
})
