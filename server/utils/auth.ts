// Better Auth サーバー設定
// AUTH-001 仕様書 §12.3 に基づく設定

import { betterAuth } from 'better-auth';
import { organization } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import * as schema from '../database/schema';

export const auth = betterAuth({
  baseURL: process.env.NUXT_BETTER_AUTH_URL || 'http://localhost:4300',
  secret: process.env.NUXT_BETTER_AUTH_SECRET || '',

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      account: schema.account,
      session: schema.session,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      // AUTH-006: パスワードリセットメール送信
      // TODO: Resend 等のメールサービスに差し替え
      console.info(`[AUTH] Password reset email for ${user.email}: ${url}`);
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // AUTH-007: メール認証メール送信
      // TODO: Resend 等のメールサービスに差し替え
      console.info(`[AUTH] Verification email for ${user.email}: ${url}`);
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,          // 7日（デフォルト）
    updateAge: 60 * 60 * 24,              // 1日ごとにセッション更新
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,                     // 5分間のクッキーキャッシュ
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },

  plugins: [
    organization(),
  ],
});

// サーバーサイドの型定義をエクスポート
export type Auth = typeof auth;
