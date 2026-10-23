import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = process.env.CAPTURE_BASE_URL || "http://127.0.0.1:5173";
const outputDir = resolve("public/screenshots");

const manager = {
  _id: "670000000000000000000001",
  name: "Анна",
  lastName: "Соколова",
  email: "anna@demo.taskspot.ru"
};
const employee = {
  _id: "670000000000000000000002",
  name: "Мария",
  lastName: "Петрова",
  email: "maria@demo.taskspot.ru"
};
const observer = {
  _id: "670000000000000000000003",
  name: "Илья",
  lastName: "Кузнецов",
  email: "ilya@demo.taskspot.ru"
};
const project = {
  _id: "680000000000000000000001",
  name: "Запуск новой точки",
  description: "Подготовка магазина к открытию",
  createdBy: manager,
  members: [
    { user: manager, role: "admin" },
    { user: employee, role: "member" },
    { user: observer, role: "member" }
  ],
  invitations: [],
  categories: [
    { _id: "690000000000000000000001", name: "Документы", color: "blue" },
    { _id: "690000000000000000000002", name: "Открытие", color: "purple" },
    { _id: "690000000000000000000003", name: "Закупки", color: "orange" }
  ]
};

const tasks = [
  {
    _id: "6a000000000000000000000001",
    description: "Согласовать договор аренды",
    status: "review",
    priority: "high",
    dueDate: "2026-10-24T15:00:00.000Z",
    dueDateHasTime: true,
    project,
    creator: manager,
    assignee: employee,
    observers: [observer],
    categories: [project.categories[0]._id],
    checklist: [
      { _id: "1", text: "Проверить реквизиты", done: true },
      { _id: "2", text: "Согласовать условия", done: true },
      { _id: "3", text: "Загрузить подписанный файл", done: true }
    ],
    attachments: [{ _id: "a1", name: "Договор_аренды.pdf", size: 842112, addedBy: employee }],
    comments: [
      {
        _id: "c1",
        author: employee,
        text: "Договор проверен и подписан с нашей стороны.",
        createdAt: "2026-10-23T11:15:00.000Z"
      },
      { _id: "c2", author: manager, text: "Принято, проверяю итоговую версию.", createdAt: "2026-10-23T12:04:00.000Z" }
    ],
    activities: [
      {
        _id: "h1",
        actor: employee,
        action: "status_changed",
        from: "in_progress",
        to: "review",
        createdAt: "2026-10-23T11:16:00.000Z"
      }
    ],
    recurrence: { enabled: false }
  },
  {
    _id: "6a000000000000000000000002",
    description: "Заказать вывеску и навигацию",
    status: "in_progress",
    priority: "medium",
    dueDate: "2026-10-25T20:59:59.999Z",
    dueDateHasTime: false,
    project,
    creator: manager,
    assignee: employee,
    observers: [],
    categories: [project.categories[2]._id],
    checklist: [],
    attachments: [],
    comments: [],
    activities: [],
    recurrence: { enabled: false }
  },
  {
    _id: "6a000000000000000000000003",
    description: "Подготовить график первой смены",
    status: "open",
    priority: "urgent",
    dueDate: "2026-10-23T13:00:00.000Z",
    dueDateHasTime: true,
    project,
    creator: manager,
    assignee: observer,
    observers: [employee],
    categories: [project.categories[1]._id],
    checklist: [],
    attachments: [],
    comments: [],
    activities: [],
    recurrence: { enabled: false }
  },
  {
    _id: "6a000000000000000000000004",
    description: "Проверить готовность кассовой зоны",
    status: "in_progress",
    priority: "high",
    dueDate: "2026-10-26T20:59:59.999Z",
    dueDateHasTime: false,
    project,
    creator: manager,
    assignee: employee,
    observers: [],
    categories: [project.categories[1]._id],
    checklist: [],
    attachments: [],
    comments: [],
    activities: [],
    recurrence: { enabled: false }
  }
];

async function installApi(page, currentUser) {
  await page.addInitScript(() => localStorage.setItem("taskflow_token", "landing-capture"));
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");
    const respond = (json, status = 200) => route.fulfill({ status, json });

    if (path === "/auth/me") return respond({ user: currentUser });
    if (path === "/notifications") return respond({ notifications: [] });
    if (path === "/analytics/events") return respond({ ok: true });
    if (path === "/projects") return respond({ projects: [project] });
    if (path === "/dashboard") return respond({ all: tasks, notifications: [], planReminders: [] });
    if (path.startsWith("/tasks/")) {
      const task = tasks.find((item) => item._id === path.split("/")[2]);
      return respond({ task });
    }
    return respond({ message: `Unknown capture endpoint: ${path}` }, 404);
  });
}

async function capture(page, name, url, selector, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}${url}`);
  await page.locator(selector).waitFor({ state: "visible" });
  await page.screenshot({ path: resolve(outputDir, name), fullPage: true });
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const managerPage = await browser.newPage({ deviceScaleFactor: 1 });
  await installApi(managerPage, manager);
  await capture(managerPage, "manager-dashboard.png", "/app/dashboard", ".dashboard__task-table", {
    width: 1440,
    height: 900
  });

  const employeePage = await browser.newPage({ deviceScaleFactor: 1 });
  await installApi(employeePage, employee);
  await capture(employeePage, "employee-dashboard.png", "/app/dashboard", ".dashboard__mobile-list", {
    width: 390,
    height: 844
  });

  const taskPage = await browser.newPage({ deviceScaleFactor: 1 });
  await installApi(taskPage, manager);
  await capture(taskPage, "task-card.png", `/app/tasks/${tasks[0]._id}`, ".task-details__main", {
    width: 1440,
    height: 960
  });
} finally {
  await browser.close();
}
