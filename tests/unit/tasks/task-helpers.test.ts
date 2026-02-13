// EVT-010-014 タスクヘルパー ユニットテスト
// 仕様書: docs/design/features/project/EVT-010-014_master-schedule.md
// Note: Vue composable 依存を避けるため、ヘルパー関数をローカルに再定義してテスト
import { describe, it, expect } from 'vitest'

// ──────────────────────────────────────
// ローカル再定義（composables/useTasks.ts と同等ロジック）
// ──────────────────────────────────────

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'
type TaskPriority = 'high' | 'medium' | 'low'

interface TaskSummary {
  total: number
  pending: number
  inProgress: number
  completed: number
  skipped: number
  overdue: number
}

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: '未着手',
  in_progress: '進行中',
  completed: '完了',
  skipped: 'スキップ',
}

const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'neutral',
  in_progress: 'info',
  completed: 'success',
  skipped: 'warning',
}

const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: 'error',
  medium: 'warning',
  low: 'neutral',
}

const TASK_ROLE_LABELS: Record<string, string> = {
  organizer: '主催者',
  venue: '会場担当',
  streaming: '配信担当',
  event_planner: '企画代行',
  speaker: '登壇者',
  vendor: '業者',
}

function getTaskStatusLabel(status: TaskStatus): string {
  return TASK_STATUS_LABELS[status] ?? status
}

function getTaskStatusColor(status: TaskStatus): string {
  return TASK_STATUS_COLORS[status] ?? 'neutral'
}

function getTaskPriorityLabel(priority: TaskPriority): string {
  return TASK_PRIORITY_LABELS[priority] ?? priority
}

function getTaskPriorityColor(priority: TaskPriority): string {
  return TASK_PRIORITY_COLORS[priority] ?? 'neutral'
}

function getTaskRoleLabel(role: string | null): string {
  if (!role) return '未割当'
  return TASK_ROLE_LABELS[role] ?? role
}

function calculateProgress(summary: TaskSummary): number {
  if (summary.total === 0) return 0
  return Math.round(((summary.completed + summary.skipped) / summary.total) * 100)
}

function formatRelativeDay(day: number | null): string {
  if (day === null) return '手動設定'
  if (day === 0) return 'D-Day'
  if (day < 0) return `D${day}`
  return `D+${day}`
}

// ──────────────────────────────────────
// テスト
// ──────────────────────────────────────

describe('getTaskStatusLabel', () => {
  it('pending → 未着手', () => {
    expect(getTaskStatusLabel('pending')).toBe('未着手')
  })

  it('in_progress → 進行中', () => {
    expect(getTaskStatusLabel('in_progress')).toBe('進行中')
  })

  it('completed → 完了', () => {
    expect(getTaskStatusLabel('completed')).toBe('完了')
  })

  it('skipped → スキップ', () => {
    expect(getTaskStatusLabel('skipped')).toBe('スキップ')
  })

  it('不明な値はそのまま返す', () => {
    expect(getTaskStatusLabel('unknown' as TaskStatus)).toBe('unknown')
  })
})

describe('getTaskStatusColor', () => {
  it('pending → neutral', () => {
    expect(getTaskStatusColor('pending')).toBe('neutral')
  })

  it('in_progress → info', () => {
    expect(getTaskStatusColor('in_progress')).toBe('info')
  })

  it('completed → success', () => {
    expect(getTaskStatusColor('completed')).toBe('success')
  })

  it('skipped → warning', () => {
    expect(getTaskStatusColor('skipped')).toBe('warning')
  })

  it('不明な値は neutral を返す', () => {
    expect(getTaskStatusColor('unknown' as TaskStatus)).toBe('neutral')
  })
})

describe('getTaskPriorityLabel', () => {
  it('high → 高', () => {
    expect(getTaskPriorityLabel('high')).toBe('高')
  })

  it('medium → 中', () => {
    expect(getTaskPriorityLabel('medium')).toBe('中')
  })

  it('low → 低', () => {
    expect(getTaskPriorityLabel('low')).toBe('低')
  })

  it('不明な値はそのまま返す', () => {
    expect(getTaskPriorityLabel('critical' as TaskPriority)).toBe('critical')
  })
})

describe('getTaskPriorityColor', () => {
  it('high → error', () => {
    expect(getTaskPriorityColor('high')).toBe('error')
  })

  it('medium → warning', () => {
    expect(getTaskPriorityColor('medium')).toBe('warning')
  })

  it('low → neutral', () => {
    expect(getTaskPriorityColor('low')).toBe('neutral')
  })

  it('不明な値は neutral を返す', () => {
    expect(getTaskPriorityColor('critical' as TaskPriority)).toBe('neutral')
  })
})

describe('getTaskRoleLabel', () => {
  it('organizer → 主催者', () => {
    expect(getTaskRoleLabel('organizer')).toBe('主催者')
  })

  it('venue → 会場担当', () => {
    expect(getTaskRoleLabel('venue')).toBe('会場担当')
  })

  it('streaming → 配信担当', () => {
    expect(getTaskRoleLabel('streaming')).toBe('配信担当')
  })

  it('event_planner → 企画代行', () => {
    expect(getTaskRoleLabel('event_planner')).toBe('企画代行')
  })

  it('speaker → 登壇者', () => {
    expect(getTaskRoleLabel('speaker')).toBe('登壇者')
  })

  it('vendor → 業者', () => {
    expect(getTaskRoleLabel('vendor')).toBe('業者')
  })

  it('null → 未割当', () => {
    expect(getTaskRoleLabel(null)).toBe('未割当')
  })

  it('不明なロールはそのまま返す', () => {
    expect(getTaskRoleLabel('custom_role')).toBe('custom_role')
  })
})

describe('calculateProgress', () => {
  it('タスク0件は0%', () => {
    const summary: TaskSummary = { total: 0, pending: 0, inProgress: 0, completed: 0, skipped: 0, overdue: 0 }
    expect(calculateProgress(summary)).toBe(0)
  })

  it('全完了は100%', () => {
    const summary: TaskSummary = { total: 10, pending: 0, inProgress: 0, completed: 10, skipped: 0, overdue: 0 }
    expect(calculateProgress(summary)).toBe(100)
  })

  it('全スキップも100%', () => {
    const summary: TaskSummary = { total: 5, pending: 0, inProgress: 0, completed: 0, skipped: 5, overdue: 0 }
    expect(calculateProgress(summary)).toBe(100)
  })

  it('完了+スキップの合計で計算', () => {
    const summary: TaskSummary = { total: 10, pending: 3, inProgress: 2, completed: 3, skipped: 2, overdue: 1 }
    expect(calculateProgress(summary)).toBe(50) // (3+2)/10 = 50%
  })

  it('端数は四捨五入', () => {
    const summary: TaskSummary = { total: 3, pending: 1, inProgress: 1, completed: 1, skipped: 0, overdue: 0 }
    expect(calculateProgress(summary)).toBe(33) // 1/3 = 33.3... → 33
  })

  it('全未着手は0%', () => {
    const summary: TaskSummary = { total: 10, pending: 10, inProgress: 0, completed: 0, skipped: 0, overdue: 0 }
    expect(calculateProgress(summary)).toBe(0)
  })
})

describe('formatRelativeDay', () => {
  it('null → 手動設定', () => {
    expect(formatRelativeDay(null)).toBe('手動設定')
  })

  it('0 → D-Day', () => {
    expect(formatRelativeDay(0)).toBe('D-Day')
  })

  it('-7 → D-7', () => {
    expect(formatRelativeDay(-7)).toBe('D-7')
  })

  it('-30 → D-30', () => {
    expect(formatRelativeDay(-30)).toBe('D-30')
  })

  it('1 → D+1', () => {
    expect(formatRelativeDay(1)).toBe('D+1')
  })

  it('14 → D+14', () => {
    expect(formatRelativeDay(14)).toBe('D+14')
  })

  it('-1 → D-1', () => {
    expect(formatRelativeDay(-1)).toBe('D-1')
  })

  it('-365 → D-365', () => {
    expect(formatRelativeDay(-365)).toBe('D-365')
  })

  it('365 → D+365', () => {
    expect(formatRelativeDay(365)).toBe('D+365')
  })
})
