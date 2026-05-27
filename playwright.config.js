import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080';
const webServerCommand = process.env.PLAYWRIGHT_WEB_SERVER_COMMAND || 'node server.mjs';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL,
    headless: true,
  },
  webServer: {
    command: webServerCommand,
    url: `${baseURL}/`,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
