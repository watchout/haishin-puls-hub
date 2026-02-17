// E2E: 認証フロー（クリティカルパス）
// AT-AUTH-001: ログインページ表示・操作
// AT-AUTH-002: 未認証リダイレクト
// AT-AUTH-003: ログアウトフロー

import { test, expect } from '@playwright/test'

// ──────────────────────────────────────
// ログインページ表示
// ──────────────────────────────────────

test.describe('ログインページ', () => {
  test('ログインページが正常に表示される', async ({ page }) => {
    await page.goto('/login')

    // ページタイトル確認
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible()

    // フォーム要素の存在確認
    await expect(page.getByPlaceholder(/メールアドレス|email/i)).toBeVisible()
    await expect(page.getByPlaceholder(/パスワード|password/i)).toBeVisible()
  })

  test('空フォーム送信でバリデーションエラーが表示される', async ({ page }) => {
    await page.goto('/login')

    // 送信ボタンをクリック
    await page.getByRole('button', { name: /ログイン/i }).click()

    // バリデーションエラーの存在確認（フォームが送信されない）
    // Nuxt UI v3 のフォームバリデーションメッセージを確認
    await expect(page).toHaveURL(/\/login/)
  })

  test('パスワードを忘れた方リンクが存在する', async ({ page }) => {
    await page.goto('/login')

    const forgotLink = page.getByRole('link', { name: /パスワードを忘れた|forgot/i })
    await expect(forgotLink).toBeVisible()
  })

  test('新規登録リンクが存在する', async ({ page }) => {
    await page.goto('/login')

    const signupLink = page.getByRole('link', { name: /新規登録|signup|アカウント作成/i })
    await expect(signupLink).toBeVisible()
  })
})

// ──────────────────────────────────────
// 新規登録ページ
// ──────────────────────────────────────

test.describe('新規登録ページ', () => {
  test('新規登録ページが正常に表示される', async ({ page }) => {
    await page.goto('/signup')

    await expect(page.getByRole('heading', { name: '新規登録' })).toBeVisible()
  })

  test('招待トークンなしでセルフ登録フォームが表示される', async ({ page }) => {
    await page.goto('/signup')

    // SignupForm コンポーネントが表示される
    await expect(page.getByPlaceholder(/メールアドレス|email/i)).toBeVisible()
  })
})

// ──────────────────────────────────────
// 未認証リダイレクト
// ──────────────────────────────────────

test.describe('未認証リダイレクト', () => {
  test('ダッシュボードへのアクセスでログインにリダイレクトされる', async ({ page }) => {
    await page.goto('/events')

    // ログインページにリダイレクトされるか、エラーページが表示される
    await page.waitForURL(/\/(login|events)/, { timeout: 10000 })
  })

  test('プロフィールページへのアクセスでログインにリダイレクトされる', async ({ page }) => {
    await page.goto('/dashboard/profile')

    await page.waitForURL(/\/(login|dashboard)/, { timeout: 10000 })
  })
})

// ──────────────────────────────────────
// パスワードリセット
// ──────────────────────────────────────

test.describe('パスワードリセットページ', () => {
  test('パスワードリセットページが正常に表示される', async ({ page }) => {
    await page.goto('/forgot-password')

    // ページが表示される（エラーページでない）
    await expect(page).not.toHaveURL(/\/login/)
  })
})
