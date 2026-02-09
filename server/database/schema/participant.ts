import { pgTable, varchar, text, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenant } from './tenant';
import { event } from './event';
import { user } from './user';

// SSOT-4 §2.10: participant（参加者）
export const participant = pgTable('participant', {
  id: varchar('id', { length: 26 }).primaryKey(),
  eventId: varchar('event_id', { length: 26 }).notNull().references(() => event.id),
  tenantId: varchar('tenant_id', { length: 26 }).notNull().references(() => tenant.id),
  userId: varchar('user_id', { length: 26 }).references(() => user.id),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  organization: varchar('organization', { length: 255 }),
  participationType: varchar('participation_type', { length: 50 }).notNull(), // onsite / online
  registrationStatus: varchar('registration_status', { length: 50 }).notNull().default('registered'), // registered / confirmed / cancelled
  qrCode: varchar('qr_code', { length: 255 }),
  customFields: jsonb('custom_fields'),
  registeredAt: timestamp('registered_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('participant_event_idx').on(table.eventId),
  index('participant_tenant_idx').on(table.tenantId),
  uniqueIndex('participant_qr_code_idx').on(table.qrCode),
  index('participant_event_email_idx').on(table.eventId, table.email),
]);

// SSOT-4 §2.11: checkin（チェックイン）
export const checkin = pgTable('checkin', {
  id: varchar('id', { length: 26 }).primaryKey(),
  participantId: varchar('participant_id', { length: 26 }).notNull().references(() => participant.id),
  eventId: varchar('event_id', { length: 26 }).notNull().references(() => event.id),
  tenantId: varchar('tenant_id', { length: 26 }).notNull().references(() => tenant.id),
  checkedInAt: timestamp('checked_in_at', { withTimezone: true }).notNull().defaultNow(),
  method: varchar('method', { length: 50 }).notNull(), // qr / manual / walk_in
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('checkin_event_idx').on(table.eventId),
  index('checkin_participant_idx').on(table.participantId),
]);
