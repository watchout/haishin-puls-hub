// AI-001 §10.1: プロンプトレンダリングテスト
import { describe, it, expect } from 'vitest';
import {
  renderPrompt,
  validateVariables,
  extractPlaceholders,
  VariableNotFoundError,
  RequiredVariableMissingError,
  VariableTypeMismatchError,
} from '~/server/utils/ai/prompt-renderer';
import type { VariableDefinition } from '~/types/ai';

// ──────────────────────────────────────
// renderPrompt
// ──────────────────────────────────────

describe('renderPrompt', () => {
  // §10.1 正常系: 全変数埋め込み
  it('全変数を正しく埋め込む', () => {
    const template = '{{event.title}}は{{event.startDate}}開催';
    const variables = {
      event: { title: 'セミナー', startDate: '2026-03-15' },
    };

    expect(renderPrompt(template, variables)).toBe('セミナーは2026-03-15開催');
  });

  it('複数カテゴリの変数を埋め込む', () => {
    const template = '{{event.title}}について、{{user.name}}様向けにメール本文を作成してください。';
    const variables = {
      event: { title: 'AI活用セミナー' },
      user: { name: '山田太郎' },
    };

    expect(renderPrompt(template, variables)).toBe(
      'AI活用セミナーについて、山田太郎様向けにメール本文を作成してください。',
    );
  });

  // §10.1 エッジケース: ネスト深い
  it('ネストしたパスを正しく解決する', () => {
    const template = '{{event.venue.address.city}}で開催します';
    const variables = {
      event: { venue: { address: { city: '東京' } } },
    };

    expect(renderPrompt(template, variables)).toBe('東京で開催します');
  });

  it('数値・ブール値を文字列に変換して埋め込む', () => {
    const template = '定員: {{event.capacity}}名, 公開: {{event.isPublic}}';
    const variables = {
      event: { capacity: 100, isPublic: true },
    };

    expect(renderPrompt(template, variables)).toBe('定員: 100名, 公開: true');
  });

  it('プレースホルダーがないテンプレートをそのまま返す', () => {
    const template = 'プレースホルダーなしのテキスト';
    expect(renderPrompt(template, {})).toBe('プレースホルダーなしのテキスト');
  });

  it('空テンプレートを空文字列で返す', () => {
    expect(renderPrompt('', {})).toBe('');
  });

  it('不正なプレースホルダー構文はそのまま残す', () => {
    const template = '{{unclosed と {single} と {{ noclose';
    expect(renderPrompt(template, {})).toBe('{{unclosed と {single} と {{ noclose');
  });

  // §10.1 異常系: 変数なし
  it('変数が見つからない場合 VariableNotFoundError を投げる', () => {
    const template = '{{event.title}}';

    expect(() => renderPrompt(template, {})).toThrow(VariableNotFoundError);
    expect(() => renderPrompt(template, {})).toThrow('Variable not found: event.title');
  });

  it('ネストパスの途中が存在しない場合 VariableNotFoundError を投げる', () => {
    const template = '{{event.venue.name}}';
    const variables = { event: { title: 'セミナー' } };

    expect(() => renderPrompt(template, variables)).toThrow(VariableNotFoundError);
  });

  // 監査で発見: オブジェクト値のガード
  it('オブジェクト値を埋め込もうとした場合 VariableTypeMismatchError を投げる', () => {
    const template = '{{event.venue}}';
    const variables = { event: { venue: { name: '会場A' } } };

    expect(() => renderPrompt(template, variables)).toThrow(VariableTypeMismatchError);
  });

  it('配列値を埋め込もうとした場合 VariableTypeMismatchError を投げる', () => {
    const template = '{{event.tags}}';
    const variables = { event: { tags: ['AI', 'セミナー'] } };

    expect(() => renderPrompt(template, variables)).toThrow(VariableTypeMismatchError);
  });
});

// ──────────────────────────────────────
// validateVariables
// ──────────────────────────────────────

describe('validateVariables', () => {
  const definition: VariableDefinition = {
    event: {
      type: 'object',
      required: ['title', 'startDate'],
      fields: {
        title: { type: 'string', description: 'イベントタイトル' },
        startDate: { type: 'string', description: '開始日時' },
        venue: { type: 'string', description: '会場名', default: '未定' },
        capacity: { type: 'number', description: '定員' },
      },
    },
    user: {
      type: 'object',
      required: ['name'],
      fields: {
        name: { type: 'string', description: 'ユーザー名' },
        email: { type: 'string', description: 'メールアドレス' },
      },
    },
  };

  it('全required変数が揃っていればバリデーションを通過する', () => {
    const variables = {
      event: { title: 'セミナー', startDate: '2026-03-15' },
      user: { name: '田中' },
    };

    const result = validateVariables(definition, variables);
    expect(result.event!.title).toBe('セミナー');
    expect(result.event!.startDate).toBe('2026-03-15');
    expect(result.user!.name).toBe('田中');
  });

  it('デフォルト値を自動補完する', () => {
    const variables = {
      event: { title: 'セミナー', startDate: '2026-03-15' },
      user: { name: '田中' },
    };

    const result = validateVariables(definition, variables);
    expect(result.event!.venue).toBe('未定');
  });

  it('required変数にデフォルト値がある場合は補完される', () => {
    const defWithDefault: VariableDefinition = {
      event: {
        type: 'object',
        required: ['title'],
        fields: {
          title: { type: 'string', default: 'デフォルトタイトル' },
        },
      },
    };

    const result = validateVariables(defWithDefault, { event: {} });
    expect(result.event!.title).toBe('デフォルトタイトル');
  });

  // §10.1 異常系: required変数未指定
  it('required変数が未指定の場合 RequiredVariableMissingError を投げる', () => {
    const variables = {
      event: { title: 'セミナー' }, // startDate 欠落
      user: { name: '田中' },
    };

    expect(() => validateVariables(definition, variables)).toThrow(RequiredVariableMissingError);
    expect(() => validateVariables(definition, variables)).toThrow("Required variable 'event.startDate' is missing");
  });

  it('カテゴリ自体が未指定でもrequiredにデフォルトがなければエラー', () => {
    const variables = {
      user: { name: '田中' },
      // event カテゴリなし
    };

    expect(() => validateVariables(definition, variables)).toThrow(RequiredVariableMissingError);
  });

  // §10.1 異常系: 型不一致
  it('型不一致の場合 VariableTypeMismatchError を投げる', () => {
    const variables = {
      event: { title: 'セミナー', startDate: '2026-03-15', capacity: '100' }, // capacity は number であるべき
      user: { name: '田中' },
    };

    expect(() => validateVariables(definition, variables)).toThrow(VariableTypeMismatchError);
    expect(() => validateVariables(definition, variables)).toThrow("expected type 'number' but got 'string'");
  });

  it('optional変数が省略されてもエラーにならない', () => {
    const variables = {
      event: { title: 'セミナー', startDate: '2026-03-15' },
      user: { name: '田中' },
    };

    // email, capacity は optional
    expect(() => validateVariables(definition, variables)).not.toThrow();
  });
});

// ──────────────────────────────────────
// extractPlaceholders
// ──────────────────────────────────────

describe('extractPlaceholders', () => {
  it('テンプレートからプレースホルダーを抽出する', () => {
    const template = '{{event.title}}は{{event.startDate}}開催、担当: {{user.name}}';
    const result = extractPlaceholders(template);

    expect(result).toEqual(['event.title', 'event.startDate', 'user.name']);
  });

  it('重複するプレースホルダーは1回だけ返す', () => {
    const template = '{{event.title}}と{{event.title}}と{{user.name}}';
    const result = extractPlaceholders(template);

    expect(result).toEqual(['event.title', 'user.name']);
  });

  it('プレースホルダーがなければ空配列を返す', () => {
    expect(extractPlaceholders('テキストのみ')).toEqual([]);
  });

  it('ネストしたパスも正しく抽出する', () => {
    const template = '{{event.venue.address.city}}';
    expect(extractPlaceholders(template)).toEqual(['event.venue.address.city']);
  });
});
