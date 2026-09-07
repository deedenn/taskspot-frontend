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
function mockTask(task = baseTask, fail = false) {
  apiFetch.mockImplementation(async (path, options) => {
    if (path === "/dashboard") return { all: [task], assigned: [task], initiated: [], observing: [] };
    if (path === "/projects") return { projects: [project] };
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
  const select = screen.getByRole("combobox", { name: "Статус задачи Проверить документ" });
  fireEvent.mouseDown(select);
  fireEvent.click(await screen.findByText("Выполнено"));
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/tasks/t", { method: "PATCH", body: JSON.stringify({ status: "review" }) }));
  await waitFor(() => expect(screen.queryByRole("combobox", { name: "Статус задачи Проверить документ" })).not.toBeInTheDocument());
  expect(within(table).getByText("Проверка")).toBeInTheDocument();
});
test.each([
  ["another assignee", { assignee: { _id: "other", name: "Другой" } }],
  ["archived project", { project: { ...project, archived: true, archivedAt: "2026-01-01" } }],
  ["review", { status: "review" }]
])("dashboard status is read-only for %s", async (_, change) => {
  mockTask({ ...baseTask, ...change });
  render(<MemoryRouter><Dashboard currentUser={user} /></MemoryRouter>);
  await screen.findByText("Проверить документ");
  expect(screen.queryByRole("combobox", { name: "Статус задачи Проверить документ" })).not.toBeInTheDocument();
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
  const select = await screen.findByRole("combobox", { name: "Статус задачи Проверить документ" });
  fireEvent.mouseDown(select);
  fireEvent.click(await screen.findByText("Выполнено"));
  await waitFor(() => expect(apiFetch.mock.calls.some(([, options]) => options?.method === "PATCH")).toBe(true));
  await waitFor(() => expect(select.closest(".ant-select")).not.toHaveClass("ant-select-disabled"));
  expect(within(screen.getByRole("table")).getByText("Открыта")).toBeInTheDocument();
});
test("mobile task row keeps the status control outside its navigation link", async () => {
  window.matchMedia = (query) => ({ matches: false, media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } });
  mockTask();
  render(<MemoryRouter><Dashboard currentUser={user} /></MemoryRouter>);
  const select = await screen.findByRole("combobox", { name: "Статус задачи Проверить документ" });
  expect(select.closest("a")).toBeNull();
  expect(screen.getByRole("link", { name: "Проверить документ" })).toHaveAttribute("href", "/app/tasks/t");
  fireEvent.mouseDown(select);
  fireEvent.click(await screen.findByText("Выполнено"));
  await waitFor(() => expect(screen.queryByRole("combobox", { name: "Статус задачи Проверить документ" })).not.toBeInTheDocument());
});
