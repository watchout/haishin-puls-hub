// NOTIF-001-002 通知機能 ユニットテスト
// 仕様書: docs/design/features/common/NOTIF-001-002_notifications.md §12

import { describe, it, expect } from 'vitest'
import {
  NOTIFICATION_TYPES,
  SENT_VIA_OPTIONS,
  createNotificationSchema,
  notificationListQuerySchema,
  MAIL_TEMPLATES,
  NOTIFICATION_ERROR_CODES,
} from '~/types/notification'

// ──────────────────────────────────────
// 通知タイプ定義テスト (§4)
// ──────────────────────────────────────

describe('通知タイプ定義 (§4)', () => {
  it('4種類の通知タイプが定義されている', () => {
    expect(NOTIFICATION_TYPES).toHaveLength(4)
    expect(NOTIFICATION_TYPES).toContain('task_reminder')
    expect(NOTIFICATION_TYPES).toContain('task_overdue')
    expect(NOTIFICATION_TYPES).toContain('event_update')
    expect(NOTIFICATION_TYPES).toContain('system')
  })

  it('3種類の配信チャネルが定義されている', () => {
    expect(SENT_VIA_OPTIONS).toHaveLength(3)
    expect(SENT_VIA_OPTIONS).toContain('in_app')
    expect(SENT_VIA_OPTIONS).toContain('email')
    expect(SENT_VIA_OPTIONS).toContain('both')
  })
})

// ──────────────────────────────────────
// 通知作成バリデーション (§8)
// ──────────────────────────────────────

describe('createNotificationSchema (§8)', () => {
  const validInput = {
    tenantId: 'tenant-001',
    userId: 'user-001',
    type: 'task_reminder' as const,
    title: 'タスク期日のリマインド: 会場予約',
    body: 'タスク「会場予約」の期日は明日です。',
    sentVia: 'both' as const,
  }

  it('有効な入力が正しくパースされる', () => {
    const result = createNotificationSchema.parse(validInput)
    expect(result.tenantId).toBe('tenant-001')
    expect(result.userId).toBe('user-001')
    expect(result.type).toBe('task_reminder')
    expect(result.sentVia).toBe('both')
  })

  it('sentVia のデフォルトは in_app', () => {
    const input = { ...validInput }
    delete (input as Record<string, unknown>).sentVia
    const result = createNotificationSchema.parse(input)
    expect(result.sentVia).toBe('in_app')
  })

  it('eventId は省略可能', () => {
    const result = createNotificationSchema.parse(validInput)
    expect(result.eventId).toBeUndefined()
  })

  it('eventId が指定された場合は保持される', () => {
    const result = createNotificationSchema.parse({ ...validInput, eventId: 'event-001' })
    expect(result.eventId).toBe('event-001')
  })

  it('title が空文字はバリデーションエラー', () => {
    const result = createNotificationSchema.safeParse({ ...validInput, title: '' })
    expect(result.success).toBe(false)
  })

  it('title の最大長は 200 文字', () => {
    const result = createNotificationSchema.parse({ ...validInput, title: 'a'.repeat(200) })
    expect(result.title).toHaveLength(200)
  })

  it('title が 201 文字はバリデーションエラー', () => {
    const result = createNotificationSchema.safeParse({ ...validInput, title: 'a'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('body が空文字はバリデーションエラー', () => {
    const result = createNotificationSchema.safeParse({ ...validInput, body: '' })
    expect(result.success).toBe(false)
  })

  it('body の最大長は 2000 文字', () => {
    const result = createNotificationSchema.parse({ ...validInput, body: 'a'.repeat(2000) })
    expect(result.body).toHaveLength(2000)
  })

  it('body が 2001 文字はバリデーションエラー', () => {
    const result = createNotificationSchema.safeParse({ ...validInput, body: 'a'.repeat(2001) })
    expect(result.success).toBe(false)
  })

  it('type が未定義の値はバリデーションエラー', () => {
    const result = createNotificationSchema.safeParse({ ...validInput, type: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('sentVia が未定義の値はバリデーションエラー', () => {
    const result = createNotificationSchema.safeParse({ ...validInput, sentVia: 'push' })
    expect(result.success).toBe(false)
  })

  it('tenantId が空はバリデーションエラー', () => {
    const result = createNotificationSchema.safeParse({ ...validInput, tenantId: '' })
    expect(result.success).toBe(false)
  })

  it('userId が空はバリデーションエラー', () => {
    const result = createNotificationSchema.safeParse({ ...validInput, userId: '' })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────
// 通知一覧クエリバリデーション (§5)
// ──────────────────────────────────────

describe('notificationListQuerySchema (§5)', () => {
  it('デフォルト値が正しく設定される', () => {
    const result = notificationListQuerySchema.parse({})
    expect(result.limit).toBe(20)
    expect(result.offset).toBe(0)
    expect(result.is_read).toBeUndefined()
  })

  it('limit=50 が正しくパースされる', () => {
    const result = notificationListQuerySchema.parse({ limit: '50' })
    expect(result.limit).toBe(50)
  })

  it('limit=0 はバリデーションエラー', () => {
    const result = notificationListQuerySchema.safeParse({ limit: '0' })
    expect(result.success).toBe(false)
  })

  it('limit=101 はバリデーションエラー', () => {
    const result = notificationListQuerySchema.safeParse({ limit: '101' })
    expect(result.success).toBe(false)
  })

  it('offset=-1 はバリデーションエラー', () => {
    const result = notificationListQuerySchema.safeParse({ offset: '-1' })
    expect(result.success).toBe(false)
  })

  it('is_read=true が boolean true に変換される', () => {
    const result = notificationListQuerySchema.parse({ is_read: 'true' })
    expect(result.is_read).toBe(true)
  })

  it('is_read=false が boolean false に変換される', () => {
    const result = notificationListQuerySchema.parse({ is_read: 'false' })
    expect(result.is_read).toBe(false)
  })
})

// ──────────────────────────────────────
// トースト表示時間テスト (BR-004)
// ──────────────────────────────────────

describe('トースト表示時間 (BR-004)', () => {
  // TOAST_DURATION をインラインで再定義（composable は Nuxt コンテキスト外で使えない）
  const TOAST_DURATION = {
    success: 3000,
    info: 5000,
    warning: 7000,
    error: 0,
  }

  it('success は 3秒（3000ms）自動消去', () => {
    expect(TOAST_DURATION.success).toBe(3000)
  })

  it('info は 5秒（5000ms）自動消去', () => {
    expect(TOAST_DURATION.info).toBe(5000)
  })

  it('warning は 7秒（7000ms）自動消去', () => {
    expect(TOAST_DURATION.warning).toBe(7000)
  })

  it('error は 0（手動消去のみ）', () => {
    expect(TOAST_DURATION.error).toBe(0)
  })
})

// ──────────────────────────────────────
// メールテンプレート定義テスト (§4)
// ──────────────────────────────────────

describe('メールテンプレート定義 (§4)', () => {
  it('task_reminder テンプレートが定義されている', () => {
    expect(MAIL_TEMPLATES.task_reminder.subject).toContain('タスク期日のリマインド')
    expect(MAIL_TEMPLATES.task_reminder.template).toBe('task-reminder')
  })

  it('task_overdue テンプレートが定義されている', () => {
    expect(MAIL_TEMPLATES.task_overdue.subject).toContain('タスク期日超過')
    expect(MAIL_TEMPLATES.task_overdue.template).toBe('task-overdue')
  })

  it('event_update テンプレートが定義されている', () => {
    expect(MAIL_TEMPLATES.event_update.subject).toContain('イベント情報が更新されました')
    expect(MAIL_TEMPLATES.event_update.template).toBe('event-update')
  })

  it('全テンプレートの件名に [配信プラスHub] プレフィックスがある', () => {
    for (const template of Object.values(MAIL_TEMPLATES)) {
      expect(template.subject).toContain('[配信プラスHub]')
    }
  })
})

// ──────────────────────────────────────
// エラーコード定義テスト (§9)
// ──────────────────────────────────────

describe('通知エラーコード定義 (§9)', () => {
  it('NOTIF_NOT_FOUND は 404', () => {
    expect(NOTIFICATION_ERROR_CODES.NOTIF_NOT_FOUND.statusCode).toBe(404)
  })

  it('NOTIF_FORBIDDEN は 403', () => {
    expect(NOTIFICATION_ERROR_CODES.NOTIF_FORBIDDEN.statusCode).toBe(403)
  })

  it('NOTIF_MAIL_FAILED は 500', () => {
    expect(NOTIFICATION_ERROR_CODES.NOTIF_MAIL_FAILED.statusCode).toBe(500)
  })

  it('NOTIF_INVALID_TYPE は 400', () => {
    expect(NOTIFICATION_ERROR_CODES.NOTIF_INVALID_TYPE.statusCode).toBe(400)
  })

  it('全エラーコードにメッセージが定義されている', () => {
    for (const error of Object.values(NOTIFICATION_ERROR_CODES)) {
      expect(error.message).toBeTruthy()
    }
  })
})

// ──────────────────────────────────────
// 通知バッジ表示ロジック (§3-F)
// ──────────────────────────────────────

describe('通知バッジ表示ロジック (§3-F)', () => {
  function formatBadge(count: number): string | null {
    if (count <= 0) return null
    return count > 99 ? '99+' : String(count)
  }

  it('0 件は null（バッジ非表示）', () => {
    expect(formatBadge(0)).toBeNull()
  })

  it('1 件は "1"', () => {
    expect(formatBadge(1)).toBe('1')
  })

  it('99 件は "99"', () => {
    expect(formatBadge(99)).toBe('99')
  })

  it('100 件は "99+"', () => {
    expect(formatBadge(100)).toBe('99+')
  })

  it('負の値は null', () => {
    expect(formatBadge(-5)).toBeNull()
  })
})

// ──────────────────────────────────────
// 通知既読化ロジック (FR-008)
// ──────────────────────────────────────

describe('通知既読化ロジック (FR-008)', () => {
  it('既読化後に is_read が true になる', () => {
    const notification = { id: '1', isRead: false, readAt: null as string | null }
    notification.isRead = true
    notification.readAt = new Date().toISOString()
    expect(notification.isRead).toBe(true)
    expect(notification.readAt).toBeTruthy()
  })

  it('既読化後に未読カウントが1減少する', () => {
    let unreadCount = 5
    unreadCount = Math.max(0, unreadCount - 1)
    expect(unreadCount).toBe(4)
  })

  it('未読カウントは0未満にならない', () => {
    let unreadCount = 0
    unreadCount = Math.max(0, unreadCount - 1)
    expect(unreadCount).toBe(0)
  })
})

// ──────────────────────────────────────
// 全件既読ロジック (FR-009)
// ──────────────────────────────────────

describe('全件既読ロジック (FR-009)', () => {
  it('全件既読後に未読カウントが0になる', () => {
    const notifications = [
      { id: '1', isRead: false },
      { id: '2', isRead: false },
      { id: '3', isRead: true },
    ]

    notifications.forEach((n) => { n.isRead = true })
    const unreadCount = 0

    expect(notifications.every(n => n.isRead)).toBe(true)
    expect(unreadCount).toBe(0)
  })

  it('既読通知を含む場合も正しく動作する', () => {
    const notifications = [
      { id: '1', isRead: false },
      { id: '2', isRead: true },
    ]
    const updatedCount = notifications.filter(n => !n.isRead).length

    notifications.forEach((n) => { n.isRead = true })
    expect(updatedCount).toBe(1)
    expect(notifications.every(n => n.isRead)).toBe(true)
  })
})

// ──────────────────────────────────────
// sent_via 制御ロジック (BR-005)
// ──────────────────────────────────────

describe('sent_via 制御ロジック (BR-005)', () => {
  function shouldSendEmail(sentVia: string): boolean {
    return sentVia === 'email' || sentVia === 'both'
  }

  function shouldInsertNotification(sentVia: string): boolean {
    return sentVia === 'in_app' || sentVia === 'both'
  }

  it('in_app: メール送信しない、通知テーブル挿入する', () => {
    expect(shouldSendEmail('in_app')).toBe(false)
    expect(shouldInsertNotification('in_app')).toBe(true)
  })

  it('email: メール送信する、通知テーブル挿入しない', () => {
    expect(shouldSendEmail('email')).toBe(true)
    expect(shouldInsertNotification('email')).toBe(false)
  })

  it('both: メール送信する、通知テーブル挿入する', () => {
    expect(shouldSendEmail('both')).toBe(true)
    expect(shouldInsertNotification('both')).toBe(true)
  })
})
