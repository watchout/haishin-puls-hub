<script setup lang="ts">
// EVT-040 §6: レポート一覧ページ
// URL: /events/:eid/reports
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth'],
})

const route = useRoute()
const eventId = route.params.id as string

const {
  reports,
  isLoading,
  isGenerating,
  error,
  fetchReports,
  generateReport,
} = useReports(eventId)

const showGenerateConfirm = ref(false)

async function handleGenerate() {
  showGenerateConfirm.value = false
  const success = await generateReport('summary')
  if (success) {
    // 成功通知はUIフレームワークのトースト等で表示（MVP: console）
  }
}

function navigateToReport(reportId: string) {
  navigateTo(`/reports/${reportId}`)
}

onMounted(() => {
  fetchReports()
})
</script>

<template>
  <div class="max-w-5xl mx-auto p-6">
    <!-- ヘッダー -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">サマリーレポート</h1>
        <p class="text-sm text-gray-500 mt-1">イベントのサマリーレポートを管理します</p>
      </div>
      <UButton
        icon="i-heroicons-sparkles"
        label="AI生成"
        color="primary"
        :loading="isGenerating"
        @click="showGenerateConfirm = true"
      />
    </div>

    <!-- エラー表示 -->
    <UAlert
      v-if="error"
      icon="i-heroicons-exclamation-triangle"
      color="error"
      :title="error"
      class="mb-4"
      :close-button="{ icon: 'i-heroicons-x-mark', color: 'error', variant: 'link' }"
      @close="error = null"
    />

    <!-- ローディング -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- レポート一覧（カード形式）-->
    <div v-else-if="reports.length > 0" class="space-y-4">
      <div
        v-for="report in reports"
        :key="report.id"
        class="border rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer bg-white"
        @click="navigateToReport(report.id)"
      >
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <h3 class="text-lg font-semibold">
                {{ getReportTypeLabel(report.reportType) }}
              </h3>
              <UBadge
                :color="getReportStatusColor(report.status)"
                size="sm"
              >
                {{ getReportStatusLabel(report.status) }}
              </UBadge>
              <UBadge color="neutral" variant="outline" size="sm">
                {{ getGeneratedByLabel(report.generatedBy) }}
              </UBadge>
            </div>
            <div class="text-sm text-gray-500 space-y-1">
              <p>生成日時: {{ new Date(report.createdAt).toLocaleString('ja-JP') }}</p>
              <div class="flex gap-4">
                <span>参加者: {{ formatParticipantCount(report.metadata) }}</span>
                <span>チェックイン率: {{ formatCheckinRate(report.metadata) }}</span>
                <span>満足度: {{ formatSatisfaction(report.metadata) }}</span>
              </div>
            </div>
          </div>
          <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </div>

    <!-- 空状態 -->
    <div v-else class="text-center py-12 bg-gray-50 rounded-lg">
      <UIcon name="i-heroicons-document-text" class="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500 mb-4">レポートがまだありません</p>
      <UButton
        icon="i-heroicons-sparkles"
        label="AIでレポートを生成"
        color="primary"
        :loading="isGenerating"
        @click="showGenerateConfirm = true"
      />
    </div>

    <!-- 生成確認モーダル -->
    <UModal v-model:open="showGenerateConfirm">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-2">レポートを生成しますか？</h3>
          <p class="text-sm text-gray-600 mb-4">
            AIがイベントデータを分析し、サマリーレポートを自動生成します。
            生成には数秒〜1分程度かかる場合があります。
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              label="キャンセル"
              color="neutral"
              variant="outline"
              @click="showGenerateConfirm = false"
            />
            <UButton
              icon="i-heroicons-sparkles"
              label="生成開始"
              color="primary"
              :loading="isGenerating"
              @click="handleGenerate"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
