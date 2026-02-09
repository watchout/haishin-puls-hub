// 認証 Composable
// AUTH-001 仕様書に基づく Better Auth クライアントラッパー

import { authClient } from '~/lib/auth-client';
import { useAuthStore } from '~/stores/auth';
import { useTenantStore } from '~/stores/tenant';
import { AUTH_ERROR_MESSAGES } from '~/types/auth';
import type { LoginFormValues, LoginContextResponse } from '~/types/auth';

export function useAuth() {
  const authStore = useAuthStore();
  const tenantStore = useTenantStore();
  const router = useRouter();
  const route = useRoute();

  // ──────────────────────────────────────
  // セッション管理
  // ──────────────────────────────────────

  /** Better Auth のセッションを取得 */
  const session = authClient.useSession();

  /** セッションからストアを同期 */
  async function fetchSession() {
    authStore.setLoading(true);
    try {
      const { data } = await authClient.getSession();
      if (data?.user) {
        authStore.setUser({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          avatarUrl: data.user.image ?? null,
          emailVerified: data.user.emailVerified,
        });
      } else {
        authStore.setUser(null);
      }
    } catch {
      authStore.setUser(null);
    } finally {
      authStore.setLoading(false);
    }
  }

  // ──────────────────────────────────────
  // ログインコンテキスト
  // ──────────────────────────────────────

  /** login-context API を呼んでテナント・ロール情報を取得・セット */
  async function fetchLoginContext(): Promise<string> {
    const response = await $fetch<LoginContextResponse>('/api/v1/auth/login-context');
    const { tenant, role, redirectTo } = response.data;

    tenantStore.setTenantContext(tenant, role);

    return redirectTo;
  }

  /** ロール別リダイレクト先を決定（next パラメータ考慮） */
  function resolveRedirectPath(defaultRedirect: string): string {
    const next = route.query.next as string | undefined;

    // オープンリダイレクト防止: 同一オリジンのみ許可
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      return next;
    }

    return defaultRedirect;
  }

  // ──────────────────────────────────────
  // メール/パスワード ログイン
  // ──────────────────────────────────────

  /** メール/パスワードでログイン */
  async function login(values: LoginFormValues): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe,
      });

      if (error) {
        return { success: false, error: mapAuthError(error) };
      }

      if (!data?.user) {
        return { success: false, error: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS };
      }

      // ユーザー情報をストアにセット
      authStore.setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        avatarUrl: data.user.image ?? null,
        emailVerified: data.user.emailVerified,
      });

      // login-context でテナント・ロール取得
      try {
        const redirectTo = await fetchLoginContext();
        const finalRedirect = resolveRedirectPath(redirectTo);
        await router.push(finalRedirect);
        return { success: true };
      } catch (contextError: unknown) {
        const errorMessage = getContextErrorMessage(contextError);
        return { success: false, error: errorMessage };
      }
    } catch (err: unknown) {
      return { success: false, error: getNetworkErrorMessage(err) };
    }
  }

  // ──────────────────────────────────────
  // Google OAuth ログイン
  // ──────────────────────────────────────

  /** Google OAuth でログイン */
  async function loginWithGoogle() {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/login?oauth=success',
    });
  }

  /** OAuth コールバック処理（ログインページで呼ぶ） */
  async function handleOAuthCallback(): Promise<{ success: boolean; error?: string }> {
    const oauthResult = route.query.oauth as string | undefined;
    const oauthError = route.query.error as string | undefined;

    if (oauthError) {
      return { success: false, error: AUTH_ERROR_MESSAGES.OAUTH_CANCELLED };
    }

    if (oauthResult !== 'success') {
      return { success: false };
    }

    try {
      await fetchSession();

      if (!authStore.isAuthenticated) {
        return { success: false, error: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS };
      }

      const redirectTo = await fetchLoginContext();
      const finalRedirect = resolveRedirectPath(redirectTo);
      await router.push(finalRedirect);
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = getContextErrorMessage(err);
      return { success: false, error: errorMessage };
    }
  }

  // ──────────────────────────────────────
  // ログアウト
  // ──────────────────────────────────────

  /** ログアウト（AUTH-005 で拡張予定） */
  async function logout() {
    await authClient.signOut();
    authStore.reset();
    tenantStore.reset();
    await router.push('/login');
  }

  // ──────────────────────────────────────
  // エラーマッピング
  // ──────────────────────────────────────

  /** Better Auth のエラーをユーザーフレンドリーなメッセージに変換 */
  function mapAuthError(error: { message?: string; status?: number; code?: string }): string {
    const status = error.status;
    const code = error.code;

    if (status === 429) return AUTH_ERROR_MESSAGES.RATE_LIMITED;
    if (status === 423) return AUTH_ERROR_MESSAGES.ACCOUNT_LOCKED.replace('{minutes}', '30');
    if (code === 'ACCOUNT_DISABLED' || code === 'USER_DISABLED') return AUTH_ERROR_MESSAGES.ACCOUNT_DISABLED;

    return AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS;
  }

  /** login-context エラーのメッセージ取得 */
  function getContextErrorMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const httpErr = err as { statusCode: number; data?: { error?: { code?: string } } };
      if (httpErr.statusCode === 422) return AUTH_ERROR_MESSAGES.NO_TENANT;
      if (httpErr.statusCode === 401) return AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS;
    }
    return AUTH_ERROR_MESSAGES.SERVER_ERROR;
  }

  /** ネットワークエラーのメッセージ取得 */
  function getNetworkErrorMessage(err: unknown): string {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      return AUTH_ERROR_MESSAGES.NETWORK_ERROR;
    }
    return AUTH_ERROR_MESSAGES.SERVER_ERROR;
  }

  return {
    // State（リアクティブ）
    session,
    user: computed(() => authStore.user),
    isAuthenticated: computed(() => authStore.isAuthenticated),
    isLoading: computed(() => authStore.isLoading),
    currentTenant: computed(() => tenantStore.currentTenant),
    currentRole: computed(() => tenantStore.currentRole),

    // Actions
    login,
    loginWithGoogle,
    handleOAuthCallback,
    logout,
    fetchSession,
    fetchLoginContext,
  };
}
