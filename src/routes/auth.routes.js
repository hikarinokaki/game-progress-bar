const express = require("express");

module.exports = (passport, libraryCache, BASE_PATH) => {
  const router = express.Router();
  const authController = require("../controllers/auth.controller")(
    passport,
    libraryCache,
    BASE_PATH,
  );

  router.get("/me", authController.getAuthStatus);
  router.get("/steam", authController.steamLogin);
  router.get(
    "/steam/return",
    passport.authenticate("steam", { failureRedirect: BASE_PATH + "/" }), // Passport authenticate needs to be here to use BASE_PATH for failureRedirect
    authController.steamCallback,
  );
  router.get("/logout", authController.logout);

  return router;
};
