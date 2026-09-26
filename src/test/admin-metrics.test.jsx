import { cleanup, render, screen } from "@testing-library/react";
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
