// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { apiFetch } from "../../api.js";
import { BillingPage } from "./BillingPage.jsx";

vi.mock("../../api.js", () => ({ apiFetch: vi.fn() }));

const plans = [
  { key: "free", name: "Бесплатный", price: "0 ₽", monthlyPrice: 0, limits: { users: 3, projects: 2, activeTasks: 50, attachments: 20, templates: 3, recurringTasks: 0, historyDays: 30 } },
  { key: "team", name: "Команда", price: "990 ₽/мес", monthlyPrice: 990, limits: { users: 20, projects: 50, activeTasks: 1000, attachments: 500, templates: 50, recurringTasks: 100, historyDays: 365 } },
  { key: "business", name: "Бизнес", price: "2490 ₽/мес", monthlyPrice: 2490, limits: { users: 100, projects: 200, activeTasks: 10000, attachments: 5000, templates: 200, recurringTasks: 1000, historyDays: 0 } }
];

function billingPayload(plan = plans[0]) {
  return {
    organizations: [{
      organization: { _id: "organization-1", name: "Тестовая компания", plan: plan.key },
      plan,
      limits: plan.limits,
      usage: { users: 0, projects: 0, activeTasks: 0, attachments: 0, templates: 0, recurringTasks: 0 },
      subscription: { _id: "subscription-1", currentPlan: plan.key, currentPeriod: { plan: plan.key }, scheduledPeriod: null },
      activePaymentOrder: null,
      paymentOrders: []
    }],
    plans
  };
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {}
  }));
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

test("test payment creates an order and confirms the subscription", async () => {
  const order = {
    _id: "payment-order-1",
    targetPlan: "team",
    planName: "Команда",
    periodMonths: 1,
    transitionType: "activate",
    amountKopecks: 99000,
    expiresAt: "2026-09-09T18:00:00.000Z",
    payment: { provider: "mock", status: "pending" }
  };
  apiFetch
    .mockResolvedValueOnce(billingPayload())
    .mockResolvedValueOnce({ paymentOrder: order })
    .mockResolvedValueOnce({ paymentOrder: { ...order, status: "paid" }, message: "Оплата подтверждена, тариф обновлён" })
    .mockResolvedValueOnce(billingPayload(plans[1]));

  render(<BillingPage />);
  await screen.findByText("Тестовая компания");
  const teamCard = screen.getByRole("heading", { name: "Команда" }).closest(".ant-card");
  fireEvent.click(within(teamCard).getByRole("button", { name: /Оплатить/ }));

  let dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Создать платёж" }));
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(
    "/organizations/organization-1/payment-orders",
    expect.objectContaining({ method: "POST" })
  ));

  dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Я оплатил" }));
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(
    "/organizations/organization-1/payment-orders/payment-order-1/confirm",
    { method: "POST" }
  ));
  await waitFor(() => expect(screen.getAllByText("Команда").length).toBeGreaterThan(1));
});
