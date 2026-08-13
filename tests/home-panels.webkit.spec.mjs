import { expect, test } from "@playwright/test";

for (const panel of ["recent-news", "background"]) {
    test(`${panel} rows keep content-aligned rules in WebKit`, async ({ page }) => {
        await page.setViewportSize({ width: 1180, height: 900 });
        await page.goto("/");
        await page.evaluate(() => document.fonts.ready);
        await page.locator(`[data-collapsible="${panel}"] .news-toggle`).click();
        await page.waitForTimeout(600);

        const rowGaps = await page.locator(`[data-collapsible="${panel}"] .entry-item`).evaluateAll((items) => (
            items.map((item) => {
                const title = item.querySelector(".entry-title").getBoundingClientRect();
                const meta = item.querySelector(".entry-meta").getBoundingClientRect();
                const row = item.getBoundingClientRect();
                const style = getComputedStyle(item);

                return {
                    actual: row.bottom - Math.max(title.bottom, meta.bottom),
                    expected: parseFloat(style.paddingBottom) + parseFloat(style.borderBottomWidth)
                };
            })
        ));

        for (const gap of rowGaps) {
            expect(Math.abs(gap.actual - gap.expected)).toBeLessThan(0.75);
        }
    });
}
