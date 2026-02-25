const express = require("express");
const authRoutes = require("./auth.routes");
const apiRoutes = require("./api.routes");

module.exports = (passport, libraryCache, BASE_PATH) => {
  const router = express.Router();

  // API routes
  router.use("/api", apiRoutes(libraryCache));

  // Auth routes
  router.use("/auth", authRoutes(passport, libraryCache, BASE_PATH));

  // Home route (serves index.html)
  router.get("/", (req, res) => {
    res.sendFile(require("path").join(__dirname, "../public/index.html"));
  });

  return router;
};
