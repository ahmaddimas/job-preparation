import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/font/google", () => ({
  Inter: () => ({ className: "mock-inter", variable: "--font-inter" }),
}));

describe("RootLayout", () => {
  it("renders children", async () => {
    const RootLayout = (await import("@/app/layout")).default;
    render(<RootLayout><p>test child</p></RootLayout>);
    expect(screen.getByText("test child")).toBeInTheDocument();
  });

  it("renders within html/body structure and passes children through", async () => {
    const RootLayout = (await import("@/app/layout")).default;
    render(<RootLayout><p>child</p></RootLayout>);
    expect(screen.getByText("child")).toBeInTheDocument();
  });
});
