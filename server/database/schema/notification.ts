import { pgTable, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { tenant } from './tenant';
import { event } from './event';
import { user } from './user';

// SSOT-4 §2.17: notification（通知）
export const notification = pgTable('notification', {
  id: varchar('id', { length: 26 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 26 }).notNull().references(() => tenant.id),
  userId: varchar('user_id', { length: 26 }).notNull().references(() => user.id), // 宛先
  eventId: varchar('event_id', { length: 26 }).references(() => event.id),
  type: varchar('type', { length: 50 }).notNull(), // task_reminder / event_update / system
  title: varchar('title', { length: 500 }).notNull(),
  body: text('body').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  sentVia: varchar('sent_via', { length: 50 }).notNull(), // in_app / email / both
  emailSentAt: timestamp('email_sent_at', { withTimezone: true }),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('notification_user_read_idx').on(table.userId, table.isRead),
  index('notification_tenant_idx').on(table.tenantId),
  index('notification_event_idx').on(table.eventId),
]);
