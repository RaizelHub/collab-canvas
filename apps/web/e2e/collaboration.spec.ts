import { expect, test, type Browser } from "@playwright/test";

const credentials = {
  userA: {
    email: process.env.E2E_USER_A_EMAIL,
    password: process.env.E2E_USER_A_PASSWORD,
  },
  userB: {
    email: process.env.E2E_USER_B_EMAIL,
    password: process.env.E2E_USER_B_PASSWORD,
  },
};

const liveEnvironmentAvailable = Boolean(
  credentials.userA.email &&
    credentials.userA.password &&
    credentials.userB.email &&
    credentials.userB.password &&
    process.env.E2E_BASE_URL,
);

async function login(browser: Browser, email: string, password: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return { context, page };
}

test.describe("live collaboration", () => {
  test.skip(
    !liveEnvironmentAvailable,
    "Requires a deployed Supabase/Worker environment and two seeded users.",
  );

  test("owner creates, shares, and deletes a board", async ({ browser }) => {
    const owner = await login(
      browser,
      credentials.userA.email!,
      credentials.userA.password!,
    );
    await owner.page
      .getByRole("button", { name: "Create board" })
      .first()
      .click();
    await expect(owner.page).toHaveURL(/\/board\/[0-9a-f-]+$/);
    await owner.page.getByRole("button", { name: "Share" }).click();
    await owner.page
      .getByPlaceholder("name@example.com")
      .fill(credentials.userB.email!);
    await owner.page.getByRole("button", { name: "Invite" }).click();
    await expect(
      owner.page.getByText("Invitation created. It expires in 7 days."),
    ).toBeVisible();
    await owner.context.close();
  });

  test("viewer controls are read-only", async ({ browser }) => {
    const viewer = await login(
      browser,
      credentials.userB.email!,
      credentials.userB.password!,
    );
    await viewer.page.goto("/boards/shared");
    const firstBoard = viewer.page
      .getByRole("button", {
        name: "Open board",
      })
      .first();
    await expect(firstBoard).toBeVisible();
    await firstBoard.click();
    await expect(viewer.page.getByText("viewer")).toBeVisible();
    await expect(
      viewer.page.getByRole("button", { name: "Share" }),
    ).toHaveCount(0);
    await viewer.context.close();
  });
});
