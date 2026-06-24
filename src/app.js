const express = require("express");
const session = require("express-session");
const passport = require("passport");
const { SteamOpenIdStrategy } = require("passport-steam-openid");
const axios = require("axios");
const path = require("path");
const {
  getGameMaxTime,
  initHltbSession,
  shutdownHltbSession,
} = require("./gameDataFetcher");

const app = express();

const BASE_PATH = (process.env.BASE_PATH || "").replace(/\/+$/, "");

// In-memory cache
const libraryCache = {};

// Serve static files with base path
app.use(`${BASE_PATH}/dist`, express.static(path.join(__dirname, "../dist"))); // Serve bundled frontend assets from /dist
app.use(BASE_PATH, express.static(path.join(__dirname, "public"))); // Serve public assets from root or BASE_PATH
app.use(express.json());

const SESSION_SECRET =
  process.env.SESSION_SECRET || "dev-secret-do-not-use-in-production";

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  }),
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

const BASE_URL =
  process.env.BASE_URL || "http://localhost:" + (process.env.PORT || 3000);

passport.use(
  new SteamOpenIdStrategy(
    {
      returnURL: new URL(
        path.posix.join(BASE_PATH, "auth/steam/return"),
        BASE_URL,
      ).href,
      apiKey: process.env.STEAM_API_KEY,
      profile: true,
    },
    (req, steamid, profile, done) => {
      return done(null, {
        id: profile.steamid || steamid,
        identifier: steamid,
        displayName: profile.personaname || "Steam User",
        photos: [
          { value: profile.avatar },
          { value: profile.avatarmedium },
          { value: profile.avatarfull },
        ],
      });
    },
  ),
);

// Load routes
const routes = require("./routes")(passport, libraryCache, BASE_PATH);
app.use(BASE_PATH, routes);

module.exports = { app, initHltbSession, shutdownHltbSession };
