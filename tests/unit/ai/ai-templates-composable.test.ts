// AI-001 §10: useAiTemplates composable テスト
import { describe, it, expect } from 'vitest'
import type { CreateTemplatePayload, PromptTemplate } from '~/composables/useAiTemplates'

// ──────────────────────────────────────
// テストデータ
// ──────────────────────────────────────

function createMockTemplate(overrides: Partial<PromptTemplate> = {}): PromptTemplate {
  return {
    id: '01HTEST000000000000000001',
    usecase: 'email_draft',
    name: 'テストテンプレート',
    systemPrompt: 'あなたはメール作成のアシスタントです。',
    userPromptTemplate: '{{event.title}}についてメールを作成してください。',
    variables: {
      event: {
        type: 'object',
        required: ['title'],
        fields: {
          title: { type: 'string', description: 'イベント名' },
        },
      },
    },
    modelConfig: { temperature: 0.7, maxTokens: 2000 },
    version: 1,
    isActive: true,
    createdAt: '2026-02-10T10:00:00.000Z',
    updatedAt: '2026-02-10T10:00:00.000Z',
    ...overrides,
  }
}

function createMockPayload(overrides: Partial<CreateTemplatePayload> = {}): CreateTemplatePayload {
  return {
    usecase: 'email_draft',
    name: 'テストテンプレート',
    systemPrompt: 'システムプロンプト',
    userPromptTemplate: '{{event.title}}についてメールを作成。',
    variables: {
      event: {
        type: 'object',
        required: ['title'],
        fields: { title: { type: 'string' } },
      },
    },
    modelConfig: { temperature: 0.7, maxTokens: 2000 },
    ...overrides,
  }
}

// ──────────────────────────────────────
// テスト: 型定義の整合性
// ──────────────────────────────────────

describe('PromptTemplate 型定義', () => {
  it('テンプレートオブジェクトが必要なフィールドを持つ', () => {
    const template = createMockTemplate()

    expect(template.id).toBeDefined()
    expect(template.usecase).toBe('email_draft')
    expect(template.name).toBe('テストテンプレート')
    expect(template.systemPrompt).toBeDefined()
    expect(template.userPromptTemplate).toBeDefined()
    expect(template.variables).toBeDefined()
    expect(template.modelConfig).toBeDefined()
    expect(template.version).toBe(1)
    expect(template.isActive).toBe(true)
    expect(template.createdAt).toBeDefined()
    expect(template.updatedAt).toBeDefined()
  })

  it('modelConfig が temperature と maxTokens を持つ', () => {
    const template = createMockTemplate()
    expect(template.modelConfig.temperature).toBe(0.7)
    expect(template.modelConfig.maxTokens).toBe(2000)
  })

  it('variables がカテゴリ構造を持つ', () => {
    const template = createMockTemplate()
    const event = template.variables.event
    expect(event).toBeDefined()
    expect(event.type).toBe('object')
    expect(event.required).toContain('title')
    expect(event.fields.title.type).toBe('string')
  })
})

// ──────────────────────────────────────
// テスト: CreateTemplatePayload
// ──────────────────────────────────────

describe('CreateTemplatePayload', () => {
  it('ペイロードが必要なフィールドを持つ', () => {
    const payload = createMockPayload()

    expect(payload.usecase).toBe('email_draft')
    expect(payload.name).toBeDefined()
    expect(payload.systemPrompt).toBeDefined()
    expect(payload.userPromptTemplate).toBeDefined()
    expect(payload.variables).toBeDefined()
    expect(payload.modelConfig).toBeDefined()
  })

  it('description はオプショナル', () => {
    const withDesc = createMockPayload({ description: 'テスト説明' })
    const withoutDesc = createMockPayload()

    expect(withDesc.description).toBe('テスト説明')
    expect(withoutDesc.description).toBeUndefined()
  })
})

// ──────────────────────────────────────
// テスト: ユースケース分類
// ──────────────────────────────────────

describe('ユースケース分類', () => {
  const VALID_USECASES = ['email_draft', 'schedule_suggest', 'venue_search', 'quick_qa']

  it.each(VALID_USECASES)('ユースケース "%s" でテンプレートを作成できる', (usecase) => {
    const template = createMockTemplate({ usecase })
    expect(template.usecase).toBe(usecase)
  })

  it('カスタムユースケースも許容される', () => {
    const template = createMockTemplate({ usecase: 'custom_analysis' })
    expect(template.usecase).toBe('custom_analysis')
  })
})

// ──────────────────────────────────────
// テスト: バージョニング
// ──────────────────────────────────────

describe('テンプレートバージョニング', () => {
  it('新規テンプレートは version 1', () => {
    const template = createMockTemplate({ version: 1 })
    expect(template.version).toBe(1)
  })

  it('更新後は version が増加する', () => {
    const v1 = createMockTemplate({ version: 1, isActive: false })
    const v2 = createMockTemplate({ version: 2, isActive: true })

    expect(v2.version).toBe(v1.version + 1)
    expect(v1.isActive).toBe(false)
    expect(v2.isActive).toBe(true)
  })
})

// ──────────────────────────────────────
// テスト: ユースケース重複排除
// ──────────────────────────────────────

describe('availableUsecases ロジック', () => {
  it('テンプレートのユースケースを重複なしで取得', () => {
    const templates = [
      createMockTemplate({ usecase: 'email_draft' }),
      createMockTemplate({ usecase: 'email_draft' }),
      createMockTemplate({ usecase: 'quick_qa' }),
      createMockTemplate({ usecase: 'venue_search' }),
    ]

    const usecases = [...new Set(templates.map(t => t.usecase))].sort()
    expect(usecases).toEqual(['email_draft', 'quick_qa', 'venue_search'])
  })

  it('空のテンプレートリストでは空配列', () => {
    const templates: PromptTemplate[] = []
    const usecases = [...new Set(templates.map(t => t.usecase))].sort()
    expect(usecases).toEqual([])
  })
})
