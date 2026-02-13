<script setup lang="ts">
// EVT-050-051 §6: AIチャットパネル（スライドオーバー）
// FR-050-3: 右スライドオーバー形式（幅480px）
// FR-050-4: メッセージ入力欄（マルチライン、最大4000文字）
// FR-050-5: ストリーミング表示

const {
  messages,
  input,
  isLoading,
  error,
  isPanelOpen,
  activeTab,
  charCount,
  isOverLimit,
  canSend,
  sendMessage,
  closePanel,
  startNewConversation,
} = useAIChat()

const {
  conversations,
  isLoading: isHistoryLoading,
  hasMore,
  fetchConversations,
  deleteConversation,
} = useConversationHistory()

const { restoreConversation } = useAIChat()

const messagesContainer = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)

// メッセージ追加時に自動スクロール
watch(messages, () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}, { deep: true })

// パネル展開時に入力欄にフォーカス
watch(isPanelOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
})

// 履歴タブに切り替え時に会話履歴を読み込み
watch(activeTab, (tab) => {
  if (tab === 'history') {
    fetchConversations(true)
  }
})

/** Enter送信、Shift+Enter改行（FR-050-4） */
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    if (canSend.value) {
      sendMessage()
    }
  }
}

/** 会話復元 */
async function handleRestoreConversation(id: string) {
  await restoreConversation(id)
}

/** 会話削除 */
async function handleDeleteConversation(id: string, event: Event) {
  event.stopPropagation()
  await deleteConversation(id)
}
</script>

<template>
  <!-- スライドオーバー（§6.2: 幅480px、右から展開） -->
  <USlideover
    v-model:open="isPanelOpen"
    side="right"
    :ui="{ width: 'max-w-[480px] w-full' }"
  >
    <template #content>
      <div class="flex flex-col h-full">
        <!-- ヘッダー -->
        <div class="flex items-center justify-between p-4 border-b">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-sparkles" class="w-5 h-5 text-primary-500" />
            <h2 class="text-lg font-semibold">HUBコンシェルジュ</h2>
          </div>
          <div class="flex items-center gap-1">
            <UButton
              icon="i-heroicons-plus"
              variant="ghost"
              size="sm"
              aria-label="新しい会話"
              @click="startNewConversation"
            />
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              size="sm"
              aria-label="閉じる"
              @click="closePanel"
            />
          </div>
        </div>

        <!-- タブ（§6.2: チャット / 履歴） -->
        <div class="flex border-b">
          <button
            class="flex-1 py-2 px-4 text-sm font-medium text-center transition-colors"
            :class="activeTab === 'chat' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'"
            @click="activeTab = 'chat'"
          >
            チャット
          </button>
          <button
            class="flex-1 py-2 px-4 text-sm font-medium text-center transition-colors"
            :class="activeTab === 'history' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'"
            @click="activeTab = 'history'"
          >
            履歴
          </button>
        </div>

        <!-- チャットタブ -->
        <template v-if="activeTab === 'chat'">
          <!-- メッセージエリア -->
          <div
            ref="messagesContainer"
            class="flex-1 overflow-y-auto p-4 space-y-4"
          >
            <!-- 空状態 -->
            <div
              v-if="messages.length === 0 && !isLoading"
              class="flex flex-col items-center justify-center h-full text-center"
            >
              <UIcon name="i-heroicons-sparkles" class="w-12 h-12 text-gray-300 mb-3" />
              <p class="text-gray-500 text-sm">
                AIアシスタントに質問や依頼をしてみましょう
              </p>
              <p class="text-gray-400 text-xs mt-1">
                イベント運営に関するサポートを提供します
              </p>
            </div>

            <!-- メッセージ一覧 -->
            <div
              v-for="(msg, idx) in messages"
              :key="idx"
              :class="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'"
            >
              <!-- ユーザーメッセージ（§6.3: 右寄せ、gray-100） -->
              <div
                v-if="msg.role === 'user'"
                class="max-w-[85%] bg-gray-100 rounded-lg p-3"
              >
                <div class="flex items-center gap-1 mb-1">
                  <span class="text-xs text-gray-500">{{ formatTime(msg.timestamp) }}</span>
                </div>
                <p class="text-sm whitespace-pre-wrap">{{ msg.content }}</p>
              </div>

              <!-- AIメッセージ（§6.3: 左寄せ、white、border） -->
              <div
                v-else
                class="max-w-[85%] bg-white border border-gray-200 rounded-lg p-3"
              >
                <div class="flex items-center gap-1 mb-1">
                  <UIcon name="i-heroicons-sparkles" class="w-3 h-3 text-primary-500" />
                  <span class="text-xs font-medium text-primary-600">HUBコンシェルジュ</span>
                  <span class="text-xs text-gray-500">{{ formatTime(msg.timestamp) }}</span>
                </div>

                <!-- ストリーミング中の表示 -->
                <div v-if="msg.isStreaming && msg.content === ''" class="flex items-center gap-1">
                  <div class="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style="animation-delay: 0ms" />
                  <div class="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style="animation-delay: 150ms" />
                  <div class="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style="animation-delay: 300ms" />
                </div>

                <!-- メッセージ本文（§6.3: Markdown対応） -->
                <div v-else class="text-sm whitespace-pre-wrap prose prose-sm max-w-none">
                  {{ msg.content }}
                  <!-- ストリーミングカーソル -->
                  <span v-if="msg.isStreaming" class="inline-block w-2 h-4 bg-primary-500 animate-pulse ml-0.5" />
                </div>

                <!-- Tool Call結果カード（§6.4） -->
                <div
                  v-for="(tc, tcIdx) in msg.toolCalls"
                  :key="tcIdx"
                  class="mt-3 bg-green-50 border border-green-200 rounded-lg p-3"
                >
                  <div class="flex items-center gap-2 mb-1">
                    <span v-if="tc.status === 'completed'" class="text-green-600">✅</span>
                    <UIcon
                      v-else-if="tc.status === 'pending'"
                      name="i-heroicons-arrow-path"
                      class="w-4 h-4 animate-spin text-gray-400"
                    />
                    <span class="text-sm font-medium">
                      {{ getToolCallLabel(tc.tool) }}
                    </span>
                  </div>
                  <!-- Tool結果詳細 -->
                  <div v-if="tc.result" class="text-xs text-gray-600 mt-1">
                    <template v-if="tc.result.message">
                      {{ tc.result.message }}
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- エラー表示 -->
          <div v-if="error" class="px-4 pb-2">
            <UAlert
              icon="i-heroicons-exclamation-triangle"
              color="error"
              :title="error"
              :close-button="{ icon: 'i-heroicons-x-mark', color: 'error', variant: 'link' }"
              @close="error = null"
            />
          </div>

          <!-- 入力エリア（§6.2: マルチライン、Enter送信） -->
          <div class="border-t p-4">
            <div class="flex gap-2 items-end">
              <div class="flex-1 relative">
                <textarea
                  ref="inputRef"
                  v-model="input"
                  :rows="1"
                  :maxlength="4000"
                  class="w-full resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  :class="{ 'border-red-500': isOverLimit }"
                  placeholder="メッセージを入力（Shift+Enterで改行）"
                  :disabled="isLoading"
                  @keydown="handleKeydown"
                />
                <!-- 文字数カウンター -->
                <div
                  v-if="charCount > 0"
                  class="absolute bottom-1 right-2 text-xs"
                  :class="isOverLimit ? 'text-red-500 font-medium' : 'text-gray-400'"
                >
                  {{ charCount }}/4000
                </div>
              </div>
              <UButton
                icon="i-heroicons-paper-airplane"
                :loading="isLoading"
                :disabled="!canSend"
                color="primary"
                size="md"
                aria-label="送信"
                @click="sendMessage()"
              />
            </div>
          </div>
        </template>

        <!-- 履歴タブ（§6.5） -->
        <template v-else>
          <div class="flex-1 overflow-y-auto p-4 space-y-3">
            <!-- ローディング -->
            <div v-if="isHistoryLoading && conversations.length === 0" class="flex justify-center py-8">
              <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
            </div>

            <!-- 会話一覧 -->
            <div
              v-for="conv in conversations"
              :key="conv.id"
              class="border rounded-lg p-3 hover:shadow-sm transition-shadow cursor-pointer bg-white group"
              @click="handleRestoreConversation(conv.id)"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <h4 class="text-sm font-medium truncate">{{ conv.title }}</h4>
                  <p class="text-xs text-gray-500 mt-1 line-clamp-2">{{ conv.last_message }}</p>
                  <p class="text-xs text-gray-400 mt-1">{{ formatRelativeTime(conv.updated_at) }}</p>
                </div>
                <UButton
                  icon="i-heroicons-trash"
                  variant="ghost"
                  size="xs"
                  color="error"
                  class="opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="会話を削除"
                  @click="(e: Event) => handleDeleteConversation(conv.id, e)"
                />
              </div>
            </div>

            <!-- もっと読み込む -->
            <div v-if="hasMore" class="text-center py-2">
              <UButton
                label="もっと見る"
                variant="ghost"
                size="sm"
                :loading="isHistoryLoading"
                @click="fetchConversations(false)"
              />
            </div>

            <!-- 空状態 -->
            <div
              v-if="!isHistoryLoading && conversations.length === 0"
              class="flex flex-col items-center justify-center py-12 text-center"
            >
              <UIcon name="i-heroicons-chat-bubble-left-right" class="w-10 h-10 text-gray-300 mb-3" />
              <p class="text-gray-500 text-sm">会話履歴はまだありません</p>
            </div>
          </div>
        </template>
      </div>
    </template>
  </USlideover>
</template>
