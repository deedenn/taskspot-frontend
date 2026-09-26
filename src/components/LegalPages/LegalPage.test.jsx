import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LegalPage } from "./LegalPage.jsx";

afterEach(() => cleanup());

test.each([
  ["terms", "Пользовательское соглашение"],
  ["privacy", "Политика обработки персональных данных"]
])("public %s page shows the document and contact", (slug, title) => {
  render(
    <MemoryRouter initialEntries={[`/legal/${slug}`]}>
      <Routes>
        <Route path="/legal/:document" element={<LegalPage />} />
      </Routes>
    </MemoryRouter>
  );
  expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "help@taskspot.ru" })).toHaveAttribute("href", "mailto:help@taskspot.ru");
  expect(screen.getAllByText(/290134141359/).length).toBeGreaterThan(0);
});
