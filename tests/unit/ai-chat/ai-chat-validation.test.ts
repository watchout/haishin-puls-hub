// EVT-050-051 AIチャット バリデーション ユニットテスト
// 仕様書: docs/design/features/project/EVT-050-051_ai-assistant-ui.md §3-F

import { describe, it, expect } from 'vitest'
import {
  chatMessageSchema,
  conversationListQuerySchema,
  conversationIdSchema,
  hasToolPermission,
  getToolsForRole,
  MAX_MESSAGE_LENGTH,
  MIN_MESSAGE_LENGTH,
  MAX_CONVERSATIONS_LIMIT,
  DEFAULT_CONVERSATIONS_LIMIT,
  CONTEXT_TYPES,
  TOOL_NAMES,
  ROLE_SCOPE,
} from '~/server/utils/ai-chat-validation'
import type { Role } from '~/types/auth'

// ──────────────────────────────────────
// 定数テスト
// ──────────────────────────────────────

describe('AIチャット定数', () => {
  it('メッセージ最大文字数が4000である', () => {
    expect(MAX_MESSAGE_LENGTH).toBe(4000)
  })

  it('メッセージ最小文字数が1である', () => {
    expect(MIN_MESSAGE_LENGTH).toBe(1)
  })

  it('会話履歴limit上限が100である', () => {
    expect(MAX_CONVERSATIONS_LIMIT).toBe(100)
  })

  it('会話履歴limitデフォルトが20である', () => {
    expect(DEFAULT_CONVERSATIONS_LIMIT).toBe(20)
  })

  it('コンテキストタイプが4種類定義されている', () => {
    expect(CONTEXT_TYPES).toHaveLength(4)
    expect(CONTEXT_TYPES).toContain('event_detail')
    expect(CONTEXT_TYPES).toContain('task_list')
    expect(CONTEXT_TYPES).toContain('venue_management')
    expect(CONTEXT_TYPES).toContain('general')
  })

  it('ツール名が8種類定義されている', () => {
    expect(TOOL_NAMES).toHaveLength(8)
  })
})

// ──────────────────────────────────────
// chatMessageSchema テスト
// ──────────────────────────────────────

describe('chatMessageSchema', () => {
  it('正常なメッセージが通る', () => {
    const result = chatMessageSchema.safeParse({
      message: 'テストメッセージ',
    })
    expect(result.success).toBe(true)
  })

  it('全フィールド指定で通る', () => {
    const result = chatMessageSchema.safeParse({
      conversation_id: '01J1234567890123456',
      message: 'テスト',
      context: {
        type: 'event_detail',
        id: '01J1234567890123456',
        metadata: { event_title: 'テストイベント' },
      },
      stream: true,
    })
    expect(result.success).toBe(true)
  })

  it('streamデフォルトはtrue', () => {
    const result = chatMessageSchema.safeParse({
      message: 'テスト',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.stream).toBe(true)
    }
  })

  it('stream=falseが通る', () => {
    const result = chatMessageSchema.safeParse({
      message: 'テスト',
      stream: false,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.stream).toBe(false)
    }
  })

  // §3-F 境界値テスト

  it('§3-F: 1文字のメッセージが通る（下限）', () => {
    const result = chatMessageSchema.safeParse({ message: 'あ' })
    expect(result.success).toBe(true)
  })

  it('§3-F: 空文字のメッセージが拒否される', () => {
    const result = chatMessageSchema.safeParse({ message: '' })
    expect(result.success).toBe(false)
  })

  it('§3-F: 4000文字のメッセージが通る（上限）', () => {
    const result = chatMessageSchema.safeParse({
      message: 'あ'.repeat(4000),
    })
    expect(result.success).toBe(true)
  })

  it('§3-F: 4001文字のメッセージが拒否される', () => {
    const result = chatMessageSchema.safeParse({
      message: 'あ'.repeat(4001),
    })
    expect(result.success).toBe(false)
  })

  it('messageフィールドが必須', () => {
    const result = chatMessageSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('不正なcontext_typeが拒否される', () => {
    const result = chatMessageSchema.safeParse({
      message: 'テスト',
      context: { type: 'invalid_type' },
    })
    expect(result.success).toBe(false)
  })

  it('全context_typeが通る', () => {
    for (const type of CONTEXT_TYPES) {
      const result = chatMessageSchema.safeParse({
        message: 'テスト',
        context: { type },
      })
      expect(result.success).toBe(true)
    }
  })

  it('contextなしでも通る', () => {
    const result = chatMessageSchema.safeParse({
      message: 'テスト',
    })
    expect(result.success).toBe(true)
  })
})

// ──────────────────────────────────────
// conversationListQuerySchema テスト
// ──────────────────────────────────────

describe('conversationListQuerySchema', () => {
  it('デフォルト値が適用される', () => {
    const result = conversationListQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(20)
      expect(result.data.offset).toBe(0)
    }
  })

  it('§3-F: limit=1が通る（下限）', () => {
    const result = conversationListQuerySchema.safeParse({ limit: '1' })
    expect(result.success).toBe(true)
  })

  it('§3-F: limit=100が通る（上限）', () => {
    const result = conversationListQuerySchema.safeParse({ limit: '100' })
    expect(result.success).toBe(true)
  })

  it('§3-F: limit=101が拒否される', () => {
    const result = conversationListQuerySchema.safeParse({ limit: '101' })
    expect(result.success).toBe(false)
  })

  it('§3-F: limit=0が拒否される', () => {
    const result = conversationListQuerySchema.safeParse({ limit: '0' })
    expect(result.success).toBe(false)
  })

  it('context_typeフィルタが通る', () => {
    const result = conversationListQuerySchema.safeParse({
      context_type: 'event_detail',
    })
    expect(result.success).toBe(true)
  })

  it('不正なcontext_typeが拒否される', () => {
    const result = conversationListQuerySchema.safeParse({
      context_type: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('offsetに負数が拒否される', () => {
    const result = conversationListQuerySchema.safeParse({ offset: '-1' })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────
// conversationIdSchema テスト
// ──────────────────────────────────────

describe('conversationIdSchema', () => {
  it('正常なIDが通る', () => {
    const result = conversationIdSchema.safeParse({ id: '01J1234567890123456' })
    expect(result.success).toBe(true)
  })

  it('空文字のIDが拒否される', () => {
    const result = conversationIdSchema.safeParse({ id: '' })
    expect(result.success).toBe(false)
  })

  it('26文字超のIDが拒否される', () => {
    const result = conversationIdSchema.safeParse({ id: 'a'.repeat(27) })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────
// Tool Call権限テスト（§7.3）
// ──────────────────────────────────────

describe('hasToolPermission', () => {
  it('organizerがcreate_event_draftを実行可能', () => {
    expect(hasToolPermission('organizer', 'create_event_draft')).toBe(true)
  })

  it('organizerがgenerate_estimateを実行可能', () => {
    expect(hasToolPermission('organizer', 'generate_estimate')).toBe(true)
  })

  it('organizerがgenerate_tasksを実行可能', () => {
    expect(hasToolPermission('organizer', 'generate_tasks')).toBe(true)
  })

  it('organizerがsearch_venuesを実行可能', () => {
    expect(hasToolPermission('organizer', 'search_venues')).toBe(true)
  })

  it('venue_staffがcreate_event_draftを実行不可（§AT-051-3）', () => {
    expect(hasToolPermission('venue_staff', 'create_event_draft')).toBe(false)
  })

  it('venue_staffがupdate_venue_statusを実行可能', () => {
    expect(hasToolPermission('venue_staff', 'update_venue_status')).toBe(true)
  })

  it('streaming_providerがupdate_streaming_statusを実行可能', () => {
    expect(hasToolPermission('streaming_provider', 'update_streaming_status')).toBe(true)
  })

  it('speakerがupload_slideを実行可能', () => {
    expect(hasToolPermission('speaker', 'upload_slide')).toBe(true)
  })

  it('participantにはTool Call権限なし', () => {
    for (const tool of TOOL_NAMES) {
      expect(hasToolPermission('participant', tool)).toBe(false)
    }
  })

  it('system_adminは全ツールを実行可能', () => {
    for (const tool of TOOL_NAMES) {
      expect(hasToolPermission('system_admin', tool)).toBe(true)
    }
  })

  it('tenant_adminは全ツールを実行可能', () => {
    for (const tool of TOOL_NAMES) {
      expect(hasToolPermission('tenant_admin', tool)).toBe(true)
    }
  })

  it('存在しないツール名はfalse', () => {
    expect(hasToolPermission('organizer', 'nonexistent_tool')).toBe(false)
  })
})

// ──────────────────────────────────────
// getToolsForRole テスト
// ──────────────────────────────────────

describe('getToolsForRole', () => {
  it('organizerは5つのツールを利用可能', () => {
    const tools = getToolsForRole('organizer')
    expect(tools).toHaveLength(5)
    expect(tools).toContain('create_event_draft')
    expect(tools).toContain('generate_estimate')
    expect(tools).toContain('generate_tasks')
    expect(tools).toContain('search_venues')
    expect(tools).toContain('send_notification')
  })

  it('venue_staffは1つのツールを利用可能', () => {
    const tools = getToolsForRole('venue_staff')
    expect(tools).toHaveLength(1)
    expect(tools).toContain('update_venue_status')
  })

  it('streaming_providerは1つのツールを利用可能', () => {
    const tools = getToolsForRole('streaming_provider')
    expect(tools).toHaveLength(1)
    expect(tools).toContain('update_streaming_status')
  })

  it('speakerは1つのツールを利用可能', () => {
    const tools = getToolsForRole('speaker')
    expect(tools).toHaveLength(1)
    expect(tools).toContain('upload_slide')
  })

  it('participantはツールを利用不可', () => {
    const tools = getToolsForRole('participant')
    expect(tools).toHaveLength(0)
  })

  it('system_adminは全ツールを利用可能', () => {
    const tools = getToolsForRole('system_admin')
    expect(tools).toHaveLength(8)
  })
})

// ──────────────────────────────────────
// ROLE_SCOPE テスト（§7.1）
// ──────────────────────────────────────

describe('ROLE_SCOPE', () => {
  it('全ロールにスコープが定義されている', () => {
    const roles: Role[] = [
      'system_admin', 'tenant_admin', 'organizer',
      'venue_staff', 'streaming_provider', 'event_planner',
      'speaker', 'sales_marketing', 'participant', 'vendor',
    ]
    for (const role of roles) {
      expect(ROLE_SCOPE[role]).toBeDefined()
      expect(Array.isArray(ROLE_SCOPE[role])).toBe(true)
    }
  })

  it('organizerは全カテゴリにアクセス可能', () => {
    expect(ROLE_SCOPE.organizer).toContain('events')
    expect(ROLE_SCOPE.organizer).toContain('participants')
    expect(ROLE_SCOPE.organizer).toContain('tasks')
    expect(ROLE_SCOPE.organizer).toContain('estimates')
  })

  it('venue_staffは会場関連のみアクセス可能', () => {
    expect(ROLE_SCOPE.venue_staff).toContain('venue_events')
    expect(ROLE_SCOPE.venue_staff).toContain('venue_layout')
    expect(ROLE_SCOPE.venue_staff).not.toContain('estimates')
  })

  it('participantは登録イベントとチケットのみ', () => {
    expect(ROLE_SCOPE.participant).toContain('registered_events')
    expect(ROLE_SCOPE.participant).toContain('tickets')
    expect(ROLE_SCOPE.participant).not.toContain('events')
  })
})
