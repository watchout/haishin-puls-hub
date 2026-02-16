// 認証ルートガード（グローバルミドルウェア）
// AUTH-001 §3.5 に基づくルート保護
//
// ルール:
// - /app/* ルートはセッション必須 → 未認証なら /login へリダイレクト
// - /login, /signup はセッションあればロール別ページへリダイレクト
// - 保護ルートではストア（authStore/tenantStore）を自動同期する
//
// SSR時は $fetch がブラウザのCookieを自動転送しないため、
// useRequestHeaders() でCookieヘッダーを明示的に渡す。

import type { LoginContextResponse } from '~/types/auth';

interface SessionResponse {
  session: { userId: string } | null;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    emailVerified: boolean;
  } | null;
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

  // ストアを取得
  const authStore = useAuthStore();
  const tenantStore = useTenantStore();

  // セッション取得
  let sessionData: SessionResponse | null = null;
  try {
    sessionData = await $fetch<SessionResponse>('/api/auth/get-session', {
      headers,
    });
  } catch {
    sessionData = null;
  }

  const isAuthenticated = !!sessionData?.user;

  // 保護ルートに未認証でアクセス → /login へ
  if (isProtectedRoute && !isAuthenticated) {
    return navigateTo({
      path: '/login',
      query: { next: to.fullPath },
    });
  }

  // 認証済みで保護ルートにアクセス → ストアを同期
  if (isProtectedRoute && isAuthenticated && sessionData?.user) {
    // authStore にユーザー情報をセット（未設定の場合のみ）
    if (!authStore.user || authStore.user.id !== sessionData.user.id) {
      authStore.setUser({
        id: sessionData.user.id,
        email: sessionData.user.email,
        name: sessionData.user.name,
        avatarUrl: sessionData.user.image ?? null,
        emailVerified: sessionData.user.emailVerified,
      });
      authStore.setLoading(false);
    }

    // tenantStore にテナント・ロール情報をセット（未設定の場合のみ）
    if (!tenantStore.currentRole) {
      try {
        const contextResponse = await $fetch<LoginContextResponse>('/api/v1/auth/login-context', {
          headers,
        });
        tenantStore.setTenantContext(
          contextResponse.data.tenant,
          contextResponse.data.role,
        );
      } catch {
        // テナント情報が取得できなくてもページ表示は許可
        // （ダッシュボードは空メニューで表示される）
      }
    }
  }

  // 認証済みで公開ルート（/login 等）にアクセス → ロール別リダイレクト先へ
  if (isPublicRoute && isAuthenticated) {
    try {
      const response = await $fetch<LoginContextResponse>('/api/v1/auth/login-context', {
        headers,
      });
      return navigateTo(response.data.redirectTo);
    } catch {
      return navigateTo('/app');
    }
  }
});
