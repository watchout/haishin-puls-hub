<!-- components/ai/PromptTemplateForm.vue -->
<!-- AI-001 §5.5: プロンプトテンプレート作成/編集フォーム -->

<script setup lang="ts">
import type { PromptTemplate, CreateTemplatePayload } from '~/composables/useAiTemplates'
import { renderPrompt, extractPlaceholders } from '~/server/utils/ai/prompt-renderer'

// ──────────────────────────────────────
// Props & Emits
// ──────────────────────────────────────

const props = defineProps<{
  open: boolean
  template: PromptTemplate | null
  isLoading: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: CreateTemplatePayload]
}>()

const isEditing = computed(() => props.template !== null)
const modalTitle = computed(() => isEditing.value ? 'テンプレート編集' : 'テンプレート新規作成')

// ──────────────────────────────────────
// フォーム状態
// ──────────────────────────────────────

const USECASE_OPTIONS = [
  { label: 'メール下書き', value: 'email_draft' },
  { label: 'スケジュール提案', value: 'schedule_suggest' },
  { label: '会場検索', value: 'venue_search' },
  { label: '簡易Q&A', value: 'quick_qa' },
]

const form = reactive({
  usecase: 'email_draft',
  name: '',
  systemPrompt: '',
  userPromptTemplate: '',
  variablesJson: '{}',
  temperature: 0.7,
  maxTokens: 2000,
})

const validationErrors = ref<Record<string, string>>({})

// テンプレートが変わったらフォームをリセット
watch(() => props.template, (template) => {
  if (template) {
    form.usecase = template.usecase
    form.name = template.name
    form.systemPrompt = template.systemPrompt
    form.userPromptTemplate = template.userPromptTemplate
    form.variablesJson = JSON.stringify(template.variables, null, 2)
    form.temperature = template.modelConfig.temperature
    form.maxTokens = template.modelConfig.maxTokens
  } else {
    resetForm()
  }
  clearErrors()
})

function resetForm() {
  form.usecase = 'email_draft'
  form.name = ''
  form.systemPrompt = ''
  form.userPromptTemplate = ''
  form.variablesJson = '{}'
  form.temperature = 0.7
  form.maxTokens = 2000
}

function clearErrors() {
  validationErrors.value = {}
}

// ──────────────────────────────────────
// バリデーション
// ──────────────────────────────────────

function validate(): boolean {
  clearErrors()

  const errors: Record<string, string> = {}

  if (!form.name.trim()) {
    errors.name = 'テンプレート名は必須です'
  } else if (form.name.length > 255) {
    errors.name = '255文字以内で入力してください'
  }

  if (!form.systemPrompt.trim()) {
    errors.systemPrompt = 'システムプロンプトは必須です'
  }

  if (!form.userPromptTemplate.trim()) {
    errors.userPromptTemplate = 'ユーザープロンプトは必須です'
  }

  try {
    JSON.parse(form.variablesJson)
  } catch {
    errors.variablesJson = '有効なJSONを入力してください'
  }

  if (form.temperature < 0 || form.temperature > 2) {
    errors.temperature = '0.0〜2.0の範囲で入力してください'
  }

  if (form.maxTokens < 1 || form.maxTokens > 4096) {
    errors.maxTokens = '1〜4096の範囲で入力してください'
  }

  validationErrors.value = errors
  return Object.keys(errors).length === 0
}

// ──────────────────────────────────────
// プレビュー
// ──────────────────────────────────────

const previewResult = ref<string | null>(null)
const previewError = ref<string | null>(null)

function handlePreview() {
  previewError.value = null
  previewResult.value = null

  try {
    const placeholders = extractPlaceholders(form.userPromptTemplate)
    if (placeholders.length === 0) {
      previewResult.value = form.userPromptTemplate
      return
    }

    // サンプル変数を自動生成
    const sampleVars: Record<string, Record<string, string>> = {}
    for (const placeholder of placeholders) {
      const parts = placeholder.split('.')
      const category = parts[0]
      const field = parts.slice(1).join('.')
      if (category && field) {
        if (!sampleVars[category]) sampleVars[category] = {}
        sampleVars[category][field] = `[${placeholder}]`
      }
    }

    previewResult.value = renderPrompt(form.userPromptTemplate, sampleVars)
  } catch (err) {
    previewError.value = err instanceof Error ? err.message : 'プレビューに失敗しました'
  }
}

// ──────────────────────────────────────
// 送信
// ──────────────────────────────────────

function handleSubmit() {
  if (!validate()) return

  const payload: CreateTemplatePayload = {
    usecase: form.usecase,
    name: form.name.trim(),
    systemPrompt: form.systemPrompt,
    userPromptTemplate: form.userPromptTemplate,
    variables: JSON.parse(form.variablesJson),
    modelConfig: {
      temperature: form.temperature,
      maxTokens: form.maxTokens,
    },
  }

  emit('submit', payload)
}
</script>

<template>
  <UModal
    :open="open"
    :title="modalTitle"
    :close="true"
    class="max-w-3xl"
    @close="emit('close')"
  >
    <template #body>
      <form class="space-y-6" @submit.prevent="handleSubmit">
        <!-- ユースケース -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            ユースケース
          </label>
          <USelect
            v-model="form.usecase"
            :items="USECASE_OPTIONS"
            :disabled="isEditing"
            class="w-full"
          />
        </div>

        <!-- テンプレート名 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            テンプレート名 <span class="text-red-500">*</span>
          </label>
          <UInput
            v-model="form.name"
            placeholder="例: メール下書きテンプレート v1"
            :color="validationErrors.name ? 'error' : undefined"
          />
          <p v-if="validationErrors.name" class="mt-1 text-sm text-red-500">
            {{ validationErrors.name }}
          </p>
        </div>

        <!-- システムプロンプト -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            システムプロンプト <span class="text-red-500">*</span>
          </label>
          <UTextarea
            v-model="form.systemPrompt"
            placeholder="LLMに渡される基本的な役割指示..."
            :rows="5"
            :color="validationErrors.systemPrompt ? 'error' : undefined"
          />
          <p v-if="validationErrors.systemPrompt" class="mt-1 text-sm text-red-500">
            {{ validationErrors.systemPrompt }}
          </p>
        </div>

        <!-- ユーザープロンプトテンプレート -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            ユーザープロンプトテンプレート <span class="text-red-500">*</span>
          </label>
          <UTextarea
            v-model="form.userPromptTemplate"
            placeholder="{{event.title}}について、{{user.name}}様向けに..."
            :rows="5"
            :color="validationErrors.userPromptTemplate ? 'error' : undefined"
          />
          <p class="mt-1 text-xs text-gray-400">
            変数は <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">&#123;&#123;category.field&#125;&#125;</code> 構文で参照
          </p>
          <p v-if="validationErrors.userPromptTemplate" class="mt-1 text-sm text-red-500">
            {{ validationErrors.userPromptTemplate }}
          </p>

          <!-- プレビューボタン -->
          <div class="mt-2">
            <UButton
              variant="outline"
              size="xs"
              icon="i-heroicons-eye"
              label="プレビュー"
              @click="handlePreview"
            />
            <div v-if="previewResult" class="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border text-sm whitespace-pre-wrap">
              {{ previewResult }}
            </div>
            <p v-if="previewError" class="mt-2 text-sm text-red-500">
              {{ previewError }}
            </p>
          </div>
        </div>

        <!-- 変数定義 (JSON) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            変数定義 (JSON)
          </label>
          <UTextarea
            v-model="form.variablesJson"
            :rows="6"
            class="font-mono text-sm"
            :color="validationErrors.variablesJson ? 'error' : undefined"
          />
          <p v-if="validationErrors.variablesJson" class="mt-1 text-sm text-red-500">
            {{ validationErrors.variablesJson }}
          </p>
        </div>

        <!-- モデル設定 -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Temperature (0.0〜2.0)
            </label>
            <UInput
              v-model.number="form.temperature"
              type="number"
              step="0.1"
              min="0"
              max="2"
              :color="validationErrors.temperature ? 'error' : undefined"
            />
            <p v-if="validationErrors.temperature" class="mt-1 text-sm text-red-500">
              {{ validationErrors.temperature }}
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Tokens (1〜4096)
            </label>
            <UInput
              v-model.number="form.maxTokens"
              type="number"
              min="1"
              max="4096"
              :color="validationErrors.maxTokens ? 'error' : undefined"
            />
            <p v-if="validationErrors.maxTokens" class="mt-1 text-sm text-red-500">
              {{ validationErrors.maxTokens }}
            </p>
          </div>
        </div>

        <!-- Submit -->
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <UButton
            variant="outline"
            color="neutral"
            label="キャンセル"
            @click="emit('close')"
          />
          <UButton
            type="submit"
            :label="isEditing ? '更新' : '作成'"
            :loading="isLoading"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
