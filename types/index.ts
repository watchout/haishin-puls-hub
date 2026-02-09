// 共有型定義
// 機能仕様書の型定義をここにエクスポートする

// 認証
export type {
  LoginFormValues,
  Role,
  LoginContextTenant,
  LoginContextResponse,
  LoginContextError,
  AuthState,
  AuthUser,
  TenantState,
} from './auth';

export {
  loginSchema,
  ROLES,
  ROLE_REDIRECT_MAP,
  AUTH_ERROR_MESSAGES,
} from './auth';
