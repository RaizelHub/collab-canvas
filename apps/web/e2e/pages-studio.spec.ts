import { expect, test } from "@playwright/test";
test.setTimeout(90000);
test.use({ channel: process.env.E2E_BROWSER_CHANNEL });
test("studio generates paginated output and downloadable DOCX", async ({
  page,
}) => {
  await page.goto("/e2e/fixtures/pages-studio.html", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("textbox", { name: "Manuscript text" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Check print layout" }).click();
  await expect(page.locator(".pages-print-header strong")).toHaveText(
    "Print layout · 14 pages",
    { timeout: 60000 },
  );
  const frame = page.frameLocator("iframe");
  await expect(frame.locator(".pagedjs_page")).toHaveCount(14);
  expect(
    await frame.locator(".pagedjs_margin-bottom-center").allTextContents(),
  ).toEqual([
    "i",
    "ii",
    "iii",
    "iv",
    "v",
    "vi",
    "vii",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
  ]);
  await expect(
    frame.locator('.pagedjs_pages [data-toc-target="section-7"]'),
  ).toHaveText("1");
  await page.getByRole("button", { name: "Back to writing" }).click();
  await page.locator(".pages-export summary").click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download DOCX" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("Export validation.docx");
  expect(await download.failure()).toBeNull();
});
test("browser autosave survives reopening and recovery creates a new draft", async ({
  page,
}) => {
  await page.goto("/e2e/fixtures/pages-studio.html", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("textbox", { name: "Manuscript text" }),
  ).toBeVisible();
  const result = await page.evaluate(async () => {
    const { repo, state, Y } = Reflect.get(window, "validationTools");
    const user = "isolated-test-account";
    const id = await repo.createDocument(user, "Recovery test", "blank", true);
    let session = await repo.openDocument(id, user, () => {});
    session.doc.getMap("meta").set("title", "Saved title");
    await session.flush();
    const update = state.encodeUpdate(Y.encodeStateAsUpdate(session.doc));
    await session.close();
    session = await repo.openDocument(id, user, () => {});
    const title = session.doc.getMap("meta").get("title");
    await session.close();
    const restoredId = await repo.importRecovery(
      user,
      new File([JSON.stringify({ version: 1, update })], "backup.json"),
    );
    session = await repo.openDocument(restoredId, user, () => {});
    const restoredTitle = session.doc.getMap("meta").get("title");
    await session.close();
    return { title, restoredTitle, newDraft: restoredId !== id };
  });
  expect(result).toEqual({
    title: "Saved title",
    restoredTitle: "Saved title",
    newDraft: true,
  });
});
