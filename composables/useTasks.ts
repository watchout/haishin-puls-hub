// EVT-010-014: タスク・スケジュール管理 Composable
// 仕様書: docs/design/features/project/EVT-010-014_master-schedule.md

// ──────────────────────────────────────
// 型定義
// ──────────────────────────────────────

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'
export type TaskPriority = 'high' | 'medium' | 'low'

export interface TaskData {
  id: string
  event_id: string
  tenant_id: string
  title: string
  description: string | null
  assigned_role: string | null
  assigned_user_id: string | null
  status: TaskStatus
  priority: TaskPriority
  relative_day: number | null
  due_at: string | null
  completed_at: string | null
  sort_order: number
  template_id: string | null
  created_at: string
  updated_at: string
}

export interface TaskSummary {
  total: number
  pending: number
  inProgress: number
  completed: number
  skipped: number
  overdue: number
}

export interface CreateTaskPayload {
  title: string
  description?: string
  assigned_role?: string
  assigned_user_id?: string
  priority?: TaskPriority
  relative_day?: number
  due_at?: string
  sort_order?: number
}

export interface TaskTemplateData {
  id: string
  tenant_id: string | null
  event_type: string
  title: string
  description: string | null
  assigned_role: string
  relative_day: number
  priority: TaskPriority
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// ──────────────────────────────────────
// ラベル定数
// ──────────────────────────────────────

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: '未着手',
  in_progress: '進行中',
  completed: '完了',
  skipped: 'スキップ',
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'neutral',
  in_progress: 'info',
  completed: 'success',
  skipped: 'warning',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: 'error',
  medium: 'warning',
  low: 'neutral',
}

export const TASK_ROLE_LABELS: Record<string, string> = {
  organizer: '主催者',
  venue: '会場担当',
  streaming: '配信担当',
  event_planner: '企画代行',
  speaker: '登壇者',
  vendor: '業者',
}

// ──────────────────────────────────────
// ヘルパー関数
// ──────────────────────────────────────

export function getTaskStatusLabel(status: TaskStatus): string {
  return TASK_STATUS_LABELS[status] ?? status
}

export function getTaskStatusColor(status: TaskStatus) {
  return (TASK_STATUS_COLORS[status] ?? 'neutral') as 'neutral' | 'info' | 'success' | 'warning'
}

export function getTaskPriorityLabel(priority: TaskPriority): string {
  return TASK_PRIORITY_LABELS[priority] ?? priority
}

export function getTaskPriorityColor(priority: TaskPriority) {
  return (TASK_PRIORITY_COLORS[priority] ?? 'neutral') as 'error' | 'warning' | 'neutral'
}

export function getTaskRoleLabel(role: string | null): string {
  if (!role) return '未割当'
  return TASK_ROLE_LABELS[role] ?? role
}

/** 進捗率を計算（0-100） */
export function calculateProgress(summary: TaskSummary): number {
  if (summary.total === 0) return 0
  return Math.round(((summary.completed + summary.skipped) / summary.total) * 100)
}

/** 相対日を表示用文字列に変換 */
export function formatRelativeDay(day: number | null): string {
  if (day === null) return '手動設定'
  if (day === 0) return 'D-Day'
  if (day < 0) return `D${day}`
  return `D+${day}`
}

// ──────────────────────────────────────
// useTasks Composable
// ──────────────────────────────────────

export function useTasks(eventId: string) {
  const tasks = ref<TaskData[]>([])
  const summary = ref<TaskSummary>({ total: 0, pending: 0, inProgress: 0, completed: 0, skipped: 0, overdue: 0 })
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTasks(filters?: { role?: string; status?: string }) {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<{ tasks: TaskData[]; summary: TaskSummary }>(`/api/v1/events/${eventId}/tasks`, {
        query: filters,
      })
      tasks.value = res.tasks
      summary.value = res.summary
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'タスクの取得に失敗しました'
    } finally {
      isLoading.value = false
    }
  }

  async function createTask(payload: CreateTaskPayload): Promise<TaskData | null> {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<{ task: TaskData }>(`/api/v1/events/${eventId}/tasks`, {
        method: 'POST',
        body: payload,
      })
      await fetchTasks()
      return res.task
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'タスクの作成に失敗しました'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updateTask(taskId: string, payload: Partial<CreateTaskPayload> & { status?: TaskStatus }): Promise<TaskData | null> {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<{ task: TaskData }>(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        body: payload,
      })
      await fetchTasks()
      return res.task
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'タスクの更新に失敗しました'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function completeTask(taskId: string): Promise<TaskData | null> {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<{ task: TaskData }>(`/api/v1/tasks/${taskId}/complete`, {
        method: 'POST',
      })
      await fetchTasks()
      return res.task
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'タスクの完了に失敗しました'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function deleteTask(taskId: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      await $fetch(`/api/v1/tasks/${taskId}`, { method: 'DELETE' })
      await fetchTasks()
      return true
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'タスクの削除に失敗しました'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function generateTasks(options?: { use_template?: boolean; overwrite?: boolean }): Promise<number> {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<{ tasks: TaskData[]; summary: { generated: number } }>(`/api/v1/events/${eventId}/tasks/generate`, {
        method: 'POST',
        body: options ?? {},
      })
      await fetchTasks()
      return res.summary.generated
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'タスクの自動生成に失敗しました'
      return 0
    } finally {
      isLoading.value = false
    }
  }

  return {
    tasks,
    summary,
    isLoading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    generateTasks,
  }
}
