// SEC-006 XSS対策 - HTMLサニタイズ
// 仕様書: docs/design/features/common/SEC-001-007_security.md §5.4

import DOMPurify from 'isomorphic-dompurify';

/** リッチテキストで許可するHTMLタグ */
const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'];

/** リッチテキストで許可するHTML属性 */
const ALLOWED_ATTR = ['href', 'target', 'rel'];

/**
 * HTML文字列をサニタイズ
 * scriptタグ、イベントハンドラ等の危険なコンテンツを除去
 *
 * @param dirty - サニタイズ前のHTML文字列
 * @returns サニタイズ済みのHTML文字列
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * プレーンテキストへ変換（全HTMLタグを除去）
 *
 * @param dirty - 変換前のHTML文字列
 * @returns プレーンテキスト
 */
export function stripHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}
