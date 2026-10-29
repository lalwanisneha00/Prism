import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

/*
 * Syllabus fix, Phase 8: a lab lesson with the coil simulation (Applied Physics, experiment 4:
 * magnetic field along the axis of a coil). Fake AI, phone profile (375px, touch screen): moving
 * the coil changes the field at the probe, a second coil changes it too, and nothing sticks out
 * sideways. The sliders are set by value; a real finger drag is still worth one check on a phone.
 */

const LAB =
  "/lab/pdeu-applied-physics-laboratory-ece/experiment-4-to-study-the-magnetic-field-along-the-axis-of-a";

async function fieldAtProbe(page: import("@playwright/test").Page): Promise<string> {
  return (
    await page.locator("dt", { hasText: "B at the probe" }).locator("+ dd").innerText()
  ).trim();
}

async function setSlider(page: import("@playwright/test").Page, name: RegExp, value: number) {
  const slider = page.getByRole("slider", { name });
  await slider.evaluate((el, v) => {
    const input = el as HTMLInputElement;
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    set.call(input, String(v));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

test("coil simulation: move one coil, then two coils, on the lab page", async ({ page }) => {
  await page.goto(LAB);
  await expect(page.getByRole("heading", { name: /Interactive simulation/i })).toBeVisible({
    timeout: 60_000,
  });
  const probe = page.getByRole("slider", { name: /Probe position/ });
  await probe.scrollIntoViewIfNeeded();
  await expect(probe).toBeVisible();

  // One coil: moving it away from the probe weakens the field there.
  await setSlider(page, /Probe position/, 0);
  await setSlider(page, /^Coil position/, 0);
  const near = await fieldAtProbe(page);
  await setSlider(page, /^Coil position/, 10);
  const far = await fieldAtProbe(page);
  expect(far).not.toBe(near);

  // Two coils: the second coil's slider appears and changes the reading too.
  await page.getByRole("button", { name: "Add a second coil" }).click();
  const coil2 = page.getByRole("slider", { name: /Coil 2 position/ });
  await expect(coil2).toBeVisible();
  const before = await fieldAtProbe(page);
  await setSlider(page, /Coil 2 position/, 2);
  expect(await fieldAtProbe(page)).not.toBe(before);

  await expectNoSidewaysScroll(page);
});
