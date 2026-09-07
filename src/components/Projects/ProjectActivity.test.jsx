// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ProjectActivity } from "./ProjectActivity.jsx";
import { apiFetch } from "../../api.js";
vi.mock("../../api.js", () => ({ apiFetch: vi.fn() }));
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); });
test("journal loads on demand and shows Russian events", async () => {
  apiFetch.mockResolvedValue({ items: [{ _id: "a", action: "category_added", target: "Продажи", actorName: "Иван Иванов", at: "2026-09-06T12:00:00Z" }], total: 1, capacity: 2000 });
  render(<ProjectActivity projectId="project" revision="1" />);
  expect(apiFetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Журнал" }));
  expect(await screen.findByText("Добавлена категория")).toBeInTheDocument();
  expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledWith("/projects/project/activity?page=1&limit=20");
});
test("journal displays a retryable API failure", async () => {
  apiFetch.mockRejectedValueOnce(new Error("Доступ запрещён")).mockResolvedValue({ items: [], total: 0 });
  render(<ProjectActivity projectId="project" />);
  fireEvent.click(screen.getByRole("button", { name: "Журнал" }));
  expect(await screen.findByText("Доступ запрещён")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
  await waitFor(() => expect(screen.getByText("Журнал пока пуст")).toBeInTheDocument());
});
