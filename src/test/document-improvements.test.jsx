import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ConfigProvider, DatePicker, Calendar } from "antd";
import ruRU from "antd/locale/ru_RU";
import dayjs from "dayjs";
import "../dateLocale.js";
import { GlobalSearch } from "../components/AppLayout/GlobalSearch.jsx";
import { TaskSearchPage } from "../components/ControlPage/TaskSearchPage.jsx";
import { AssigneeControl } from "../components/ControlPage/AssigneeControl.jsx";
import { apiFetch } from "../api.js";
vi.mock("../api.js", () => ({ apiFetch: vi.fn() }));
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

test("Russian date picker and calendar start their week on Monday", async () => {
  expect(dayjs().startOf("week").day()).toBe(1);
  const first = render(<ConfigProvider locale={ruRU}><DatePicker open value={dayjs("2026-09-07")} /></ConfigProvider>);
  await waitFor(() => expect(document.querySelector(".ant-picker-content thead th")?.textContent).toMatch(/пн/i));
  first.unmount();
  render(<ConfigProvider locale={ruRU}><Calendar value={dayjs("2026-09-07")} /></ConfigProvider>);
  expect(document.querySelector(".ant-picker-content thead th")?.textContent).toMatch(/пн/i);
});

test("global header search opens full results from another screen", async () => {
  apiFetch.mockResolvedValue({ tasks: [{ _id: "1", description: "Согласовать договор", project: { name: "Проект" }, status: "open" }],
    projects: [], pagination: { page: 1, limit: 20, total: 1 } });
  render(<MemoryRouter initialEntries={["/app/profile"]}>
    <GlobalSearch /><Routes><Route path="/app/profile" element={<p>Профиль</p>} />
      <Route path="/app/search" element={<TaskSearchPage />} /></Routes>
  </MemoryRouter>);
  const field = screen.getByRole("searchbox", { name: "Поиск по всем задачам" });
  fireEvent.change(field, { target: { value: "договор" } });
  fireEvent.keyDown(field, { key: "Enter", code: "Enter", charCode: 13 });
  expect(await screen.findByText("Согласовать договор")).toBeInTheDocument();
  expect(apiFetch.mock.calls[0][0]).toContain("/workspace/tasks?");
  expect(new URLSearchParams(apiFetch.mock.calls[0][0].split("?")[1]).get("q")).toBe("договор");
});

test("assignee control shows avatar, tasks and state counts without email", async () => {
  apiFetch.mockResolvedValue({ projects: [], people: [{ value: "u", label: "Иван Иванов" }],
    pagination: { page: 1, limit: 10, total: 1 },
    groups: [{ key: "u", name: "Иван Иванов", user: { name: "Иван", lastName: "Иванов", avatarUrl: "/avatar.png" },
      total: 1, open: 1, inProgress: 0, review: 0, closed: 0,
      tasks: [{ _id: "t", description: "Подготовить договор", status: "open", dueDate: "2026-09-10T12:00:00Z", project: { name: "Продажи" } }] }]
  });
  render(<MemoryRouter><AssigneeControl /></MemoryRouter>);
  expect(await screen.findByText("Иван Иванов")).toBeInTheDocument();
  expect(screen.getByAltText("Иван Иванов")).toHaveAttribute("src", "/avatar.png");
  expect(screen.getByText("Открыто: 1")).toBeInTheDocument();
  expect(screen.getByText("Подготовить договор")).toHaveAttribute("href", "/app/tasks/t");
  expect(screen.getByText("10.09.2026")).toBeInTheDocument();
});
