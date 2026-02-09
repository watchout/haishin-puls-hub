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
