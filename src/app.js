
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const SteamStrategy = require("passport-steam").Strategy;
const axios = require("axios");
const path = require("path");
const { getGameMaxTime, warmUpAuthToken } = require("./gameDataFetcher");

const app = express();

const BASE_PATH = process.env.BASE_PATH || "";

// In-memory cache
const libraryCache = {};

// Serve static files with base path
app.use(`${BASE_PATH}/dist`, express.static(path.join(__dirname, "../dist"))); // Serve bundled frontend assets from /dist
app.use(BASE_PATH, express.static(path.join(__dirname, "public"))); // Serve public assets from root or BASE_PATH
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
      returnURL: new URL(path.posix.join(BASE_PATH, 'auth/steam/return'), process.env.BASE_URL).href,
      realm: process.env.BASE_URL,
      apiKey: process.env.STEAM_API_KEY,
    },
    (identifier, profile, done) => {
      profile.identifier = identifier;
      return done(null, profile);
    },
  ),
);

// Load routes
const routes = require("./routes")(passport, libraryCache, BASE_PATH);
app.use(BASE_PATH, routes);

module.exports = { app, warmUpAuthToken };
