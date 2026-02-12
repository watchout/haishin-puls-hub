<!-- components/common/DeleteConfirmModal.vue -->
<!-- CRUD-004: 削除確認モーダル -->
<!-- 仕様書: docs/design/features/common/CRUD-001-004_crud-operations.md §6.4 -->

<script setup lang="ts">
const props = defineProps<{
  /** モーダル表示状態 */
  open: boolean
  /** 削除対象のリソース名（例: 「春の経営セミナー 2026」） */
  resourceName: string
  /** 削除処理中かどうか */
  loading?: boolean
}>()

const emit = defineEmits<{
  /** モーダル表示状態の変更 */
  (e: 'update:open', value: boolean): void
  /** 削除確定 */
  (e: 'confirm'): void
}>()

const handleCancel = () => {
  emit('update:open', false)
}

const handleConfirm = () => {
  emit('confirm')
}
</script>

<template>
  <UModal
    :open="props.open"
    @update:open="emit('update:open', $event)"
  >
    <template #content>
      <div class="p-6">
        <!-- ヘッダー -->
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          削除の確認
        </h3>

        <!-- 本文 -->
        <p class="text-sm text-gray-700 dark:text-gray-300 mb-2">
          「<span class="font-semibold">{{ props.resourceName }}</span>」を削除しますか？
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
          この操作は取り消せません。
        </p>

        <!-- アクション -->
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="outline"
            :disabled="props.loading"
            @click="handleCancel"
          >
            キャンセル
          </UButton>
          <UButton
            color="error"
            :loading="props.loading"
            @click="handleConfirm"
          >
            削除する
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
