// EVT-050-051 AIチャット ヘルパー関数（DB非依存）
// 仕様書: docs/design/features/project/EVT-050-051_ai-assistant-ui.md §7, §9
// テスト容易性のため純粋関数として分離

import type { Role } from '~/types/auth'
import type { AIMessage, ContextType } from './ai-chat-validation'
import {
  MAX_TITLE_LENGTH,
  MAX_MESSAGES_PER_CONVERSATION,
  ROLE_SCOPE,
  TOOL_PERMISSIONS,
} from './ai-chat-validation'

// ──────────────────────────────────────
// システムプロンプト
// ──────────────────────────────────────

/**
 * AIアシスタント用システムプロンプトを生成
 * @param role - ユーザーのロール
 * @param contextType - コンテキストタイプ
 */
export function getSystemPrompt(role: Role, contextType?: ContextType): string {
  const scopes = ROLE_SCOPE[role] ?? []
  const scopeText = scopes.length > 0
    ? scopes.join('、')
    : 'なし'

  const contextHint = contextType
    ? getContextHint(contextType)
    : ''

  return `あなたは「HUBコンシェルジュ」です。セミナー・イベント運営プラットフォーム「配信プラス HUB」の AIアシスタントとして、ユーザーの質問に回答し、依頼されたタスクを実行します。

## ロール
あなたが対応しているユーザーのロール: ${role}
アクセス可能な情報カテゴリ: ${scopeText}

## 行動規則
1. 丁寧かつ簡潔に回答してください
2. ユーザーのロールに応じた情報のみを提供してください
3. 権限外の操作を求められた場合は、丁重にお断りしてください
4. イベント運営に関する専門的なアドバイスを提供できます
5. 不明確な依頼には確認の質問をしてください

## 禁止事項
- ユーザーのロール権限を超える情報の提供
- 他テナントの情報への言及
- 確認なしでの重要な操作の実行
- 個人情報の不必要な開示

## 出力形式
- Markdown形式で回答してください
- リストや表は適宜使用してください
- 日本語で回答してください
${contextHint}`
}

/**
 * コンテキストタイプに応じたヒントテキストを取得
 */
function getContextHint(contextType: ContextType): string {
  switch (contextType) {
    case 'event_detail':
      return '\n## 現在のコンテキスト\nユーザーはイベント詳細画面を閲覧中です。イベントに関する質問や操作依頼が想定されます。'
    case 'task_list':
      return '\n## 現在のコンテキスト\nユーザーはタスク一覧画面を閲覧中です。タスクの管理や進捗に関する質問が想定されます。'
    case 'venue_management':
      return '\n## 現在のコンテキスト\nユーザーは会場管理画面を閲覧中です。会場の設備や予約状況に関する質問が想定されます。'
    case 'general':
      return ''
    default:
      return ''
  }
}

// ──────────────────────────────────────
// 会話タイトル自動生成
// ──────────────────────────────────────

/**
 * 最初のユーザーメッセージから会話タイトルを自動生成
 * §3-F: 200文字で切り詰め
 */
export function generateConversationTitle(firstMessage: string): string {
  // 改行を除去し、先頭のスペースもトリム
  const cleaned = firstMessage.replace(/\n/g, ' ').trim()

  if (cleaned.length <= MAX_TITLE_LENGTH) {
    return cleaned
  }

  // 200文字で切り詰め
  return cleaned.substring(0, MAX_TITLE_LENGTH - 3) + '...'
}

// ──────────────────────────────────────
// メッセージ管理
// ──────────────────────────────────────

/**
 * 新しいユーザーメッセージを作成
 */
export function createUserMessage(content: string): AIMessage {
  return {
    role: 'user',
    content,
    timestamp: new Date().toISOString(),
  }
}

/**
 * 新しいアシスタントメッセージを作成
 */
export function createAssistantMessage(
  content: string,
  toolCalls?: AIMessage['tool_calls'],
  toolCallResults?: AIMessage['tool_call_results'],
): AIMessage {
  return {
    role: 'assistant',
    content,
    timestamp: new Date().toISOString(),
    ...(toolCalls && { tool_calls: toolCalls }),
    ...(toolCallResults && { tool_call_results: toolCallResults }),
  }
}

/**
 * 会話のメッセージ数が上限に達しているかチェック
 * §3-F: 1会話あたり200件
 */
export function isConversationFull(messages: AIMessage[]): boolean {
  return messages.length >= MAX_MESSAGES_PER_CONVERSATION
}

/**
 * 会話がフルの場合の通知メッセージ
 */
export function getConversationFullMessage(): string {
  return '会話が長くなりました。新しい会話を開始してください。'
}

// ──────────────────────────────────────
// テンプレート応答生成（MVP: LLM未接続時）
// ──────────────────────────────────────

/**
 * テンプレートベースの応答を生成（MVP用）
 * LLMRouter統合前のフォールバック
 */
export function generateTemplateResponse(
  message: string,
  role: Role,
  contextType?: ContextType,
): string {
  // コンテキストに応じた応答テンプレート
  if (contextType === 'event_detail') {
    return generateEventContextResponse(message, role)
  }
  if (contextType === 'venue_management') {
    return generateVenueContextResponse(message, role)
  }
  if (contextType === 'task_list') {
    return generateTaskContextResponse(message, role)
  }
  return generateGeneralResponse(message, role)
}

function generateEventContextResponse(message: string, role: Role): string {
  const lowerMsg = message.toLowerCase()
  if (lowerMsg.includes('見積') || lowerMsg.includes('estimate')) {
    return `このイベントの見積書作成を承りました。

## 見積書作成の流れ
1. イベントの基本情報を確認
2. 会場費・配信費・人件費を算出
3. 見積書ドラフトを生成

現在の設定内容に基づいて見積書を作成します。少々お待ちください。

> 💡 **ヒント**: 見積書は後から編集可能です。`
  }
  if (lowerMsg.includes('参加者') || lowerMsg.includes('participant')) {
    return `参加者情報についてお答えします。

## 確認可能な項目
- **参加登録者数**: 登録済みの参加者一覧
- **チェックイン状況**: 当日の出欠状況
- **参加者属性**: 所属・役職などの統計

具体的にどの情報を確認されますか？`
  }
  return generateGeneralResponse(message, role)
}

function generateVenueContextResponse(message: string, role: Role): string {
  const lowerMsg = message.toLowerCase()
  if (lowerMsg.includes('設備') || lowerMsg.includes('equipment')) {
    return `会場設備の情報をお調べします。

## 確認可能な設備情報
- **映像設備**: プロジェクター、スクリーン、モニター
- **音響設備**: マイク、スピーカー、ミキサー
- **配信設備**: カメラ、スイッチャー、エンコーダー
- **ネットワーク**: Wi-Fi、有線LAN

詳しく知りたい設備カテゴリを教えてください。`
  }
  return generateGeneralResponse(message, role)
}

function generateTaskContextResponse(message: string, role: Role): string {
  const lowerMsg = message.toLowerCase()
  if (lowerMsg.includes('期限') || lowerMsg.includes('deadline') || lowerMsg.includes('遅延')) {
    return `タスクの期限状況を確認します。

## タスクステータス
- 期限切れのタスクがないか確認中です
- 今週期限のタスクを優先的にお知らせします

具体的なタスクの期限変更も可能です。変更したいタスクがあればお知らせください。`
  }
  return generateGeneralResponse(message, role)
}

function generateGeneralResponse(message: string, role: Role): string {
  const availableTools = getToolsDescription(role)

  return `承知いたしました。

ご質問にお答えします。HUBコンシェルジュとして、以下のようなサポートが可能です：

${availableTools}

具体的なご依頼やご質問があればお聞かせください。`
}

/**
 * ロールに応じた利用可能機能の説明テキストを生成
 */
function getToolsDescription(role: Role): string {
  const tools = Object.entries(TOOL_PERMISSIONS)
    .filter(([_, roles]) => roles.includes(role))
    .map(([tool]) => toolToDescription(tool))

  if (tools.length === 0) {
    return '## 利用可能な機能\n- イベント情報の検索・閲覧\n- よくある質問への回答'
  }

  return `## 利用可能な機能\n${tools.map(t => `- ${t}`).join('\n')}`
}

function toolToDescription(tool: string): string {
  const descriptions: Record<string, string> = {
    create_event_draft: 'イベントのドラフト作成',
    generate_estimate: '見積書の自動生成',
    generate_tasks: 'タスクの自動生成',
    search_venues: '会場の検索・提案',
    send_notification: '通知の送信',
    update_venue_status: '会場ステータスの更新',
    update_streaming_status: '配信ステータスの更新',
    upload_slide: 'スライドのアップロード',
  }
  return descriptions[tool] ?? tool
}

// ──────────────────────────────────────
// SSEフォーマッタ
// ──────────────────────────────────────

/**
 * SSEイベントをフォーマット
 */
export function formatSSEEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

/**
 * テキストチャンクSSEイベント
 */
export function formatTextChunk(content: string): string {
  return formatSSEEvent({ type: 'text', content })
}

/**
 * Tool Call開始SSEイベント
 */
export function formatToolCallStart(tool: string, args: Record<string, unknown>): string {
  return formatSSEEvent({ type: 'tool_call_start', tool, args })
}

/**
 * Tool Call結果SSEイベント
 */
export function formatToolCallResult(tool: string, result: Record<string, unknown>): string {
  return formatSSEEvent({ type: 'tool_call_result', tool, result })
}

/**
 * エラーSSEイベント
 */
export function formatSSEError(code: string, message: string): string {
  return formatSSEEvent({ type: 'error', code, message })
}

/**
 * 完了SSEイベント
 */
export function formatSSEDone(conversationId: string, tokens: number): string {
  return formatSSEEvent({ type: 'done', conversation_id: conversationId, tokens })
}

// ──────────────────────────────────────
// ストリーミングシミュレーション（MVP）
// ──────────────────────────────────────

/**
 * テキストをチャンク分割してストリーミング用に準備
 * §8 NFR-050-2: 30-50文字/秒
 * @param text - 分割するテキスト
 * @param chunkSize - 1チャンクあたりの文字数（デフォルト: 5文字）
 */
export function splitTextToChunks(text: string, chunkSize: number = 5): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize))
  }
  return chunks
}

/**
 * ストリーミング遅延計算（ms）
 * 30-50文字/秒 → 1文字あたり 20-33ms → 5文字チャンクで 100-167ms
 */
export function getStreamDelay(chunkSize: number = 5): number {
  // 40文字/秒ターゲット → 5文字で125ms
  return Math.round((chunkSize / 40) * 1000)
}
