// EVT-010-014 タスクバリデーション ユニットテスト
// 仕様書: docs/design/features/project/EVT-010-014_master-schedule.md §3-F
import { describe, it, expect } from 'vitest'
import {
  createTaskSchema,
  updateTaskSchema,
  generateTasksSchema,
  createTaskTemplateSchema,
  updateTaskTemplateSchema,
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_ROLES,
  MAX_TASKS_PER_EVENT,
  RELATIVE_DAY_MIN,
  RELATIVE_DAY_MAX,
  SORT_ORDER_MIN,
  SORT_ORDER_MAX,
  isValidTaskStatusTransition,
  TASK_STATUS_TRANSITIONS,
  calculateDueAt,
  recalculateDueDates,
} from '~/server/utils/task-validation'

// ──────────────────────────────────────
// 定数テスト
// ──────────────────────────────────────
describe('定数定義', () => {
  it('TASK_STATUSES は4種類', () => {
    expect(TASK_STATUSES).toEqual(['pending', 'in_progress', 'completed', 'skipped'])
  })

  it('TASK_PRIORITIES は3種類', () => {
    expect(TASK_PRIORITIES).toEqual(['high', 'medium', 'low'])
  })

  it('TASK_ROLES は6種類', () => {
    expect(TASK_ROLES).toEqual(['organizer', 'venue', 'streaming', 'event_planner', 'speaker', 'vendor'])
  })

  it('MAX_TASKS_PER_EVENT は200', () => {
    expect(MAX_TASKS_PER_EVENT).toBe(200)
  })

  it('RELATIVE_DAY の範囲は -365 〜 365', () => {
    expect(RELATIVE_DAY_MIN).toBe(-365)
    expect(RELATIVE_DAY_MAX).toBe(365)
  })

  it('SORT_ORDER の範囲は 0 〜 9999', () => {
    expect(SORT_ORDER_MIN).toBe(0)
    expect(SORT_ORDER_MAX).toBe(9999)
  })
})

// ──────────────────────────────────────
// createTaskSchema テスト
// ──────────────────────────────────────
describe('createTaskSchema', () => {
  const validPayload = {
    title: '企画書作成',
    description: '詳細な説明',
    assigned_role: 'organizer',
    priority: 'high' as const,
    relative_day: -7,
    sort_order: 1,
  }

  describe('正常系', () => {
    it('全フィールド指定で成功', () => {
      const result = createTaskSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('必須フィールド（title）のみで成功', () => {
      const result = createTaskSchema.safeParse({ title: 'テスト' })
      expect(result.success).toBe(true)
    })

    it('priority のデフォルトは medium', () => {
      const result = createTaskSchema.safeParse({ title: 'テスト' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.priority).toBe('medium')
      }
    })

    it('due_at を直接指定できる', () => {
      const result = createTaskSchema.safeParse({
        title: 'テスト',
        due_at: '2026-03-01T23:59:00.000Z',
      })
      expect(result.success).toBe(true)
    })

    it('relative_day のみ指定で成功', () => {
      const result = createTaskSchema.safeParse({
        title: 'テスト',
        relative_day: -30,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('§3-F 境界値: title', () => {
    it('1文字で成功', () => {
      const result = createTaskSchema.safeParse({ title: 'A' })
      expect(result.success).toBe(true)
    })

    it('200文字で成功', () => {
      const result = createTaskSchema.safeParse({ title: 'あ'.repeat(200) })
      expect(result.success).toBe(true)
    })

    it('空文字でエラー', () => {
      const result = createTaskSchema.safeParse({ title: '' })
      expect(result.success).toBe(false)
    })

    it('201文字でエラー', () => {
      const result = createTaskSchema.safeParse({ title: 'あ'.repeat(201) })
      expect(result.success).toBe(false)
    })
  })

  describe('§3-F 境界値: description', () => {
    it('2000文字で成功', () => {
      const result = createTaskSchema.safeParse({ title: 'テスト', description: 'a'.repeat(2000) })
      expect(result.success).toBe(true)
    })

    it('2001文字でエラー', () => {
      const result = createTaskSchema.safeParse({ title: 'テスト', description: 'a'.repeat(2001) })
      expect(result.success).toBe(false)
    })
  })

  describe('§3-F 境界値: relative_day', () => {
    it('-365 で成功', () => {
      const result = createTaskSchema.safeParse({ title: 'テスト', relative_day: -365 })
      expect(result.success).toBe(true)
    })

    it('365 で成功', () => {
      const result = createTaskSchema.safeParse({ title: 'テスト', relative_day: 365 })
      expect(result.success).toBe(true)
    })

    it('0 で成功（D-Day）', () => {
      const result = createTaskSchema.safeParse({ title: 'テスト', relative_day: 0 })
      expect(result.success).toBe(true)
    })

    it('-366 でエラー', () => {
      const result = createTaskSchema.safeParse({ title: 'テスト', relative_day: -366 })
      expect(result.success).toBe(false)
    })

    it('366 でエラー', () => {
      const result = createTaskSchema.safeParse({ title: 'テスト', relative_day: 366 })
      expect(result.success).toBe(false)
    })

    it('小数でエラー', () => {
      const result = createTaskSchema.safeParse({ title: 'テスト', relative_day: 1.5 })
      expect(result.success).toBe(false)
    })
  })

  describe('§3-F 境界値: sort_order', () => {
    it('0 で成功', () => {
      const result = createTaskSchema.safeParse({ title: 'テスト', sort_order: 0 })
      expect(result.success).toBe(true)
    })

    it('9999 で成功', () => {
      const result = createTaskSchema.safeParse({ title: 'テスト', sort_order: 9999 })
      expect(result.success).toBe(true)
    })

    it('-1 でエラー', () => {
      const result = createTaskSchema.safeParse({ title: 'テスト', sort_order: -1 })
      expect(result.success).toBe(false)
    })

    it('10000 でエラー', () => {
      const result = createTaskSchema.safeParse({ title: 'テスト', sort_order: 10000 })
      expect(result.success).toBe(false)
    })
  })

  describe('§3-F 境界値: priority', () => {
    it.each(TASK_PRIORITIES)('priority=%s で成功', (p) => {
      const result = createTaskSchema.safeParse({ title: 'テスト', priority: p })
      expect(result.success).toBe(true)
    })

    it('不正な priority でエラー', () => {
      const result = createTaskSchema.safeParse({ title: 'テスト', priority: 'critical' })
      expect(result.success).toBe(false)
    })
  })

  describe('relative_day と due_at の排他制約', () => {
    it('両方指定でエラー', () => {
      const result = createTaskSchema.safeParse({
        title: 'テスト',
        relative_day: -7,
        due_at: '2026-03-01T23:59:00.000Z',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map(i => i.message)
        expect(messages).toContain('relative_day と due_at は同時に指定できません')
      }
    })

    it('どちらも未指定で成功', () => {
      const result = createTaskSchema.safeParse({ title: 'テスト' })
      expect(result.success).toBe(true)
    })
  })
})

// ──────────────────────────────────────
// updateTaskSchema テスト
// ──────────────────────────────────────
describe('updateTaskSchema', () => {
  it('空オブジェクトで成功（全フィールドオプショナル）', () => {
    const result = updateTaskSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('title のみ更新で成功', () => {
    const result = updateTaskSchema.safeParse({ title: '更新後タイトル' })
    expect(result.success).toBe(true)
  })

  it('status のみ更新で成功', () => {
    const result = updateTaskSchema.safeParse({ status: 'in_progress' })
    expect(result.success).toBe(true)
  })

  it('不正な status でエラー', () => {
    const result = updateTaskSchema.safeParse({ status: 'done' })
    expect(result.success).toBe(false)
  })

  it('title 空文字でエラー（min(1)）', () => {
    const result = updateTaskSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────
// generateTasksSchema テスト
// ──────────────────────────────────────
describe('generateTasksSchema', () => {
  it('空オブジェクトで成功（デフォルト値適用）', () => {
    const result = generateTasksSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.use_template).toBe(true)
      expect(result.data.overwrite).toBe(false)
    }
  })

  it('overwrite=true で成功', () => {
    const result = generateTasksSchema.safeParse({ overwrite: true })
    expect(result.success).toBe(true)
  })

  it('custom_prompt を指定できる', () => {
    const result = generateTasksSchema.safeParse({ custom_prompt: 'カスタムプロンプト' })
    expect(result.success).toBe(true)
  })

  it('custom_prompt が2001文字でエラー', () => {
    const result = generateTasksSchema.safeParse({ custom_prompt: 'a'.repeat(2001) })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────
// createTaskTemplateSchema テスト
// ──────────────────────────────────────
describe('createTaskTemplateSchema', () => {
  const validPayload = {
    event_type: 'seminar',
    title: '企画書作成',
    assigned_role: 'organizer',
    relative_day: -30,
  }

  describe('正常系', () => {
    it('必須フィールドで成功', () => {
      const result = createTaskTemplateSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('全フィールド指定で成功', () => {
      const result = createTaskTemplateSchema.safeParse({
        ...validPayload,
        description: 'テンプレート説明',
        priority: 'high',
        sort_order: 10,
        is_active: false,
      })
      expect(result.success).toBe(true)
    })

    it('priority デフォルトは medium', () => {
      const result = createTaskTemplateSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.priority).toBe('medium')
      }
    })

    it('sort_order デフォルトは 0', () => {
      const result = createTaskTemplateSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.sort_order).toBe(0)
      }
    })

    it('is_active デフォルトは true', () => {
      const result = createTaskTemplateSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_active).toBe(true)
      }
    })
  })

  describe('§3-F 境界値: event_type', () => {
    it('空文字でエラー', () => {
      const result = createTaskTemplateSchema.safeParse({ ...validPayload, event_type: '' })
      expect(result.success).toBe(false)
    })

    it('50文字で成功', () => {
      const result = createTaskTemplateSchema.safeParse({ ...validPayload, event_type: 'a'.repeat(50) })
      expect(result.success).toBe(true)
    })

    it('51文字でエラー', () => {
      const result = createTaskTemplateSchema.safeParse({ ...validPayload, event_type: 'a'.repeat(51) })
      expect(result.success).toBe(false)
    })
  })

  describe('§3-F 境界値: title', () => {
    it('空文字でエラー', () => {
      const result = createTaskTemplateSchema.safeParse({ ...validPayload, title: '' })
      expect(result.success).toBe(false)
    })

    it('200文字で成功', () => {
      const result = createTaskTemplateSchema.safeParse({ ...validPayload, title: 'テ'.repeat(200) })
      expect(result.success).toBe(true)
    })

    it('201文字でエラー', () => {
      const result = createTaskTemplateSchema.safeParse({ ...validPayload, title: 'テ'.repeat(201) })
      expect(result.success).toBe(false)
    })
  })

  describe('§3-F 境界値: assigned_role', () => {
    it('空文字でエラー', () => {
      const result = createTaskTemplateSchema.safeParse({ ...validPayload, assigned_role: '' })
      expect(result.success).toBe(false)
    })

    it('50文字で成功', () => {
      const result = createTaskTemplateSchema.safeParse({ ...validPayload, assigned_role: 'r'.repeat(50) })
      expect(result.success).toBe(true)
    })

    it('51文字でエラー', () => {
      const result = createTaskTemplateSchema.safeParse({ ...validPayload, assigned_role: 'r'.repeat(51) })
      expect(result.success).toBe(false)
    })
  })

  describe('必須フィールド欠落', () => {
    it('event_type 欠落でエラー', () => {
      const { event_type, ...rest } = validPayload
      const result = createTaskTemplateSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('title 欠落でエラー', () => {
      const { title, ...rest } = validPayload
      const result = createTaskTemplateSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('assigned_role 欠落でエラー', () => {
      const { assigned_role, ...rest } = validPayload
      const result = createTaskTemplateSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('relative_day 欠落でエラー', () => {
      const { relative_day, ...rest } = validPayload
      const result = createTaskTemplateSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })
  })
})

// ──────────────────────────────────────
// updateTaskTemplateSchema テスト
// ──────────────────────────────────────
describe('updateTaskTemplateSchema', () => {
  it('空オブジェクトで成功（全フィールドオプショナル）', () => {
    const result = updateTaskTemplateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('title のみ更新で成功', () => {
    const result = updateTaskTemplateSchema.safeParse({ title: '更新テンプレート' })
    expect(result.success).toBe(true)
  })

  it('is_active を false に更新で成功', () => {
    const result = updateTaskTemplateSchema.safeParse({ is_active: false })
    expect(result.success).toBe(true)
  })
})

// ──────────────────────────────────────
// ステータス遷移テスト
// ──────────────────────────────────────
describe('isValidTaskStatusTransition', () => {
  describe('同じ状態への遷移はOK', () => {
    it.each(TASK_STATUSES)('%s → %s は有効', (status) => {
      expect(isValidTaskStatusTransition(status, status)).toBe(true)
    })
  })

  describe('pending からの遷移', () => {
    it('pending → in_progress は有効', () => {
      expect(isValidTaskStatusTransition('pending', 'in_progress')).toBe(true)
    })
    it('pending → skipped は有効', () => {
      expect(isValidTaskStatusTransition('pending', 'skipped')).toBe(true)
    })
    it('pending → completed は無効', () => {
      expect(isValidTaskStatusTransition('pending', 'completed')).toBe(false)
    })
  })

  describe('in_progress からの遷移', () => {
    it('in_progress → completed は有効', () => {
      expect(isValidTaskStatusTransition('in_progress', 'completed')).toBe(true)
    })
    it('in_progress → skipped は有効', () => {
      expect(isValidTaskStatusTransition('in_progress', 'skipped')).toBe(true)
    })
    it('in_progress → pending は有効（差し戻し）', () => {
      expect(isValidTaskStatusTransition('in_progress', 'pending')).toBe(true)
    })
  })

  describe('completed からの遷移', () => {
    it('completed → pending は有効（再オープン）', () => {
      expect(isValidTaskStatusTransition('completed', 'pending')).toBe(true)
    })
    it('completed → in_progress は無効', () => {
      expect(isValidTaskStatusTransition('completed', 'in_progress')).toBe(false)
    })
    it('completed → skipped は無効', () => {
      expect(isValidTaskStatusTransition('completed', 'skipped')).toBe(false)
    })
  })

  describe('skipped からの遷移', () => {
    it('skipped → pending は有効（再オープン）', () => {
      expect(isValidTaskStatusTransition('skipped', 'pending')).toBe(true)
    })
    it('skipped → in_progress は無効', () => {
      expect(isValidTaskStatusTransition('skipped', 'in_progress')).toBe(false)
    })
    it('skipped → completed は無効', () => {
      expect(isValidTaskStatusTransition('skipped', 'completed')).toBe(false)
    })
  })

  describe('TASK_STATUS_TRANSITIONS マップの網羅性', () => {
    it('全ステータスがキーに存在する', () => {
      for (const status of TASK_STATUSES) {
        expect(TASK_STATUS_TRANSITIONS).toHaveProperty(status)
      }
    })

    it('遷移先は全てTASK_STATUSESに含まれる', () => {
      for (const [, targets] of Object.entries(TASK_STATUS_TRANSITIONS)) {
        for (const target of targets) {
          expect(TASK_STATUSES).toContain(target)
        }
      }
    })
  })
})

// ──────────────────────────────────────
// 締め切り計算テスト
// ──────────────────────────────────────
describe('calculateDueAt', () => {
  const eventDate = '2026-04-01T10:00:00.000Z'

  it('relative_day=0 は D-Day (23:59)', () => {
    const result = calculateDueAt(eventDate, 0)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(3) // April = 3
    expect(result.getDate()).toBe(1)
    expect(result.getHours()).toBe(23)
    expect(result.getMinutes()).toBe(59)
  })

  it('relative_day=-7 は7日前', () => {
    const result = calculateDueAt(eventDate, -7)
    expect(result.getDate()).toBe(25) // April 1 - 7 = March 25
    expect(result.getMonth()).toBe(2) // March = 2
  })

  it('relative_day=1 は1日後', () => {
    const result = calculateDueAt(eventDate, 1)
    expect(result.getDate()).toBe(2)
    expect(result.getMonth()).toBe(3) // April
  })

  it('relative_day=-30 は30日前', () => {
    const result = calculateDueAt(eventDate, -30)
    expect(result.getMonth()).toBe(2) // March
    expect(result.getDate()).toBe(2) // March 2
  })

  it('Date オブジェクトも受け付ける', () => {
    const dateObj = new Date('2026-04-01T10:00:00.000Z')
    const result = calculateDueAt(dateObj, -1)
    expect(result.getDate()).toBe(31)
    expect(result.getMonth()).toBe(2) // March
  })

  it('時刻は 23:59:00.000 に設定される', () => {
    const result = calculateDueAt(eventDate, 0)
    expect(result.getHours()).toBe(23)
    expect(result.getMinutes()).toBe(59)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
  })
})

// ──────────────────────────────────────
// 再計算テスト
// ──────────────────────────────────────
describe('recalculateDueDates', () => {
  const newEventDate = '2026-05-01T10:00:00.000Z'

  it('relativeDay が null のタスクはスキップされる', () => {
    const tasks = [
      { id: 't1', relativeDay: -7 },
      { id: 't2', relativeDay: null },
      { id: 't3', relativeDay: 0 },
    ]
    const result = recalculateDueDates(tasks, newEventDate)
    expect(result).toHaveLength(2)
    expect(result.map(r => r.id)).toEqual(['t1', 't3'])
  })

  it('各タスクの dueAt が正しく再計算される', () => {
    const tasks = [
      { id: 't1', relativeDay: -30 },
      { id: 't2', relativeDay: 0 },
      { id: 't3', relativeDay: 5 },
    ]
    const result = recalculateDueDates(tasks, newEventDate)
    expect(result).toHaveLength(3)

    // t1: May 1 - 30 = April 1
    expect(result[0].dueAt.getMonth()).toBe(3) // April
    expect(result[0].dueAt.getDate()).toBe(1)

    // t2: May 1
    expect(result[1].dueAt.getMonth()).toBe(4) // May
    expect(result[1].dueAt.getDate()).toBe(1)

    // t3: May 1 + 5 = May 6
    expect(result[2].dueAt.getMonth()).toBe(4)
    expect(result[2].dueAt.getDate()).toBe(6)
  })

  it('空配列は空配列を返す', () => {
    const result = recalculateDueDates([], newEventDate)
    expect(result).toEqual([])
  })

  it('全て relativeDay=null なら空配列', () => {
    const tasks = [
      { id: 't1', relativeDay: null },
      { id: 't2', relativeDay: null },
    ]
    const result = recalculateDueDates(tasks, newEventDate)
    expect(result).toEqual([])
  })
})
