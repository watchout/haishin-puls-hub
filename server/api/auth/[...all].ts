// Better Auth キャッチオール API ハンドラ
// Better Auth の全エンドポイントを自動提供
// sign-in, sign-up, sign-out, session, callback 等

import { auth } from '~/server/utils/auth';

export default defineEventHandler((event) => {
  return auth.handler(toWebRequest(event));
});
