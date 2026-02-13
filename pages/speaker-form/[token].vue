<script setup lang="ts">
// EVT-020-021 §4.4: 登壇者情報フォーム（公開）
// SCR-SPK-FORM: /speaker-form/:token（認証不要）
import { useSpeakerForm, getSpeakerFormatLabel } from '~/composables/useSpeakers'

definePageMeta({ layout: 'default' })

const route = useRoute()
const token = route.params.token as string

const { formData, isLoading, isSubmitting, isSubmitted, error, eventCancelled, fetchForm, submitForm } = useSpeakerForm(token)

// フォーム入力
const form = reactive({
  name: '',
  title: '',
  organization: '',
  bio: '',
  presentationTitle: '',
  startAt: '',
  durationMinutes: null as number | null,
  format: 'onsite' as 'onsite' | 'online',
})

// フォーム読み込み
onMounted(async () => {
  await fetchForm()
  if (formData.value?.speaker) {
    const spk = formData.value.speaker
    form.name = spk.name || ''
    form.title = spk.title || ''
    form.organization = spk.organization || ''
    form.bio = spk.bio || ''
    form.presentationTitle = spk.presentationTitle || ''
    form.startAt = spk.startAt ? new Date(spk.startAt).toISOString().slice(11, 16) : ''
    form.durationMinutes = spk.durationMinutes
    form.format = (spk.format as 'onsite' | 'online') || 'onsite'
  }
})

// フォーム送信
async function handleSubmit() {
  const payload: Record<string, unknown> = {
    name: form.name,
    format: form.format,
  }

  if (form.title) payload.title = form.title
  if (form.organization) payload.organization = form.organization
  if (form.bio) payload.bio = form.bio
  if (form.presentationTitle) payload.presentation_title = form.presentationTitle
  if (form.durationMinutes !== null) payload.duration_minutes = form.durationMinutes

  await submitForm(payload)
}

const _getSpeakerFormatLabel = getSpeakerFormatLabel
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- ローディング -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-primary" />
    </div>

    <!-- エラー: フォーム見つからない or キャンセル -->
    <div v-else-if="error && !formData" class="flex items-center justify-center min-h-screen">
      <div class="text-center max-w-md">
        <UIcon
          :name="eventCancelled ? 'i-heroicons-x-circle' : 'i-heroicons-exclamation-triangle'"
          class="text-6xl mb-4"
          :class="eventCancelled ? 'text-orange-500' : 'text-red-500'"
        />
        <h1 class="text-xl font-bold mb-2">
          {{ eventCancelled ? 'イベントはキャンセルされました' : 'フォームが見つかりません' }}
        </h1>
        <p class="text-gray-500">{{ error }}</p>
      </div>
    </div>

    <!-- 送信完了画面 (§4.5) -->
    <div v-else-if="isSubmitted" class="flex items-center justify-center min-h-screen">
      <div class="text-center max-w-md bg-white rounded-xl shadow-lg p-8">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UIcon name="i-heroicons-check" class="text-3xl text-green-600" />
        </div>
        <h1 class="text-xl font-bold mb-2">登壇者情報を受け付けました</h1>
        <p class="text-gray-500 mb-4">
          ご提出ありがとうございました。<br>
          主催者が内容を確認次第、ご連絡いたします。
        </p>
        <p class="text-sm text-gray-400">このウィンドウは閉じていただいて構いません。</p>
      </div>
    </div>

    <!-- フォーム本体 (§4.4) -->
    <div v-else-if="formData" class="max-w-[600px] mx-auto py-8 px-4">
      <!-- ヘッダー -->
      <div class="text-center mb-8">
        <h1 class="text-xl font-bold mb-1">登壇者情報のご提出</h1>
        <p class="text-gray-600">
          イベント: {{ formData.event.title }}
        </p>
        <p v-if="formData.event.startAt" class="text-sm text-gray-500">
          日時: {{ new Date(formData.event.startAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) }}
        </p>
      </div>

      <!-- キャンセルバナー -->
      <UAlert v-if="eventCancelled" color="warning" title="イベントはキャンセルされました" class="mb-6" />

      <!-- フォーム -->
      <form class="space-y-6 bg-white rounded-xl shadow p-6" @submit.prevent="handleSubmit">
        <!-- エラー表示 -->
        <UAlert v-if="error" color="error" :title="error" />

        <!-- 氏名 (必須) -->
        <UFormField label="氏名" required>
          <UInput v-model="form.name" placeholder="山田 太郎" :disabled="eventCancelled" />
        </UFormField>

        <!-- 肩書き -->
        <UFormField label="肩書き">
          <UInput v-model="form.title" placeholder="取締役CTO" :disabled="eventCancelled" />
        </UFormField>

        <!-- 所属 -->
        <UFormField label="所属">
          <UInput v-model="form.organization" placeholder="株式会社ABC" :disabled="eventCancelled" />
        </UFormField>

        <!-- プロフィール -->
        <UFormField label="プロフィール" hint="2000文字以内">
          <UTextarea v-model="form.bio" :rows="5" placeholder="自己紹介をご記入ください" :disabled="eventCancelled" />
        </UFormField>

        <!-- 登壇タイトル -->
        <UFormField label="登壇タイトル">
          <UInput v-model="form.presentationTitle" placeholder="AI×DXで変わる未来" :disabled="eventCancelled" />
        </UFormField>

        <!-- 登壇開始時刻 -->
        <UFormField label="登壇開始時刻">
          <UInput v-model="form.startAt" type="time" :disabled="eventCancelled" />
        </UFormField>

        <!-- 持ち時間 -->
        <UFormField label="持ち時間（分）" hint="1〜240分">
          <UInput v-model.number="form.durationMinutes" type="number" :min="1" :max="240" placeholder="45" :disabled="eventCancelled" />
        </UFormField>

        <!-- 登壇形式 -->
        <UFormField label="登壇形式">
          <URadioGroup
            v-model="form.format"
            :items="[
              { label: '現地登壇', value: 'onsite' },
              { label: 'オンライン登壇', value: 'online' },
            ]"
            :disabled="eventCancelled"
          />
        </UFormField>

        <!-- TODO: 顔写真・資料アップロード (§3.6) - ファイルアップロード基盤完成後に追加 -->

        <!-- 送信ボタン -->
        <UButton
          type="submit"
          block
          :loading="isSubmitting"
          :disabled="!form.name || eventCancelled"
          label="送信する"
        />
      </form>
    </div>
  </div>
</template>
