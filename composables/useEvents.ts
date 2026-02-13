// EVT-001-005 イベント管理 Composable
// 仕様書: docs/design/features/project/EVT-001-005_event-planning.md

import { ref, computed } from 'vue'
import type { Ref } from 'vue'

// ──────────────────────────────────────
// 型定義
// ──────────────────────────────────────

export const EVENT_TYPES = ['seminar', 'presentation', 'internal', 'workshop'] as const
export const EVENT_FORMATS = ['onsite', 'online', 'hybrid'] as const
export const EVENT_STATUSES = ['draft', 'planning', 'confirmed', 'ready', 'in_progress', 'completed', 'cancelled'] as const

export type EventType = typeof EVENT_TYPES[number]
export type EventFormat = typeof EVENT_FORMATS[number]
export type EventStatus = typeof EVENT_STATUSES[number]

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  seminar: 'セミナー',
  presentation: 'プレゼンテーション',
  internal: '社内イベント',
  workshop: 'ワークショップ',
}

export const EVENT_FORMAT_LABELS: Record<EventFormat, string> = {
  onsite: '現地開催',
  online: 'オンライン開催',
  hybrid: 'ハイブリッド開催',
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: '下書き',
  planning: '企画中',
  confirmed: '確定',
  ready: '準備完了',
  in_progress: '開催中',
  completed: '完了',
  cancelled: 'キャンセル',
}

export const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  draft: 'neutral',
  planning: 'info',
  confirmed: 'success',
  ready: 'warning',
  in_progress: 'error',
  completed: 'success',
  cancelled: 'neutral',
}

export interface DateCandidate {
  date: string
  start_time: string
  end_time: string
  priority: number
}

export interface EventData {
  id: string
  tenant_id: string
  venue_id: string | null
  title: string
  description: string | null
  event_type: EventType
  format: EventFormat
  status: EventStatus
  start_at: string | null
  end_at: string | null
  capacity_onsite: number | null
  capacity_online: number | null
  budget_min: number | null
  budget_max: number | null
  goal: string | null
  target_audience: string | null
  date_candidates: DateCandidate[] | null
  ai_suggestions: unknown | null
  ai_generated: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface VenueSuggestion {
  venue_id: string
  name: string
  branch_name: string | null
  address: string
  capacity: number
  reason: string
  availability: boolean
  equipment_match: boolean
}

export interface FormatSuggestion {
  recommended: EventFormat
  reason: string
}

export interface EstimateItem {
  category: string
  name: string
  quantity: number
  unit_price: number
  subtotal: number
  note?: string
}

export interface AiSuggestion {
  venues: VenueSuggestion[]
  format: FormatSuggestion
  estimate: {
    id: string
    title: string
    items: EstimateItem[]
    total_amount: number
  }
  suggested_title?: string
  suggested_description?: string
}

export interface CreateEventPayload {
  title: string
  description?: string | null
  event_type: EventType
  format: EventFormat
  goal?: string | null
  target_audience?: string | null
  capacity_onsite?: number | null
  capacity_online?: number | null
  budget_min?: number | null
  budget_max?: number | null
  date_candidates?: DateCandidate[] | null
  venue_id?: string | null
  start_at?: string | null
  end_at?: string | null
  ai_suggestions?: unknown
  ai_generated?: boolean
}

// ──────────────────────────────────────
// ステータスバッジ用ヘルパー
// ──────────────────────────────────────

export function getStatusLabel(status: EventStatus): string {
  return EVENT_STATUS_LABELS[status] ?? status
}

export function getStatusColor(status: EventStatus) {
  return (EVENT_STATUS_COLORS[status] ?? 'neutral') as 'neutral' | 'info' | 'success' | 'warning' | 'error'
}

export function getEventTypeLabel(type: EventType): string {
  return EVENT_TYPE_LABELS[type] ?? type
}

export function getFormatLabel(format: EventFormat): string {
  return EVENT_FORMAT_LABELS[format] ?? format
}

// ──────────────────────────────────────
// Composable
// ──────────────────────────────────────

export function useEvents() {
  const events: Ref<EventData[]> = ref([])
  const currentEvent: Ref<EventData | null> = ref(null)
  const isLoading = ref(false)
  const error: Ref<string | null> = ref(null)
  const pagination = ref({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 0,
  })

  // イベント一覧取得
  async function fetchEvents(page = 1, perPage = 20): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const data = await $fetch<{ data: EventData[]; pagination: typeof pagination.value }>(
        '/api/v1/events',
        { query: { page, per_page: perPage } },
      )
      events.value = data.data ?? []
      if (data.pagination) {
        pagination.value = data.pagination
      }
    } catch (err) {
      error.value = (err as Error).message ?? 'イベント一覧の取得に失敗しました'
    } finally {
      isLoading.value = false
    }
  }

  // イベント詳細取得
  async function fetchEvent(id: string): Promise<EventData | null> {
    isLoading.value = true
    error.value = null
    try {
      const data = await $fetch<{ data: EventData }>(`/api/v1/events/${id}`)
      currentEvent.value = data.data
      return data.data
    } catch (err) {
      error.value = (err as Error).message ?? 'イベントの取得に失敗しました'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // イベント作成
  async function createEvent(payload: CreateEventPayload): Promise<EventData | null> {
    isLoading.value = true
    error.value = null
    try {
      const data = await $fetch<{ data: EventData }>('/api/v1/events', {
        method: 'POST',
        body: payload,
      })
      return data.data
    } catch (err) {
      error.value = (err as Error).message ?? 'イベントの作成に失敗しました'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // イベント更新
  async function updateEvent(id: string, payload: Partial<CreateEventPayload> & { status?: EventStatus }): Promise<EventData | null> {
    isLoading.value = true
    error.value = null
    try {
      const data = await $fetch<{ data: EventData }>(`/api/v1/events/${id}`, {
        method: 'PATCH',
        body: payload,
      })
      currentEvent.value = data.data
      return data.data
    } catch (err) {
      error.value = (err as Error).message ?? 'イベントの更新に失敗しました'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // イベント削除
  async function deleteEvent(id: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      await $fetch(`/api/v1/events/${id}`, { method: 'DELETE' })
      events.value = events.value.filter(e => e.id !== id)
      return true
    } catch (err) {
      error.value = (err as Error).message ?? 'イベントの削除に失敗しました'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // AI提案生成
  async function generateAiSuggestion(params: {
    goal: string
    target_audience: string
    capacity_onsite?: number
    capacity_online?: number
    budget_min?: number
    budget_max?: number
    date_candidates: DateCandidate[]
    event_type: EventType
  }): Promise<AiSuggestion | null> {
    isLoading.value = true
    error.value = null
    try {
      const data = await $fetch<AiSuggestion>('/api/v1/events/ai/suggest', {
        method: 'POST',
        body: params,
      })
      return data
    } catch (err) {
      error.value = (err as Error).message ?? 'AI提案の生成に失敗しました'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 企画書生成
  async function generateProposal(eventId: string, options?: {
    template?: 'standard' | 'detailed'
    include_estimate?: boolean
  }): Promise<{ title: string; sections: Array<{ heading: string; content: string }>; markdown: string } | null> {
    isLoading.value = true
    error.value = null
    try {
      const data = await $fetch<{ title: string; sections: Array<{ heading: string; content: string }>; markdown: string }>('/api/v1/ai/generate/proposal', {
        method: 'POST',
        body: {
          event_id: eventId,
          template: options?.template ?? 'standard',
          include_estimate: options?.include_estimate ?? true,
        },
      })
      return data
    } catch (err) {
      error.value = (err as Error).message ?? '企画書の生成に失敗しました'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const totalEvents = computed(() => pagination.value.total)

  return {
    events,
    currentEvent,
    isLoading,
    error,
    pagination,
    totalEvents,
    fetchEvents,
    fetchEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    generateAiSuggestion,
    generateProposal,
  }
}
