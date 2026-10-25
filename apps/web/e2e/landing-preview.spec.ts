import { expect, test } from "@playwright/test";

// Optional installed browser channel for local runs; CI uses bundled Chromium.
test.setTimeout(60000);
test.use({ channel: process.env.E2E_BROWSER_CHANNEL });

test("preview supports editing, dragging, drawing, zoom and a complete reset without board traffic", async ({
  page,
}) => {
  const boardRequests: string[] = [];
  page.on("request", (request) => {
    if (
      /\/(socket-ticket|connect|health|rest\/v1\/boards)(\/|\?|$)/.test(
        new URL(request.url()).pathname,
      )
    )
      boardRequests.push(request.url());
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Think it. Sketch it.Build it together.",
  );
  await expect(
    page.getByRole("link", { name: "Start Your Own Board" }).first(),
  ).toHaveAttribute("href", "/register");
  const canvas = page.getByTestId("landing-live-canvas");
  await expect(canvas.locator(".tl-note__container")).toHaveCount(3);
  await canvas.scrollIntoViewIfNeeded();

  const note = canvas.locator(".tl-note__container").first();
  const before = await note.boundingBox();
  if (!before) throw new Error("Sample note is missing");
  await page.mouse.move(before.x + before.width / 2, before.y + 25);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 45, before.y + 55, {
    steps: 8,
  });
  await page.mouse.up();
  await expect
    .poll(async () => Math.abs((await note.boundingBox())!.x - before.x))
    .toBeGreaterThan(25);

  await note.dblclick();
  await canvas
    .locator('[contenteditable="true"]')
    .last()
    .fill("A visitor's temporary idea");
  await page.keyboard.press("Escape");
  await expect(canvas).toContainText("A visitor's temporary idea");

  await canvas.getByRole("button", { name: "Reset zoom to 100%" }).click();
  await expect(
    canvas.getByRole("button", { name: "Reset zoom to 100%" }),
  ).toHaveText("100%");
  await canvas.getByRole("button", { name: "Zoom out", exact: true }).click();
  await expect(
    canvas.getByRole("button", { name: "Reset zoom to 100%" }),
  ).not.toHaveText("100%");

  await canvas
    .getByRole("button", { name: "Sticky note", exact: true })
    .click();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Preview canvas is missing");
  await page.mouse.click(
    bounds.x + bounds.width * 0.55,
    bounds.y + bounds.height * 0.75,
  );
  await expect(canvas.locator(".tl-note__container")).toHaveCount(4);
  await page.keyboard.press("Escape");
  await canvas.getByRole("button", { name: "Draw", exact: true }).click();
  await expect(
    canvas.getByRole("button", { name: "Draw", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const shapesBeforeDrawing = await canvas.locator(".tl-shape").count();
  await page.mouse.move(bounds.x + 110, bounds.y + bounds.height - 55);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 170, bounds.y + bounds.height - 75, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(canvas.locator(".tl-shape")).toHaveCount(
    shapesBeforeDrawing + 1,
  );

  const gridOffset = await canvas.locator(".tl-grid pattern").getAttribute("x");
  await canvas.getByRole("button", { name: "Pan", exact: true }).click();
  await page.mouse.move(bounds.x + 110, bounds.y + bounds.height - 55);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 155, bounds.y + bounds.height - 75, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(canvas.locator(".tl-grid pattern")).not.toHaveAttribute(
    "x",
    gridOffset!,
  );

  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await expect(canvas.locator(".tl-note__container")).toHaveCount(3);
  await expect(canvas).not.toContainText("A visitor's temporary idea");
  await expect(
    canvas.getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("Demo reset");
  expect(boardRequests).toEqual([]);
});

test("preview edits disappear on reload and mobile has usable controls without page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const canvas = page.getByTestId("landing-live-canvas");
  await expect(canvas.locator(".tl-note__container")).toHaveCount(3);
  await canvas.scrollIntoViewIfNeeded();
  await expect(
    canvas.getByRole("button", { name: "Sticky note", exact: true }),
  ).toBeVisible();
  await expect(
    canvas.getByRole("button", { name: "Draw", exact: true }),
  ).toBeVisible();
  await expect(
    canvas.getByRole("button", { name: "Text", exact: true }),
  ).toBeHidden();
  await canvas.locator(".tl-note__container").first().dblclick();
  await canvas
    .locator('[contenteditable="true"]')
    .last()
    .fill("Never persist this demo edit");
  await page.keyboard.press("Escape");
  await expect(canvas).toContainText("Never persist this demo edit");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(canvas.locator(".tl-note__container")).toHaveCount(3);
  await expect(canvas).not.toContainText("Never persist this demo edit");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
