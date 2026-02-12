// NOTIF-002 アプリ内トースト通知 Composable
// 仕様書: docs/design/features/common/NOTIF-001-002_notifications.md §6, §13 Phase 1
//
// Nuxt UI v3 useToast のラッパー。
// トーストタイプごとの表示時間とアイコンを統一する。
//
// 使用例:
// ```ts
// const { showSuccess, showError, showWarning, showInfo } = useAppToast()
// showSuccess('イベントを保存しました')
// showError('保存に失敗しました', '再度お試しください')
// ```

/**
 * トースト自動消去時間 (BR-004)
 * - success: 3秒
 * - info: 5秒
 * - warning: 7秒
 * - error: 0秒（手動消去のみ）
 */
export const TOAST_DURATION = {
  success: 3000,
  info: 5000,
  warning: 7000,
  error: 0,
} as const

/** トーストアイコン (FR-006) */
export const TOAST_ICONS = {
  success: 'i-heroicons-check-circle',
  info: 'i-heroicons-information-circle',
  warning: 'i-heroicons-exclamation-triangle',
  error: 'i-heroicons-exclamation-circle',
} as const

/** トーストカラー (FR-006, Nuxt UI v3) */
export const TOAST_COLORS = {
  success: 'success' as const,
  info: 'info' as const,
  warning: 'warning' as const,
  error: 'error' as const,
}

/**
 * アプリ内トースト通知 Composable (FR-004, FR-005, FR-006)
 *
 * Nuxt UI v3 の useToast をラップし、仕様準拠のトースト表示を提供する。
 */
export function useAppToast() {
  const toast = useToast()

  /** 成功トースト (3秒自動消去) */
  function showSuccess(title: string, description?: string) {
    toast.add({
      title,
      description,
      color: TOAST_COLORS.success,
      icon: TOAST_ICONS.success,
      duration: TOAST_DURATION.success,
    })
  }

  /** エラートースト (手動消去のみ) */
  function showError(title: string, description?: string) {
    toast.add({
      title,
      description,
      color: TOAST_COLORS.error,
      icon: TOAST_ICONS.error,
      duration: TOAST_DURATION.error,
    })
  }

  /** 警告トースト (7秒自動消去) */
  function showWarning(title: string, description?: string) {
    toast.add({
      title,
      description,
      color: TOAST_COLORS.warning,
      icon: TOAST_ICONS.warning,
      duration: TOAST_DURATION.warning,
    })
  }

  /** 情報トースト (5秒自動消去) */
  function showInfo(title: string, description?: string) {
    toast.add({
      title,
      description,
      color: TOAST_COLORS.info,
      icon: TOAST_ICONS.info,
      duration: TOAST_DURATION.info,
    })
  }

  return { showSuccess, showError, showWarning, showInfo }
}
