import { pgTable, varchar, text, boolean, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { tenant } from './tenant';
import { event } from './event';
import { user } from './user';

// SSOT-4 §2.7: task（タスク）
export const task = pgTable('task', {
  id: varchar('id', { length: 26 }).primaryKey(),
  eventId: varchar('event_id', { length: 26 }).notNull().references(() => event.id),
  tenantId: varchar('tenant_id', { length: 26 }).notNull().references(() => tenant.id),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  assignedRole: varchar('assigned_role', { length: 50 }),
  assignedUserId: varchar('assigned_user_id', { length: 26 }).references(() => user.id),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending / in_progress / completed / skipped
  priority: varchar('priority', { length: 20 }).notNull().default('medium'), // high / medium / low
  relativeDay: integer('relative_day'), // D-30 = -30, D+1 = 1
  dueAt: timestamp('due_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  sortOrder: integer('sort_order').notNull().default(0),
  templateId: varchar('template_id', { length: 26 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('task_event_idx').on(table.eventId),
  index('task_tenant_idx').on(table.tenantId),
  index('task_assigned_user_idx').on(table.assignedUserId),
  index('task_event_status_idx').on(table.eventId, table.status),
  index('task_event_due_idx').on(table.eventId, table.dueAt),
]);

// SSOT-4 §2.8: task_template（タスクテンプレート）
export const taskTemplate = pgTable('task_template', {
  id: varchar('id', { length: 26 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 26 }).references(() => tenant.id), // NULL = システム共通
  eventType: varchar('event_type', { length: 50 }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  assignedRole: varchar('assigned_role', { length: 50 }).notNull(),
  relativeDay: integer('relative_day').notNull(),
  priority: varchar('priority', { length: 20 }).notNull().default('medium'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('task_template_event_type_idx').on(table.eventType),
  index('task_template_tenant_type_idx').on(table.tenantId, table.eventType),
]);
