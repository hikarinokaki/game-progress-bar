import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetGameMaxTime = vi.fn();

const createController = () => {
  const libraryCache = {};
  const controller = require("../src/controllers/api.controller.js")(
    libraryCache,
    mockGetGameMaxTime,
  );
  return { controller, libraryCache };
};

function mockReqRes(overrides = {}) {
  const req = {
    user: { id: "steam123" },
    query: {},
    ...overrides,
  };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  return { req, res };
}

describe("api.controller - searchGames", () => {
  it("returns 401 if not authenticated", () => {
    const { controller } = createController();
    const { req, res } = mockReqRes({ user: null });
    controller.searchGames(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Not authenticated" });
  });

  it("returns empty array if no query", () => {
    const { controller } = createController();
    const { req, res } = mockReqRes({ query: { q: "" } });
    controller.searchGames(req, res);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("filters library by name case-insensitively", () => {
    const { controller, libraryCache } = createController();
    libraryCache["steam123"] = [
      { name: "Half-Life 2", appid: 220 },
      { name: "Portal 2", appid: 620 },
      { name: "Team Fortress 2", appid: 440 },
    ];
    const { req, res } = mockReqRes({ query: { q: "portal" } });
    controller.searchGames(req, res);
    expect(res.json).toHaveBeenCalledWith([{ name: "Portal 2", appid: 620 }]);
  });

  it("limits results to 20", () => {
    const { controller, libraryCache } = createController();
    libraryCache["steam123"] = Array.from({ length: 30 }, (_, i) => ({
      name: `Game ${i}`,
      appid: i,
    }));
    const { req, res } = mockReqRes({ query: { q: "game" } });
    controller.searchGames(req, res);
    const result = res.json.mock.calls[0][0];
    expect(result.length).toBe(20);
  });

  it("returns empty array if library empty", () => {
    const { controller } = createController();
    const { req, res } = mockReqRes({ query: { q: "anything" } });
    controller.searchGames(req, res);
    expect(res.json).toHaveBeenCalledWith([]);
  });
});

describe("api.controller - getMaxTime", () => {
  beforeEach(() => {
    mockGetGameMaxTime.mockReset();
  });

  it("returns 401 if not authenticated", async () => {
    const { controller } = createController();
    const { req, res } = mockReqRes({ user: null, query: { appid: "220" } });
    await controller.getMaxTime(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 if appid missing", async () => {
    const { controller } = createController();
    const { req, res } = mockReqRes({ query: {} });
    await controller.getMaxTime(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "appid is required" });
  });

  it("returns 404 if game not in library", async () => {
    const { controller, libraryCache } = createController();
    libraryCache["steam123"] = [];
    const { req, res } = mockReqRes({ query: { appid: "999" } });
    await controller.getMaxTime(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("fetches and returns max time for owned game", async () => {
    mockGetGameMaxTime.mockResolvedValue({
      comp_main: 3600,
      comp_plus: 4800,
      comp_100: 7200,
    });
    const { controller, libraryCache } = createController();
    libraryCache["steam123"] = [{ name: "Portal 2", appid: 620 }];
    const { req, res } = mockReqRes({ query: { appid: "620" } });
    await controller.getMaxTime(req, res);
    expect(mockGetGameMaxTime).toHaveBeenCalledWith("620", "Portal 2");
    expect(res.json).toHaveBeenCalledWith({
      comp_main: 3600,
      comp_plus: 4800,
      comp_100: 7200,
    });
  });

  it("returns 500 on fetcher error", async () => {
    mockGetGameMaxTime.mockRejectedValue(new Error("HLTB down"));
    const { controller, libraryCache } = createController();
    libraryCache["steam123"] = [{ name: "Portal 2", appid: 620 }];
    const { req, res } = mockReqRes({ query: { appid: "620" } });
    await controller.getMaxTime(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Failed to fetch completion time",
    });
  });
});
