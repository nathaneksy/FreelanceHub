import { test, expect } from "@playwright/test";
test("freelancer and client journeys with workspace isolation and mobile layout", async ({
  browser,
}) => {
  const stamp = Date.now(),
    password = "Bakeoff-test-password!",
    owner = await browser.newContext(),
    client = await browser.newContext();
  const page = await owner.newPage(),
    cp = await client.newPage();
  async function register(p, name, email, invite = "") {
    await p.goto("http://127.0.0.1:3000/login");
    await p.getByText("New here? Create an account").click();
    await p.getByLabel("Your name", { exact: true }).fill(name);
    await p.getByLabel("Email", { exact: true }).fill(email);
    await p.getByLabel("Password", { exact: true }).fill(password);
    if (invite) await p.getByLabel("Invitation code").fill(invite);
    await p.getByRole("button", { name: "Create account" }).click();
    await expect(
      p.getByRole("heading", { name: new RegExp("Welcome back") }),
    ).toBeVisible();
  }
  await register(page, "Test Freelancer", `owner${stamp}@example.com`);
  await page.locator('nav a[href="/?view=clients"]').click();
  await page.getByText("＋ Add a client", { exact: true }).click();
  await page.getByLabel("Client or company name").fill("Acorn Studio");
  await page.getByLabel("Contact email").fill(`client${stamp}@example.com`);
  await page.getByRole("button", { name: "Add client", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Acorn Studio" }),
  ).toBeVisible();
  await page.getByText("Client invitation", { exact: true }).click();
  const invite = await page.locator("code").innerText();
  await page
    .getByRole("link", { name: /Projects/ })
    .first()
    .click();
  await page.getByLabel("Project name", { exact: true }).fill("Brand refresh");
  await page
    .getByLabel("Description", { exact: true })
    .fill("A thoughtful identity for a growing studio.");
  await page.getByRole("button", { name: "Save project" }).click();
  await expect(
    page.getByRole("heading", { name: "Brand refresh", exact: true }),
  ).toBeVisible();
  const projectUrl = page.url();
  await page.locator(".add-details").evaluate((el) => (el.open = true));
  await page
    .locator(".add-details")
    .getByLabel("Title", { exact: true })
    .fill("Share initial concepts");
  await page.getByRole("button", { name: "Save work item" }).click();
  await expect(page.locator(".work-item")).toHaveCount(1);
  await page.locator(".add-details").evaluate((el) => (el.open = true));
  await page
    .locator(".add-details")
    .getByLabel("Title", { exact: true })
    .fill("Private pricing research");
  await page
    .locator(".add-details")
    .getByLabel("Visible to client", { exact: true })
    .uncheck();
  const actionRequest = page.waitForRequest(
    (request) => request.method() === "POST",
  );
  await page.getByRole("button", { name: "Save work item" }).click();
  const captured = await actionRequest;
  await expect(page.locator(".work-item")).toHaveCount(2);
  await page.getByLabel("Your update").fill("Ready for a great project.");
  await page.getByRole("button", { name: "Post message" }).click();
  await register(cp, "Test Client", `client${stamp}@example.com`, invite);
  await cp.goto(projectUrl);
  await expect(
    cp.getByText("Share initial concepts", { exact: true }),
  ).toBeVisible();
  await expect(
    cp.getByText("Private pricing research", { exact: true }),
  ).toHaveCount(0);
  await expect(
    cp.getByText("Edit project details", { exact: true }),
  ).toHaveCount(0);
  // Replay a valid owner mutation with the client's session cookie.
  const blocked = await cp.request.post(projectUrl, {
    data: captured.postDataBuffer(),
    headers: {
      "Content-Type": captured.headers()["content-type"],
      "Next-Action": captured.headers()["next-action"],
      Origin: "http://127.0.0.1:3000",
    },
  });
  expect(blocked.headers()["x-action-redirect"]).toContain(
    "Only%20the%20workspace%20owner",
  );
  await cp.getByLabel("Your update").fill("Excited to see the concepts!");
  await cp.getByRole("button", { name: "Post message" }).click();
  await expect(
    cp
      .locator(".message p")
      .filter({ hasText: "Excited to see the concepts!" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .locator(".message p")
      .filter({ hasText: "Excited to see the concepts!" }),
  ).toBeVisible();
  await expect(page.locator(".work-item")).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Brand refresh", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-project.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("http://127.0.0.1:3000/");
  await page.screenshot({
    path: "test-results/desktop-dashboard.png",
    fullPage: true,
  });
  const stranger = await browser.newContext(),
    sp = await stranger.newPage();
  await register(sp, "Other Freelancer", `other${stamp}@example.com`);
  await sp.goto(projectUrl);
  await expect(
    sp.getByRole("heading", { name: "Project unavailable" }),
  ).toBeVisible();
  await stranger.close();
  await cp.getByRole("button", { name: "Sign out" }).click();
  await expect(cp.getByRole("button", { name: "Sign in" })).toBeVisible();
  await cp
    .getByLabel("Email", { exact: true })
    .fill(`client${stamp}@example.com`);
  await cp.getByLabel("Password", { exact: true }).fill(password);
  await cp.getByRole("button", { name: /^Sign in/ }).click();
  await expect(
    cp.getByRole("heading", { name: "Welcome back, Test." }),
  ).toBeVisible();
  await cp.goto(projectUrl);
  await expect(
    cp.getByText("Private pricing research", { exact: true }),
  ).toHaveCount(0);
  await owner.close();
  await client.close();
});
