// E2E テスト: ログイン → ダッシュボード表示
// AUTH-001 + NAV-001-002-006 の結合テスト
//
// テストアカウント: admin@test.com / Test1234

import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'admin@test.com';
const TEST_PASSWORD = 'Test1234';

// Better Auth のレートリミット回避のため直列実行
test.describe.configure({ mode: 'serial' });

test.describe('ログイン → ダッシュボード', () => {
  test('メール/パスワードでログインし、ダッシュボードが正しく表示される', async ({ page }) => {
    // コンソールメッセージを収集
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    // 1. ログインページにアクセス
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);

    // ページが完全に読み込まれるのを待つ（Vue hydration 完了）
    await page.waitForLoadState('networkidle');

    // フォーム要素が存在することを確認
    const emailInput = page.locator('input[placeholder="example@email.com"]');
    const passwordInput = page.locator('input[placeholder="パスワードを入力"]');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // 2. フォーム入力
    await emailInput.click();
    await emailInput.pressSequentially(TEST_EMAIL, { delay: 10 });

    await passwordInput.click();
    await passwordInput.pressSequentially(TEST_PASSWORD, { delay: 10 });

    // 入力値の確認
    await expect(emailInput).toHaveValue(TEST_EMAIL);
    await expect(passwordInput).toHaveValue(TEST_PASSWORD);

    // 3. ログインボタンをクリック
    const submitButton = page.locator('button:has-text("ログイン")').first();
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // 4. /app にリダイレクトされるのを待つ
    await page.waitForURL('**/app**', { timeout: 15000 });

    // ページの読み込みを待つ
    await page.waitForLoadState('networkidle');

    // 5. dashboard レイアウトの主要要素が表示されることを確認
    // ヘッダー: 配信プラス HUB
    await expect(page.locator('header')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=配信プラス HUB')).toBeVisible();

    // 6. ウェルカムカードが表示される
    await expect(page.locator('text=ようこそ！')).toBeVisible();

    // 7. サイドバーが表示されている（デスクトップ）
    const sidebar = page.locator('aside[role="navigation"]');
    await expect(sidebar).toBeAttached();

    // 8. 致命的なコンソールエラーがないことを確認
    const criticalErrors = consoleMessages.filter(
      (msg) =>
        msg.startsWith('[error]') && (
          msg.includes('Hydration') ||
          msg.includes('hydration') ||
          msg.includes('Uncaught') ||
          msg.includes('500')
        ),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('ログイン後にページリロードしてもダッシュボードが維持される', async ({ page }) => {
    // ログイン
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[placeholder="example@email.com"]');
    const passwordInput = page.locator('input[placeholder="パスワードを入力"]');

    await emailInput.click();
    await emailInput.pressSequentially(TEST_EMAIL, { delay: 10 });
    await passwordInput.click();
    await passwordInput.pressSequentially(TEST_PASSWORD, { delay: 10 });

    const submitButton = page.locator('button:has-text("ログイン")').first();
    await submitButton.click();
    await page.waitForURL('**/app**', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // リロード
    await page.reload();
    await page.waitForLoadState('networkidle');

    // ダッシュボードが再表示される（SSRでストア同期が動作する確認）
    await expect(page.locator('text=ようこそ！')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('text=配信プラス HUB')).toBeVisible();
  });

  test('未認証で /app にアクセスすると /login にリダイレクトされる', async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveURL(/\/login/);
  });
});
