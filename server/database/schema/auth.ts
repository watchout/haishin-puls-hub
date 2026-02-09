import { pgTable, varchar, boolean, timestamp, index } from 'drizzle-orm/pg-core';

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
