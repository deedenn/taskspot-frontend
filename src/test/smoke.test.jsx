import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LandingPage } from "../components/LandingPage/LandingPage.jsx";

describe("Taskspot frontend smoke", () => {
  it("renders the public landing page and switches real product screens", async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(screen.getAllByRole("img", { name: "Taskspot", exact: true })).not.toHaveLength(0);
    expect(screen.getByRole("heading", { level: 1, name: /Поручения не теряются/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /Увеличивайте лимиты/i })).toBeInTheDocument();
    expect(screen.getByText("990 ₽")).toBeInTheDocument();
    expect(screen.getByText("2 490 ₽")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /реальным рабочим списком/i })).toHaveAttribute(
      "src",
      "/screenshots/manager-dashboard.png"
    );

    const managerTab = screen.getByRole("tab", { name: "Руководитель" });
    managerTab.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Сотрудник" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("img", { name: /Мобильный рабочий список/i })).toBeInTheDocument();
  });
});
