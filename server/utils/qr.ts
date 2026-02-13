// EVT-031: QRコード生成・検証ユーティリティ
// 仕様書: docs/design/features/project/EVT-030-031-033_participant-portal.md §7 BR-1, BR-2

import crypto from 'crypto'
import type { QRPayload } from './participant-validation'

// ──────────────────────────────────────
// 定数
// ──────────────────────────────────────

/** QRコード有効期限: 30日（ミリ秒） */
const QR_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000

/** 環境変数から秘密鍵を取得（なければフォールバック） */
function getSecretKey(): string {
  return process.env.QR_SECRET_KEY || 'default-qr-secret-key-change-in-production'
}

// ──────────────────────────────────────
// QRコード生成 (BR-1)
// ──────────────────────────────────────

/**
 * QRコード文字列を生成する
 *
 * フォーマット: participant_id + event_id + timestamp をHMAC-SHA256署名してBase64エンコード
 *
 * @param participantId - 参加者ID
 * @param eventId - イベントID
 * @returns Base64エンコード済みQRコード文字列
 */
export function generateQRCodeString(participantId: string, eventId: string): string {
  const payload: QRPayload = {
    participant_id: participantId,
    event_id: eventId,
    timestamp: Date.now(),
  }

  const data = JSON.stringify(payload)
  const signature = crypto
    .createHmac('sha256', getSecretKey())
    .update(data)
    .digest('hex')

  const signedPayload = { ...payload, signature }
  return Buffer.from(JSON.stringify(signedPayload)).toString('base64')
}

// ──────────────────────────────────────
// QRコード検証 (BR-2)
// ──────────────────────────────────────

export type QRVerifyResult =
  | { valid: true; payload: QRPayload }
  | { valid: false; error: 'INVALID_FORMAT' | 'INVALID_SIGNATURE' | 'EXPIRED' }

/**
 * QRコード文字列を検証する
 *
 * 検証手順:
 * 1. Base64デコード
 * 2. HMAC署名検証
 * 3. 有効期限チェック（30日間）
 *
 * @param qrCode - Base64エンコード済みQRコード文字列
 * @returns 検証結果（成功時はペイロード、失敗時はエラー種別）
 */
export function verifyQRCode(qrCode: string): QRVerifyResult {
  try {
    // 1. Base64デコード
    const decoded = JSON.parse(
      Buffer.from(qrCode, 'base64').toString('utf-8'),
    )

    const { signature, ...payload } = decoded

    if (!payload.participant_id || !payload.event_id || !payload.timestamp) {
      return { valid: false, error: 'INVALID_FORMAT' }
    }

    // 2. HMAC署名検証
    const expectedSignature = crypto
      .createHmac('sha256', getSecretKey())
      .update(JSON.stringify(payload))
      .digest('hex')

    if (signature !== expectedSignature) {
      return { valid: false, error: 'INVALID_SIGNATURE' }
    }

    // 3. 有効期限チェック（30日間）
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
