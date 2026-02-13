<script setup lang="ts">
// EVT-040 §6: レポート詳細ページ
// URL: /reports/:id
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth'],
})

const route = useRoute()
const reportId = route.params.id as string

const {
  report,
  isLoading,
  isSaving,
  isSharing,
  error,
  fetchReport,
  updateReport,
  publishReport,
  shareReport,
} = useReportDetail(reportId)

// 編集モード
const isEditing = ref(false)
const editContent = ref('')

// 共有モーダル
const showShareModal = ref(false)
const shareForm = ref({
  to: '',
  message: '',
  attachPdf: false,
})

// 公開確認モーダル
const showPublishConfirm = ref(false)

function startEditing() {
  if (report.value) {
    editContent.value = report.value.content
    isEditing.value = true
  }
}

function cancelEditing() {
  isEditing.value = false
  editContent.value = ''
}

async function saveContent() {
  const success = await updateReport({ content: editContent.value })
  if (success) {
    isEditing.value = false
    editContent.value = ''
  }
}

async function handlePublish() {
  showPublishConfirm.value = false
  await publishReport()
}

async function handleShare() {
  const toList = shareForm.value.to
    .split(',')
    .map(e => e.trim())
    .filter(e => e.length > 0)

  if (toList.length === 0) return

  const success = await shareReport({
    to: toList,
    message: shareForm.value.message || undefined,
    attachPdf: shareForm.value.attachPdf,
  })

  if (success) {
    showShareModal.value = false
    shareForm.value = { to: '', message: '', attachPdf: false }
  }
}

onMounted(() => {
  fetchReport()
})
</script>

<template>
  <div class="max-w-5xl mx-auto p-6">
    <!-- ローディング -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- エラー -->
    <UAlert
      v-if="error"
      icon="i-heroicons-exclamation-triangle"
      color="error"
      :title="error"
      class="mb-4"
    />

    <!-- レポート詳細 -->
    <template v-if="report">
      <!-- ヘッダー -->
      <div class="flex items-center gap-2 mb-4">
        <UButton
          icon="i-heroicons-arrow-left"
          variant="ghost"
          size="sm"
          @click="navigateTo(`/events/${report.eventId}/reports`)"
        />
        <h1 class="text-2xl font-bold flex-1">
          {{ getReportTypeLabel(report.reportType) }}
        </h1>
        <UBadge
          :color="getReportStatusColor(report.status)"
        >
          {{ getReportStatusLabel(report.status) }}
        </UBadge>
      </div>

      <!-- メタ情報 -->
      <div class="flex items-center gap-4 text-sm text-gray-500 mb-4">
        <span>{{ getGeneratedByLabel(report.generatedBy) }}</span>
        <span>作成: {{ new Date(report.createdAt).toLocaleString('ja-JP') }}</span>
        <span>更新: {{ new Date(report.updatedAt).toLocaleString('ja-JP') }}</span>
      </div>

      <!-- 統計サマリー -->
      <div v-if="report.metadata" class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-blue-50 rounded-lg p-3 text-center">
          <p class="text-xs text-gray-500">参加者数</p>
          <p class="text-lg font-bold text-blue-700">
            {{ formatParticipantCount(report.metadata) }}
          </p>
        </div>
        <div class="bg-green-50 rounded-lg p-3 text-center">
          <p class="text-xs text-gray-500">チェックイン率</p>
          <p class="text-lg font-bold text-green-700">
            {{ formatCheckinRate(report.metadata) }}
          </p>
        </div>
        <div class="bg-purple-50 rounded-lg p-3 text-center">
          <p class="text-xs text-gray-500">満足度</p>
          <p class="text-lg font-bold text-purple-700">
            {{ formatSatisfaction(report.metadata) }}
          </p>
        </div>
        <div class="bg-orange-50 rounded-lg p-3 text-center">
          <p class="text-xs text-gray-500">NPS</p>
          <p class="text-lg font-bold text-orange-700">
            {{ formatNps(report.metadata) }}
          </p>
        </div>
      </div>

      <!-- アクションバー -->
      <div class="flex gap-2 mb-6 border-b pb-4">
        <UButton
          v-if="report.status === 'draft'"
          icon="i-heroicons-pencil"
          :label="isEditing ? 'キャンセル' : '編集'"
          :color="isEditing ? 'neutral' : 'primary'"
          variant="outline"
          size="sm"
          @click="isEditing ? cancelEditing() : startEditing()"
        />
        <UButton
          v-if="report.status === 'draft'"
          icon="i-heroicons-check-circle"
          label="公開"
          color="success"
          variant="outline"
          size="sm"
          @click="showPublishConfirm = true"
        />
        <UButton
          icon="i-heroicons-share"
          label="共有"
          color="neutral"
          variant="outline"
          size="sm"
          @click="showShareModal = true"
        />
      </div>

      <!-- 編集モード -->
      <div v-if="isEditing" class="mb-6">
        <UTextarea
          v-model="editContent"
          :rows="20"
          placeholder="Markdown形式でレポートを編集..."
          class="font-mono text-sm"
        />
        <div class="flex justify-end gap-2 mt-3">
          <UButton
            label="キャンセル"
            color="neutral"
            variant="outline"
            @click="cancelEditing"
          />
          <UButton
            icon="i-heroicons-check"
            label="保存"
            color="primary"
            :loading="isSaving"
            @click="saveContent"
          />
        </div>
      </div>

      <!-- レポート本文（Markdown表示）-->
      <div v-else class="prose max-w-none">
        <!-- MVP: Markdown を pre で表示。marked 導入後にHTMLレンダリング -->
        <pre class="whitespace-pre-wrap text-sm leading-relaxed bg-white p-6 rounded-lg border">{{ report.content }}</pre>
      </div>
    </template>

    <!-- 公開確認モーダル -->
    <UModal v-model:open="showPublishConfirm">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-2">レポートを公開しますか？</h3>
          <p class="text-sm text-gray-600 mb-4">
            公開すると編集できなくなります。この操作は取り消せません。
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              label="キャンセル"
              color="neutral"
              variant="outline"
              @click="showPublishConfirm = false"
            />
            <UButton
              icon="i-heroicons-check-circle"
              label="公開する"
              color="success"
              :loading="isSaving"
              @click="handlePublish"
            />
          </div>
        </div>
      </template>
    </UModal>

    <!-- 共有モーダル -->
    <UModal v-model:open="showShareModal">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">レポートを共有</h3>
          <div class="space-y-4">
            <UFormField label="宛先（カンマ区切り）">
              <UInput
                v-model="shareForm.to"
                placeholder="user@example.com, user2@example.com"
              />
            </UFormField>
            <UFormField label="メッセージ（任意）">
              <UTextarea
                v-model="shareForm.message"
                :rows="3"
                placeholder="レポートを共有します"
              />
            </UFormField>
            <div class="flex items-center gap-2">
              <UCheckbox v-model="shareForm.attachPdf" />
              <span class="text-sm">PDFを添付する</span>
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-6">
            <UButton
              label="キャンセル"
              color="neutral"
              variant="outline"
              @click="showShareModal = false"
            />
            <UButton
              icon="i-heroicons-paper-airplane"
              label="送信"
              color="primary"
              :loading="isSharing"
              @click="handleShare"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
