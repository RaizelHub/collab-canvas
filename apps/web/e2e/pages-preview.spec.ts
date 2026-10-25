import { expect, test } from "@playwright/test";
if (process.env.E2E_BROWSER_CHANNEL)
  test.use({ channel: process.env.E2E_BROWSER_CHANNEL });
test.setTimeout(90000);
test("Pages demo edits, navigates, resets and stays isolated", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (/manuscript|socket-ticket|\/connect\//.test(request.url()))
      calls.push(request.url());
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Pages", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "Manuscript text" });
  await expect(editor).toBeVisible();
  await editor.press("Control+Home");
  await editor.press("End");
  await page.keyboard.type(" Temporary edit");
  await expect(editor).toContainText("Temporary edit");
  await page.getByRole("button", { name: "Toggle chapter navigator" }).click();
  await page
    .getByRole("navigation")
    .filter({
      has: page.getByRole("button", {
        name: "Chapter 1: Introduction",
        exact: true,
      }),
    })
    .getByRole("button", { name: "Chapter 1: Introduction", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Paragraph style" })
    .selectOption("2");
  await expect(editor.locator("h2")).toContainText("Chapter 1: Introduction");
  await expect(
    page.getByRole("link", { name: "Create Thesis Document" }),
  ).toHaveAttribute("href", "/pages");
  await page.getByRole("button", { name: "Reset Pages demo" }).click();
  await expect(editor).not.toContainText("Temporary edit");
  await expect(
    editor.locator("h1").filter({ hasText: "Chapter 1: Introduction" }),
  ).toHaveCount(1);
  expect(calls).toEqual([]);
  await page.getByRole("button", { name: "Whiteboard", exact: true }).click();
  await expect(page.getByRole("button", { name: "Reset demo" })).toBeVisible();
});
test("Pages demo stays usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Pages", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "Manuscript text" });
  await expect(editor).toBeVisible();
  await editor.press("Control+Home");
  await page.keyboard.type("Mobile ");
  await expect(editor).toContainText("Mobile");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Pages", exact: true }).click();
  await expect(editor).not.toContainText("Mobile");
});
