// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { apiFetch } from "../../api.js";
import { BillingPage } from "./BillingPage.jsx";

vi.mock("../../api.js", () => ({ apiFetch: vi.fn() }));

const plans = [
  { key: "free", name: "Бесплатный", price: "0 ₽", monthlyPrice: 0, limits: { users: 3, projects: 2, activeTasks: 50, attachments: 5, templates: 3, recurringTasks: 0, historyDays: 30 } },
  { key: "team", name: "Команда", price: "990 ₽/мес", monthlyPrice: 990, limits: { users: 20, projects: 10, activeTasks: 1000, attachments: 100, templates: 50, recurringTasks: 100, historyDays: 365 } },
  { key: "business", name: "Бизнес", price: "2490 ₽/мес", monthlyPrice: 2490, limits: { users: 100, projects: 200, activeTasks: 10000, attachments: 5000, templates: 200, recurringTasks: 1000, historyDays: 0 } }
];

function billingPayload(plan = plans[0], billing = undefined) {
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
    plans,
    billing
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

test("real SBP payment shows the bank QR and has no manual confirmation", async () => {
  const realBilling = {
    testMode: false,
    ready: true,
    activeProvider: { key: "tochka_sbp", name: "СБП банка Точка", ready: true },
    note: "Оплата проходит через СБП банка Точка."
  };
  const order = {
    _id: "payment-order-real",
    status: "awaiting_payment",
    targetPlan: "team",
    planName: "Команда",
    periodMonths: 1,
    transitionType: "activate",
    amountKopecks: 99000,
    expiresAt: "2026-09-09T18:00:00.000Z",
    payment: {
      provider: "tochka_sbp",
      status: "pending",
      paymentUrl: "https://qr.nspk.ru/payment",
      qrImage: "data:image/png;base64,aW1hZ2U="
    }
  };
  apiFetch
    .mockResolvedValueOnce(billingPayload(plans[0], realBilling))
    .mockResolvedValueOnce({ paymentOrder: order, testMode: false });

  render(<BillingPage />);
  await screen.findByText("Безопасная оплата через СБП");
  const teamCard = screen.getByRole("heading", { name: "Команда" }).closest(".ant-card");
  fireEvent.click(within(teamCard).getByRole("button", { name: /Оплатить/ }));
  let dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Создать платёж" }));

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(
    "/organizations/organization-1/payment-orders",
    expect.objectContaining({ method: "POST" })
  ));
  dialog = await screen.findByRole("dialog");
  expect(await within(dialog).findByAltText("QR-код для оплаты через СБП")).toHaveAttribute("src", order.payment.qrImage);
  expect(within(dialog).getByRole("link", { name: "Открыть приложение банка" })).toHaveAttribute("href", order.payment.paymentUrl);
  expect(within(dialog).queryByRole("button", { name: "Я оплатил" })).not.toBeInTheDocument();
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
  const freeCard = screen.getByRole("heading", { name: "Бесплатный", level: 3 }).closest(".ant-card");
  expect(within(freeCard).getByText("Вложения: 5")).toBeInTheDocument();
  expect(within(teamCard).getByText("Активные проекты: 10")).toBeInTheDocument();
  expect(within(teamCard).getByText("Вложения: 100")).toBeInTheDocument();
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

test("ordinary organization member cannot see payments or start checkout", async () => {
  const payload = billingPayload();
  payload.organizations[0].canManageBilling = false;
  delete payload.organizations[0].subscription;
  apiFetch.mockResolvedValueOnce(payload);

  render(<BillingPage />);
  expect(await screen.findByText("Просмотр тарифа")).toBeInTheDocument();
  expect(screen.queryByText("История платежей")).not.toBeInTheDocument();
  expect(screen.queryByText(/Провайдер:/)).not.toBeInTheDocument();
  const teamCard = screen.getByRole("heading", { name: "Команда" }).closest(".ant-card");
  expect(within(teamCard).getByRole("button", { name: /Только для администратора/ })).toBeDisabled();
});

test("team to business upgrade requires accepting the no-credit policy", async () => {
  const order = {
    _id: "upgrade-order",
    targetPlan: "business",
    planName: "Бизнес",
    periodMonths: 1,
    transitionType: "upgrade",
    amountKopecks: 249000,
    payment: { provider: "mock", status: "pending" }
  };
  apiFetch
    .mockResolvedValueOnce(billingPayload(plans[1]))
    .mockResolvedValueOnce({ paymentOrder: order });

  render(<BillingPage />);
  await screen.findByText("Тестовая компания");
  const businessCard = screen.getByRole("heading", { name: "Бизнес" }).closest(".ant-card");
  fireEvent.click(within(businessCard).getByRole("button", { name: /Оплатить/ }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("Переход на «Бизнес» произойдёт сразу")).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "Создать платёж" }));
  expect(await within(dialog).findByText("Подтвердите условия немедленного перехода")).toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledTimes(1);

  fireEvent.click(within(dialog).getByRole("checkbox", { name: /остаток тарифа «Команда» не компенсируется/ }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Создать платёж" }));
  await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith(
    "/organizations/organization-1/payment-orders",
    expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"acceptImmediateUpgradeNoCredit":true')
    })
  ));
});
