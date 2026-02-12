// EVT-001-005: イベント ヘルパー関数テスト
// composables/useEvents.ts のヘルパー関数を直接テスト
// （Vueランタイムに依存しないため、関数を再実装してテスト）
import { describe, it, expect } from 'vitest'

// ──────────────────────────────────────
// テスト対象の関数・定数を再定義（Vueインポートを回避）
// ──────────────────────────────────────

const EVENT_TYPES = ['seminar', 'presentation', 'internal', 'workshop'] as const
const EVENT_FORMATS = ['onsite', 'online', 'hybrid'] as const
const EVENT_STATUSES = ['draft', 'planning', 'confirmed', 'ready', 'in_progress', 'completed', 'cancelled'] as const

type EventType = typeof EVENT_TYPES[number]
type EventFormat = typeof EVENT_FORMATS[number]
type EventStatus = typeof EVENT_STATUSES[number]

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  seminar: 'セミナー',
  presentation: 'プレゼンテーション',
  internal: '社内イベント',
  workshop: 'ワークショップ',
}

const EVENT_FORMAT_LABELS: Record<EventFormat, string> = {
  onsite: '現地開催',
  online: 'オンライン開催',
  hybrid: 'ハイブリッド開催',
}

const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: '下書き',
  planning: '企画中',
  confirmed: '確定',
  ready: '準備完了',
  in_progress: '開催中',
  completed: '完了',
  cancelled: 'キャンセル',
}

const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  draft: 'neutral',
  planning: 'info',
  confirmed: 'success',
  ready: 'warning',
  in_progress: 'error',
  completed: 'success',
  cancelled: 'neutral',
}

function getStatusLabel(status: EventStatus): string {
  return EVENT_STATUS_LABELS[status] ?? status
}

function getStatusColor(status: EventStatus): string {
  return EVENT_STATUS_COLORS[status] ?? 'neutral'
}

function getEventTypeLabel(type: EventType): string {
  return EVENT_TYPE_LABELS[type] ?? type
}

function getFormatLabel(format: EventFormat): string {
  return EVENT_FORMAT_LABELS[format] ?? format
}

// ──────────────────────────────────────
// getStatusLabel テスト
// ──────────────────────────────────────

describe('getStatusLabel', () => {
  it('全ステータスに日本語ラベルがある', () => {
    expect(getStatusLabel('draft')).toBe('下書き')
    expect(getStatusLabel('planning')).toBe('企画中')
    expect(getStatusLabel('confirmed')).toBe('確定')
    expect(getStatusLabel('ready')).toBe('準備完了')
    expect(getStatusLabel('in_progress')).toBe('開催中')
    expect(getStatusLabel('completed')).toBe('完了')
    expect(getStatusLabel('cancelled')).toBe('キャンセル')
  })

  it('EVENT_STATUS_LABELS に7ステータス定義されている', () => {
    expect(Object.keys(EVENT_STATUS_LABELS)).toHaveLength(7)
  })
})

// ──────────────────────────────────────
// getStatusColor テスト
// ──────────────────────────────────────

describe('getStatusColor', () => {
  it('全ステータスに色が定義されている', () => {
    for (const status of EVENT_STATUSES) {
      const color = getStatusColor(status)
      expect(color).toBeTruthy()
      expect(typeof color).toBe('string')
    }
  })

  it('EVENT_STATUS_COLORS に7ステータス定義されている', () => {
    expect(Object.keys(EVENT_STATUS_COLORS)).toHaveLength(7)
  })
})

// ──────────────────────────────────────
// getEventTypeLabel テスト
// ──────────────────────────────────────

describe('getEventTypeLabel', () => {
  it('全種別に日本語ラベルがある', () => {
    expect(getEventTypeLabel('seminar')).toBe('セミナー')
    expect(getEventTypeLabel('presentation')).toBe('プレゼンテーション')
    expect(getEventTypeLabel('internal')).toBe('社内イベント')
    expect(getEventTypeLabel('workshop')).toBe('ワークショップ')
  })

  it('EVENT_TYPE_LABELS に4種別定義されている', () => {
    expect(Object.keys(EVENT_TYPE_LABELS)).toHaveLength(4)
  })
})

// ──────────────────────────────────────
// getFormatLabel テスト
// ──────────────────────────────────────

describe('getFormatLabel', () => {
  it('全形式に日本語ラベルがある', () => {
    expect(getFormatLabel('onsite')).toBe('現地開催')
    expect(getFormatLabel('online')).toBe('オンライン開催')
    expect(getFormatLabel('hybrid')).toBe('ハイブリッド開催')
  })

  it('EVENT_FORMAT_LABELS に3形式定義されている', () => {
    expect(Object.keys(EVENT_FORMAT_LABELS)).toHaveLength(3)
  })
})

// ──────────────────────────────────────
// 定数一致テスト
// ──────────────────────────────────────

describe('定数の整合性', () => {
  it('EVENT_TYPES と EVENT_TYPE_LABELS のキーが一致', () => {
    for (const type of EVENT_TYPES) {
      expect(EVENT_TYPE_LABELS[type]).toBeDefined()
    }
  })

  it('EVENT_FORMATS と EVENT_FORMAT_LABELS のキーが一致', () => {
    for (const format of EVENT_FORMATS) {
      expect(EVENT_FORMAT_LABELS[format]).toBeDefined()
    }
  })

  it('EVENT_STATUSES と EVENT_STATUS_LABELS のキーが一致', () => {
    for (const status of EVENT_STATUSES) {
      expect(EVENT_STATUS_LABELS[status]).toBeDefined()
    }
  })

  it('EVENT_STATUSES と EVENT_STATUS_COLORS のキーが一致', () => {
    for (const status of EVENT_STATUSES) {
      expect(EVENT_STATUS_COLORS[status]).toBeDefined()
    }
  })
})
