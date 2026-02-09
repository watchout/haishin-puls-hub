import { pgTable, varchar, text, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

// SSOT-4 §2.2: user（ユーザー）
// Better Auth の User に対応
// パスワードハッシュ等は Better Auth 管理テーブル（account, session）に格納
export const user = pgTable('user', {
  id: varchar('id', { length: 26 }).primaryKey(), // ULID
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  emailVerified: boolean('email_verified').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('user_email_idx').on(table.email),
]);
