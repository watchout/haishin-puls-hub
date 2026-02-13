<script setup lang="ts">
// EVT-030 §6.1: 参加者ポータル（公開ページ、認証不要）
// SCR-PORTAL: /portal/:slug
import { usePortal } from '~/composables/useParticipants'

definePageMeta({ layout: 'default' })

const route = useRoute()
const slug = route.params.slug as string

const {
  portalData,
  isLoading,
  error,
  isRegistering,
  isRegistered,
  fetchPortal,
  register,
} = usePortal(slug)

// 参加申込フォーム
const showRegisterForm = ref(false)
const registerForm = reactive({
  name: '',
  email: '',
  organization: '',
  job_title: '',
  phone: '',
  participation_type: 'onsite' as string,
})

// 読み込み
onMounted(async () => {
  await fetchPortal()
})

// 参加申込
async function handleRegister() {
  const ok = await register({
    name: registerForm.name,
    email: registerForm.email,
    organization: registerForm.organization || undefined,
    job_title: registerForm.job_title || undefined,
    phone: registerForm.phone || undefined,
    participation_type: registerForm.participation_type,
  })
  if (ok) {
    showRegisterForm.value = false
  }
}

// 日時フォーマット
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- ローディング -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-primary" />
    </div>

    <!-- エラー -->
    <div v-else-if="error && !portalData" class="flex items-center justify-center min-h-screen">
      <div class="text-center max-w-md">
        <UIcon name="i-heroicons-exclamation-triangle" class="text-6xl mb-4 text-red-500" />
        <h1 class="text-xl font-bold mb-2">ポータルが見つかりません</h1>
        <p class="text-gray-500">{{ error }}</p>
      </div>
    </div>

    <!-- 申込完了 -->
    <div v-else-if="isRegistered" class="flex items-center justify-center min-h-screen">
      <div class="text-center max-w-md bg-white rounded-xl shadow-lg p-8">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UIcon name="i-heroicons-check" class="text-3xl text-green-600" />
        </div>
        <h1 class="text-xl font-bold mb-2">申込が完了しました</h1>
        <p class="text-gray-500 mb-4">
          確認メールをご確認ください。<br>
          受付票（QRコード）が届きます。
        </p>
      </div>
    </div>

    <!-- ポータル本体 -->
    <div v-else-if="portalData" class="max-w-3xl mx-auto">
      <!-- アーカイブバナー -->
      <UAlert v-if="portalData.event.isArchived" color="info" title="このイベントは終了しました" class="rounded-none" />
      <UAlert v-if="portalData.event.isCancelled" color="warning" title="このイベントはキャンセルされました" class="rounded-none" />

      <!-- ヘッダー -->
      <div class="bg-primary-600 text-white p-8 text-center">
        <h1 class="text-2xl md:text-3xl font-bold mb-2">{{ portalData.event.title }}</h1>
        <p class="text-lg opacity-90">
          {{ formatDate(portalData.event.startAt) }}
          {{ formatTime(portalData.event.startAt) }} - {{ formatTime(portalData.event.endAt) }}
        </p>
      </div>

      <!-- クイックアクセス -->
      <div class="bg-white border-b p-4 flex flex-wrap gap-3 justify-center">
        <UButton
          v-if="portalData.event.wifi"
          variant="outline"
          size="sm"
          icon="i-heroicons-wifi"
          :label="`Wi-Fi: ${portalData.event.wifi.ssid}`"
        />
        <UButton
          v-if="portalData.event.streamingUrl"
          variant="outline"
          size="sm"
          icon="i-heroicons-video-camera"
          label="配信を視聴"
          :to="portalData.event.streamingUrl"
          target="_blank"
        />
        <UButton
          v-if="!portalData.event.isArchived && !portalData.event.isCancelled"
          size="sm"
          icon="i-heroicons-ticket"
          label="参加申込"
          @click="showRegisterForm = true"
        />
      </div>

      <!-- コンテンツ -->
      <div class="p-6 space-y-8">
        <!-- イベント概要 -->
        <section v-if="portalData.event.description">
          <h2 class="text-lg font-bold mb-3 flex items-center gap-2">
            <UIcon name="i-heroicons-information-circle" />
            イベント概要
          </h2>
          <div class="bg-white rounded-lg shadow p-4">
            <p class="whitespace-pre-wrap text-gray-700">{{ portalData.event.description }}</p>
          </div>
        </section>

        <!-- 登壇者紹介 -->
        <section v-if="portalData.speakers.length > 0">
          <h2 class="text-lg font-bold mb-3 flex items-center gap-2">
            <UIcon name="i-heroicons-microphone" />
            登壇者紹介
          </h2>
          <div class="grid gap-4 md:grid-cols-2">
            <div
              v-for="spk in portalData.speakers"
              :key="spk.id"
              class="bg-white rounded-lg shadow p-4 flex gap-4"
            >
              <UAvatar
                :src="spk.photoUrl ?? undefined"
                :alt="spk.name"
                size="lg"
              />
              <div>
                <p class="font-bold">{{ spk.name }}</p>
                <p v-if="spk.title" class="text-sm text-gray-500">{{ spk.title }}</p>
                <p v-if="spk.organization" class="text-sm text-gray-500">{{ spk.organization }}</p>
                <p v-if="spk.presentationTitle" class="text-sm text-primary-600 mt-1">{{ spk.presentationTitle }}</p>
                <p v-if="spk.bio" class="text-xs text-gray-400 mt-1 line-clamp-3">{{ spk.bio }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Wi-Fi情報 -->
        <section v-if="portalData.event.wifi">
          <h2 class="text-lg font-bold mb-3 flex items-center gap-2">
            <UIcon name="i-heroicons-wifi" />
            Wi-Fi情報
          </h2>
          <div class="bg-white rounded-lg shadow p-4">
            <p><span class="text-gray-500">SSID:</span> <strong>{{ portalData.event.wifi.ssid }}</strong></p>
            <p v-if="portalData.event.wifi.password">
              <span class="text-gray-500">パスワード:</span> <strong>{{ portalData.event.wifi.password }}</strong>
            </p>
          </div>
        </section>

        <!-- 会場案内 -->
        <section v-if="portalData.event.venueInfo && Object.keys(portalData.event.venueInfo).length > 0">
          <h2 class="text-lg font-bold mb-3 flex items-center gap-2">
            <UIcon name="i-heroicons-map-pin" />
            会場案内
          </h2>
          <div class="bg-white rounded-lg shadow p-4 space-y-2">
            <div v-for="(value, key) in portalData.event.venueInfo" :key="key">
              <span class="text-gray-500">{{ key }}:</span> {{ value }}
            </div>
          </div>
        </section>
      </div>

      <!-- 参加申込フォーム（モーダル） -->
      <UModal v-model:open="showRegisterForm">
        <template #header>
          <h3 class="text-lg font-semibold">参加申込</h3>
        </template>
        <template #body>
          <form class="space-y-4" @submit.prevent="handleRegister">
            <UAlert v-if="error" color="error" :title="error" />

            <UFormField label="お名前" required>
              <UInput v-model="registerForm.name" placeholder="鈴木花子" />
            </UFormField>
            <UFormField label="メールアドレス" required>
              <UInput v-model="registerForm.email" type="email" placeholder="hanako@example.com" />
            </UFormField>
            <UFormField label="組織名">
              <UInput v-model="registerForm.organization" placeholder="株式会社サンプル" />
            </UFormField>
            <UFormField label="役職">
              <UInput v-model="registerForm.job_title" placeholder="エンジニア" />
            </UFormField>
            <UFormField label="電話番号">
              <UInput v-model="registerForm.phone" placeholder="090-1234-5678" />
            </UFormField>
            <UFormField label="参加形態" required>
              <URadioGroup
                v-model="registerForm.participation_type"
                :items="[
                  { label: '現地参加', value: 'onsite' },
                  { label: 'オンライン参加', value: 'online' },
                ]"
              />
            </UFormField>
          </form>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" label="キャンセル" @click="showRegisterForm = false" />
            <UButton
              label="申し込む"
              :loading="isRegistering"
              :disabled="!registerForm.name || !registerForm.email"
              @click="handleRegister"
            />
          </div>
        </template>
      </UModal>
    </div>
  </div>
</template>
