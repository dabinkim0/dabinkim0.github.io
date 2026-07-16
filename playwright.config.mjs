import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
    snapshotPathTemplate: "{testDir}/__screenshots__/{testFileName}/{arg}{ext}",
    expect: {
        toHaveScreenshot: {
            maxDiffPixelRatio: 0.01,
            threshold: 0.2
        }
    },
    use: {
        baseURL: "http://127.0.0.1:4173",
        colorScheme: "light",
        locale: "en-US",
        reducedMotion: "reduce",
        screenshot: "only-on-failure",
        trace: "retain-on-failure"
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] }
        }
    ],
    webServer: {
        command: "python3 -m http.server 4173 --bind 127.0.0.1",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: !process.env.CI,
        timeout: 30_000
    }
});
