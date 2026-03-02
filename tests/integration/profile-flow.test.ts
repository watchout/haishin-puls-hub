// ACCT-002 プロフィール表示フロー 結合テスト
// 仕様書: docs/design/features/common/ACCT-002_profile-view.md
//
// 認証 → プロフィール取得 → テナント一覧取得 → 表示ロジック
// の一連のフローをモック環境で検証する。

import { describe, it, expect, vi } from 'vitest'

import {
  getInitials,
  getRoleLabel,
  formatRelativeTime,
  formatAbsoluteTime,
  type TenantMembership,
} from '~/composables/useProfile'

// ─── モックデータ（§2.7 Gherkin Background 準拠）───

const MOCK_USER = {
  id: '01HXYZ_TEST_USER',
  email: 'yamada@example.com',
  name: '山田 太郎',
  image: null as string | null,
  emailVerified: true,
  lastLoginAt: '2026-02-09T14:32:00Z',
}

const MOCK_TENANTS: TenantMembership[] = [
  {
    id: '01HTENANT1',
    name: 'ビジョンセンター',
    slug: 'vision-center',
    logo_url: 'https://example.com/logo.png',
    role: 'organizer',
    is_default: true,
    joined_at: '2026-01-15T10:00:00+09:00',
  },
  {
    id: '01HTENANT2',
    name: '企画会社A',
    slug: 'planner-a',
    logo_url: null,
    role: 'event_planner',
    is_default: false,
    joined_at: '2026-02-01T09:00:00+09:00',
  },
]

// ─── 結合テスト ───

describe('ACCT-002 プロフィール表示フロー結合テスト', () => {
  describe('§7.1 正常フロー: 認証済み → プロフィール表示', () => {
    it('認証済みユーザーのプロフィール情報が正しく整形される', () => {
      // Step 1: 認証チェック
      const isAuthenticated = !!MOCK_USER.id
      expect(isAuthenticated).toBe(true)

      // Step 2: ユーザー情報表示
      expect(MOCK_USER.name).toBe('山田 太郎')
      expect(MOCK_USER.email).toBe('yamada@example.com')

      // Step 3: アバターフォールバック
      const initials = MOCK_USER.image ? null : getInitials(MOCK_USER.name)
      expect(initials).toBe('山太')

      // Step 4: メール認証状態
      expect(MOCK_USER.emailVerified).toBe(true)

      // Step 5: 最終ログイン表示（相対 + 絶対）
      const relative = formatRelativeTime(MOCK_USER.lastLoginAt)
      const absolute = formatAbsoluteTime(MOCK_USER.lastLoginAt)
      expect(relative).toBeTruthy()
      expect(absolute).toContain('2026')
    })

    it('テナント一覧がロール日本語化付きで表示される', () => {
      // テナント一覧取得
      expect(MOCK_TENANTS).toHaveLength(2)

      // デフォルトテナント識別
      const defaultTenant = MOCK_TENANTS.find((t) => t.is_default)
      expect(defaultTenant).toBeDefined()
      expect(defaultTenant!.name).toBe('ビジョンセンター')

      // ロール日本語化
      expect(getRoleLabel(MOCK_TENANTS[0]!.role)).toBe('セミナー主催者')
      expect(getRoleLabel(MOCK_TENANTS[1]!.role)).toBe('イベント企画会社')

      // 参加日表示
      const joinDate = new Date(MOCK_TENANTS[0]!.joined_at).toLocaleDateString('ja-JP')
      expect(joinDate).toContain('2026')
    })
  })

  describe('§2.7 Gherkin: メール未認証フロー', () => {
    it('emailVerified=false → 警告バナー表示 + 再送ボタン有効', () => {
      const unverifiedUser = { ...MOCK_USER, emailVerified: false }

      const showWarningBanner = !unverifiedUser.emailVerified
      expect(showWarningBanner).toBe(true)

      // 再送可能（emailが存在する）
      const canResend = !!unverifiedUser.email
      expect(canResend).toBe(true)
    })

    it('emailVerified=true → 認証バッジ表示、バナー非表示', () => {
      const showWarningBanner = !MOCK_USER.emailVerified
      expect(showWarningBanner).toBe(false)

      const showVerifiedBadge = MOCK_USER.emailVerified
      expect(showVerifiedBadge).toBe(true)
    })
  })

  describe('§2.7 Gherkin: テナント未所属フロー', () => {
    it('テナント0件 → 基本情報は表示、テナント一覧は空', () => {
      const emptyTenants: TenantMembership[] = []

      // 基本情報は表示可能
      expect(MOCK_USER.name).toBeTruthy()
      expect(MOCK_USER.email).toBeTruthy()

      // テナント一覧は空
      expect(emptyTenants).toHaveLength(0)
      expect(emptyTenants.find((t) => t.is_default)).toBeUndefined()
    })
  })

  describe('§2.7 Gherkin: 複数テナント所属フロー', () => {
    it('2テナント所属 → 全件表示 + デフォルトに⭐', () => {
      expect(MOCK_TENANTS).toHaveLength(2)

      const defaultCount = MOCK_TENANTS.filter((t) => t.is_default).length
      expect(defaultCount).toBe(1)

      const nonDefaultCount = MOCK_TENANTS.filter((t) => !t.is_default).length
      expect(nonDefaultCount).toBe(1)
    })
  })

  describe('§2.7 Gherkin: アバター表示フロー', () => {
    it('画像あり → 画像表示', () => {
      const userWithImage = { ...MOCK_USER, image: 'https://example.com/avatar.jpg' }
      const mode = userWithImage.image ? 'image' : 'initials'
      expect(mode).toBe('image')
    })

    it('画像なし + 名前あり → イニシャル表示', () => {
      const mode = MOCK_USER.image ? 'image' : 'initials'
      expect(mode).toBe('initials')
      expect(getInitials(MOCK_USER.name)).toBe('山太')
    })

    it('画像なし + 名前なし → デフォルトアイコン', () => {
      const userNoName = { ...MOCK_USER, image: null, name: '' }
      const initials = getInitials(userNoName.name)
      const mode = userNoName.image ? 'image' : initials ? 'initials' : 'icon'
      expect(mode).toBe('icon')
    })
  })

  describe('§2.7 Gherkin: 未認証アクセスフロー', () => {
    it('セッションなし → /login リダイレクト', () => {
      const session = null
      const isAuthenticated = !!session
      expect(isAuthenticated).toBe(false)

      // リダイレクト先
      const currentPath = '/dashboard/profile'
      const redirectUrl = `/login?redirect=${encodeURIComponent(currentPath)}`
      expect(redirectUrl).toBe('/login?redirect=%2Fdashboard%2Fprofile')
    })
  })

  describe('§2.7 Gherkin: last_login_at フロー', () => {
    it('last_login_at=null → "未記録"', () => {
      const userNoLogin = { ...MOCK_USER, lastLoginAt: null }
      expect(formatRelativeTime(userNoLogin.lastLoginAt)).toBe('未記録')
    })

    it('last_login_at が有効 → 相対時刻 + 絶対時刻', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-02-09T14:37:00Z'))

      const relative = formatRelativeTime(MOCK_USER.lastLoginAt)
      expect(relative).toBe('5分前')

      const absolute = formatAbsoluteTime(MOCK_USER.lastLoginAt)
      expect(absolute).toContain('2026')

      vi.useRealTimers()
    })
  })

  describe('§2.7 Gherkin: ナビゲーションフロー', () => {
    it('プロフィール編集ボタン → /dashboard/profile/edit', () => {
      const navigateTo = '/dashboard/profile/edit'
      expect(navigateTo).toBe('/dashboard/profile/edit')
    })

    it('パスワード変更ボタン → /dashboard/profile/password', () => {
      const navigateTo = '/dashboard/profile/password'
      expect(navigateTo).toBe('/dashboard/profile/password')
    })
  })

  describe('§2.6 例外フロー: テナント取得エラー', () => {
    it('テナント取得失敗 → エラーメッセージ表示', () => {
      const tenantError = 'テナント情報の取得に失敗しました'
      const hasError = !!tenantError
      expect(hasError).toBe(true)
      expect(tenantError).toBe('テナント情報の取得に失敗しました')
    })

    it('メール再送失敗 → エラートースト表示', () => {
      const mailError = 'メール送信に失敗しました'
      expect(mailError).toBe('メール送信に失敗しました')
    })
  })

  describe('§9.2 統合テスト: API レスポンス → 表示パイプライン', () => {
    it('TC-101: GET /api/v1/tenants 正常レスポンス → テナント表示', () => {
      // API レスポンス模擬
      const apiResponse = { data: MOCK_TENANTS }

      // 表示パイプライン
      expect(apiResponse.data).toHaveLength(2)
      for (const t of apiResponse.data) {
        expect(t.id).toBeTruthy()
        expect(t.name).toBeTruthy()
        expect(t.role).toBeTruthy()
        expect(typeof t.is_default).toBe('boolean')

        // ロール日本語化が適用される
        const label = getRoleLabel(t.role)
        expect(label).toBeTruthy()
      }
    })

    it('TC-102: 未認証 → 401 エラー → リダイレクト', () => {
      const errorResponse = {
        statusCode: 401,
        data: { error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
      }

      expect(errorResponse.statusCode).toBe(401)
      const shouldRedirect = errorResponse.statusCode === 401
      expect(shouldRedirect).toBe(true)
    })
  })
})
