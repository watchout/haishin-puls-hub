// 認証関連型定義
// AUTH-001 仕様書に基づく

import { z } from 'zod';

// ──────────────────────────────────────
// バリデーションスキーマ
// ──────────────────────────────────────

/** ログインフォームバリデーション */
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'メールアドレスを入力してください' })
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください')
    .max(255),
  password: z
    .string({ required_error: 'パスワードを入力してください' })
    .min(1, 'パスワードを入力してください')
    .max(128),
  rememberMe: z.boolean().default(false),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/** サインアップフォームバリデーション（セルフ登録用） ACCT-001 §2 */
export const signupSchema = z.object({
  name: z
    .string({ required_error: '名前を入力してください' })
    .min(1, '名前を入力してください')
    .max(100, '名前は100文字以内で入力してください'),
  email: z
    .string({ required_error: 'メールアドレスを入力してください' })
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください')
    .max(255),
  password: z
    .string({ required_error: 'パスワードを入力してください' })
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(128),
  passwordConfirm: z
    .string({ required_error: 'パスワード（確認）を入力してください' })
    .min(1, 'パスワード（確認）を入力してください'),
  termsAccepted: z
    .boolean({ required_error: '利用規約に同意してください' })
    .refine((val) => val === true, '利用規約に同意してください'),
}).refine((data) => data.password === data.passwordConfirm, {
  message: 'パスワードが一致しません',
  path: ['passwordConfirm'],
});

export type SignupFormValues = z.infer<typeof signupSchema>;

/** 招待承認フォームバリデーション ACCT-001 §5.3 */
export const invitationAcceptSchema = z.object({
  name: z
    .string({ required_error: '名前を入力してください' })
    .min(1, '名前を入力してください')
    .max(100, '名前は100文字以内で入力してください'),
  password: z
    .string({ required_error: 'パスワードを入力してください' })
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(128),
  passwordConfirm: z
    .string({ required_error: 'パスワード（確認）を入力してください' })
    .min(1, 'パスワード（確認）を入力してください'),
  termsAccepted: z
    .boolean({ required_error: '利用規約に同意してください' })
    .refine((val) => val === true, '利用規約に同意してください'),
}).refine((data) => data.password === data.passwordConfirm, {
  message: 'パスワードが一致しません',
  path: ['passwordConfirm'],
});

export type InvitationAcceptFormValues = z.infer<typeof invitationAcceptSchema>;

// ──────────────────────────────────────
// API レスポンス型
// ──────────────────────────────────────

/** ロール定義 */
export const ROLES = [
  'system_admin',
  'tenant_admin',
  'organizer',
  'venue_staff',
  'streaming_provider',
  'event_planner',
  'speaker',
  'sales_marketing',
  'participant',
  'vendor',
] as const;

export type Role = typeof ROLES[number];

/** テナント情報（ログインコンテキスト用） */
export interface LoginContextTenant {
  id: string;
  name: string;
  slug: string;
}

/** login-context API レスポンス */
export interface LoginContextResponse {
  data: {
    tenant: LoginContextTenant;
    role: Role;
    redirectTo: string;
  };
}

/** login-context API エラーレスポンス */
export interface LoginContextError {
  error: {
    code: 'UNAUTHORIZED' | 'NO_TENANT';
    message: string;
  };
}

/** ACCT-001 §5: 招待情報取得レスポンス */
export interface InvitationInfoResponse {
  data: {
    email: string;
    role: string;
    tenant: LoginContextTenant;
  };
}

/** ACCT-001 §5.3: 招待承認レスポンス */
export interface InvitationAcceptResponse {
  data: {
    user: {
      id: string;
      email: string;
      name: string;
    };
    tenant: {
      id: string;
      name: string;
    };
    role: string;
    redirectTo: string;
  };
}

/** ACCT-001 §2.6: 招待 API エラーコード */
export type InvitationErrorCode =
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_ALREADY_USED'
  | 'VALIDATION_ERROR'
  | 'CONFLICT';

// ──────────────────────────────────────
// ロール別リダイレクト先
// ──────────────────────────────────────

/** AUTH-001 §2.1 ロール別リダイレクト先マッピング */
export const ROLE_REDIRECT_MAP: Record<Role, string> = {
  system_admin: '/app/admin',
  tenant_admin: '/app',
  organizer: '/app',
  venue_staff: '/app',
  streaming_provider: '/app',
  event_planner: '/app',
  speaker: '/app/events',
  sales_marketing: '/app',
  participant: '/app/events',
  vendor: '/app/events',
};

// ──────────────────────────────────────
// 認証状態
// ──────────────────────────────────────

/** 認証ストアの状態 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
}

/** 認証ユーザー情報 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
}

/** テナントストアの状態 */
export interface TenantState {
  currentTenant: LoginContextTenant | null;
  currentRole: Role | null;
}

// ──────────────────────────────────────
// エラーメッセージ定数
// ──────────────────────────────────────

/** AUTH-001 §8.1 フロントエンドエラーメッセージ */
export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'メールアドレスまたはパスワードが正しくありません',
  ACCOUNT_LOCKED: 'アカウントがロックされています。{minutes}分後に再試行してください',
  ACCOUNT_DISABLED: 'アカウントが無効化されています。サポートにお問い合わせください',
  NO_TENANT: '所属する組織がありません。管理者にお問い合わせください',
  RATE_LIMITED: 'しばらく時間をおいて再試行してください',
  OAUTH_CANCELLED: 'Google ログインがキャンセルされました',
  NETWORK_ERROR: '通信エラーが発生しました。再試行してください',
  SERVER_ERROR: 'システムエラーが発生しました。しばらく経ってから再試行してください',
} as const;

/** ACCT-001 §8.1 サインアップエラーメッセージ */
export const SIGNUP_ERROR_MESSAGES = {
  EMAIL_ALREADY_EXISTS: 'このメールアドレスは既に登録されています',
  INVITATION_NOT_FOUND: '招待リンクが無効です',
  INVITATION_EXPIRED: '招待リンクの有効期限が切れています。管理者に再招待をご依頼ください',
  INVITATION_ALREADY_USED: 'この招待リンクは既に使用されています',
  SIGNUP_FAILED: 'アカウント作成に失敗しました。再試行してください',
} as const;
