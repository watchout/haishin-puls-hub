// EVT-040: イベントサマリーレポート バリデーションスキーマ
// 仕様書: docs/design/features/project/EVT-040_summary-report.md §3-F

import { z } from 'zod'

// ──────────────────────────────────────
// 定数（§3-F 境界値）
// ──────────────────────────────────────

export const REPORT_TYPES = ['summary', 'proposal', 'follow_up'] as const
export const REPORT_STATUSES = ['draft', 'published'] as const
export const REPORT_GENERATED_BY = ['ai', 'manual'] as const

export const MAX_REPORT_TITLE_LENGTH = 200
export const MAX_REPORT_CONTENT_LENGTH = 100_000
export const MAX_EDIT_COMMENT_LENGTH = 5_000
export const MAX_SHARE_MESSAGE_LENGTH = 1_000
export const MAX_SHARE_RECIPIENTS = 10
export const MAX_PROPOSAL_CONTENT_LENGTH = 10_000
export const MAX_SATISFACTION_SCORE = 5.0
export const MIN_SATISFACTION_SCORE = 1.0
export const MAX_NPS = 100
export const MIN_NPS = -100
export const MAX_PDF_FILE_SIZE_MB = 10

// ──────────────────────────────────────
// レポート生成スキーマ（FR-040-01, §5 POST /api/v1/events/:eid/reports/generate）
// ──────────────────────────────────────

export const generateReportSchema = z.object({
  reportType: z.enum(REPORT_TYPES).default('summary'),
})

// ──────────────────────────────────────
// レポート編集スキーマ（FR-040-05, §5 PATCH /api/v1/reports/:id）
// ──────────────────────────────────────

export const updateReportSchema = z.object({
  content: z
    .string()
    .min(1, 'レポート本文は必須です')
    .max(MAX_REPORT_CONTENT_LENGTH, `レポート本文は${MAX_REPORT_CONTENT_LENGTH.toLocaleString()}文字以内です`)
    .optional(),
  status: z.enum(REPORT_STATUSES).optional(),
  metadata: z.record(z.unknown()).optional(),
})

// ──────────────────────────────────────
// メール共有スキーマ（FR-040-07, §5 POST /api/v1/reports/:id/share）
// ──────────────────────────────────────

export const shareReportSchema = z.object({
  to: z
    .array(z.string().email('有効なメールアドレスを入力してください'))
    .min(1, '宛先を1件以上指定してください')
    .max(MAX_SHARE_RECIPIENTS, `宛先は${MAX_SHARE_RECIPIENTS}件以内です`),
  message: z
    .string()
    .max(MAX_SHARE_MESSAGE_LENGTH, `メッセージは${MAX_SHARE_MESSAGE_LENGTH}文字以内です`)
    .optional(),
  attachPdf: z.boolean(),
})

// ──────────────────────────────────────
// 次回提案送信スキーマ（FR-040-08, §5 POST /api/v1/reports/:id/send-proposal）
// ──────────────────────────────────────

export const sendProposalSchema = z.object({
  to: z
    .array(z.string().email('有効なメールアドレスを入力してください'))
    .min(1, '宛先を1件以上指定してください')
    .max(MAX_SHARE_RECIPIENTS, `宛先は${MAX_SHARE_RECIPIENTS}件以内です`),
  proposalContent: z
    .string()
    .min(1, '提案内容は必須です')
    .max(MAX_PROPOSAL_CONTENT_LENGTH, `提案内容は${MAX_PROPOSAL_CONTENT_LENGTH.toLocaleString()}文字以内です`),
})

// ──────────────────────────────────────
// metadata バリデーション（§4 metadata JSONB スキーマ）
// ──────────────────────────────────────

export const reportMetadataSchema = z.object({
  participantCount: z.object({
    onsite: z.number().int().min(0),
    online: z.number().int().min(0),
    total: z.number().int().min(0),
  }).optional(),
  checkinRate: z.object({
    onsite: z.number().min(0).max(1),
    online: z.number().min(0).max(1),
    total: z.number().min(0).max(1),
  }).optional(),
  surveyStats: z.object({
    avgSatisfaction: z.number().min(MIN_SATISFACTION_SCORE).max(MAX_SATISFACTION_SCORE),
    nps: z.number().int().min(MIN_NPS).max(MAX_NPS),
    responseCount: z.number().int().min(0),
  }).optional(),
  questionStats: z.object({
    totalQuestions: z.number().int().min(0),
    answeredQuestions: z.number().int().min(0),
    topCategories: z.array(z.string()),
  }).optional(),
  generationTime: z.number().min(0).optional(),
  version: z.string().optional(),
}).partial()

// ──────────────────────────────────────
// ステータス遷移ルール（BR-040-04）
// ──────────────────────────────────────

/**
 * draft → published: 可能
 * published → draft: 不可（不可逆）
 */
export const REPORT_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['published'],
  published: [],
}

export function isValidStatusTransition(from: string, to: string): boolean {
  const allowed = REPORT_STATUS_TRANSITIONS[from]
  if (!allowed) return false
  return allowed.includes(to)
}

// ──────────────────────────────────────
// レポート生成権限チェック用ロール一覧（§1 対象ロール）
// ──────────────────────────────────────

/** 生成・編集・共有可能なロール */
export const REPORT_EDITOR_ROLES = ['system_admin', 'tenant_admin', 'organizer', 'sales_marketing', 'venue_staff'] as const

/** 次回提案送信可能なロール */
export const PROPOSAL_SENDER_ROLES = ['system_admin', 'tenant_admin', 'venue_staff'] as const

export function canGenerateReport(role: string): boolean {
  return (REPORT_EDITOR_ROLES as readonly string[]).includes(role)
}

export function canEditReport(role: string): boolean {
  return (REPORT_EDITOR_ROLES as readonly string[]).includes(role)
}

export function canSendProposal(role: string): boolean {
  return (PROPOSAL_SENDER_ROLES as readonly string[]).includes(role)
}
