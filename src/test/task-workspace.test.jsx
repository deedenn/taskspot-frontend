import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { App as AntApp } from "antd";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { TaskWorkspace } from "../components/Tasks/TaskWorkspace.jsx";
import { apiFetch } from "../api.js";

vi.mock("../api.js", () => ({ apiFetch: vi.fn(), isLimitError: () => false, limitErrorText: () => "" }));

const user = { _id: "user", name: "Анна", lastName: "Соколова", email: "anna@example.test" };
const project = { _id: "project", members: [{ user, role: "admin" }], categories: [], invitations: [] };
const task = (id, status = "open") => ({ _id: id, description: `Задача ${id}`, creator: user,
  assignee: user, observers: [], categories: [], comments: [], status, priority: "medium" });
const result = (tasks, page = 1, total = tasks.length) => ({ tasks, pagination: { page, limit: 25, total } });

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.search}</output>;
}

function openList(query = "") {
  return render(<AntApp><MemoryRouter initialEntries={[`/tasks${query}`]}>
    <TaskWorkspace project={project} currentUser={user} /><Location />
  </MemoryRouter></AntApp>);
}

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn(() => ({
    matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn()
  })) });
});

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("project task list requests", () => {
  it("keeps search focused during loading and ignores a late response", async () => {
    let resolveOlder;
    apiFetch.mockImplementation((path) => {
      const search = new URL(path, "http://test").searchParams.get("search");
      if (search === "old") return new Promise((resolve) => { resolveOlder = resolve; });
      return Promise.resolve(result([task(search || "initial")]));
    });
    openList();
    await screen.findByRole("link", { name: "Задача initial" });
    const input = screen.getByRole("searchbox", { name: "Поиск по задачам" });
    input.focus();
    fireEvent.change(input, { target: { value: "old" } });
    await waitFor(() => expect(resolveOlder).toBeTypeOf("function"));
    expect(input).toHaveFocus();
    expect(input).toBeVisible();
    fireEvent.change(input, { target: { value: "new" } });
    await screen.findByRole("link", { name: "Задача new" });
    await act(async () => resolveOlder(result([task("old")])));
    expect(screen.queryByRole("link", { name: "Задача old" })).toBeNull();
    expect(input).toHaveFocus();
  });

  it("restores URL pagination, resets it on search, and hides stale results on failure", async () => {
    apiFetch.mockImplementation((path) => {
      const params = new URL(path, "http://test").searchParams;
      if (params.get("search")) return Promise.reject(new Error("Ошибка теста"));
      return Promise.resolve(result([task("page3")], 3, 61));
    });
    openList("?page=3&sort=dueDate:asc");
    await screen.findByRole("link", { name: "Задача page3" });
    expect(new URL(apiFetch.mock.calls[0][0], "http://test").searchParams.get("page")).toBe("3");
    fireEvent.change(screen.getByRole("searchbox", { name: "Поиск по задачам" }), { target: { value: "missing" } });
    await screen.findByText("Ошибка теста");
    expect(screen.queryByRole("link", { name: "Задача page3" })).toBeNull();
    const params = new URLSearchParams(screen.getByTestId("location").textContent);
    expect(params.get("page")).toBeNull();
    expect(params.get("sort")).toBe("dueDate:asc");
    apiFetch.mockResolvedValue(result([task("retry")]));
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await screen.findByRole("link", { name: "Задача retry" });
  });

  it("reloads the filtered list and total after confirming completion", async () => {
    let closed = false;
    apiFetch.mockImplementation((_path, options) => {
      if (options?.method === "PATCH") {
        expect(JSON.parse(options.body).status).toBe("closed");
        closed = true;
        return Promise.resolve({ task: task("review", "closed") });
      }
      return Promise.resolve(result(closed ? [] : [task("review", "review")]));
    });
    openList("?status=review");
    await screen.findByRole("link", { name: "Задача review" });
    fireEvent.click(screen.getByRole("button", { name: /Подтвердить/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Изменить", exact: true }));
    await screen.findByText("Всего задач: 0");
    expect(screen.queryByRole("link", { name: "Задача review" })).toBeNull();
    expect(screen.getByTestId("location")).toHaveTextContent("status=review");
  });
});
