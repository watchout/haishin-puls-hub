<!-- CRUD-004 削除確認モーダル -->
<!-- 仕様書: docs/design/features/common/CRUD-001-004_crud-operations.md §6.4 -->
<!--
  使用例:
  <DeleteConfirmModal
    v-model="showDeleteModal"
    :resource-name="event.title"
    :loading="isDeleting"
    @confirm="handleDelete"
  />
-->

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-triangle-alert"
              class="text-red-500"
            />
            <h3 class="text-lg font-semibold">
              削除の確認
            </h3>
          </div>
        </template>

        <div class="space-y-2">
          <p>
            「<span class="font-semibold">{{ resourceName }}</span>」を削除しますか？
          </p>
          <p class="text-sm text-gray-500">
            この操作は取り消せません。
          </p>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              :disabled="loading"
              @click="handleCancel"
            >
              キャンセル
            </UButton>
            <UButton
              color="error"
              :loading="loading"
              @click="handleConfirm"
            >
              削除する
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface Props {
  /** リソース名（モーダル内に表示） */
  resourceName: string;
  /** 削除処理中フラグ */
  loading?: boolean;
}

withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const isOpen = defineModel<boolean>({ default: false });

function handleConfirm() {
  emit('confirm');
}

function handleCancel() {
  isOpen.value = false;
  emit('cancel');
}
</script>
