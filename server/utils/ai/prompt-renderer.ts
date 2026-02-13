// AI-001 §7.1: プロンプトテンプレート変数埋め込みエンジン
// {{category.field}} 構文を解析し、変数値を埋め込む
// ネスト対応: {{event.venue.address.city}}

import type { VariableDefinition } from '~/types/ai';

// ──────────────────────────────────────
// エラー
// ──────────────────────────────────────

export class VariableNotFoundError extends Error {
  readonly code = 'VARIABLE_NOT_FOUND';
  constructor(public readonly path: string) {
    super(`Variable not found: ${path}`);
    this.name = 'VariableNotFoundError';
  }
}

export class RequiredVariableMissingError extends Error {
  readonly code = 'REQUIRED_VARIABLE_MISSING';
  constructor(
    public readonly category: string,
    public readonly field: string,
  ) {
    super(`Required variable '${category}.${field}' is missing`);
    this.name = 'RequiredVariableMissingError';
  }
}

export class VariableTypeMismatchError extends Error {
  readonly code = 'VARIABLE_TYPE_MISMATCH';
  constructor(
    public readonly path: string,
    public readonly expectedType: string,
    public readonly actualType: string,
  ) {
    super(`Variable '${path}' expected type '${expectedType}' but got '${actualType}'`);
    this.name = 'VariableTypeMismatchError';
  }
}

// ──────────────────────────────────────
// 変数バリデーション
// ──────────────────────────────────────

/**
 * 変数定義に基づいて入力変数をバリデートする。
 * required変数が未指定の場合はエラー、型不一致もエラー。
 * default値がある場合は自動補完する。
 */
export function validateVariables(
  definition: VariableDefinition,
  variables: Record<string, unknown>,
): Record<string, Record<string, unknown>> {
  const validated: Record<string, Record<string, unknown>> = {};

  for (const [category, categoryDef] of Object.entries(definition)) {
    const categoryValue = variables[category];
    const categoryObj: Record<string, unknown> = {};

    if (categoryValue && typeof categoryValue === 'object' && !Array.isArray(categoryValue)) {
      Object.assign(categoryObj, categoryValue as Record<string, unknown>);
    }

    // required チェック
    for (const requiredField of categoryDef.required) {
      if (categoryObj[requiredField] === undefined || categoryObj[requiredField] === null) {
        // デフォルト値があればセット
        const fieldDef = categoryDef.fields[requiredField];
        if (fieldDef?.default !== undefined) {
          categoryObj[requiredField] = fieldDef.default;
        } else {
          throw new RequiredVariableMissingError(category, requiredField);
        }
      }
    }

    // 型チェック + デフォルト値補完
    for (const [field, fieldDef] of Object.entries(categoryDef.fields)) {
      const value = categoryObj[field];
      if (value === undefined || value === null) {
        if (fieldDef.default !== undefined) {
          categoryObj[field] = fieldDef.default;
        }
        continue;
      }

      const actualType = typeof value;
      const expectedType = fieldDef.type === 'date' ? 'string' : fieldDef.type;
      if (actualType !== expectedType) {
        throw new VariableTypeMismatchError(`${category}.${field}`, fieldDef.type, actualType);
      }
    }

    validated[category] = categoryObj;
  }

  return validated;
}

// ──────────────────────────────────────
// プロンプトレンダリング
// ──────────────────────────────────────

/**
 * テンプレート文字列の {{category.field}} プレースホルダーを変数値で置換する。
 * ネストしたパスもサポート: {{event.venue.address.city}}
 */
export function renderPrompt(
  template: string,
  variables: Record<string, unknown>,
): string {
  // {{category.field.subfield...}} のパターンに一致
  const placeholderPattern = /\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g;

  return template.replace(placeholderPattern, (match, path: string) => {
    const value = resolvePath(variables, path);
    if (value === undefined || value === null) {
      throw new VariableNotFoundError(path);
    }
    // オブジェクト・配列・関数は埋め込み不可
    if (typeof value === 'object' || typeof value === 'function') {
      throw new VariableTypeMismatchError(path, 'primitive', typeof value);
    }
    return String(value);
  });
}

/**
 * ドットパスを辿ってオブジェクトの値を取得する。
 * 例: resolvePath({event: {title: "セミナー"}}, "event.title") → "セミナー"
 */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * テンプレート内の全プレースホルダーを抽出する。
 */
export function extractPlaceholders(template: string): string[] {
  const pattern = /\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g;
  const results: string[] = [];
  let match;
  while ((match = pattern.exec(template)) !== null) {
    const placeholder = match[1];
    if (placeholder && !results.includes(placeholder)) {
      results.push(placeholder);
    }
  }
  return results;
}
