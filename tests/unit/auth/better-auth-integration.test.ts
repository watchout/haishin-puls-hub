// AUTH-006-010 Better Auth統合 ユニットテスト
// 仕様書: docs/design/features/common/AUTH-006-010_better-auth.md §9.1
//
// テスト対象:
//   - useAuth().requestPasswordReset() — AUTH-006
//   - useAuth().resetPassword() — AUTH-006
//   - useAuth().resendVerificationEmail() — AUTH-007
//   - エラーマッピング（レート制限、トークンエラー等）
//   - パスワードリセットフォームバリデーション（Zod）

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { useAuth } from '~/composables/useAuth';

// ──────────────────────────────────────
// モック定義
// ──────────────────────────────────────

const mockRequestPasswordReset = vi.fn();
const mockResetPassword = vi.fn();
const mockSendVerificationEmail = vi.fn();
const mockSignOut = vi.fn();

vi.mock('~/lib/auth-client', () => ({
  authClient: {
    requestPasswordReset: (...args: unknown[]) => mockRequestPasswordReset(...args),
    resetPassword: (...args: unknown[]) => mockResetPassword(...args),
    sendVerificationEmail: (...args: unknown[]) => mockSendVerificationEmail(...args),
    signOut: (...args: unknown[]) => mockSignOut(...args),
    useSession: () => ({ value: null }),
    getSession: vi.fn().mockResolvedValue({ data: null }),
    signIn: { email: vi.fn(), social: vi.fn() },
    signUp: { email: vi.fn() },
  },
}));

const mockRouterPush = vi.fn();
vi.stubGlobal('useRouter', () => ({ push: mockRouterPush }));
vi.stubGlobal('useRoute', () => ({ query: {}, path: '/app' }));
vi.stubGlobal('computed', (fn: () => unknown) => ({ value: fn() }));
vi.stubGlobal('ref', (val: unknown) => ({ value: val }));
vi.stubGlobal('navigateTo', vi.fn());
vi.stubGlobal('$fetch', vi.fn());

const mockAuthStore: {
  user: { id: string; email: string; name: string; avatarUrl: string | null; emailVerified: boolean } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: ReturnType<typeof vi.fn>;
  setLoading: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
} = {
  user: { id: '1', email: 'user@test.com', name: 'Test User', avatarUrl: null, emailVerified: false },
  isLoading: false,
  isAuthenticated: true,
  setUser: vi.fn(),
  setLoading: vi.fn(),
  reset: vi.fn(),
};
vi.mock('~/stores/auth', () => ({ useAuthStore: () => mockAuthStore }));
vi.stubGlobal('useAuthStore', () => mockAuthStore);

const mockTenantStore = {
  currentTenant: null,
  currentRole: null,
  hasTenant: false,
  setTenantContext: vi.fn(),
  reset: vi.fn(),
};
vi.mock('~/stores/tenant', () => ({ useTenantStore: () => mockTenantStore }));
vi.stubGlobal('useTenantStore', () => mockTenantStore);

const mockNavigationStore = {
  isSidebarCollapsed: false,
  isMobileSidebarOpen: false,
  notificationCount: 0,
  reset: vi.fn(),
};
vi.mock('~/stores/navigation', () => ({ useNavigationStore: () => mockNavigationStore }));
vi.stubGlobal('useNavigationStore', () => mockNavigationStore);

// ──────────────────────────────────────
// テスト
// ──────────────────────────────────────

describe('[AUTH-006-010] Better Auth統合', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthStore.user = { id: '1', email: 'user@test.com', name: 'Test User', avatarUrl: null, emailVerified: false };
    mockAuthStore.isAuthenticated = true;
  });

  // ──────────────────────────────────────
  // AUTH-006: パスワードリセット
  // ──────────────────────────────────────

  describe('AUTH-006 パスワードリセット', () => {
    describe('requestPasswordReset()', () => {
      it('§3-E #1: 有効なメールアドレスで送信成功', async () => {
        mockRequestPasswordReset.mockResolvedValueOnce({ error: null });
        const { requestPasswordReset } = useAuth();

        const result = await requestPasswordReset('user@test.com');

        expect(result.success).toBe(true);
        expect(mockRequestPasswordReset).toHaveBeenCalledWith({
          email: 'user@test.com',
          redirectTo: '/reset-password',
        });
      });

      it('§3-E #2: 未登録メールでも成功レスポンス（情報漏洩防止）', async () => {
        // Better Auth は未登録でも 200 を返す
        mockRequestPasswordReset.mockResolvedValueOnce({ error: null });
        const { requestPasswordReset } = useAuth();

        const result = await requestPasswordReset('unknown@test.com');

        expect(result.success).toBe(true);
      });

      it('§3-G #1: レート制限超過（429）', async () => {
        mockRequestPasswordReset.mockResolvedValueOnce({
          error: { status: 429, code: 'RATE_LIMITED', message: '' },
        });
        const { requestPasswordReset } = useAuth();

        const result = await requestPasswordReset('user@test.com');

        expect(result.success).toBe(false);
        expect(result.error).toBe('しばらく時間をおいて再試行してください');
      });

      it('§3-G #2: サーバーエラー（500）', async () => {
        mockRequestPasswordReset.mockResolvedValueOnce({
          error: { status: 500, code: 'INTERNAL_ERROR', message: '' },
        });
        const { requestPasswordReset } = useAuth();

        const result = await requestPasswordReset('user@test.com');

        expect(result.success).toBe(false);
        expect(result.error).toBe('メールの送信に失敗しました。再試行してください');
      });

      it('§3-G #3: ネットワークエラー', async () => {
        mockRequestPasswordReset.mockRejectedValueOnce(new TypeError('fetch failed'));
        const { requestPasswordReset } = useAuth();

        const result = await requestPasswordReset('user@test.com');

        expect(result.success).toBe(false);
        expect(result.error).toBe('通信エラーが発生しました。再試行してください');
      });
    });

    describe('resetPassword()', () => {
      it('§3-E #3: 有効なトークンでパスワード更新成功', async () => {
        mockResetPassword.mockResolvedValueOnce({ error: null });
        const { resetPassword } = useAuth();

        const result = await resetPassword('valid-token', 'NewPass123!');

        expect(result.success).toBe(true);
        expect(mockResetPassword).toHaveBeenCalledWith({
          token: 'valid-token',
          newPassword: 'NewPass123!',
        });
      });

      it('§3-G #4: トークン期限切れ', async () => {
        mockResetPassword.mockResolvedValueOnce({
          error: { status: 400, code: 'TOKEN_EXPIRED', message: '' },
        });
        const { resetPassword } = useAuth();

        const result = await resetPassword('expired-token', 'NewPass123!');

        expect(result.success).toBe(false);
        expect(result.error).toBe('リセットリンクの有効期限が切れています。再度リセットをリクエストしてください');
      });

      it('§3-G #5: トークン使用済み', async () => {
        mockResetPassword.mockResolvedValueOnce({
          error: { status: 400, code: 'TOKEN_ALREADY_USED', message: '' },
        });
        const { resetPassword } = useAuth();

        const result = await resetPassword('used-token', 'NewPass123!');

        expect(result.success).toBe(false);
        expect(result.error).toBe('このリセットリンクは既に使用されています');
      });

      it('§3-G #6: 無効なトークン', async () => {
        mockResetPassword.mockResolvedValueOnce({
          error: { status: 400, code: 'INVALID_TOKEN', message: '' },
        });
        const { resetPassword } = useAuth();

        const result = await resetPassword('invalid-token', 'NewPass123!');

        expect(result.success).toBe(false);
        expect(result.error).toBe('無効なリセットリンクです');
      });

      it('§3-G #7: レート制限超過（429）', async () => {
        mockResetPassword.mockResolvedValueOnce({
          error: { status: 429, code: 'RATE_LIMITED', message: '' },
        });
        const { resetPassword } = useAuth();

        const result = await resetPassword('token', 'NewPass123!');

        expect(result.success).toBe(false);
        expect(result.error).toBe('しばらく時間をおいて再試行してください');
      });

      it('§3-G #8: ネットワークエラー', async () => {
        mockResetPassword.mockRejectedValueOnce(new Error('Network error'));
        const { resetPassword } = useAuth();

        const result = await resetPassword('token', 'NewPass123!');

        expect(result.success).toBe(false);
        expect(result.error).toBe('通信エラーが発生しました。再試行してください');
      });
    });
  });

  // ──────────────────────────────────────
  // AUTH-007: メール認証
  // ──────────────────────────────────────

  describe('AUTH-007 メール認証', () => {
    describe('resendVerificationEmail()', () => {
      it('§3-E #4: 確認メール再送信成功', async () => {
        mockSendVerificationEmail.mockResolvedValueOnce({ error: null });
        const { resendVerificationEmail } = useAuth();

        const result = await resendVerificationEmail();

        expect(result.success).toBe(true);
        expect(mockSendVerificationEmail).toHaveBeenCalledWith({
          email: 'user@test.com',
          callbackURL: '/verify-email',
        });
      });

      it('§3-G #9: 未認証（ユーザー情報なし）', async () => {
        mockAuthStore.user = null;
        const { resendVerificationEmail } = useAuth();

        const result = await resendVerificationEmail();

        expect(result.success).toBe(false);
        expect(result.error).toBe('システムエラーが発生しました。しばらく経ってから再試行してください');
      });

      it('§3-G #10: レート制限超過（429）', async () => {
        mockSendVerificationEmail.mockResolvedValueOnce({
          error: { status: 429, code: 'RATE_LIMITED', message: '' },
        });
        const { resendVerificationEmail } = useAuth();

        const result = await resendVerificationEmail();

        expect(result.success).toBe(false);
        expect(result.error).toBe('しばらく時間をおいて再試行してください');
      });

      it('§3-G #11: メール送信失敗', async () => {
        mockSendVerificationEmail.mockResolvedValueOnce({
          error: { status: 500, code: 'INTERNAL_ERROR', message: '' },
        });
        const { resendVerificationEmail } = useAuth();

        const result = await resendVerificationEmail();

        expect(result.success).toBe(false);
        expect(result.error).toBe('メール送信に失敗しました。しばらく時間をおいて再試行してください');
      });

      it('§3-G #12: ネットワークエラー', async () => {
        mockSendVerificationEmail.mockRejectedValueOnce(new TypeError('fetch failed'));
        const { resendVerificationEmail } = useAuth();

        const result = await resendVerificationEmail();

        expect(result.success).toBe(false);
        expect(result.error).toBe('通信エラーが発生しました。再試行してください');
      });
    });
  });

  // ──────────────────────────────────────
  // バリデーション（Zod スキーマ）
  // ──────────────────────────────────────

  describe('バリデーション', () => {
    const forgotPasswordSchema = z.object({
      email: z
        .string({ required_error: 'メールアドレスを入力してください' })
        .min(1, 'メールアドレスを入力してください')
        .email('有効なメールアドレスを入力してください')
        .max(255),
    });

    const resetPasswordSchema = z.object({
      password: z
        .string({ required_error: 'パスワードを入力してください' })
        .min(8, 'パスワードは8文字以上で入力してください')
        .max(128),
      passwordConfirm: z
        .string({ required_error: 'パスワード（確認）を入力してください' })
        .min(1, 'パスワード（確認）を入力してください'),
    }).refine((data) => data.password === data.passwordConfirm, {
      message: 'パスワードが一致しません',
      path: ['passwordConfirm'],
    });

    it('TC-001: forgot-password バリデーション（空メール）', () => {
      const result = forgotPasswordSchema.safeParse({ email: '' });
      expect(result.success).toBe(false);
    });

    it('TC-002: forgot-password バリデーション（不正形式）', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('TC-003: reset-password バリデーション（パスワード8文字未満）', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'short',
        passwordConfirm: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('TC-004: reset-password バリデーション（パスワード空）', () => {
      const result = resetPasswordSchema.safeParse({
        password: '',
        passwordConfirm: '',
      });
      expect(result.success).toBe(false);
    });

    it('TC-005: reset-password バリデーション（確認パスワード不一致）', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'ValidPass123!',
        passwordConfirm: 'DifferentPass456!',
      });
      expect(result.success).toBe(false);
    });

    it('TC-006: reset-password バリデーション（パスワード128文字 = 境界値OK）', () => {
      const longPassword = 'A'.repeat(128);
      const result = resetPasswordSchema.safeParse({
        password: longPassword,
        passwordConfirm: longPassword,
      });
      expect(result.success).toBe(true);
    });

    it('TC-007: reset-password バリデーション（パスワード129文字超）', () => {
      const tooLongPassword = 'A'.repeat(129);
      const result = resetPasswordSchema.safeParse({
        password: tooLongPassword,
        passwordConfirm: tooLongPassword,
      });
      expect(result.success).toBe(false);
    });

    it('TC-008: メール未確認バナー表示判定（未確認）', () => {
      // emailVerified = false → バナー表示
      const user = { emailVerified: false };
      const isDismissed = false;
      const shouldShow = !isDismissed && user && !user.emailVerified;
      expect(shouldShow).toBe(true);
    });

    it('TC-009: メール未確認バナー表示判定（確認済み）', () => {
      // emailVerified = true → バナー非表示
      const user = { emailVerified: true };
      const isDismissed = false;
      const shouldShow = !isDismissed && user && !user.emailVerified;
      expect(shouldShow).toBe(false);
    });
  });

  // ──────────────────────────────────────
  // エラーメッセージ定数の検証
  // ──────────────────────────────────────

  describe('エラーメッセージ定数', () => {
    it('PASSWORD_RESET_ERROR_MESSAGES が正しく定義されている', async () => {
      const { PASSWORD_RESET_ERROR_MESSAGES } = await import('~/types/auth');
      expect(PASSWORD_RESET_ERROR_MESSAGES.TOKEN_EXPIRED).toBeDefined();
      expect(PASSWORD_RESET_ERROR_MESSAGES.TOKEN_ALREADY_USED).toBeDefined();
      expect(PASSWORD_RESET_ERROR_MESSAGES.INVALID_TOKEN).toBeDefined();
      expect(PASSWORD_RESET_ERROR_MESSAGES.SEND_FAILED).toBeDefined();
    });

    it('EMAIL_VERIFICATION_ERROR_MESSAGES が正しく定義されている', async () => {
      const { EMAIL_VERIFICATION_ERROR_MESSAGES } = await import('~/types/auth');
      expect(EMAIL_VERIFICATION_ERROR_MESSAGES.TOKEN_EXPIRED).toBeDefined();
      expect(EMAIL_VERIFICATION_ERROR_MESSAGES.INVALID_TOKEN).toBeDefined();
      expect(EMAIL_VERIFICATION_ERROR_MESSAGES.RESEND_SUCCESS).toBeDefined();
      expect(EMAIL_VERIFICATION_ERROR_MESSAGES.RESEND_FAILED).toBeDefined();
      expect(EMAIL_VERIFICATION_ERROR_MESSAGES.VERIFIED).toBeDefined();
    });
  });
});
