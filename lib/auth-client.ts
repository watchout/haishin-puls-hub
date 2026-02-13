// Better Auth クライアント
// AUTH-001 仕様書に基づくクライアントサイド認証

import { createAuthClient } from 'better-auth/vue';
import { organizationClient } from 'better-auth/client/plugins';

// SSR時はフルURLが必要（ブラウザのオリジンがないため）
const baseURL = import.meta.server
  ? (process.env.NUXT_BETTER_AUTH_URL || 'http://localhost:4300') + '/api/auth'
  : '/api/auth';

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    organizationClient(),
  ],
});
