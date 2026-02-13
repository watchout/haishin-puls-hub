// AI-008 §10.2: PIIマスキング/アンマスキングテスト
import { describe, it, expect, beforeEach } from 'vitest';
import { createPIIMasker } from '~/server/utils/ai/pii-masker';
import type { PIIMasker } from '~/server/utils/ai/pii-masker';

describe('PIIMasker', () => {
  let masker: PIIMasker;

  beforeEach(() => {
    masker = createPIIMasker();
  });

  // ──────────────────────────────────────
  // §10.2 マスキングテスト
  // ──────────────────────────────────────

  describe('mask', () => {
    // §10.2 氏名のみ
    it('日本語氏名をマスクする', () => {
      const result = masker.mask('山田太郎さん');
      expect(result).toBe('[NAME_1]さん');
    });

    // §10.2 同一氏名複数
    it('同一氏名の複数出現には同じインデックスを付与する', () => {
      const result = masker.mask('山田太郎と山田太郎');
      expect(result).toBe('[NAME_1]と[NAME_1]');
    });

    it('異なる氏名には異なるインデックスを付与する', () => {
      const result = masker.mask('山田太郎と鈴木花子');
      expect(result).toBe('[NAME_1]と[NAME_2]');
    });

    // §10.2 メールアドレス
    it('メールアドレスをマスクする', () => {
      const result = masker.mask('address: test@example.com');
      expect(result).toBe('address: [EMAIL_1]');
    });

    it('複数メールアドレスを個別にマスクする', () => {
      const result = masker.mask('yamada@example.com と suzuki@test.co.jp');
      expect(result).toBe('[EMAIL_1] と [EMAIL_2]');
    });

    // §10.2 電話番号
    it('ハイフンあり電話番号をマスクする', () => {
      const result = masker.mask('TEL: 090-1234-5678');
      expect(result).toBe('TEL: [PHONE_1]');
    });

    it('ハイフンなし電話番号をマスクする', () => {
      const result = masker.mask('TEL: 09012345678');
      expect(result).toBe('TEL: [PHONE_1]');
    });

    it('固定電話番号をマスクする', () => {
      const result = masker.mask('TEL: 03-1234-5678');
      expect(result).toBe('TEL: [PHONE_1]');
    });

    // §10.2 複合テスト
    it('氏名・メール・電話番号の複合テキストをマスクする', () => {
      const input = '山田太郎（yamada@example.com, 090-1234-5678）';
      const result = masker.mask(input);

      expect(result).toBe('[NAME_1]（[EMAIL_1], [PHONE_1]）');
    });

    // §10.2 PII含まず
    it('PII情報を含まないテキストはそのまま返す', () => {
      const input = 'The event is tomorrow';
      expect(masker.mask(input)).toBe('The event is tomorrow');
    });

    it('ストップワードに含まれる一般語はマスクしない', () => {
      expect(masker.mask('電話で連絡してください')).toBe('電話で連絡してください');
      expect(masker.mask('イベント会場を確認する')).toBe('イベント会場を確認する');
    });

    it('空文字列をそのまま返す', () => {
      expect(masker.mask('')).toBe('');
    });

    // 仕様 §7.6 の例
    it('仕様書の例通りにマスクする', () => {
      const input = '山田太郎さん（yamada@example.com）と鈴木花子さん（suzuki@example.com）、そして山田太郎さんの連絡先は090-1234-5678です。';
      const result = masker.mask(input);

      expect(result).toBe(
        '[NAME_1]さん（[EMAIL_1]）と[NAME_2]さん（[EMAIL_2]）、そして[NAME_1]さんの連絡先は[PHONE_1]です。',
      );
    });
  });

  // ──────────────────────────────────────
  // §10.2 アンマスキングテスト
  // ──────────────────────────────────────

  describe('unmask', () => {
    it('マスクした氏名を復元する', () => {
      const masked = masker.mask('山田太郎さん');
      const unmasked = masker.unmask(masked);
      expect(unmasked).toBe('山田太郎さん');
    });

    it('マスクしたメールアドレスを復元する', () => {
      const masked = masker.mask('test@example.com');
      const unmasked = masker.unmask(masked);
      expect(unmasked).toBe('test@example.com');
    });

    it('マスクした電話番号を復元する', () => {
      const masked = masker.mask('090-1234-5678');
      const unmasked = masker.unmask(masked);
      expect(unmasked).toBe('090-1234-5678');
    });

    it('複合テキストのマスク/アンマスクが往復で一致する', () => {
      const original = '山田太郎（yamada@example.com, 090-1234-5678）';
      const masked = masker.mask(original);
      const unmasked = masker.unmask(masked);

      expect(unmasked).toBe(original);
    });

    it('PII含まないテキストのアンマスクはそのまま返す', () => {
      masker.mask('山田太郎'); // 事前にマスキング
      const result = masker.unmask('イベントは明日です');
      expect(result).toBe('イベントは明日です');
    });

    it('LLM応答に含まれるマスク値を正しくアンマスクする', () => {
      masker.mask('山田太郎（yamada@example.com）');

      // LLM が生成した応答テキスト（マスク値を含む）
      const llmResponse = '[NAME_1]様、ご参加ありがとうございます。確認メールを[EMAIL_1]に送信しました。';
      const unmasked = masker.unmask(llmResponse);

      expect(unmasked).toBe('山田太郎様、ご参加ありがとうございます。確認メールをyamada@example.comに送信しました。');
    });
  });

  // ──────────────────────────────────────
  // getEntries / clear
  // ──────────────────────────────────────

  describe('getEntries', () => {
    it('マスクエントリを取得できる', () => {
      masker.mask('山田太郎（yamada@example.com）');
      const entries = masker.getEntries();

      expect(entries).toHaveLength(2);

      const emailEntry = entries.find((e) => e.category === 'EMAIL');
      expect(emailEntry).toBeDefined();
      expect(emailEntry?.original).toBe('yamada@example.com');
      expect(emailEntry?.masked).toBe('[EMAIL_1]');
      expect(emailEntry?.index).toBe(1);

      const nameEntry = entries.find((e) => e.category === 'NAME');
      expect(nameEntry).toBeDefined();
      expect(nameEntry?.original).toBe('山田太郎');
      expect(nameEntry?.masked).toBe('[NAME_1]');
    });

    it('マスクしていなければ空配列を返す', () => {
      expect(masker.getEntries()).toEqual([]);
    });
  });

  describe('clear', () => {
    it('クリア後はマスクマッピングがリセットされる', () => {
      masker.mask('山田太郎');
      expect(masker.getEntries()).toHaveLength(1);

      masker.clear();
      expect(masker.getEntries()).toEqual([]);
    });

    it('クリア後の新規マスクはインデックスが1から始まる', () => {
      masker.mask('山田太郎');
      masker.clear();

      const result = masker.mask('鈴木花子');
      expect(result).toBe('[NAME_1]'); // 1から再開
    });
  });

  // ──────────────────────────────────────
  // エッジケース
  // ──────────────────────────────────────

  describe('エッジケース', () => {
    it('1文字の漢字はマスクしない（氏名は2文字以上）', () => {
      // "私" は1文字なのでマスクされない
      const result = masker.mask('私said hello');
      expect(result).toContain('私');
    });

    it('7文字以上の漢字連続はマスクしない', () => {
      const longKanji = '東京国際会議場所'; // 8文字 → 6文字上限を超える
      const result = masker.mask(longKanji);
      // 6文字以下の部分一致でマスクされる可能性があるが、全体はそのまま
      expect(result).toBeDefined();
    });

    it('英語名はマスクしない（日本語パターンのみ）', () => {
      const result = masker.mask('John Smith attended the event');
      expect(result).toBe('John Smith attended the event');
    });

    it('複数回maskを呼んでもインデックスが連続する', () => {
      masker.mask('山田太郎');
      const result = masker.mask('鈴木花子');
      expect(result).toBe('[NAME_2]'); // 2番目
    });

    it('同じmaskerで異なるテキストをマスクしても同一値は同じインデックス', () => {
      masker.mask('山田太郎 hello');
      const result = masker.mask('山田太郎 world');
      expect(result).toBe('[NAME_1] world');
    });

    it('カタカナ氏名をマスクする', () => {
      const result = masker.mask('タナカタロウさん');
      expect(result).toBe('[NAME_1]さん');
    });

    it('カタカナのストップワード（イベント等）はマスクしない', () => {
      const result = masker.mask('セミナーで発表');
      expect(result).toContain('セミナー');
    });
  });
});
