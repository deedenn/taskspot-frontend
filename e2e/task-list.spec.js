import { expect, test } from "@playwright/test";

const projectId = "6a000000000000000000000001";
const user = { _id: "6a000000000000000000000002", name: "Анна", lastName: "Соколова", email: "anna@example.test" };
const project = { _id: projectId, name: "Рабочие задачи", description: "Проект для проверки списка",
  members: [{ user, role: "admin" }], categories: [], invitations: [] };
const listUrl = `/app/projects/${projectId}/tasks`;

async function mockApi(page) {
  let failNext = false;
  const queries = [];
  const tasks = Array.from({ length: 61 }, (_, index) => ({
    _id: String(index + 1).padStart(24, "0"), description: `Задача ${String(index + 1).padStart(2, "0")}`,
    status: index === 0 ? "review" : "open", priority: "medium", project, creator: user, assignee: user,
    observers: [], categories: [], comments: [], activities: [], checklist: [], attachments: [], recurrence: { enabled: false }
  }));
  await page.addInitScript(() => localStorage.setItem("taskflow_token", "local-ui-test"));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");
    const respond = (data, status = 200) => route.fulfill({ status, json: data });
    if (path === "/auth/me") return respond({ user });
    if (path === "/notifications") return respond({ notifications: [] });
    if (path === `/projects/${projectId}`) return respond({ project });
    if (path.startsWith("/tasks/")) {
      const task = tasks.find((item) => item._id === path.split("/")[2]);
      if (route.request().method() === "PATCH") Object.assign(task, route.request().postDataJSON());
      return respond({ task });
    }
    if (path === "/tasks") {
      queries.push(Object.fromEntries(url.searchParams));
      if (failNext) { failNext = false; return respond({ message: "Тестовая ошибка загрузки" }, 500); }
      const search = url.searchParams.get("search") || "";
      const status = url.searchParams.get("status");
      const filtered = tasks.filter((task) => task.description.includes(search)
        && (!status || task.status === status)
        && (url.searchParams.get("hideClosed") !== "true" || task.status !== "closed"));
      const limit = Number(url.searchParams.get("limit") || 25);
      const current = Math.min(Number(url.searchParams.get("page") || 1), Math.max(1, Math.ceil(filtered.length / limit)));
      await new Promise((resolve) => setTimeout(resolve, search === "Задача 0" ? 800 : 100));
      return respond({ tasks: filtered.slice((current - 1) * limit, current * limit),
        pagination: { page: current, limit, total: filtered.length } });
    }
    return respond({ message: `Unexpected request ${path}` }, 404);
  });
  return { queries, fail: () => { failNext = true; } };
}

test("project task pages survive opening a task and reloading; errors can be retried", async ({ page }) => {
  const api = await mockApi(page);
  await page.goto(`${listUrl}?page=2&limit=25`);
  await expect(page.locator(".tasks__card")).toHaveCount(25);
  await page.getByRole("link", { name: "Задача 26", exact: true }).click();
  await page.getByRole("link", { name: /Назад$/ }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole("link", { name: "Задача 26", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator(".tasks__card")).toHaveCount(25);
  api.fail();
  await page.getByRole("searchbox", { name: "Поиск по задачам" }).fill("Задача 61");
  await expect(page.getByText("Тестовая ошибка загрузки")).toBeVisible();
  await expect(page.locator(".tasks__card")).toHaveCount(0);
  await page.getByRole("button", { name: "Повторить" }).click();
  await expect(page.locator(".tasks__card")).toHaveCount(1);
  expect(api.queries.at(-1).page).toBe("1");
});

test("search keeps focus and newer results win; layout fits desktop and mobile", async ({ page }, testInfo) => {
  await mockApi(page);
  await page.goto(listUrl);
  await expect(page.locator(".tasks__card")).toHaveCount(25);
  const search = page.getByRole("searchbox", { name: "Поиск по задачам" });
  await search.fill("Задача 0");
  await expect(page.locator(".tasks__results")).toHaveAttribute("aria-busy", "true");
  await expect(search).toBeFocused();
  await search.fill("Задача 61");
  await expect(page.getByRole("link", { name: "Задача 61", exact: true })).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(page.locator(".tasks__card")).toHaveCount(1);
  await expect(search).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("task-list.png"), fullPage: true });
});

test("confirming a task removes it from the review filter and updates the total", async ({ page }) => {
  await mockApi(page);
  await page.goto(`${listUrl}?status=review`);
  await expect(page.locator(".tasks__card")).toHaveCount(1);
  await page.getByRole("button", { name: /Подтвердить/ }).click();
  await page.getByRole("button", { name: "Изменить", exact: true }).click();
  await expect(page.locator(".tasks__card")).toHaveCount(0);
  await expect(page.getByText("Всего задач: 0")).toBeVisible();
});
