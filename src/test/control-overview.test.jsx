import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { apiFetch } from "../api.js";
import { ControlPage } from "../components/ControlPage/ControlPage.jsx";

vi.mock("../api.js", () => ({ apiFetch: vi.fn() }));

const report = {
  summary: { active: 8, overdue: 3, waitingReview: 2, closedThisMonth: 5 },
  overdue: [],
  waitingReview: [],
  byProject: [
    { key: "project-b", name: "Маркетинг", active: 3, overdue: 1, review: 0, closed: 2 },
    { key: "project-a", name: "Строительство", active: 5, overdue: 2, review: 2, closed: 3 }
  ],
  workloadByAssigneeProject: [
    {
      key: "user-b:project-a",
      projectKey: "project-a",
      project: "Строительство",
      assigneeKey: "user-b",
      assignee: "Анна Петрова",
      email: "anna@example.test",
      active: 2,
      overdue: 0,
      review: 2,
      closed: 1
    },
    {
      key: "unassigned:project-a",
      projectKey: "project-a",
      project: "Строительство",
      assigneeKey: "unassigned",
      assignee: "Без ответственного",
      email: "",
      active: 3,
      overdue: 2,
      review: 0,
      closed: 2
    },
    {
      key: "user-c:project-b",
      projectKey: "project-b",
      project: "Маркетинг",
      assigneeKey: "user-c",
      assignee: "Иван Сидоров",
      email: "ivan@example.test",
      active: 3,
      overdue: 1,
      review: 0,
      closed: 2
    }
  ]
};

beforeEach(() => {
  vi.clearAllMocks();
  apiFetch.mockResolvedValue(report);
});

afterEach(cleanup);

test("control overview groups assignees inside projects and prioritizes overdue projects", async () => {
  render(
    <MemoryRouter initialEntries={["/app/control"]}>
      <ControlPage />
    </MemoryRouter>
  );

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/reports/control"));
  const projectNames = await screen.findAllByText(/^(Строительство|Маркетинг)$/);
  expect(projectNames.map((node) => node.textContent)).toEqual(["Строительство", "Маркетинг"]);

  const construction = screen.getByText("Строительство").closest(".control-page__project");
  expect(construction).not.toBeNull();
  fireEvent.click(within(construction).getByRole("button", { name: "Раскрыть проект Строительство" }));

  expect(within(construction).getByText("Без ответственного")).toBeInTheDocument();
  expect(within(construction).getByText("Анна Петрова")).toBeInTheDocument();
  expect(within(construction).queryByText("Иван Сидоров")).not.toBeInTheDocument();
});

test("overdue totals link to the dashboard with the matching filters", async () => {
  render(
    <MemoryRouter initialEntries={["/app/control"]}>
      <ControlPage />
    </MemoryRouter>
  );

  const totalLink = await screen.findByRole("link", { name: "Открыть просроченные задачи: 3" });
  expect(totalLink).toHaveAttribute("href", "/app/dashboard?focus=overdue");

  const construction = screen.getByText("Строительство").closest(".control-page__project");
  const projectLink = within(construction).getByRole("link", { name: /Просрочены/ });
  expect(projectLink).toHaveAttribute("href", "/app/dashboard?focus=overdue&project=project-a");
});
