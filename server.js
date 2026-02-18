require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const SteamStrategy = require("passport-steam").Strategy;
const axios = require("axios");
const path = require("path");
const { getGameMaxTime, warmUpAuthToken } = require("./gameDataFetcher");

const app = express();

// Support for running under a subpath (e.g., /game-progress-bar/)
// Leave empty for root deployment, or set to '/game-progress-bar' for subpath
const BASE_PATH = process.env.BASE_PATH || "";

// In-memory cache
const libraryCache = {};

// Serve static files with base path
app.use(BASE_PATH, express.static(path.join(__dirname, "public")));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  }),
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new SteamStrategy(
    {
      returnURL: `${process.env.BASE_URL}${BASE_PATH}/auth/steam/return`,
      realm: process.env.BASE_URL,
      apiKey: process.env.STEAM_API_KEY,
    },
    (identifier, profile, done) => {
      profile.identifier = identifier;
      return done(null, profile);
    },
  ),
);

// Serve single page
app.get(`${BASE_PATH}/`, (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Auth status endpoint
app.get(`${BASE_PATH}/api/me`, (req, res) => {
  if (!req.user) return res.json({ authenticated: false });
  res.json({
    authenticated: true,
    name: req.user.displayName,
  });
});

// Steam login
app.get(
  `${BASE_PATH}/auth/steam`,
  passport.authenticate("steam", { failureRedirect: BASE_PATH + "/" }),
);

// Steam callback
app.get(
  `${BASE_PATH}/auth/steam/return`,
  passport.authenticate("steam", { failureRedirect: BASE_PATH + "/" }),
  async (req, res) => {
    const steamId = req.user.id;

    // Cache library if not already
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
  },
);

// Search endpoint
app.get(`${BASE_PATH}/api/search`, (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });

  const steamId = req.user.id;
  const query = (req.query.q || "").toLowerCase();

  if (!query) return res.json([]);

  const library = libraryCache[steamId] || [];

  const matches = library.filter((game) =>
    game.name.toLowerCase().includes(query),
  );

  res.json(matches.slice(0, 20));
});

// Max time endpoint
app.get(`${BASE_PATH}/api/max-time`, async (req, res) => {
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
});

// Logout
app.get(`${BASE_PATH}/logout`, (req, res) => {
  delete libraryCache[req.user?.id];
  req.logout(() => res.redirect(BASE_PATH + "/"));
});

app.listen(3000, async () => {
  console.log("Running on http://localhost:3000");
  console.log(`Base path: ${BASE_PATH || "(root)"}`);

  // Pre-warm the auth token cache in the background
  warmUpAuthToken().catch((err) => {
    console.error("Failed to warm up auth token:", err.message);
    console.log("Auth token will be fetched on first request instead");
  });
});
