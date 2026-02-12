// AI-001/003/008 §5.2: POST /api/v1/ai/generate/email
// メール本文生成（非ストリーミング）
// テンプレート usecase='email_draft' を使用してメール件名・本文を生成

import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { ulid } from 'ulid'
import { auth } from '~/server/utils/auth'
import { db } from '~/server/utils/db'
import { promptTemplate, aiConversation, userTenant } from '~/server/database/schema'
import type { ModelConfig } from '~/types/ai'
import { renderPrompt, validateVariables } from '~/server/utils/ai/prompt-renderer'
import { createPIIMasker } from '~/server/utils/ai/pii-masker'
import { streamChat, AIProviderUnavailableError, AITimeoutError } from '~/server/utils/ai/llm-router'
import { checkRateLimit } from '~/server/utils/ai/rate-limiter'

// ──────────────────────────────────────
// バリデーション
// ──────────────────────────────────────

const requestSchema = z.object({
  eventId: z.string().min(1),
  recipientType: z.enum(['speaker', 'participant', 'venue']),
  tone: z.enum(['formal', 'casual']).default('formal'),
  additionalInstructions: z.string().max(2000).optional(),
})

// ──────────────────────────────────────
// ハンドラー
// ──────────────────────────────────────

export default defineEventHandler(async (event) => {
  // 1. 認証チェック
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, data: { error: { code: 'UNAUTHORIZED', message: '認証が必要です' } } })
  }

  // 2. テナント取得
  const [membership] = await db
    .select({ tenantId: userTenant.tenantId })
    .from(userTenant)
    .where(and(eq(userTenant.userId, session.user.id), eq(userTenant.isDefault, true)))
    .limit(1)

  if (!membership) {
    throw createError({ statusCode: 422, data: { error: { code: 'NO_TENANT', message: 'テナントに所属していません' } } })
  }
  const tenantId = membership.tenantId

  // 3. レート制限チェック (§3-F: 20req/min)
  const rateLimitResult = checkRateLimit(tenantId, session.user.id)
  if (!rateLimitResult.allowed) {
    throw createError({
      statusCode: 429,
      data: {
        error: {
          code: 'AI_RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded. Max 20 requests per minute.',
          retryAfter: Math.ceil(rateLimitResult.retryAfterMs / 1000),
        },
      },
    })
  }

  // 4. リクエストバリデーション
  const body = await readBody(event)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid request' } },
    })
  }

  const { eventId, recipientType, tone, additionalInstructions } = parsed.data

  // 5. プロンプトテンプレート取得
  const [template] = await db
    .select()
    .from(promptTemplate)
    .where(and(eq(promptTemplate.usecase, 'email_draft'), eq(promptTemplate.isActive, true)))
    .limit(1)

  if (!template) {
    throw createError({
      statusCode: 404,
      data: { error: { code: 'TEMPLATE_NOT_FOUND', message: "No active template found for usecase 'email_draft'" } },
    })
  }

  // 6. 変数準備 + プロンプトレンダリング
  const variables: Record<string, Record<string, string>> = {
    event: { id: eventId },
    email: {
      recipientType,
      tone,
      additionalInstructions: additionalInstructions ?? '',
    },
  }

  let renderedUserPrompt: string
  try {
    const variablesDef = template.variables as Record<string, unknown> | null
    if (variablesDef && Object.keys(variablesDef).length > 0) {
      const validated = validateVariables(variablesDef as Parameters<typeof validateVariables>[0], variables)
      renderedUserPrompt = renderPrompt(template.userPromptTemplate, validated)
    } else {
      renderedUserPrompt = template.userPromptTemplate
    }
  } catch (error) {
    const err = error as Error & { code?: string }
    throw createError({
      statusCode: 400,
      data: { error: { code: err.code ?? 'VALIDATION_ERROR', message: err.message } },
    })
  }

  // 7. PIIマスキング
  const masker = createPIIMasker()
  const maskedPrompt = masker.mask(renderedUserPrompt)

  // 8. LLM呼び出し（非ストリーミング: テキスト全体を結合）
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: maskedPrompt },
  ]

  try {
    const modelConfig = template.modelConfig as ModelConfig
    const result = await streamChat({
      systemPrompt: template.systemPrompt,
      messages,
      usecase: 'email_draft',
      modelConfig,
    })

    // ストリームを全て消費して結合
    let fullResponse = ''
    for await (const chunk of result.textStream) {
      fullResponse += chunk
    }

    // PIIアンマスク
    const unmaskedResponse = masker.unmask(fullResponse)

    // 使用量取得
    const usage = await result.getUsage()

    // 会話履歴保存
    const conversationId = ulid()
    await db.insert(aiConversation).values({
      id: conversationId,
      tenantId,
      userId: session.user.id,
      eventId,
      messages: [
        { role: 'user', content: renderedUserPrompt },
        { role: 'assistant', content: unmaskedResponse },
      ],
      usecase: 'email_draft',
      modelProvider: result.modelProvider,
      modelName: result.modelName,
      totalInputTokens: usage.inputTokens,
      totalOutputTokens: usage.outputTokens,
      estimatedCostJpy: String(usage.estimatedCostJpy),
    })

    // レスポンス: subject と body を分離
    const { subject, body: emailBody } = parseEmailResponse(unmaskedResponse)

    masker.clear()

    return {
      subject,
      body: emailBody,
      conversationId,
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        estimatedCostJpy: usage.estimatedCostJpy,
      },
    }
  } catch (error) {
    masker.clear()

    if (error instanceof AIProviderUnavailableError) {
      throw createError({
        statusCode: 503,
        data: { error: { code: 'AI_SERVICE_UNAVAILABLE', message: 'All AI providers are currently unavailable. Please try again later.' } },
      })
    }
    if (error instanceof AITimeoutError) {
      throw createError({
        statusCode: 504,
        data: { error: { code: 'AI_TIMEOUT', message: 'AI response timed out after 60 seconds.' } },
      })
    }

    throw createError({
      statusCode: 500,
      data: { error: { code: 'AI_STREAMING_ERROR', message: (error as Error).message } },
    })
  }
})

// ──────────────────────────────────────
// ヘルパー
// ──────────────────────────────────────

/**
 * LLMレスポンスから件名と本文を分離
 * 「件名:」「Subject:」行がある場合はそれを件名として抽出
 */
function parseEmailResponse(response: string): { subject: string; body: string } {
  const lines = response.split('\n')
  let subject = ''
  let bodyStartIndex = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? ''
    const subjectMatch = line.match(/^(?:件名|Subject|タイトル)\s*[:：]\s*(.+)$/i)
    if (subjectMatch?.[1]) {
      subject = subjectMatch[1].trim()
      bodyStartIndex = i + 1
      // 件名の直後の空行をスキップ
      while (bodyStartIndex < lines.length && lines[bodyStartIndex]?.trim() === '') {
        bodyStartIndex++
      }
      break
    }
  }

  const body = lines.slice(bodyStartIndex).join('\n').trim()

  return {
    subject: subject || '（件名なし）',
    body: body || response,
  }
}
