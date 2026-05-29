import { render, screen } from "@testing-library/react";
import {
  GameStatusBadge,
  UserStatusBadge,
  FlagSeverityBadge,
  FlagStatusBadge,
} from "@/components/shared/StatusBadge";

describe("GameStatusBadge", () => {
  it("renders Active label for active status", () => {
    render(<GameStatusBadge status="active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders Inactive label for inactive status", () => {
    render(<GameStatusBadge status="inactive" />);
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("renders Draft label for draft status", () => {
    render(<GameStatusBadge status="draft" />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });
});

describe("UserStatusBadge", () => {
  it("renders Active for active users", () => {
    render(<UserStatusBadge status="active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders Suspended for suspended users", () => {
    render(<UserStatusBadge status="suspended" />);
    expect(screen.getByText("Suspended")).toBeInTheDocument();
  });

  it("renders Flagged for flagged users", () => {
    render(<UserStatusBadge status="flagged" />);
    expect(screen.getByText("Flagged")).toBeInTheDocument();
  });

  it("renders Inactive for inactive users", () => {
    render(<UserStatusBadge status="inactive" />);
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });
});

describe("FlagSeverityBadge", () => {
  const severities = [
    { severity: "low" as const, label: "Low" },
    { severity: "medium" as const, label: "Medium" },
    { severity: "high" as const, label: "High" },
    { severity: "critical" as const, label: "Critical" },
  ];

  severities.forEach(({ severity, label }) => {
    it(`renders ${label} for ${severity} severity`, () => {
      render(<FlagSeverityBadge severity={severity} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});

describe("FlagStatusBadge", () => {
  it("renders Pending for pending status", () => {
    render(<FlagStatusBadge status="pending" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders Safe for safe status", () => {
    render(<FlagStatusBadge status="safe" />);
    expect(screen.getByText("Safe")).toBeInTheDocument();
  });
});
