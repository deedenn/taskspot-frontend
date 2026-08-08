import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LandingPage } from "../components/LandingPage/LandingPage.jsx";

describe("Taskspot frontend smoke", () => {
  it("renders the public landing page", () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Taskspot/i)).toBeInTheDocument();
  });
});
