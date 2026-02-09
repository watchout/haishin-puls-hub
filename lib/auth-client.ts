// Better Auth クライアント
// AUTH-001 仕様書に基づくクライアントサイド認証

import { createAuthClient } from 'better-auth/vue';
import { organizationClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: '/api/auth',
  plugins: [
    organizationClient(),
  ],
});
