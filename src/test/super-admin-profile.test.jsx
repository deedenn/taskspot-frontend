import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Profile } from "../components/Profile/Profile.jsx";
import { apiFetch } from "../api.js";

vi.mock("../api.js", () => ({ apiFetch: vi.fn() }));

beforeEach(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

it("forces a super administrator with a temporary password to set a permanent one", async () => {
  const auth = {
    user: {
      _id: "admin",
      name: "Администратор",
      lastName: "Taskspot",
      email: "admin@example.test",
      isSuperAdmin: true,
      mustChangePassword: true
    },
    setUser: vi.fn(),
    signOut: vi.fn()
  };
  apiFetch.mockResolvedValue({});

  render(<Profile auth={auth} />);

  expect(screen.getByText("Замените временный пароль")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Текущий пароль"), { target: { value: "qwerty12345" } });
  fireEvent.change(screen.getByLabelText("Новый пароль"), { target: { value: "New-admin-Password-123!" } });
  fireEvent.change(screen.getByLabelText("Повторите пароль"), { target: { value: "New-admin-Password-123!" } });
  fireEvent.click(screen.getByRole("button", { name: /Изменить пароль/ }));

  await waitFor(() =>
    expect(apiFetch).toHaveBeenCalledWith("/auth/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: "qwerty12345",
        newPassword: "New-admin-Password-123!"
      })
    })
  );
  expect(auth.signOut).toHaveBeenCalledOnce();
});
