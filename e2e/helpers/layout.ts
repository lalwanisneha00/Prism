import { expect, type Page } from "@playwright/test";

/** Fails when the page scrolls sideways (the 375px rule: nothing may stick out). */
export async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}
