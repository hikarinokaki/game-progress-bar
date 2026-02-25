const { getGameMaxTime } = require("../gameDataFetcher");

module.exports = (libraryCache) => {
  const searchGames = (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });

    const steamId = req.user.id;
    const query = (req.query.q || "").toLowerCase();

    if (!query) return res.json([]);

    const library = libraryCache[steamId] || [];

    const matches = library.filter((game) =>
      game.name.toLowerCase().includes(query),
    );

    res.json(matches.slice(0, 20));
  };

  const getMaxTime = async (req, res) => {
    const { appid } = req.query;

    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!appid) {
      return res.status(400).json({ error: "appid is required" });
    }

    try {
      const steamId = req.user.id;
      const library = libraryCache[steamId] || [];
      const game = library.find((g) => g.appid === parseInt(appid));

      if (!game) {
        return res.status(404).json({ error: "Game not found in library" });
      }

      const maxTimeData = await getGameMaxTime(appid, game.name);
      res.json(maxTimeData);
    } catch (err) {
      console.error("Error fetching max time:", err);
      res.status(500).json({ error: "Failed to fetch completion time" });
    }
  };

  return {
    searchGames,
    getMaxTime,
  };
};
