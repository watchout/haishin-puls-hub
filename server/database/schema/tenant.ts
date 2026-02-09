import { pgTable, varchar, text, boolean, timestamp, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';

// SSOT-4 §2.1: tenant（テナント / 会場チェーン）
// Better Auth の Organization に対応
export const tenant = pgTable('tenant', {
  id: varchar('id', { length: 26 }).primaryKey(), // ULID
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  logoUrl: text('logo_url'),
  settings: jsonb('settings').notNull().default({}),
  plan: varchar('plan', { length: 50 }).notNull().default('pilot'), // pilot / standard / enterprise
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('tenant_slug_idx').on(table.slug),
]);
