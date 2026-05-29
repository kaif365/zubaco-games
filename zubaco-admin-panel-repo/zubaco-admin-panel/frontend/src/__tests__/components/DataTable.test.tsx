import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable } from "@/components/shared/DataTable";
import type { ColumnDef } from "@/types/common";

interface Row {
  id: string;
  name: string;
  value: number;
}

const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", cell: (row) => <span>{row.name}</span> },
  { key: "value", header: "Value", cell: (row) => <span>{row.value}</span> },
];

const data: Row[] = [
  { id: "1", name: "Alpha", value: 10 },
  { id: "2", name: "Beta", value: 20 },
  { id: "3", name: "Gamma", value: 30 },
];

describe("DataTable", () => {
  it("renders column headers", () => {
    render(<DataTable columns={columns} data={data} rowKey={(r) => r.id} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Value")).toBeInTheDocument();
  });

  it("renders all data rows", () => {
    render(<DataTable columns={columns} data={data} rowKey={(r) => r.id} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
  });

  it("renders empty state when data is empty", () => {
    render(<DataTable columns={columns} data={[]} rowKey={(r) => r.id} emptyMessage="Nothing here." />);
    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
  });

  it("renders skeleton rows when loading", () => {
    const { container } = render(
      <DataTable columns={columns} data={[]} isLoading rowKey={(r) => r.id} loadingRows={3} />
    );
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("does not render empty state when loading", () => {
    render(
      <DataTable columns={columns} data={[]} isLoading rowKey={(r) => r.id} emptyMessage="Nothing here." />
    );
    expect(screen.queryByText("Nothing here.")).not.toBeInTheDocument();
  });

  it("calls onRowClick when a row is clicked", async () => {
    const handleClick = jest.fn();
    render(
      <DataTable columns={columns} data={data} rowKey={(r) => r.id} onRowClick={handleClick} />
    );
    await userEvent.click(screen.getByText("Alpha"));
    expect(handleClick).toHaveBeenCalledWith(data[0]);
  });

  it("renders the correct number of rows", () => {
    render(<DataTable columns={columns} data={data} rowKey={(r) => r.id} />);
    const rows = screen.getAllByRole("row");
    // 1 header + 3 data rows
    expect(rows).toHaveLength(4);
  });
});
