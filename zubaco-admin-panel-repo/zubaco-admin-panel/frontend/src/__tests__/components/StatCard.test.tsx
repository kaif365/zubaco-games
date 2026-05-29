import { render, screen } from "@testing-library/react";
import { StatCard } from "@/components/shared/StatCard";
import { Users } from "lucide-react";

describe("StatCard", () => {
  const baseProps = {
    title: "Total Users",
    value: 1284,
    icon: Users,
  };

  it("renders the title", () => {
    render(<StatCard {...baseProps} />);
    expect(screen.getByText("Total Users")).toBeInTheDocument();
  });

  it("renders the formatted value", () => {
    render(<StatCard {...baseProps} />);
    expect(screen.getByText("1,284")).toBeInTheDocument();
  });

  it("renders positive growth with + sign", () => {
    render(<StatCard {...baseProps} growth={12.3} />);
    expect(screen.getByText(/\+12\.3%/)).toBeInTheDocument();
  });

  it("renders negative growth with - sign", () => {
    render(<StatCard {...baseProps} growth={-5.5} />);
    expect(screen.getByText(/5\.5%/)).toBeInTheDocument();
  });

  it("does not render growth when not provided", () => {
    render(<StatCard {...baseProps} />);
    expect(screen.queryByText(/vs last month/)).not.toBeInTheDocument();
  });

  it("renders loading skeleton when isLoading is true", () => {
    const { container } = render(<StatCard {...baseProps} isLoading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("does not render value when loading", () => {
    render(<StatCard {...baseProps} isLoading />);
    expect(screen.queryByText("1,284")).not.toBeInTheDocument();
  });
});
