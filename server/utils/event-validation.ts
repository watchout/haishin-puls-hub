// EVT-001-005 イベント バリデーションスキーマ
// 仕様書: docs/design/features/project/EVT-001-005_event-planning.md §3-F, §7

import { z } from 'zod'

// ──────────────────────────────────────
// 定数定義
// ──────────────────────────────────────

export const EVENT_TYPES = ['seminar', 'presentation', 'internal', 'workshop'] as const
export const EVENT_FORMATS = ['onsite', 'online', 'hybrid'] as const
export const EVENT_STATUSES = ['draft', 'planning', 'confirmed', 'ready', 'in_progress', 'completed', 'cancelled'] as const
export const ESTIMATE_STATUSES = ['draft', 'sent', 'approved'] as const

export type EventType = typeof EVENT_TYPES[number]
export type EventFormat = typeof EVENT_FORMATS[number]
export type EventStatus = typeof EVENT_STATUSES[number]
export type EstimateStatus = typeof ESTIMATE_STATUSES[number]

// ──────────────────────────────────────
// 日程候補スキーマ
// ──────────────────────────────────────

export const dateCandidateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付は YYYY-MM-DD 形式で入力してください'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, '時刻は HH:mm 形式で入力してください'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, '時刻は HH:mm 形式で入力してください'),
  priority: z.number().int().min(1).max(5),
})

// ──────────────────────────────────────
// イベント作成スキーマ (§3-F)
// ──────────────────────────────────────

export const createEventSchema = z.object({
  title: z.string()
    .min(1, 'タイトルを入力してください')
    .max(200, 'タイトルは200文字以内で入力してください'),
  description: z.string()
    .max(5000, '概要は5000文字以内で入力してください')
    .nullable()
    .optional(),
  event_type: z.enum(EVENT_TYPES, {
    errorMap: () => ({ message: '無効なイベント種別です' }),
  }),
  format: z.enum(EVENT_FORMATS, {
    errorMap: () => ({ message: '無効な開催形式です' }),
  }),
  goal: z.string()
    .max(1000, '目的は1000文字以内で入力してください')
    .nullable()
    .optional(),
  target_audience: z.string()
    .max(500, 'ターゲットは500文字以内で入力してください')
    .nullable()
    .optional(),
  capacity_onsite: z.number().int().min(1, '現地定員は1以上で入力してください').max(10000, '現地定員は10000以下で入力してください')
    .nullable()
    .optional(),
  capacity_online: z.number().int().min(1, 'オンライン定員は1以上で入力してください').max(10000, 'オンライン定員は10000以下で入力してください')
    .nullable()
    .optional(),
  budget_min: z.number().int().min(0, '予算下限は0以上で入力してください').max(999999999)
    .nullable()
    .optional(),
  budget_max: z.number().int().min(0).max(999999999)
    .nullable()
    .optional(),
  date_candidates: z.array(dateCandidateSchema)
    .max(5, '日程候補は5件までです')
    .nullable()
    .optional(),
  venue_id: z.string().nullable().optional(),
  start_at: z.string().nullable().optional(),
  end_at: z.string().nullable().optional(),
  ai_suggestions: z.unknown().nullable().optional(),
  ai_generated: z.boolean().optional(),
  settings: z.unknown().optional(),
}).refine(
  (data) => {
    if (data.budget_min != null && data.budget_max != null) {
      return data.budget_max >= data.budget_min
    }
    return true
  },
  { message: '予算上限は下限以上にしてください', path: ['budget_max'] },
).refine(
  (data) => {
    if (data.start_at && data.end_at) {
      return new Date(data.end_at) > new Date(data.start_at)
    }
    return true
  },
  { message: '終了日時は開始日時より後にしてください', path: ['end_at'] },
)

// ──────────────────────────────────────
// イベント更新スキーマ (部分更新)
// ──────────────────────────────────────

export const updateEventSchema = z.object({
  title: z.string()
    .min(1, 'タイトルを入力してください')
    .max(200, 'タイトルは200文字以内で入力してください')
    .optional(),
  description: z.string()
    .max(5000, '概要は5000文字以内で入力してください')
    .nullable()
    .optional(),
  event_type: z.enum(EVENT_TYPES, {
    errorMap: () => ({ message: '無効なイベント種別です' }),
  }).optional(),
  format: z.enum(EVENT_FORMATS, {
    errorMap: () => ({ message: '無効な開催形式です' }),
  }).optional(),
  goal: z.string().max(1000).nullable().optional(),
  target_audience: z.string().max(500).nullable().optional(),
  capacity_onsite: z.number().int().min(1).max(10000).nullable().optional(),
  capacity_online: z.number().int().min(1).max(10000).nullable().optional(),
  budget_min: z.number().int().min(0).max(999999999).nullable().optional(),
  budget_max: z.number().int().min(0).max(999999999).nullable().optional(),
  date_candidates: z.array(dateCandidateSchema).max(5).nullable().optional(),
  venue_id: z.string().nullable().optional(),
  start_at: z.string().nullable().optional(),
  end_at: z.string().nullable().optional(),
  ai_suggestions: z.unknown().nullable().optional(),
  status: z.enum(EVENT_STATUSES).optional(),
  settings: z.unknown().optional(),
  updated_at: z.string().optional(), // 楽観的ロック用
})

// ──────────────────────────────────────
// AI提案リクエストスキーマ (§5 POST /events/ai/suggest)
// ──────────────────────────────────────

export const aiSuggestSchema = z.object({
  goal: z.string()
    .min(1, '目的を入力してください')
    .max(1000, '目的は1000文字以内で入力してください'),
  target_audience: z.string()
    .min(1, 'ターゲットを入力してください')
    .max(500, 'ターゲットは500文字以内で入力してください'),
  capacity_onsite: z.number().int().min(0).max(10000).optional(),
  capacity_online: z.number().int().min(0).max(10000).optional(),
  budget_min: z.number().int().min(0).optional(),
  budget_max: z.number().int().min(0).optional(),
  date_candidates: z.array(dateCandidateSchema)
    .min(1, '日程候補は必須です')
    .max(5, '日程候補は5件までです'),
  event_type: z.enum(EVENT_TYPES, {
    errorMap: () => ({ message: '無効なイベント種別です' }),
  }),
})

// ──────────────────────────────────────
// 見積り生成リクエストスキーマ (§5 POST /estimates/generate)
// ──────────────────────────────────────

export const generateEstimateSchema = z.object({
  event_id: z.string().optional(),
  venue_id: z.string().min(1, '会場IDは必須です'),
  format: z.enum(EVENT_FORMATS, {
    errorMap: () => ({ message: '無効な開催形式です' }),
  }),
  capacity_onsite: z.number().int().min(0).optional(),
  capacity_online: z.number().int().min(0).optional(),
  streaming_package_id: z.string().optional(),
  additional_items: z.array(z.object({
    category: z.string(),
    name: z.string(),
    quantity: z.number().int().min(1),
    unit_price: z.number().int().min(0),
  })).optional(),
})

// ──────────────────────────────────────
// 企画書生成リクエストスキーマ (§5 POST /ai/generate/proposal)
// ──────────────────────────────────────

export const generateProposalSchema = z.object({
  event_id: z.string().min(1, 'イベントIDは必須です'),
  template: z.enum(['standard', 'detailed']).default('standard'),
  include_estimate: z.boolean().default(true),
})

// ──────────────────────────────────────
// ステータス遷移ルール (BR-EVT-001)
// ──────────────────────────────────────

export const STATUS_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  draft: ['planning', 'cancelled'],
  planning: ['confirmed', 'cancelled'],
  confirmed: ['ready', 'cancelled'],
  ready: ['in_progress'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
}

/**
 * ステータス遷移が有効かチェック
 */
export function isValidStatusTransition(from: EventStatus, to: EventStatus): boolean {
  const allowed = STATUS_TRANSITIONS[from]
  return allowed?.includes(to) ?? false
}
