import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  use: { baseURL: "http://localhost:4012", headless: true },
  webServer: [
    {
      command: "node scripts/dev-server.mjs 4012",
      url: "http://localhost:4012",
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: "npm run build && node scripts/preview-server.mjs 4013",
      url: "http://localhost:4013",
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: "node tests/fixtures/server.mjs",
      url: "http://localhost:4010/api/health",
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
  reporter: "list",
});
