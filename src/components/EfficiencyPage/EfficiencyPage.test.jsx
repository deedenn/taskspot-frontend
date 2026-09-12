import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { EfficiencyPage } from "./EfficiencyPage.jsx";

vi.mock("../../api.js", () => ({ apiFetch: vi.fn() }));

const factors = [
  { key: "timeliness", value: 80, weight: 40, evidence: { positive: 4, total: 5 } },
  { key: "delivery", value: 100, weight: 25, evidence: { positive: 5, total: 5 } },
  { key: "checklist", value: 90, weight: 20, evidence: { positive: 9, total: 10, actions: 8 } },
  { key: "quality", value: 75, weight: 15, evidence: { positive: 3, total: 4, returns: 1 } }
];

function scope(overrides = {}) {
  return {
    score: 84,
    previousScore: 76,
    delta: 8,
    band: { key: "strong", label: "Высокий темп" },
    confidence: { key: "medium", label: "Средняя точность" },
    stats: { sampleSize: 6, commitments: 5, submissions: 4, returns: 1 },
    factors,
    previousFactors: factors.map((factor) => ({ ...factor, value: factor.value - 5 })),
    nextAction: { factor: "quality", title: "Добавьте финальную самопроверку", description: "Сверьте результат с чек-листом." },
    xp: 128,
    ...overrides
  };
}

function response() {
  return {
    period: { key: "week", days: 7 },
    personal: scope(),
    team: scope({
      score: 72,
      previousScore: 75,
      delta: -3,
      projects: 3,
      factors: factors.map((factor) => factor.key === "timeliness"
        ? { ...factor, value: 60, evidence: { positive: 3, total: 5 } }
        : { ...factor, value: factor.value - 10 })
    }),
    rhythm: Array.from({ length: 7 }, (_, index) => ({
      key: String(index), from: `2026-09-0${index + 1}T00:00:00.000Z`, to: `2026-09-0${index + 2}T00:00:00.000Z`, submissions: index % 2, checklistActions: index, activity: index
    })),
    achievements: [
      { key: "deadline", title: "Хранитель сроков", description: "Не менее 3 обязательств", current: 3, target: 3, progress: 100, unlocked: true },
      { key: "captain", title: "Командный капитан", description: "Командный индекс", current: 3, target: 5, progress: 60, unlocked: false }
    ]
  };
}

beforeEach(() => {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  apiFetch.mockResolvedValue(response());
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it("shows personal and team efficiency with transparent factor evidence", async () => {
  render(<MemoryRouter initialEntries={["/app/efficiency"]}><EfficiencyPage /></MemoryRouter>);

  await screen.findByText("Личная эффективность");
  expect(apiFetch).toHaveBeenCalledWith("/reports/efficiency?period=week");
  expect(screen.getByText("+8 п.п.")).toBeInTheDocument();
  expect(screen.getByText("4 из 5 обязательств выполнено вовремя")).toBeInTheDocument();
  expect(screen.getByText("Хранитель сроков")).toBeInTheDocument();

  fireEvent.click(screen.getByText("Моя команда"));
  expect(screen.getByText("3 из 5 обязательств выполнено вовремя")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Как считается" }));
  expect(await screen.findByText(/40% — соблюдение сроков/)).toBeInTheDocument();
});

it("switches between equal seven and thirty day periods", async () => {
  render(<MemoryRouter initialEntries={["/app/efficiency"]}><EfficiencyPage /></MemoryRouter>);
  await screen.findByText("Личная эффективность");

  fireEvent.click(screen.getByText("30 дней"));
  await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/reports/efficiency?period=month"));
});
