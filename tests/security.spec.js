import { test, expect, seed } from "./fixtures/workspace.js";

test("corrupt storage shows error and preserves original", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("todo_app", "{broken"));
  await page.goto("/");
  await expect(page.getByRole("alert")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("todo_app"))).toBe(
    "{broken",
  );
});
test("failed save keeps edit dialog and previous data", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Storage full");
    };
  });
  await page.locator(".plus").click();
  await page.getByLabel("Title", { exact: true }).fill("Unsaved");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Storage full");
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("HTTP storage loads, reports failed writes and retries without losing form", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.TODO_APP_CONFIG = { apiUrl: "/api/workspace" };
  });
  let snapshot = structuredClone(seed),
    rejectSave = true;
  await page.route("**/api/workspace", async (route) => {
    if (route.request().method() === "PUT") {
      if (rejectSave)
        return route.fulfill({ status: 503, body: "Unavailable" });
      snapshot = route.request().postDataJSON();
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ status: 200, json: snapshot });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Legacy task" }),
  ).toBeVisible();
  await page.locator(".plus").click();
  await page.getByLabel("Title", { exact: true }).fill("Server task");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("503");
  await expect(page.getByRole("dialog")).toBeVisible();
  rejectSave = false;
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Server task" }),
  ).toBeVisible();
  expect(
    snapshot.projects
      .flatMap((p) => p.todoList)
      .filter((t) => t.task_title === "Server task"),
  ).toHaveLength(1);
});

test("clock, original desktop dimensions and passive data privacy", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.clock.install({ time: new Date("2026-10-14T10:59:00Z") });
  const requests = [];
  page.on("request", (request) =>
    requests.push({ url: request.url(), method: request.method() }),
  );
  await page.goto("/");
  await expect(page.locator(".date__time")).toBeVisible();
  const before = await page.locator(".date__time").textContent();
  await page.clock.runFor(60000);
  await expect(page.locator(".date__time")).not.toHaveText(before);
  expect(
    await page
      .locator("aside")
      .evaluate((e) => e.getBoundingClientRect().width),
  ).toBe(280);
  expect(
    await page.locator(".brand").evaluate((e) => getComputedStyle(e).fontSize),
  ).toBe("38px");
  expect(
    await page
      .locator(".dashboard-heading h1")
      .evaluate((e) => getComputedStyle(e).fontSize),
  ).toBe("47px");
  expect(
    await page
      .locator(".task-card")
      .evaluate((e) => getComputedStyle(e).borderRadius),
  ).toBe("6px");
  await page.getByRole("button", { name: "Grid", exact: true }).click();
  await page.screenshot({
    path: "test-results/desktop-restored.png",
    fullPage: true,
  });
  expect(
    requests.filter(
      (r) => new URL(r.url).origin !== new URL(page.url()).origin,
    ),
  ).toEqual([]);
  expect(requests.some((r) => r.method === "POST" || r.method === "PUT")).toBe(
    false,
  );
  if (process.env.TODO_REFERENCE_URL) {
    await page.goto(process.env.TODO_REFERENCE_URL);
    await page.screenshot({
      path: "test-results/desktop-original.png",
      fullPage: true,
    });
  }
});

test("Markdown does not fetch remote images, send referrers, or run scripts in preview", async ({
  page,
}) => {
  const remote = [];
  page.on("request", (r) => {
    if (r.url().includes("tracker.example")) remote.push(r.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Edit", exact: true }).last().click();
  await page
    .getByLabel("Description · Markdown")
    .fill(
      '![Private image](https://tracker.example/image?secret=123)\n<a href="javascript:alert(1)">Bad</a><iframe src="https://tracker.example/frame"></iframe>',
    );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Preview code (ctrl + 9)", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("link", { name: "View image: Private image" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await page.getByRole("button", { name: "Show more" }).click();
  const link = page
    .getByRole("dialog")
    .getByRole("link", { name: "View image: Private image" });
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(
    page.getByRole("dialog").locator('iframe,img,script,[href^="javascript:"]'),
  ).toHaveCount(0);
  expect(remote).toEqual([]);
});

test("production CSP supports rendering and saving without external traffic", async ({
  page,
}) => {
  const violations = [];
  await page.addInitScript(() => {
    window.cspViolations = [];
    document.addEventListener("securitypolicyviolation", (e) =>
      window.cspViolations.push(e.violatedDirective),
    );
  });
  page.on("pageerror", (e) => violations.push(e.message));
  await page.goto(process.env.TODO_PRODUCTION_URL || "http://localhost:4013");
  await expect(
    page.locator('meta[http-equiv="Content-Security-Policy"]'),
  ).toHaveAttribute("content", /script-src 'self'/);
  await page.getByRole("button", { name: "+ Add Task", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Production task");
  await page.getByLabel("Description · Markdown").fill("**Production notes**");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await page
    .locator(".task-card")
    .filter({ has: page.getByRole("heading", { name: "Production task" }) })
    .getByRole("button", { name: "Show more" })
    .click();
  await expect(page.getByRole("dialog").locator("strong")).toHaveText(
    "Production notes",
  );
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
});

test("local server rejects source files, cross-site requests, unexpected hosts and writes", async ({
  request,
}) => {
  for (const url of [
    "/.git/config",
    "/package.json",
    "/src/app/repository.js",
  ]) {
    const response = await request.get(url);
    expect(response.status()).not.toBe(200);
  }
  expect(
    (
      await request.get("/", { headers: { Host: "attacker.example" } })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.get("/", { headers: { "Sec-Fetch-Site": "cross-site" } })
    ).status(),
  ).toBe(403);
  expect((await request.post("/", { data: "not allowed" })).status()).toBe(405);
});
