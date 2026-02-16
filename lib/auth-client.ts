// Better Auth クライアント
// AUTH-001 仕様書に基づくクライアントサイド認証
//
// 注意: Better Auth は baseURL にフルURLを要求する。
// 相対パス ('/api/auth') は SSR 時に "Invalid base URL" エラーになる。
// クライアントサイドでもフルURLを使うことで統一する。

import { createAuthClient } from 'better-auth/vue';
import { organizationClient, multiSessionClient } from 'better-auth/client/plugins';

function resolveBaseURL(): string {
  // SSR: 環境変数からベースURL取得
  if (import.meta.server) {
    return (process.env.NUXT_BETTER_AUTH_URL || 'http://localhost:4300') + '/api/auth';
  }
  // クライアント: window.location.origin を使ってフルURLを構築
  if (typeof window !== 'undefined') {
    return window.location.origin + '/api/auth';
  }
  // フォールバック
  return 'http://localhost:4300/api/auth';
}

export const authClient = createAuthClient({
  baseURL: resolveBaseURL(),
  plugins: [
    organizationClient(),
    // AUTH-009 §7.4: 同時セッション制限クライアント
    multiSessionClient(),
  ],
});
