import { pgTable, varchar, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { user } from './user';
import { tenant } from './tenant';

// SSOT-4 §2.3: user_tenant（ユーザー×テナント紐付）
// Better Auth の Member に対応。1ユーザーが複数テナントに所属可能
//
// ロール定義:
// system_admin    - システム管理者（全テナントアクセス可）
// tenant_admin    - テナント管理者
// organizer       - セミナー主催者
// venue_staff     - 会場スタッフ
// streaming_provider - 動画配信業者
// event_planner   - イベント企画会社（代行）
// speaker         - 登壇者
// sales_marketing - 営業・マーケ
// participant     - 参加者（イベント単位で自動付与）
// vendor          - その他関連業者
export const userTenant = pgTable('user_tenant', {
  id: varchar('id', { length: 26 }).primaryKey(), // ULID
  userId: varchar('user_id', { length: 26 }).notNull().references(() => user.id),
  tenantId: varchar('tenant_id', { length: 26 }).notNull().references(() => tenant.id),
  role: varchar('role', { length: 50 }).notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('user_tenant_unique_idx').on(table.userId, table.tenantId),
  index('user_tenant_user_idx').on(table.userId),
  index('user_tenant_tenant_idx').on(table.tenantId),
]);
