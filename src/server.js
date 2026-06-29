require("dotenv").config();
const { app } = require("./app");
const { initHltbSession, shutdownHltbSession } = require("./gameDataFetcher");

const PORT = process.env.PORT || 3000;
const BASE_PATH = process.env.BASE_PATH || "";

const server = app.listen(PORT, async () => {
  console.log(`Running on http://localhost:${PORT}`);
  console.log(`Base path: ${BASE_PATH || "(root)"}`);

  // Initialize persistent HLTB browser session in the background
  initHltbSession().catch((err) => {
    console.error("Failed to initialize HLTB session:", err.message);
    console.log("HLTB searches will retry on first request instead");
  });
});

// Graceful shutdown: close the HLTB browser session
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  await shutdownHltbSession();
  server.close();
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  await shutdownHltbSession();
  server.close();
});
