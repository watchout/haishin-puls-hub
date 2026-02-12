// SEC-006 XSS対策サニタイズ ユニットテスト
// 仕様書: docs/design/features/common/SEC-001-007_security.md §5.4, §10.5

import { describe, it, expect } from 'vitest';
import { sanitizeHtml, stripHtml } from '~/server/utils/security/sanitize';

// ──────────────────────────────────────
// TC-SEC-006: XSS対策テスト
// ──────────────────────────────────────

describe('sanitizeHtml (SEC-006)', () => {
  it('TC-SEC-006-01: 通常のテキスト入力はそのまま返す', () => {
    expect(sanitizeHtml('Hello World')).toBe('Hello World');
  });

  it('TC-SEC-006-02: scriptタグが除去される', () => {
    const dirty = '<script>alert("XSS")</script><p>安全なコンテンツ</p>';
    const result = sanitizeHtml(dirty);
    expect(result).not.toContain('<script>');
    expect(result).toContain('<p>安全なコンテンツ</p>');
  });

  it('TC-SEC-006-03: imgタグのonerrorが除去される', () => {
    const dirty = '<img src=x onerror=alert(1)>';
    const result = sanitizeHtml(dirty);
    expect(result).not.toContain('onerror');
  });

  it('TC-SEC-006-04: 許可タグ（strong, em, p, a）は残る', () => {
    const input = '<p><strong>太字</strong>と<em>斜体</em>と<a href="https://example.com">リンク</a></p>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<strong>太字</strong>');
    expect(result).toContain('<em>斜体</em>');
    expect(result).toContain('<a href="https://example.com">リンク</a>');
    expect(result).toContain('<p>');
  });

  it('リストタグ（ul, ol, li）が許可される', () => {
    const input = '<ul><li>項目1</li><li>項目2</li></ul>';
    expect(sanitizeHtml(input)).toContain('<ul>');
    expect(sanitizeHtml(input)).toContain('<li>');
  });

  it('divタグは除去される（許可外）', () => {
    const input = '<div class="evil"><p>内容</p></div>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<div');
    expect(result).toContain('<p>内容</p>');
  });

  it('data属性は除去される', () => {
    const input = '<p data-evil="payload">テスト</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('data-evil');
  });

  it('onclickイベントハンドラが除去される', () => {
    const input = '<a href="#" onclick="alert(1)">クリック</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onclick');
  });

  it('javascript:プロトコルが除去される', () => {
    const input = '<a href="javascript:alert(1)">危険</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('javascript:');
  });

  it('空文字列を入力すると空文字列を返す', () => {
    expect(sanitizeHtml('')).toBe('');
  });
});

describe('stripHtml', () => {
  it('全HTMLタグを除去してテキストのみ返す', () => {
    const input = '<p><strong>太字</strong>テキスト</p>';
    expect(stripHtml(input)).toBe('太字テキスト');
  });

  it('scriptタグの内容も除去される', () => {
    const input = '<script>alert("XSS")</script>安全';
    expect(stripHtml(input)).toBe('安全');
  });
});
