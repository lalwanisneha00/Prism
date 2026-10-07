import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

test("a chapter lesson is built topic by topic and resumes after a reload", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto(
    "/chapter?subject=pdeu-applied-physics&chapter=electricity-and-magnetism&topics=vector-potential,ohms-law,faradays-law&level=first-encounter&minutes=30",
  );
  await expect(page.getByTestId("plan-list").getByRole("listitem")).toHaveCount(3);
  await page.getByRole("link", { name: /Start the lesson/ }).click();
  await expect(page).toHaveURL(/\/chapter\/lesson\?/, { timeout: 60_000 });

  // The introduction (the "glue") comes first; topics follow one at a time.
  await expect(page.getByTestId("chapter-intro")).toBeVisible({ timeout: 60_000 });
  const topics = page.getByTestId("chapter-topic");
  await expect(topics).toHaveCount(3);
  await expect(
    topics.first().getByRole("link", { name: /Open this topic as its own lesson/ }),
  ).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.getByTestId("chapter-wrap")).toBeVisible({ timeout: 150_000 });
  await expect(page.getByText(/test bridge/).first()).toBeVisible();
  await expectNoSidewaysScroll(page);

  // Everything was saved on this device: a reload shows it at once, nothing is rebuilt.
  await page.reload();
  await expect(page.getByTestId("chapter-wrap")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("build-progress")).toHaveCount(0);
  await expect(page.getByText("Waiting its turn…")).toHaveCount(0);
});

test("a broken chapter lesson link explains itself", async ({ page }) => {
  await page.goto(
    "/chapter/lesson?subject=pdeu-applied-physics&chapter=nowhere&level=first-encounter&minutes=30",
  );
  await expect(page.getByRole("heading", { name: /can't be opened/ })).toBeVisible();
});
