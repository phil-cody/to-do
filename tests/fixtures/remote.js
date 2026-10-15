import { expect } from "@playwright/test";
export const base = "http://localhost:4010";
export async function login(page, user, request, hash = "") {
  await page.setExtraHTTPHeaders({
    "X-Real-IP": `10.0.${Math.floor(user / 256)}.${user % 256}`,
  });
  await page.goto(base + hash);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const link = page.getByRole("link", {
    name: "Open Telegram and confirm sign-in",
  });
  await expect(link).toBeVisible();
  const challenge = new URL(await link.getAttribute("href")).searchParams
    .get("start")
    .slice("login_".length);
  await request.post("http://localhost:4011", { data: { user, challenge } });
  if (hash === "#new-task")
    await expect(page.getByRole("dialog")).toBeVisible();
  else
    await expect(
      page.getByRole("heading", { name: "Inbox", exact: true }),
    ).toBeVisible();
}
export async function addTask(page, title) {
  await page.getByRole("button", { name: "+ Add Task", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
}
