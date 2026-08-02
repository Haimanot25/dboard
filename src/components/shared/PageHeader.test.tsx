import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { PageHeader } from "./PageHeader";

vi.mock("next/link", () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: ({ children, href, ...props }: any) => (
      <a href={href} {...props}>
        {children}
      </a>
    ),
  };
});

describe("PageHeader", () => {
  it("renders title", () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<PageHeader title="Test" description="Test description" />);
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("renders breadcrumbs", () => {
    render(
      <PageHeader
        title="My Page"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Current" },
        ]}
      />,
    );
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
  });

  it("renders actions", () => {
    render(
      <PageHeader title="Page" actions={<button>Add</button>} />,
    );
    expect(screen.getByText("Add")).toBeInTheDocument();
  });
});
