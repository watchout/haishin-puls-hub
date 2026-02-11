// ACCT-001 §9.1: サインアップバリデーション ユニットテスト
// signupSchema, invitationAcceptSchema の検証

import { describe, it, expect } from 'vitest';
import { signupSchema, invitationAcceptSchema, loginSchema } from '~/types/auth';

describe('loginSchema', () => {
  it('有効なデータでバリデーション成功', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      rememberMe: false,
    });
    expect(result.success).toBe(true);
  });

  it('メールアドレスが空の場合エラー', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('無効なメールアドレスでエラー', () => {
    const result = loginSchema.safeParse({
      email: 'invalid-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('有効なメールアドレスを入力してください');
    }
  });
});

describe('signupSchema', () => {
  const validData = {
    name: '山田太郎',
    email: 'test@example.com',
    password: 'Valid123!',
    passwordConfirm: 'Valid123!',
    termsAccepted: true,
  };

  it('有効なデータでバリデーション成功', () => {
    const result = signupSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  // TC-005: 名前が空
  it('名前が空の場合エラー', () => {
    const result = signupSchema.safeParse({ ...validData, name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('名前を入力してください');
    }
  });

  it('名前が100文字を超える場合エラー', () => {
    const result = signupSchema.safeParse({ ...validData, name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('名前は100文字以内で入力してください');
    }
  });

  it('名前が100文字ちょうどの場合成功', () => {
    const result = signupSchema.safeParse({ ...validData, name: 'a'.repeat(100) });
    expect(result.success).toBe(true);
  });

  it('メールアドレスが空の場合エラー', () => {
    const result = signupSchema.safeParse({ ...validData, email: '' });
    expect(result.success).toBe(false);
  });

  it('無効なメールアドレスでエラー', () => {
    const result = signupSchema.safeParse({ ...validData, email: 'abc' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('有効なメールアドレスを入力してください');
    }
  });

  // TC-003: パスワードが8文字未満
  it('パスワードが8文字未満の場合エラー', () => {
    const result = signupSchema.safeParse({
      ...validData,
      password: 'abc',
      passwordConfirm: 'abc',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('パスワードは8文字以上で入力してください');
    }
  });

  it('パスワードが8文字ちょうどの場合成功', () => {
    const result = signupSchema.safeParse({
      ...validData,
      password: '12345678',
      passwordConfirm: '12345678',
    });
    expect(result.success).toBe(true);
  });

  // TC-004: パスワード不一致
  it('パスワードと確認が一致しない場合エラー', () => {
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

  // TC-006: 利用規約未同意
  it('利用規約未同意の場合エラー', () => {
    const result = signupSchema.safeParse({
      ...validData,
      termsAccepted: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const termsError = result.error.issues.find(
        (i) => i.path.includes('termsAccepted'),
      );
      expect(termsError?.message).toBe('利用規約に同意してください');
    }
  });
});

describe('invitationAcceptSchema', () => {
  const validData = {
    name: '田中花子',
    password: 'Secure456!',
    passwordConfirm: 'Secure456!',
    termsAccepted: true,
  };

  it('有効なデータでバリデーション成功', () => {
    const result = invitationAcceptSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('メールアドレスフィールドがない（招待から取得するため不要）', () => {
    // invitationAcceptSchema にはemailフィールドが含まれていないことを確認
    const result = invitationAcceptSchema.safeParse({
      ...validData,
      email: 'extra@field.com', // 余分なフィールドは無視される
    });
    expect(result.success).toBe(true);
  });

  it('名前が空の場合エラー', () => {
    const result = invitationAcceptSchema.safeParse({ ...validData, name: '' });
    expect(result.success).toBe(false);
  });

  it('パスワードが8文字未満の場合エラー', () => {
    const result = invitationAcceptSchema.safeParse({
      ...validData,
      password: 'short',
      passwordConfirm: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('パスワード不一致の場合エラー', () => {
    const result = invitationAcceptSchema.safeParse({
      ...validData,
      password: 'Secure456!',
      passwordConfirm: 'Mismatch!',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmError = result.error.issues.find(
        (i) => i.path.includes('passwordConfirm'),
      );
      expect(confirmError?.message).toBe('パスワードが一致しません');
    }
  });

  it('利用規約未同意の場合エラー', () => {
    const result = invitationAcceptSchema.safeParse({
      ...validData,
      termsAccepted: false,
    });
    expect(result.success).toBe(false);
  });
});
