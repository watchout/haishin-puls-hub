// ACCT-002 §7: プロフィール表示 Composable
// プロフィール情報とテナント一覧の取得・整形を提供

import type { Role } from '~/types/auth'

// ──────────────────────────────────────
// 型定義
// ──────────────────────────────────────

export interface TenantMembership {
  id: string
  name: string
  slug: string
  logo_url: string | null
  role: string
  is_default: boolean
  joined_at: string
}

// ──────────────────────────────────────
// ロール日本語化マップ (§7.2)
// ──────────────────────────────────────

export const ROLE_LABELS: Record<Role, string> = {
  system_admin: 'システム管理者',
  tenant_admin: 'テナント管理者',
  organizer: 'セミナー主催者',
  venue_staff: '会場スタッフ',
  streaming_provider: '動画配信業者',
  event_planner: 'イベント企画会社',
  speaker: '登壇者',
  sales_marketing: '営業・マーケティング',
  participant: '参加者',
  vendor: 'その他関連業者',
}

/**
 * ロール名を日本語に変換
 */
export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role as Role] ?? role
}

// ──────────────────────────────────────
// イニシャル抽出 (§3.4)
// ──────────────────────────────────────

/**
 * 名前からイニシャルを抽出（最大2文字）
 * - "山田 太郎" → "YT" (各パーツの先頭)
 * - "山田" → "Y"
 * - "John Doe" → "JD"
 */
export function getInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ''

  const parts = trimmed.split(/\s+/)
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? ''
    const second = parts[1]?.[0] ?? ''
    return (first + second).toUpperCase()
  }
  return (parts[0]?.[0] ?? '').toUpperCase()
}

// ──────────────────────────────────────
// 相対時刻変換 (§7.3)
// ──────────────────────────────────────

/**
 * ISO日時文字列を相対時刻に変換
 * - < 1分: "たった今"
 * - < 1時間: "X分前"
 * - < 24時間: "X時間前"
 * - < 7日: "X日前"
 * - >= 7日: "YYYY-MM-DD HH:mm"
 */
export function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return '未記録'

  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  if (diffMs < 0) return '未記録'

  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'たった今'
  if (diffHours < 1) return `${diffMinutes}分前`
  if (diffDays < 1) return `${diffHours}時間前`
  if (diffDays < 7) return `${diffDays}日前`

  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * ISO日時文字列を絶対日時に変換
 */
export function formatAbsoluteTime(isoString: string | null): string {
  if (!isoString) return ''

  return new Date(isoString).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ──────────────────────────────────────
// Composable
// ──────────────────────────────────────

export function useProfile() {
  const { showSuccess, showError } = useAppToast()

  const tenants = ref<TenantMembership[]>([])
  const isLoadingTenants = ref(false)
  const tenantError = ref<string | null>(null)
  const isResendingEmail = ref(false)

  /** テナント一覧を取得 */
  async function fetchTenants() {
    isLoadingTenants.value = true
    tenantError.value = null
    try {
      const response = await $fetch<{ data: TenantMembership[] }>('/api/v1/tenants')
      tenants.value = response.data
    } catch {
      tenantError.value = 'テナント情報の取得に失敗しました'
    } finally {
      isLoadingTenants.value = false
    }
  }

  /** 認証メール再送 */
  async function resendVerificationEmail(email: string) {
    isResendingEmail.value = true
    try {
      await $fetch('/api/auth/send-verification-email', {
        method: 'POST',
        body: { email },
      })
      showSuccess('認証メールを送信しました')
    } catch {
      showError('メール送信に失敗しました', '再度お試しください')
    } finally {
      isResendingEmail.value = false
    }
  }

  return {
    tenants: readonly(tenants),
    isLoadingTenants: readonly(isLoadingTenants),
    tenantError: readonly(tenantError),
    isResendingEmail: readonly(isResendingEmail),
    fetchTenants,
    resendVerificationEmail,
  }
}
