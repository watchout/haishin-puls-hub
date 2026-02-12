// EVT-010-014: タスク・スケジュール バリデーションスキーマ
// 仕様書: docs/design/features/project/EVT-010-014_master-schedule.md §3-F
import { z } from 'zod'

// ──────────────────────────────────────
// 定数定義
// ──────────────────────────────────────

export const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'skipped'] as const
export type TaskStatus = typeof TASK_STATUSES[number]

export const TASK_PRIORITIES = ['high', 'medium', 'low'] as const
export type TaskPriority = typeof TASK_PRIORITIES[number]

export const TASK_ROLES = ['organizer', 'venue', 'streaming', 'event_planner', 'speaker', 'vendor'] as const
export type TaskRole = typeof TASK_ROLES[number]

// §3-F 境界値
export const MAX_TASKS_PER_EVENT = 200
export const RELATIVE_DAY_MIN = -365
export const RELATIVE_DAY_MAX = 365
export const SORT_ORDER_MIN = 0
export const SORT_ORDER_MAX = 9999

// ──────────────────────────────────────
// タスクバリデーション (§3-F)
// ──────────────────────────────────────

/** タスク作成スキーマ (§5.2) */
export const createTaskSchema = z.object({
  title: z.string().min(1, 'タスク名は必須です').max(200, 'タスク名は200文字以内で入力してください'),
  description: z.string().max(2000, '説明は2000文字以内で入力してください').optional(),
  assigned_role: z.string().max(50).optional(),
  assigned_user_id: z.string().optional(),
  priority: z.enum(TASK_PRIORITIES).optional().default('medium'),
  relative_day: z.number().int().min(RELATIVE_DAY_MIN).max(RELATIVE_DAY_MAX).optional(),
  due_at: z.string().datetime().optional(),
  sort_order: z.number().int().min(SORT_ORDER_MIN).max(SORT_ORDER_MAX).optional(),
}).refine(
  data => !(data.relative_day !== undefined && data.due_at !== undefined),
  { message: 'relative_day と due_at は同時に指定できません', path: ['relative_day'] },
)

/** タスク更新スキーマ (§5.3) */
export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  assigned_role: z.string().max(50).optional(),
  assigned_user_id: z.string().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  relative_day: z.number().int().min(RELATIVE_DAY_MIN).max(RELATIVE_DAY_MAX).optional(),
  due_at: z.string().datetime().optional(),
  sort_order: z.number().int().min(SORT_ORDER_MIN).max(SORT_ORDER_MAX).optional(),
})

/** タスク生成リクエストスキーマ (§5.6) */
export const generateTasksSchema = z.object({
  use_template: z.boolean().optional().default(true),
  custom_prompt: z.string().max(2000).optional(),
  overwrite: z.boolean().optional().default(false),
})

// ──────────────────────────────────────
// テンプレートバリデーション
// ──────────────────────────────────────

/** テンプレート作成スキーマ (§5.8) */
export const createTaskTemplateSchema = z.object({
  event_type: z.string().min(1, 'イベント種別は必須です').max(50),
  title: z.string().min(1, 'テンプレート名は必須です').max(200, 'テンプレート名は200文字以内で入力してください'),
  description: z.string().max(2000).optional(),
  assigned_role: z.string().min(1, '担当ロールは必須です').max(50),
  relative_day: z.number().int()
    .min(RELATIVE_DAY_MIN, `相対日は${RELATIVE_DAY_MIN}以上です`)
    .max(RELATIVE_DAY_MAX, `相対日は${RELATIVE_DAY_MAX}以下です`),
  priority: z.enum(TASK_PRIORITIES).optional().default('medium'),
  sort_order: z.number().int().min(SORT_ORDER_MIN).max(SORT_ORDER_MAX).optional().default(0),
  is_active: z.boolean().optional().default(true),
})

/** テンプレート更新スキーマ (§5.9) */
export const updateTaskTemplateSchema = createTaskTemplateSchema.partial()

// ──────────────────────────────────────
// ステータス遷移チェック
// ──────────────────────────────────────

/** 有効なステータス遷移マップ */
export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ['in_progress', 'skipped'],
  in_progress: ['completed', 'skipped', 'pending'],
  completed: ['pending'],   // 再オープン可
  skipped: ['pending'],     // 再オープン可
}

/** ステータス遷移チェック */
export function isValidTaskStatusTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true // 同じ状態はOK
  return TASK_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

// ──────────────────────────────────────
// 締め切り計算
// ──────────────────────────────────────

/** 相対日から締め切り日を計算 */
export function calculateDueAt(eventStartAt: Date | string, relativeDay: number): Date {
  const baseDate = typeof eventStartAt === 'string' ? new Date(eventStartAt) : eventStartAt
  const dueAt = new Date(baseDate)
  dueAt.setDate(dueAt.getDate() + relativeDay)
  // デフォルト23:59 (§FR-EVT-011-3)
  dueAt.setHours(23, 59, 0, 0)
  return dueAt
}

/** イベント開催日変更時に全タスクの締め切りを再計算 */
export function recalculateDueDates(
  tasks: { id: string; relativeDay: number | null }[],
  newEventDate: Date | string,
): { id: string; dueAt: Date }[] {
  return tasks
    .filter(t => t.relativeDay !== null)
    .map(t => ({
      id: t.id,
      dueAt: calculateDueAt(newEventDate, t.relativeDay as number),
    }))
}
