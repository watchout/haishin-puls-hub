// EVT-001-005 §3-F, §7: イベントバリデーション + ステータス遷移テスト
import { describe, it, expect } from 'vitest'
import {
  createEventSchema,
  updateEventSchema,
  aiSuggestSchema,
  generateEstimateSchema,
  generateProposalSchema,
  isValidStatusTransition,
  STATUS_TRANSITIONS,
  EVENT_TYPES,
  EVENT_FORMATS,
  EVENT_STATUSES,
} from '~/server/utils/event-validation'

// ──────────────────────────────────────
// createEventSchema テスト (§3-F)
// ──────────────────────────────────────

describe('createEventSchema', () => {
  const validPayload = {
    title: '製造業DXセミナー',
    event_type: 'seminar' as const,
    format: 'hybrid' as const,
    goal: '新製品の認知度向上',
    target_audience: '製造業の経営者',
    capacity_onsite: 50,
    capacity_online: 100,
  }

  it('正常なペイロードでバリデーション成功', () => {
    const result = createEventSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('タイトル空文字 → エラー', () => {
    const result = createEventSchema.safeParse({ ...validPayload, title: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.title).toBeDefined()
    }
  })

  it('タイトル201文字 → エラー', () => {
    const result = createEventSchema.safeParse({ ...validPayload, title: 'a'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('タイトル200文字 → 成功', () => {
    const result = createEventSchema.safeParse({ ...validPayload, title: 'a'.repeat(200) })
    expect(result.success).toBe(true)
  })

  it('description 5001文字 → エラー', () => {
    const result = createEventSchema.safeParse({ ...validPayload, description: 'a'.repeat(5001) })
    expect(result.success).toBe(false)
  })

  it('description 5000文字 → 成功', () => {
    const result = createEventSchema.safeParse({ ...validPayload, description: 'a'.repeat(5000) })
    expect(result.success).toBe(true)
  })

  it('goal 1001文字 → エラー', () => {
    const result = createEventSchema.safeParse({ ...validPayload, goal: 'a'.repeat(1001) })
    expect(result.success).toBe(false)
  })

  it('target_audience 501文字 → エラー', () => {
    const result = createEventSchema.safeParse({ ...validPayload, target_audience: 'a'.repeat(501) })
    expect(result.success).toBe(false)
  })

  it('無効なイベント種別 → エラー', () => {
    const result = createEventSchema.safeParse({ ...validPayload, event_type: 'invalid_type' })
    expect(result.success).toBe(false)
  })

  it('無効な開催形式 → エラー', () => {
    const result = createEventSchema.safeParse({ ...validPayload, format: 'invalid_format' })
    expect(result.success).toBe(false)
  })

  it('capacity_onsite 0 → エラー', () => {
    const result = createEventSchema.safeParse({ ...validPayload, capacity_onsite: 0 })
    expect(result.success).toBe(false)
  })

  it('capacity_onsite 1 → 成功', () => {
    const result = createEventSchema.safeParse({ ...validPayload, capacity_onsite: 1 })
    expect(result.success).toBe(true)
  })

  it('capacity_onsite 10001 → エラー', () => {
    const result = createEventSchema.safeParse({ ...validPayload, capacity_onsite: 10001 })
    expect(result.success).toBe(false)
  })

  it('capacity_onsite 10000 → 成功', () => {
    const result = createEventSchema.safeParse({ ...validPayload, capacity_onsite: 10000 })
    expect(result.success).toBe(true)
  })

  it('budget_max < budget_min → エラー', () => {
    const result = createEventSchema.safeParse({
      ...validPayload,
      budget_min: 200000,
      budget_max: 100000,
    })
    expect(result.success).toBe(false)
  })

  it('budget_max >= budget_min → 成功', () => {
    const result = createEventSchema.safeParse({
      ...validPayload,
      budget_min: 100000,
      budget_max: 300000,
    })
    expect(result.success).toBe(true)
  })

  it('budget_min 負の値 → エラー', () => {
    const result = createEventSchema.safeParse({ ...validPayload, budget_min: -1 })
    expect(result.success).toBe(false)
  })

  it('date_candidates 6件 → エラー', () => {
    const sixDates = Array.from({ length: 6 }, (_, i) => ({
      date: `2026-03-${String(i + 10).padStart(2, '0')}`,
      start_time: '14:00',
      end_time: '16:00',
      priority: i + 1,
    }))
    const result = createEventSchema.safeParse({ ...validPayload, date_candidates: sixDates })
    expect(result.success).toBe(false)
  })

  it('date_candidates 5件 → 成功', () => {
    const fiveDates = Array.from({ length: 5 }, (_, i) => ({
      date: `2026-03-${String(i + 10).padStart(2, '0')}`,
      start_time: '14:00',
      end_time: '16:00',
      priority: i + 1,
    }))
    const result = createEventSchema.safeParse({ ...validPayload, date_candidates: fiveDates })
    expect(result.success).toBe(true)
  })

  it('end_at < start_at → エラー', () => {
    const result = createEventSchema.safeParse({
      ...validPayload,
      start_at: '2026-03-15T16:00:00Z',
      end_at: '2026-03-15T14:00:00Z',
    })
    expect(result.success).toBe(false)
  })

  it('全種別が有効', () => {
    for (const type of EVENT_TYPES) {
      const result = createEventSchema.safeParse({ ...validPayload, event_type: type })
      expect(result.success).toBe(true)
    }
  })

  it('全形式が有効', () => {
    for (const format of EVENT_FORMATS) {
      const result = createEventSchema.safeParse({ ...validPayload, format })
      expect(result.success).toBe(true)
    }
  })
})

// ──────────────────────────────────────
// updateEventSchema テスト
// ──────────────────────────────────────

describe('updateEventSchema', () => {
  it('空オブジェクト（部分更新なし）→ 成功', () => {
    const result = updateEventSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('タイトルのみ更新 → 成功', () => {
    const result = updateEventSchema.safeParse({ title: '更新タイトル' })
    expect(result.success).toBe(true)
  })

  it('ステータス更新 → 成功', () => {
    const result = updateEventSchema.safeParse({ status: 'planning' })
    expect(result.success).toBe(true)
  })

  it('無効なステータス → エラー', () => {
    const result = updateEventSchema.safeParse({ status: 'invalid' })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────
// aiSuggestSchema テスト
// ──────────────────────────────────────

describe('aiSuggestSchema', () => {
  const validPayload = {
    goal: '新製品の認知度向上',
    target_audience: '製造業経営者',
    date_candidates: [
      { date: '2026-03-15', start_time: '14:00', end_time: '16:00', priority: 1 },
    ],
    event_type: 'seminar' as const,
  }

  it('正常なペイロード → 成功', () => {
    const result = aiSuggestSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('goal 空 → エラー', () => {
    const result = aiSuggestSchema.safeParse({ ...validPayload, goal: '' })
    expect(result.success).toBe(false)
  })

  it('date_candidates 空配列 → エラー', () => {
    const result = aiSuggestSchema.safeParse({ ...validPayload, date_candidates: [] })
    expect(result.success).toBe(false)
  })

  it('date_candidates 6件 → エラー', () => {
    const sixDates = Array.from({ length: 6 }, (_, i) => ({
      date: `2026-03-${String(i + 10).padStart(2, '0')}`,
      start_time: '14:00',
      end_time: '16:00',
      priority: i + 1,
    }))
    const result = aiSuggestSchema.safeParse({ ...validPayload, date_candidates: sixDates })
    expect(result.success).toBe(false)
  })

  it('日付形式不正 → エラー', () => {
    const result = aiSuggestSchema.safeParse({
      ...validPayload,
      date_candidates: [{ date: 'not-a-date', start_time: '14:00', end_time: '16:00', priority: 1 }],
    })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────
// generateEstimateSchema テスト
// ──────────────────────────────────────

describe('generateEstimateSchema', () => {
  it('正常なペイロード → 成功', () => {
    const result = generateEstimateSchema.safeParse({
      venue_id: '01ABCDE',
      format: 'hybrid',
    })
    expect(result.success).toBe(true)
  })

  it('venue_id 空 → エラー', () => {
    const result = generateEstimateSchema.safeParse({
      venue_id: '',
      format: 'hybrid',
    })
    expect(result.success).toBe(false)
  })

  it('無効な format → エラー', () => {
    const result = generateEstimateSchema.safeParse({
      venue_id: '01ABCDE',
      format: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────
// generateProposalSchema テスト
// ──────────────────────────────────────

describe('generateProposalSchema', () => {
  it('正常なペイロード → 成功', () => {
    const result = generateProposalSchema.safeParse({
      event_id: '01ABCDE',
    })
    expect(result.success).toBe(true)
  })

  it('event_id 空 → エラー', () => {
    const result = generateProposalSchema.safeParse({
      event_id: '',
    })
    expect(result.success).toBe(false)
  })

  it('デフォルト template = standard', () => {
    const result = generateProposalSchema.safeParse({ event_id: '01ABCDE' })
    if (result.success) {
      expect(result.data.template).toBe('standard')
    }
  })

  it('デフォルト include_estimate = true', () => {
    const result = generateProposalSchema.safeParse({ event_id: '01ABCDE' })
    if (result.success) {
      expect(result.data.include_estimate).toBe(true)
    }
  })
})

// ──────────────────────────────────────
// ステータス遷移テスト (BR-EVT-001)
// ──────────────────────────────────────

describe('isValidStatusTransition (BR-EVT-001)', () => {
  it('draft → planning: 有効', () => {
    expect(isValidStatusTransition('draft', 'planning')).toBe(true)
  })

  it('draft → cancelled: 有効', () => {
    expect(isValidStatusTransition('draft', 'cancelled')).toBe(true)
  })

  it('planning → confirmed: 有効', () => {
    expect(isValidStatusTransition('planning', 'confirmed')).toBe(true)
  })

  it('planning → cancelled: 有効', () => {
    expect(isValidStatusTransition('planning', 'cancelled')).toBe(true)
  })

  it('confirmed → ready: 有効', () => {
    expect(isValidStatusTransition('confirmed', 'ready')).toBe(true)
  })

  it('confirmed → cancelled: 有効', () => {
    expect(isValidStatusTransition('confirmed', 'cancelled')).toBe(true)
  })

  it('ready → in_progress: 有効', () => {
    expect(isValidStatusTransition('ready', 'in_progress')).toBe(true)
  })

  it('in_progress → completed: 有効', () => {
    expect(isValidStatusTransition('in_progress', 'completed')).toBe(true)
  })

  // 無効な遷移
  it('planning → draft: 無効（後退不可）', () => {
    expect(isValidStatusTransition('planning', 'draft')).toBe(false)
  })

  it('completed → draft: 無効', () => {
    expect(isValidStatusTransition('completed', 'draft')).toBe(false)
  })

  it('cancelled → draft: 無効', () => {
    expect(isValidStatusTransition('cancelled', 'draft')).toBe(false)
  })

  it('draft → confirmed: 無効（スキップ不可）', () => {
    expect(isValidStatusTransition('draft', 'confirmed')).toBe(false)
  })

  it('ready → completed: 無効（in_progress スキップ不可）', () => {
    expect(isValidStatusTransition('ready', 'completed')).toBe(false)
  })

  it('completed からの遷移はすべて無効', () => {
    for (const status of EVENT_STATUSES) {
      if (status === 'completed') continue
      expect(isValidStatusTransition('completed', status)).toBe(false)
    }
  })

  it('cancelled からの遷移はすべて無効', () => {
    for (const status of EVENT_STATUSES) {
      if (status === 'cancelled') continue
      expect(isValidStatusTransition('cancelled', status)).toBe(false)
    }
  })

  it('全ステータスに遷移ルールが定義されている', () => {
    for (const status of EVENT_STATUSES) {
      expect(STATUS_TRANSITIONS[status]).toBeDefined()
    }
  })
})

// ──────────────────────────────────────
// 定数テスト
// ──────────────────────────────────────

describe('定数定義', () => {
  it('EVENT_TYPES: 4種類', () => {
    expect(EVENT_TYPES).toHaveLength(4)
    expect(EVENT_TYPES).toContain('seminar')
    expect(EVENT_TYPES).toContain('presentation')
    expect(EVENT_TYPES).toContain('internal')
    expect(EVENT_TYPES).toContain('workshop')
  })

  it('EVENT_FORMATS: 3種類', () => {
    expect(EVENT_FORMATS).toHaveLength(3)
    expect(EVENT_FORMATS).toContain('onsite')
    expect(EVENT_FORMATS).toContain('online')
    expect(EVENT_FORMATS).toContain('hybrid')
  })

  it('EVENT_STATUSES: 7種類', () => {
    expect(EVENT_STATUSES).toHaveLength(7)
  })
})
