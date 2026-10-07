import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

test.describe("Your API keys (Feature A)", () => {
  test("save, test, use and remove a key; it goes only to our lesson route", async ({ page }) => {
    await page.goto("/settings/keys");
    await expect(page.getByRole("heading", { name: "Add your API key" })).toBeVisible();
    await expect(page.getByText(/not.*an API key/i).first()).toBeVisible();
    await expect(page.getByTestId("key-indicator")).toContainText("Prism's shared key");
    await expectNoSidewaysScroll(page);

    const card = page.getByTestId("key-card-openai");
    await expect(card.getByRole("link", { name: /Get a OpenAI key/ })).toHaveAttribute(
      "href",
      /platform\.openai\.com/,
    );
    await card.getByLabel("Paste your key").fill("sk-bad-key-123456789");
    await card.getByRole("button", { name: "Test key" }).click();
    await expect(card.getByText(/rejected this key/)).toBeVisible();

    await card.getByLabel("Paste your key").fill("sk-good-key-123456789");
    await card.getByRole("button", { name: "Test key" }).click();
    await expect(card.getByText("This key works.")).toBeVisible();
    await card.getByRole("button", { name: "Save key" }).click();
    await expect(card.getByText(/in use/)).toBeVisible();
    await expect(page.getByTestId("key-indicator")).toContainText("your OpenAI key");
    // Only the end of the key is ever shown again.
    await expect(card).not.toContainText("sk-good-key");

    // The lesson request carries the key in headers (nowhere else on the page).
    let header: string | undefined;
    await page.route("**/api/lesson", async (route) => {
      header = route.request().headers()["x-prism-provider"];
      await route.continue();
    });
    await page.goto(
      "/lesson?subject=pdeu-applied-physics&chapter=electricity-and-magnetism&topic=faradays-law&level=first-encounter&duration=10",
    );
    await expect(page.getByTestId("using-key")).toContainText("your OpenAI key");
    await expect.poll(() => header).toBe("openai");

    await page.goto("/settings/keys");
    await page.getByTestId("key-card-openai").getByRole("button", { name: "Remove key" }).click();
    await expect(page.getByTestId("key-indicator")).toContainText("Prism's shared key");
  });
});
