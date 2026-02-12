// AI-008 §7.5/§7.6: PII自動マスキング/アンマスキング
// LLM送信前にマスク、応答後にアンマスク
// マスクマッピングはメモリ上にのみ保持（DB/ログに記録しない）

import type { PIICategory, PIIMaskEntry } from '~/types/ai';

// ──────────────────────────────────────
// PII検出パターン (§7.5)
// ──────────────────────────────────────

// メール・電話を先に処理し、残った部分で氏名を検出する順序で実行
// これにより、メールアドレスのローカル部が日本語名と誤判定されるのを防ぐ

/** メールアドレス: RFC 5322 準拠簡易版 */
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** 電話番号: 日本国内形式（ハイフン有無対応） */
const PHONE_PATTERN = /0\d{1,4}-?\d{1,4}-?\d{4}|0\d{9,10}/g;

/**
 * 日本語氏名検出パターン (§7.5 準拠、精度向上版)
 *
 * 仕様: /[一-龯ぁ-んァ-ヶー]{2,10}/g
 * 問題: ひらがな・カタカナを含むと「電話」「イベント」「さん」等の一般語もマッチ
 * 対策: 漢字のみ（2-6文字）+ カタカナ名（3-10文字）に分離し、ストップワードで一般語を除外
 */
const KANJI_NAME_PATTERN = /[一-龯]{2,6}/g;
const KATAKANA_NAME_PATTERN = /[ァ-ヶー]{3,10}/g;

/**
 * 氏名誤検出を防ぐためのストップワード。
 * ビジネスドメインの一般的な漢字語・カタカナ語を除外する。
 */
const NAME_STOPWORDS = new Set([
  // 漢字2文字の一般語
  '電話', '連絡', '返信', '会場', '参加', '開催', '明日', '今日',
  '昨日', '時間', '場所', '確認', '送信', '受信', '管理', '設定', '登録',
  '削除', '更新', '検索', '表示', '有効', '無効', '完了', '未定',
  '必須', '任意', '公開', '下書', '作成', '編集', '保存', '変更',
  '予定', '日程', '担当', '出席', '欠席', '議題', '議事', '報告', '提案',
  '見積', '請求', '契約', '納品', '発注', '受注', '在庫', '商品',
  '顧客', '取引', '部署', '部門', '社内', '社外', '上司', '部下',
  '資料', '書類', '文書', '記録', '履歴', '一覧', '詳細', '概要',
  '学生', '先生', '会社', '組織', '団体', '個人', '法人', '株式',
  '配信', '活用', '基盤', '機能', '画面', '入力', '出力', '状態',
  // 漢字3文字の一般語
  '担当者', '非公開', '非表示', '連絡先', '参加者',
  // カタカナ一般語
  'イベント', 'メール', 'セミナー', 'タスク', 'スケジュール',
  'プロジェクト', 'システム', 'サービス', 'プラン', 'プラットフォーム',
]);

/**
 * マッチした文字列が日本語氏名として妥当かを判定する。
 * ストップワードに含まれる一般語はスキップする。
 */
function isLikelyName(text: string): boolean {
  return !NAME_STOPWORDS.has(text);
}

// ──────────────────────────────────────
// マスク/アンマスクのコアロジック
// ──────────────────────────────────────

/**
 * PIIMasker: リクエストスコープで使い捨てるマスキングコンテキスト。
 *
 * 使い方:
 *   const masker = createPIIMasker();
 *   const masked = masker.mask(userInput);
 *   // → LLM に masked を送信
 *   const unmasked = masker.unmask(llmResponse);
 *   // → unmasked をユーザーに返却
 */
export interface PIIMasker {
  /** テキスト中のPIIを検出しマスクする */
  mask: (text: string) => string;
  /** マスク値を元の値に復元する */
  unmask: (text: string) => string;
  /** 現在のマスクマッピングを取得（デバッグ用） */
  getEntries: () => PIIMaskEntry[];
  /** マッピングをクリア */
  clear: () => void;
}

/**
 * PIIMaskerインスタンスを生成する。
 * リクエストスコープごとに1つ生成し、レスポンス完了後に破棄する。
 */
export function createPIIMasker(): PIIMasker {
  // original値 → マスク値 のマッピング（同一値の重複マスク防止）
  const originalToMask = new Map<string, string>();
  // マスク値 → original値 のマッピング（アンマスク用）
  const maskToOriginal = new Map<string, string>();
  // カテゴリ別カウンター（1始まり採番）
  const counters: Record<PIICategory, number> = {
    NAME: 0,
    EMAIL: 0,
    PHONE: 0,
  };

  function getOrCreateMask(original: string, category: PIICategory): string {
    const existing = originalToMask.get(original);
    if (existing) return existing;

    counters[category]++;
    const maskValue = `[${category}_${counters[category]}]`;

    originalToMask.set(original, maskValue);
    maskToOriginal.set(maskValue, original);

    return maskValue;
  }

  function mask(text: string): string {
    let result = text;

    // 1. メールアドレスを先にマスク（ローカル部が日本語名と誤判定されるのを防ぐ）
    result = result.replace(EMAIL_PATTERN, (match) => {
      return getOrCreateMask(match, 'EMAIL');
    });

    // 2. 電話番号をマスク
    result = result.replace(PHONE_PATTERN, (match) => {
      return getOrCreateMask(match, 'PHONE');
    });

    // 3. 漢字氏名をマスク（ストップワードを除外）
    result = result.replace(KANJI_NAME_PATTERN, (match) => {
      if (!isLikelyName(match)) return match;
      return getOrCreateMask(match, 'NAME');
    });

    // 4. カタカナ氏名をマスク（ストップワードを除外）
    result = result.replace(KATAKANA_NAME_PATTERN, (match) => {
      if (!isLikelyName(match)) return match;
      return getOrCreateMask(match, 'NAME');
    });

    return result;
  }

  function unmask(text: string): string {
    let result = text;

    for (const [maskValue, original] of maskToOriginal) {
      // replaceAll で全出現箇所を復元
      result = result.replaceAll(maskValue, original);
    }

    return result;
  }

  function getEntries(): PIIMaskEntry[] {
    const entries: PIIMaskEntry[] = [];
    for (const [original, masked] of originalToMask) {
      // マスク値から category と index を抽出
      const match = masked.match(/^\[(\w+)_(\d+)\]$/);
      if (match) {
        entries.push({
          category: match[1] as PIICategory,
          index: Number(match[2]),
          original,
          masked,
        });
      }
    }
    return entries;
  }

  function clear(): void {
    originalToMask.clear();
    maskToOriginal.clear();
    counters.NAME = 0;
    counters.EMAIL = 0;
    counters.PHONE = 0;
  }

  return { mask, unmask, getEntries, clear };
}
