import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "@/components/Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card id="test-card"><p>hello</p></Card>);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<Card id="test" className="custom-class">content</Card>);
    expect(screen.getByText("content")).toHaveClass("custom-class");
  });

  it("uses default animation delay", () => {
    render(<Card id="test">content</Card>);
    expect(screen.getByText("content").style.animationDelay).toBe("0ms");
  });

  it("applies custom animation delay", () => {
    render(<Card id="test" delay={500}>content</Card>);
    expect(screen.getByText("content").style.animationDelay).toBe("500ms");
  });

  it("renders with the correct id", () => {
    render(<Card id="my-card">content</Card>);
    expect(screen.getByText("content")).toHaveAttribute("id", "my-card");
  });
});
