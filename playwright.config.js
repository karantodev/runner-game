import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080';
const webServerCommand = process.env.PLAYWRIGHT_WEB_SERVER_COMMAND || 'node server.mjs';

export default defineConfig({
  testDir: './tests',
  // v4.4 — 30s → 90s. Cold asset-load/boot (~150 PNGs, see asset-forensics doc)
  // takes ~28s in headless, so multi-reload specs (seeded run, composition) ran
  // right at the 30s edge and timed out flakily. 90s gives boot + the input
  // sequence real headroom. Shrinks back naturally once the oversized-PNG
  // re-export (designer Batch 1-3) cuts the 204 MiB asset payload.
  timeout: 90000,
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
