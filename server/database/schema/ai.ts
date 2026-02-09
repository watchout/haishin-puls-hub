import { pgTable, varchar, text, boolean, timestamp, integer, decimal, jsonb, index } from 'drizzle-orm/pg-core';
import { tenant } from './tenant';
import { event } from './event';
import { user } from './user';

// SSOT-4 §2.18: ai_conversation（AI会話ログ）
export const aiConversation = pgTable('ai_conversation', {
  id: varchar('id', { length: 26 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 26 }).notNull().references(() => tenant.id),
  userId: varchar('user_id', { length: 26 }).notNull().references(() => user.id),
  eventId: varchar('event_id', { length: 26 }).references(() => event.id),
  messages: jsonb('messages').notNull(), // [{role, content, timestamp}]
  usecase: varchar('usecase', { length: 100 }), // planning / faq / report
  modelProvider: varchar('model_provider', { length: 50 }).notNull(), // claude / openai
  modelName: varchar('model_name', { length: 100 }).notNull(),
  totalInputTokens: integer('total_input_tokens').notNull().default(0),
  totalOutputTokens: integer('total_output_tokens').notNull().default(0),
  estimatedCostJpy: decimal('estimated_cost_jpy', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ai_conversation_tenant_user_idx').on(table.tenantId, table.userId),
  index('ai_conversation_event_idx').on(table.eventId),
  index('ai_conversation_created_idx').on(table.createdAt),
]);

// SSOT-4 §2.19: prompt_template（プロンプトテンプレート）
export const promptTemplate = pgTable('prompt_template', {
  id: varchar('id', { length: 26 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 26 }).references(() => tenant.id), // NULL = システム共通
  usecase: varchar('usecase', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  systemPrompt: text('system_prompt').notNull(),
  userPromptTemplate: text('user_prompt_template').notNull(), // {{event.title}}, {{user.name}} 等
  variables: jsonb('variables'), // 利用可能な変数定義
  modelConfig: jsonb('model_config').notNull(), // { provider, model, temperature, max_tokens }
  version: integer('version').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('prompt_template_usecase_active_idx').on(table.usecase, table.isActive),
  index('prompt_template_tenant_idx').on(table.tenantId),
]);
