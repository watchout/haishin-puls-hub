// NAV-001-002-006 ユーザーメニュー Composable
// 仕様書: docs/design/features/common/NAV-001-002-006_navigation.md §6
// ログアウト処理は AUTH-005 §7.1 に準拠（useAuth().logout() に委譲）

/**
 * ユーザードロップダウンメニュー Composable (FR-008)
 *
 * プロフィール、設定、ログアウトのメニュー項目を提供する。
 */
export function useUserMenu() {
  const router = useRouter()
  const { logout } = useAuth()

  /** ユーザーメニュー項目 (Nuxt UI v3 UDropdownMenu 用) */
  const userMenuItems = computed(() => [
    [
      {
        label: 'プロフィール',
        icon: 'i-heroicons-user-circle',
        click: () => router.push('/profile'),
      },
    ],
    [
      {
        label: '設定',
        icon: 'i-heroicons-cog-6-tooth',
        click: () => router.push('/settings'),
      },
    ],
    [
      {
        label: 'ログアウト',
        icon: 'i-heroicons-arrow-right-on-rectangle',
        click: () => logout(),
      },
    ],
  ])

  return {
    userMenuItems,
    logout,
  }
}
