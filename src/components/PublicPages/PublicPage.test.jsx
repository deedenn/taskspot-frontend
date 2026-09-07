import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter } from "react-router-dom";
import { PublicPage } from "./PublicPage.jsx";
import { getPageMetadata } from "./renderer.js";

afterEach(cleanup);

describe("PublicPage route integration", () => {
  it("renders a public article, updates head metadata on navigation and restores the previous head", () => {
    const previous = document.createElement("meta");
    previous.name = "description";
    previous.content = "Previous application description";
    document.head.append(previous);
    const title = document.title;
    const { unmount } = render(
      <MemoryRouter initialEntries={["/resources/delegation/"]}>
        <Link to="/solutions/owner/">Next route</Link>
        <PublicPage />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Как поставить поручение, которое можно проверить");
    expect(document.title).toBe(getPageMetadata("/resources/delegation/").title);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    fireEvent.click(screen.getByRole("link", { name: "Next route" }));
    expect(document.title).toBe(getPageMetadata("/solutions/owner/").title);
    expect(document.head.querySelector('link[rel="canonical"]').href).toBe("https://taskspot.ru/solutions/owner/");
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);
    unmount();
    expect(document.title).toBe(title);
    expect(document.head.querySelector('meta[name="description"]')).toBe(previous);
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    previous.remove();
  });

  it("provides a native downloadable file without authentication", () => {
    render(<MemoryRouter initialEntries={["/resources/task-register/"]}><PublicPage /></MemoryRouter>);
    for (const link of screen.getAllByRole("link", { name: "Скачать CSV" })) {
      expect(link.getAttribute("href")).toBe("/resources/downloads/task-register.csv");
      expect(link.getAttribute("download")).toBe("task-register.csv");
    }
  });

  it("does not interpolate unknown route input", () => {
    render(<MemoryRouter initialEntries={["/resources/unknown/"]}><PublicPage /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Страница не найдена");
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });
});
