// AI-001/003/008: AIプラットフォーム基盤 型定義
// プロンプト管理、ストリーミング、PII対策

import { z } from 'zod';

// ──────────────────────────────────────
// モデル定義 (§7.2)
// ──────────────────────────────────────

/** 対応LLMプロバイダー */
export const LLM_PROVIDERS = ['anthropic', 'openai'] as const;
export type LLMProvider = typeof LLM_PROVIDERS[number];

/** 対応モデル名 */
export const LLM_MODELS = {
  'claude-sonnet-4-5': { provider: 'anthropic' as const, label: 'Claude Sonnet 4.5' },
  'claude-haiku-3-5': { provider: 'anthropic' as const, label: 'Claude Haiku 3.5' },
  'gpt-4o': { provider: 'openai' as const, label: 'GPT-4o' },
} as const;

export type LLMModelName = keyof typeof LLM_MODELS;

/** ユースケース別モデルマッピング (§7.2) */
export const USECASE_MODEL_MAP: Record<string, LLMModelName> = {
  email_draft: 'claude-sonnet-4-5',
  schedule_suggest: 'claude-sonnet-4-5',
  venue_search: 'claude-haiku-3-5',
  quick_qa: 'claude-haiku-3-5',
};

/** デフォルトモデル */
export const DEFAULT_MODEL: LLMModelName = 'claude-sonnet-4-5';

/** フォールバック順序 (§7.3) */
export const FALLBACK_CHAIN: LLMModelName[] = ['claude-sonnet-4-5', 'gpt-4o'];

// ──────────────────────────────────────
// コスト計算 (§7.4)
// ──────────────────────────────────────

/** モデル別コスト (円/1Kトークン) */
export const MODEL_COST: Record<LLMModelName, { input: number; output: number }> = {
  'claude-sonnet-4-5': { input: 0.45, output: 2.25 },
  'claude-haiku-3-5': { input: 0.12, output: 0.75 },
  'gpt-4o': { input: 0.75, output: 2.25 },
};

// ──────────────────────────────────────
// レート制限 (§3-F)
// ──────────────────────────────────────

/** レート制限設定 */
export const AI_RATE_LIMIT = {
  maxRequests: 20,
  windowMs: 60 * 1000, // 1分
} as const;

/** ストリーミングタイムアウト (§3-F) */
export const AI_STREAMING_TIMEOUT_MS = 60 * 1000; // 60秒

/** プロンプト最大文字数 (§3-F) */
export const AI_PROMPT_MAX_LENGTH = 4000;

/** 会話履歴最大メッセージ数 (§3-F) */
export const AI_CONVERSATION_MAX_MESSAGES = 200;

// ──────────────────────────────────────
// SSEメッセージ型 (§5.1)
// ──────────────────────────────────────

export type SSEMessage =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; id: string; name: string; args: Record<string, unknown> }
  | { type: 'tool_result'; id: string; result: unknown }
  | { type: 'done'; conversationId: string; usage: AIUsage }
  | { type: 'error'; code: string; message: string };

/** トークン使用量 */
export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedCostJpy: number;
  cached?: boolean;
}

// ──────────────────────────────────────
// 変数定義 (§4.3)
// ──────────────────────────────────────

/** 変数フィールド定義 */
export interface VariableFieldDefinition {
  type: 'string' | 'number' | 'boolean' | 'date';
  description?: string;
  default?: string | number | boolean;
}

/** 変数カテゴリ定義 */
export interface VariableCategoryDefinition {
  type: 'object';
  required: string[];
  fields: Record<string, VariableFieldDefinition>;
}

/** 変数定義全体 */
export type VariableDefinition = Record<string, VariableCategoryDefinition>;

// ──────────────────────────────────────
// モデル設定 (§4.4)
// ──────────────────────────────────────

export interface ModelConfig {
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// ──────────────────────────────────────
// バリデーションスキーマ (§5.1)
// ──────────────────────────────────────

/** AI チャットリクエスト */
export const aiChatRequestSchema = z.object({
  usecase: z.string().min(1).max(100),
  variables: z.record(z.unknown()).default({}),
  eventId: z.string().optional(),
  conversationId: z.string().optional(),
  userMessage: z.string().max(AI_PROMPT_MAX_LENGTH).optional(),
});

export type AIChatRequest = z.infer<typeof aiChatRequestSchema>;

/** モデル設定バリデーション */
export const modelConfigSchema = z.object({
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(1).max(4096),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().optional(),
  presencePenalty: z.number().optional(),
});

/** プロンプトテンプレート作成リクエスト */
export const createPromptTemplateSchema = z.object({
  usecase: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  systemPrompt: z.string().min(1),
  userPromptTemplate: z.string().min(1),
  variables: z.record(z.unknown()),
  modelConfig: modelConfigSchema,
});

export type CreatePromptTemplateRequest = z.infer<typeof createPromptTemplateSchema>;

// ──────────────────────────────────────
// エラーコード (§9.1)
// ──────────────────────────────────────

export const AI_ERROR_CODES = {
  PROMPT_TEMPLATE_NOT_FOUND: { status: 404, message: 'No active template found for this usecase' },
  VARIABLE_NOT_FOUND: { status: 400, message: 'Required variable not found in template' },
  REQUIRED_VARIABLE_MISSING: { status: 400, message: 'Required variable is missing' },
  VARIABLE_TYPE_MISMATCH: { status: 400, message: 'Variable type does not match definition' },
  AI_PROVIDER_UNAVAILABLE: { status: 503, message: 'All AI providers are currently unavailable' },
  AI_RATE_LIMIT_EXCEEDED: { status: 429, message: 'Rate limit exceeded' },
  AI_STREAMING_ERROR: { status: 500, message: 'Streaming error occurred' },
  AI_TIMEOUT: { status: 504, message: 'AI response timed out' },
  PII_MASKING_ERROR: { status: 500, message: 'PII masking failed' },
  CONVERSATION_NOT_FOUND: { status: 404, message: 'Conversation not found' },
  TOKEN_LIMIT_EXCEEDED: { status: 402, message: 'Daily token limit exceeded' },
} as const;

export type AIErrorCode = keyof typeof AI_ERROR_CODES;

// ──────────────────────────────────────
// PII マスキング型 (§3.3 / §7.6)
// ──────────────────────────────────────

/** PII カテゴリ */
export type PIICategory = 'NAME' | 'EMAIL' | 'PHONE';

/** マスクマッピングエントリ */
export interface PIIMaskEntry {
  category: PIICategory;
  index: number;
  original: string;
  masked: string;
}

/** マスク結果 */
export interface PIIMaskResult {
  maskedText: string;
  entries: PIIMaskEntry[];
}
