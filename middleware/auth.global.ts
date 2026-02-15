// 認証ルートガード（グローバルミドルウェア）
// AUTH-001 §3.5 に基づくルート保護
//
// ルール:
// - /app/* ルートはセッション必須 → 未認証なら /login へリダイレクト
// - /login, /signup はセッションあればロール別ページへリダイレクト
//
// SSR時は $fetch がブラウザのCookieを自動転送しないため、
// useRequestHeaders() でCookieヘッダーを明示的に渡す。

interface SessionResponse {
  session: { userId: string } | null;
  user: { id: string; name: string; email: string } | null;
}

export default defineNuxtRouteMiddleware(async (to) => {
  // 認証不要なルート
  const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email'];
  const isPublicRoute = publicPaths.some((path) => to.path === path || to.path.startsWith(`${path}/`));
  const isProtectedRoute = to.path.startsWith('/app');

  // 認証不要かつ保護対象外なら何もしない
  if (!isPublicRoute && !isProtectedRoute) return;

  // SSR時にブラウザのCookieを$fetchに転送するためのヘッダー
  const headers = import.meta.server
    ? useRequestHeaders(['cookie'])
    : undefined;

  // セッション取得
  let isAuthenticated = false;
  try {
    const session = await $fetch<SessionResponse>('/api/auth/get-session', {
      headers,
    });
    isAuthenticated = !!session?.user;
  } catch {
    isAuthenticated = false;
  }

  // 保護ルートに未認証でアクセス → /login へ
  if (isProtectedRoute && !isAuthenticated) {
    return navigateTo({
      path: '/login',
      query: { next: to.fullPath },
    });
  }

  // 認証済みで公開ルート（/login 等）にアクセス → ロール別リダイレクト先へ
  if (isPublicRoute && isAuthenticated) {
    try {
      const response = await $fetch<{ data: { redirectTo: string } }>('/api/v1/auth/login-context', {
        headers,
      });
      return navigateTo(response.data.redirectTo);
    } catch {
      return navigateTo('/app');
    }
  }
});
