import { expect, test } from "@playwright/test";

const widths = [390, 720, 920, 1180];
const views = ["list", "grid", "grid-compact"];
const archives = [
    {
        name: "projects",
        path: "/projects/",
        list: "#project-archive",
        card: ".project-entry",
        media: ".archive-card__media",
        copy: ".archive-card__copy",
        meta: ".archive-card__meta"
    },
    {
        name: "publications",
        path: "/publications/",
        list: "#publication-archive",
        card: ".publication-item",
        media: ".archive-card__media",
        copy: ".archive-card__copy"
    }
];

const expectedColumns = (view, width) => {
    if (view === "list" || width <= 720) {
        return 1;
    }

    if (view === "grid-compact" && width > 920) {
        return 3;
    }

    return 2;
};

const waitForFirstImage = async (card) => {
    const image = card.locator("img").first();
    if (await image.count()) {
        await image.evaluate((element) => element.decode?.().catch(() => undefined));
    }
};

for (const archive of archives) {
    for (const width of widths) {
        for (const view of views) {
            test(`${archive.name} ${view} at ${width}px`, async ({ page }) => {
                await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
                await page.goto(archive.path);
                await page.locator(`[data-archive-view-option="${view}"]`).click();

                const list = page.locator(archive.list);
                const card = list.locator(archive.card).first();
                await expect(list).toHaveAttribute("data-view", view);
                await expect(page.locator(`[data-archive-view-option="${view}"]`)).toHaveAttribute("aria-pressed", "true");

                const columns = await list.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
                expect(columns).toBe(expectedColumns(view, width));

                const cardOrders = await list.locator(archive.card).evaluateAll((cards) => cards.map((element) => (
                    Array.from(element.children).map((child) => child.className)
                )));
                cardOrders.forEach((childOrder) => {
                    expect(childOrder[0]).toContain("archive-card__media");
                    expect(childOrder[1]).toContain("archive-card__copy");
                    if (archive.meta) {
                        expect(childOrder[2]).toContain("archive-card__meta");
                    }
                });

                const hasHorizontalOverflow = await page.evaluate(() => (
                    document.documentElement.scrollWidth > window.innerWidth + 1
                ));
                expect(hasHorizontalOverflow).toBe(false);

                if (width <= 720) {
                    const mediaBox = await card.locator(archive.media).boundingBox();
                    const copyBox = await card.locator(archive.copy).boundingBox();
                    expect(mediaBox.y).toBeLessThan(copyBox.y);

                    if (archive.meta) {
                        const metaBox = await card.locator(archive.meta).boundingBox();
                        expect(copyBox.y).toBeLessThan(metaBox.y);
                    }
                }

                await waitForFirstImage(card);
                await expect(page).toHaveScreenshot(`${archive.name}-${view}-${width}.png`, {
                    animations: "disabled",
                    fullPage: false
                });
            });
        }
    }
}
