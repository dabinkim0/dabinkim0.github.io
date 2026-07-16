import { expect, test } from "@playwright/test";

for (const width of [390, 1180]) {
    test(`home panels at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        await page.goto("/");

        const news = page.locator('[data-collapsible="recent-news"]');
        const background = page.locator('[data-collapsible="background"]');
        const newsToggle = news.locator(".news-toggle");
        const backgroundToggle = background.locator(".news-toggle");

        await expect(news).toHaveClass(/is-collapsed/);
        await expect(background).toHaveClass(/is-collapsed/);
        await expect(page).toHaveScreenshot(`home-panels-closed-${width}.png`, { animations: "disabled" });

        await newsToggle.click();
        await expect(newsToggle).toHaveAttribute("aria-expanded", "true");
        await expect(backgroundToggle).toHaveAttribute("aria-expanded", "false");
        await expect(page).toHaveScreenshot(`home-panels-news-${width}.png`, { animations: "disabled" });

        await backgroundToggle.click();
        await expect(newsToggle).toHaveAttribute("aria-expanded", "false");
        await expect(backgroundToggle).toHaveAttribute("aria-expanded", "true");
        await expect(page).toHaveScreenshot(`home-panels-background-${width}.png`, { animations: "disabled" });
    });
}
