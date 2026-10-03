import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AdminDashboard } from "../components/AdminDashboard/AdminDashboard.jsx";
import { apiFetch } from "../api.js";

vi.mock("../api.js", () => ({ apiFetch: vi.fn() }));

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
  apiFetch.mockImplementation((path) => {
    if (path.startsWith("/admin/users")) return Promise.resolve({ users: [], pagination: { page: 1, limit: 10, total: 0 } });
    if (path.startsWith("/admin/billing-requests")) return Promise.resolve({ billingRequests: [] });
    if (path === "/admin/payment-orders/order-1") return Promise.resolve({
      fiscalizationMaxAttempts: 12,
      paymentOrder: {
        _id: "order-1",
        organization: { name: "Компания" },
        requestedBy: { name: "Иван", email: "buyer@example.com" },
        planName: "Команда",
        periodMonths: 1,
        amountKopecks: 99000,
        status: "paid",
        createdAt: "2026-10-03T12:00:00.000Z",
        payment: { provider: "tochka_sbp", providerPaymentId: "qrc-1", operationId: "operation-1" },
        fiscalization: {
          status: "failed",
          attempts: 12,
          automaticAttempts: 12,
          errorCode: "DIGITALKASSA_TIMEOUT",
          errorMessage: "DigitalKassa не ответила вовремя",
          exhaustedAt: "2026-10-03T12:10:00.000Z",
          adminNotifiedAt: "2026-10-03T12:11:00.000Z",
          attemptLog: [{ attempt: 12, trigger: "worker", action: "create", status: "failed", startedAt: "2026-10-03T12:10:00.000Z", errorCode: "DIGITALKASSA_TIMEOUT", errorMessage: "Timeout" }]
        },
        refunds: []
      },
      events: [{ _id: "event-1", occurredAt: "2026-10-03T12:00:00.000Z", type: "PaymentSucceeded", actorType: "provider", payload: {} }]
    });
    if (path === "/admin/payment-orders/order-1/fiscalization/retry") return Promise.resolve({ message: "Повторная фискализация запущена" });
    if (path.startsWith("/admin/payment-orders?")) return Promise.resolve({ paymentOrders: [{
      _id: "order-1",
      organization: { name: "Компания" },
      requestedBy: { name: "Иван" },
      planName: "Команда",
      amountKopecks: 99000,
      status: "paid",
      createdAt: "2026-10-03T12:00:00.000Z",
      payment: { provider: "tochka_sbp", rail: "sbp" },
      fiscalization: { status: "failed" },
      refunds: []
    }] });
    return Promise.resolve({
      users: { total: 42, active: 18, inactive: 23, blocked: 1, newInPeriod: 7, activationRate: 43 },
      engagement: { dau: 8, wau: 14, mau: 18, dauMau: 44, wauMau: 78, activeOrganizations: 11, collaborativeOrganizations: 6, collaborationRate: 40, coverageStart: "2026-09-01" },
      organizations: { total: 15, paid: 4, manualPlans: 0, expiringPaid: 1, expiredPaid: 0, byPlan: [] },
      revenue: { receivedInPeriod: 12000, averageCheck: 3000, estimatedMonthly: 16000, estimatedAnnual: 192000, paidConversionRate: 27, paymentConversionRate: 75 },
      billing: { pendingRequests: 0, approvedInPeriod: 0, pendingPaymentOrders: 1, paidPaymentOrdersInPeriod: 3, failedPaymentOrdersInPeriod: 1 },
      projects: { total: 20, newInPeriod: 4 },
      tasks: { total: 80, active: 30, closed: 50, review: 4, overdue: 2, createdInPeriod: 12, completedInPeriod: 10, completionRate: 63 },
      growth: {
        newUsers: { current: 7, previous: 5, change: 40 },
        newProjects: { current: 4, previous: 4, change: 0 },
        createdTasks: { current: 12, previous: 10, change: 20 },
        completedTasks: { current: 10, previous: 8, change: 25 }
      },
      operations: { status: "healthy", billingReady: true, emailQueued: 0, emailFailed: 0, fiscalizationPending: 0, fiscalizationFailed: 0, requests24h: 840, serverErrors24h: 0, serverErrorRate: 0, averageResponseMs: 42 },
      recentUsers: []
    });
  });
});

it("opens payment diagnostics and allows a manual fiscalization retry", async () => {
  render(<AdminDashboard currentUser={{ isSuperAdmin: true }} auth={{}} />);
  fireEvent.click(await screen.findByRole("button", { name: "Подробнее" }));
  expect(await screen.findByText("Карточка платежа")).toBeInTheDocument();
  expect(screen.getByText("Автоматические попытки исчерпаны")).toBeInTheDocument();
  expect(screen.getByText("DIGITALKASSA_TIMEOUT")).toBeInTheDocument();
  expect(screen.getByText("PaymentSucceeded")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Повторить вручную/ }));
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(
    "/admin/payment-orders/order-1/fiscalization/retry",
    { method: "POST", body: "{}" }
  ));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("shows engagement, money and operational health without an external analytics counter", async () => {
  render(<AdminDashboard currentUser={{ isSuperAdmin: true }} auth={{}} />);

  expect(await screen.findByText("Все ключевые контуры работают")).toBeInTheDocument();
  expect(screen.getByText("DAU · сегодня").parentElement).toHaveTextContent("8");
  expect(screen.getByText("Липкость DAU / MAU").parentElement).toHaveTextContent("44%");
  expect(screen.getByText("Выручка за период")).toBeInTheDocument();
  expect(screen.getByText("СБП готова")).toBeInTheDocument();
  expect(screen.getByText(/API за 24 ч: 840 запросов/)).toBeInTheDocument();
  expect(screen.getAllByText("+40% к прошлому периоду")).toHaveLength(2);
});
