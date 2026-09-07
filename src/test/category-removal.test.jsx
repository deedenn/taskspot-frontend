import { cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Projects } from "../components/Projects/Projects.jsx";
import { apiFetch } from "../api.js";
vi.mock("../api.js", () => ({ apiFetch: vi.fn(), isLimitError: () => false, limitErrorText: (error) => error.message }));
vi.mock("../components/Projects/ProjectActivity.jsx", () => ({ ProjectActivity: () => null }));
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());
const user = { _id: "u", name: "Иван", lastName: "Иванов", email: "test@example.test" };
const project = { _id: "p", createdBy: user, name: "Проект", description: "", members: [{ user, role: "admin" }],
  categories: [{ _id: "c", name: "Категория", color: "#123456" }], invitations: [], templates: [] };
test("category cross opens a controlled confirmation, retains errors and removes on retry", async () => {
  apiFetch.mockImplementation(async (path, options) => {
    if (path === "/projects") return { projects: [project] };
    if (options?.method === "DELETE") throw new Error("Ошибка сохранения");
    return {};
  });
  render(<MemoryRouter initialEntries={["/app/projects/p"]}><Routes>
    <Route path="/app/projects/:projectId" element={<Projects user={user} />} />
  </Routes></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Удалить категорию Категория" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText(/Сами задачи сохранятся/)).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "Удалить", exact: true }));
  expect(await within(dialog).findByText("Ошибка сохранения")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Удалить категорию Категория" })).toBeInTheDocument();
  apiFetch.mockImplementation(async () => ({ project: { ...project, categories: [] }, categories: [] }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Удалить", exact: true }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Удалить категорию Категория" })).not.toBeInTheDocument());
  expect(apiFetch).toHaveBeenCalledWith("/projects/p/categories/c", { method: "DELETE" });
});
