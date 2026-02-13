// EVT-030-031-033 参加者バリデーション ユニットテスト
// 仕様書: docs/design/features/project/EVT-030-031-033_participant-portal.md §3-E/F/G/H
import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// ──────────────────────────────────────
// ローカル再定義（participant-validation.ts と同等ロジック）
// ──────────────────────────────────────

const PARTICIPATION_TYPES = ['onsite', 'online'] as const

const REGISTRATION_STATUSES = ['registered', 'confirmed', 'cancelled'] as const
type RegistrationStatus = typeof REGISTRATION_STATUSES[number]

const CHECKIN_METHODS = ['qr', 'manual', 'walk_in'] as const

const MAX_ANSWER_TEXT_LENGTH = 2000
const CHECKIN_CODE_LENGTH = 6
const CHECKIN_CODE_PATTERN = /^[A-Z0-9]{6}$/
const MAX_SURVEY_QUESTIONS = 50

// 参加申込スキーマ
const registerParticipantSchema = z.object({
  name: z.string().min(1, '名前は必須です').max(255, '名前は255文字以内で入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください').max(255),
  organization: z.string().max(255).optional().nullable(),
  job_title: z.string().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  participation_type: z.enum(PARTICIPATION_TYPES, {
    errorMap: () => ({ message: '参加形態は onsite または online を選択してください' }),
  }),
})

// 当日参加者登録スキーマ
const walkInRegistrationSchema = z.object({
  name: z.string().min(1, '名前は必須です').max(255),
  email: z.string().email('有効なメールアドレスを入力してください').max(255),
  organization: z.string().max(255).optional().nullable(),
  participation_type: z.enum(PARTICIPATION_TYPES).default('onsite'),
})

// QRチェックインスキーマ
const qrCheckinSchema = z.object({
  qr_code: z.string().min(1, 'QRコードは必須です'),
})

// 手動チェックインスキーマ
const manualCheckinSchema = z.object({
  participant_id: z.string().min(1, '参加者IDは必須です'),
})

// アンケート回答スキーマ
const surveyResponseSchema = z.object({
  answers: z.record(z.string(), z.union([
    z.string().max(MAX_ANSWER_TEXT_LENGTH, `回答は${MAX_ANSWER_TEXT_LENGTH}文字以内で入力してください`),
    z.array(z.string()),
    z.number(),
  ])),
})

// アンケート作成スキーマ
const createSurveySchema = z.object({
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

// ポータル設定スキーマ
const updatePortalSettingsSchema = z.object({
  portal_published: z.boolean().optional(),
  wifi_ssid: z.string().max(100).optional().nullable(),
  wifi_password: z.string().max(100).optional().nullable(),
  venue_info: z.record(z.string(), z.string().max(500)).optional().nullable(),
})

// ステータス遷移
const REGISTRATION_STATUS_TRANSITIONS: Record<RegistrationStatus, RegistrationStatus[]> = {
  registered: ['confirmed', 'cancelled'],
  confirmed: ['cancelled'],
  cancelled: ['registered'],
}

function isValidRegistrationTransition(current: RegistrationStatus, next: RegistrationStatus): boolean {
  return REGISTRATION_STATUS_TRANSITIONS[current]?.includes(next) ?? false
}

// チェックインコード生成
function generateCheckinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < CHECKIN_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function isValidCheckinCode(code: string): boolean {
  return CHECKIN_CODE_PATTERN.test(code)
}

// ──────────────────────────────────────
// テスト: registerParticipantSchema
// ──────────────────────────────────────

describe('registerParticipantSchema', () => {
  it('有効な参加申込データ（全項目入力）', () => {
    const result = registerParticipantSchema.safeParse({
      name: '鈴木花子',
      email: 'hanako@example.com',
      organization: '株式会社サンプル',
      job_title: 'エンジニア',
      phone: '090-1234-5678',
      participation_type: 'onsite',
    })
    expect(result.success).toBe(true)
  })

  it('有効な参加申込データ（必須項目のみ）', () => {
    const result = registerParticipantSchema.safeParse({
      name: '鈴木花子',
      email: 'hanako@example.com',
      participation_type: 'online',
    })
    expect(result.success).toBe(true)
  })

  it('名前が空の場合エラー', () => {
    const result = registerParticipantSchema.safeParse({
      name: '',
      email: 'hanako@example.com',
      participation_type: 'onsite',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toBeDefined()
    }
  })

  it('名前がない場合エラー', () => {
    const result = registerParticipantSchema.safeParse({
      email: 'hanako@example.com',
      participation_type: 'onsite',
    })
    expect(result.success).toBe(false)
  })

  it('§3-F: 名前255文字は通る', () => {
    const result = registerParticipantSchema.safeParse({
      name: 'あ'.repeat(255),
      email: 'test@example.com',
      participation_type: 'onsite',
    })
    expect(result.success).toBe(true)
  })

  it('§3-F: 名前256文字はエラー', () => {
    const result = registerParticipantSchema.safeParse({
      name: 'あ'.repeat(256),
      email: 'test@example.com',
      participation_type: 'onsite',
    })
    expect(result.success).toBe(false)
  })

  it('無効なメールアドレス', () => {
    const result = registerParticipantSchema.safeParse({
      name: '鈴木花子',
      email: 'not-an-email',
      participation_type: 'onsite',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined()
    }
  })

  it('メールが空の場合エラー', () => {
    const result = registerParticipantSchema.safeParse({
      name: '鈴木花子',
      email: '',
      participation_type: 'onsite',
    })
    expect(result.success).toBe(false)
  })

  it('無効なparticipation_type', () => {
    const result = registerParticipantSchema.safeParse({
      name: '鈴木花子',
      email: 'hanako@example.com',
      participation_type: 'hybrid',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.participation_type).toBeDefined()
    }
  })

  it('participation_type = onsite は通る', () => {
    const result = registerParticipantSchema.safeParse({
      name: 'Test',
      email: 'test@example.com',
      participation_type: 'onsite',
    })
    expect(result.success).toBe(true)
  })

  it('participation_type = online は通る', () => {
    const result = registerParticipantSchema.safeParse({
      name: 'Test',
      email: 'test@example.com',
      participation_type: 'online',
    })
    expect(result.success).toBe(true)
  })

  it('organization = null は通る', () => {
    const result = registerParticipantSchema.safeParse({
      name: 'Test',
      email: 'test@example.com',
      participation_type: 'onsite',
      organization: null,
    })
    expect(result.success).toBe(true)
  })

  it('organization 256文字はエラー', () => {
    const result = registerParticipantSchema.safeParse({
      name: 'Test',
      email: 'test@example.com',
      participation_type: 'onsite',
      organization: 'a'.repeat(256),
    })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────
// テスト: walkInRegistrationSchema
// ──────────────────────────────────────

describe('walkInRegistrationSchema', () => {
  it('有効な当日参加者データ', () => {
    const result = walkInRegistrationSchema.safeParse({
      name: '田中次郎',
      email: 'jiro@example.com',
      organization: 'フリーランス',
      participation_type: 'onsite',
    })
    expect(result.success).toBe(true)
  })

  it('participation_type 省略時は onsite がデフォルト', () => {
    const result = walkInRegistrationSchema.safeParse({
      name: '田中次郎',
      email: 'jiro@example.com',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.participation_type).toBe('onsite')
    }
  })

  it('名前が空の場合エラー', () => {
    const result = walkInRegistrationSchema.safeParse({
      name: '',
      email: 'jiro@example.com',
    })
    expect(result.success).toBe(false)
  })

  it('メールが無効な場合エラー', () => {
    const result = walkInRegistrationSchema.safeParse({
      name: '田中次郎',
      email: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────
// テスト: qrCheckinSchema
// ──────────────────────────────────────

describe('qrCheckinSchema', () => {
  it('有効なQRコード', () => {
    const result = qrCheckinSchema.safeParse({
      qr_code: 'eyJwYXJ0aWNpcGFudF9pZCI6InBydF9hYmMxMjMi...',
    })
    expect(result.success).toBe(true)
  })

  it('QRコードが空の場合エラー', () => {
    const result = qrCheckinSchema.safeParse({
      qr_code: '',
    })
    expect(result.success).toBe(false)
  })

  it('QRコードが未指定の場合エラー', () => {
    const result = qrCheckinSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────
// テスト: manualCheckinSchema
// ──────────────────────────────────────

describe('manualCheckinSchema', () => {
  it('有効な参加者ID', () => {
    const result = manualCheckinSchema.safeParse({
      participant_id: 'prt_abc123',
    })
    expect(result.success).toBe(true)
  })

  it('参加者IDが空の場合エラー', () => {
    const result = manualCheckinSchema.safeParse({
      participant_id: '',
    })
    expect(result.success).toBe(false)
  })

  it('参加者IDが未指定の場合エラー', () => {
    const result = manualCheckinSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────
// テスト: surveyResponseSchema
// ──────────────────────────────────────

describe('surveyResponseSchema', () => {
  it('有効な回答（テキスト）', () => {
    const result = surveyResponseSchema.safeParse({
      answers: { q1: '素晴らしいイベントでした' },
    })
    expect(result.success).toBe(true)
  })

  it('有効な回答（複数選択）', () => {
    const result = surveyResponseSchema.safeParse({
      answers: { q1: ['選択肢A', '選択肢B'] },
    })
    expect(result.success).toBe(true)
  })

  it('有効な回答（数値・評価スケール）', () => {
    const result = surveyResponseSchema.safeParse({
      answers: { q1: 5 },
    })
    expect(result.success).toBe(true)
  })

  it('§3-F: 回答テキスト2000文字は通る', () => {
    const result = surveyResponseSchema.safeParse({
      answers: { q1: 'あ'.repeat(2000) },
    })
    expect(result.success).toBe(true)
  })

  it('§3-F: 回答テキスト2001文字はエラー', () => {
    const result = surveyResponseSchema.safeParse({
      answers: { q1: 'あ'.repeat(2001) },
    })
    expect(result.success).toBe(false)
  })

  it('空の回答オブジェクトは通る', () => {
    const result = surveyResponseSchema.safeParse({
      answers: {},
    })
    expect(result.success).toBe(true)
  })

  it('複合回答（テキスト+選択+数値）', () => {
    const result = surveyResponseSchema.safeParse({
      answers: {
        q1: '感想テキスト',
        q2: ['A', 'B'],
        q3: 4,
      },
    })
    expect(result.success).toBe(true)
  })
})

// ──────────────────────────────────────
// テスト: createSurveySchema
// ──────────────────────────────────────

describe('createSurveySchema', () => {
  it('有効なアンケートデータ', () => {
    const result = createSurveySchema.safeParse({
      title: 'イベントアンケート',
      questions: [
        { id: 'q1', type: 'single_choice', text: '満足度は?', options: ['良い', '普通', '悪い'], required: true },
        { id: 'q2', type: 'free_text', text: '感想をお聞かせください', required: false },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('タイトルが空の場合エラー', () => {
    const result = createSurveySchema.safeParse({
      title: '',
      questions: [{ id: 'q1', type: 'free_text', text: 'テスト' }],
    })
    expect(result.success).toBe(false)
  })

  it('設問が0問の場合エラー', () => {
    const result = createSurveySchema.safeParse({
      title: 'テスト',
      questions: [],
    })
    expect(result.success).toBe(false)
  })

  it('§3-F: 設問数50問は通る', () => {
    const questions = Array.from({ length: 50 }, (_, i) => ({
      id: `q${i}`,
      type: 'free_text' as const,
      text: `設問${i}`,
    }))
    const result = createSurveySchema.safeParse({
      title: 'テスト',
      questions,
    })
    expect(result.success).toBe(true)
  })

  it('§3-F: 設問数51問はエラー', () => {
    const questions = Array.from({ length: 51 }, (_, i) => ({
      id: `q${i}`,
      type: 'free_text' as const,
      text: `設問${i}`,
    }))
    const result = createSurveySchema.safeParse({
      title: 'テスト',
      questions,
    })
    expect(result.success).toBe(false)
  })

  it('無効な設問タイプ', () => {
    const result = createSurveySchema.safeParse({
      title: 'テスト',
      questions: [{ id: 'q1', type: 'invalid_type', text: 'テスト' }],
    })
    expect(result.success).toBe(false)
  })

  it('is_active のデフォルトは true', () => {
    const result = createSurveySchema.safeParse({
      title: 'テスト',
      questions: [{ id: 'q1', type: 'free_text', text: 'テスト' }],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_active).toBe(true)
    }
  })

  it('全設問タイプが通る', () => {
    const types = ['single_choice', 'multiple_choice', 'free_text', 'rating'] as const
    for (const type of types) {
      const result = createSurveySchema.safeParse({
        title: 'テスト',
        questions: [{ id: 'q1', type, text: 'テスト' }],
      })
      expect(result.success).toBe(true)
    }
  })
})

// ──────────────────────────────────────
// テスト: updatePortalSettingsSchema
// ──────────────────────────────────────

describe('updatePortalSettingsSchema', () => {
  it('ポータル公開設定', () => {
    const result = updatePortalSettingsSchema.safeParse({
      portal_published: true,
    })
    expect(result.success).toBe(true)
  })

  it('Wi-Fi情報設定', () => {
    const result = updatePortalSettingsSchema.safeParse({
      wifi_ssid: 'TechSummit2026',
      wifi_password: 'summit2026!',
    })
    expect(result.success).toBe(true)
  })

  it('会場案内情報設定', () => {
    const result = updatePortalSettingsSchema.safeParse({
      venue_info: {
        parking: '地下駐車場あり',
        restrooms: '2F・3F',
        smoking_area: '1F屋外',
      },
    })
    expect(result.success).toBe(true)
  })

  it('空のオブジェクトは通る', () => {
    const result = updatePortalSettingsSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('wifi_ssid 101文字はエラー', () => {
    const result = updatePortalSettingsSchema.safeParse({
      wifi_ssid: 'a'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('wifi_ssid = null は通る', () => {
    const result = updatePortalSettingsSchema.safeParse({
      wifi_ssid: null,
    })
    expect(result.success).toBe(true)
  })

  it('venue_info の値が500文字を超えるとエラー', () => {
    const result = updatePortalSettingsSchema.safeParse({
      venue_info: { parking: 'a'.repeat(501) },
    })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────
// テスト: ステータス遷移
// ──────────────────────────────────────

describe('isValidRegistrationTransition', () => {
  it('registered → confirmed は有効', () => {
    expect(isValidRegistrationTransition('registered', 'confirmed')).toBe(true)
  })

  it('registered → cancelled は有効', () => {
    expect(isValidRegistrationTransition('registered', 'cancelled')).toBe(true)
  })

  it('confirmed → cancelled は有効', () => {
    expect(isValidRegistrationTransition('confirmed', 'cancelled')).toBe(true)
  })

  it('cancelled → registered は有効（再登録）', () => {
    expect(isValidRegistrationTransition('cancelled', 'registered')).toBe(true)
  })

  it('confirmed → registered は無効', () => {
    expect(isValidRegistrationTransition('confirmed', 'registered')).toBe(false)
  })

  it('cancelled → confirmed は無効', () => {
    expect(isValidRegistrationTransition('cancelled', 'confirmed')).toBe(false)
  })

  it('同じステータスへの遷移は無効', () => {
    expect(isValidRegistrationTransition('registered', 'registered')).toBe(false)
    expect(isValidRegistrationTransition('confirmed', 'confirmed')).toBe(false)
    expect(isValidRegistrationTransition('cancelled', 'cancelled')).toBe(false)
  })
})

// ──────────────────────────────────────
// テスト: チェックインコード
// ──────────────────────────────────────

describe('generateCheckinCode', () => {
  it('§3-F: 6文字のコードを生成する', () => {
    const code = generateCheckinCode()
    expect(code).toHaveLength(6)
  })

  it('英数大文字のみで構成される', () => {
    const code = generateCheckinCode()
    expect(CHECKIN_CODE_PATTERN.test(code)).toBe(true)
  })

  it('複数回生成すると異なるコードが返る（確率的テスト）', () => {
    const codes = new Set<string>()
    for (let i = 0; i < 100; i++) {
      codes.add(generateCheckinCode())
    }
    // 100回で全て同じになる確率はほぼゼロ
    expect(codes.size).toBeGreaterThan(50)
  })
})

describe('isValidCheckinCode', () => {
  it('有効なコード: ABC123', () => {
    expect(isValidCheckinCode('ABC123')).toBe(true)
  })

  it('有効なコード: ZZZZZZ', () => {
    expect(isValidCheckinCode('ZZZZZZ')).toBe(true)
  })

  it('有効なコード: 000000', () => {
    expect(isValidCheckinCode('000000')).toBe(true)
  })

  it('無効: 小文字を含む', () => {
    expect(isValidCheckinCode('abc123')).toBe(false)
  })

  it('無効: 5文字（短い）', () => {
    expect(isValidCheckinCode('ABCDE')).toBe(false)
  })

  it('無効: 7文字（長い）', () => {
    expect(isValidCheckinCode('ABCDEFG')).toBe(false)
  })

  it('無効: 空文字', () => {
    expect(isValidCheckinCode('')).toBe(false)
  })

  it('無効: 特殊文字を含む', () => {
    expect(isValidCheckinCode('ABC-23')).toBe(false)
  })
})

// ──────────────────────────────────────
// テスト: 定数定義
// ──────────────────────────────────────

describe('定数定義', () => {
  it('PARTICIPATION_TYPES に2種類ある', () => {
    expect(PARTICIPATION_TYPES).toContain('onsite')
    expect(PARTICIPATION_TYPES).toContain('online')
    expect(PARTICIPATION_TYPES).toHaveLength(2)
  })

  it('REGISTRATION_STATUSES に3種類ある', () => {
    expect(REGISTRATION_STATUSES).toContain('registered')
    expect(REGISTRATION_STATUSES).toContain('confirmed')
    expect(REGISTRATION_STATUSES).toContain('cancelled')
    expect(REGISTRATION_STATUSES).toHaveLength(3)
  })

  it('CHECKIN_METHODS に3種類ある', () => {
    expect(CHECKIN_METHODS).toContain('qr')
    expect(CHECKIN_METHODS).toContain('manual')
    expect(CHECKIN_METHODS).toContain('walk_in')
    expect(CHECKIN_METHODS).toHaveLength(3)
  })

  it('§3-F: MAX_ANSWER_TEXT_LENGTH = 2000', () => {
    expect(MAX_ANSWER_TEXT_LENGTH).toBe(2000)
  })

  it('§3-F: CHECKIN_CODE_LENGTH = 6', () => {
    expect(CHECKIN_CODE_LENGTH).toBe(6)
  })

  it('§3-F: MAX_SURVEY_QUESTIONS = 50', () => {
    expect(MAX_SURVEY_QUESTIONS).toBe(50)
  })
})
