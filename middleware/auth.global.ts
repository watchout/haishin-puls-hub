// 認証ルートガード（グローバルミドルウェア）
// AUTH-001 §3.5 に基づくルート保護
//
// ルール:
// - /app/* ルートはセッション必須 → 未認証なら /login へリダイレクト
// - /login, /signup はセッションあればロール別ページへリダイレクト

import { authClient } from '~/lib/auth-client';

export default defineNuxtRouteMiddleware(async (to) => {
  // 認証不要なルート
  const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email'];
  const isPublicRoute = publicPaths.some((path) => to.path === path || to.path.startsWith(`${path}/`));
  const isProtectedRoute = to.path.startsWith('/app');

  // 認証不要かつ保護対象外なら何もしない
  if (!isPublicRoute && !isProtectedRoute) return;

  // セッション取得
  const { data: session } = await authClient.useSession(useFetch);

  const isAuthenticated = !!session.value?.user;

  // 保護ルートに未認証でアクセス → /login へ
  if (isProtectedRoute && !isAuthenticated) {
    return navigateTo({
      path: '/login',
      query: { next: to.fullPath },
    });
  }

  // 認証済みで公開ルート（/login 等）にアクセス → ロール別リダイレクト先へ
  if (isPublicRoute && isAuthenticated) {
    // login-context API からリダイレクト先を取得
    try {
      const response = await $fetch<{ data: { redirectTo: string } }>('/api/v1/auth/login-context');
      return navigateTo(response.data.redirectTo);
    } catch {
      // login-context エラー時はデフォルトのダッシュボードへ
      return navigateTo('/app');
    }
  }
});
