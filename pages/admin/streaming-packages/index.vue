<script setup lang="ts">
// VENUE-SC-004: 配信パッケージ管理画面（venue_admin）
// 仕様書: docs/design/features/project/VENUE-001-004_venue-management.md §6
import type { CreateStreamingPackagePayload } from '~/composables/useVenues'

definePageMeta({ layout: 'dashboard' })

const {
  packages,
  isLoading,
  error,
  fetchPackages,
  createPackage,
  updatePackage,
} = useStreamingPackages()

// 初期読み込み
onMounted(() => {
  fetchPackages()
})

// モーダル制御
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editTargetId = ref<string | null>(null)

// フォーム
function getEmptyForm(): CreateStreamingPackagePayload {
  return {
    name: '',
    description: '',
    items: [{ name: '', quantity: 1, unit: '台' }],
    base_price: 0,
  }
}

const form = ref(getEmptyForm())

function openCreateModal() {
  form.value = getEmptyForm()
  showCreateModal.value = true
}

function openEditModal(pkg: { id: string; name: string; description: string | null; items: { name: string; quantity: number; unit: string }[]; base_price: number }) {
  editTargetId.value = pkg.id
  form.value = {
    name: pkg.name,
    description: pkg.description ?? '',
    items: pkg.items.length > 0 ? [...pkg.items] : [{ name: '', quantity: 1, unit: '台' }],
    base_price: pkg.base_price,
  }
  showEditModal.value = true
}

async function handleCreate() {
  const result = await createPackage(form.value)
  if (result) {
    showCreateModal.value = false
  }
}

async function handleUpdate() {
  if (editTargetId.value) {
    const result = await updatePackage(editTargetId.value, form.value)
    if (result) {
      showEditModal.value = false
      editTargetId.value = null
    }
  }
}

async function toggleActive(pkg: { id: string; is_active: boolean }) {
  await updatePackage(pkg.id, { is_active: !pkg.is_active })
}

// 構成項目の追加/削除
function addItem() {
  form.value.items.push({ name: '', quantity: 1, unit: '台' })
}

function removeItem(idx: number) {
  form.value.items.splice(idx, 1)
}

// 価格フォーマット
function formatPrice(price: number): string {
  return `¥${price.toLocaleString()}`
}
</script>

<template>
  <div class="space-y-6">
    <!-- ヘッダー -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">配信パッケージ管理</h1>
        <p class="text-sm text-gray-500 mt-1">
          配信パッケージの作成・編集・価格設定を行います
        </p>
      </div>
      <UButton
        icon="i-heroicons-plus"
        label="新規パッケージ作成"
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
      <USkeleton v-for="i in 3" :key="i" class="h-24 w-full" />
    </div>

    <!-- パッケージ一覧 -->
    <div v-else-if="packages.length > 0" class="space-y-4">
      <UCard v-for="pkg in packages" :key="pkg.id">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-lg">{{ pkg.name }}</h3>
              <UBadge v-if="!pkg.tenant_id" color="info" variant="subtle">グローバル</UBadge>
              <UBadge :color="pkg.is_active ? 'success' : 'neutral'" variant="subtle">
                {{ pkg.is_active ? '有効' : '無効' }}
              </UBadge>
            </div>
            <p v-if="pkg.description" class="text-sm text-gray-500 mt-1">{{ pkg.description }}</p>
            <div class="flex items-center gap-4 mt-2 text-sm">
              <span class="font-medium text-primary-600">{{ formatPrice(pkg.base_price) }}</span>
              <span class="text-gray-400">|</span>
              <span class="text-gray-500">
                構成: {{ pkg.items.map(i => `${i.name}×${i.quantity}`).join('、') }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 ml-4">
            <UButton
              v-if="pkg.tenant_id"
              icon="i-heroicons-pencil-square"
              variant="ghost"
              size="sm"
              @click="openEditModal(pkg)"
            />
            <UButton
              v-if="pkg.tenant_id"
              :icon="pkg.is_active ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
              :color="pkg.is_active ? 'warning' : 'success'"
              variant="ghost"
              size="sm"
              @click="toggleActive(pkg)"
            />
          </div>
        </div>
      </UCard>
    </div>

    <!-- 空状態 -->
    <UCard v-else>
      <div class="text-center py-12">
        <div class="text-gray-400 mb-4">
          <UIcon name="i-heroicons-video-camera" class="w-12 h-12" />
        </div>
        <h3 class="text-lg font-medium text-gray-900">配信パッケージがありません</h3>
        <p class="text-gray-500 mt-1">新しいパッケージを作成して始めましょう</p>
        <UButton
          icon="i-heroicons-plus"
          label="新規パッケージ作成"
          color="primary"
          class="mt-4"
          @click="openCreateModal"
        />
      </div>
    </UCard>

    <!-- 作成モーダル -->
    <UModal v-model:open="showCreateModal">
      <template #header>
        <h3 class="text-lg font-semibold">新規配信パッケージ</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="パッケージ名" required>
            <UInput v-model="form.name" placeholder="スタンダード配信" />
          </UFormField>
          <UFormField label="説明">
            <UTextarea v-model="form.description" placeholder="パッケージの説明..." :rows="2" />
          </UFormField>
          <UFormField label="基本料金（円）" required>
            <UInput v-model.number="form.base_price" type="number" placeholder="50000" />
          </UFormField>

          <!-- 構成項目 -->
          <UFormField label="構成項目">
            <div class="space-y-2">
              <div v-for="(item, idx) in form.items" :key="idx" class="flex gap-2 items-center">
                <UInput v-model="item.name" placeholder="項目名" class="flex-1" />
                <UInput v-model.number="item.quantity" type="number" placeholder="数量" class="w-20" />
                <UInput v-model="item.unit" placeholder="単位" class="w-20" />
                <UButton
                  v-if="form.items.length > 1"
                  icon="i-heroicons-x-mark"
                  color="error"
                  variant="ghost"
                  size="xs"
                  @click="removeItem(idx)"
                />
              </div>
              <UButton icon="i-heroicons-plus" label="項目を追加" variant="outline" size="sm" @click="addItem" />
            </div>
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
        <h3 class="text-lg font-semibold">パッケージ編集</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="パッケージ名" required>
            <UInput v-model="form.name" />
          </UFormField>
          <UFormField label="説明">
            <UTextarea v-model="form.description" :rows="2" />
          </UFormField>
          <UFormField label="基本料金（円）" required>
            <UInput v-model.number="form.base_price" type="number" />
          </UFormField>

          <UFormField label="構成項目">
            <div class="space-y-2">
              <div v-for="(item, idx) in form.items" :key="idx" class="flex gap-2 items-center">
                <UInput v-model="item.name" placeholder="項目名" class="flex-1" />
                <UInput v-model.number="item.quantity" type="number" class="w-20" />
                <UInput v-model="item.unit" placeholder="単位" class="w-20" />
                <UButton
                  v-if="form.items.length > 1"
                  icon="i-heroicons-x-mark"
                  color="error"
                  variant="ghost"
                  size="xs"
                  @click="removeItem(idx)"
                />
              </div>
              <UButton icon="i-heroicons-plus" label="項目を追加" variant="outline" size="sm" @click="addItem" />
            </div>
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
  </div>
</template>
