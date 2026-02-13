// EVT-050-051 AIチャット Composable
// 仕様書: docs/design/features/project/EVT-050-051_ai-assistant-ui.md §9.1
// SSEストリーミング + 会話管理

// ──────────────────────────────────────
// 型定義
// ──────────────────────────────────────

/** コンテキストタイプ */
export type AIContextType = 'event_detail' | 'task_list' | 'venue_management' | 'general'

/** チャットコンテキスト */
export interface ChatContext {
  type: AIContextType
  id?: string
  metadata?: Record<string, unknown>
}

/** AIメッセージ */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  isStreaming?: boolean
  toolCalls?: ToolCallInfo[]
}

/** Tool Call情報 */
export interface ToolCallInfo {
  tool: string
  args: Record<string, unknown>
  result?: Record<string, unknown>
  status: 'pending' | 'completed' | 'error'
}

/** SSEイベント */
interface SSEEvent {
  type: 'text' | 'tool_call_start' | 'tool_call_result' | 'error' | 'done'
  content?: string
  tool?: string
  args?: Record<string, unknown>
  result?: Record<string, unknown>
  code?: string
  message?: string
  conversation_id?: string
  tokens?: number
}

/** 会話サマリー */
export interface ConversationSummary {
  id: string
  title: string
  context_type: string
  last_message: string
  updated_at: string
}

/** 会話詳細 */
export interface ConversationDetail {
  id: string
  title: string
  context_type: string
  context_id: string | null
  messages: ChatMessage[]
  model_used: string
  total_tokens: number
  created_at: string
  updated_at: string
}

// ──────────────────────────────────────
// 定数
// ──────────────────────────────────────

/** メッセージ最大文字数（§3-F） */
export const MAX_CHAT_MESSAGE_LENGTH = 4000

/** メッセージ最小文字数 */
export const MIN_CHAT_MESSAGE_LENGTH = 1

// ──────────────────────────────────────
// useAIChat Composable
// ──────────────────────────────────────

/**
 * AIチャット Composable
 * SSEストリーミング対応のチャット機能を提供
 */
export function useAIChat() {
  const messages = ref<ChatMessage[]>([])
  const input = ref('')
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const error = ref<string | null>(null)
  const conversationId = ref<string | null>(null)
  const context = ref<ChatContext | null>(null)

  // チャットパネル表示状態
  const isPanelOpen = ref(false)
  const activeTab = ref<'chat' | 'history'>('chat')

  /**
   * メッセージ送信
   * SSEストリーミングでAI応答を受信
   */
  async function sendMessage(messageText?: string) {
    const text = messageText ?? input.value.trim()
    if (!text || isLoading.value) return

    error.value = null
    isLoading.value = true
    isStreaming.value = true

    // ユーザーメッセージを追加
    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    messages.value.push(userMessage)
    input.value = ''

    // AI応答プレースホルダーを追加
    const aiMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
      toolCalls: [],
    }
    messages.value.push(aiMessage)

    try {
      const response = await $fetch.raw('/api/v1/ai/chat', {
        method: 'POST',
        body: {
          conversation_id: conversationId.value,
          message: text,
          context: context.value,
          stream: true,
        },
        responseType: 'stream',
      })

      // SSEストリームを処理
      const reader = (response._data as ReadableStream<Uint8Array>).getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue

          try {
            const event: SSEEvent = JSON.parse(jsonStr)
            handleSSEEvent(event, aiMessage)
          } catch {
            // JSONパースエラーは無視
          }
        }
      }

      // 残りのバッファを処理
      if (buffer.startsWith('data: ')) {
        const jsonStr = buffer.slice(6).trim()
        if (jsonStr) {
          try {
            const event: SSEEvent = JSON.parse(jsonStr)
            handleSSEEvent(event, aiMessage)
          } catch {
            // 無視
          }
        }
      }
    } catch (err: unknown) {
      const fetchError = err as { statusCode?: number; data?: { message?: string } }
      const lastAiMsg = messages.value[messages.value.length - 1]

      if (fetchError.statusCode === 429) {
        error.value = '送信回数が上限に達しました。1分後に再試行してください'
      } else if (fetchError.statusCode === 404) {
        error.value = '指定された会話が見つかりません'
      } else {
        error.value = fetchError.data?.message ?? 'メッセージの送信に失敗しました'
      }

      // エラー時はAIメッセージプレースホルダーを削除
      if (lastAiMsg?.isStreaming && lastAiMsg.content === '') {
        messages.value.pop()
      }
    } finally {
      // ストリーミング完了マーク
      const lastMsg = messages.value[messages.value.length - 1]
      if (lastMsg?.isStreaming) {
        lastMsg.isStreaming = false
      }
      isLoading.value = false
      isStreaming.value = false
    }
  }

  /**
   * SSEイベントを処理
   */
  function handleSSEEvent(event: SSEEvent, aiMessage: ChatMessage) {
    switch (event.type) {
      case 'text':
        if (event.content) {
          aiMessage.content += event.content
        }
        break

      case 'tool_call_start':
        if (event.tool) {
          aiMessage.toolCalls = aiMessage.toolCalls ?? []
          aiMessage.toolCalls.push({
            tool: event.tool,
            args: event.args ?? {},
            status: 'pending',
          })
        }
        break

      case 'tool_call_result':
        if (event.tool && aiMessage.toolCalls) {
          const tc = aiMessage.toolCalls.find(
            t => t.tool === event.tool && t.status === 'pending',
          )
          if (tc) {
            tc.result = event.result
            tc.status = 'completed'
          }
        }
        break

      case 'error':
        error.value = event.message ?? 'AIの応答中にエラーが発生しました'
        break

      case 'done':
        if (event.conversation_id) {
          conversationId.value = event.conversation_id
        }
        aiMessage.isStreaming = false
        break
    }
  }

  /**
   * チャットパネルを開く
   */
  function openPanel() {
    isPanelOpen.value = true
    activeTab.value = 'chat'
  }

  /**
   * チャットパネルを閉じる
   */
  function closePanel() {
    isPanelOpen.value = false
  }

  /**
   * チャットパネルをトグル
   */
  function togglePanel() {
    if (isPanelOpen.value) {
      closePanel()
    } else {
      openPanel()
    }
  }

  /**
   * 新しい会話を開始
   */
  function startNewConversation() {
    messages.value = []
    conversationId.value = null
    error.value = null
    activeTab.value = 'chat'
  }

  /**
   * コンテキストを設定
   */
  function setContext(newContext: ChatContext) {
    context.value = newContext
  }

  /**
   * 会話を復元（履歴から選択時）
   */
  async function restoreConversation(id: string) {
    try {
      isLoading.value = true
      error.value = null

      const data = await $fetch<ConversationDetail>(`/api/v1/ai/conversations/${id}`)
      messages.value = data.messages
      conversationId.value = id
      activeTab.value = 'chat'
    } catch {
      error.value = '会話の復元に失敗しました'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 入力のバリデーション状態
   */
  const isInputValid = computed(() => {
    const text = input.value.trim()
    return text.length >= MIN_CHAT_MESSAGE_LENGTH && text.length <= MAX_CHAT_MESSAGE_LENGTH
  })

  /**
   * 文字数カウント
   */
  const charCount = computed(() => input.value.length)

  /**
   * 文字数超過かどうか
   */
  const isOverLimit = computed(() => input.value.length > MAX_CHAT_MESSAGE_LENGTH)

  /**
   * 送信可能かどうか
   */
  const canSend = computed(() => isInputValid.value && !isLoading.value)

  return {
    // 状態
    messages,
    input,
    isLoading,
    isStreaming,
    error,
    conversationId,
    context,
    isPanelOpen,
    activeTab,

    // 計算プロパティ
    isInputValid,
    charCount,
    isOverLimit,
    canSend,

    // アクション
    sendMessage,
    openPanel,
    closePanel,
    togglePanel,
    startNewConversation,
    setContext,
    restoreConversation,
  }
}

// ──────────────────────────────────────
// useConversationHistory Composable
// ──────────────────────────────────────

/**
 * 会話履歴管理 Composable
 */
export function useConversationHistory() {
  const conversations = ref<ConversationSummary[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const total = ref(0)
  const offset = ref(0)
  const limit = 20

  /**
   * 会話履歴を取得
   */
  async function fetchConversations(reset: boolean = false) {
    if (reset) {
      offset.value = 0
      conversations.value = []
    }

    try {
      isLoading.value = true
      error.value = null

      const data = await $fetch<{
        conversations: ConversationSummary[]
        total: number
      }>('/api/v1/ai/conversations', {
        params: {
          limit,
          offset: offset.value,
        },
      })

      if (reset) {
        conversations.value = data.conversations
      } else {
        conversations.value.push(...data.conversations)
      }
      total.value = data.total
      offset.value += data.conversations.length
    } catch {
      error.value = '会話履歴の取得に失敗しました'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 会話を削除
   */
  async function deleteConversation(id: string) {
    try {
      await $fetch(`/api/v1/ai/conversations/${id}`, { method: 'DELETE' })
      conversations.value = conversations.value.filter(c => c.id !== id)
      total.value = Math.max(0, total.value - 1)
    } catch {
      error.value = '会話の削除に失敗しました'
    }
  }

  /**
   * もっと読み込めるか
   */
  const hasMore = computed(() => conversations.value.length < total.value)

  return {
    conversations,
    isLoading,
    error,
    total,
    hasMore,
    fetchConversations,
    deleteConversation,
  }
}

// ──────────────────────────────────────
// ヘルパー関数
// ──────────────────────────────────────

/** 相対時間フォーマット（日本語） */
export function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'たった今'
  if (diffMinutes < 60) return `${diffMinutes}分前`
  if (diffHours < 24) return `${diffHours}時間前`
  if (diffDays < 7) return `${diffDays}日前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`
  return date.toLocaleDateString('ja-JP')
}

/** Tool Callの表示ラベル */
export function getToolCallLabel(toolName: string): string {
  const labels: Record<string, string> = {
    create_event_draft: 'イベントを作成しました',
    generate_estimate: '見積書を作成しました',
    generate_tasks: 'タスクを追加しました',
    search_venues: '会場を検索しました',
    send_notification: '通知を送信しました',
    update_venue_status: '会場ステータスを更新しました',
    update_streaming_status: '配信ステータスを更新しました',
    upload_slide: 'スライドをアップロードしました',
  }
  return labels[toolName] ?? `${toolName}を実行しました`
}

/** 時刻フォーマット（HH:MM） */
export function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}
