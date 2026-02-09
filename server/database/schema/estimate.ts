import { pgTable, varchar, text, boolean, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { tenant } from './tenant';
import { event } from './event';
import { user } from './user';

// SSOT-4 §2.15: estimate（見積り）
export const estimate = pgTable('estimate', {
  id: varchar('id', { length: 26 }).primaryKey(),
  eventId: varchar('event_id', { length: 26 }).references(() => event.id),
  tenantId: varchar('tenant_id', { length: 26 }).notNull().references(() => tenant.id),
  title: varchar('title', { length: 500 }).notNull(),
  items: jsonb('items').notNull(), // [{name, quantity, unit_price, subtotal}]
  totalAmount: integer('total_amount').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft / sent / approved
  createdBy: varchar('created_by', { length: 26 }).notNull().references(() => user.id),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('estimate_event_idx').on(table.eventId),
  index('estimate_tenant_idx').on(table.tenantId),
]);

// SSOT-4 §2.16: streaming_package（配信パッケージマスタ）
export const streamingPackage = pgTable('streaming_package', {
  id: varchar('id', { length: 26 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 26 }).references(() => tenant.id), // NULL = 全テナント共通
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  items: jsonb('items').notNull(), // 構成内容
  basePrice: integer('base_price').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('streaming_package_tenant_idx').on(table.tenantId),
]);
