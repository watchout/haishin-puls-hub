import { pgTable, varchar, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { user } from './user';
import { tenant } from './tenant';

// ACCT-001 §6: invitation（招待）
// 管理者がユーザーをテナントに招待するためのテーブル
// token は crypto.randomBytes(32).toString('hex') で生成（64文字 hex）
// 有効期限は作成から7日間
export const invitation = pgTable('invitation', {
  id: varchar('id', { length: 26 }).primaryKey(), // ULID
  email: varchar('email', { length: 255 }).notNull(),
  tenantId: varchar('tenant_id', { length: 26 }).notNull().references(() => tenant.id),
  role: varchar('role', { length: 50 }).notNull(),
  token: varchar('token', { length: 64 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending / accepted / expired
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  invitedBy: varchar('invited_by', { length: 26 }).notNull().references(() => user.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('invitation_token_idx').on(table.token),
  index('invitation_email_idx').on(table.email),
  index('invitation_tenant_idx').on(table.tenantId),
]);
