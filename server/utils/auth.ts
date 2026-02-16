// Better Auth サーバー設定
// AUTH-001 §12.3 + AUTH-006-010 §7/§12 に基づく設定

import { betterAuth } from 'better-auth';
import { organization, multiSession } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createConsola } from 'consola';
import { db } from './db';
import * as schema from '../database/schema';

/** 認証モジュール専用ロガー（console.log/info 禁止のためconsola使用） */
const logger = createConsola({ defaults: { tag: 'auth' } });

/** メールアドレスをマスク（例: u***@example.com）— §8.2 セキュリティ要件 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  return `${local[0]}***@${domain}`;
}

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

  // ──────────────────────────────────────
  // AUTH-006: パスワードリセット
  // AUTH-001: メール/パスワード認証
  // ──────────────────────────────────────
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // AUTH-007 §1.3: 未確認でもログイン可能
    resetPasswordTokenExpiresIn: 60 * 60, // 1時間（§7.1: 有効期限1時間）
    revokeSessionsOnPasswordReset: true, // AC-006-005: リセット後に全セッション無効化
    sendResetPassword: async ({ user, url }) => {
      // AUTH-006 §7.1: パスワードリセットメール送信
      // TODO: Resend 等のメールサービスに差し替え（MVP では開発ログのみ）
      logger.info(`Password reset email sent to ${maskEmail(user.email)}`);
      logger.debug(`Reset URL: ${url}`);
    },
  },

  // ──────────────────────────────────────
  // AUTH-007: メール認証
  // ──────────────────────────────────────
  emailVerification: {
    sendOnSignUp: true, // §7.2: サインアップ時に自動送信
    autoSignInAfterVerification: true, // §7.2: 認証成功後に自動ログイン
    sendVerificationEmail: async ({ user, url }) => {
      // AUTH-007 §7.2: 確認メール送信
      // TODO: Resend 等のメールサービスに差し替え（MVP では開発ログのみ）
      logger.info(`Verification email sent to ${maskEmail(user.email)}`);
      logger.debug(`Verification URL: ${url}`);
    },
  },

  // ──────────────────────────────────────
  // AUTH-009/010: セッション管理・自動更新
  // ──────────────────────────────────────
  session: {
    expiresIn: 60 * 60 * 24 * 7, // §7.4: デフォルト7日（rememberMe=false）
    updateAge: 60 * 60 * 24, // §7.5: 1日ごとにセッション更新（AUTH-010）
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // §7.4: 5分間のクッキーキャッシュ
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
    // AUTH-009 §7.4: 同時セッション制限（最大3、超過時は最古を無効化）
    multiSession({
      maximumSessions: 3,
    }),
  ],
});

// サーバーサイドの型定義をエクスポート
export type Auth = typeof auth;
