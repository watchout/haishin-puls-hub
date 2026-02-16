<script setup lang="ts">
// EVT-031 §6.2-6.4: スタッフ用チェックイン画面
// SCR-CHECKIN: /events/:eid/checkin
import {
  useParticipants,
  getCheckinMethodLabel,
} from '~/composables/useParticipants'
import type { ParticipantData, CheckinResult } from '~/composables/useParticipants'

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

// 画面モード
type CheckinMode = 'search' | 'walk_in'
const mode = ref<CheckinMode>('search')

// チェックイン結果表示
const lastResult = ref<CheckinResult | null>(null)
const showSuccess = ref(false)
const showError = ref(false)

// 検索
const searchQuery = ref('')
const searchResults = ref<ParticipantData[]>([])

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

// 検索
watch(searchQuery, async (q) => {
  if (q.length >= 1) {
    await fetchParticipants({ q })
    searchResults.value = participants.value
  } else {
    searchResults.value = []
  }
})

// 手動チェックイン実行
async function handleCheckin(prt: ParticipantData) {
  showSuccess.value = false
  showError.value = false

  const result = await checkinManual(prt.id)
  if (result) {
    lastResult.value = result
    showSuccess.value = true
    // 2秒後にリセット
    setTimeout(() => {
      showSuccess.value = false
      lastResult.value = null
      searchQuery.value = ''
      searchResults.value = []
    }, 3000)
  } else {
    showError.value = true
    setTimeout(() => {
      showError.value = false
    }, 3000)
  }
}

// 当日参加者登録
async function handleWalkIn() {
  showSuccess.value = false
  showError.value = false

  const result = await walkIn({
    name: walkInForm.name,
    email: walkInForm.email,
    organization: walkInForm.organization || undefined,
    participation_type: walkInForm.participation_type,
  })

  if (result) {
    showSuccess.value = true
    lastResult.value = {
      checkin_id: result.checkin_id,
      participant: { id: result.participant_id, name: walkInForm.name, organization: walkInForm.organization || null },
      checked_in_at: result.checked_in_at,
    }
    walkInForm.name = ''
    walkInForm.email = ''
    walkInForm.organization = ''
    walkInForm.participation_type = 'onsite'
    setTimeout(() => {
      showSuccess.value = false
      lastResult.value = null
    }, 3000)
  } else {
    showError.value = true
    setTimeout(() => {
      showError.value = false
    }, 3000)
  }
}

const _getCheckinMethodLabel = getCheckinMethodLabel
</script>

<template>
  <div class="p-6 max-w-2xl mx-auto">
    <!-- ヘッダー -->
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">チェックイン受付</h1>
      <NuxtLink :to="`/events/${eventId}/participants`">
        <UButton icon="i-heroicons-users" label="参加者一覧" variant="outline" size="sm" />
      </NuxtLink>
    </div>

    <!-- チェックイン統計 -->
    <div v-if="stats" class="bg-white rounded-lg shadow p-4 mb-6 text-center">
      <p class="text-sm text-gray-500">本日のチェックイン状況</p>
      <p class="text-3xl font-bold mt-1">
        <span class="text-green-600">{{ stats.checked_in }}</span>
        <span class="text-gray-400"> / </span>
        <span>{{ stats.total_registered }}</span>
        <span class="text-lg ml-2 text-gray-500">({{ stats.checkin_rate }}%)</span>
      </p>
      <p class="text-sm text-gray-400 mt-1">当日参加: {{ stats.walk_in }}人</p>
    </div>

    <!-- チェックイン成功フィードバック -->
    <div v-if="showSuccess && lastResult" class="bg-green-50 border-2 border-green-500 rounded-xl p-6 mb-6 text-center animate-pulse">
      <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <UIcon name="i-heroicons-check" class="text-3xl text-green-600" />
      </div>
      <p class="text-xl font-bold text-green-700">チェックイン完了</p>
      <p class="text-lg mt-1">{{ lastResult.participant.name }}</p>
      <p v-if="lastResult.participant.organization" class="text-sm text-gray-500">{{ lastResult.participant.organization }}</p>
    </div>

    <!-- チェックインエラーフィードバック -->
    <div v-if="showError" class="bg-red-50 border-2 border-red-500 rounded-xl p-6 mb-6 text-center">
      <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <UIcon name="i-heroicons-x-mark" class="text-3xl text-red-600" />
      </div>
      <p class="text-xl font-bold text-red-700">エラー</p>
      <p class="text-sm text-red-500 mt-1">{{ error }}</p>
    </div>

    <!-- モード切替 -->
    <div class="flex gap-2 mb-6">
      <UButton
        :variant="mode === 'search' ? 'solid' : 'outline'"
        icon="i-heroicons-magnifying-glass"
        label="参加者検索"
        @click="mode = 'search'"
      />
      <UButton
        :variant="mode === 'walk_in' ? 'solid' : 'outline'"
        icon="i-heroicons-user-plus"
        label="当日参加者登録"
        @click="mode = 'walk_in'"
      />
    </div>

    <!-- 参加者検索モード -->
    <div v-if="mode === 'search'" class="space-y-4">
      <UInput
        v-model="searchQuery"
        icon="i-heroicons-magnifying-glass"
        placeholder="名前・メール・組織名で検索"
        size="lg"
        autofocus
      />

      <!-- 検索結果 -->
      <div v-if="searchResults.length > 0" class="space-y-2">
        <p class="text-sm text-gray-500">検索結果 ({{ searchResults.length }}件)</p>
        <div
          v-for="prt in searchResults"
          :key="prt.id"
          class="bg-white rounded-lg shadow p-4 flex justify-between items-center"
        >
          <div>
            <p class="font-semibold">{{ prt.name }}</p>
            <p class="text-sm text-gray-500">{{ prt.organization || '-' }}</p>
            <p class="text-xs text-gray-400">{{ prt.email }}</p>
          </div>
          <div>
            <template v-if="prt.checkedIn">
              <UBadge color="success" label="チェックイン済" />
              <p class="text-xs text-gray-400 mt-1">{{ _getCheckinMethodLabel(prt.checkinMethod) }}</p>
            </template>
            <UButton
              v-else
              label="チェックイン"
              icon="i-heroicons-check-circle"
              @click="handleCheckin(prt)"
            />
          </div>
        </div>
      </div>

      <div v-else-if="searchQuery && !isLoading" class="text-center py-8 text-gray-500">
        <p>該当する参加者が見つかりません</p>
      </div>
    </div>

    <!-- 当日参加者登録モード -->
    <div v-if="mode === 'walk_in'" class="bg-white rounded-lg shadow p-6">
      <form class="space-y-4" @submit.prevent="handleWalkIn">
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
        <UButton
          type="submit"
          block
          icon="i-heroicons-user-plus"
          label="登録してチェックイン"
          :disabled="!walkInForm.name || !walkInForm.email"
        />
      </form>
    </div>
  </div>
</template>
