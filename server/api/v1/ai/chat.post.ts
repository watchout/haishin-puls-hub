// AI-001/003/008 §5.1: POST /api/v1/ai/chat
// AIチャットをSSEストリーミング形式で実行
// PII自動マスク → LLM呼び出し → PIIアンマスク → SSEで返却

import { eq, and } from 'drizzle-orm';
import { ulid } from 'ulid';
import { auth } from '~/server/utils/auth';
import { db } from '~/server/utils/db';
import { promptTemplate, aiConversation } from '~/server/database/schema';
import { aiChatRequestSchema, AI_STREAMING_TIMEOUT_MS } from '~/types/ai';
import type { ModelConfig, SSEMessage } from '~/types/ai';
import { renderPrompt, validateVariables } from '~/server/utils/ai/prompt-renderer';
import { createPIIMasker } from '~/server/utils/ai/pii-masker';
import { streamChat, AIProviderUnavailableError, AITimeoutError } from '~/server/utils/ai/llm-router';

export default defineEventHandler(async (event) => {
  // 1. 認証チェック
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session?.user) {
    throw createError({ statusCode: 401, data: { error: { code: 'UNAUTHORIZED', message: '認証が必要です' } } });
  }

  // 2. リクエストバリデーション
  const body = await readBody(event);
  const parsed = aiChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid request', details: parsed.error.issues } },
    });
  }

  const { usecase, variables, eventId, conversationId, userMessage } = parsed.data;

  // 3. テナント情報取得（login-context パターンに準拠）
  const userTenantModule = await import('~/server/database/schema').then((m) => m.userTenant);
  const memberships = await db
    .select({ tenantId: userTenantModule.tenantId })
    .from(userTenantModule)
    .where(and(eq(userTenantModule.userId, session.user.id), eq(userTenantModule.isDefault, true)))
    .limit(1);

  const tenantId = memberships[0]?.tenantId;
  if (!tenantId) {
    throw createError({ statusCode: 422, data: { error: { code: 'NO_TENANT', message: 'テナントに所属していません' } } });
  }

  // 4. プロンプトテンプレート取得 (§3.1)
  const [template] = await db
    .select()
    .from(promptTemplate)
    .where(
      and(
        eq(promptTemplate.usecase, usecase),
        eq(promptTemplate.isActive, true),
        // テナント固有 or システム共通
      ),
    )
    .limit(1);

  if (!template) {
    throw createError({
      statusCode: 404,
      data: { error: { code: 'TEMPLATE_NOT_FOUND', message: `No active template found for usecase '${usecase}'` } },
    });
  }

  // 5. 変数バリデーション + プロンプトレンダリング (§7.1)
  const variablesDef = template.variables as Record<string, unknown> | null;
  let renderedUserPrompt: string;

  try {
    if (variablesDef && Object.keys(variablesDef).length > 0) {
      const validated = validateVariables(variablesDef as Parameters<typeof validateVariables>[0], variables);
      renderedUserPrompt = renderPrompt(template.userPromptTemplate, validated);
    } else {
      renderedUserPrompt = template.userPromptTemplate;
    }
  } catch (error) {
    const err = error as Error & { code?: string };
    throw createError({
      statusCode: 400,
      data: { error: { code: err.code ?? 'VALIDATION_ERROR', message: err.message } },
    });
  }

  // 6. PIIマスキング (§3.3)
  const masker = createPIIMasker();
  const maskedUserPrompt = masker.mask(renderedUserPrompt);
  const maskedUserMessage = userMessage ? masker.mask(userMessage) : undefined;

  // 7. メッセージ構築
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // 既存会話コンテキストがあれば取得
  if (conversationId) {
    const [existing] = await db
      .select({ messages: aiConversation.messages })
      .from(aiConversation)
      .where(and(eq(aiConversation.id, conversationId), eq(aiConversation.tenantId, tenantId)))
      .limit(1);

    if (existing?.messages) {
      const prevMessages = existing.messages as Array<{ role: 'user' | 'assistant'; content: string }>;
      messages.push(...prevMessages);
    }
  }

  messages.push({ role: 'user', content: maskedUserPrompt });
  if (maskedUserMessage) {
    messages.push({ role: 'user', content: maskedUserMessage });
  }

  // 8. タイムアウト用 AbortController
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), AI_STREAMING_TIMEOUT_MS);

  // 9. SSE レスポンスストリーム
  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const encoder = new TextEncoder();

  const responseStream = new ReadableStream({
    async start(controller) {
      try {
        // 10. LLM ストリーミング呼び出し (§7.2, §7.3)
        const modelConfig = template.modelConfig as ModelConfig;
        const result = await streamChat({
          systemPrompt: template.systemPrompt,
          messages,
          usecase,
          modelConfig,
          abortSignal: abortController.signal,
        });

        let fullResponse = '';

        // 11. テキストチャンクをSSEで送信（PIIアンマスク付き）
        for await (const chunk of result.textStream) {
          const unmaskedChunk = masker.unmask(chunk);
          fullResponse += unmaskedChunk;

          const sseMessage: SSEMessage = { type: 'text', content: unmaskedChunk };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(sseMessage)}\n\n`));
        }

        // 12. 使用量取得 + コスト計算
        const usage = await result.getUsage();

        // 13. 会話履歴保存
        const newConversationId = conversationId ?? ulid();
        const allMessages = [
          ...messages.map((m) => ({ ...m, content: masker.unmask(m.content) })),
          { role: 'assistant' as const, content: fullResponse },
        ];

        if (conversationId) {
          await db
            .update(aiConversation)
            .set({
              messages: allMessages,
              totalInputTokens: usage.inputTokens,
              totalOutputTokens: usage.outputTokens,
              estimatedCostJpy: String(usage.estimatedCostJpy),
              updatedAt: new Date(),
            })
            .where(eq(aiConversation.id, conversationId));
        } else {
          await db.insert(aiConversation).values({
            id: newConversationId,
            tenantId,
            userId: session.user.id,
            eventId: eventId ?? null,
            messages: allMessages,
            usecase,
            modelProvider: result.modelProvider,
            modelName: result.modelName,
            totalInputTokens: usage.inputTokens,
            totalOutputTokens: usage.outputTokens,
            estimatedCostJpy: String(usage.estimatedCostJpy),
          });
        }

        // 14. 完了通知
        const doneMessage: SSEMessage = {
          type: 'done',
          conversationId: newConversationId,
          usage,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(doneMessage)}\n\n`));
      } catch (error) {
        const err = error as Error & { code?: string };
        let code = 'AI_STREAMING_ERROR';
        if (err instanceof AIProviderUnavailableError) code = 'AI_PROVIDER_UNAVAILABLE';
        if (err instanceof AITimeoutError || err.name === 'AbortError') code = 'AI_TIMEOUT';

        const errorMessage: SSEMessage = { type: 'error', code, message: err.message };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`));
      } finally {
        clearTimeout(timeout);
        masker.clear();
        controller.close();
      }
    },
  });

  return sendStream(event, responseStream);
});
