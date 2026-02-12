// AI-001 §5.5: プロンプトテンプレート管理 Composable
// プロンプトテンプレートの CRUD 操作と状態管理を提供

import type { ModelConfig, VariableDefinition } from '~/types/ai'

// ──────────────────────────────────────
// 型定義
// ──────────────────────────────────────

export interface PromptTemplate {
  id: string
  usecase: string
  name: string
  systemPrompt: string
  userPromptTemplate: string
  variables: VariableDefinition
  modelConfig: ModelConfig
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateTemplatePayload {
  usecase: string
  name: string
  description?: string
  systemPrompt: string
  userPromptTemplate: string
  variables: Record<string, unknown>
  modelConfig: ModelConfig
}

interface TemplateListResponse {
  data: {
    templates: PromptTemplate[]
  }
}

interface TemplateResponse {
  data: {
    id: string
    usecase: string
    name: string
    version: number
    isActive: boolean
    createdAt: string
  }
}

// ──────────────────────────────────────
// Composable
// ──────────────────────────────────────

export function useAiTemplates() {
  const { showSuccess, showError } = useAppToast()

  const templates = ref<PromptTemplate[]>([])
  const isLoading = ref(false)
  const usecaseFilter = ref<string>('')
  const activeOnlyFilter = ref(false)

  /** テンプレート一覧を取得 */
  async function fetchTemplates() {
    isLoading.value = true
    try {
      const query: Record<string, string | boolean> = {}
      if (usecaseFilter.value) query.usecase = usecaseFilter.value
      if (activeOnlyFilter.value) query.activeOnly = true

      const response = await $fetch<TemplateListResponse>(
        '/api/v1/admin/ai/prompt-templates',
        { query },
      )
      templates.value = response.data.templates
    } catch (err) {
      showError('テンプレートの取得に失敗しました', extractErrorMessage(err))
      templates.value = []
    } finally {
      isLoading.value = false
    }
  }

  /** テンプレートを新規作成 */
  async function createTemplate(payload: CreateTemplatePayload) {
    isLoading.value = true
    try {
      const response = await $fetch<TemplateResponse>(
        '/api/v1/admin/ai/prompt-templates',
        { method: 'POST', body: payload },
      )
      showSuccess('テンプレートを作成しました')
      await fetchTemplates()
      return { data: response.data, error: null }
    } catch (err) {
      showError('テンプレートの作成に失敗しました', extractErrorMessage(err))
      return { data: null, error: err }
    } finally {
      isLoading.value = false
    }
  }

  /** テンプレートを更新（新バージョン作成） */
  async function updateTemplate(id: string, payload: CreateTemplatePayload) {
    isLoading.value = true
    try {
      const response = await $fetch<TemplateResponse>(
        `/api/v1/admin/ai/prompt-templates/${id}`,
        { method: 'PUT', body: payload },
      )
      showSuccess('テンプレートを更新しました')
      await fetchTemplates()
      return { data: response.data, error: null }
    } catch (err) {
      showError('テンプレートの更新に失敗しました', extractErrorMessage(err))
      return { data: null, error: err }
    } finally {
      isLoading.value = false
    }
  }

  /** アクティブ/非アクティブ状態で絞り込まれたテンプレート */
  const filteredTemplates = computed(() => {
    return templates.value
  })

  /** ユースケースの一覧（重複なし） */
  const availableUsecases = computed(() => {
    const usecases = new Set(templates.value.map(t => t.usecase))
    return [...usecases].sort()
  })

  return {
    templates: readonly(templates),
    filteredTemplates,
    availableUsecases,
    isLoading: readonly(isLoading),
    usecaseFilter,
    activeOnlyFilter,
    fetchTemplates,
    createTemplate,
    updateTemplate,
  }
}

// ──────────────────────────────────────
// ヘルパー
// ──────────────────────────────────────

function extractErrorMessage(err: unknown): string {
  if (err !== null && typeof err === 'object') {
    const fetchErr = err as {
      data?: { error?: { message?: string }; message?: string }
      message?: string
    }
    return fetchErr.data?.error?.message ?? fetchErr.data?.message ?? fetchErr.message ?? '不明なエラー'
  }
  return '不明なエラー'
}
