<script setup lang="ts">
// EVT-S02: イベント作成ウィザード（3ステップ）
// 仕様書: docs/design/features/project/EVT-001-005_event-planning.md §6
import type {
  EventType,
  EventFormat,
  DateCandidate,
  AiSuggestion,
  VenueSuggestion,
} from '~/composables/useEvents'

definePageMeta({ layout: 'dashboard' })

const router = useRouter()
const {
  isLoading,
  error,
  createEvent,
  generateAiSuggestion,
} = useEvents()

const {
  EVENT_TYPE_LABELS,
  EVENT_FORMAT_LABELS,
} = await import('~/composables/useEvents')

// ──────────────────────────────────────
// ステップ管理
// ──────────────────────────────────────

const currentStep = ref(1)
const steps = [
  { number: 1, label: '基本情報' },
  { number: 2, label: 'AI提案' },
  { number: 3, label: '確認' },
]

// ──────────────────────────────────────
// STEP 1: 基本情報
// ──────────────────────────────────────

const form = reactive({
  event_type: 'seminar' as EventType,
  goal: '',
  target_audience: '',
  capacity_onsite: 50,
  capacity_online: 0,
  budget_min: null as number | null,
  budget_max: null as number | null,
  date_candidates: [] as DateCandidate[],
})

// 日程候補の追加
const newDate = reactive({
  date: '',
  start_time: '14:00',
  end_time: '16:00',
})

function addDateCandidate() {
  if (!newDate.date) return
  if (form.date_candidates.length >= 5) return

  form.date_candidates.push({
    date: newDate.date,
    start_time: newDate.start_time,
    end_time: newDate.end_time,
    priority: form.date_candidates.length + 1,
  })

  newDate.date = ''
}

function removeDateCandidate(index: number) {
  form.date_candidates.splice(index, 1)
  // 優先度を再計算
  form.date_candidates.forEach((dc, i) => {
    dc.priority = i + 1
  })
}

// STEP 1 バリデーション
const step1Errors = ref<string[]>([])

function validateStep1(): boolean {
  step1Errors.value = []

  if (!form.goal.trim()) {
    step1Errors.value.push('イベントの目的を入力してください')
  }
  if (form.goal.length > 1000) {
    step1Errors.value.push('目的は1000文字以内で入力してください')
  }
  if (!form.target_audience.trim()) {
    step1Errors.value.push('ターゲット参加者を入力してください')
  }
  if (form.date_candidates.length === 0) {
    step1Errors.value.push('日程候補を1つ以上追加してください')
  }
  if (form.budget_min != null && form.budget_max != null && form.budget_max < form.budget_min) {
    step1Errors.value.push('予算上限は下限以上にしてください')
  }

  return step1Errors.value.length === 0
}

// ──────────────────────────────────────
// STEP 2: AI提案
// ──────────────────────────────────────

const aiSuggestion = ref<AiSuggestion | null>(null)
const selectedVenueId = ref<string | null>(null)
const selectedFormat = ref<EventFormat>('onsite')
const suggestedTitle = ref('')
const aiError = ref<string | null>(null)

async function goToStep2() {
  if (!validateStep1()) return

  currentStep.value = 2
  aiError.value = null

  const result = await generateAiSuggestion({
    goal: form.goal,
    target_audience: form.target_audience,
    capacity_onsite: form.capacity_onsite || undefined,
    capacity_online: form.capacity_online || undefined,
    budget_min: form.budget_min ?? undefined,
    budget_max: form.budget_max ?? undefined,
    date_candidates: form.date_candidates,
    event_type: form.event_type,
  })

  if (result) {
    aiSuggestion.value = result
    selectedFormat.value = result.format.recommended
    if (result.venues.length > 0) {
      selectedVenueId.value = result.venues[0]!.venue_id
    }
    suggestedTitle.value = result.suggested_title ?? ''
  } else {
    aiError.value = error.value ?? 'AI提案の生成に失敗しました。手動で入力を進めてください。'
  }
}

const selectedVenue = computed<VenueSuggestion | null>(() => {
  if (!aiSuggestion.value || !selectedVenueId.value) return null
  return aiSuggestion.value.venues.find(v => v.venue_id === selectedVenueId.value) ?? null
})

// ──────────────────────────────────────
// STEP 3: 確認・登録
// ──────────────────────────────────────

const saveAsDraft = ref(false)

async function handleSubmit() {
  // 日程候補の最初を start_at / end_at に使用
  const firstDate = form.date_candidates[0]
  let startAt: string | null = null
  let endAt: string | null = null
  if (firstDate) {
    startAt = `${firstDate.date}T${firstDate.start_time}:00`
    endAt = `${firstDate.date}T${firstDate.end_time}:00`
  }

  const result = await createEvent({
    title: suggestedTitle.value || `${form.goal} ${EVENT_TYPE_LABELS[form.event_type]}`,
    description: aiSuggestion.value?.suggested_description ?? null,
    event_type: form.event_type,
    format: selectedFormat.value,
    goal: form.goal,
    target_audience: form.target_audience,
    capacity_onsite: form.capacity_onsite || null,
    capacity_online: form.capacity_online || null,
    budget_min: form.budget_min,
    budget_max: form.budget_max,
    date_candidates: form.date_candidates,
    venue_id: selectedVenueId.value,
    start_at: startAt,
    end_at: endAt,
    ai_suggestions: aiSuggestion.value ? {
      venues: aiSuggestion.value.venues,
      format: aiSuggestion.value.format,
      estimate_id: aiSuggestion.value.estimate.id,
    } : undefined,
    ai_generated: Boolean(aiSuggestion.value),
  })

  if (result) {
    // 下書き保存でなければ planning に遷移
    if (!saveAsDraft.value && result.id) {
      await $fetch(`/api/v1/events/${result.id}`, {
        method: 'PATCH',
        body: { status: 'planning' },
      })
    }
    router.push(`/events/${result.id}`)
  }
}

// ──────────────────────────────────────
// 金額フォーマット
// ──────────────────────────────────────

function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString()}`
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- ヘッダー -->
    <div>
      <h1 class="text-2xl font-bold">新規イベント作成</h1>
    </div>

    <!-- ステップインジケーター -->
    <div class="flex items-center gap-2">
      <div
        v-for="step in steps"
        :key="step.number"
        class="flex items-center gap-2"
        :class="{ 'flex-1': step.number < 3 }"
      >
        <div
          class="flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold"
          :class="{
            'bg-primary-500 text-white': currentStep === step.number,
            'bg-primary-100 text-primary-700': currentStep > step.number,
            'bg-gray-200 text-gray-500': currentStep < step.number,
          }"
        >
          <UIcon v-if="currentStep > step.number" name="i-heroicons-check" class="w-5 h-5" />
          <span v-else>{{ step.number }}</span>
        </div>
        <span
          class="text-sm font-medium"
          :class="{
            'text-primary-700': currentStep >= step.number,
            'text-gray-400': currentStep < step.number,
          }"
        >
          {{ step.label }}
        </span>
        <div
          v-if="step.number < 3"
          class="flex-1 h-0.5 mx-2"
          :class="{
            'bg-primary-500': currentStep > step.number,
            'bg-gray-200': currentStep <= step.number,
          }"
        />
      </div>
    </div>

    <!-- エラー表示 -->
    <UAlert
      v-if="step1Errors.length > 0 && currentStep === 1"
      color="error"
      icon="i-heroicons-exclamation-triangle"
    >
      <template #title>入力エラー</template>
      <template #description>
        <ul class="list-disc ml-4">
          <li v-for="err in step1Errors" :key="err">{{ err }}</li>
        </ul>
      </template>
    </UAlert>

    <!-- ━━━ STEP 1: 基本情報 ━━━ -->
    <UCard v-if="currentStep === 1">
      <template #header>
        <h2 class="font-semibold">イベントの基本情報を入力してください</h2>
      </template>

      <div class="space-y-6">
        <!-- イベント種別 -->
        <div>
          <label class="block text-sm font-medium mb-2">イベント種別 *</label>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="(label, key) in EVENT_TYPE_LABELS"
              :key="key"
              :label="label"
              :variant="form.event_type === key ? 'solid' : 'outline'"
              :color="form.event_type === key ? 'primary' : 'neutral'"
              size="sm"
              @click="form.event_type = key as EventType"
            />
          </div>
        </div>

        <!-- 目的 -->
        <div>
          <label class="block text-sm font-medium mb-2">イベントの目的 *</label>
          <UTextarea
            v-model="form.goal"
            placeholder="例: 新製品の認知度向上とリード獲得"
            :rows="3"
          />
          <p class="text-xs text-gray-500 mt-1">{{ form.goal.length }}/1000</p>
        </div>

        <!-- ターゲット -->
        <div>
          <label class="block text-sm font-medium mb-2">ターゲット参加者 *</label>
          <UTextarea
            v-model="form.target_audience"
            placeholder="例: 製造業の経営者・IT責任者（30-50代）"
            :rows="2"
          />
        </div>

        <!-- 参加者数 -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-2">現地参加者数</label>
            <UInput v-model.number="form.capacity_onsite" type="number" min="0" max="10000" placeholder="50" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">オンライン参加者数</label>
            <UInput v-model.number="form.capacity_online" type="number" min="0" max="10000" placeholder="100" />
          </div>
        </div>

        <!-- 予算範囲 -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-2">予算下限（円）</label>
            <UInput v-model.number="form.budget_min" type="number" min="0" placeholder="100,000" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">予算上限（円）</label>
            <UInput v-model.number="form.budget_max" type="number" min="0" placeholder="300,000" />
          </div>
        </div>

        <!-- 日程候補 -->
        <div>
          <label class="block text-sm font-medium mb-2">日程候補 *（最大5件）</label>

          <div v-if="form.date_candidates.length > 0" class="space-y-2 mb-3">
            <div
              v-for="(dc, idx) in form.date_candidates"
              :key="idx"
              class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <UBadge color="primary" variant="subtle">優先{{ dc.priority }}</UBadge>
              <span class="font-medium">{{ dc.date }}</span>
              <span class="text-gray-500">{{ dc.start_time }} - {{ dc.end_time }}</span>
              <UButton
                icon="i-heroicons-x-mark"
                color="error"
                variant="ghost"
                size="xs"
                @click="removeDateCandidate(idx)"
              />
            </div>
          </div>

          <div v-if="form.date_candidates.length < 5" class="flex items-end gap-2">
            <div class="flex-1">
              <UInput v-model="newDate.date" type="date" />
            </div>
            <UInput v-model="newDate.start_time" type="time" class="w-28" />
            <span class="text-gray-500 pb-2">-</span>
            <UInput v-model="newDate.end_time" type="time" class="w-28" />
            <UButton
              icon="i-heroicons-plus"
              label="追加"
              variant="outline"
              size="sm"
              @click="addDateCandidate"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between">
          <UButton
            label="下書き保存"
            variant="ghost"
            @click="saveAsDraft = true; currentStep = 3"
          />
          <UButton
            label="AI提案を生成"
            icon="i-heroicons-sparkles"
            color="primary"
            :loading="isLoading"
            @click="goToStep2"
          />
        </div>
      </template>
    </UCard>

    <!-- ━━━ STEP 2: AI提案 ━━━ -->
    <div v-if="currentStep === 2" class="space-y-4">
      <!-- ローディング -->
      <UCard v-if="isLoading">
        <div class="text-center py-8">
          <UIcon name="i-heroicons-sparkles" class="w-8 h-8 text-primary-500 animate-pulse" />
          <p class="mt-4 text-gray-600">AIがイベント内容を分析しています...</p>
        </div>
      </UCard>

      <!-- AI エラー -->
      <UAlert
        v-else-if="aiError"
        color="warning"
        icon="i-heroicons-exclamation-triangle"
        :title="aiError"
      />

      <!-- 提案結果 -->
      <template v-else-if="aiSuggestion">
        <!-- 形式提案 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">推奨開催形式</h3>
          </template>
          <div class="space-y-3">
            <p class="text-sm text-gray-600">{{ aiSuggestion.format.reason }}</p>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="(label, key) in EVENT_FORMAT_LABELS"
                :key="key"
                :label="label"
                :variant="selectedFormat === key ? 'solid' : 'outline'"
                :color="selectedFormat === key ? 'primary' : 'neutral'"
                size="sm"
                @click="selectedFormat = key as EventFormat"
              />
            </div>
          </div>
        </UCard>

        <!-- 会場候補 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">会場候補</h3>
          </template>
          <div v-if="aiSuggestion.venues.length === 0" class="text-center py-4 text-gray-500">
            条件に合う会場が見つかりませんでした。手動で会場を選択してください。
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="v in aiSuggestion.venues"
              :key="v.venue_id"
              class="flex items-start gap-3 p-3 rounded-lg cursor-pointer border-2 transition-colors"
              :class="{
                'border-primary-500 bg-primary-50': selectedVenueId === v.venue_id,
                'border-gray-200 hover:border-gray-300': selectedVenueId !== v.venue_id,
              }"
              @click="selectedVenueId = v.venue_id"
            >
              <UIcon
                :name="selectedVenueId === v.venue_id ? 'i-heroicons-check-circle-solid' : 'i-heroicons-building-office'"
                class="w-5 h-5 mt-0.5"
                :class="{
                  'text-primary-500': selectedVenueId === v.venue_id,
                  'text-gray-400': selectedVenueId !== v.venue_id,
                }"
              />
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ v.name }}</span>
                  <span class="text-sm text-gray-500">(収容: {{ v.capacity }}名)</span>
                  <UBadge v-if="v.availability" color="success" variant="subtle" size="xs">空きあり</UBadge>
                  <UBadge v-else color="warning" variant="subtle" size="xs">要確認</UBadge>
                </div>
                <p class="text-sm text-gray-500 mt-1">{{ v.reason }}</p>
              </div>
            </div>
          </div>
        </UCard>

        <!-- 概算見積り -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">概算見積り</h3>
          </template>
          <div class="space-y-2">
            <div
              v-for="(item, idx) in aiSuggestion.estimate.items"
              :key="idx"
              class="flex justify-between py-2"
            >
              <span class="text-gray-700">{{ item.name }}</span>
              <span class="font-medium">{{ formatCurrency(item.subtotal) }}</span>
            </div>
            <hr>
            <div class="flex justify-between py-2 font-bold">
              <span>合計</span>
              <span>{{ formatCurrency(aiSuggestion.estimate.total_amount) }}</span>
            </div>
          </div>
        </UCard>

        <!-- タイトル案 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">タイトル案</h3>
          </template>
          <UInput v-model="suggestedTitle" placeholder="イベントタイトル" />
        </UCard>
      </template>

      <!-- フッター -->
      <div class="flex justify-between">
        <UButton
          label="戻る"
          variant="ghost"
          icon="i-heroicons-arrow-left"
          @click="currentStep = 1"
        />
        <div class="flex gap-2">
          <UButton
            label="下書き保存"
            variant="outline"
            @click="saveAsDraft = true; currentStep = 3"
          />
          <UButton
            label="次へ"
            color="primary"
            icon="i-heroicons-arrow-right"
            trailing
            @click="saveAsDraft = false; currentStep = 3"
          />
        </div>
      </div>
    </div>

    <!-- ━━━ STEP 3: 確認 ━━━ -->
    <div v-if="currentStep === 3" class="space-y-4">
      <UCard>
        <template #header>
          <h2 class="font-semibold">最終確認</h2>
        </template>

        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm text-gray-500">タイトル</label>
              <p class="font-medium">{{ suggestedTitle || `${form.goal} ${EVENT_TYPE_LABELS[form.event_type]}` }}</p>
            </div>
            <div>
              <label class="text-sm text-gray-500">種別</label>
              <p>{{ EVENT_TYPE_LABELS[form.event_type] }}</p>
            </div>
            <div>
              <label class="text-sm text-gray-500">形式</label>
              <p>{{ EVENT_FORMAT_LABELS[selectedFormat] }}</p>
            </div>
            <div>
              <label class="text-sm text-gray-500">会場</label>
              <p>{{ selectedVenue?.name ?? '未選択' }}</p>
            </div>
            <div>
              <label class="text-sm text-gray-500">定員</label>
              <p>
                <span v-if="form.capacity_onsite">現地{{ form.capacity_onsite }}名</span>
                <span v-if="form.capacity_onsite && form.capacity_online"> / </span>
                <span v-if="form.capacity_online">オンライン{{ form.capacity_online }}名</span>
                <span v-if="!form.capacity_onsite && !form.capacity_online">未設定</span>
              </p>
            </div>
            <div v-if="aiSuggestion">
              <label class="text-sm text-gray-500">概算</label>
              <p class="font-medium">{{ formatCurrency(aiSuggestion.estimate.total_amount) }}</p>
            </div>
          </div>

          <div v-if="form.date_candidates.length > 0">
            <label class="text-sm text-gray-500">日程候補</label>
            <div class="flex flex-wrap gap-2 mt-1">
              <UBadge
                v-for="dc in form.date_candidates"
                :key="dc.date"
                color="info"
                variant="subtle"
              >
                {{ dc.date }} {{ dc.start_time }}-{{ dc.end_time }}
              </UBadge>
            </div>
          </div>
        </div>
      </UCard>

      <!-- アクション選択 -->
      <UCard>
        <div class="space-y-3">
          <label class="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer" :class="saveAsDraft ? 'border-primary-500 bg-primary-50' : 'border-gray-200'" @click="saveAsDraft = true">
            <UIcon :name="saveAsDraft ? 'i-heroicons-check-circle-solid' : 'i-heroicons-circle-stack'" class="w-5 h-5" :class="saveAsDraft ? 'text-primary-500' : 'text-gray-400'" />
            <div>
              <p class="font-medium">下書きとして保存</p>
              <p class="text-sm text-gray-500">後で編集・確定できます</p>
            </div>
          </label>
          <label class="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer" :class="!saveAsDraft ? 'border-primary-500 bg-primary-50' : 'border-gray-200'" @click="saveAsDraft = false">
            <UIcon :name="!saveAsDraft ? 'i-heroicons-check-circle-solid' : 'i-heroicons-document-text'" class="w-5 h-5" :class="!saveAsDraft ? 'text-primary-500' : 'text-gray-400'" />
            <div>
              <p class="font-medium">企画書を生成して確定</p>
              <p class="text-sm text-gray-500">ステータスが「企画中」になります</p>
            </div>
          </label>
        </div>
      </UCard>

      <!-- フッター -->
      <div class="flex justify-between">
        <UButton
          label="戻る"
          variant="ghost"
          icon="i-heroicons-arrow-left"
          @click="currentStep = aiSuggestion ? 2 : 1"
        />
        <UButton
          :label="saveAsDraft ? '下書き保存' : '完了'"
          color="primary"
          :loading="isLoading"
          @click="handleSubmit"
        />
      </div>
    </div>
  </div>
</template>
