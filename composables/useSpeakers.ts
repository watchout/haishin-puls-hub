// EVT-020-021: 登壇者情報管理 Composable
// 仕様書: docs/design/features/project/EVT-020-021_speaker-management.md

// ──────────────────────────────────────
// 型定義
// ──────────────────────────────────────

export type SubmissionStatus = 'pending' | 'submitted' | 'confirmed'
export type SpeakerFormat = 'onsite' | 'online'

export interface SpeakerData {
  id: string
  eventId: string
  tenantId: string
  userId: string | null
  name: string
  title: string | null
  organization: string | null
  bio: string | null
  photoUrl: string | null
  presentationTitle: string | null
  startAt: string | null
  durationMinutes: number | null
  format: string | null
  materialsUrl: string | null
  submissionStatus: SubmissionStatus
  aiGeneratedBio: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CreateSpeakerPayload {
  name?: string
  email?: string
}

export interface CreateSpeakerResult {
  id: string
  eventId: string
  name: string
  submissionStatus: SubmissionStatus
  formToken: string
  formUrl: string
  emailSent: boolean
}

export interface UpdateSpeakerPayload {
  name?: string
  title?: string
  organization?: string
  bio?: string
  photo_url?: string | null
  presentation_title?: string
  start_at?: string | null
  duration_minutes?: number | null
  format?: SpeakerFormat | null
  materials_url?: string | null
  submission_status?: SubmissionStatus
  sort_order?: number
}

export interface SpeakerFormData {
  event: {
    title: string
    startAt: string | null
    status: string
  }
  speaker: {
    id: string
    name: string
    title: string | null
    organization: string | null
    bio: string | null
    photoUrl: string | null
    presentationTitle: string | null
    startAt: string | null
    durationMinutes: number | null
    format: string | null
    submissionStatus: SubmissionStatus
  }
  formUrl: string
}

// ──────────────────────────────────────
// ラベル定数
// ──────────────────────────────────────

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  pending: '未提出',
  submitted: '提出済',
  confirmed: '確認済',
}

export const SUBMISSION_STATUS_COLORS: Record<SubmissionStatus, string> = {
  pending: 'neutral',
  submitted: 'warning',
  confirmed: 'success',
}

export const SPEAKER_FORMAT_LABELS: Record<SpeakerFormat, string> = {
  onsite: '現地登壇',
  online: 'オンライン登壇',
}

// ──────────────────────────────────────
// ヘルパー関数
// ──────────────────────────────────────

export function getSubmissionStatusLabel(status: SubmissionStatus): string {
  return SUBMISSION_STATUS_LABELS[status] ?? status
}

export function getSubmissionStatusColor(status: SubmissionStatus) {
  return (SUBMISSION_STATUS_COLORS[status] ?? 'neutral') as 'neutral' | 'warning' | 'success'
}

export function getSpeakerFormatLabel(format: string | null): string {
  if (!format) return '-'
  return SPEAKER_FORMAT_LABELS[format as SpeakerFormat] ?? format
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null) return '-'
  if (minutes < 60) return `${minutes}分`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`
}

// ──────────────────────────────────────
// useSpeakers Composable
// ──────────────────────────────────────

export function useSpeakers(eventId: string) {
  const speakers = ref<SpeakerData[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchSpeakers(filters?: { status?: string; sort?: string; order?: string }) {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<{ data: SpeakerData[] }>(`/api/v1/events/${eventId}/speakers`, {
        query: filters,
      })
      speakers.value = res.data
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? '登壇者一覧の取得に失敗しました'
    } finally {
      isLoading.value = false
    }
  }

  async function createSpeaker(payload: CreateSpeakerPayload): Promise<CreateSpeakerResult | null> {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<{ data: CreateSpeakerResult }>(`/api/v1/events/${eventId}/speakers`, {
        method: 'POST',
        body: payload,
      })
      await fetchSpeakers()
      return res.data
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? '登壇者の追加に失敗しました'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updateSpeaker(speakerId: string, payload: UpdateSpeakerPayload): Promise<SpeakerData | null> {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<{ data: SpeakerData }>(`/api/v1/speakers/${speakerId}`, {
        method: 'PATCH',
        body: payload,
      })
      await fetchSpeakers()
      return res.data
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? '登壇者情報の更新に失敗しました'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function deleteSpeaker(speakerId: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      await $fetch(`/api/v1/speakers/${speakerId}`, { method: 'DELETE' })
      await fetchSpeakers()
      return true
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? '登壇者の削除に失敗しました'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function confirmSpeaker(speakerId: string): Promise<SpeakerData | null> {
    return updateSpeaker(speakerId, { submission_status: 'confirmed' })
  }

  async function sendFormEmail(speakerId: string, email: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      await $fetch(`/api/v1/speakers/${speakerId}/send-form-email`, {
        method: 'POST',
        body: { email },
      })
      return true
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'メール送信に失敗しました'
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    speakers,
    isLoading,
    error,
    fetchSpeakers,
    createSpeaker,
    updateSpeaker,
    deleteSpeaker,
    confirmSpeaker,
    sendFormEmail,
  }
}

// ──────────────────────────────────────
// useSpeakerForm Composable (公開フォーム用)
// ──────────────────────────────────────

export function useSpeakerForm(token: string) {
  const formData = ref<SpeakerFormData | null>(null)
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const isSubmitted = ref(false)
  const error = ref<string | null>(null)
  const eventCancelled = ref(false)

  async function fetchForm() {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<{ data: SpeakerFormData }>(`/api/v1/speaker-form/${token}`)
      formData.value = res.data
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode
      if (statusCode === 410) {
        eventCancelled.value = true
        error.value = 'イベントはキャンセルされました'
      } else if (statusCode === 404) {
        error.value = 'フォームが見つかりません'
      } else {
        error.value = 'フォームの読み込みに失敗しました'
      }
    } finally {
      isLoading.value = false
    }
  }

  async function submitForm(payload: Record<string, unknown>): Promise<boolean> {
    isSubmitting.value = true
    error.value = null
    try {
      await $fetch(`/api/v1/speaker-form/${token}`, {
        method: 'POST',
        body: payload,
      })
      isSubmitted.value = true
      return true
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'フォームの送信に失敗しました'
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    formData,
    isLoading,
    isSubmitting,
    isSubmitted,
    error,
    eventCancelled,
    fetchForm,
    submitForm,
  }
}
