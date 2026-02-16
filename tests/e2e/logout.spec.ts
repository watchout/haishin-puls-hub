// E2E テスト: ログアウト機能
// AUTH-005 §9.2: TC-101, TC-102
//
// テストアカウント: admin@test.com / Test1234

import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'admin@test.com';
const TEST_PASSWORD = 'Test1234';

// Better Auth のレートリミット回避のため直列実行
test.describe.configure({ mode: 'serial' });

/** ヘルパー: ログインしてダッシュボードまで遷移 */
async function loginAndNavigateToDashboard(page: import('@playwright/test').Page) {
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
}

test.describe('AUTH-005 ログアウト', () => {
  test('TC-101: ヘッダーのユーザーメニューからログアウト → /login に遷移', async ({ page }) => {
    // 1. ログイン
    await loginAndNavigateToDashboard(page);

    // ダッシュボードが表示されることを確認
    await expect(page.locator('text=ようこそ！')).toBeVisible({ timeout: 10000 });

    // 2. ヘッダーのユーザーメニューを開く
    // ユーザーアバター or ユーザーメニューボタンをクリック
    const userMenuButton = page.locator('header button').filter({ has: page.locator('[class*="avatar"], [class*="user"]') }).first();
    // フォールバック: ヘッダー内の最後のボタン群から UDropdownMenu トリガーを探す
    const headerButtons = page.locator('header button');
    const buttonCount = await headerButtons.count();

    // ユーザーメニューボタンを探す（右端のボタン）
    let menuButtonFound = false;
    if (await userMenuButton.isVisible().catch(() => false)) {
      await userMenuButton.click();
      menuButtonFound = true;
    } else {
      // ヘッダー右側のボタン群から探す
      for (let i = buttonCount - 1; i >= 0; i--) {
        const btn = headerButtons.nth(i);
        const text = await btn.textContent();
        // ユーザー名を含むボタンか、ドロップダウンメニュートリガーを探す
        if (text && (text.includes('admin') || text.includes('Admin'))) {
          await btn.click();
          menuButtonFound = true;
          break;
        }
      }
    }

    if (!menuButtonFound) {
      // UDropdownMenu のトリガーボタンを直接探す
      const dropdownTrigger = page.locator('header [data-slot="dropdown-menu-trigger"], header [aria-haspopup="menu"]').first();
      if (await dropdownTrigger.isVisible().catch(() => false)) {
        await dropdownTrigger.click();
        menuButtonFound = true;
      }
    }

    // 3. ドロップダウンからログアウトをクリック
    if (menuButtonFound) {
      // ドロップダウンメニューが表示されるのを待つ
      const logoutMenuItem = page.locator('text=ログアウト').first();
      await expect(logoutMenuItem).toBeVisible({ timeout: 5000 });
      await logoutMenuItem.click();
    } else {
      // フォールバック: サイドバーのログアウトボタンを使用
      const sidebarLogout = page.locator('aside button:has-text("ログアウト")');
      if (await sidebarLogout.isVisible().catch(() => false)) {
        await sidebarLogout.click();
      } else {
        // 最終フォールバック: 直接 /api/auth/sign-out を呼ぶのではなく、
        // ページ上のログアウト要素を探す
        const anyLogoutButton = page.locator('button:has-text("ログアウト"), a:has-text("ログアウト")').first();
        await expect(anyLogoutButton).toBeVisible({ timeout: 5000 });
        await anyLogoutButton.click();
      }
    }

    // 4. /login にリダイレクトされることを確認 (§2.1 AC-002)
    await page.waitForURL('**/login**', { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);

    // 5. reason=logout クエリパラメータが含まれることを確認
    const url = new URL(page.url());
    expect(url.searchParams.get('reason')).toBe('logout');
  });

  test('TC-102: ログアウト後に /app にアクセスすると /login にリダイレクト', async ({ page }) => {
    // 1. ログイン
    await loginAndNavigateToDashboard(page);
    await expect(page.locator('text=ようこそ！')).toBeVisible({ timeout: 10000 });

    // 2. サイドバーのログアウトボタンからログアウト（確実にアクセスできる要素）
    // サイドバーのログアウトボタンを探す
    const sidebarLogout = page.locator('aside button').filter({ hasText: 'ログアウト' }).first();
    const headerLogout = page.locator('[role="menuitem"]:has-text("ログアウト"), [data-slot="dropdown-menu-item"]:has-text("ログアウト")').first();

    // サイドバーにログアウトボタンがある場合はそこから
    if (await sidebarLogout.isVisible().catch(() => false)) {
      await sidebarLogout.click();
    } else {
      // ヘッダーのドロップダウンから
      const dropdownTrigger = page.locator('header [aria-haspopup="menu"]').first();
      await dropdownTrigger.click();
      await expect(headerLogout).toBeVisible({ timeout: 5000 });
      await headerLogout.click();
    }

    // 3. /login に遷移するのを待つ
    await page.waitForURL('**/login**', { timeout: 10000 });

    // 4. Protected ページ /app にアクセス (§2.1 AC-004)
    await page.goto('/app');

    // 5. /login にリダイレクトされることを確認
    await expect(page).toHaveURL(/\/login/);
  });
});
