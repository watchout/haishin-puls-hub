// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  future: {
    compatibilityVersion: 4,
  },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxt/eslint',
  ],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // サーバーのみ（秘密鍵）
    betterAuthSecret: '',
    betterAuthUrl: '',
    databaseUrl: '',
    anthropicApiKey: '',
    openaiApiKey: '',
    resendApiKey: '',

    // クライアント公開
    public: {
      appName: 'Haishin+ HUB',
      supportEmail: '',
    },
  },

  devServer: {
    port: 4300,
  },

  devtools: { enabled: true },
});
