// AI-001/003 §10.4/§10.5: LLMルーティング・コスト計算テスト
import { describe, it, expect } from 'vitest';
import {
  selectModel,
  calculateCost,
  AIProviderUnavailableError,
  AITimeoutError,
} from '~/server/utils/ai/llm-router';

// ──────────────────────────────────────
// §10.4 モデル選択テスト
// ──────────────────────────────────────

describe('selectModel', () => {
  // §10.4 正常系: 複雑タスク
  it('email_draft に Claude Sonnet 4.5 を選択する', () => {
    expect(selectModel('email_draft')).toBe('claude-sonnet-4-5');
  });

  it('schedule_suggest に Claude Sonnet 4.5 を選択する', () => {
    expect(selectModel('schedule_suggest')).toBe('claude-sonnet-4-5');
  });

  // §10.4 正常系: 簡易タスク
  it('quick_qa に Claude Haiku 3.5 を選択する', () => {
    expect(selectModel('quick_qa')).toBe('claude-haiku-3-5');
  });

  it('venue_search に Claude Haiku 3.5 を選択する', () => {
    expect(selectModel('venue_search')).toBe('claude-haiku-3-5');
  });

  // デフォルト
  it('未知のユースケースにはデフォルトモデルを返す', () => {
    expect(selectModel('unknown_usecase')).toBe('claude-sonnet-4-5');
  });

  it('空文字列のユースケースにはデフォルトモデルを返す', () => {
    expect(selectModel('')).toBe('claude-sonnet-4-5');
  });
});

// ──────────────────────────────────────
// §10.5 コスト計算テスト
// ──────────────────────────────────────

describe('calculateCost', () => {
  // §10.5 Sonnet
  it('Claude Sonnet 4.5 のコストを正しく計算する', () => {
    // (1000/1000)*0.45 + (2000/1000)*2.25 = 0.45 + 4.5 = 4.95 → ceil → 5
    expect(calculateCost(1000, 2000, 'claude-sonnet-4-5')).toBe(5);
  });

  // §10.5 Haiku
  it('Claude Haiku 3.5 のコストを正しく計算する', () => {
    // (1000/1000)*0.12 + (2000/1000)*0.75 = 0.12 + 1.5 = 1.62 → ceil → 2
    expect(calculateCost(1000, 2000, 'claude-haiku-3-5')).toBe(2);
  });

  // §10.5 GPT-4o
  it('GPT-4o のコストを正しく計算する', () => {
    // (1000/1000)*0.75 + (2000/1000)*2.25 = 0.75 + 4.5 = 5.25 → ceil → 6
    expect(calculateCost(1000, 2000, 'gpt-4o')).toBe(6);
  });

  it('トークン0の場合は0円を返す', () => {
    expect(calculateCost(0, 0, 'claude-sonnet-4-5')).toBe(0);
  });

  it('小数点以下を切り上げる', () => {
    // (1/1000)*0.45 + (1/1000)*2.25 = 0.00045 + 0.00225 = 0.0027 → ceil → 1
    expect(calculateCost(1, 1, 'claude-sonnet-4-5')).toBe(1);
  });

  it('大量トークンのコスト計算', () => {
    // (100000/1000)*0.45 + (100000/1000)*2.25 = 45 + 225 = 270
    expect(calculateCost(100000, 100000, 'claude-sonnet-4-5')).toBe(270);
  });
});

// ──────────────────────────────────────
// エラークラステスト
// ──────────────────────────────────────

describe('AIProviderUnavailableError', () => {
  it('正しいエラーコードとステータスを持つ', () => {
    const error = new AIProviderUnavailableError();
    expect(error.code).toBe('AI_PROVIDER_UNAVAILABLE');
    expect(error.statusCode).toBe(503);
    expect(error.name).toBe('AIProviderUnavailableError');
    expect(error.message).toContain('All AI providers are currently unavailable');
  });

  it('原因メッセージを含められる', () => {
    const error = new AIProviderUnavailableError('Connection refused');
    expect(error.message).toContain('Connection refused');
  });
});

describe('AITimeoutError', () => {
  it('正しいエラーコードとステータスを持つ', () => {
    const error = new AITimeoutError();
    expect(error.code).toBe('AI_TIMEOUT');
    expect(error.statusCode).toBe(504);
    expect(error.name).toBe('AITimeoutError');
    expect(error.message).toContain('60 seconds');
  });
});
