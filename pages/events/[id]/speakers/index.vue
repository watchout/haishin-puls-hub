<script setup lang="ts">
// EVT-020-021 §4.2: 登壇者一覧画面（主催者）
// SCR-SPK-LIST: /app/events/:eid/speakers
import {
  useSpeakers,
  getSubmissionStatusLabel,
  getSubmissionStatusColor,
  getSpeakerFormatLabel,
} from '~/composables/useSpeakers'
import type { SpeakerData, CreateSpeakerResult } from '~/composables/useSpeakers'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const route = useRoute()
const eventId = route.params.id as string

const { speakers, isLoading, error, fetchSpeakers, createSpeaker, deleteSpeaker, confirmSpeaker, sendFormEmail } = useSpeakers(eventId)

// フィルタ
const statusFilter = ref('')
const pendingOnly = ref(false)

// モーダル
const showAddModal = ref(false)
const showDeleteModal = ref(false)
const showEmailModal = ref(false)
const targetSpeaker = ref<SpeakerData | null>(null)

// 追加フォーム
const newSpeakerName = ref('')
const newSpeakerEmail = ref('')

// メール送信フォーム
const emailAddress = ref('')

// 初期読み込み
onMounted(() => fetchSpeakers())

// フィルタ適用
watch([statusFilter, pendingOnly], () => {
  const filters: Record<string, string> = {}
  if (pendingOnly.value) {
    filters.status = 'pending'
  } else if (statusFilter.value) {
    filters.status = statusFilter.value
  }
  fetchSpeakers(filters)
})

// 登壇者追加
async function handleAddSpeaker() {
  const result: CreateSpeakerResult | null = await createSpeaker({
    name: newSpeakerName.value || undefined,
    email: newSpeakerEmail.value || undefined,
  })
  if (result) {
    showAddModal.value = false
    newSpeakerName.value = ''
    newSpeakerEmail.value = ''
  }
}

// 登壇者削除
function openDeleteModal(spk: SpeakerData) {
  targetSpeaker.value = spk
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!targetSpeaker.value) return
  const ok = await deleteSpeaker(targetSpeaker.value.id)
  if (ok) {
    showDeleteModal.value = false
    targetSpeaker.value = null
  }
}

// 承認
async function handleConfirm(spk: SpeakerData) {
  await confirmSpeaker(spk.id)
}

// メール送信
function openEmailModal(spk: SpeakerData) {
  targetSpeaker.value = spk
  emailAddress.value = ''
  showEmailModal.value = true
}

async function handleSendEmail() {
  if (!targetSpeaker.value || !emailAddress.value) return
  const ok = await sendFormEmail(targetSpeaker.value.id, emailAddress.value)
  if (ok) {
    showEmailModal.value = false
    targetSpeaker.value = null
    emailAddress.value = ''
  }
}

// フォームURLコピー
function copyFormUrl(spk: SpeakerData) {
  const url = `${window.location.origin}/speaker-form/${spk.id}`
  navigator.clipboard.writeText(url)
}

// ステータスフィルタオプション
const statusOptions = [
  { label: 'すべて', value: '' },
  { label: '未提出', value: 'pending' },
  { label: '提出済', value: 'submitted' },
  { label: '確認済', value: 'confirmed' },
]
</script>

<template>
  <div class="p-6 max-w-6xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">登壇者管理</h1>
      <UButton icon="i-heroicons-plus" label="登壇者追加" @click="showAddModal = true" />
    </div>

    <!-- フィルタ -->
    <div class="flex gap-4 items-center mb-4">
      <USelect v-model="statusFilter" :items="statusOptions" placeholder="ステータス" />
      <UCheckbox v-model="pendingOnly" label="未提出のみ" />
    </div>

    <!-- エラー表示 -->
    <UAlert v-if="error" color="error" :title="error" class="mb-4" />

    <!-- ローディング -->
    <div v-if="isLoading" class="text-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
    </div>

    <!-- 登壇者一覧テーブル -->
    <UTable
      v-else
      :data="speakers"
      :columns="[
        { accessorKey: 'sortOrder', header: '#' },
        { accessorKey: 'name', header: '氏名' },
        { accessorKey: 'organization', header: '所属' },
        { accessorKey: 'format', header: '登壇形式' },
        { accessorKey: 'submissionStatus', header: 'ステータス' },
        { accessorKey: 'actions', header: '操作' },
      ]"
    >
      <template #sortOrder-cell="{ row }">
        {{ row.original.sortOrder + 1 }}
      </template>
      <template #name-cell="{ row }">
        <div class="flex items-center gap-2">
          <UAvatar
            :src="row.original.photoUrl ?? undefined"
            :alt="row.original.name"
            size="sm"
          />
          <span>{{ row.original.name || '(未入力)' }}</span>
        </div>
      </template>
      <template #organization-cell="{ row }">
        {{ row.original.organization || '-' }}
      </template>
      <template #format-cell="{ row }">
        {{ getSpeakerFormatLabel(row.original.format) }}
      </template>
      <template #submissionStatus-cell="{ row }">
        <UBadge
          :color="getSubmissionStatusColor(row.original.submissionStatus)"
          :label="getSubmissionStatusLabel(row.original.submissionStatus)"
        />
      </template>
      <template #actions-cell="{ row }">
        <UDropdownMenu
          :items="[
            [
              { label: 'フォームURLをコピー', icon: 'i-heroicons-clipboard-document', click: () => copyFormUrl(row.original) },
              { label: 'メール送信', icon: 'i-heroicons-envelope', click: () => openEmailModal(row.original) },
            ],
            [
              ...(row.original.submissionStatus === 'submitted' ? [{ label: '確認済みにする', icon: 'i-heroicons-check-circle', click: () => handleConfirm(row.original) }] : []),
            ],
            [
              { label: '削除', icon: 'i-heroicons-trash', click: () => openDeleteModal(row.original) },
            ],
          ]"
        >
          <UButton icon="i-heroicons-ellipsis-vertical" variant="ghost" size="sm" />
        </UDropdownMenu>
      </template>
    </UTable>

    <!-- 空の状態 -->
    <div v-if="!isLoading && speakers.length === 0" class="text-center py-12 text-gray-500">
      <UIcon name="i-heroicons-microphone" class="text-4xl mb-2" />
      <p>登壇者がまだ登録されていません</p>
      <UButton label="登壇者を追加" class="mt-4" @click="showAddModal = true" />
    </div>

    <!-- 登壇者追加モーダル (§4.3) -->
    <UModal v-model:open="showAddModal">
      <template #header>
        <h3 class="text-lg font-semibold">登壇者を追加</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="登壇者のメールアドレス（任意）" hint="入力した場合、フォームURLが自動送信されます">
            <UInput v-model="newSpeakerEmail" type="email" placeholder="speaker@example.com" />
          </UFormField>
          <UFormField label="登壇者氏名（任意）">
            <UInput v-model="newSpeakerName" placeholder="山田太郎" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" label="キャンセル" @click="showAddModal = false" />
          <UButton label="追加" @click="handleAddSpeaker" />
        </div>
      </template>
    </UModal>

    <!-- 削除確認モーダル -->
    <UModal v-model:open="showDeleteModal">
      <template #header>
        <h3 class="text-lg font-semibold">登壇者を削除</h3>
      </template>
      <template #body>
        <p>「{{ targetSpeaker?.name || '(未入力)' }}」を削除しますか？</p>
        <p class="text-sm text-gray-500 mt-2">この操作は取り消せません。関連するフォームURLも無効化されます。</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" label="キャンセル" @click="showDeleteModal = false" />
          <UButton color="error" label="削除" @click="handleDelete" />
        </div>
      </template>
    </UModal>

    <!-- メール送信モーダル -->
    <UModal v-model:open="showEmailModal">
      <template #header>
        <h3 class="text-lg font-semibold">フォームURLをメール送信</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <p>「{{ targetSpeaker?.name || '(未入力)' }}」にフォームURLをメール送信します。</p>
          <UFormField label="送信先メールアドレス" required>
            <UInput v-model="emailAddress" type="email" placeholder="speaker@example.com" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" label="キャンセル" @click="showEmailModal = false" />
          <UButton label="送信" :disabled="!emailAddress" @click="handleSendEmail" />
        </div>
      </template>
    </UModal>
  </div>
</template>
