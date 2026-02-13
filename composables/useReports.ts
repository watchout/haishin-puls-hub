// EVT-040: サマリーレポート管理 Composable
// 仕様書: docs/design/features/project/EVT-040_summary-report.md

// ──────────────────────────────────────
// 型定義
// ──────────────────────────────────────

export type ReportType = 'summary' | 'proposal' | 'follow_up'
export type ReportStatus = 'draft' | 'published'
export type ReportGeneratedBy = 'ai' | 'manual'

export interface ReportMetadata {
  participantCount?: {
    onsite: number
    online: number
    total: number
  }
  checkinRate?: {
    onsite: number
    online: number
    total: number
  }
  surveyStats?: {
    avgSatisfaction: number
    nps: number
    responseCount: number
  }
  questionStats?: {
    totalQuestions: number
    answeredQuestions: number
    topCategories: string[]
  }
  generationTime?: number
  version?: string
}

export interface ReportSummary {
  id: string
  eventId: string
  reportType: ReportType
  status: ReportStatus
  generatedBy: ReportGeneratedBy
  metadata: ReportMetadata | null
  createdAt: string
  updatedAt: string
}

export interface ReportDetail extends ReportSummary {
  tenantId: string
  content: string
}

// ──────────────────────────────────────
// ラベル定数
// ──────────────────────────────────────

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  summary: 'サマリーレポート',
  proposal: '提案レポート',
  follow_up: 'フォローアップ',
}

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  draft: '下書き',
  published: '公開済み',
}

export const REPORT_STATUS_COLORS: Record<ReportStatus, string> = {
  draft: 'warning',
  published: 'success',
}

export const REPORT_GENERATED_BY_LABELS: Record<ReportGeneratedBy, string> = {
  ai: 'AI生成',
  manual: '手動作成',
}

// ──────────────────────────────────────
// ヘルパー関数
// ──────────────────────────────────────

export function getReportTypeLabel(type: ReportType | string): string {
  return REPORT_TYPE_LABELS[type as ReportType] ?? type
}

export function getReportStatusLabel(status: ReportStatus | string): string {
  return REPORT_STATUS_LABELS[status as ReportStatus] ?? status
}

export function getReportStatusColor(status: ReportStatus | string) {
  return (REPORT_STATUS_COLORS[status as ReportStatus] ?? 'neutral') as 'warning' | 'success' | 'neutral'
}

export function getGeneratedByLabel(generatedBy: ReportGeneratedBy | string): string {
  return REPORT_GENERATED_BY_LABELS[generatedBy as ReportGeneratedBy] ?? generatedBy
}

export function formatParticipantCount(metadata: ReportMetadata | null): string {
  if (!metadata?.participantCount) return '―'
  const { onsite, online, total } = metadata.participantCount
  return `${total}名（現地${onsite} / オンライン${online}）`
}

export function formatCheckinRate(metadata: ReportMetadata | null): string {
  if (!metadata?.checkinRate) return '―'
  return `${(metadata.checkinRate.total * 100).toFixed(1)}%`
}

export function formatSatisfaction(metadata: ReportMetadata | null): string {
  if (!metadata?.surveyStats || metadata.surveyStats.avgSatisfaction === 0) return '―'
  return `${metadata.surveyStats.avgSatisfaction.toFixed(1)} / 5.0`
}

export function formatNps(metadata: ReportMetadata | null): string {
  if (!metadata?.surveyStats) return '―'
  return String(metadata.surveyStats.nps)
}

// ──────────────────────────────────────
// useReports Composable
// ──────────────────────────────────────

export function useReports(eventId: string) {
  const reports = ref<ReportSummary[]>([])
  const isLoading = ref(false)
  const isGenerating = ref(false)
  const error = ref<string | null>(null)

  async function fetchReports() {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<{ reports: ReportSummary[] }>(
        `/api/v1/events/${eventId}/reports`,
      )
      reports.value = res.reports
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'レポート一覧の取得に失敗しました'
    } finally {
      isLoading.value = false
    }
  }

  async function generateReport(reportType: ReportType = 'summary'): Promise<boolean> {
    isGenerating.value = true
    error.value = null
    try {
      await $fetch(`/api/v1/events/${eventId}/reports/generate`, {
        method: 'POST',
        body: { reportType },
      })
      await fetchReports()
      return true
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode
      const data = (err as { data?: { message?: string; statusMessage?: string } })?.data
      if (statusCode === 400 && data?.statusMessage === 'EVENT_NOT_COMPLETED') {
        error.value = 'イベントが完了していないため、レポートを生成できません'
      } else if (statusCode === 409) {
        error.value = 'このイベントのレポートは既に生成されています'
      } else {
        error.value = data?.message ?? 'レポート生成に失敗しました'
      }
      return false
    } finally {
      isGenerating.value = false
    }
  }

  return {
    reports,
    isLoading,
    isGenerating,
    error,
    fetchReports,
    generateReport,
  }
}

// ──────────────────────────────────────
// useReportDetail Composable
// ──────────────────────────────────────

export function useReportDetail(reportId: string) {
  const report = ref<ReportDetail | null>(null)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const isSharing = ref(false)
  const error = ref<string | null>(null)

  async function fetchReport() {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<ReportDetail>(`/api/v1/reports/${reportId}`)
      report.value = res
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode
      if (statusCode === 404) {
        error.value = 'レポートが見つかりません'
      } else {
        error.value = (err as { data?: { message?: string } })?.data?.message ?? 'レポートの取得に失敗しました'
      }
    } finally {
      isLoading.value = false
    }
  }

  async function updateReport(data: {
    content?: string
    status?: ReportStatus
    metadata?: Record<string, unknown>
  }): Promise<boolean> {
    isSaving.value = true
    error.value = null
    try {
      const res = await $fetch<{ id: string; content: string; status: string; updatedAt: string }>(
        `/api/v1/reports/${reportId}`,
        { method: 'PATCH', body: data },
      )
      if (report.value) {
        report.value.content = res.content
        report.value.status = res.status as ReportStatus
        report.value.updatedAt = res.updatedAt
      }
      return true
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode
      if (statusCode === 403) {
        error.value = '公開済みのレポートは編集できません'
      } else {
        error.value = (err as { data?: { message?: string } })?.data?.message ?? '更新に失敗しました'
      }
      return false
    } finally {
      isSaving.value = false
    }
  }

  async function publishReport(): Promise<boolean> {
    return updateReport({ status: 'published' })
  }

  async function shareReport(payload: {
    to: string[]
    message?: string
    attachPdf: boolean
  }): Promise<boolean> {
    isSharing.value = true
    error.value = null
    try {
      await $fetch(`/api/v1/reports/${reportId}/share`, {
        method: 'POST',
        body: payload,
      })
      return true
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'メール共有に失敗しました'
      return false
    } finally {
      isSharing.value = false
    }
  }

  async function sendProposal(payload: {
    to: string[]
    proposalContent: string
  }): Promise<boolean> {
    isSharing.value = true
    error.value = null
    try {
      await $fetch(`/api/v1/reports/${reportId}/send-proposal`, {
        method: 'POST',
        body: payload,
      })
      return true
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? '提案送信に失敗しました'
      return false
    } finally {
      isSharing.value = false
    }
  }

  return {
    report,
    isLoading,
    isSaving,
    isSharing,
    error,
    fetchReport,
    updateReport,
    publishReport,
    shareReport,
    sendProposal,
  }
}
