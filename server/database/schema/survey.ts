import { pgTable, varchar, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenant } from './tenant';
import { event } from './event';
import { participant } from './participant';

// SSOT-4 §2.12: survey（アンケート）
export const survey = pgTable('survey', {
  id: varchar('id', { length: 26 }).primaryKey(),
  eventId: varchar('event_id', { length: 26 }).notNull().references(() => event.id),
  tenantId: varchar('tenant_id', { length: 26 }).notNull().references(() => tenant.id),
  title: varchar('title', { length: 500 }).notNull(),
  questions: jsonb('questions').notNull(), // [{ id, type, text, options }]
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('survey_event_idx').on(table.eventId),
  index('survey_tenant_idx').on(table.tenantId),
]);

// SSOT-4 §2.13: survey_response（アンケート回答）
export const surveyResponse = pgTable('survey_response', {
  id: varchar('id', { length: 26 }).primaryKey(),
  surveyId: varchar('survey_id', { length: 26 }).notNull().references(() => survey.id),
  participantId: varchar('participant_id', { length: 26 }).references(() => participant.id),
  eventId: varchar('event_id', { length: 26 }).notNull().references(() => event.id),
  tenantId: varchar('tenant_id', { length: 26 }).notNull().references(() => tenant.id),
  answers: jsonb('answers').notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('survey_response_survey_idx').on(table.surveyId),
  index('survey_response_event_idx').on(table.eventId),
]);
