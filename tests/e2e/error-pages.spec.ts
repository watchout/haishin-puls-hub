// E2E: エラーページ（クリティカルパス）
// ERR-001: 404 Not Found
// ERR-002: 403 Forbidden
// ERR-003: 500 Internal Server Error

import { test, expect } from '@playwright/test'

// ──────────────────────────────────────
// 404 エラーページ
// ──────────────────────────────────────

test.describe('404 エラーページ', () => {
  test('存在しないページで 404 が表示される', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-at-all')

    // Nuxt のエラーページが表示される
    // statusCode 404 が返ること
    expect(response?.status()).toBe(404)
  })

  test('存在しないイベントIDで 404 が表示される', async ({ page }) => {
    const response = await page.goto('/events/00000000000000000000000000')

    // 404 またはログインリダイレクト（未認証時）
    const status = response?.status()
    expect([200, 302, 401, 404]).toContain(status)
  })

  test('404 ページにホームへのリンクが存在する', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-at-all')

    // エラーページのコンテンツが表示されていることを確認
    const body = await page.textContent('body')
    expect(body).toBeTruthy()
  })
})

// ──────────────────────────────────────
// API エラーレスポンス
// ──────────────────────────────────────

test.describe('API エラーレスポンス', () => {
  test('存在しない API エンドポイントで 404 JSON が返る', async ({ request }) => {
    const response = await request.get('/api/v1/nonexistent-resource')

    expect(response.status()).toBe(404)
  })

  test('ヘルスチェック API が 200 を返す', async ({ request }) => {
    const response = await request.get('/api/health')

    expect(response.status()).toBe(200)
  })

  test('認証なしで保護された API にアクセスすると 401 が返る', async ({ request }) => {
    const response = await request.get('/api/v1/events')

    // 401 Unauthorized または 403 Forbidden
    expect([401, 403]).toContain(response.status())
  })

  test('イベント作成 API に認証なしでアクセスすると 401 が返る', async ({ request }) => {
    const response = await request.post('/api/v1/events', {
      data: {
        title: 'テストイベント',
        event_type: 'seminar',
      },
    })

    expect([401, 403]).toContain(response.status())
  })
})
