import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures.mjs";

const pages = ["/", "/publications/", "/projects/", "/publications/adatt/", "/publications/ddsp-carsound/", "/404.html"];
const wcag = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const formatViolations = (violations) => violations.map((violation) => (
    `${violation.impact} ${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`
));

for (const path of pages) {
    test(`${path} has no WCAG 2.1 AA violations`, async ({ page }) => {
        await page.goto(path);
        const results = await new AxeBuilder({ page }).withTags(wcag).analyze();
        expect(formatViolations(results.violations)).toEqual([]);
    });
}

test("home panels stay accessible in every state", async ({ page }) => {
    await page.goto("/");
    // The page-level test covers the initial state (both closed); check each panel open.
    for (const panel of ["recent-news", "background"]) {
        const toggle = page.locator(`[data-collapsible="${panel}"] .news-toggle`);
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        // Header colors fade over 240ms; scan the settled state, not a mid-transition frame.
        await page.evaluate(() => Promise.all(document.getAnimations()
            .filter((animation) => animation instanceof CSSTransition)
            .map((animation) => animation.finished)));
        const results = await new AxeBuilder({ page }).withTags(wcag).include(".news-panel-grid").analyze();
        expect(formatViolations(results.violations)).toEqual([]);
    }
});

test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("home panels show their content", async ({ page }) => {
        await page.goto("/");

        for (const list of ["#recent-news-list", "#background-list"]) {
            await expect(page.locator(`${list} .entry-item`).first()).toBeVisible();
        }
    });
});
