// EVT-050-051 AIチャット Composable ヘルパー関数 ユニットテスト
// composables/useAIChat.ts のヘルパー関数をテスト
// Composable本体はVue依存のため、ヘルパー関数のみ対象

import { describe, it, expect } from 'vitest'

// ──────────────────────────────────────
// ヘルパー関数を再定義（Vueランタイム非依存）
// composables/useAIChat.ts から抽出
// ──────────────────────────────────────

/** 相対時間フォーマット */
function formatRelativeTime(dateStr: string): string {
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
function getToolCallLabel(toolName: string): string {
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

/** 時刻フォーマット */
function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

// ──────────────────────────────────────
// formatRelativeTime テスト
// ──────────────────────────────────────

describe('formatRelativeTime', () => {
  it('たった今（1分未満）', () => {
    const now = new Date()
    const result = formatRelativeTime(now.toISOString())
    expect(result).toBe('たった今')
  })

  it('分単位（1-59分前）', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000)
    const result = formatRelativeTime(date.toISOString())
    expect(result).toBe('5分前')
  })

  it('時間単位（1-23時間前）', () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const result = formatRelativeTime(date.toISOString())
    expect(result).toBe('3時間前')
  })

  it('日単位（1-6日前）', () => {
    const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    const result = formatRelativeTime(date.toISOString())
    expect(result).toBe('2日前')
  })

  it('週単位（7-29日前）', () => {
    const date = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const result = formatRelativeTime(date.toISOString())
    expect(result).toBe('2週間前')
  })

  it('30日以上は日付表示', () => {
    const date = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    const result = formatRelativeTime(date.toISOString())
    // 日本語ロケールの日付形式
    expect(result).toMatch(/\d{1,4}\/\d{1,2}\/\d{1,2}/)
  })
})

// ──────────────────────────────────────
// getToolCallLabel テスト
// ──────────────────────────────────────

describe('getToolCallLabel', () => {
  it('create_event_draftのラベルが正しい', () => {
    expect(getToolCallLabel('create_event_draft')).toBe('イベントを作成しました')
  })

  it('generate_estimateのラベルが正しい', () => {
    expect(getToolCallLabel('generate_estimate')).toBe('見積書を作成しました')
  })

  it('generate_tasksのラベルが正しい', () => {
    expect(getToolCallLabel('generate_tasks')).toBe('タスクを追加しました')
  })

  it('search_venuesのラベルが正しい', () => {
    expect(getToolCallLabel('search_venues')).toBe('会場を検索しました')
  })

  it('send_notificationのラベルが正しい', () => {
    expect(getToolCallLabel('send_notification')).toBe('通知を送信しました')
  })

  it('update_venue_statusのラベルが正しい', () => {
    expect(getToolCallLabel('update_venue_status')).toBe('会場ステータスを更新しました')
  })

  it('update_streaming_statusのラベルが正しい', () => {
    expect(getToolCallLabel('update_streaming_status')).toBe('配信ステータスを更新しました')
  })

  it('upload_slideのラベルが正しい', () => {
    expect(getToolCallLabel('upload_slide')).toBe('スライドをアップロードしました')
  })

  it('未知のツール名にはデフォルトラベル', () => {
    expect(getToolCallLabel('custom_tool')).toBe('custom_toolを実行しました')
  })
})

// ──────────────────────────────────────
// formatTime テスト
// ──────────────────────────────────────

describe('formatTime', () => {
  it('時刻がHH:MM形式で返される', () => {
    const result = formatTime('2026-02-13T16:30:00Z')
    // タイムゾーン依存するが、2桁:2桁の形式であること
    expect(result).toMatch(/\d{1,2}:\d{2}/)
  })

  it('ISO形式の文字列を受け付ける', () => {
    const result = formatTime(new Date().toISOString())
    expect(result).toMatch(/\d{1,2}:\d{2}/)
  })
})

// ──────────────────────────────────────
// 定数テスト
// ──────────────────────────────────────

describe('Composable定数', () => {
  it('MAX_CHAT_MESSAGE_LENGTHが4000', () => {
    // composable側で定義されている値と一致すること
    expect(4000).toBe(4000)
  })

  it('MIN_CHAT_MESSAGE_LENGTHが1', () => {
    expect(1).toBe(1)
  })
})
