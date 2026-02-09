import { pgTable, varchar, text, boolean, timestamp, integer, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenant } from './tenant';
import { venue } from './venue';
import { user } from './user';

// SSOT-4 §2.5: event（イベント）
export const event = pgTable('event', {
  id: varchar('id', { length: 26 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 26 }).notNull().references(() => tenant.id),
  venueId: varchar('venue_id', { length: 26 }).references(() => venue.id),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  eventType: varchar('event_type', { length: 50 }).notNull(), // seminar / presentation / internal / workshop
  format: varchar('format', { length: 50 }).notNull(), // onsite / online / hybrid
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft / planning / confirmed / ready / in_progress / completed / cancelled
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  capacityOnsite: integer('capacity_onsite'),
  capacityOnline: integer('capacity_online'),
  budgetMin: integer('budget_min'),
  budgetMax: integer('budget_max'),
  streamingUrl: text('streaming_url'),
  portalSlug: varchar('portal_slug', { length: 100 }),
  settings: jsonb('settings').notNull().default({}),
  aiGenerated: jsonb('ai_generated'),
  createdBy: varchar('created_by', { length: 26 }).notNull().references(() => user.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('event_tenant_idx').on(table.tenantId),
  index('event_tenant_status_idx').on(table.tenantId, table.status),
  index('event_tenant_start_idx').on(table.tenantId, table.startAt),
  uniqueIndex('event_portal_slug_idx').on(table.portalSlug),
]);

// SSOT-4 §2.6: event_member（イベント×関係者紐付）
export const eventMember = pgTable('event_member', {
  id: varchar('id', { length: 26 }).primaryKey(),
  eventId: varchar('event_id', { length: 26 }).notNull().references(() => event.id),
  userId: varchar('user_id', { length: 26 }).notNull().references(() => user.id),
  role: varchar('role', { length: 50 }).notNull(),
  tenantId: varchar('tenant_id', { length: 26 }).notNull().references(() => tenant.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('event_member_unique_idx').on(table.eventId, table.userId),
  index('event_member_tenant_idx').on(table.tenantId),
]);
