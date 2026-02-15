// Named auth middleware for non-global route protection
// Pages under /events/ and /reports/ reference this middleware via definePageMeta
// The global auth middleware (auth.global.ts) only protects /app/* routes

interface SessionResponse {
  session: { userId: string } | null
  user: { id: string; name: string; email: string } | null
}

export default defineNuxtRouteMiddleware(async (to) => {
  const headers = import.meta.server
    ? useRequestHeaders(['cookie'])
    : undefined

  let isAuthenticated = false
  try {
    const session = await $fetch<SessionResponse>('/api/auth/get-session', {
      headers,
    })
    isAuthenticated = !!session?.user
  } catch {
    isAuthenticated = false
  }

  if (!isAuthenticated) {
    return navigateTo({
      path: '/login',
      query: { next: to.fullPath },
    })
  }
})
