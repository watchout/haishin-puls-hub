// EVT-050-051 AIチャット ヘルパー ユニットテスト
// 仕様書: docs/design/features/project/EVT-050-051_ai-assistant-ui.md §7, §9

import { describe, it, expect } from 'vitest'
import {
  getSystemPrompt,
  generateConversationTitle,
  createUserMessage,
  createAssistantMessage,
  isConversationFull,
  getConversationFullMessage,
  generateTemplateResponse,
  formatSSEEvent,
  formatTextChunk,
  formatToolCallStart,
  formatToolCallResult,
  formatSSEError,
  formatSSEDone,
  splitTextToChunks,
  getStreamDelay,
} from '~/server/utils/ai-chat-helpers'
import type { AIMessage } from '~/server/utils/ai-chat-validation'

// ──────────────────────────────────────
// getSystemPrompt テスト
// ──────────────────────────────────────

describe('getSystemPrompt', () => {
  it('organizerロールのプロンプトが生成される', () => {
    const prompt = getSystemPrompt('organizer')
    expect(prompt).toContain('HUBコンシェルジュ')
    expect(prompt).toContain('organizer')
    expect(prompt).toContain('events')
  })

  it('venue_staffロールのプロンプトが生成される', () => {
    const prompt = getSystemPrompt('venue_staff')
    expect(prompt).toContain('venue_staff')
    expect(prompt).toContain('venue_events')
  })

  it('participantロールのプロンプトが生成される', () => {
    const prompt = getSystemPrompt('participant')
    expect(prompt).toContain('participant')
    expect(prompt).toContain('registered_events')
  })

  it('コンテキストタイプが含まれる（event_detail）', () => {
    const prompt = getSystemPrompt('organizer', 'event_detail')
    expect(prompt).toContain('イベント詳細')
  })

  it('コンテキストタイプが含まれる（task_list）', () => {
    const prompt = getSystemPrompt('organizer', 'task_list')
    expect(prompt).toContain('タスク一覧')
  })

  it('コンテキストタイプが含まれる（venue_management）', () => {
    const prompt = getSystemPrompt('organizer', 'venue_management')
    expect(prompt).toContain('会場管理')
  })

  it('generalコンテキストではコンテキストヒントなし', () => {
    const prompt = getSystemPrompt('organizer', 'general')
    expect(prompt).not.toContain('現在のコンテキスト')
  })

  it('禁止事項が含まれる', () => {
    const prompt = getSystemPrompt('organizer')
    expect(prompt).toContain('禁止事項')
  })

  it('Markdown形式の指示が含まれる', () => {
    const prompt = getSystemPrompt('organizer')
    expect(prompt).toContain('Markdown')
  })
})

// ──────────────────────────────────────
// generateConversationTitle テスト
// ──────────────────────────────────────

describe('generateConversationTitle', () => {
  it('短いメッセージがそのままタイトルになる', () => {
    const title = generateConversationTitle('テストメッセージ')
    expect(title).toBe('テストメッセージ')
  })

  it('§3-F: 200文字以内のメッセージはそのまま', () => {
    const msg = 'あ'.repeat(200)
    const title = generateConversationTitle(msg)
    expect(title).toBe(msg)
    expect(title.length).toBe(200)
  })

  it('§3-F: 201文字以上のメッセージは200文字で切り詰め', () => {
    const msg = 'あ'.repeat(250)
    const title = generateConversationTitle(msg)
    expect(title.length).toBeLessThanOrEqual(200)
    expect(title).toContain('...')
  })

  it('改行が除去される', () => {
    const title = generateConversationTitle('テスト\nメッセージ')
    expect(title).toBe('テスト メッセージ')
  })

  it('前後の空白がトリムされる', () => {
    const title = generateConversationTitle('  テスト  ')
    expect(title).toBe('テスト')
  })
})

// ──────────────────────────────────────
// createUserMessage テスト
// ──────────────────────────────────────

describe('createUserMessage', () => {
  it('ユーザーメッセージが正しく作成される', () => {
    const msg = createUserMessage('こんにちは')
    expect(msg.role).toBe('user')
    expect(msg.content).toBe('こんにちは')
    expect(msg.timestamp).toBeDefined()
  })

  it('タイムスタンプがISO 8601形式', () => {
    const msg = createUserMessage('テスト')
    expect(new Date(msg.timestamp).toISOString()).toBe(msg.timestamp)
  })
})

// ──────────────────────────────────────
// createAssistantMessage テスト
// ──────────────────────────────────────

describe('createAssistantMessage', () => {
  it('アシスタントメッセージが正しく作成される', () => {
    const msg = createAssistantMessage('はい、承知しました。')
    expect(msg.role).toBe('assistant')
    expect(msg.content).toBe('はい、承知しました。')
    expect(msg.timestamp).toBeDefined()
  })

  it('tool_callsが付与される', () => {
    const toolCalls = [{
      id: 'tc-001',
      type: 'function' as const,
      function: { name: 'create_event_draft', arguments: '{}' },
    }]
    const msg = createAssistantMessage('テスト', toolCalls)
    expect(msg.tool_calls).toEqual(toolCalls)
  })

  it('tool_call_resultsが付与される', () => {
    const results = [{ tool_call_id: 'tc-001', result: { success: true } }]
    const msg = createAssistantMessage('テスト', undefined, results)
    expect(msg.tool_call_results).toEqual(results)
  })

  it('オプションなしの場合、tool_calls/tool_call_resultsは含まれない', () => {
    const msg = createAssistantMessage('テスト')
    expect(msg.tool_calls).toBeUndefined()
    expect(msg.tool_call_results).toBeUndefined()
  })
})

// ──────────────────────────────────────
// isConversationFull テスト（§3-F）
// ──────────────────────────────────────

describe('isConversationFull', () => {
  it('§3-F: 199件はフルでない', () => {
    const messages: AIMessage[] = Array.from({ length: 199 }, (_, i) => ({
      role: 'user',
      content: `msg-${i}`,
      timestamp: new Date().toISOString(),
    }))
    expect(isConversationFull(messages)).toBe(false)
  })

  it('§3-F: 200件はフル', () => {
    const messages: AIMessage[] = Array.from({ length: 200 }, (_, i) => ({
      role: 'user',
      content: `msg-${i}`,
      timestamp: new Date().toISOString(),
    }))
    expect(isConversationFull(messages)).toBe(true)
  })

  it('§3-F: 201件はフル', () => {
    const messages: AIMessage[] = Array.from({ length: 201 }, (_, i) => ({
      role: 'user',
      content: `msg-${i}`,
      timestamp: new Date().toISOString(),
    }))
    expect(isConversationFull(messages)).toBe(true)
  })

  it('空配列はフルでない', () => {
    expect(isConversationFull([])).toBe(false)
  })
})

describe('getConversationFullMessage', () => {
  it('通知メッセージが返される', () => {
    const msg = getConversationFullMessage()
    expect(msg).toContain('新しい会話')
  })
})

// ──────────────────────────────────────
// generateTemplateResponse テスト
// ──────────────────────────────────────

describe('generateTemplateResponse', () => {
  it('イベントコンテキストで見積関連の応答が生成される', () => {
    const response = generateTemplateResponse(
      '見積を作成して',
      'organizer',
      'event_detail',
    )
    expect(response).toContain('見積')
  })

  it('イベントコンテキストで参加者関連の応答が生成される', () => {
    const response = generateTemplateResponse(
      '参加者を確認したい',
      'organizer',
      'event_detail',
    )
    expect(response).toContain('参加者')
  })

  it('会場コンテキストで設備関連の応答が生成される', () => {
    const response = generateTemplateResponse(
      '設備を確認して',
      'venue_staff',
      'venue_management',
    )
    expect(response).toContain('設備')
  })

  it('タスクコンテキストで期限関連の応答が生成される', () => {
    const response = generateTemplateResponse(
      '期限切れのタスクを確認して',
      'organizer',
      'task_list',
    )
    expect(response).toContain('期限')
  })

  it('一般コンテキストで応答が生成される', () => {
    const response = generateTemplateResponse(
      'ヘルプ',
      'organizer',
      'general',
    )
    expect(response).toContain('HUBコンシェルジュ')
  })

  it('participantロールでも応答が生成される', () => {
    const response = generateTemplateResponse(
      '質問があります',
      'participant',
    )
    expect(response.length).toBeGreaterThan(0)
  })
})

// ──────────────────────────────────────
// SSEフォーマッタ テスト
// ──────────────────────────────────────

describe('formatSSEEvent', () => {
  it('正しいSSE形式が生成される', () => {
    const result = formatSSEEvent({ type: 'text', content: 'hello' })
    expect(result).toBe('data: {"type":"text","content":"hello"}\n\n')
  })
})

describe('formatTextChunk', () => {
  it('テキストチャンクが正しくフォーマットされる', () => {
    const result = formatTextChunk('こんにちは')
    expect(result).toContain('"type":"text"')
    expect(result).toContain('"content":"こんにちは"')
    expect(result.startsWith('data: ')).toBe(true)
    expect(result.endsWith('\n\n')).toBe(true)
  })
})

describe('formatToolCallStart', () => {
  it('Tool Call開始イベントが正しくフォーマットされる', () => {
    const result = formatToolCallStart('create_event_draft', { title: 'テスト' })
    expect(result).toContain('"type":"tool_call_start"')
    expect(result).toContain('"tool":"create_event_draft"')
  })
})

describe('formatToolCallResult', () => {
  it('Tool Call結果イベントが正しくフォーマットされる', () => {
    const result = formatToolCallResult('create_event_draft', { success: true })
    expect(result).toContain('"type":"tool_call_result"')
    expect(result).toContain('"tool":"create_event_draft"')
  })
})

describe('formatSSEError', () => {
  it('エラーイベントが正しくフォーマットされる', () => {
    const result = formatSSEError('RATE_LIMIT', 'レート制限超過')
    expect(result).toContain('"type":"error"')
    expect(result).toContain('"code":"RATE_LIMIT"')
    expect(result).toContain('"message":"レート制限超過"')
  })
})

describe('formatSSEDone', () => {
  it('完了イベントが正しくフォーマットされる', () => {
    const result = formatSSEDone('conv-123', 1234)
    expect(result).toContain('"type":"done"')
    expect(result).toContain('"conversation_id":"conv-123"')
    expect(result).toContain('"tokens":1234')
  })
})

// ──────────────────────────────────────
// ストリーミングユーティリティ テスト
// ──────────────────────────────────────

describe('splitTextToChunks', () => {
  it('テキストが正しく分割される', () => {
    const chunks = splitTextToChunks('こんにちは世界', 5)
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toBe('こんにちは')
    expect(chunks[1]).toBe('世界')
  })

  it('空文字は空配列を返す', () => {
    const chunks = splitTextToChunks('')
    expect(chunks).toHaveLength(0)
  })

  it('チャンクサイズ1で1文字ずつ分割', () => {
    const chunks = splitTextToChunks('abc', 1)
    expect(chunks).toEqual(['a', 'b', 'c'])
  })

  it('テキストがチャンクサイズ以下の場合は1チャンク', () => {
    const chunks = splitTextToChunks('abc', 10)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toBe('abc')
  })
})

describe('getStreamDelay', () => {
  it('デフォルト（5文字）で125ms', () => {
    const delay = getStreamDelay()
    expect(delay).toBe(125)
  })

  it('1文字で25ms', () => {
    const delay = getStreamDelay(1)
    expect(delay).toBe(25)
  })

  it('10文字で250ms', () => {
    const delay = getStreamDelay(10)
    expect(delay).toBe(250)
  })
})
