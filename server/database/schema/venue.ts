import { pgTable, varchar, text, boolean, timestamp, integer, decimal, jsonb, index } from 'drizzle-orm/pg-core';
import { tenant } from './tenant';

// SSOT-4 §2.4: venue（会場 / 会議室）
// VENUE-001-004 §3-F: 境界値定義に準拠
export const venue = pgTable('venue', {
  id: varchar('id', { length: 26 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 26 }).notNull().references(() => tenant.id),
  name: varchar('name', { length: 200 }).notNull(),         // §3-F: 1-200文字
  branchName: varchar('branch_name', { length: 255 }),       // 支店名（任意）
  address: text('address'),                                   // §3-F: 500文字まで（任意）
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  capacity: integer('capacity'),                              // §3-F: 1-100,000
  hourlyRate: integer('hourly_rate'),                         // §3-F: 0以上（0=無料会場）、円単位
  phone: varchar('phone', { length: 20 }),                   // §3-F: 20文字まで
  description: text('description'),                           // §3-F: 5,000文字まで
  floorMapUrl: text('floor_map_url'),
  equipment: jsonb('equipment').notNull().default([]),        // [{name, quantity, note}]
  wifiInfo: jsonb('wifi_info'),                              // {ssid, password, bandwidth}
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('venue_tenant_idx').on(table.tenantId),
  index('venue_tenant_branch_idx').on(table.tenantId, table.branchName),
]);
