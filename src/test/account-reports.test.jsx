import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuthPage } from "../components/AuthPage/AuthPage.jsx";
import { PasswordRecovery } from "../components/AuthPage/PasswordRecovery.jsx";
import { PeriodReport } from "../components/ControlPage/PeriodReport.jsx";
import { ProductAnalytics } from "../components/AdminDashboard/ProductAnalytics.jsx";
import { apiFetch } from "../api.js";
vi.mock("../api.js", () => ({ apiFetch: vi.fn() }));
beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({ matches: false, media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  const computed = window.getComputedStyle;
  vi.spyOn(window, "getComputedStyle").mockImplementation((element) => computed(element));
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.resetAllMocks(); });
it("forgot password sends email and displays a non-enumerating response", async () => {
  apiFetch.mockResolvedValue({});
  render(<MemoryRouter><PasswordRecovery auth={{ signOut: vi.fn() }} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.test" } });
  fireEvent.click(screen.getByRole("button", { name: "Отправить ссылку" }));
  await screen.findByText("Проверьте почту");
  expect(apiFetch).toHaveBeenCalledWith("/auth/password/forgot", expect.objectContaining({ body: JSON.stringify({ email: "user@example.test" }) }));
});
it("reset consumes the link and signs out old sessions only after success", async () => {
  const auth = { signOut: vi.fn() };
  apiFetch.mockResolvedValue({});
  render(<MemoryRouter initialEntries={["/reset-password?token=abc"]}><PasswordRecovery reset auth={auth} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Новый пароль"), { target: { value: "Password-123!" } });
  fireEvent.change(screen.getByLabelText("Повторите пароль"), { target: { value: "Password-123!" } });
  fireEvent.click(screen.getByRole("button", { name: "Изменить пароль" }));
  await screen.findByText("Пароль изменён");
  expect(auth.signOut).toHaveBeenCalledOnce();
  expect(apiFetch).toHaveBeenCalledWith("/auth/password/reset", expect.objectContaining({ body: JSON.stringify({ token: "abc", password: "Password-123!" }) }));
});
it("missing reset token does not offer a password submission", () => {
  render(<MemoryRouter><PasswordRecovery reset auth={{}} /></MemoryRouter>);
  expect(screen.getByText("В ссылке нет кода восстановления")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Изменить пароль" })).toBeNull();
});
it("admin login waits for an email code instead of navigating after password", async () => {
  const auth = { signIn: vi.fn().mockResolvedValue({ requiresAdminCode: true, challengeId: "challenge" }) };
  render(<MemoryRouter><AuthPage mode="login" auth={auth} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.test" } });
  fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "Strong-admin-123!" } });
  fireEvent.click(screen.getByRole("button", { name: "Войти" }));
  await screen.findByLabelText("Код из письма");
  auth.signIn.mockRejectedValueOnce(new Error("Код неверен"));
  fireEvent.change(screen.getByLabelText("Код из письма"), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "Войти" }));
  await screen.findByText("Код неверен");
  expect(auth.signIn).toHaveBeenLastCalledWith("/auth/login/code", { challengeId: "challenge", code: "123456" });
});
it("period reports support grouping and expose request errors with retry", async () => {
  apiFetch.mockRejectedValueOnce(new Error("Отчёт недоступен")).mockResolvedValue({
    summary: { created: 2, closed: 1, previousClosed: 0 }, projectsFilter: [],
    projects: [{ key: "p", name: "Наш проект", created: 2, closed: 1 }],
    assignees: [{ key: "u", name: "Анна Смирнова", created: 2, closed: 1 }]
  });
  render(<PeriodReport />);
  await screen.findByText("Отчёт недоступен");
  fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
  await screen.findByText("Наш проект");
  fireEvent.click(screen.getByText("Ответственные", { exact: true }));
  await screen.findByText("Анна Смирнова");
  expect(apiFetch).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("button", { name: "CSV для Excel" })).toBeEnabled();
});
it("analytics does not display immature D7 as zero percent", async () => {
  apiFetch.mockResolvedValue({ registered: 1, withoutTask: 1, revenue: 0, d7: { percent: null, eligible: 0, returned: 0 }, milestones: [], daily: [], coverageStart: null });
  render(<ProductAnalytics />);
  await screen.findByText(/История посещений пока не накоплена/);
  const label = screen.getByText("Возврат на 7-й день");
  expect(label.parentElement.textContent).toContain("—");
});
