// NAV-001-002-006 ナビゲーション状態管理 Pinia ストア
// 仕様書: docs/design/features/common/NAV-001-002-006_navigation.md §9

import { defineStore } from 'pinia'

/** サイドバー幅の定数 (§3-F) */
export const SIDEBAR_WIDTH_EXPANDED = 256
export const SIDEBAR_WIDTH_COLLAPSED = 64

/** localStorage キー (BR-006) */
const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed'

export const useNavigationStore = defineStore('navigation', () => {
  // ──────────────────────────────────────
  // State
  // ──────────────────────────────────────

  /** サイドバー折りたたみ状態 (デフォルト: 展開) */
  const isSidebarCollapsed = ref(false)

  /** モバイルサイドバー表示状態 */
  const isMobileSidebarOpen = ref(false)

  /** 未読通知数 */
  const notificationCount = ref(0)

  // ──────────────────────────────────────
  // Getters
  // ──────────────────────────────────────

  /** 未読通知があるか */
  const hasUnreadNotifications = computed(() => notificationCount.value > 0)

  /** サイドバー幅 (px) */
  const sidebarWidth = computed(() =>
    isSidebarCollapsed.value ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
  )

  // ──────────────────────────────────────
  // Actions
  // ──────────────────────────────────────

  /** サイドバー折りたたみをトグル (BR-006) */
  function toggleSidebar() {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
    if (import.meta.client) {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isSidebarCollapsed.value))
    }
  }

  /** モバイルサイドバーをトグル */
  function toggleMobileSidebar() {
    isMobileSidebarOpen.value = !isMobileSidebarOpen.value
  }

  /** モバイルサイドバーを閉じる */
  function closeMobileSidebar() {
    isMobileSidebarOpen.value = false
  }

  /** localStorage から折りたたみ状態を復元 (BR-006) */
  function restoreSidebarState() {
    if (import.meta.client) {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      if (stored !== null) {
        isSidebarCollapsed.value = stored === 'true'
      }
    }
  }

  /** 通知カウントを更新 */
  function setNotificationCount(count: number) {
    notificationCount.value = Math.max(0, count)
  }

  /** ストアをリセット */
  function reset() {
    isSidebarCollapsed.value = false
    isMobileSidebarOpen.value = false
    notificationCount.value = 0
  }

  return {
    // State
    isSidebarCollapsed,
    isMobileSidebarOpen,
    notificationCount,
    // Getters
    hasUnreadNotifications,
    sidebarWidth,
    // Actions
    toggleSidebar,
    toggleMobileSidebar,
    closeMobileSidebar,
    restoreSidebarState,
    setNotificationCount,
    reset,
  }
})
