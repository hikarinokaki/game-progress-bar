const axios = require("axios");

module.exports = (passport, libraryCache, BASE_PATH) => {
  const getAuthStatus = (req, res) => {
    if (!req.user) return res.json({ authenticated: false });
    res.json({
      authenticated: true,
      name: req.user.displayName,
    });
  };

  const steamLogin = passport.authenticate("steam-openid", {
    failureRedirect: BASE_PATH + "/",
  });

  const steamCallback = async (req, res) => {
    const steamId = req.user.id;

    if (!libraryCache[steamId]) {
      try {
        const response = await axios.get(
          "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/",
          {
            params: {
              key: process.env.STEAM_API_KEY,
              steamid: steamId,
              include_appinfo: true,
              include_played_free_games: true,
            },
          },
        );

        const games = response.data.response.games || [];

        libraryCache[steamId] = games.map((g) => ({
          name: g.name,
          appid: g.appid,
          playtime: g.playtime_forever,
          icon: g.img_icon_url,
        }));

        console.log(`Cached ${games.length} games`);
      } catch (err) {
        console.error("Steam fetch failed:", err.message);
      }
    }

    res.redirect(BASE_PATH + "/");
  };

  const logout = (req, res) => {
    delete libraryCache[req.user?.id];
    req.logout(() => res.redirect(BASE_PATH + "/"));
  };

  return {
    getAuthStatus,
    steamLogin,
    steamCallback,
    logout,
  };
};
