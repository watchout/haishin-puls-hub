// CRUD-001-004 クライアント側エラーハンドリング
// 仕様書: docs/design/features/common/CRUD-001-004_crud-operations.md §9.1
//
// 全CRUD操作で統一されたエラーハンドリングを提供

import { TOAST_CONFIG, ERROR_MESSAGES } from '~/types/crud';
import type { CrudErrorCode } from '~/types/crud';

/** HTTPステータスコード→CrudErrorCode変換 */
function statusToErrorCode(statusCode: number): CrudErrorCode {
  const map: Record<number, CrudErrorCode> = {
    400: 'VALIDATION_ERROR',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    500: 'INTERNAL_ERROR',
  };
  return map[statusCode] ?? 'INTERNAL_ERROR';
}

export interface ApiError {
  statusCode?: number;
  message?: string;
  data?: {
    errors?: Record<string, string[]>;
    serverUpdatedAt?: string;
  };
}

export const useErrorHandler = () => {
  const toast = useToast();

  /**
   * APIエラーを統一的にハンドリング
   * - バリデーションエラー(400): フィールドエラー表示
   * - 認証エラー(401): ログイン画面へリダイレクト
   * - 権限エラー(403): 権限不足メッセージ
   * - 404: リソースなしメッセージ
   * - 競合エラー(409): リロード提案（10秒表示）
   * - その他: 汎用エラー
   */
  const handleError = (error: ApiError, context?: string): void => {
    const statusCode = error.statusCode ?? 500;
    const errorCode = statusToErrorCode(statusCode);
    const defaultMessage = ERROR_MESSAGES[errorCode];

    // 401: ログイン画面へリダイレクト
    if (statusCode === 401) {
      toast.add({
        title: '認証エラー',
        description: 'ログインしてください',
        ...TOAST_CONFIG.error,
      });
      navigateTo('/login');
      return;
    }

    // 409: 競合エラー（リロード提案、10秒表示）
    if (statusCode === 409) {
      toast.add({
        title: '競合エラー',
        description: defaultMessage,
        color: TOAST_CONFIG.error.color,
        timeout: 10000,
      });
      return;
    }

    // その他のエラー
    const description = context
      ? `${context}: ${error.message ?? defaultMessage}`
      : (error.message ?? defaultMessage);

    toast.add({
      title: statusCode === 400 ? 'バリデーションエラー' : 'エラーが発生しました',
      description,
      ...TOAST_CONFIG.error,
    });
  };

  /**
   * フィールドレベルのバリデーションエラーを取得
   */
  const getFieldErrors = (error: ApiError): Record<string, string[]> => {
    return error.data?.errors ?? {};
  };

  return { handleError, getFieldErrors };
};
