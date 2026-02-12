// NOTIF-001-002 通知型定義
// 仕様書: docs/design/features/common/NOTIF-001-002_notifications.md §4, §8

import { z } from 'zod'

// ──────────────────────────────────────
// 通知タイプ (§4)
// ──────────────────────────────────────

export const NOTIFICATION_TYPES = [
  'task_reminder',
  'task_overdue',
  'event_update',
  'system',
] as const

export type NotificationType = typeof NOTIFICATION_TYPES[number]

// ──────────────────────────────────────
// 配信チャネル (§4)
// ──────────────────────────────────────

export const SENT_VIA_OPTIONS = ['in_app', 'email', 'both'] as const

export type SentVia = typeof SENT_VIA_OPTIONS[number]

// ──────────────────────────────────────
// バリデーションスキーマ (§8)
// ──────────────────────────────────────

/** 通知作成スキーマ (§8 CORE) */
export const createNotificationSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  eventId: z.string().min(1).optional(),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string().min(1, '通知タイトルは必須です').max(200, '通知タイトルは200文字以内です'),
  body: z.string().min(1, '通知本文は必須です').max(2000, '通知本文は2000文字以内です'),
  sentVia: z.enum(SENT_VIA_OPTIONS).default('in_app'),
})

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>

/** 通知一覧クエリスキーマ (§5) */
export const notificationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  is_read: z.enum(['true', 'false']).optional().transform(v => v === undefined ? undefined : v === 'true'),
})

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>

// ──────────────────────────────────────
// メールテンプレート定義 (§4, §13 Phase 4)
// ──────────────────────────────────────

export const MAIL_TEMPLATES = {
  task_reminder: {
    subject: '[配信プラスHub] タスク期日のリマインド: {{taskName}}',
    template: 'task-reminder',
  },
  task_overdue: {
    subject: '[配信プラスHub] ⚠️ タスク期日超過: {{taskName}}',
    template: 'task-overdue',
  },
  event_update: {
    subject: '[配信プラスHub] イベント情報が更新されました: {{eventName}}',
    template: 'event-update',
  },
} as const

// ──────────────────────────────────────
// エラーコード (§9)
// ──────────────────────────────────────

export const NOTIFICATION_ERROR_CODES = {
  NOTIF_NOT_FOUND: { statusCode: 404, message: '通知が見つかりませんでした' },
  NOTIF_FORBIDDEN: { statusCode: 403, message: 'この通知にアクセスする権限がありません' },
  NOTIF_MAIL_FAILED: { statusCode: 500, message: 'メール送信に失敗しました。後ほど再試行されます' },
  NOTIF_INVALID_TYPE: { statusCode: 400, message: '通知タイプが不正です' },
} as const
