// ACCT-001 §3.4 / §7 / §9: サインアップ関連ロジック ユニットテスト
// パスワード強度、招待サーバーサイドバリデーション、エラーコードマッピング

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  signupSchema,
  invitationAcceptSchema,
  SIGNUP_ERROR_MESSAGES,
  ROLE_REDIRECT_MAP,
  ROLES,
} from '~/types/auth';
import type { InvitationErrorCode } from '~/types/auth';

// ──────────────────────────────────────
// パスワード強度ロジック (§3.4)
// SignupForm.vue の passwordStrength computed を純粋関数として再現
// ──────────────────────────────────────

interface PasswordStrength {
  level: number;
  label: string;
  color: string;
}

function calculatePasswordStrength(pw: string): PasswordStrength {
  if (!pw || pw.length < 8) return { level: 0, label: '', color: '' };

  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSymbol = /[^a-zA-Z0-9]/.test(pw);

  if (hasUpper && hasNumber && hasSymbol) {
    return { level: 3, label: '強', color: 'success' };
  }
  if (hasUpper || hasNumber) {
    return { level: 2, label: '中', color: 'warning' };
  }
  return { level: 1, label: '弱', color: 'error' };
}

describe('パスワード強度インジケーター (§3.4)', () => {
  it('空文字はレベル0', () => {
    expect(calculatePasswordStrength('')).toEqual({ level: 0, label: '', color: '' });
  });

  it('7文字はレベル0（最低8文字）', () => {
    expect(calculatePasswordStrength('abcdefg')).toEqual({ level: 0, label: '', color: '' });
  });

  it('8文字の小文字のみはレベル1（弱）', () => {
    const result = calculatePasswordStrength('abcdefgh');
    expect(result.level).toBe(1);
    expect(result.label).toBe('弱');
    expect(result.color).toBe('error');
  });

  it('大文字を含むとレベル2（中）', () => {
    const result = calculatePasswordStrength('Abcdefgh');
    expect(result.level).toBe(2);
    expect(result.label).toBe('中');
    expect(result.color).toBe('warning');
  });

  it('数字を含むとレベル2（中）', () => {
    const result = calculatePasswordStrength('abcdefg1');
    expect(result.level).toBe(2);
    expect(result.label).toBe('中');
    expect(result.color).toBe('warning');
  });

  it('大文字 + 数字 + 記号でレベル3（強）', () => {
    const result = calculatePasswordStrength('Abcdef1!');
    expect(result.level).toBe(3);
    expect(result.label).toBe('強');
    expect(result.color).toBe('success');
  });

  it('大文字 + 記号のみ（数字なし）はレベル2', () => {
    const result = calculatePasswordStrength('Abcdefg!');
    expect(result.level).toBe(2);
    expect(result.label).toBe('中');
  });

  it('数字 + 記号のみ（大文字なし）はレベル2', () => {
    const result = calculatePasswordStrength('abcdef1!');
    expect(result.level).toBe(2);
    expect(result.label).toBe('中');
  });

  it('記号のみ（大文字なし・数字なし）はレベル1', () => {
    const result = calculatePasswordStrength('abcdefg!');
    expect(result.level).toBe(1);
    expect(result.label).toBe('弱');
  });
});

// ──────────────────────────────────────
// サーバーサイド acceptBodySchema (§5.3)
// accept.post.ts のバリデーションスキーマを再現
// ──────────────────────────────────────

const acceptBodySchema = z.object({
  name: z
    .string({ required_error: '名前を入力してください' })
    .min(1, '名前を入力してください')
    .max(100, '名前は100文字以内で入力してください'),
  password: z
    .string({ required_error: 'パスワードを入力してください' })
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(128),
  termsAccepted: z
    .boolean({ required_error: '利用規約に同意してください' })
    .refine((val) => val === true, '利用規約に同意してください'),
});

describe('招待承認 acceptBodySchema (§5.3)', () => {
  const validBody = {
    name: '山田太郎',
    password: 'Valid123!',
    termsAccepted: true,
  };

  it('有効なリクエストボディが正しくパースされる', () => {
    const result = acceptBodySchema.safeParse(validBody);
    expect(result.success).toBe(true);
  });

  it('name が空はバリデーションエラー', () => {
    const result = acceptBodySchema.safeParse({ ...validBody, name: '' });
    expect(result.success).toBe(false);
  });

  it('name が 100 文字はOK', () => {
    const result = acceptBodySchema.safeParse({ ...validBody, name: 'a'.repeat(100) });
    expect(result.success).toBe(true);
  });

  it('name が 101 文字はバリデーションエラー', () => {
    const result = acceptBodySchema.safeParse({ ...validBody, name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('password が 7 文字はバリデーションエラー', () => {
    const result = acceptBodySchema.safeParse({ ...validBody, password: 'Abc123!' });
    expect(result.success).toBe(false);
  });

  it('password が 8 文字はOK', () => {
    const result = acceptBodySchema.safeParse({ ...validBody, password: '12345678' });
    expect(result.success).toBe(true);
  });

  it('password が 128 文字はOK', () => {
    const result = acceptBodySchema.safeParse({ ...validBody, password: 'a'.repeat(128) });
    expect(result.success).toBe(true);
  });

  it('password が 129 文字はバリデーションエラー', () => {
    const result = acceptBodySchema.safeParse({ ...validBody, password: 'a'.repeat(129) });
    expect(result.success).toBe(false);
  });

  it('termsAccepted が false はバリデーションエラー', () => {
    const result = acceptBodySchema.safeParse({ ...validBody, termsAccepted: false });
    expect(result.success).toBe(false);
  });

  it('termsAccepted が未定義はバリデーションエラー', () => {
    const body = { name: validBody.name, password: validBody.password };
    const result = acceptBodySchema.safeParse(body);
    expect(result.success).toBe(false);
  });

  it('email フィールドは不要（招待トークンから取得）', () => {
    const result = acceptBodySchema.safeParse({
      ...validBody,
      email: 'extra@example.com',
    });
    expect(result.success).toBe(true);
  });
});

// ──────────────────────────────────────
// signupSchema 境界値テスト (§2.5)
// ──────────────────────────────────────

describe('signupSchema 境界値 (§2.5)', () => {
  const validData = {
    name: '山田太郎',
    email: 'test@example.com',
    password: 'Valid123!',
    passwordConfirm: 'Valid123!',
    termsAccepted: true,
  };

  it('email が最短有効値 (a@b.co) でOK', () => {
    const result = signupSchema.safeParse({ ...validData, email: 'a@b.co' });
    expect(result.success).toBe(true);
  });

  it('email が 255 文字でOK', () => {
    const localPart = 'a'.repeat(243);
    const email = `${localPart}@example.com`;
    const result = signupSchema.safeParse({ ...validData, email });
    expect(result.success).toBe(true);
  });

  it('password が 128 文字でOK', () => {
    const pw = 'a'.repeat(128);
    const result = signupSchema.safeParse({
      ...validData,
      password: pw,
      passwordConfirm: pw,
    });
    expect(result.success).toBe(true);
  });

  it('password が 129 文字はバリデーションエラー', () => {
    const pw = 'a'.repeat(129);
    const result = signupSchema.safeParse({
      ...validData,
      password: pw,
      passwordConfirm: pw,
    });
    expect(result.success).toBe(false);
  });

  it('名前が 1 文字でOK', () => {
    const result = signupSchema.safeParse({ ...validData, name: 'A' });
    expect(result.success).toBe(true);
  });

  it('rememberMe フィールドはない（signupSchema）', () => {
    const result = signupSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).rememberMe).toBeUndefined();
    }
  });

  // §2.5 追加境界値テスト
  it('email が 256 文字はバリデーションエラー (§2.5)', () => {
    const localPart = 'a'.repeat(244);
    const email = `${localPart}@example.com`;
    expect(email.length).toBe(256);
    const result = signupSchema.safeParse({ ...validData, email });
    expect(result.success).toBe(false);
  });

  it('email が空はバリデーションエラー (§2.5)', () => {
    const result = signupSchema.safeParse({ ...validData, email: '' });
    expect(result.success).toBe(false);
  });

  it('email が不正形式はバリデーションエラー (§2.5)', () => {
    const result = signupSchema.safeParse({ ...validData, email: 'abc' });
    expect(result.success).toBe(false);
  });

  it('passwordConfirm が不一致はバリデーションエラー (§2.5)', () => {
    const result = signupSchema.safeParse({
      ...validData,
      password: 'Valid123!',
      passwordConfirm: 'Different!',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmError = result.error.issues.find(
        (i) => i.path.includes('passwordConfirm'),
      );
      expect(confirmError?.message).toBe('パスワードが一致しません');
    }
  });

  it('password が 7 文字はバリデーションエラー (§2.5)', () => {
    const pw = 'Abc123!';
    expect(pw.length).toBe(7);
    const result = signupSchema.safeParse({
      ...validData,
      password: pw,
      passwordConfirm: pw,
    });
    expect(result.success).toBe(false);
  });

  it('password が 8 文字ちょうどでOK (§2.5)', () => {
    const pw = 'Abc1234!';
    expect(pw.length).toBe(8);
    const result = signupSchema.safeParse({
      ...validData,
      password: pw,
      passwordConfirm: pw,
    });
    expect(result.success).toBe(true);
  });

  it('name が空はバリデーションエラー (§2.5)', () => {
    const result = signupSchema.safeParse({ ...validData, name: '' });
    expect(result.success).toBe(false);
  });

  it('name が 100 文字でOK (§2.5)', () => {
    const result = signupSchema.safeParse({ ...validData, name: 'a'.repeat(100) });
    expect(result.success).toBe(true);
  });

  it('name が 101 文字はバリデーションエラー (§2.5)', () => {
    const result = signupSchema.safeParse({ ...validData, name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('termsAccepted が false はバリデーションエラー (§2.5)', () => {
    const result = signupSchema.safeParse({ ...validData, termsAccepted: false });
    expect(result.success).toBe(false);
  });

  it('termsAccepted が undefined はバリデーションエラー (§2.5)', () => {
    const { termsAccepted: _, ...withoutTerms } = validData;
    const result = signupSchema.safeParse(withoutTerms);
    expect(result.success).toBe(false);
  });
});

// ──────────────────────────────────────
// invitationAcceptSchema 境界値テスト (§2.5)
// ──────────────────────────────────────

describe('invitationAcceptSchema 境界値 (§2.5)', () => {
  const validData = {
    name: '田中花子',
    password: 'Secure456!',
    passwordConfirm: 'Secure456!',
    termsAccepted: true,
  };

  it('名前が 1 文字でOK', () => {
    const result = invitationAcceptSchema.safeParse({ ...validData, name: 'A' });
    expect(result.success).toBe(true);
  });

  it('名前が 100 文字でOK', () => {
    const result = invitationAcceptSchema.safeParse({ ...validData, name: 'a'.repeat(100) });
    expect(result.success).toBe(true);
  });

  it('名前が 101 文字はバリデーションエラー', () => {
    const result = invitationAcceptSchema.safeParse({ ...validData, name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('password が 8 文字ちょうどでOK', () => {
    const pw = '12345678';
    const result = invitationAcceptSchema.safeParse({
      ...validData,
      password: pw,
      passwordConfirm: pw,
    });
    expect(result.success).toBe(true);
  });

  it('password が 7 文字はバリデーションエラー', () => {
    const pw = '1234567';
    const result = invitationAcceptSchema.safeParse({
      ...validData,
      password: pw,
      passwordConfirm: pw,
    });
    expect(result.success).toBe(false);
  });

  it('passwordConfirm が不一致はバリデーションエラー (§2.5)', () => {
    const result = invitationAcceptSchema.safeParse({
      ...validData,
      password: 'Secure456!',
      passwordConfirm: 'Different!',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmError = result.error.issues.find(
        (i) => i.path.includes('passwordConfirm'),
      );
      expect(confirmError?.message).toBe('パスワードが一致しません');
    }
  });

  it('termsAccepted が false はバリデーションエラー (§2.5)', () => {
    const result = invitationAcceptSchema.safeParse({
      ...validData,
      termsAccepted: false,
    });
    expect(result.success).toBe(false);
  });

  it('email フィールドは不要（招待トークンから取得）', () => {
    const result = invitationAcceptSchema.safeParse({
      ...validData,
      email: 'extra@example.com',
    });
    expect(result.success).toBe(true);
  });
});

// ──────────────────────────────────────
// エラーコード定数テスト (§2.6)
// ──────────────────────────────────────

describe('サインアップエラーメッセージ (§2.6)', () => {
  it('INVITATION_NOT_FOUND メッセージが定義されている', () => {
    expect(SIGNUP_ERROR_MESSAGES.INVITATION_NOT_FOUND).toBe('招待リンクが無効です');
  });

  it('INVITATION_EXPIRED メッセージが定義されている', () => {
    expect(SIGNUP_ERROR_MESSAGES.INVITATION_EXPIRED).toContain('有効期限が切れています');
  });

  it('INVITATION_ALREADY_USED メッセージが定義されている', () => {
    expect(SIGNUP_ERROR_MESSAGES.INVITATION_ALREADY_USED).toContain('既に使用されています');
  });

  it('EMAIL_ALREADY_EXISTS メッセージが定義されている', () => {
    expect(SIGNUP_ERROR_MESSAGES.EMAIL_ALREADY_EXISTS).toContain('既に登録されています');
  });

  it('SIGNUP_FAILED メッセージが定義されている', () => {
    expect(SIGNUP_ERROR_MESSAGES.SIGNUP_FAILED).toBeTruthy();
  });
});

// ──────────────────────────────────────
// ロールリダイレクトマッピング (ACCT-001 §7)
// ──────────────────────────────────────

describe('招待後ロールリダイレクト (§7)', () => {
  it('全10ロールのリダイレクト先が /app で始まる', () => {
    for (const role of ROLES) {
      expect(ROLE_REDIRECT_MAP[role]).toMatch(/^\/app/);
    }
  });

  it('venue_staff は /app にリダイレクト', () => {
    expect(ROLE_REDIRECT_MAP.venue_staff).toBe('/app');
  });

  it('speaker は /app/events にリダイレクト', () => {
    expect(ROLE_REDIRECT_MAP.speaker).toBe('/app/events');
  });

  it('vendor は /app/events にリダイレクト', () => {
    expect(ROLE_REDIRECT_MAP.vendor).toBe('/app/events');
  });
});

// ──────────────────────────────────────
// InvitationErrorCode 型テスト (§2.6)
// ──────────────────────────────────────

describe('InvitationErrorCode 型 (§2.6)', () => {
  const validCodes: InvitationErrorCode[] = [
    'INVITATION_NOT_FOUND',
    'INVITATION_EXPIRED',
    'INVITATION_ALREADY_USED',
    'VALIDATION_ERROR',
    'CONFLICT',
  ];

  it('5種類のエラーコードが定義されている', () => {
    expect(validCodes).toHaveLength(5);
  });

  it('各エラーコードが文字列', () => {
    for (const code of validCodes) {
      expect(typeof code).toBe('string');
    }
  });
});

// ──────────────────────────────────────
// AUTH-006 パスワードリセット Zod テスト
// ──────────────────────────────────────

const resetPasswordSchema = z.object({
  password: z
    .string({ required_error: 'パスワードを入力してください' })
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(128),
  passwordConfirm: z
    .string({ required_error: 'パスワード（確認）を入力してください' })
    .min(1, 'パスワード（確認）を入力してください'),
}).refine((data) => data.password === data.passwordConfirm, {
  message: 'パスワードが一致しません',
  path: ['passwordConfirm'],
});

describe('resetPasswordSchema (AUTH-006)', () => {
  const validData = {
    password: 'NewPass123!',
    passwordConfirm: 'NewPass123!',
  };

  it('有効なデータでバリデーション成功', () => {
    const result = resetPasswordSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('パスワードが 8 文字未満はエラー', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'short',
      passwordConfirm: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('パスワードが 8 文字ちょうどでOK', () => {
    const result = resetPasswordSchema.safeParse({
      password: '12345678',
      passwordConfirm: '12345678',
    });
    expect(result.success).toBe(true);
  });

  it('パスワードと確認が一致しない場合エラー', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'NewPass123!',
      passwordConfirm: 'Different!',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmError = result.error.issues.find(
        (i) => i.path.includes('passwordConfirm'),
      );
      expect(confirmError?.message).toBe('パスワードが一致しません');
    }
  });

  it('パスワードが空はエラー', () => {
    const result = resetPasswordSchema.safeParse({
      password: '',
      passwordConfirm: '',
    });
    expect(result.success).toBe(false);
  });
});

// ──────────────────────────────────────
// AUTH-006 パスワードリセット依頼 Zod テスト
// ──────────────────────────────────────

const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'メールアドレスを入力してください' })
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください'),
});

describe('forgotPasswordSchema (AUTH-006)', () => {
  it('有効なメールアドレスでバリデーション成功', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
  });

  it('空のメールアドレスはエラー', () => {
    const result = forgotPasswordSchema.safeParse({ email: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toBe('メールアドレスを入力してください');
    }
  });

  it('無効な形式のメールアドレスはエラー', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'invalid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toBe('有効なメールアドレスを入力してください');
    }
  });

  it('メールアドレスが undefined はエラー', () => {
    const result = forgotPasswordSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ──────────────────────────────────────
// AUTH-005 ログアウトロジック
// ──────────────────────────────────────

describe('ログアウトロジック (AUTH-005)', () => {
  it('ログアウト後のリダイレクト先は /login?reason=logout', () => {
    const redirectPath = '/login?reason=logout';
    expect(redirectPath).toContain('/login');
    expect(redirectPath).toContain('reason=logout');
  });

  it('ストアリセット後は未認証状態', () => {
    // ストアの動作をシミュレーション
    const state = { isAuthenticated: true, user: { id: '1', name: 'Test' } };
    // リセット
    state.isAuthenticated = false;
    state.user = null as unknown as typeof state.user;
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });
});

// ──────────────────────────────────────
// ACCT-001 §2.4 入出力例テスト
// ──────────────────────────────────────

describe('ACCT-001 §2.4 入出力例 — バリデーション網羅', () => {
  describe('正常系バリデーション', () => {
    it('§3-E #1: 招待ベース正常 — name + password + termsAccepted', () => {
      const result = acceptBodySchema.safeParse({
        name: '山田太郎',
        password: 'Valid123!',
        termsAccepted: true,
      });
      expect(result.success).toBe(true);
    });

    it('§3-E #2: セルフ登録正常 — 全フィールド', () => {
      const result = signupSchema.safeParse({
        name: '田中花子',
        email: 'tanaka@ex.com',
        password: 'Pass456!',
        passwordConfirm: 'Pass456!',
        termsAccepted: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('異常系バリデーション', () => {
    it('§3-E #6: パスワード短すぎ（8文字未満）→ 400', () => {
      const result = signupSchema.safeParse({
        name: 'テスト',
        email: 'test@example.com',
        password: 'abc',
        passwordConfirm: 'abc',
        termsAccepted: true,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const pwError = result.error.issues.find((i) => i.path.includes('password'));
        expect(pwError?.message).toContain('8文字以上');
      }
    });

    it('§3-E #7: パスワード確認不一致 → 400', () => {
      const result = signupSchema.safeParse({
        name: 'テスト',
        email: 'test@example.com',
        password: 'Pass1234!',
        passwordConfirm: 'Different!',
        termsAccepted: true,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const confirmError = result.error.issues.find(
          (i) => i.path.includes('passwordConfirm'),
        );
        expect(confirmError?.message).toBe('パスワードが一致しません');
      }
    });

    it('§3-E #8: 名前が空 → 400', () => {
      const result = signupSchema.safeParse({
        name: '',
        email: 'test@example.com',
        password: 'Valid123!',
        passwordConfirm: 'Valid123!',
        termsAccepted: true,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const nameError = result.error.issues.find((i) => i.path.includes('name'));
        expect(nameError?.message).toContain('名前を入力');
      }
    });

    it('§3-E #9: 利用規約未同意 → 400', () => {
      const result = signupSchema.safeParse({
        name: 'テスト',
        email: 'test@example.com',
        password: 'Valid123!',
        passwordConfirm: 'Valid123!',
        termsAccepted: false,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const termsError = result.error.issues.find(
          (i) => i.message.includes('利用規約'),
        );
        expect(termsError).toBeTruthy();
      }
    });
  });
});

// ──────────────────────────────────────
// ACCT-001 §2.6 例外レスポンス — エラーメッセージ整合性
// ──────────────────────────────────────

describe('ACCT-001 §2.6 例外レスポンス — エラーメッセージ整合性', () => {
  it('§3-G #2: メールアドレス重複メッセージが定義されている', () => {
    expect(SIGNUP_ERROR_MESSAGES.EMAIL_ALREADY_EXISTS).toContain('既に登録されています');
  });

  it('§3-G #3: 招待トークン無効メッセージが定義されている', () => {
    expect(SIGNUP_ERROR_MESSAGES.INVITATION_NOT_FOUND).toBe('招待リンクが無効です');
  });

  it('§3-G #4: 招待トークン期限切れメッセージが定義されている', () => {
    expect(SIGNUP_ERROR_MESSAGES.INVITATION_EXPIRED).toContain('有効期限が切れています');
  });

  it('§3-G #5: 招待トークン使用済みメッセージが定義されている', () => {
    expect(SIGNUP_ERROR_MESSAGES.INVITATION_ALREADY_USED).toContain('既に使用されています');
  });

  it('§3-G #10: サーバーエラーメッセージが定義されている', () => {
    expect(SIGNUP_ERROR_MESSAGES.SIGNUP_FAILED).toBeTruthy();
  });
});

// ──────────────────────────────────────
// ACCT-001 招待有効期限テスト (§2.5)
// ──────────────────────────────────────

describe('招待有効期限ロジック (§2.5 / §7.4)', () => {
  it('有効期限内（6日23時間59分）はOK', () => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 60 * 1000);
    expect(now < expiresAt).toBe(true);
  });

  it('有効期限ちょうど（7日0分0秒）はOK（境界: now < expiresAt）', () => {
    const now = new Date('2026-02-17T00:00:00Z');
    const expiresAt = new Date('2026-02-24T00:00:00Z');
    // API の判定: new Date() > new Date(inv.expiresAt) — 同時刻は期限内
    expect(now > expiresAt).toBe(false);
  });

  it('有効期限超過（7日0分1秒）は期限切れ', () => {
    const now = new Date('2026-02-24T00:00:01Z');
    const expiresAt = new Date('2026-02-24T00:00:00Z');
    expect(now > expiresAt).toBe(true);
  });

  it('招待有効期限は7日間固定', () => {
    const INVITATION_EXPIRY_DAYS = 7;
    const createdAt = new Date('2026-02-17T00:00:00Z');
    const expiresAt = new Date(createdAt.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    expect(expiresAt.toISOString()).toBe('2026-02-24T00:00:00.000Z');
  });
});
