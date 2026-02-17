// E2E: ヘルスチェック・スモークテスト
// アプリケーションが正常に起動し、基本的なレスポンスを返すことを検証

import { test, expect } from '@playwright/test'

// ──────────────────────────────────────
// サーバー起動確認
// ──────────────────────────────────────

test.describe('ヘルスチェック', () => {
  test('ヘルスチェック API が OK を返す', async ({ request }) => {
    const response = await request.get('/api/health')

    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body).toHaveProperty('status', 'ok')
  })

  test('トップページがHTMLを返す', async ({ request }) => {
    const response = await request.get('/')

    expect(response.status()).toBe(200)
    const contentType = response.headers()['content-type']
    expect(contentType).toContain('text/html')
  })
})

// ──────────────────────────────────────
// 静的アセット
// ──────────────────────────────────────

test.describe('静的アセット', () => {
  test('Nuxt アプリが正常にレンダリングされる', async ({ page }) => {
    await page.goto('/')

    // __nuxt div が存在する（Nuxt アプリがマウントされている）
    const nuxtApp = page.locator('#__nuxt')
    await expect(nuxtApp).toBeAttached()
  })

  test('JavaScript エラーが発生しない', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => {
      errors.push(err.message)
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // 致命的な JS エラーがないこと
    const criticalErrors = errors.filter(
      (e) => !e.includes('hydration') && !e.includes('ResizeObserver'),
    )
    expect(criticalErrors).toHaveLength(0)
  })
})

// ──────────────────────────────────────
// セキュリティヘッダー
// ──────────────────────────────────────

test.describe('セキュリティヘッダー', () => {
  test('X-Content-Type-Options が設定されている', async ({ request }) => {
    const response = await request.get('/')
    const headers = response.headers()

    expect(headers['x-content-type-options']).toBe('nosniff')
  })

  test('X-Frame-Options が設定されている', async ({ request }) => {
    const response = await request.get('/')
    const headers = response.headers()

    expect(headers['x-frame-options']).toBeDefined()
  })
})

// ──────────────────────────────────────
// API ルーティング
// ──────────────────────────────────────

test.describe('API ルーティング', () => {
  test('認証 API エンドポイントが応答する', async ({ request }) => {
    const response = await request.get('/api/auth/session')

    // セッションなしでも 200 で空レスポンスを返す（Better Auth 仕様）
    expect([200, 401]).toContain(response.status())
  })

  test('イベント一覧 API が認証を要求する', async ({ request }) => {
    const response = await request.get('/api/v1/events')

    expect([401, 403]).toContain(response.status())
  })

  test('会場一覧 API が認証を要求する', async ({ request }) => {
    const response = await request.get('/api/v1/venues')

    expect([401, 403]).toContain(response.status())
  })
})
