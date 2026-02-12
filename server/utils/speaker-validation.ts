// EVT-020-021: 登壇者情報管理 バリデーションスキーマ
// 仕様書: docs/design/features/project/EVT-020-021_speaker-management.md §3-F
import { z } from 'zod'

// ──────────────────────────────────────
// 定数定義
// ──────────────────────────────────────

export const SUBMISSION_STATUSES = ['pending', 'submitted', 'confirmed'] as const
export type SubmissionStatus = typeof SUBMISSION_STATUSES[number]

export const SPEAKER_FORMATS = ['onsite', 'online'] as const
export type SpeakerFormat = typeof SPEAKER_FORMATS[number]

export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png'] as const
export const MATERIALS_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
] as const

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const DURATION_MIN = 1
export const DURATION_MAX = 240

// ──────────────────────────────────────
// 登壇者バリデーション (§3-F)
// ──────────────────────────────────────

/** 登壇者追加スキーマ (§6.3 POST /events/:eid/speakers) */
export const createSpeakerSchema = z.object({
  name: z.string().max(100, '氏名は100文字以内で入力してください').optional(),
  email: z.string().email('メールアドレスの形式が正しくありません').optional(),
})

/** 登壇者更新スキーマ (§6.4 PATCH /speakers/:id) */
export const updateSpeakerSchema = z.object({
  name: z.string().min(1, '氏名を入力してください').max(100, '氏名は100文字以内で入力してください').optional(),
  title: z.string().max(100, '肩書きは100文字以内で入力してください').optional(),
  organization: z.string().max(100, '所属は100文字以内で入力してください').optional(),
  bio: z.string().max(2000, 'プロフィールは2000文字以内で入力してください').optional(),
  photo_url: z.string().url('URLの形式が正しくありません').optional().nullable(),
  presentation_title: z.string().max(500, '登壇タイトルは500文字以内で入力してください').optional(),
  start_at: z.string().datetime().optional().nullable(),
  duration_minutes: z.number().int().min(DURATION_MIN, `持ち時間は${DURATION_MIN}分以上です`).max(DURATION_MAX, `持ち時間は${DURATION_MAX}分以下です`).optional().nullable(),
  format: z.enum(SPEAKER_FORMATS).optional().nullable(),
  materials_url: z.string().url('URLの形式が正しくありません').optional().nullable(),
  submission_status: z.enum(SUBMISSION_STATUSES).optional(),
  sort_order: z.number().int().min(0).optional(),
})

/** 公開フォーム送信スキーマ (§6.8 POST /speaker-form/:token) */
export const speakerFormSubmitSchema = z.object({
  name: z.string().min(1, '氏名を入力してください').max(100, '氏名は100文字以内で入力してください'),
  title: z.string().max(100, '肩書きは100文字以内で入力してください').optional(),
  organization: z.string().max(100, '所属は100文字以内で入力してください').optional(),
  bio: z.string().max(2000, 'プロフィールは2000文字以内で入力してください').optional(),
  presentation_title: z.string().max(500, '登壇タイトルは500文字以内で入力してください').optional(),
  start_at: z.string().datetime().optional(),
  duration_minutes: z.number().int().min(DURATION_MIN).max(DURATION_MAX).optional(),
  format: z.enum(SPEAKER_FORMATS).optional(),
})

/** メール送信スキーマ (§6.6 POST /speakers/:id/send-form-email) */
export const sendFormEmailSchema = z.object({
  email: z.string().min(1, 'メールアドレスを入力してください').email('メールアドレスの形式が正しくありません'),
})

// ──────────────────────────────────────
// ステータス遷移チェック
// ──────────────────────────────────────

/** 有効なステータス遷移マップ (§5.2) */
export const SUBMISSION_STATUS_TRANSITIONS: Record<SubmissionStatus, SubmissionStatus[]> = {
  pending: ['submitted'],        // フォーム送信
  submitted: ['confirmed', 'pending'], // 承認 or 差し戻し
  confirmed: [],                 // 最終状態（主催者が編集は可だがステータスは変わらない）
}

/** ステータス遷移チェック */
export function isValidSubmissionTransition(from: SubmissionStatus, to: SubmissionStatus): boolean {
  if (from === to) return true
  return SUBMISSION_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

// ──────────────────────────────────────
// ファイルバリデーション (§3-F)
// ──────────────────────────────────────

/** 顔写真バリデーション */
export function validatePhotoFile(mimeType: string, size: number): { valid: boolean; error?: string } {
  if (!(PHOTO_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return { valid: false, error: '対応していない形式です（JPG, PNGのみ）' }
  }
  if (size > MAX_FILE_SIZE) {
    return { valid: false, error: 'ファイルサイズは50MB以下にしてください' }
  }
  return { valid: true }
}

/** 資料ファイルバリデーション */
export function validateMaterialsFile(mimeType: string, size: number): { valid: boolean; error?: string } {
  if (!(MATERIALS_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return { valid: false, error: '対応していない形式です（PDF, PPT, PPTX, JPG, PNGのみ）' }
  }
  if (size > MAX_FILE_SIZE) {
    return { valid: false, error: 'ファイルサイズは50MB以下にしてください' }
  }
  return { valid: true }
}
