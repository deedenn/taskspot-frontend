// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProjectTemplates } from "./ProjectTemplates.jsx";
import { apiFetch } from "../../api.js";
vi.mock("../../api.js", () => ({
  apiFetch: vi.fn(), isLimitError: (error) => error.status === 402,
  limitErrorText: (error) => error.message
}));
const template = { _id: "weekly-manager", builtin: true, name: "Неделя руководителя", description: "План",
  categories: [{ key: "work", name: "Работа", color: "#123456" }],
  tasks: [{ description: "Проверить итоги", dueOffsetDays: 4, checklist: [{ text: "Сверить результат" }] }] };
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

function renderPage() {
  return render(<MemoryRouter><Routes>
    <Route path="/" element={<ProjectTemplates currentUser={{ _id: "user" }} />} />
    <Route path="/app/projects/new-project" element={<h1>Новый проект открыт</h1>} />
  </Routes></MemoryRouter>);
}

test("library previews structure and retries creation with the same request id", async () => {
  apiFetch.mockResolvedValueOnce({ templates: [template] }).mockResolvedValueOnce({ projects: [] })
    .mockRejectedValueOnce(new Error("Сеть недоступна")).mockResolvedValueOnce({ project: { _id: "new-project" } });
  renderPage();
  await screen.findByText(template.name);
  expect(screen.getByRole("button", { name: /Сохранить проект как шаблон/ })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: /Создать проект/ }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("Сверить результат")).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: /Создать проект/ }));
  await within(dialog).findByText("Сеть недоступна");
  fireEvent.click(within(dialog).getByRole("button", { name: /Создать проект/ }));
  await screen.findByText("Новый проект открыт");
  const calls = apiFetch.mock.calls.filter(([path]) => path.endsWith("/projects") && path.startsWith("/project-templates/"));
  expect(calls).toHaveLength(2);
  expect(JSON.parse(calls[0][1].body).requestId).toBe(JSON.parse(calls[1][1].body).requestId);
});

test("saving a blueprint is available only for administered projects", async () => {
  apiFetch.mockResolvedValueOnce({ templates: [template] }).mockResolvedValueOnce({ projects: [
    { _id: "admin-project", name: "Мой проект", members: [{ user: { _id: "user" }, role: "admin" }] },
    { _id: "member-project", name: "Чужой проект", members: [{ user: "user", role: "member" }] }
  ] });
  renderPage();
  await waitFor(() => expect(screen.getByRole("button", { name: /Сохранить проект как шаблон/ })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: /Сохранить проект как шаблон/ }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.mouseDown(within(dialog).getByRole("combobox"));
  expect(await screen.findByText("Мой проект")).toBeInTheDocument();
  expect(screen.queryByText("Чужой проект")).not.toBeInTheDocument();
});

test("library loading error offers retry", async () => {
  apiFetch.mockRejectedValueOnce(new Error("Не удалось загрузить шаблоны"))
    .mockResolvedValueOnce({ templates: [template] }).mockResolvedValueOnce({ projects: [] });
  renderPage();
  await screen.findByText("Не удалось загрузить шаблоны");
  fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
  expect(await screen.findByText(template.name)).toBeInTheDocument();
});
