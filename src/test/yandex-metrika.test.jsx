// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { YandexMetrikaRouteTracker } from "../analytics/YandexMetrikaRouteTracker.jsx";
import {
  buildAnalyticsUrl,
  reachYandexGoal,
  trackYandexPageView,
  YANDEX_METRIKA_GOALS,
  YANDEX_METRIKA_ID
} from "../analytics/yandexMetrika.js";

function NavigateToDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/app/dashboard?project=secret-project&q=private-task");
  }, [navigate]);

  return null;
}

describe("Yandex Metrika", () => {
  beforeEach(() => {
    window.ym = vi.fn();
  });

  afterEach(() => {
    cleanup();
    delete window.ym;
  });

  it("keeps marketing attribution but removes tokens and arbitrary query data", () => {
    expect(
      buildAnalyticsUrl(
        {
          pathname: "/verify-email",
          search: "?token=secret&utm_source=yandex&utm_campaign=launch&q=private"
        },
        "https://taskspot.ru"
      )
    ).toBe("https://taskspot.ru/verify-email?utm_source=yandex&utm_campaign=launch");
    expect(
      buildAnalyticsUrl(
        {
          pathname: "/app/tasks/507f1f77bcf86cd799439011",
          search: "?q=private-task"
        },
        "https://taskspot.ru"
      )
    ).toBe("https://taskspot.ru/app/tasks/:taskId");
  });

  it("sends page views and registration goals to the configured counter", () => {
    expect(trackYandexPageView("https://taskspot.ru/register", { referer: "https://yandex.ru" })).toBe(true);
    expect(reachYandexGoal(YANDEX_METRIKA_GOALS.registrationCompleted)).toBe(true);

    expect(window.ym).toHaveBeenNthCalledWith(
      1,
      YANDEX_METRIKA_ID,
      "hit",
      "https://taskspot.ru/register",
      expect.objectContaining({ referer: "https://yandex.ru" })
    );
    expect(window.ym).toHaveBeenNthCalledWith(2, YANDEX_METRIKA_ID, "reachGoal", "ym-register", undefined);
  });

  it("tracks SPA navigation without exposing application filters", async () => {
    render(
      <MemoryRouter initialEntries={["/register?utm_source=yandex"]}>
        <YandexMetrikaRouteTracker />
        <NavigateToDashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(window.ym).toHaveBeenCalledTimes(2));
    expect(window.ym.mock.calls[0][2]).toBe(`${window.location.origin}/register?utm_source=yandex`);
    expect(window.ym.mock.calls[1][2]).toBe(`${window.location.origin}/app/dashboard`);
  });
});
