import { fetchFlaggedUsers, updateFlaggedStatus, fetchFlaggedById } from "@/services/flagged";

describe("fetchFlaggedUsers", () => {
  it("returns paginated results", async () => {
    const result = await fetchFlaggedUsers({ page: 1, pageSize: 5 });
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
  });

  it("filters by status", async () => {
    const result = await fetchFlaggedUsers({ page: 1, pageSize: 20, status: "pending" });
    expect(result.data.every((f) => f.status === "pending")).toBe(true);
  });

  it("searches by user name", async () => {
    const result = await fetchFlaggedUsers({ page: 1, pageSize: 20, search: "Noah" });
    expect(result.data.some((f) => f.userName.includes("Noah"))).toBe(true);
  });
});

describe("updateFlaggedStatus", () => {
  it("updates status to safe", async () => {
    const updated = await updateFlaggedStatus("f2", "safe");
    expect(updated.status).toBe("safe");
  });

  it("throws for unknown id", async () => {
    await expect(updateFlaggedStatus("nonexistent", "safe")).rejects.toThrow();
  });
});

describe("fetchFlaggedById", () => {
  it("returns a flagged record by id", async () => {
    const record = await fetchFlaggedById("f1");
    expect(record?.id).toBe("f1");
  });

  it("returns null for unknown id", async () => {
    const record = await fetchFlaggedById("unknown");
    expect(record).toBeNull();
  });
});
