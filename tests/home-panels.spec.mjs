import { expect, test } from "@playwright/test";

for (const width of [390, 1180]) {
    test(`home panels at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        await page.goto("/");

        const news = page.locator('[data-collapsible="recent-news"]');
        const background = page.locator('[data-collapsible="background"]');
        const newsToggle = news.locator(".news-toggle");
        const backgroundToggle = background.locator(".news-toggle");

        // Recent News starts open so the latest updates are visible without a click.
        await expect(news).not.toHaveClass(/is-collapsed/);
        await expect(background).toHaveClass(/is-collapsed/);
        await expect(newsToggle).toHaveAttribute("aria-expanded", "true");
        await expect(backgroundToggle).toHaveAttribute("aria-expanded", "false");
        await expect(page).toHaveScreenshot(`home-panels-news-${width}.png`, { animations: "disabled" });

        await backgroundToggle.click();
        await expect(newsToggle).toHaveAttribute("aria-expanded", "false");
        await expect(backgroundToggle).toHaveAttribute("aria-expanded", "true");
        await expect(page).toHaveScreenshot(`home-panels-background-${width}.png`, { animations: "disabled" });

        await backgroundToggle.click();
        await expect(news).toHaveClass(/is-collapsed/);
        await expect(background).toHaveClass(/is-collapsed/);
        await expect(page).toHaveScreenshot(`home-panels-closed-${width}.png`, { animations: "disabled" });
    });
}

test.describe("moving statement", () => {
    test("pause toggle stops and restarts the marquee", async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await page.goto("/");
        const toggle = page.locator(".statement-toggle");
        const track = page.locator(".statement-track");

        await expect(toggle).toBeVisible();
        await expect(toggle).toHaveAttribute("aria-pressed", "false");
        await expect(track).toHaveCSS("animation-play-state", "running");

        await toggle.click();
        await page.mouse.move(0, 0);
        await expect(toggle).toHaveAttribute("aria-pressed", "true");
        await expect(track).toHaveCSS("animation-play-state", "paused");

        await toggle.click();
        await page.mouse.move(0, 0);
        await expect(toggle).toHaveAttribute("aria-pressed", "false");
        await expect(track).toHaveCSS("animation-play-state", "running");
    });
});

test("reduced motion shows the statement statically without a toggle", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(".statement-toggle")).toBeHidden();
    await expect(page.locator(".statement-track")).toHaveCSS("animation-name", "none");
});
