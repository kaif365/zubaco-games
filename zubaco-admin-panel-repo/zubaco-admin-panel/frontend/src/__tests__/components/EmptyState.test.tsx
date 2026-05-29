import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";

describe("EmptyState", () => {
  it("renders the default title", () => {
    render(<EmptyState />);
    expect(screen.getByText("No results found")).toBeInTheDocument();
  });

  it("renders custom title", () => {
    render(<EmptyState title="No games yet" />);
    expect(screen.getByText("No games yet")).toBeInTheDocument();
  });

  it("renders custom description", () => {
    render(<EmptyState description="Add your first game to get started." />);
    expect(screen.getByText("Add your first game to get started.")).toBeInTheDocument();
  });

  it("renders action when provided", () => {
    render(<EmptyState action={<Button>Create Game</Button>} />);
    expect(screen.getByRole("button", { name: "Create Game" })).toBeInTheDocument();
  });

  it("does not render action button when not provided", () => {
    render(<EmptyState />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
