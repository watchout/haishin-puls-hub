// 認証 Composable
// AUTH-001 仕様書に基づく Better Auth クライアントラッパー

import { authClient } from '~/lib/auth-client';
import { useAuthStore } from '~/stores/auth';
import { useTenantStore } from '~/stores/tenant';
import { AUTH_ERROR_MESSAGES, SIGNUP_ERROR_MESSAGES, PASSWORD_RESET_ERROR_MESSAGES, EMAIL_VERIFICATION_ERROR_MESSAGES, ROLE_REDIRECT_MAP } from '~/types/auth';
import type { LoginFormValues, LoginContextResponse, SignupFormValues, InvitationAcceptFormValues, InvitationAcceptResponse, Role } from '~/types/auth';

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
  // サインアップ（ACCT-001）
  // ──────────────────────────────────────

  /** セルフ登録サインアップ（ACCT-001 §7.2） */
  async function signup(values: SignupFormValues): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      });

      if (error) {
        return { success: false, error: mapSignupError(error) };
      }

      if (!data?.user) {
        return { success: false, error: SIGNUP_ERROR_MESSAGES.SIGNUP_FAILED };
      }

      // ユーザー情報をストアにセット
      authStore.setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        avatarUrl: data.user.image ?? null,
        emailVerified: data.user.emailVerified,
      });

      // セルフ登録 → オンボーディングへ
      await router.push('/app/onboarding');
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: getNetworkErrorMessage(err) };
    }
  }

  /** 招待ベースサインアップ（ACCT-001 §7.1） */
  async function signupWithInvitation(values: InvitationAcceptFormValues): Promise<{ success: boolean; error?: string }> {
    const token = useRoute().query.token as string;

    try {
      const response = await $fetch<InvitationAcceptResponse>(
        `/api/v1/invitations/${token}/accept`,
        {
          method: 'POST',
          body: {
            name: values.name,
            password: values.password,
            termsAccepted: values.termsAccepted,
          },
        },
      );

      // ユーザー情報をストアにセット
      authStore.setUser({
        id: response.data.user.id,
        email: response.data.user.email,
        name: response.data.user.name,
        avatarUrl: null,
        emailVerified: false,
      });

      // テナント情報をストアにセット
      const role = response.data.role as Role;
      tenantStore.setTenantContext(
        { id: response.data.tenant.id, name: response.data.tenant.name, slug: '' },
        role,
      );

      // ロール別リダイレクト先に遷移
      const redirectTo = response.data.redirectTo ?? ROLE_REDIRECT_MAP[role] ?? '/app';
      await router.push(redirectTo);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: mapInvitationError(err) };
    }
  }

  /** Google OAuth でサインアップ（ACCT-001 §7.3） */
  async function signupWithGoogle() {
    const token = useRoute().query.token as string | undefined;

    await authClient.signIn.social({
      provider: 'google',
      callbackURL: token ? `/signup?token=${token}&oauth=success` : '/signup?oauth=success',
    });
  }

  // ──────────────────────────────────────
  // ログアウト
  // ──────────────────────────────────────

  /** ログアウト（AUTH-005 §7.1 準拠: エラーでもログアウトを完了させる） */
  async function logout() {
    try {
      await authClient.signOut();
    } catch {
      // ネットワークエラー等でも無視 — ローカル状態をクリアしてリダイレクト (§8.1)
    } finally {
      // 全ストアをリセット (§2.7 Gherkin: Piniaストアクリアシナリオ)
      authStore.reset();
      tenantStore.reset();
      const navigationStore = useNavigationStore();
      navigationStore.reset();
      await router.push('/login?reason=logout');
    }
  }

  // ──────────────────────────────────────
  // パスワードリセット（AUTH-006）
  // ──────────────────────────────────────

  /** パスワードリセットメール送信（AUTH-006 §7.1） */
  async function requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: '/reset-password',
      });

      if (error) {
        if (error.status === 429) return { success: false, error: AUTH_ERROR_MESSAGES.RATE_LIMITED };
        if (error.status === 500) return { success: false, error: PASSWORD_RESET_ERROR_MESSAGES.SEND_FAILED };
        // 情報漏洩防止: 未登録メールでも成功として扱う
      }

      // §7.1: 登録済み・未登録に関わらず同じ成功メッセージ
      return { success: true };
    } catch {
      return { success: false, error: AUTH_ERROR_MESSAGES.NETWORK_ERROR };
    }
  }

  /** パスワードリセット実行（AUTH-006 §7.1） */
  async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await authClient.resetPassword({
        newPassword,
        token,
      });

      if (error) {
        return { success: false, error: mapResetPasswordError(error) };
      }

      return { success: true };
    } catch {
      return { success: false, error: AUTH_ERROR_MESSAGES.NETWORK_ERROR };
    }
  }

  // ──────────────────────────────────────
  // メール認証（AUTH-007）
  // ──────────────────────────────────────

  /** 確認メール再送信（AUTH-007 §7.2） */
  async function resendVerificationEmail(): Promise<{ success: boolean; error?: string }> {
    if (!authStore.user?.email) {
      return { success: false, error: AUTH_ERROR_MESSAGES.SERVER_ERROR };
    }

    try {
      const { error } = await authClient.sendVerificationEmail({
        email: authStore.user.email,
        callbackURL: '/verify-email',
      });

      if (error) {
        if (error.status === 429) return { success: false, error: AUTH_ERROR_MESSAGES.RATE_LIMITED };
        return { success: false, error: EMAIL_VERIFICATION_ERROR_MESSAGES.RESEND_FAILED };
      }

      return { success: true };
    } catch {
      return { success: false, error: AUTH_ERROR_MESSAGES.NETWORK_ERROR };
    }
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

  /** サインアップエラーのマッピング */
  function mapSignupError(error: { message?: string; status?: number; code?: string }): string {
    if (error.status === 409) return SIGNUP_ERROR_MESSAGES.EMAIL_ALREADY_EXISTS;
    if (error.status === 429) return AUTH_ERROR_MESSAGES.RATE_LIMITED;
    return SIGNUP_ERROR_MESSAGES.SIGNUP_FAILED;
  }

  /** パスワードリセットエラーのマッピング（AUTH-006 §8.1） */
  function mapResetPasswordError(error: { message?: string; status?: number; code?: string }): string {
    const code = error.code;
    if (error.status === 429) return AUTH_ERROR_MESSAGES.RATE_LIMITED;
    if (code === 'TOKEN_EXPIRED') return PASSWORD_RESET_ERROR_MESSAGES.TOKEN_EXPIRED;
    if (code === 'TOKEN_ALREADY_USED') return PASSWORD_RESET_ERROR_MESSAGES.TOKEN_ALREADY_USED;
    if (code === 'INVALID_TOKEN' || error.status === 400) return PASSWORD_RESET_ERROR_MESSAGES.INVALID_TOKEN;
    return AUTH_ERROR_MESSAGES.SERVER_ERROR;
  }

  /** 招待 API エラーのマッピング */
  function mapInvitationError(err: unknown): string {
    if (err && typeof err === 'object' && 'data' in err) {
      const httpErr = err as { statusCode?: number; data?: { error?: { code?: string; message?: string } } };
      const code = httpErr.data?.error?.code;

      if (code === 'INVITATION_NOT_FOUND') return SIGNUP_ERROR_MESSAGES.INVITATION_NOT_FOUND;
      if (code === 'INVITATION_EXPIRED') return SIGNUP_ERROR_MESSAGES.INVITATION_EXPIRED;
      if (code === 'INVITATION_ALREADY_USED') return SIGNUP_ERROR_MESSAGES.INVITATION_ALREADY_USED;
      if (code === 'CONFLICT') return SIGNUP_ERROR_MESSAGES.EMAIL_ALREADY_EXISTS;
      if (httpErr.statusCode === 429) return AUTH_ERROR_MESSAGES.RATE_LIMITED;

      return httpErr.data?.error?.message ?? SIGNUP_ERROR_MESSAGES.SIGNUP_FAILED;
    }
    return getNetworkErrorMessage(err);
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
    signup,
    signupWithInvitation,
    signupWithGoogle,
    logout,
    fetchSession,
    fetchLoginContext,

    // AUTH-006: パスワードリセット
    requestPasswordReset,
    resetPassword,

    // AUTH-007: メール認証
    resendVerificationEmail,
  };
}
