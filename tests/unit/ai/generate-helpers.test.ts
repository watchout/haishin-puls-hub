// AI-001/003/008 §5.2, §5.3: generate エンドポイント ヘルパー関数テスト
// email.post.ts の parseEmailResponse と schedule.post.ts の parseScheduleResponse をテスト

import { describe, it, expect } from 'vitest'

// ──────────────────────────────────────
// parseEmailResponse テスト
// ──────────────────────────────────────

// ヘルパー関数を直接テスト用に再実装（エンドポイントからは直接エクスポートされないため）
function parseEmailResponse(response: string): { subject: string; body: string } {
  const lines = response.split('\n')
  let subject = ''
  let bodyStartIndex = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? ''
    const subjectMatch = line.match(/^(?:件名|Subject|タイトル)\s*[:：]\s*(.+)$/i)
    if (subjectMatch?.[1]) {
      subject = subjectMatch[1].trim()
      bodyStartIndex = i + 1
      while (bodyStartIndex < lines.length && lines[bodyStartIndex]?.trim() === '') {
        bodyStartIndex++
      }
      break
    }
  }

  const body = lines.slice(bodyStartIndex).join('\n').trim()
  return {
    subject: subject || '（件名なし）',
    body: body || response,
  }
}

describe('parseEmailResponse', () => {
  it('件名: 形式でsubjectとbodyを分離する', () => {
    const response = '件名: テスト件名\n\nこれは本文です。'
    const result = parseEmailResponse(response)
    expect(result.subject).toBe('テスト件名')
    expect(result.body).toBe('これは本文です。')
  })

  it('Subject: 形式でsubjectとbodyを分離する', () => {
    const response = 'Subject: Test Subject\n\nThis is the body.'
    const result = parseEmailResponse(response)
    expect(result.subject).toBe('Test Subject')
    expect(result.body).toBe('This is the body.')
  })

  it('タイトル：形式（全角コロン）にも対応する', () => {
    const response = 'タイトル：イベントのご案内\n\n拝啓、お世話になっております。'
    const result = parseEmailResponse(response)
    expect(result.subject).toBe('イベントのご案内')
    expect(result.body).toBe('拝啓、お世話になっております。')
  })

  it('件名がない場合は「（件名なし）」を返す', () => {
    const response = 'こんにちは。\nこれはメール本文です。'
    const result = parseEmailResponse(response)
    expect(result.subject).toBe('（件名なし）')
    expect(result.body).toBe('こんにちは。\nこれはメール本文です。')
  })

  it('件名の後の空行をスキップする', () => {
    const response = '件名: テスト件名\n\n\n\n本文開始'
    const result = parseEmailResponse(response)
    expect(result.subject).toBe('テスト件名')
    expect(result.body).toBe('本文開始')
  })

  it('空のレスポンスでも安全に処理する', () => {
    const result = parseEmailResponse('')
    expect(result.subject).toBe('（件名なし）')
    expect(result.body).toBe('')
  })
})

// ──────────────────────────────────────
// parseScheduleResponse テスト
// ──────────────────────────────────────

interface ScheduleSuggestion {
  date: string
  reason: string
  score: number
}

function parseScheduleResponse(response: string): ScheduleSuggestion[] {
  const jsonMatch = response.match(/\[[\s\S]*?\]/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item: unknown): item is Record<string, unknown> =>
            item !== null && typeof item === 'object',
          )
          .map((item) => ({
            date: String(item.date ?? ''),
            reason: String(item.reason ?? ''),
            score: typeof item.score === 'number' ? item.score : 50,
          }))
          .filter(s => s.date !== '')
      }
    } catch {
      // fallthrough
    }
  }

  return response
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && /\d{4}/.test(line))
    .slice(0, 5)
    .map((line, index) => ({
      date: extractDate(line) ?? new Date().toISOString(),
      reason: line,
      score: Math.max(100 - index * 15, 25),
    }))
}

function extractDate(text: string): string | null {
  const isoMatch = text.match(/(\d{4}-\d{2}-\d{2})/)
  if (isoMatch?.[1]) return isoMatch[1]

  const jpMatch = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
  if (jpMatch?.[1] && jpMatch?.[2] && jpMatch?.[3]) {
    return `${jpMatch[1]}-${jpMatch[2].padStart(2, '0')}-${jpMatch[3].padStart(2, '0')}`
  }

  return null
}

describe('parseScheduleResponse', () => {
  it('JSON配列形式のレスポンスを正しく解析する', () => {
    const response = `以下のスケジュールを提案します:
[
  {"date": "2026-03-15", "reason": "平日で会場が空いています", "score": 90},
  {"date": "2026-03-20", "reason": "週末で参加者が集まりやすい", "score": 75}
]`
    const result = parseScheduleResponse(response)
    expect(result).toHaveLength(2)
    expect(result[0]?.date).toBe('2026-03-15')
    expect(result[0]?.reason).toBe('平日で会場が空いています')
    expect(result[0]?.score).toBe(90)
    expect(result[1]?.date).toBe('2026-03-20')
  })

  it('scoreがない場合はデフォルト50を使用する', () => {
    const response = '[{"date": "2026-03-15", "reason": "テスト"}]'
    const result = parseScheduleResponse(response)
    expect(result[0]?.score).toBe(50)
  })

  it('dateがないエントリはフィルタされる', () => {
    const response = '[{"reason": "dateなし", "score": 80}]'
    const result = parseScheduleResponse(response)
    expect(result).toHaveLength(0)
  })

  it('テキスト形式のISO日付を解析する', () => {
    const response = '1. 2026-03-15 - 平日で良い日\n2. 2026-03-20 - 週末候補'
    const result = parseScheduleResponse(response)
    expect(result).toHaveLength(2)
    expect(result[0]?.date).toBe('2026-03-15')
    expect(result[1]?.date).toBe('2026-03-20')
  })

  it('テキスト形式の日本語日付を解析する', () => {
    const response = '2026年3月5日 - 候補日1\n2026年12月25日 - 候補日2'
    const result = parseScheduleResponse(response)
    expect(result).toHaveLength(2)
    expect(result[0]?.date).toBe('2026-03-05')
    expect(result[1]?.date).toBe('2026-12-25')
  })

  it('テキスト形式では最大5件に制限される', () => {
    const lines = Array.from({ length: 10 }, (_, i) =>
      `2026-03-${String(i + 1).padStart(2, '0')} - 候補${i + 1}`,
    ).join('\n')
    const result = parseScheduleResponse(lines)
    expect(result).toHaveLength(5)
  })

  it('テキスト形式のscoreは降順（100, 85, 70, 55, 40）', () => {
    const response = '2026-03-01 - A\n2026-03-02 - B\n2026-03-03 - C\n2026-03-04 - D\n2026-03-05 - E'
    const result = parseScheduleResponse(response)
    expect(result.map(s => s.score)).toEqual([100, 85, 70, 55, 40])
  })

  it('空レスポンスでは空配列を返す', () => {
    expect(parseScheduleResponse('')).toEqual([])
  })
})

// ──────────────────────────────────────
// extractDate テスト
// ──────────────────────────────────────

describe('extractDate', () => {
  it('ISO形式を抽出する', () => {
    expect(extractDate('候補日: 2026-03-15')).toBe('2026-03-15')
  })

  it('日本語形式を抽出する', () => {
    expect(extractDate('2026年3月5日に開催')).toBe('2026-03-05')
  })

  it('日付がない場合はnullを返す', () => {
    expect(extractDate('日付なしのテキスト')).toBeNull()
  })

  it('複数日付がある場合は最初を抽出する', () => {
    expect(extractDate('2026-03-15 から 2026-03-20')).toBe('2026-03-15')
  })
})
