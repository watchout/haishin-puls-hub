// EVT-030-031-033: 参加者ポータル & チェックイン バリデーション
// 仕様書: docs/design/features/project/EVT-030-031-033_participant-portal.md

import { z } from 'zod'

// ──────────────────────────────────────
// 定数定義
// ──────────────────────────────────────

export const PARTICIPATION_TYPES = ['onsite', 'online'] as const
export type ParticipationType = typeof PARTICIPATION_TYPES[number]

export const REGISTRATION_STATUSES = ['registered', 'confirmed', 'cancelled'] as const
export type RegistrationStatus = typeof REGISTRATION_STATUSES[number]

export const CHECKIN_METHODS = ['qr', 'manual', 'walk_in'] as const
export type CheckinMethod = typeof CHECKIN_METHODS[number]

/** §3-F: 回答テキスト最大 2,000 文字 */
export const MAX_ANSWER_TEXT_LENGTH = 2000

/** §3-F: チェックインコード 6文字固定（英数大文字） */
export const CHECKIN_CODE_LENGTH = 6
export const CHECKIN_CODE_PATTERN = /^[A-Z0-9]{6}$/

/** §3-F: アンケート設問数 最大 50問 */
export const MAX_SURVEY_QUESTIONS = 50

/** §3-F: ファイルサイズ 最大 50MB */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

// ──────────────────────────────────────
// 参加者バリデーション
// ──────────────────────────────────────

/** ポータル参加申込 (POST /api/v1/portal/:slug/register) */
export const registerParticipantSchema = z.object({
  name: z.string().min(1, '名前は必須です').max(255, '名前は255文字以内で入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください').max(255),
  organization: z.string().max(255).optional().nullable(),
  job_title: z.string().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  participation_type: z.enum(PARTICIPATION_TYPES, {
    errorMap: () => ({ message: '参加形態は onsite または online を選択してください' }),
  }),
})

/** 当日参加者登録 (POST /api/v1/events/:eid/checkins/walk-in) */
export const walkInRegistrationSchema = z.object({
  name: z.string().min(1, '名前は必須です').max(255),
  email: z.string().email('有効なメールアドレスを入力してください').max(255),
  organization: z.string().max(255).optional().nullable(),
  participation_type: z.enum(PARTICIPATION_TYPES).default('onsite'),
})

// ──────────────────────────────────────
// チェックインバリデーション
// ──────────────────────────────────────

/** QRチェックイン (POST /api/v1/events/:eid/checkins/qr) */
export const qrCheckinSchema = z.object({
  qr_code: z.string().min(1, 'QRコードは必須です'),
})

/** 手動チェックイン (POST /api/v1/events/:eid/checkins/manual) */
export const manualCheckinSchema = z.object({
  participant_id: z.string().min(1, '参加者IDは必須です'),
})

// ──────────────────────────────────────
// アンケートバリデーション
// ──────────────────────────────────────

/** アンケート回答 (POST /api/v1/portal/surveys/:id/responses) */
export const surveyResponseSchema = z.object({
  answers: z.record(z.string(), z.union([
    z.string().max(MAX_ANSWER_TEXT_LENGTH, `回答は${MAX_ANSWER_TEXT_LENGTH}文字以内で入力してください`),
    z.array(z.string()),
    z.number(),
  ])),
})

/** アンケート作成 (主催者用) */
export const createSurveySchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(500),
  questions: z.array(z.object({
    id: z.string(),
    type: z.enum(['single_choice', 'multiple_choice', 'free_text', 'rating']),
    text: z.string().min(1).max(500),
    options: z.array(z.string().max(200)).optional(),
    required: z.boolean().default(false),
  })).min(1, '最低1問の設問が必要です').max(MAX_SURVEY_QUESTIONS, `設問数は${MAX_SURVEY_QUESTIONS}問以内にしてください`),
  is_active: z.boolean().default(true),
})

// ──────────────────────────────────────
// ポータル設定バリデーション
// ──────────────────────────────────────

/** ポータル公開設定 */
export const updatePortalSettingsSchema = z.object({
  portal_published: z.boolean().optional(),
  wifi_ssid: z.string().max(100).optional().nullable(),
  wifi_password: z.string().max(100).optional().nullable(),
  venue_info: z.record(z.string(), z.string().max(500)).optional().nullable(),
})

// ──────────────────────────────────────
// ステータス遷移ルール
// ──────────────────────────────────────

export const REGISTRATION_STATUS_TRANSITIONS: Record<RegistrationStatus, RegistrationStatus[]> = {
  registered: ['confirmed', 'cancelled'],
  confirmed: ['cancelled'],
  cancelled: ['registered'],
}

export function isValidRegistrationTransition(
  current: RegistrationStatus,
  next: RegistrationStatus,
): boolean {
  return REGISTRATION_STATUS_TRANSITIONS[current]?.includes(next) ?? false
}

// ──────────────────────────────────────
// QRコードユーティリティ
// ──────────────────────────────────────

export interface QRPayload {
  participant_id: string
  event_id: string
  timestamp: number
}

/**
 * チェックインコード生成（6文字英数大文字）
 * QR読取不可時のフォールバック用
 */
export function generateCheckinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < CHECKIN_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * チェックインコードのバリデーション
 */
export function isValidCheckinCode(code: string): boolean {
  return CHECKIN_CODE_PATTERN.test(code)
}
