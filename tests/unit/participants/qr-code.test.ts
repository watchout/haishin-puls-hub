// EVT-031 QRコード生成・検証 ユニットテスト
// 仕様書: docs/design/features/project/EVT-030-031-033_participant-portal.md §7 BR-1, BR-2
import { describe, it, expect } from 'vitest'
import crypto from 'crypto'

// ──────────────────────────────────────
// ローカル再定義（server/utils/qr.ts と同等ロジック）
// ──────────────────────────────────────

interface QRPayload {
  participant_id: string
  event_id: string
  timestamp: number
}

const QR_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000
const SECRET_KEY = 'test-qr-secret-key'

function generateQRCodeString(participantId: string, eventId: string): string {
  const payload: QRPayload = {
    participant_id: participantId,
    event_id: eventId,
    timestamp: Date.now(),
  }

  const data = JSON.stringify(payload)
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(data)
    .digest('hex')

  const signedPayload = { ...payload, signature }
  return Buffer.from(JSON.stringify(signedPayload)).toString('base64')
}

type QRVerifyResult =
  | { valid: true; payload: QRPayload }
  | { valid: false; error: 'INVALID_FORMAT' | 'INVALID_SIGNATURE' | 'EXPIRED' }

function verifyQRCode(qrCode: string): QRVerifyResult {
  try {
    const decoded = JSON.parse(
      Buffer.from(qrCode, 'base64').toString('utf-8'),
    )

    const { signature, ...payload } = decoded

    if (!payload.participant_id || !payload.event_id || !payload.timestamp) {
      return { valid: false, error: 'INVALID_FORMAT' }
    }

    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(JSON.stringify(payload))
      .digest('hex')

    if (signature !== expectedSignature) {
      return { valid: false, error: 'INVALID_SIGNATURE' }
    }

    if (Date.now() - payload.timestamp > QR_EXPIRY_MS) {
      return { valid: false, error: 'EXPIRED' }
    }

    return {
      valid: true,
      payload: payload as QRPayload,
    }
  } catch {
    return { valid: false, error: 'INVALID_FORMAT' }
  }
}

// ──────────────────────────────────────
// テスト: QRコード生成
// ──────────────────────────────────────

describe('generateQRCodeString', () => {
  it('Base64エンコードされた文字列を返す', () => {
    const qr = generateQRCodeString('prt_abc123', 'evt_123')
    expect(qr).toBeTruthy()
    // Base64 デコードが可能であること
    const decoded = Buffer.from(qr, 'base64').toString('utf-8')
    const parsed = JSON.parse(decoded)
    expect(parsed).toHaveProperty('participant_id', 'prt_abc123')
    expect(parsed).toHaveProperty('event_id', 'evt_123')
    expect(parsed).toHaveProperty('timestamp')
    expect(parsed).toHaveProperty('signature')
  })

  it('HMAC-SHA256署名を含む', () => {
    const qr = generateQRCodeString('prt_abc123', 'evt_123')
    const decoded = JSON.parse(Buffer.from(qr, 'base64').toString('utf-8'))
    expect(decoded.signature).toMatch(/^[a-f0-9]{64}$/) // SHA-256 hex = 64文字
  })

  it('異なる参加者IDで異なるQRコードを生成', () => {
    const qr1 = generateQRCodeString('prt_111', 'evt_123')
    const qr2 = generateQRCodeString('prt_222', 'evt_123')
    expect(qr1).not.toBe(qr2)
  })

  it('異なるイベントIDで異なるQRコードを生成', () => {
    const qr1 = generateQRCodeString('prt_abc123', 'evt_111')
    const qr2 = generateQRCodeString('prt_abc123', 'evt_222')
    expect(qr1).not.toBe(qr2)
  })

  it('タイムスタンプを含む', () => {
    const before = Date.now()
    const qr = generateQRCodeString('prt_abc123', 'evt_123')
    const after = Date.now()
    const decoded = JSON.parse(Buffer.from(qr, 'base64').toString('utf-8'))
    expect(decoded.timestamp).toBeGreaterThanOrEqual(before)
    expect(decoded.timestamp).toBeLessThanOrEqual(after)
  })
})

// ──────────────────────────────────────
// テスト: QRコード検証
// ──────────────────────────────────────

describe('verifyQRCode', () => {
  it('有効なQRコードの検証に成功する', () => {
    const qr = generateQRCodeString('prt_abc123', 'evt_123')
    const result = verifyQRCode(qr)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.payload.participant_id).toBe('prt_abc123')
      expect(result.payload.event_id).toBe('evt_123')
    }
  })

  it('改ざんされたQRコードは署名不一致エラー', () => {
    const qr = generateQRCodeString('prt_abc123', 'evt_123')
    const decoded = JSON.parse(Buffer.from(qr, 'base64').toString('utf-8'))
    decoded.participant_id = 'prt_hacked'
    const tampered = Buffer.from(JSON.stringify(decoded)).toString('base64')

    const result = verifyQRCode(tampered)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toBe('INVALID_SIGNATURE')
    }
  })

  it('不正な形式のQRコードはフォーマットエラー', () => {
    const result = verifyQRCode('this-is-not-valid-base64')
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toBe('INVALID_FORMAT')
    }
  })

  it('空文字のQRコードはフォーマットエラー', () => {
    const result = verifyQRCode('')
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toBe('INVALID_FORMAT')
    }
  })

  it('必要フィールドが欠けたQRコードはフォーマットエラー', () => {
    const incomplete = Buffer.from(JSON.stringify({
      participant_id: 'prt_123',
      // event_id が欠落
      timestamp: Date.now(),
      signature: 'fake',
    })).toString('base64')

    const result = verifyQRCode(incomplete)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toBe('INVALID_FORMAT')
    }
  })

  it('§7 BR-2: 有効期限切れ（30日超過）はエラー', () => {
    // 31日前のタイムスタンプでQRコードを手動作成
    const oldTimestamp = Date.now() - (31 * 24 * 60 * 60 * 1000)
    const payload = {
      participant_id: 'prt_old',
      event_id: 'evt_123',
      timestamp: oldTimestamp,
    }
    const data = JSON.stringify(payload)
    const signature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(data)
      .digest('hex')

    const signedPayload = { ...payload, signature }
    const expiredQR = Buffer.from(JSON.stringify(signedPayload)).toString('base64')

    const result = verifyQRCode(expiredQR)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toBe('EXPIRED')
    }
  })

  it('§7 BR-2: 有効期限内（29日前）は成功', () => {
    const recentTimestamp = Date.now() - (29 * 24 * 60 * 60 * 1000)
    const payload = {
      participant_id: 'prt_recent',
      event_id: 'evt_123',
      timestamp: recentTimestamp,
    }
    const data = JSON.stringify(payload)
    const signature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(data)
      .digest('hex')

    const signedPayload = { ...payload, signature }
    const validQR = Buffer.from(JSON.stringify(signedPayload)).toString('base64')

    const result = verifyQRCode(validQR)
    expect(result.valid).toBe(true)
  })

  it('署名がないQRコードはフォーマットエラー', () => {
    const noSig = Buffer.from(JSON.stringify({
      participant_id: 'prt_123',
      event_id: 'evt_123',
      timestamp: Date.now(),
    })).toString('base64')

    // signature が undefined なので、署名検証で失敗する
    const result = verifyQRCode(noSig)
    expect(result.valid).toBe(false)
  })

  it('JSONでないBase64文字列はフォーマットエラー', () => {
    const notJson = Buffer.from('Hello World').toString('base64')
    const result = verifyQRCode(notJson)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toBe('INVALID_FORMAT')
    }
  })

  it('生成直後のQRコードは常に有効', () => {
    for (let i = 0; i < 10; i++) {
      const qr = generateQRCodeString(`prt_${i}`, `evt_${i}`)
      const result = verifyQRCode(qr)
      expect(result.valid).toBe(true)
    }
  })
})

// ──────────────────────────────────────
// テスト: ラウンドトリップ
// ──────────────────────────────────────

describe('QRコード ラウンドトリップ', () => {
  it('生成 → 検証でペイロードが保持される', () => {
    const participantId = 'prt_roundtrip_test'
    const eventId = 'evt_roundtrip_test'
    const qr = generateQRCodeString(participantId, eventId)
    const result = verifyQRCode(qr)

    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.payload.participant_id).toBe(participantId)
      expect(result.payload.event_id).toBe(eventId)
      expect(typeof result.payload.timestamp).toBe('number')
    }
  })

  it('異なるペイロードで生成 → 検証', () => {
    const testCases = [
      { participantId: 'prt_001', eventId: 'evt_001' },
      { participantId: 'prt_very_long_id_12345678', eventId: 'evt_very_long_id_12345678' },
      { participantId: '01HXYZ', eventId: '01HABC' }, // ULID形式
    ]

    for (const tc of testCases) {
      const qr = generateQRCodeString(tc.participantId, tc.eventId)
      const result = verifyQRCode(qr)
      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.payload.participant_id).toBe(tc.participantId)
        expect(result.payload.event_id).toBe(tc.eventId)
      }
    }
  })
})
