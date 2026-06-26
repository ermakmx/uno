import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  maxFailures: 2,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  webServer: [
    {
      command: 'pnpm --filter @uno/server dev',
      port: 3000,
      timeout: 10000,
      reuseExistingServer: true,
    },
    {
      command: 'pnpm --filter @uno/client dev',
      port: 5173,
      timeout: 20000,
      reuseExistingServer: true,
    },
  ],
})
