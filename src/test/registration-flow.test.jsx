// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { StrictMode } from "react";
import { apiFetch, setToken } from "../api.js";
import { AuthPage } from "../components/AuthPage/AuthPage.jsx";
import { VerifyEmail } from "../components/VerifyEmail/VerifyEmail.jsx";

vi.mock("../api.js", () => ({
  apiFetch: vi.fn(),
  setToken: vi.fn()
}));

function CurrentLocation() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

describe("registration and email verification flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => cleanup());

  it("keeps the check-mail step and resends the verification link", async () => {
    apiFetch
      .mockResolvedValueOnce({
        requiresEmailVerification: true,
        email: "new@example.com",
        emailDeliveryStatus: "pending"
      })
      .mockResolvedValueOnce({ ok: true, emailDeliveryStatus: "pending" });
    render(
      <MemoryRouter initialEntries={["/register"]}>
        <AuthPage mode="register" auth={{ user: null, signIn: vi.fn() }} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Анна" } });
    fireEvent.change(screen.getByLabelText("Фамилия"), { target: { value: "Смирнова" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Создать аккаунт" }));

    expect(await screen.findByRole("heading", { name: "Подтвердите email" })).toBeInTheDocument();
    expect(screen.getByText(/автоматически создадим проект «Проект»/i)).toBeInTheDocument();
    expect(screen.getByText(/Free назначится автоматически/i)).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem("taskspot_registration_check_mail"))).toMatchObject({
      email: "new@example.com",
      source: "register"
    });

    fireEvent.click(screen.getByRole("button", { name: "Отправить письмо повторно" }));
    expect(await screen.findByText(/Письмо в очереди на отправку/i)).toBeInTheDocument();
    expect(apiFetch).toHaveBeenLastCalledWith("/auth/email/resend", {
      method: "POST",
      body: JSON.stringify({ email: "new@example.com" })
    });
  });

  it("turns an unverified login response into the same recoverable check-mail step", async () => {
    const auth = {
      user: null,
      signIn: vi.fn().mockRejectedValue({
        message: "Подтвердите email",
        data: { requiresEmailVerification: true, email: "pending@example.com" }
      })
    };
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthPage mode="login" auth={auth} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "pending@example.com" } });
    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    expect(await screen.findByRole("heading", { name: "Подтвердите email" })).toBeInTheDocument();
    expect(screen.getByText(/аккаунт уже зарегистрирован, но email ещё не подтверждён/i)).toBeInTheDocument();
  });

  it("activates the session and opens the provisioned project for the first task", async () => {
    apiFetch.mockResolvedValueOnce({
      token: "session-token",
      user: { _id: "user-1", email: "new@example.com" },
      onboarding: { projectId: "project-1", projectName: "Проект", plan: "free" }
    });
    const auth = { setUser: vi.fn() };
    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/verify-email?token=verification-token"]}>
          <Routes>
            <Route path="/verify-email" element={<VerifyEmail auth={auth} />} />
            <Route path="*" element={<CurrentLocation />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>
    );

    expect(await screen.findByRole("heading", { name: "Email подтвержден" })).toBeInTheDocument();
    expect(setToken).toHaveBeenCalledWith("session-token");
    expect(auth.setUser).toHaveBeenCalledWith(expect.objectContaining({ _id: "user-1" }));
    expect(apiFetch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Создать первую задачу" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/app/projects/project-1/tasks");
  });

  it("recovers from an expired link without asking the user to register again", async () => {
    apiFetch
      .mockRejectedValueOnce({ message: "Verification link is invalid or expired", status: 400 })
      .mockResolvedValueOnce({ ok: true, emailDeliveryStatus: "pending" });
    render(
      <MemoryRouter initialEntries={["/verify-email?token=expired-token"]}>
        <VerifyEmail auth={{ setUser: vi.fn() }} />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Ссылка устарела или неверна" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Отправить новую ссылку" }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/auth/email/resend", {
      method: "POST",
      body: JSON.stringify({ email: "new@example.com" })
    }));
    expect(screen.queryByText(/Зарегистрироваться заново/i)).not.toBeInTheDocument();
    expect(await screen.findByText(/Новая ссылка отправляется/i)).toBeInTheDocument();
  });
});
