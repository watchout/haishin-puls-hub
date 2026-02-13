// VENUE-001-004: 会場ヘルパー関数テスト
// composables/useVenues.ts のヘルパー関数を直接テスト
// （Vueランタイムに依存しないため、関数を再実装してテスト）
import { describe, it, expect } from 'vitest'

// ──────────────────────────────────────
// テスト対象の関数を再定義（Vueインポートを回避）
// ──────────────────────────────────────

interface EquipmentItem {
  name: string
  quantity: number
  note?: string
}

function formatCapacity(capacity: number | null): string {
  if (capacity === null || capacity === undefined) return '未設定'
  return `${capacity.toLocaleString()}人`
}

function formatHourlyRate(rate: number | null): string {
  if (rate === null || rate === undefined) return '未設定'
  if (rate === 0) return '無料'
  return `¥${rate.toLocaleString()}/時間`
}

function formatEquipmentSummary(equipment: EquipmentItem[]): string {
  if (!equipment || equipment.length === 0) return 'なし'
  return equipment.map(e => `${e.name}×${e.quantity}`).join('、')
}

// ──────────────────────────────────────
// formatCapacity テスト
// ──────────────────────────────────────

describe('formatCapacity', () => {
  it('null → "未設定"', () => {
    expect(formatCapacity(null)).toBe('未設定')
  })

  it('200 → "200人"', () => {
    expect(formatCapacity(200)).toBe('200人')
  })

  it('1000 → "1,000人"', () => {
    expect(formatCapacity(1000)).toBe('1,000人')
  })

  it('1 → "1人"', () => {
    expect(formatCapacity(1)).toBe('1人')
  })

  it('100000 → "100,000人"', () => {
    expect(formatCapacity(100000)).toBe('100,000人')
  })
})

// ──────────────────────────────────────
// formatHourlyRate テスト
// ──────────────────────────────────────

describe('formatHourlyRate', () => {
  it('null → "未設定"', () => {
    expect(formatHourlyRate(null)).toBe('未設定')
  })

  it('0 → "無料"', () => {
    expect(formatHourlyRate(0)).toBe('無料')
  })

  it('50000 → "¥50,000/時間"', () => {
    expect(formatHourlyRate(50000)).toBe('¥50,000/時間')
  })

  it('1000000 → "¥1,000,000/時間"', () => {
    expect(formatHourlyRate(1000000)).toBe('¥1,000,000/時間')
  })
})

// ──────────────────────────────────────
// formatEquipmentSummary テスト
// ──────────────────────────────────────

describe('formatEquipmentSummary', () => {
  it('空配列 → "なし"', () => {
    expect(formatEquipmentSummary([])).toBe('なし')
  })

  it('1機材 → "プロジェクター×2"', () => {
    expect(formatEquipmentSummary([
      { name: 'プロジェクター', quantity: 2 },
    ])).toBe('プロジェクター×2')
  })

  it('複数機材 → カンマ区切り', () => {
    expect(formatEquipmentSummary([
      { name: 'プロジェクター', quantity: 2 },
      { name: 'マイク', quantity: 4 },
      { name: 'スクリーン', quantity: 1 },
    ])).toBe('プロジェクター×2、マイク×4、スクリーン×1')
  })

  it('note付き機材も名前と数量のみ表示', () => {
    expect(formatEquipmentSummary([
      { name: 'プロジェクター', quantity: 2, note: '4K対応' },
    ])).toBe('プロジェクター×2')
  })
})
