// NAV-001-002-006 ユーザーメニュー Composable
// 仕様書: docs/design/features/common/NAV-001-002-006_navigation.md §6

/**
 * ユーザードロップダウンメニュー Composable (FR-008)
 *
 * プロフィール、設定、ログアウトのメニュー項目を提供する。
 */
export function useUserMenu() {
  const router = useRouter()

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
        click: () => handleLogout(),
      },
    ],
  ])

  /** ログアウト処理 */
  async function handleLogout() {
    try {
      await $fetch('/api/auth/sign-out', { method: 'POST' })
    } finally {
      // ネットワークエラー時も冪等にクリア (AUTH-005)
      const authStore = useAuthStore()
      const tenantStore = useTenantStore()
      const navigationStore = useNavigationStore()

      authStore.reset()
      tenantStore.reset()
      navigationStore.reset()

      await router.push('/login?reason=logout')
    }
  }

  return {
    userMenuItems,
    handleLogout,
  }
}
