import { afterEach, expect, test, vi } from "vitest";
import { apiFetch, ApiError } from "../api.js";

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

test("api limit error emits one global notice with usage and an upgrade action", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: false,
    status: 402,
    json: async () => ({
      code: "limit_exceeded",
      key: "activeTasks",
      message: "Лимит активных задач исчерпан",
      organization: { id: "organization", name: "Компания" },
      plan: { key: "free", name: "Free" },
      usage: { used: 10, requested: 1, limit: 10 }
    })
  }));
  const listener = vi.fn();
  window.addEventListener("taskspot:plan-limit", listener, { once: true });

  await expect(apiFetch("/tasks", { method: "POST", body: "{}" })).rejects.toMatchObject({
    name: "ApiError",
    status: 402
  });

  expect(listener).toHaveBeenCalledOnce();
  expect(listener.mock.calls[0][0].detail).toMatchObject({
    key: "activeTasks",
    message: expect.stringContaining("Перейдите на другой тариф"),
    usage: { used: 10, requested: 1, limit: 10 }
  });
  expect(listener.mock.calls[0][0].detail.message).toContain("10 / 10 на тарифе «Free»");
  expect(ApiError).toBeTypeOf("function");
});
