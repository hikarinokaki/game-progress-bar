const express = require("express");

module.exports = (libraryCache) => {
  const router = express.Router();
  const apiController = require("../controllers/api.controller")(libraryCache);

  router.get("/search", apiController.searchGames);
  router.get("/max-time", apiController.getMaxTime);

  return router;
};
