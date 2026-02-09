import { pgTable, varchar, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { tenant } from './tenant';
import { event } from './event';
import { user } from './user';

// SSOT-4 §2.20: file_upload（ファイルアップロード）
export const fileUpload = pgTable('file_upload', {
  id: varchar('id', { length: 26 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 26 }).notNull().references(() => tenant.id),
  uploadedBy: varchar('uploaded_by', { length: 26 }).notNull().references(() => user.id),
  eventId: varchar('event_id', { length: 26 }).references(() => event.id),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // speaker / venue / event
  entityId: varchar('entity_id', { length: 26 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileType: varchar('file_type', { length: 100 }).notNull(), // MIME type
  fileSize: integer('file_size').notNull(), // bytes
  storagePath: text('storage_path').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('file_upload_tenant_idx').on(table.tenantId),
  index('file_upload_entity_idx').on(table.entityType, table.entityId),
]);
