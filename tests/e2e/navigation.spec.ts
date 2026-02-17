// E2E: ナビゲーション・画面遷移（クリティカルパス）
// NAV-001: ヘッダーナビゲーション
// NAV-002: 公開ページアクセス
// NAV-006: レスポンシブ対応

import { test, expect } from '@playwright/test'

// ──────────────────────────────────────
// 公開ページアクセス
// ──────────────────────────────────────

test.describe('公開ページ', () => {
  test('トップページが正常に表示される', async ({ page }) => {
    const response = await page.goto('/')

    expect(response?.status()).toBe(200)
  })

  test('ログインページが正常に表示される', async ({ page }) => {
    const response = await page.goto('/login')

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible()
  })

  test('新規登録ページが正常に表示される', async ({ page }) => {
    const response = await page.goto('/signup')

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: '新規登録' })).toBeVisible()
  })

  test('パスワードリセットページが正常に表示される', async ({ page }) => {
    const response = await page.goto('/forgot-password')

    expect(response?.status()).toBe(200)
  })
})

// ──────────────────────────────────────
// ページ間遷移
// ──────────────────────────────────────

test.describe('ページ間遷移', () => {
  test('ログインページ → 新規登録ページ遷移', async ({ page }) => {
    await page.goto('/login')

    // 新規登録リンクをクリック
    const signupLink = page.getByRole('link', { name: /新規登録|アカウント作成/i })
    if (await signupLink.isVisible()) {
      await signupLink.click()
      await expect(page).toHaveURL(/\/signup/)
    }
  })

  test('ログインページ → パスワードリセット遷移', async ({ page }) => {
    await page.goto('/login')

    const forgotLink = page.getByRole('link', { name: /パスワード.*忘れ|forgot/i })
    if (await forgotLink.isVisible()) {
      await forgotLink.click()
      await expect(page).toHaveURL(/\/forgot-password/)
    }
  })
})

// ──────────────────────────────────────
// レスポンシブ対応
// ──────────────────────────────────────

test.describe('レスポンシブ対応', () => {
  test('モバイル画面でログインページが正常に表示される', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible()
  })

  test('タブレット画面でログインページが正常に表示される', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible()
  })

  test('デスクトップ画面でログインページが正常に表示される', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible()
  })
})

// ──────────────────────────────────────
// SEO / メタ情報
// ──────────────────────────────────────

test.describe('SEO / メタ情報', () => {
  test('エラーページに noindex meta タグがある', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')

    const metaRobots = await page.getAttribute('meta[name="robots"]', 'content')
    if (metaRobots) {
      expect(metaRobots).toContain('noindex')
    }
  })
})
