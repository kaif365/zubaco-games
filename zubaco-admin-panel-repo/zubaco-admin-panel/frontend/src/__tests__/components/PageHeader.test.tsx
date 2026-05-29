import { render, screen } from "@testing-library/react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";

describe("PageHeader", () => {
  it("renders the title", () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    render(<PageHeader title="Dashboard" description="Overview of metrics" />);
    expect(screen.getByText("Overview of metrics")).toBeInTheDocument();
  });

  it("does not render description when not provided", () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });

  it("renders action slot when provided", () => {
    render(
      <PageHeader
        title="Games"
        actions={<Button>Add Game</Button>}
      />
    );
    expect(screen.getByRole("button", { name: "Add Game" })).toBeInTheDocument();
  });
});
