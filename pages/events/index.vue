<script setup lang="ts">
// EVT-S01: イベント一覧ページ
// 仕様書: docs/design/features/project/EVT-001-005_event-planning.md §6
definePageMeta({ layout: 'dashboard' })

const {
  events,
  isLoading,
  error,
  pagination,
  fetchEvents,
  deleteEvent,
} = useEvents()

const { getStatusLabel, getStatusColor, getEventTypeLabel, getFormatLabel } = await import('~/composables/useEvents')

// 初期読み込み
onMounted(() => {
  fetchEvents()
})

// ページネーション
async function handlePageChange(page: number) {
  await fetchEvents(page, pagination.value.perPage)
}

// 削除確認
const deleteTargetId = ref<string | null>(null)
const showDeleteConfirm = ref(false)

function confirmDelete(id: string) {
  deleteTargetId.value = id
  showDeleteConfirm.value = true
}

async function handleDelete() {
  if (deleteTargetId.value) {
    await deleteEvent(deleteTargetId.value)
    showDeleteConfirm.value = false
    deleteTargetId.value = null
  }
}

// 日付フォーマット
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '未定'
  const d = new Date(dateStr)
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  })
}
</script>

<template>
  <div class="space-y-6">
    <!-- ヘッダー -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">イベント管理</h1>
        <p class="text-sm text-gray-500 mt-1">
          イベントの作成・管理を行います
        </p>
      </div>
      <UButton
        to="/events/new"
        icon="i-heroicons-plus"
        label="新規作成"
        color="primary"
      />
    </div>

    <!-- エラー -->
    <UAlert
      v-if="error"
      color="error"
      :title="error"
      icon="i-heroicons-exclamation-triangle"
    />

    <!-- ローディング -->
    <div v-if="isLoading" class="space-y-4">
      <USkeleton v-for="i in 5" :key="i" class="h-16 w-full" />
    </div>

    <!-- イベント一覧 -->
    <UCard v-else-if="events.length > 0">
      <div class="divide-y">
        <div
          v-for="evt in events"
          :key="evt.id"
          class="flex items-center justify-between py-4 first:pt-0 last:pb-0"
        >
          <div class="flex-1 min-w-0">
            <NuxtLink
              :to="`/events/${evt.id}`"
              class="font-medium text-primary-600 hover:text-primary-800 truncate block"
            >
              {{ evt.title }}
            </NuxtLink>
            <div class="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span>{{ getEventTypeLabel(evt.event_type) }}</span>
              <span>{{ getFormatLabel(evt.format) }}</span>
              <span>{{ formatDate(evt.start_at) }}</span>
            </div>
          </div>

          <div class="flex items-center gap-3 ml-4">
            <UBadge :color="getStatusColor(evt.status)" variant="subtle">
              {{ getStatusLabel(evt.status) }}
            </UBadge>

            <UButton
              v-if="evt.status === 'draft'"
              icon="i-heroicons-trash"
              color="error"
              variant="ghost"
              size="sm"
              @click="confirmDelete(evt.id)"
            />
          </div>
        </div>
      </div>
    </UCard>

    <!-- 空状態 -->
    <UCard v-else>
      <div class="text-center py-12">
        <div class="text-gray-400 mb-4">
          <UIcon name="i-heroicons-calendar" class="w-12 h-12" />
        </div>
        <h3 class="text-lg font-medium text-gray-900">イベントがありません</h3>
        <p class="text-gray-500 mt-1">新しいイベントを作成して始めましょう</p>
        <UButton
          to="/events/new"
          icon="i-heroicons-plus"
          label="新規イベント作成"
          color="primary"
          class="mt-4"
        />
      </div>
    </UCard>

    <!-- ページネーション -->
    <div v-if="pagination.totalPages > 1" class="flex justify-center">
      <UPagination
        :model-value="pagination.page"
        :total="pagination.total"
        :items-per-page="pagination.perPage"
        @update:model-value="handlePageChange"
      />
    </div>

    <!-- 削除確認モーダル -->
    <UModal v-model:open="showDeleteConfirm">
      <template #header>
        <h3 class="text-lg font-semibold">イベント削除の確認</h3>
      </template>
      <template #body>
        <p>このイベントを削除してもよろしいですか？この操作は取り消せません。</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            label="キャンセル"
            variant="ghost"
            @click="showDeleteConfirm = false"
          />
          <UButton
            label="削除"
            color="error"
            @click="handleDelete"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
