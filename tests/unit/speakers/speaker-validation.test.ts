// EVT-020-021 登壇者バリデーション ユニットテスト
// 仕様書: docs/design/features/project/EVT-020-021_speaker-management.md §3-F
import { describe, it, expect } from 'vitest'
import {
  createSpeakerSchema,
  updateSpeakerSchema,
  speakerFormSubmitSchema,
  sendFormEmailSchema,
  SUBMISSION_STATUSES,
  SPEAKER_FORMATS,
  PHOTO_MIME_TYPES,
  MATERIALS_MIME_TYPES,
  MAX_FILE_SIZE,
  DURATION_MIN,
  DURATION_MAX,
  isValidSubmissionTransition,
  SUBMISSION_STATUS_TRANSITIONS,
  validatePhotoFile,
  validateMaterialsFile,
} from '~/server/utils/speaker-validation'

// ──────────────────────────────────────
// 定数テスト
// ──────────────────────────────────────
describe('定数定義', () => {
  it('SUBMISSION_STATUSES は3種類', () => {
    expect(SUBMISSION_STATUSES).toEqual(['pending', 'submitted', 'confirmed'])
  })

  it('SPEAKER_FORMATS は2種類', () => {
    expect(SPEAKER_FORMATS).toEqual(['onsite', 'online'])
  })

  it('PHOTO_MIME_TYPES はJPGとPNG', () => {
    expect(PHOTO_MIME_TYPES).toEqual(['image/jpeg', 'image/png'])
  })

  it('MATERIALS_MIME_TYPES は5種類', () => {
    expect(MATERIALS_MIME_TYPES).toHaveLength(5)
    expect(MATERIALS_MIME_TYPES).toContain('application/pdf')
    expect(MATERIALS_MIME_TYPES).toContain('image/jpeg')
  })

  it('MAX_FILE_SIZE は50MB', () => {
    expect(MAX_FILE_SIZE).toBe(50 * 1024 * 1024)
  })

  it('DURATION の範囲は 1〜240', () => {
    expect(DURATION_MIN).toBe(1)
    expect(DURATION_MAX).toBe(240)
  })
})

// ──────────────────────────────────────
// createSpeakerSchema テスト
// ──────────────────────────────────────
describe('createSpeakerSchema', () => {
  it('空オブジェクトで成功（全フィールドオプショナル）', () => {
    const result = createSpeakerSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('name のみで成功', () => {
    const result = createSpeakerSchema.safeParse({ name: '山田太郎' })
    expect(result.success).toBe(true)
  })

  it('email のみで成功', () => {
    const result = createSpeakerSchema.safeParse({ email: 'test@example.com' })
    expect(result.success).toBe(true)
  })

  it('name + email で成功', () => {
    const result = createSpeakerSchema.safeParse({ name: '山田太郎', email: 'yamada@example.com' })
    expect(result.success).toBe(true)
  })

  describe('§3-F 境界値: name', () => {
    it('100文字で成功', () => {
      const result = createSpeakerSchema.safeParse({ name: 'あ'.repeat(100) })
      expect(result.success).toBe(true)
    })

    it('101文字でエラー', () => {
      const result = createSpeakerSchema.safeParse({ name: 'あ'.repeat(101) })
      expect(result.success).toBe(false)
    })
  })

  describe('§3-F 境界値: email', () => {
    it('有効なメールアドレスで成功', () => {
      const result = createSpeakerSchema.safeParse({ email: 'test@example.com' })
      expect(result.success).toBe(true)
    })

    it('不正なメールアドレスでエラー', () => {
      const result = createSpeakerSchema.safeParse({ email: 'not-an-email' })
      expect(result.success).toBe(false)
    })
  })
})

// ──────────────────────────────────────
// updateSpeakerSchema テスト
// ──────────────────────────────────────
describe('updateSpeakerSchema', () => {
  it('空オブジェクトで成功', () => {
    const result = updateSpeakerSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('name のみ更新で成功', () => {
    const result = updateSpeakerSchema.safeParse({ name: '更新名' })
    expect(result.success).toBe(true)
  })

  describe('§3-F 境界値: name', () => {
    it('1文字で成功', () => {
      const result = updateSpeakerSchema.safeParse({ name: 'A' })
      expect(result.success).toBe(true)
    })

    it('100文字で成功', () => {
      const result = updateSpeakerSchema.safeParse({ name: 'あ'.repeat(100) })
      expect(result.success).toBe(true)
    })

    it('空文字でエラー（min(1)）', () => {
      const result = updateSpeakerSchema.safeParse({ name: '' })
      expect(result.success).toBe(false)
    })

    it('101文字でエラー', () => {
      const result = updateSpeakerSchema.safeParse({ name: 'あ'.repeat(101) })
      expect(result.success).toBe(false)
    })
  })

  describe('§3-F 境界値: bio', () => {
    it('2000文字で成功', () => {
      const result = updateSpeakerSchema.safeParse({ bio: 'a'.repeat(2000) })
      expect(result.success).toBe(true)
    })

    it('2001文字でエラー', () => {
      const result = updateSpeakerSchema.safeParse({ bio: 'a'.repeat(2001) })
      expect(result.success).toBe(false)
    })
  })

  describe('§3-F 境界値: title (position)', () => {
    it('100文字で成功', () => {
      const result = updateSpeakerSchema.safeParse({ title: 'a'.repeat(100) })
      expect(result.success).toBe(true)
    })

    it('101文字でエラー', () => {
      const result = updateSpeakerSchema.safeParse({ title: 'a'.repeat(101) })
      expect(result.success).toBe(false)
    })
  })

  describe('§3-F 境界値: organization', () => {
    it('100文字で成功', () => {
      const result = updateSpeakerSchema.safeParse({ organization: 'a'.repeat(100) })
      expect(result.success).toBe(true)
    })

    it('101文字でエラー', () => {
      const result = updateSpeakerSchema.safeParse({ organization: 'a'.repeat(101) })
      expect(result.success).toBe(false)
    })
  })

  describe('§3-F 境界値: presentation_title', () => {
    it('500文字で成功', () => {
      const result = updateSpeakerSchema.safeParse({ presentation_title: 'a'.repeat(500) })
      expect(result.success).toBe(true)
    })

    it('501文字でエラー', () => {
      const result = updateSpeakerSchema.safeParse({ presentation_title: 'a'.repeat(501) })
      expect(result.success).toBe(false)
    })
  })

  describe('§3-F 境界値: duration_minutes', () => {
    it('1分で成功', () => {
      const result = updateSpeakerSchema.safeParse({ duration_minutes: 1 })
      expect(result.success).toBe(true)
    })

    it('240分で成功', () => {
      const result = updateSpeakerSchema.safeParse({ duration_minutes: 240 })
      expect(result.success).toBe(true)
    })

    it('0分でエラー', () => {
      const result = updateSpeakerSchema.safeParse({ duration_minutes: 0 })
      expect(result.success).toBe(false)
    })

    it('241分でエラー', () => {
      const result = updateSpeakerSchema.safeParse({ duration_minutes: 241 })
      expect(result.success).toBe(false)
    })

    it('null で成功', () => {
      const result = updateSpeakerSchema.safeParse({ duration_minutes: null })
      expect(result.success).toBe(true)
    })
  })

  describe('§3-F 境界値: format', () => {
    it.each(SPEAKER_FORMATS)('format=%s で成功', (f) => {
      const result = updateSpeakerSchema.safeParse({ format: f })
      expect(result.success).toBe(true)
    })

    it('不正な format でエラー', () => {
      const result = updateSpeakerSchema.safeParse({ format: 'hybrid' })
      expect(result.success).toBe(false)
    })

    it('null で成功', () => {
      const result = updateSpeakerSchema.safeParse({ format: null })
      expect(result.success).toBe(true)
    })
  })

  describe('submission_status', () => {
    it.each(SUBMISSION_STATUSES)('status=%s で成功', (s) => {
      const result = updateSpeakerSchema.safeParse({ submission_status: s })
      expect(result.success).toBe(true)
    })

    it('不正なステータスでエラー', () => {
      const result = updateSpeakerSchema.safeParse({ submission_status: 'approved' })
      expect(result.success).toBe(false)
    })
  })

  describe('URL フィールド', () => {
    it('有効な photo_url で成功', () => {
      const result = updateSpeakerSchema.safeParse({ photo_url: 'https://cdn.example.com/photo.jpg' })
      expect(result.success).toBe(true)
    })

    it('不正な photo_url でエラー', () => {
      const result = updateSpeakerSchema.safeParse({ photo_url: 'not-a-url' })
      expect(result.success).toBe(false)
    })

    it('null の photo_url で成功', () => {
      const result = updateSpeakerSchema.safeParse({ photo_url: null })
      expect(result.success).toBe(true)
    })
  })
})

// ──────────────────────────────────────
// speakerFormSubmitSchema テスト
// ──────────────────────────────────────
describe('speakerFormSubmitSchema', () => {
  it('必須フィールド（name）のみで成功', () => {
    const result = speakerFormSubmitSchema.safeParse({ name: '山田太郎' })
    expect(result.success).toBe(true)
  })

  it('全フィールドで成功', () => {
    const result = speakerFormSubmitSchema.safeParse({
      name: '山田太郎',
      title: '取締役CTO',
      organization: '株式会社ABC',
      bio: 'AIの専門家',
      presentation_title: 'AI×DXで変わる未来',
      start_at: '2026-03-15T14:30:00.000Z',
      duration_minutes: 45,
      format: 'onsite',
    })
    expect(result.success).toBe(true)
  })

  it('name が空でエラー', () => {
    const result = speakerFormSubmitSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('name 未指定でエラー', () => {
    const result = speakerFormSubmitSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('format は onsite/online のみ', () => {
    const result = speakerFormSubmitSchema.safeParse({ name: 'テスト', format: 'hybrid' })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────
// sendFormEmailSchema テスト
// ──────────────────────────────────────
describe('sendFormEmailSchema', () => {
  it('有効なメールアドレスで成功', () => {
    const result = sendFormEmailSchema.safeParse({ email: 'test@example.com' })
    expect(result.success).toBe(true)
  })

  it('空文字でエラー', () => {
    const result = sendFormEmailSchema.safeParse({ email: '' })
    expect(result.success).toBe(false)
  })

  it('不正なメールアドレスでエラー', () => {
    const result = sendFormEmailSchema.safeParse({ email: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('email 未指定でエラー', () => {
    const result = sendFormEmailSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────
// ステータス遷移テスト
// ──────────────────────────────────────
describe('isValidSubmissionTransition', () => {
  describe('同じ状態への遷移はOK', () => {
    it.each(SUBMISSION_STATUSES)('%s → %s は有効', (status) => {
      expect(isValidSubmissionTransition(status, status)).toBe(true)
    })
  })

  describe('pending からの遷移', () => {
    it('pending → submitted は有効', () => {
      expect(isValidSubmissionTransition('pending', 'submitted')).toBe(true)
    })
    it('pending → confirmed は無効', () => {
      expect(isValidSubmissionTransition('pending', 'confirmed')).toBe(false)
    })
  })

  describe('submitted からの遷移', () => {
    it('submitted → confirmed は有効', () => {
      expect(isValidSubmissionTransition('submitted', 'confirmed')).toBe(true)
    })
    it('submitted → pending は有効（差し戻し）', () => {
      expect(isValidSubmissionTransition('submitted', 'pending')).toBe(true)
    })
  })

  describe('confirmed からの遷移', () => {
    it('confirmed → pending は無効', () => {
      expect(isValidSubmissionTransition('confirmed', 'pending')).toBe(false)
    })
    it('confirmed → submitted は無効', () => {
      expect(isValidSubmissionTransition('confirmed', 'submitted')).toBe(false)
    })
  })

  describe('遷移マップの網羅性', () => {
    it('全ステータスがキーに存在する', () => {
      for (const status of SUBMISSION_STATUSES) {
        expect(SUBMISSION_STATUS_TRANSITIONS).toHaveProperty(status)
      }
    })
  })
})

// ──────────────────────────────────────
// ファイルバリデーションテスト (§3-F)
// ──────────────────────────────────────
describe('validatePhotoFile', () => {
  it('JPEG で50MB以内は有効', () => {
    expect(validatePhotoFile('image/jpeg', 5 * 1024 * 1024)).toEqual({ valid: true })
  })

  it('PNG で50MB以内は有効', () => {
    expect(validatePhotoFile('image/png', 1024)).toEqual({ valid: true })
  })

  it('50MBちょうどは有効', () => {
    expect(validatePhotoFile('image/jpeg', MAX_FILE_SIZE)).toEqual({ valid: true })
  })

  it('50MB超過はエラー', () => {
    const result = validatePhotoFile('image/jpeg', MAX_FILE_SIZE + 1)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('50MB')
  })

  it('PDFは非対応', () => {
    const result = validatePhotoFile('application/pdf', 1024)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('対応していない形式')
  })

  it('GIFは非対応', () => {
    const result = validatePhotoFile('image/gif', 1024)
    expect(result.valid).toBe(false)
  })

  it('exeは非対応', () => {
    const result = validatePhotoFile('application/x-msdownload', 1024)
    expect(result.valid).toBe(false)
  })
})

describe('validateMaterialsFile', () => {
  it('PDF で50MB以内は有効', () => {
    expect(validateMaterialsFile('application/pdf', 10 * 1024 * 1024)).toEqual({ valid: true })
  })

  it('PPT で有効', () => {
    expect(validateMaterialsFile('application/vnd.ms-powerpoint', 1024)).toEqual({ valid: true })
  })

  it('PPTX で有効', () => {
    expect(validateMaterialsFile('application/vnd.openxmlformats-officedocument.presentationml.presentation', 1024)).toEqual({ valid: true })
  })

  it('JPEG で有効', () => {
    expect(validateMaterialsFile('image/jpeg', 1024)).toEqual({ valid: true })
  })

  it('PNG で有効', () => {
    expect(validateMaterialsFile('image/png', 1024)).toEqual({ valid: true })
  })

  it('50MB超過はエラー', () => {
    const result = validateMaterialsFile('application/pdf', MAX_FILE_SIZE + 1)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('50MB')
  })

  it('exeは非対応', () => {
    const result = validateMaterialsFile('application/x-msdownload', 1024)
    expect(result.valid).toBe(false)
  })

  it('ZIPは非対応', () => {
    const result = validateMaterialsFile('application/zip', 1024)
    expect(result.valid).toBe(false)
  })
})
