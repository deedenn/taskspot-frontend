import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { apiFetch } from "../api.js";
import { Projects } from "../components/Projects/Projects.jsx";

vi.mock("../api.js", () => ({
  apiFetch: vi.fn(),
  isLimitError: () => false,
  limitErrorText: (error) => error.message
}));
vi.mock("../components/Projects/ProjectActivity.jsx", () => ({ ProjectActivity: () => null }));

const creator = { _id: "creator", name: "Иван", lastName: "Иванов", email: "creator@example.test" };
const admin = { _id: "admin", name: "Анна", lastName: "Смирнова", email: "admin@example.test" };

function projectFor() {
  return {
    _id: "project",
    createdBy: creator,
    name: "Проект",
    description: "",
    members: [{ user: creator, role: "admin" }, { user: admin, role: "admin" }],
    categories: [{ _id: "category", name: "Документы", color: "#123456" }],
    invitations: [],
    templates: []
  };
}

function renderProjects(user) {
  return render(
    <MemoryRouter initialEntries={["/app/projects/project"]}>
      <Routes>
        <Route path="/app/projects/:projectId" element={<Projects user={user} />} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("category editing", () => {
  it("lets the project creator rename a category while preserving its selected color", async () => {
    const project = projectFor();
    const updatedProject = {
      ...project,
      categories: [{ _id: "category", name: "Договоры", color: "#123456" }]
    };
    apiFetch.mockImplementation(async (path, options) => {
      if (path === "/projects") return { projects: [project] };
      if (options?.method === "PATCH") return { project: updatedProject, category: updatedProject.categories[0] };
      return {};
    });

    renderProjects(creator);
    fireEvent.click(await screen.findByRole("button", { name: "Редактировать категорию Документы" }));
    const dialog = await screen.findByRole("dialog", { name: "Редактировать категорию" });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Название категории" }), {
      target: { value: "Договоры" }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Сохранить" }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(
      "/projects/project/categories/category",
      { method: "PATCH", body: JSON.stringify({ name: "Договоры", color: "#123456" }) }
    ));
    expect(await screen.findByRole("button", { name: "Редактировать категорию Договоры" })).toBeInTheDocument();
  }, 15000);

  it("does not show category editing to an administrator who did not create the project", async () => {
    apiFetch.mockResolvedValue({ projects: [projectFor()] });
    renderProjects(admin);

    expect(await screen.findByRole("button", { name: "Удалить категорию Документы" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Редактировать категорию Документы" })).not.toBeInTheDocument();
  });
});
