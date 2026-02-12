<!-- pages/admin/ai/prompt-templates.vue -->
<!-- AI-001 §5.5: プロンプトテンプレート管理ダッシュボード -->

<script setup lang="ts">
import type { PromptTemplate, CreateTemplatePayload } from '~/composables/useAiTemplates'

definePageMeta({
  layout: 'dashboard',
})

const {
  filteredTemplates,
  availableUsecases,
  isLoading,
  usecaseFilter,
  activeOnlyFilter,
  fetchTemplates,
  createTemplate,
  updateTemplate,
} = useAiTemplates()

// ──────────────────────────────────────
// モーダル制御
// ──────────────────────────────────────

const isFormOpen = ref(false)
const editingTemplate = ref<PromptTemplate | null>(null)

function openCreateForm() {
  editingTemplate.value = null
  isFormOpen.value = true
}

function openEditForm(template: PromptTemplate) {
  editingTemplate.value = template
  isFormOpen.value = true
}

function closeForm() {
  isFormOpen.value = false
  editingTemplate.value = null
}

async function handleSubmit(payload: CreateTemplatePayload) {
  if (editingTemplate.value) {
    const result = await updateTemplate(editingTemplate.value.id, payload)
    if (result.data) closeForm()
  } else {
    const result = await createTemplate(payload)
    if (result.data) closeForm()
  }
}

// ──────────────────────────────────────
// フィルタ変更時に再フェッチ
// ──────────────────────────────────────

watch([usecaseFilter, activeOnlyFilter], () => {
  fetchTemplates()
})

// 初回ロード
onMounted(() => {
  fetchTemplates()
})

// ──────────────────────────────────────
// テーブル表示用
// ──────────────────────────────────────

const USECASE_LABELS: Record<string, string> = {
  email_draft: 'メール下書き',
  schedule_suggest: 'スケジュール提案',
  venue_search: '会場検索',
  quick_qa: '簡易Q&A',
}

function getUsecaseLabel(usecase: string): string {
  return USECASE_LABELS[usecase] ?? usecase
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          AIテンプレート管理
        </h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          プロンプトテンプレートの作成・編集・バージョン管理
        </p>
      </div>
      <UButton
        icon="i-heroicons-plus"
        label="新規作成"
        @click="openCreateForm"
      />
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-4 mb-6">
      <USelect
        v-model="usecaseFilter"
        :items="[
          { label: '全てのユースケース', value: '' },
          ...availableUsecases.map(u => ({ label: getUsecaseLabel(u), value: u })),
        ]"
        class="w-48"
      />
      <UCheckbox
        v-model="activeOnlyFilter"
        label="アクティブのみ"
      />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <USkeleton v-for="i in 5" :key="i" class="h-16 w-full" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredTemplates.length === 0"
      class="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <UIcon name="i-heroicons-cpu-chip" class="w-12 h-12 mx-auto text-gray-400 mb-4" />
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        テンプレートがありません
      </h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
        最初のプロンプトテンプレートを作成してください
      </p>
      <UButton
        icon="i-heroicons-plus"
        label="テンプレートを作成"
        @click="openCreateForm"
      />
    </div>

    <!-- Template Table -->
    <div
      v-else
      class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              テンプレート名
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              ユースケース
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              バージョン
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              状態
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              更新日時
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr
            v-for="template in filteredTemplates"
            :key="template.id"
            class="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ template.name }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <UBadge variant="subtle" color="primary" size="xs">
                {{ getUsecaseLabel(template.usecase) }}
              </UBadge>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
              v{{ template.version }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <UBadge
                :color="template.isActive ? 'success' : 'neutral'"
                variant="subtle"
                size="xs"
              >
                {{ template.isActive ? 'Active' : 'Inactive' }}
              </UBadge>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
              {{ formatDate(template.updatedAt) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right">
              <UButton
                variant="ghost"
                color="neutral"
                icon="i-heroicons-pencil-square"
                size="xs"
                aria-label="編集"
                @click="openEditForm(template)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create/Edit Modal -->
    <AiPromptTemplateForm
      :open="isFormOpen"
      :template="editingTemplate"
      :is-loading="isLoading"
      @close="closeForm"
      @submit="handleSubmit"
    />
  </div>
</template>
