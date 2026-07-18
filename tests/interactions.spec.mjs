import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "no-preference" });

test("inactive archive controls use restrained pointer motion", async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 900 });
    await page.goto("/projects/");

    const inactiveView = page.locator('[data-archive-view-option="list"]');
    await inactiveView.hover();
    await expect.poll(() => inactiveView.evaluate((element) => (
        new DOMMatrixReadOnly(getComputedStyle(element).transform).m42
    ))).toBeLessThan(-0.95);

    const hoverState = await inactiveView.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
            translationY: new DOMMatrixReadOnly(style.transform).m42,
            shadow: style.boxShadow
        };
    });
    expect(hoverState.translationY).toBeCloseTo(-1, 1);
    expect(hoverState.shadow).not.toBe("none");

    const activeView = page.locator('[data-archive-view-option="grid-compact"]');
    await activeView.hover();
    await expect(activeView).toHaveCSS("transform", "none");
    await expect(activeView).toHaveCSS("box-shadow", "none");
});

test("reduced motion removes archive control translation", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.setViewportSize({ width: 1180, height: 900 });
    await page.goto("/publications/");

    const inactiveView = page.locator('[data-archive-view-option="list"]');
    await inactiveView.hover();
    await expect(inactiveView).toHaveCSS("transform", "none");

    await context.close();
});

test("publication titles use the accent color on hover", async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 900 });
    await page.goto("/publications/");

    const title = page.locator(".publication-copy h3 a:not(.disabled-link)").first();
    await expect(title).toBeVisible();
    await title.hover();
    await expect(title).toHaveCSS("color", "rgb(36, 79, 74)");
});
