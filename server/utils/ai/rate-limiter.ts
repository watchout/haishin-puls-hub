// AI-001/003/008 §3-F, §3-G, §3-H: AIリクエスト レート制限
// テナント×ユーザー単位で 20req/min を適用
// メモリベース実装（MVP）、将来的に Redis 移行可能

import { AI_RATE_LIMIT } from '~/types/ai'

// ──────────────────────────────────────
// 型定義
// ──────────────────────────────────────

interface RateLimitEntry {
  timestamps: number[]
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterMs: number
}

// ──────────────────────────────────────
// インメモリストア
// ──────────────────────────────────────

const store = new Map<string, RateLimitEntry>()

/** GC: 5分以上古いエントリを定期的に削除 */
const GC_INTERVAL_MS = 60 * 1000
const GC_MAX_AGE_MS = 5 * 60 * 1000

let gcTimer: ReturnType<typeof setInterval> | null = null

function startGC() {
  if (gcTimer) return
  gcTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter(t => now - t < GC_MAX_AGE_MS)
      if (entry.timestamps.length === 0) {
        store.delete(key)
      }
    }
  }, GC_INTERVAL_MS)

  // Node.js で unref してプロセス終了をブロックしない
  if (typeof gcTimer === 'object' && 'unref' in gcTimer) {
    gcTimer.unref()
  }
}

// ──────────────────────────────────────
// レート制限チェック
// ──────────────────────────────────────

/**
 * レート制限をチェックし、許可/拒否を返す
 *
 * @param tenantId テナントID
 * @param userId ユーザーID
 * @returns レート制限結果
 */
export function checkRateLimit(tenantId: string, userId: string): RateLimitResult {
  startGC()

  const key = `${tenantId}:${userId}`
  const now = Date.now()
  const windowStart = now - AI_RATE_LIMIT.windowMs

  // エントリ取得・初期化
  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // ウィンドウ外のタイムスタンプを除去
  entry.timestamps = entry.timestamps.filter(t => t > windowStart)

  // 制限チェック
  if (entry.timestamps.length >= AI_RATE_LIMIT.maxRequests) {
    // 最古のリクエストがウィンドウを抜けるまでの待ち時間
    const oldestInWindow = entry.timestamps[0]
    const retryAfterMs = oldestInWindow
      ? (oldestInWindow + AI_RATE_LIMIT.windowMs) - now
      : AI_RATE_LIMIT.windowMs

    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(retryAfterMs, 1000), // 最低1秒
    }
  }

  // 許可 → タイムスタンプ記録
  entry.timestamps.push(now)

  return {
    allowed: true,
    remaining: AI_RATE_LIMIT.maxRequests - entry.timestamps.length,
    retryAfterMs: 0,
  }
}

/**
 * レート制限ストアをリセット（テスト用）
 */
export function resetRateLimitStore(): void {
  store.clear()
}

/**
 * テナント×ユーザーの現在のリクエスト数を取得（テスト/デバッグ用）
 */
export function getRateLimitCount(tenantId: string, userId: string): number {
  const key = `${tenantId}:${userId}`
  const entry = store.get(key)
  if (!entry) return 0

  const windowStart = Date.now() - AI_RATE_LIMIT.windowMs
  return entry.timestamps.filter(t => t > windowStart).length
}
