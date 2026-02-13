// EVT-030-031-033: 参加者管理 Composable
// 仕様書: docs/design/features/project/EVT-030-031-033_participant-portal.md

// ──────────────────────────────────────
// 型定義
// ──────────────────────────────────────

export type ParticipationType = 'onsite' | 'online'
export type RegistrationStatus = 'registered' | 'confirmed' | 'cancelled'
export type CheckinMethod = 'qr' | 'manual' | 'walk_in'

export interface ParticipantData {
  id: string
  name: string
  email: string
  organization: string | null
  participationType: ParticipationType
  registrationStatus: RegistrationStatus
  checkedIn: boolean
  checkedInAt: string | null
  checkinMethod: CheckinMethod | null
  registeredAt: string
}

export interface CheckinStats {
  total_registered: number
  checked_in: number
  not_checked_in: number
  walk_in: number
  checkin_rate: number
  by_participation_type: {
    onsite: { registered: number; checked_in: number }
    online: { registered: number; checked_in: number }
  }
  timeline: Array<{ time: string; count: number }>
}

export interface CheckinResult {
  checkin_id: string
  participant: {
    id: string
    name: string
    organization: string | null
  }
  checked_in_at: string
}

export interface WalkInResult {
  participant_id: string
  checkin_id: string
  checked_in_at: string
}

// ──────────────────────────────────────
// ラベル定数
// ──────────────────────────────────────

export const PARTICIPATION_TYPE_LABELS: Record<ParticipationType, string> = {
  onsite: '現地参加',
  online: 'オンライン参加',
}

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  registered: '申込済',
  confirmed: '確認済',
  cancelled: 'キャンセル',
}

export const REGISTRATION_STATUS_COLORS: Record<RegistrationStatus, string> = {
  registered: 'info',
  confirmed: 'success',
  cancelled: 'error',
}

export const CHECKIN_METHOD_LABELS: Record<CheckinMethod, string> = {
  qr: 'QR',
  manual: '手動',
  walk_in: '当日',
}

// ──────────────────────────────────────
// ヘルパー関数
// ──────────────────────────────────────

export function getParticipationTypeLabel(type: ParticipationType | string | null): string {
  if (!type) return '-'
  return PARTICIPATION_TYPE_LABELS[type as ParticipationType] ?? type
}

export function getRegistrationStatusLabel(status: RegistrationStatus | string): string {
  return REGISTRATION_STATUS_LABELS[status as RegistrationStatus] ?? status
}

export function getRegistrationStatusColor(status: RegistrationStatus | string) {
  return (REGISTRATION_STATUS_COLORS[status as RegistrationStatus] ?? 'neutral') as 'info' | 'success' | 'error' | 'neutral'
}

export function getCheckinMethodLabel(method: CheckinMethod | string | null): string {
  if (!method) return '-'
  return CHECKIN_METHOD_LABELS[method as CheckinMethod] ?? method
}

export function formatCheckinRate(rate: number): string {
  return `${rate.toFixed(1)}%`
}

// ──────────────────────────────────────
// useParticipants Composable（主催者用）
// ──────────────────────────────────────

export function useParticipants(eventId: string) {
  const participants = ref<ParticipantData[]>([])
  const stats = ref<CheckinStats | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchParticipants(filters?: {
    q?: string
    participation_type?: string
    registration_status?: string
    checked_in?: string
  }) {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<{
        participants: ParticipantData[]
        total: number
      }>(`/api/v1/events/${eventId}/participants`, {
        query: filters,
      })
      participants.value = res.participants
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? '参加者一覧の取得に失敗しました'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchStats(): Promise<CheckinStats | null> {
    try {
      const res = await $fetch<CheckinStats>(`/api/v1/events/${eventId}/checkins/stats`)
      stats.value = res
      return res
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? '統計の取得に失敗しました'
      return null
    }
  }

  async function checkinByQR(qrCode: string): Promise<CheckinResult | null> {
    error.value = null
    try {
      const res = await $fetch<CheckinResult>(`/api/v1/events/${eventId}/checkins/qr`, {
        method: 'POST',
        body: { qr_code: qrCode },
      })
      await fetchStats()
      return res
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode
      const data = (err as { data?: { error?: string; checked_in_at?: string; message?: string } })?.data
      if (statusCode === 409 && data?.error === 'ALREADY_CHECKED_IN') {
        error.value = `この参加者は既にチェックイン済みです（${data.checked_in_at ?? ''}）`
      } else if (statusCode === 403) {
        error.value = 'このQRコードは別のイベントのものです'
      } else {
        error.value = data?.message ?? 'チェックインに失敗しました'
      }
      return null
    }
  }

  async function checkinManual(participantId: string): Promise<CheckinResult | null> {
    error.value = null
    try {
      const res = await $fetch<CheckinResult>(`/api/v1/events/${eventId}/checkins/manual`, {
        method: 'POST',
        body: { participant_id: participantId },
      })
      await Promise.all([fetchParticipants(), fetchStats()])
      return res
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode
      if (statusCode === 409) {
        error.value = 'この参加者は既にチェックイン済みです'
      } else {
        error.value = (err as { data?: { message?: string } })?.data?.message ?? 'チェックインに失敗しました'
      }
      return null
    }
  }

  async function walkIn(payload: {
    name: string
    email: string
    organization?: string
    participation_type?: string
  }): Promise<WalkInResult | null> {
    error.value = null
    try {
      const res = await $fetch<WalkInResult>(`/api/v1/events/${eventId}/checkins/walk-in`, {
        method: 'POST',
        body: payload,
      })
      await Promise.all([fetchParticipants(), fetchStats()])
      return res
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? '当日参加者登録に失敗しました'
      return null
    }
  }

  return {
    participants,
    stats,
    isLoading,
    error,
    fetchParticipants,
    fetchStats,
    checkinByQR,
    checkinManual,
    walkIn,
  }
}

// ──────────────────────────────────────
// usePortal Composable（参加者ポータル用）
// ──────────────────────────────────────

export interface PortalEvent {
  id: string
  title: string
  description: string | null
  eventType: string
  format: string
  status: string
  startAt: string
  endAt: string
  capacityOnsite: number | null
  capacityOnline: number | null
  streamingUrl: string | null
  wifi: { ssid: string; password: string | null } | null
  venueInfo: Record<string, string> | null
  isArchived: boolean
  isCancelled: boolean
}

export interface PortalSpeaker {
  id: string
  name: string
  title: string | null
  organization: string | null
  bio: string | null
  photoUrl: string | null
  presentationTitle: string | null
  sortOrder: number
}

export interface PortalData {
  event: PortalEvent
  speakers: PortalSpeaker[]
}

export function usePortal(slug: string) {
  const portalData = ref<PortalData | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isRegistering = ref(false)
  const isRegistered = ref(false)

  async function fetchPortal() {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<PortalData>(`/api/v1/portal/${slug}`)
      portalData.value = res
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode
      if (statusCode === 404) {
        error.value = 'ポータルが見つかりません'
      } else {
        error.value = 'ポータルの読み込みに失敗しました'
      }
    } finally {
      isLoading.value = false
    }
  }

  async function register(payload: {
    name: string
    email: string
    organization?: string
    job_title?: string
    phone?: string
    participation_type: string
  }): Promise<boolean> {
    isRegistering.value = true
    error.value = null
    try {
      await $fetch(`/api/v1/portal/${slug}/register`, {
        method: 'POST',
        body: payload,
      })
      isRegistered.value = true
      return true
    } catch (err: unknown) {
      const data = (err as { data?: { message?: string } })?.data
      error.value = data?.message ?? '申込に失敗しました'
      return false
    } finally {
      isRegistering.value = false
    }
  }

  return {
    portalData,
    isLoading,
    error,
    isRegistering,
    isRegistered,
    fetchPortal,
    register,
  }
}
