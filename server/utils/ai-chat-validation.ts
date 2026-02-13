// EVT-050-051 AIチャット バリデーションスキーマ
// 仕様書: docs/design/features/project/EVT-050-051_ai-assistant-ui.md §3-F, §5

import { z } from 'zod'
import type { Role } from '~/types/auth'

// ──────────────────────────────────────
// 定数（§3-F 境界値）
// ──────────────────────────────────────

/** メッセージ最大文字数（§3-F: FR-050-4 は 2000, §5 は 4000 → §3-F の 4000 を採用） */
export const MAX_MESSAGE_LENGTH = 4000

/** メッセージ最小文字数 */
export const MIN_MESSAGE_LENGTH = 1

/** 会話タイトル最大文字数 */
export const MAX_TITLE_LENGTH = 200

/** 1会話あたりの最大メッセージ数 */
export const MAX_MESSAGES_PER_CONVERSATION = 200

/** 会話履歴取得 limit 上限 */
export const MAX_CONVERSATIONS_LIMIT = 100

/** 会話履歴取得 limit デフォルト */
export const DEFAULT_CONVERSATIONS_LIMIT = 20

/** レート制限: 1分あたりのリクエスト数 */
export const RATE_LIMIT_PER_MINUTE = 20

/** AI応答タイムアウト（秒） */
export const AI_TIMEOUT_SECONDS = 30

/** コンテキストウィンドウ上限（トークン） */
export const MAX_CONTEXT_TOKENS = 100_000

// ──────────────────────────────────────
// コンテキストタイプ
// ──────────────────────────────────────

export const CONTEXT_TYPES = [
  'event_detail',
  'task_list',
  'venue_management',
  'general',
] as const

export type ContextType = typeof CONTEXT_TYPES[number]

// ──────────────────────────────────────
// バリデーションスキーマ
// ──────────────────────────────────────

/** チャットメッセージ送信スキーマ（§5 POST /api/v1/ai/chat） */
export const chatMessageSchema = z.object({
  conversation_id: z.string().min(1).max(26).optional(),
  message: z.string()
    .min(MIN_MESSAGE_LENGTH, 'メッセージを入力してください')
    .max(MAX_MESSAGE_LENGTH, `メッセージは${MAX_MESSAGE_LENGTH}文字以内で入力してください`),
  context: z.object({
    type: z.enum(CONTEXT_TYPES),
    id: z.string().min(1).max(26).optional(),
    metadata: z.record(z.unknown()).optional(),
  }).optional(),
  stream: z.boolean().default(true),
})

export type ChatMessageInput = z.infer<typeof chatMessageSchema>

/** 会話一覧取得クエリスキーマ（§5 GET /api/v1/ai/conversations） */
export const conversationListQuerySchema = z.object({
  limit: z.coerce.number()
    .int()
    .min(1)
    .max(MAX_CONVERSATIONS_LIMIT)
    .default(DEFAULT_CONVERSATIONS_LIMIT),
  offset: z.coerce.number()
    .int()
    .min(0)
    .default(0),
  context_type: z.enum(CONTEXT_TYPES).optional(),
})

export type ConversationListQuery = z.infer<typeof conversationListQuerySchema>

/** 会話IDパラメータスキーマ */
export const conversationIdSchema = z.object({
  id: z.string().min(1).max(26),
})

// ──────────────────────────────────────
// AIメッセージ型定義（§4）
// ──────────────────────────────────────

/** Tool Call 定義 */
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string // JSON文字列
  }
}

/** Tool Call 結果 */
export interface ToolCallResult {
  tool_call_id: string
  result: unknown
}

/** AIメッセージ（会話内の各メッセージ） */
export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string // ISO 8601
  tool_calls?: ToolCall[]
  tool_call_results?: ToolCallResult[]
}

/** SSEイベント型 */
export type SSEEventType = 'text' | 'tool_call_start' | 'tool_call_result' | 'error' | 'done'

export interface SSEEvent {
  type: SSEEventType
  content?: string
  tool?: string
  args?: Record<string, unknown>
  result?: Record<string, unknown>
  code?: string
  message?: string
  conversation_id?: string
  tokens?: number
}

// ──────────────────────────────────────
// Tool Call 権限制御（§7.3）
// ──────────────────────────────────────

/** ツール名の一覧 */
export const TOOL_NAMES = [
  'create_event_draft',
  'generate_estimate',
  'generate_tasks',
  'search_venues',
  'send_notification',
  'update_venue_status',
  'update_streaming_status',
  'upload_slide',
] as const

export type ToolName = typeof TOOL_NAMES[number]

/** ロール別 Tool Call 権限マッピング */
export const TOOL_PERMISSIONS: Record<ToolName, Role[]> = {
  create_event_draft: ['system_admin', 'tenant_admin', 'organizer'],
  generate_estimate: ['system_admin', 'tenant_admin', 'organizer'],
  generate_tasks: ['system_admin', 'tenant_admin', 'organizer'],
  search_venues: ['system_admin', 'tenant_admin', 'organizer'],
  send_notification: ['system_admin', 'tenant_admin', 'organizer'],
  update_venue_status: ['system_admin', 'tenant_admin', 'venue_staff'],
  update_streaming_status: ['system_admin', 'tenant_admin', 'streaming_provider'],
  upload_slide: ['system_admin', 'tenant_admin', 'speaker'],
}

/**
 * Tool Call 権限チェック
 * @param role - ユーザーのロール
 * @param toolName - ツール名
 * @returns 権限があれば true
 */
export function hasToolPermission(role: Role, toolName: string): boolean {
  const allowedRoles = TOOL_PERMISSIONS[toolName as ToolName]
  if (!allowedRoles) return false
  return allowedRoles.includes(role)
}

/**
 * ロールに許可されたツール一覧を取得
 * @param role - ユーザーのロール
 * @returns 許可されたツール名の配列
 */
export function getToolsForRole(role: Role): ToolName[] {
  return TOOL_NAMES.filter(tool => hasToolPermission(role, tool))
}

// ──────────────────────────────────────
// ロール別情報スコープ（§7.1）
// ──────────────────────────────────────

/** ロール別アクセス可能な情報カテゴリ */
export const ROLE_SCOPE: Record<Role, string[]> = {
  system_admin: ['events', 'participants', 'tasks', 'estimates', 'venues', 'streaming', 'documents'],
  tenant_admin: ['events', 'participants', 'tasks', 'estimates', 'venues', 'streaming', 'documents'],
  organizer: ['events', 'participants', 'tasks', 'estimates', 'venues', 'documents'],
  venue_staff: ['venue_events', 'venue_layout', 'venue_equipment', 'venue_bookings'],
  streaming_provider: ['streaming_events', 'streaming_equipment', 'timetable'],
  event_planner: ['events', 'tasks', 'venues'],
  speaker: ['speaker_events', 'slides', 'timetable'],
  sales_marketing: ['events', 'participants'],
  participant: ['registered_events', 'tickets'],
  vendor: ['assigned_tasks'],
}
