// AI-001/003/008 §5.3: POST /api/v1/ai/generate/schedule
// スケジュール提案生成（非ストリーミング）
// テンプレート usecase='schedule_suggest' を使用

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
  constraints: z.object({
    startDate: z.string().refine((s) => !isNaN(Date.parse(s)), 'Invalid ISO8601 date'),
    endDate: z.string().refine((s) => !isNaN(Date.parse(s)), 'Invalid ISO8601 date'),
    excludeDates: z.array(z.string()).optional(),
  }),
  preferences: z.object({
    preferredDayOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    preferredTime: z.enum(['morning', 'afternoon', 'evening']).optional(),
  }).optional(),
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

  const { eventId, constraints, preferences } = parsed.data

  // 日付範囲バリデーション
  if (new Date(constraints.startDate) > new Date(constraints.endDate)) {
    throw createError({
      statusCode: 400,
      data: { error: { code: 'VALIDATION_ERROR', message: 'startDate must be before endDate' } },
    })
  }

  // 5. プロンプトテンプレート取得
  const [template] = await db
    .select()
    .from(promptTemplate)
    .where(and(eq(promptTemplate.usecase, 'schedule_suggest'), eq(promptTemplate.isActive, true)))
    .limit(1)

  if (!template) {
    throw createError({
      statusCode: 404,
      data: { error: { code: 'TEMPLATE_NOT_FOUND', message: "No active template found for usecase 'schedule_suggest'" } },
    })
  }

  // 6. 変数準備 + プロンプトレンダリング
  const DAY_NAMES = ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜']
  const TIME_LABELS: Record<string, string> = { morning: '午前', afternoon: '午後', evening: '夕方' }

  const preferredDays = preferences?.preferredDayOfWeek
    ?.map(d => DAY_NAMES[d])
    .filter(Boolean)
    .join('・') ?? '指定なし'

  const preferredTime = preferences?.preferredTime
    ? TIME_LABELS[preferences.preferredTime] ?? preferences.preferredTime
    : '指定なし'

  const variables: Record<string, Record<string, string>> = {
    event: { id: eventId },
    schedule: {
      startDate: constraints.startDate,
      endDate: constraints.endDate,
      excludeDates: constraints.excludeDates?.join(', ') ?? 'なし',
      preferredDays,
      preferredTime,
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

  // 8. LLM呼び出し
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: maskedPrompt },
  ]

  try {
    const modelConfig = template.modelConfig as ModelConfig
    const result = await streamChat({
      systemPrompt: template.systemPrompt,
      messages,
      usecase: 'schedule_suggest',
      modelConfig,
    })

    // ストリームを全て消費
    let fullResponse = ''
    for await (const chunk of result.textStream) {
      fullResponse += chunk
    }

    const unmaskedResponse = masker.unmask(fullResponse)
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
      usecase: 'schedule_suggest',
      modelProvider: result.modelProvider,
      modelName: result.modelName,
      totalInputTokens: usage.inputTokens,
      totalOutputTokens: usage.outputTokens,
      estimatedCostJpy: String(usage.estimatedCostJpy),
    })

    // レスポンス: JSON形式の提案を解析
    const suggestions = parseScheduleResponse(unmaskedResponse)

    masker.clear()

    return {
      suggestions,
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

interface ScheduleSuggestion {
  date: string
  reason: string
  score: number
}

/**
 * LLMレスポンスからスケジュール提案を解析
 * JSON配列またはテキスト形式を許容
 */
function parseScheduleResponse(response: string): ScheduleSuggestion[] {
  // JSON配列を検出して解析
  const jsonMatch = response.match(/\[[\s\S]*?\]/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item: unknown): item is Record<string, unknown> =>
            item !== null && typeof item === 'object',
          )
          .map((item) => ({
            date: String(item.date ?? ''),
            reason: String(item.reason ?? ''),
            score: typeof item.score === 'number' ? item.score : 50,
          }))
          .filter(s => s.date !== '')
      }
    } catch {
      // JSON解析失敗 → テキスト形式で処理
    }
  }

  // テキスト形式: 各行を提案として解析
  return response
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && /\d{4}/.test(line))
    .slice(0, 5)
    .map((line, index) => ({
      date: extractDate(line) ?? new Date().toISOString(),
      reason: line,
      score: Math.max(100 - index * 15, 25),
    }))
}

/**
 * テキスト行からISO日付を抽出
 */
function extractDate(text: string): string | null {
  // ISO8601形式
  const isoMatch = text.match(/(\d{4}-\d{2}-\d{2})/)
  if (isoMatch?.[1]) return isoMatch[1]

  // 日本語日付形式
  const jpMatch = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
  if (jpMatch?.[1] && jpMatch?.[2] && jpMatch?.[3]) {
    return `${jpMatch[1]}-${jpMatch[2].padStart(2, '0')}-${jpMatch[3].padStart(2, '0')}`
  }

  return null
}
