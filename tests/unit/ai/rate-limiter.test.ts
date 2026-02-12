// AI-001/003/008 §3-F, §3-H: レート制限テスト
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  checkRateLimit,
  resetRateLimitStore,
  getRateLimitCount,
} from '~/server/utils/ai/rate-limiter'

describe('rate-limiter', () => {
  beforeEach(() => {
    resetRateLimitStore()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ──────────────────────────────────────
  // 基本動作
  // ──────────────────────────────────────

  describe('基本動作', () => {
    it('最初のリクエストは許可される', () => {
      const result = checkRateLimit('tenant-1', 'user-1')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(19)
      expect(result.retryAfterMs).toBe(0)
    })

    it('20回目のリクエストまで許可される', () => {
      for (let i = 0; i < 20; i++) {
        const result = checkRateLimit('tenant-1', 'user-1')
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(20 - (i + 1))
      }
    })

    it('21回目のリクエストは拒否される (§3-H: Gherkin #3)', () => {
      for (let i = 0; i < 20; i++) {
        checkRateLimit('tenant-1', 'user-1')
      }

      const result = checkRateLimit('tenant-1', 'user-1')
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfterMs).toBeGreaterThan(0)
    })

    it('retryAfterMs が 1000ms 以上である', () => {
      for (let i = 0; i < 20; i++) {
        checkRateLimit('tenant-1', 'user-1')
      }

      const result = checkRateLimit('tenant-1', 'user-1')
      expect(result.retryAfterMs).toBeGreaterThanOrEqual(1000)
    })
  })

  // ──────────────────────────────────────
  // テナント×ユーザー分離 (§3-F)
  // ──────────────────────────────────────

  describe('テナント×ユーザー分離', () => {
    it('異なるユーザーは独立したレート制限を持つ', () => {
      for (let i = 0; i < 20; i++) {
        checkRateLimit('tenant-1', 'user-1')
      }

      // user-1 は制限に達した
      expect(checkRateLimit('tenant-1', 'user-1').allowed).toBe(false)

      // user-2 はまだ使える
      expect(checkRateLimit('tenant-1', 'user-2').allowed).toBe(true)
    })

    it('異なるテナントは独立したレート制限を持つ', () => {
      for (let i = 0; i < 20; i++) {
        checkRateLimit('tenant-1', 'user-1')
      }

      // tenant-1:user-1 は制限に達した
      expect(checkRateLimit('tenant-1', 'user-1').allowed).toBe(false)

      // tenant-2:user-1 はまだ使える
      expect(checkRateLimit('tenant-2', 'user-1').allowed).toBe(true)
    })
  })

  // ──────────────────────────────────────
  // ウィンドウスライド
  // ──────────────────────────────────────

  describe('ウィンドウスライド', () => {
    it('1分後にリクエストが再び許可される', () => {
      for (let i = 0; i < 20; i++) {
        checkRateLimit('tenant-1', 'user-1')
      }
      expect(checkRateLimit('tenant-1', 'user-1').allowed).toBe(false)

      // 1分後
      vi.advanceTimersByTime(60 * 1000 + 1)

      const result = checkRateLimit('tenant-1', 'user-1')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(19)
    })

    it('30秒後に10件がウィンドウ外になる', () => {
      // 最初の10件
      for (let i = 0; i < 10; i++) {
        checkRateLimit('tenant-1', 'user-1')
      }

      // 30秒後にさらに10件
      vi.advanceTimersByTime(30 * 1000)
      for (let i = 0; i < 10; i++) {
        checkRateLimit('tenant-1', 'user-1')
      }

      // 制限に達している
      expect(checkRateLimit('tenant-1', 'user-1').allowed).toBe(false)

      // さらに30秒後（最初の10件がウィンドウ外になる）
      vi.advanceTimersByTime(30 * 1000 + 1)

      const result = checkRateLimit('tenant-1', 'user-1')
      expect(result.allowed).toBe(true)
    })
  })

  // ──────────────────────────────────────
  // ユーティリティ
  // ──────────────────────────────────────

  describe('ユーティリティ', () => {
    it('getRateLimitCount: リクエスト数を返す', () => {
      expect(getRateLimitCount('tenant-1', 'user-1')).toBe(0)

      checkRateLimit('tenant-1', 'user-1')
      expect(getRateLimitCount('tenant-1', 'user-1')).toBe(1)

      for (let i = 0; i < 5; i++) {
        checkRateLimit('tenant-1', 'user-1')
      }
      expect(getRateLimitCount('tenant-1', 'user-1')).toBe(6)
    })

    it('resetRateLimitStore: ストアをクリアする', () => {
      for (let i = 0; i < 10; i++) {
        checkRateLimit('tenant-1', 'user-1')
      }
      expect(getRateLimitCount('tenant-1', 'user-1')).toBe(10)

      resetRateLimitStore()
      expect(getRateLimitCount('tenant-1', 'user-1')).toBe(0)
    })
  })
})
