<script setup lang="ts">
// EVT-030 §5.2: 参加者一覧画面（主催者用）
// SCR-PRT-LIST: /events/:eid/participants
import {
  useParticipants,
  getParticipationTypeLabel,
  getRegistrationStatusLabel,
  getRegistrationStatusColor,
  getCheckinMethodLabel,
} from '~/composables/useParticipants'
import type { ParticipantData } from '~/composables/useParticipants'

definePageMeta({ layout: 'dashboard', middleware: ['auth'] })

const route = useRoute()
const eventId = route.params.id as string

const {
  participants,
  stats,
  isLoading,
  error,
  fetchParticipants,
  fetchStats,
  checkinManual,
  walkIn,
} = useParticipants(eventId)

// フィルタ
const searchQuery = ref('')
const typeFilter = ref('')
const statusFilter = ref('')
const checkinFilter = ref('')

// モーダル
const showWalkInModal = ref(false)
const showCheckinConfirmModal = ref(false)
const targetParticipant = ref<ParticipantData | null>(null)

// 当日参加者フォーム
const walkInForm = reactive({
  name: '',
  email: '',
  organization: '',
  participation_type: 'onsite' as string,
})

// 初期読み込み
onMounted(async () => {
  await Promise.all([fetchParticipants(), fetchStats()])
})

// フィルタ適用
watch([searchQuery, typeFilter, statusFilter, checkinFilter], () => {
  const filters: Record<string, string> = {}
  if (searchQuery.value) filters.q = searchQuery.value
  if (typeFilter.value) filters.participation_type = typeFilter.value
  if (statusFilter.value) filters.registration_status = statusFilter.value
  if (checkinFilter.value) filters.checked_in = checkinFilter.value
  fetchParticipants(filters)
})

// 手動チェックイン
function openCheckinConfirm(prt: ParticipantData) {
  targetParticipant.value = prt
  showCheckinConfirmModal.value = true
}

async function handleManualCheckin() {
  if (!targetParticipant.value) return
  const result = await checkinManual(targetParticipant.value.id)
  if (result) {
    showCheckinConfirmModal.value = false
    targetParticipant.value = null
  }
}

// 当日参加者登録
async function handleWalkIn() {
  const result = await walkIn({
    name: walkInForm.name,
    email: walkInForm.email,
    organization: walkInForm.organization || undefined,
    participation_type: walkInForm.participation_type,
  })
  if (result) {
    showWalkInModal.value = false
    walkInForm.name = ''
    walkInForm.email = ''
    walkInForm.organization = ''
    walkInForm.participation_type = 'onsite'
  }
}

// ステータスオプション
const typeOptions = [
  { label: 'すべて', value: '' },
  { label: '現地参加', value: 'onsite' },
  { label: 'オンライン参加', value: 'online' },
]

const statusOptions = [
  { label: 'すべて', value: '' },
  { label: '申込済', value: 'registered' },
  { label: '確認済', value: 'confirmed' },
  { label: 'キャンセル', value: 'cancelled' },
]

const checkinOptions = [
  { label: 'すべて', value: '' },
  { label: 'チェックイン済', value: 'true' },
  { label: '未チェックイン', value: 'false' },
]

const _getParticipationTypeLabel = getParticipationTypeLabel
const _getRegistrationStatusLabel = getRegistrationStatusLabel
const _getRegistrationStatusColor = getRegistrationStatusColor
const _getCheckinMethodLabel = getCheckinMethodLabel
</script>

<template>
  <div class="p-6 max-w-6xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">参加者管理</h1>
      <div class="flex gap-2">
        <NuxtLink :to="`/events/${eventId}/checkin`">
          <UButton icon="i-heroicons-qr-code" label="チェックイン受付" variant="outline" />
        </NuxtLink>
        <UButton icon="i-heroicons-plus" label="当日参加者登録" @click="showWalkInModal = true" />
      </div>
    </div>

    <!-- チェックイン統計 -->
    <div v-if="stats" class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow p-4 text-center">
        <p class="text-sm text-gray-500">事前登録</p>
        <p class="text-2xl font-bold">{{ stats.total_registered }}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-4 text-center">
        <p class="text-sm text-gray-500">チェックイン済</p>
        <p class="text-2xl font-bold text-green-600">{{ stats.checked_in }}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-4 text-center">
        <p class="text-sm text-gray-500">未チェックイン</p>
        <p class="text-2xl font-bold text-orange-500">{{ stats.not_checked_in }}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-4 text-center">
        <p class="text-sm text-gray-500">当日参加</p>
        <p class="text-2xl font-bold text-blue-600">{{ stats.walk_in }}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-4 text-center">
        <p class="text-sm text-gray-500">チェックイン率</p>
        <p class="text-2xl font-bold">{{ stats.checkin_rate }}%</p>
      </div>
    </div>

    <!-- フィルタ -->
    <div class="flex flex-wrap gap-4 items-center mb-4">
      <UInput v-model="searchQuery" icon="i-heroicons-magnifying-glass" placeholder="名前・メール・組織名で検索" class="w-64" />
      <USelect v-model="typeFilter" :items="typeOptions" placeholder="参加形態" />
      <USelect v-model="statusFilter" :items="statusOptions" placeholder="ステータス" />
      <USelect v-model="checkinFilter" :items="checkinOptions" placeholder="チェックイン" />
    </div>

    <!-- エラー表示 -->
    <UAlert v-if="error" color="error" :title="error" class="mb-4" />

    <!-- ローディング -->
    <div v-if="isLoading" class="text-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
    </div>

    <!-- 参加者一覧テーブル -->
    <UTable
      v-else
      :data="participants"
      :columns="[
        { accessorKey: 'name', header: '氏名' },
        { accessorKey: 'email', header: 'メール' },
        { accessorKey: 'organization', header: '所属' },
        { accessorKey: 'participationType', header: '参加形態' },
        { accessorKey: 'registrationStatus', header: 'ステータス' },
        { accessorKey: 'checkedIn', header: 'チェックイン' },
        { accessorKey: 'actions', header: '操作' },
      ]"
    >
      <template #name-cell="{ row }">
        {{ row.original.name }}
      </template>
      <template #organization-cell="{ row }">
        {{ row.original.organization || '-' }}
      </template>
      <template #participationType-cell="{ row }">
        {{ _getParticipationTypeLabel(row.original.participationType) }}
      </template>
      <template #registrationStatus-cell="{ row }">
        <UBadge
          :color="_getRegistrationStatusColor(row.original.registrationStatus)"
          :label="_getRegistrationStatusLabel(row.original.registrationStatus)"
        />
      </template>
      <template #checkedIn-cell="{ row }">
        <template v-if="row.original.checkedIn">
          <UBadge color="success" label="済" />
          <span class="text-xs text-gray-500 ml-1">
            {{ _getCheckinMethodLabel(row.original.checkinMethod) }}
          </span>
        </template>
        <UBadge v-else color="neutral" label="未" />
      </template>
      <template #actions-cell="{ row }">
        <UButton
          v-if="!row.original.checkedIn"
          size="sm"
          variant="ghost"
          icon="i-heroicons-check-circle"
          label="チェックイン"
          @click="openCheckinConfirm(row.original)"
        />
      </template>
    </UTable>

    <!-- 空の状態 -->
    <div v-if="!isLoading && participants.length === 0" class="text-center py-12 text-gray-500">
      <UIcon name="i-heroicons-users" class="text-4xl mb-2" />
      <p>参加者がまだ登録されていません</p>
    </div>

    <!-- 当日参加者登録モーダル -->
    <UModal v-model:open="showWalkInModal">
      <template #header>
        <h3 class="text-lg font-semibold">当日参加者登録</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="名前" required>
            <UInput v-model="walkInForm.name" placeholder="田中次郎" />
          </UFormField>
          <UFormField label="メールアドレス" required>
            <UInput v-model="walkInForm.email" type="email" placeholder="jiro@example.com" />
          </UFormField>
          <UFormField label="組織名">
            <UInput v-model="walkInForm.organization" placeholder="株式会社ABC" />
          </UFormField>
          <UFormField label="参加形態">
            <URadioGroup
              v-model="walkInForm.participation_type"
              :items="[
                { label: '現地参加', value: 'onsite' },
                { label: 'オンライン参加', value: 'online' },
              ]"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" label="キャンセル" @click="showWalkInModal = false" />
          <UButton label="登録してチェックイン" :disabled="!walkInForm.name || !walkInForm.email" @click="handleWalkIn" />
        </div>
      </template>
    </UModal>

    <!-- チェックイン確認モーダル -->
    <UModal v-model:open="showCheckinConfirmModal">
      <template #header>
        <h3 class="text-lg font-semibold">手動チェックイン</h3>
      </template>
      <template #body>
        <p>「{{ targetParticipant?.name }}」をチェックインしますか？</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" label="キャンセル" @click="showCheckinConfirmModal = false" />
          <UButton label="チェックイン" @click="handleManualCheckin" />
        </div>
      </template>
    </UModal>
  </div>
</template>
