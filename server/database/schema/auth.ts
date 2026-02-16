import { pgTable, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';

// ─── Better Auth 必須テーブル ───

// Better Auth: account（認証プロバイダー管理）
export const account = pgTable('account', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Better Auth: session（セッション管理）
export const session = pgTable('session', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Better Auth: verification（メール検証・パスワードリセット）
export const verification = pgTable('verification', {
  id: varchar('id', { length: 36 }).primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Organization plugin テーブル ───

export const organization = pgTable('organization', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }),
  logo: text('logo'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const member = pgTable('member', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  organizationId: varchar('organization_id', { length: 36 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('member'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const organizationInvitation = pgTable('invitation_org', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  organizationId: varchar('organization_id', { length: 36 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('member'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  inviterId: varchar('inviter_id', { length: 36 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

// ─── AUTH-001 固有テーブル ───

// AUTH-001 固有: login_attempts（ログイン試行ログ）
// ブルートフォース対策 + 監査ログ用
export const loginAttempts = pgTable('login_attempts', {
  id: varchar('id', { length: 26 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  userAgent: varchar('user_agent', { length: 500 }),
  success: boolean('success').notNull(),
  failureReason: varchar('failure_reason', { length: 50 }), // invalid_password / user_not_found / account_locked / account_disabled / oauth_error
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('login_attempts_email_created_idx').on(table.email, table.createdAt),
  index('login_attempts_ip_created_idx').on(table.ipAddress, table.createdAt),
]);
