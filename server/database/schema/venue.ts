import { pgTable, varchar, text, boolean, timestamp, integer, decimal, jsonb, index } from 'drizzle-orm/pg-core';
import { tenant } from './tenant';

// SSOT-4 §2.4: venue（会場 / 会議室）
export const venue = pgTable('venue', {
  id: varchar('id', { length: 26 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 26 }).notNull().references(() => tenant.id),
  name: varchar('name', { length: 255 }).notNull(),
  branchName: varchar('branch_name', { length: 255 }).notNull(),
  address: text('address').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  capacity: integer('capacity').notNull(),
  floorMapUrl: text('floor_map_url'),
  equipment: jsonb('equipment').notNull().default({}), // { projector: true, screen: true, mic_wireless: 2, lan_ports: 4 }
  wifiInfo: jsonb('wifi_info'), // { ssid: "VC-Guest", password: "xxx" }
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('venue_tenant_idx').on(table.tenantId),
  index('venue_tenant_branch_idx').on(table.tenantId, table.branchName),
]);
