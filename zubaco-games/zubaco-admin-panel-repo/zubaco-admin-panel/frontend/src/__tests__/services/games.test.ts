import { fetchGames, fetchGameById } from "@/services/games";

beforeAll(() => {
  process.env.API_BASE_URL = "https://api.example.com";
});

// Mock global fetch
global.fetch = jest.fn() as jest.Mock;

beforeEach(() => {
  (global.fetch as jest.Mock).mockReset();
});

describe("fetchGames", () => {
  it("returns paginated results", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            items: [
              {
                id: "g1",
                name: "Block Fill",
                updated_at: "2026-04-22T09:48:25.822Z",
                stages: [{ id: "s1" }, { id: "s2" }],
              },
            ],
            pagination: { page: 1, limit: 5, total: 1, total_pages: 1 },
          },
        }),
    });

    const result = await fetchGames({ page: 1, pageSize: 5 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.totalLevels).toBe(2);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it("sends search and pagination params to API", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            items: [],
            pagination: { page: 2, limit: 10, total: 0, total_pages: 0 },
          },
        }),
    });

    const result = await fetchGames({
      page: 2,
      pageSize: 10,
      search: "block",
    });

    const firstCall = (global.fetch as jest.Mock).mock.calls[0];
    expect(firstCall?.[0]).toContain(
      "/admin/games?page=2&limit=10&search=block",
    );
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

describe("fetchGameById", () => {
  it("returns a game by id", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: "g1", name: "Mock Game" } }),
    });

    const game = await fetchGameById("g1");
    expect(game).not.toBeNull();
    expect(game?.id).toBe("g1");
  });

  it("returns null for unknown id", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: "Not Found" }),
    });

    const game = await fetchGameById("nonexistent");
    expect(game).toBeNull();
  });
});
