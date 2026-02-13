// Named auth middleware for non-global route protection
// Pages under /events/ and /reports/ reference this middleware via definePageMeta
// The global auth middleware (auth.global.ts) only protects /app/* routes

import { authClient } from '~/lib/auth-client'

export default defineNuxtRouteMiddleware(async (to) => {
  const { data: session } = await authClient.useSession(useFetch)
  const isAuthenticated = !!session.value?.user

  if (!isAuthenticated) {
    return navigateTo({
      path: '/login',
      query: { next: to.fullPath },
    })
  }
})
