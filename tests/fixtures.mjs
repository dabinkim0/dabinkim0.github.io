import { test as base, expect } from "@playwright/test";

// Third-party analytics is irrelevant to these checks, and a slow Cloudflare
// response blocks the page's load event (and every page.goto) for 30s+.
export const blockAnalytics = (context) => (
    context.route(/^https:\/\/(static\.)?cloudflareinsights\.com\//, (route) => route.abort())
);

export const test = base.extend({
    context: async ({ context }, use) => {
        await blockAnalytics(context);
        await use(context);
    }
});

export { expect };
