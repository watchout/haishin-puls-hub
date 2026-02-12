// NOTIF-001-002 通知 Composable
// 仕様書: docs/design/features/common/NOTIF-001-002_notifications.md §13 Phase 3
//
// 通知の取得・既読化・ポーリングを提供する。

// ──────────────────────────────────────
// 型定義
// ──────────────────────────────────────

/** 通知タイプ (§4) */
export type NotificationType = 'task_reminder' | 'task_overdue' | 'event_update' | 'system'

/** 配信チャネル (§4) */
export type SentVia = 'in_app' | 'email' | 'both'

/** 通知エンティティ */
export interface Notification {
  id: string
  tenantId: string
  userId: string
  eventId?: string | null
  type: NotificationType
  title: string
  body: string
  isRead: boolean
  sentVia: SentVia
  emailSentAt?: string | null
  readAt?: string | null
  createdAt: string
  updatedAt: string
}

/** 通知一覧レスポンス (§5) */
export interface NotificationListResponse {
  notifications: Notification[]
  total: number
  limit: number
  offset: number
}

/** 未読カウントレスポンス (§5) */
export interface UnreadCountResponse {
  unread_count: number
}

/** 全件既読レスポンス (§5) */
export interface ReadAllResponse {
  updated_count: number
}

/** ポーリング間隔 (§13) */
const POLLING_INTERVAL = 30_000 // 30秒（NAV仕様準拠）

/**
 * 通知 Composable
 *
 * FR-007: 未読通知バッジ表示
 * FR-008: 通知既読化
 * FR-009: すべて既読にする
 */
export function useNotification() {
  const notifications = ref<Notification[]>([])
  const unreadCount = ref(0)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  /** 通知一覧を取得 (§5 GET /api/v1/notifications) */
  async function fetchNotifications(params?: {
    limit?: number
    offset?: number
    is_read?: boolean
  }) {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<NotificationListResponse>('/api/v1/notifications', {
        params,
      })
      notifications.value = data.notifications
      return data
    } catch (e) {
      error.value = e as Error
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 未読件数を取得 (§5 GET /api/v1/notifications/unread-count) */
  async function fetchUnreadCount() {
    try {
      const data = await $fetch<UnreadCountResponse>('/api/v1/notifications/unread-count')
      unreadCount.value = data.unread_count

      // ナビゲーションストアにも反映
      const navigationStore = useNavigationStore()
      navigationStore.setNotificationCount(data.unread_count)

      return data.unread_count
    } catch {
      // 未読カウント取得失敗はサイレントに無視
      return unreadCount.value
    }
  }

  /** 通知を既読にする (§5 PATCH /api/v1/notifications/:id/read) */
  async function markAsRead(id: string) {
    try {
      await $fetch(`/api/v1/notifications/${id}/read`, { method: 'PATCH' })

      // ローカル状態更新
      const notification = notifications.value.find(n => n.id === id)
      if (notification && !notification.isRead) {
        notification.isRead = true
        notification.readAt = new Date().toISOString()
        unreadCount.value = Math.max(0, unreadCount.value - 1)

        const navigationStore = useNavigationStore()
        navigationStore.setNotificationCount(unreadCount.value)
      }
    } catch (e) {
      error.value = e as Error
      throw e
    }
  }

  /** 未読通知をすべて既読にする (§5 POST /api/v1/notifications/read-all) */
  async function markAllAsRead() {
    try {
      const data = await $fetch<ReadAllResponse>('/api/v1/notifications/read-all', {
        method: 'POST',
      })

      // ローカル状態更新
      notifications.value.forEach((n) => {
        n.isRead = true
        n.readAt = new Date().toISOString()
      })
      unreadCount.value = 0

      const navigationStore = useNavigationStore()
      navigationStore.setNotificationCount(0)

      return data.updated_count
    } catch (e) {
      error.value = e as Error
      throw e
    }
  }

  /** 未読カウントのポーリングを開始 (BR-004) */
  function startPolling() {
    if (!import.meta.client) return

    fetchUnreadCount()
    const interval = setInterval(() => {
      fetchUnreadCount()
    }, POLLING_INTERVAL)

    onUnmounted(() => clearInterval(interval))
  }

  return {
    notifications: readonly(notifications),
    unreadCount: readonly(unreadCount),
    loading: readonly(loading),
    error: readonly(error),
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    startPolling,
  }
}
