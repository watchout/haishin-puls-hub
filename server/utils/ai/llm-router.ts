// AI-001/003 §7.2-§7.4: LLMルーター
// ユースケース別モデル選択、フォールバック戦略、コスト計算
// Vercel AI SDK を使用した統一的なストリーミング

import { streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import type {
  LLMModelName,
  ModelConfig,
  AIUsage,
} from '~/types/ai';
import {
  LLM_MODELS,
  USECASE_MODEL_MAP,
  DEFAULT_MODEL,
  FALLBACK_CHAIN,
  MODEL_COST,
  AI_STREAMING_TIMEOUT_MS,
} from '~/types/ai';

// ──────────────────────────────────────
// プロバイダー初期化
// ──────────────────────────────────────

function getAnthropicProvider() {
  const config = useRuntimeConfig();
  return createAnthropic({
    apiKey: config.anthropicApiKey,
  });
}

function getOpenAIProvider() {
  const config = useRuntimeConfig();
  return createOpenAI({
    apiKey: config.openaiApiKey,
  });
}

// ──────────────────────────────────────
// モデル選択 (§7.2)
// ──────────────────────────────────────

/**
 * ユースケースに基づいてモデルを選択する。
 * マッピングに存在しない場合はデフォルトモデルを返す。
 */
export function selectModel(usecase: string): LLMModelName {
  return USECASE_MODEL_MAP[usecase] ?? DEFAULT_MODEL;
}

// ──────────────────────────────────────
// Vercel AI SDK モデルインスタンス取得
// ──────────────────────────────────────

function getAIModel(modelName: LLMModelName) {
  const modelDef = LLM_MODELS[modelName];

  if (modelDef.provider === 'anthropic') {
    const provider = getAnthropicProvider();
    return provider(modelName);
  }

  // openai
  const provider = getOpenAIProvider();
  return provider(modelName);
}

// ──────────────────────────────────────
// ストリーミングチャット (§3.2 + §7.3)
// ──────────────────────────────────────

export interface StreamChatOptions {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  usecase: string;
  modelConfig: ModelConfig;
  abortSignal?: AbortSignal;
}

export interface StreamChatResult {
  textStream: AsyncIterable<string>;
  modelName: LLMModelName;
  modelProvider: string;
  getUsage: () => Promise<AIUsage>;
}

/**
 * LLMにストリーミングチャットリクエストを送信する。
 * プライマリモデル失敗時はフォールバックチェーンに従う。
 */
export async function streamChat(
  options: StreamChatOptions,
): Promise<StreamChatResult> {
  const { systemPrompt, messages, usecase, modelConfig, abortSignal } = options;

  // ユースケースに基づいてプライマリモデルを選択
  const primaryModel = selectModel(usecase);

  // フォールバックチェーン構築: [プライマリ, ...残りのフォールバック候補]
  const chain = [primaryModel, ...FALLBACK_CHAIN.filter((m) => m !== primaryModel)];

  let lastError: Error | null = null;

  for (const modelName of chain) {
    try {
      const result = await attemptStream(modelName, systemPrompt, messages, modelConfig, abortSignal);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // フォールバックへ続行
    }
  }

  // 全プロバイダー失敗
  throw new AIProviderUnavailableError(lastError?.message);
}

/**
 * 単一モデルでストリーミングを試行する。
 */
async function attemptStream(
  modelName: LLMModelName,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  modelConfig: ModelConfig,
  abortSignal?: AbortSignal,
): Promise<StreamChatResult> {
  const model = getAIModel(modelName);
  const modelDef = LLM_MODELS[modelName];

  const result = streamText({
    model,
    system: systemPrompt,
    messages,
    temperature: modelConfig.temperature,
    maxTokens: modelConfig.maxTokens,
    abortSignal,
  });

  return {
    textStream: result.textStream,
    modelName,
    modelProvider: modelDef.provider,
    getUsage: async () => {
      const usage = await result.usage;
      const inputTokens = usage?.promptTokens ?? 0;
      const outputTokens = usage?.completionTokens ?? 0;
      return {
        inputTokens,
        outputTokens,
        estimatedCostJpy: calculateCost(inputTokens, outputTokens, modelName),
      };
    },
  };
}

// ──────────────────────────────────────
// コスト計算 (§7.4)
// ──────────────────────────────────────

/**
 * トークン使用量からコスト（円）を計算する。
 * 切り上げで整数値を返す。
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  modelName: LLMModelName,
): number {
  const cost = MODEL_COST[modelName];
  return Math.ceil(
    (inputTokens / 1000) * cost.input +
    (outputTokens / 1000) * cost.output,
  );
}

// ──────────────────────────────────────
// エラー
// ──────────────────────────────────────

export class AIProviderUnavailableError extends Error {
  readonly code = 'AI_PROVIDER_UNAVAILABLE';
  readonly statusCode = 503;
  constructor(cause?: string) {
    super(`All AI providers are currently unavailable${cause ? `: ${cause}` : ''}`);
    this.name = 'AIProviderUnavailableError';
  }
}

export class AITimeoutError extends Error {
  readonly code = 'AI_TIMEOUT';
  readonly statusCode = 504;
  constructor() {
    super(`AI response timed out after ${AI_STREAMING_TIMEOUT_MS / 1000} seconds`);
    this.name = 'AITimeoutError';
  }
}
