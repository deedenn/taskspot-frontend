import { cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Dashboard } from "../components/Dashboard/Dashboard.jsx";
import { TaskDetails } from "../components/Tasks/TaskDetails.jsx";
import { apiFetch } from "../api.js";
vi.mock("../api.js", () => ({ apiFetch: vi.fn(), isLimitError: () => false, limitErrorText: (error) => error.message }));
const user = { _id: "u", name: "Иван", lastName: "Иванов", email: "private@example.test", avatarUrl: "/avatar.png" };
const project = { _id: "p", name: "Продажи", members: [{ user, role: "admin" }], categories: [], invitations: [] };
const baseTask = { _id: "t", description: "Проверить документ", status: "open", priority: "medium", project,
  creator: { _id: "creator", name: "Анна" }, assignee: user, observers: [], categories: [], checklist: [], attachments: [], activities: [], comments: [] };
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  window.matchMedia = (query) => ({ matches: query.includes("min-width"), media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } });
});
function mockTask(task = baseTask, fail = false, projects = [project]) {
  apiFetch.mockImplementation(async (path, options) => {
    if (path === "/dashboard") return { all: [task], assigned: [task], initiated: [], observing: [] };
    if (path === "/projects") return { projects };
    if (options?.method === "PATCH") {
      if (fail) throw new Error("Не удалось сохранить статус");
      return { task: { ...task, ...JSON.parse(options.body) } };
    }
    return { task };
  });
}
test("dashboard shows seven fixed-layout columns, avatar/name and inline completion without duplicate metrics", async () => {
  mockTask();
  render(<MemoryRouter><Dashboard currentUser={user} /></MemoryRouter>);
  await screen.findByText("Проверить документ");
  const table = screen.getByRole("table");
  expect(within(table).getAllByRole("columnheader")).toHaveLength(7);
  expect(table).toHaveStyle({ tableLayout: "fixed" });
  expect(within(table).getByText("Иван Иванов")).toBeInTheDocument();
  expect(within(table).queryByText(user.email)).not.toBeInTheDocument();
  expect(table.querySelector('img[src="/avatar.png"]')).not.toBeNull();
  expect(screen.queryByLabelText("Индикаторы задач")).not.toBeInTheDocument();
  expect(screen.queryByPlaceholderText("Поиск по задачам")).not.toBeInTheDocument();
  const statusButton = screen.getByRole("button", { name: /Статус задачи Проверить документ: Открыта/ });
  fireEvent.click(statusButton);
  fireEvent.click(await screen.findByText("Выполнено — на проверку"));
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/tasks/t", { method: "PATCH", body: JSON.stringify({ status: "review" }) }));
  await waitFor(() => expect(screen.queryByRole("button", { name: /Статус задачи Проверить документ/ })).not.toBeInTheDocument());
  expect(within(table).getByText("На проверке")).toBeInTheDocument();
});
test.each([
  ["another assignee", { assignee: { _id: "other", name: "Другой" } }],
  ["archived project", { project: { ...project, archived: true, archivedAt: "2026-01-01" } }],
  ["review", { status: "review" }]
])("dashboard status is read-only for %s", async (_, change) => {
  mockTask({ ...baseTask, ...change });
  render(<MemoryRouter><Dashboard currentUser={user} /></MemoryRouter>);
  await screen.findByText("Проверить документ");
  expect(screen.queryByRole("button", { name: /Статус задачи Проверить документ/ })).not.toBeInTheDocument();
});
test("task completion is in the heading, sends review and history follows comments", async () => {
  mockTask();
  render(<MemoryRouter initialEntries={["/app/tasks/t"]}><Routes>
    <Route path="/app/tasks/:taskId" element={<TaskDetails currentUser={user} />} />
  </Routes></MemoryRouter>);
  const button = await screen.findByRole("button", { name: "Отметить как выполненную" });
  expect(button.closest(".task-details__head")).not.toBeNull();
  const comments = screen.getByText("Комментарии", { exact: true });
  const history = screen.getByText("История", { exact: true });
  expect(comments.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(button);
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/tasks/t", { method: "PATCH", body: JSON.stringify({ status: "review" }) }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Отметить как выполненную" })).not.toBeInTheDocument());
});

test("failed inline update retains the old status and allows retry", async () => {
  mockTask(baseTask, true);
  render(<MemoryRouter><Dashboard currentUser={user} /></MemoryRouter>);
  const statusButton = await screen.findByRole("button", { name: /Статус задачи Проверить документ: Открыта/ });
  fireEvent.click(statusButton);
  fireEvent.click(await screen.findByText("Выполнено — на проверку"));
  await waitFor(() => expect(apiFetch.mock.calls.some(([, options]) => options?.method === "PATCH")).toBe(true));
  await waitFor(() => expect(statusButton).not.toBeDisabled());
  expect(within(screen.getByRole("table")).getByText("Открыта")).toBeInTheDocument();
});
test("dashboard keeps advanced filters collapsed in the compact workbar", async () => {
  mockTask();
  render(<MemoryRouter><Dashboard currentUser={user} /></MemoryRouter>);
  await screen.findByText("Проверить документ");
  const filtersButton = screen.getByRole("button", { name: /Фильтры/ });
  expect(filtersButton).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByLabelText("Дополнительные фильтры задач")).not.toBeInTheDocument();

  fireEvent.click(filtersButton);
  expect(filtersButton).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByLabelText("Дополнительные фильтры задач")).toBeInTheDocument();
  expect(within(screen.getByLabelText("Дополнительные фильтры задач")).getByText("Закрытые задачи")).toBeInTheDocument();

  fireEvent.click(within(screen.getByLabelText("Дополнительные фильтры задач")).getByRole("switch"));
  expect(screen.getByRole("button", { name: /Фильтры · 1/ })).toBeInTheDocument();
  expect(screen.getByTitle("Все состояния")).toBeInTheDocument();
});
test("dashboard uses compact role and quick filter selects", async () => {
  mockTask({ ...baseTask, status: "review", creator: user });
  render(<MemoryRouter><Dashboard currentUser={user} /></MemoryRouter>);
  await screen.findByText("Проверить документ");

  expect(screen.queryByRole("tablist", { name: "Фильтр задач по роли" })).not.toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Роль в списке задач" })).toBeInTheDocument();
  const quickSelect = screen.getByRole("combobox", { name: "Быстрый фильтр задач" });

  fireEvent.mouseDown(quickSelect);
  fireEvent.click(await screen.findByText("На проверке · 1"));
  await screen.findByRole("heading", { name: "Задачи на проверке" });
});
test("mobile filters open in a drawer and expose hidden project with accessible controls", async () => {
  window.matchMedia = (query) => ({ matches: false, media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } });
  const secondProject = { ...project, _id: "p2", name: "Маркетинг" };
  mockTask(baseTask, false, [project, secondProject]);
  render(<MemoryRouter><Dashboard currentUser={user} /></MemoryRouter>);
  await screen.findByText("Проверить документ");

  const filtersButton = screen.getByRole("button", { name: /Фильтры$/ });
  fireEvent.click(filtersButton);
  const drawerFilters = await screen.findByLabelText("Дополнительные фильтры задач");
  expect(filtersButton).toHaveAttribute("aria-controls", "dashboard-detailed-filters-drawer");
  expect(within(drawerFilters).getByRole("combobox", { name: "Проект задач в фильтрах" })).toBeInTheDocument();
  expect(within(drawerFilters).getByRole("combobox", { name: "Категории задач" })).toBeInTheDocument();
  expect(within(drawerFilters).getByRole("switch", { name: "Показывать закрытые задачи" })).toBeInTheDocument();

  const projectSelect = within(drawerFilters).getByRole("combobox", { name: "Проект задач в фильтрах" });
  fireEvent.mouseDown(projectSelect);
  fireEvent.click(await screen.findByText("Маркетинг"));
  expect(screen.getByRole("button", { name: /Фильтры · 1/ })).toBeInTheDocument();
  expect(screen.getByText("Проект: Маркетинг")).toBeInTheDocument();
});
test("task creator can accept a task on review from the dashboard", async () => {
  const reviewTask = {
    ...baseTask,
    status: "review",
    creator: user,
    assignee: { _id: "assignee", name: "Пётр" }
  };
  mockTask(reviewTask);
  render(<MemoryRouter><Dashboard currentUser={user} /></MemoryRouter>);
  await screen.findByText("Проверить документ");

  fireEvent.click(screen.getByRole("button", { name: /Статус задачи Проверить документ: На проверке/ }));
  fireEvent.click(await screen.findByText("Принять и закрыть"));

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/tasks/t", {
    method: "PATCH",
    body: JSON.stringify({ status: "closed" })
  }));
  await waitFor(() => expect(screen.queryByText("Проверить документ")).not.toBeInTheDocument());
});
test("returning a task to work requires a reviewer comment", async () => {
  const reviewTask = {
    ...baseTask,
    status: "review",
    creator: user,
    assignee: { _id: "assignee", name: "Пётр" }
  };
  mockTask(reviewTask);
  render(<MemoryRouter><Dashboard currentUser={user} /></MemoryRouter>);
  await screen.findByText("Проверить документ");

  fireEvent.click(screen.getByRole("button", { name: /Статус задачи Проверить документ: На проверке/ }));
  fireEvent.click(await screen.findByText("Вернуть на доработку"));
  const dialog = await screen.findByRole("dialog", { name: "Вернуть задачу на доработку" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Вернуть на доработку" }));
  expect(await within(dialog).findByText("Укажите, что нужно доработать")).toBeInTheDocument();
  expect(apiFetch.mock.calls.filter(([, options]) => options?.method === "PATCH")).toHaveLength(0);

  fireEvent.change(within(dialog).getByRole("textbox", { name: "Комментарий для ответственного" }), {
    target: { value: "Добавьте итоговый файл" }
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "Вернуть на доработку" }));

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/tasks/t", {
    method: "PATCH",
    body: JSON.stringify({ status: "in_progress", comment: "Добавьте итоговый файл" })
  }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Вернуть задачу на доработку" })).not.toBeInTheDocument());
  expect(screen.getByText("В работе")).toBeInTheDocument();
});
test("mobile task row keeps the status control outside its navigation link", async () => {
  window.matchMedia = (query) => ({ matches: false, media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } });
  mockTask();
  render(<MemoryRouter><Dashboard currentUser={user} /></MemoryRouter>);
  const statusButton = await screen.findByRole("button", { name: /Статус задачи Проверить документ: Открыта/ });
  expect(statusButton.closest("a")).toBeNull();
  expect(screen.getByRole("link", { name: "Проверить документ" })).toHaveAttribute("href", "/app/tasks/t");
  fireEvent.click(statusButton);
  fireEvent.click(await screen.findByText("Выполнено — на проверку"));
  await waitFor(() => expect(screen.queryByRole("button", { name: /Статус задачи Проверить документ/ })).not.toBeInTheDocument());
});
