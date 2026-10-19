import { App as AntApp } from "antd";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/AppLayout/AppLayout.jsx";
import { apiFetch } from "../api.js";

vi.mock("../api.js", () => ({ apiFetch: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  apiFetch.mockResolvedValue({ notifications: [] });
  window.matchMedia = (query) => ({
    matches: query.includes("min-width"),
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; }
  });
});

afterEach(cleanup);

test("application shows an upgrade dialog for every plan-limit event", async () => {
  const auth = {
    user: { _id: "user", name: "Иван", email: "user@example.test" },
    signOut: vi.fn()
  };

  render(
    <AntApp>
      <MemoryRouter initialEntries={["/app"]}>
        <Routes>
          <Route path="/app" element={<AppLayout auth={auth} />}>
            <Route index element={<div>Главная</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AntApp>
  );

  act(() => {
    window.dispatchEvent(new CustomEvent("taskspot:plan-limit", {
      detail: {
        key: "activeTasks",
        message: "Лимит активных задач: 10 / 10. Перейдите на другой тариф, чтобы продолжить работу.",
        organization: { id: "organization", name: "Компания" },
        usage: { used: 10, limit: 10 }
      }
    }));
  });

  expect(await screen.findByRole("dialog", { name: "Действие недоступно на текущем тарифе" })).toBeInTheDocument();
  expect(screen.getByText(/Лимит активных задач: 10 \/ 10/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Перейти в тарифы" })).toBeInTheDocument();
});
