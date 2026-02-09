import { pgTable, varchar, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { tenant } from './tenant';
import { event } from './event';
import { user } from './user';

// SSOT-4 §2.9: speaker（登壇者情報）
export const speaker = pgTable('speaker', {
  id: varchar('id', { length: 26 }).primaryKey(),
  eventId: varchar('event_id', { length: 26 }).notNull().references(() => event.id),
  tenantId: varchar('tenant_id', { length: 26 }).notNull().references(() => tenant.id),
  userId: varchar('user_id', { length: 26 }).references(() => user.id), // HUBユーザーの場合
  name: varchar('name', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }),
  organization: varchar('organization', { length: 255 }),
  bio: text('bio'),
  photoUrl: text('photo_url'),
  presentationTitle: varchar('presentation_title', { length: 500 }),
  startAt: timestamp('start_at', { withTimezone: true }),
  durationMinutes: integer('duration_minutes'),
  format: varchar('format', { length: 50 }), // onsite / online
  materialsUrl: text('materials_url'),
  submissionStatus: varchar('submission_status', { length: 50 }).notNull().default('pending'), // pending / submitted / confirmed
  aiGeneratedBio: text('ai_generated_bio'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('speaker_event_idx').on(table.eventId),
  index('speaker_tenant_idx').on(table.tenantId),
]);
