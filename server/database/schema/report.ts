import { pgTable, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenant } from './tenant';
import { event } from './event';

// SSOT-4 §2.14: event_report（イベントレポート）
export const eventReport = pgTable('event_report', {
  id: varchar('id', { length: 26 }).primaryKey(),
  eventId: varchar('event_id', { length: 26 }).notNull().references(() => event.id),
  tenantId: varchar('tenant_id', { length: 26 }).notNull().references(() => tenant.id),
  reportType: varchar('report_type', { length: 50 }).notNull(), // summary / proposal / follow_up
  content: text('content').notNull(), // Markdown
  metadata: jsonb('metadata'), // 集計データ（参加者数等）
  generatedBy: varchar('generated_by', { length: 50 }).notNull(), // ai / manual
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft / published
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('event_report_event_idx').on(table.eventId),
  index('event_report_tenant_idx').on(table.tenantId),
]);
