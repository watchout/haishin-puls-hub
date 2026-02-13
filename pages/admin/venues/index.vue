<script setup lang="ts">
// VENUE-SC-003: 拠点管理画面（venue_admin）
// 仕様書: docs/design/features/project/VENUE-001-004_venue-management.md §6
import type { CreateVenuePayload, EquipmentItem, WifiInfo } from '~/composables/useVenues'

definePageMeta({ layout: 'dashboard' })

const {
  venues,
  isLoading,
  error,
  pagination,
  fetchVenues,
  createVenue,
  updateVenue,
  deleteVenue,
} = useVenues()

// 初期読み込み
onMounted(() => {
  fetchVenues()
})

// ページネーション
async function handlePageChange(page: number) {
  await fetchVenues(page, pagination.value.perPage)
}

// モーダル制御
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const editTargetId = ref<string | null>(null)
const deleteTargetId = ref<string | null>(null)

// フォーム初期値
function getEmptyForm(): CreateVenuePayload & { equipment: EquipmentItem[]; wifi_info: WifiInfo } {
  return {
    name: '',
    branch_name: '',
    address: '',
    capacity: undefined,
    hourly_rate: undefined,
    phone: '',
    description: '',
    equipment: [],
    wifi_info: { ssid: '', password: '', bandwidth: '' },
    notes: '',
  }
}

const form = ref(getEmptyForm())

function openCreateModal() {
  form.value = getEmptyForm()
  showCreateModal.value = true
}

function openEditModal(v: { id: string; name: string; branch_name: string | null; address: string | null; capacity: number | null; hourly_rate: number | null; phone: string | null; description: string | null; equipment: EquipmentItem[]; wifi_info: WifiInfo | null; notes: string | null }) {
  editTargetId.value = v.id
  form.value = {
    name: v.name,
    branch_name: v.branch_name ?? '',
    address: v.address ?? '',
    capacity: v.capacity ?? undefined,
    hourly_rate: v.hourly_rate ?? undefined,
    phone: v.phone ?? '',
    description: v.description ?? '',
    equipment: v.equipment ?? [],
    wifi_info: v.wifi_info ?? { ssid: '', password: '', bandwidth: '' },
    notes: v.notes ?? '',
  }
  showEditModal.value = true
}

async function handleCreate() {
  const result = await createVenue(form.value)
  if (result) {
    showCreateModal.value = false
  }
}

async function handleUpdate() {
  if (editTargetId.value) {
    const result = await updateVenue(editTargetId.value, form.value)
    if (result) {
      showEditModal.value = false
      editTargetId.value = null
    }
  }
}

function confirmDelete(id: string) {
  deleteTargetId.value = id
  showDeleteConfirm.value = true
}

async function handleDelete() {
  if (deleteTargetId.value) {
    await deleteVenue(deleteTargetId.value)
    showDeleteConfirm.value = false
    deleteTargetId.value = null
  }
}

// 機材追加/削除
function addEquipment() {
  form.value.equipment.push({ name: '', quantity: 1, note: '' })
}

function removeEquipment(idx: number) {
  form.value.equipment.splice(idx, 1)
}
</script>

<template>
  <div class="space-y-6">
    <!-- ヘッダー -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">拠点管理</h1>
        <p class="text-sm text-gray-500 mt-1">
          会場拠点の追加・編集・管理を行います
        </p>
      </div>
      <UButton
        icon="i-heroicons-plus"
        label="新規拠点追加"
        color="primary"
        @click="openCreateModal"
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

    <!-- 会場一覧テーブル -->
    <UCard v-else-if="venues.length > 0">
      <div class="divide-y">
        <div
          v-for="v in venues"
          :key="v.id"
          class="flex items-center justify-between py-4 first:pt-0 last:pb-0"
        >
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate">
              {{ v.name }}
              <span v-if="v.branch_name" class="text-gray-500 text-sm ml-1">{{ v.branch_name }}</span>
            </div>
            <div class="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span v-if="v.address">{{ v.address }}</span>
              <span v-if="v.capacity">{{ formatCapacity(v.capacity) }}</span>
              <span v-if="v.hourly_rate !== null">{{ formatHourlyRate(v.hourly_rate) }}</span>
            </div>
          </div>

          <div class="flex items-center gap-3 ml-4">
            <UBadge :color="v.is_active ? 'success' : 'neutral'" variant="subtle">
              {{ v.is_active ? '有効' : '無効' }}
            </UBadge>

            <UButton
              icon="i-heroicons-pencil-square"
              variant="ghost"
              size="sm"
              @click="openEditModal(v)"
            />
            <UButton
              v-if="v.is_active"
              icon="i-heroicons-trash"
              color="error"
              variant="ghost"
              size="sm"
              @click="confirmDelete(v.id)"
            />
          </div>
        </div>
      </div>
    </UCard>

    <!-- 空状態 -->
    <UCard v-else>
      <div class="text-center py-12">
        <div class="text-gray-400 mb-4">
          <UIcon name="i-heroicons-building-office-2" class="w-12 h-12" />
        </div>
        <h3 class="text-lg font-medium text-gray-900">拠点がありません</h3>
        <p class="text-gray-500 mt-1">新しい拠点を追加して始めましょう</p>
        <UButton
          icon="i-heroicons-plus"
          label="新規拠点追加"
          color="primary"
          class="mt-4"
          @click="openCreateModal"
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

    <!-- 作成モーダル -->
    <UModal v-model:open="showCreateModal">
      <template #header>
        <h3 class="text-lg font-semibold">新規拠点追加</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="会場名" required>
            <UInput v-model="form.name" placeholder="T-SITE HALL" />
          </UFormField>
          <UFormField label="支店名">
            <UInput v-model="form.branch_name" placeholder="渋谷店" />
          </UFormField>
          <UFormField label="住所">
            <UInput v-model="form.address" placeholder="東京都渋谷区..." />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="収容人数">
              <UInput v-model.number="form.capacity" type="number" placeholder="200" />
            </UFormField>
            <UFormField label="時間単価（円）">
              <UInput v-model.number="form.hourly_rate" type="number" placeholder="50000" />
            </UFormField>
          </div>
          <UFormField label="電話番号">
            <UInput v-model="form.phone" placeholder="03-1234-5678" />
          </UFormField>
          <UFormField label="説明">
            <UTextarea v-model="form.description" placeholder="会場の説明..." :rows="3" />
          </UFormField>

          <!-- 機材 -->
          <UFormField label="機材">
            <div class="space-y-2">
              <div v-for="(eq, idx) in form.equipment" :key="idx" class="flex gap-2 items-center">
                <UInput v-model="eq.name" placeholder="機材名" class="flex-1" />
                <UInput v-model.number="eq.quantity" type="number" placeholder="数量" class="w-20" />
                <UInput v-model="eq.note" placeholder="備考" class="flex-1" />
                <UButton icon="i-heroicons-x-mark" color="error" variant="ghost" size="xs" @click="removeEquipment(idx)" />
              </div>
              <UButton icon="i-heroicons-plus" label="機材を追加" variant="outline" size="sm" @click="addEquipment" />
            </div>
          </UFormField>

          <!-- Wi-Fi -->
          <UFormField label="Wi-Fi情報">
            <div class="grid grid-cols-3 gap-2">
              <UInput v-model="form.wifi_info.ssid" placeholder="SSID" />
              <UInput v-model="form.wifi_info.password" placeholder="パスワード" type="password" />
              <UInput v-model="form.wifi_info.bandwidth" placeholder="帯域（例: 1Gbps）" />
            </div>
          </UFormField>

          <UFormField label="特記事項">
            <UTextarea v-model="form.notes" placeholder="搬入経路や注意事項..." :rows="2" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton label="キャンセル" variant="ghost" @click="showCreateModal = false" />
          <UButton label="作成" color="primary" :loading="isLoading" @click="handleCreate" />
        </div>
      </template>
    </UModal>

    <!-- 編集モーダル -->
    <UModal v-model:open="showEditModal">
      <template #header>
        <h3 class="text-lg font-semibold">拠点編集</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="会場名" required>
            <UInput v-model="form.name" />
          </UFormField>
          <UFormField label="支店名">
            <UInput v-model="form.branch_name" />
          </UFormField>
          <UFormField label="住所">
            <UInput v-model="form.address" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="収容人数">
              <UInput v-model.number="form.capacity" type="number" />
            </UFormField>
            <UFormField label="時間単価（円）">
              <UInput v-model.number="form.hourly_rate" type="number" />
            </UFormField>
          </div>
          <UFormField label="電話番号">
            <UInput v-model="form.phone" />
          </UFormField>
          <UFormField label="説明">
            <UTextarea v-model="form.description" :rows="3" />
          </UFormField>

          <!-- 機材 -->
          <UFormField label="機材">
            <div class="space-y-2">
              <div v-for="(eq, idx) in form.equipment" :key="idx" class="flex gap-2 items-center">
                <UInput v-model="eq.name" placeholder="機材名" class="flex-1" />
                <UInput v-model.number="eq.quantity" type="number" class="w-20" />
                <UInput v-model="eq.note" placeholder="備考" class="flex-1" />
                <UButton icon="i-heroicons-x-mark" color="error" variant="ghost" size="xs" @click="removeEquipment(idx)" />
              </div>
              <UButton icon="i-heroicons-plus" label="機材を追加" variant="outline" size="sm" @click="addEquipment" />
            </div>
          </UFormField>

          <!-- Wi-Fi -->
          <UFormField label="Wi-Fi情報">
            <div class="grid grid-cols-3 gap-2">
              <UInput v-model="form.wifi_info.ssid" placeholder="SSID" />
              <UInput v-model="form.wifi_info.password" placeholder="パスワード" type="password" />
              <UInput v-model="form.wifi_info.bandwidth" placeholder="帯域" />
            </div>
          </UFormField>

          <UFormField label="特記事項">
            <UTextarea v-model="form.notes" :rows="2" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton label="キャンセル" variant="ghost" @click="showEditModal = false" />
          <UButton label="保存" color="primary" :loading="isLoading" @click="handleUpdate" />
        </div>
      </template>
    </UModal>

    <!-- 削除確認モーダル -->
    <UModal v-model:open="showDeleteConfirm">
      <template #header>
        <h3 class="text-lg font-semibold">拠点無効化の確認</h3>
      </template>
      <template #body>
        <p>この拠点を無効化してもよろしいですか？無効化後も管理画面からは確認できます。</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton label="キャンセル" variant="ghost" @click="showDeleteConfirm = false" />
          <UButton label="無効化" color="error" @click="handleDelete" />
        </div>
      </template>
    </UModal>
  </div>
</template>
