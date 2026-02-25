require("dotenv").config();
const { app, warmUpAuthToken } = require("./app");

const PORT = process.env.PORT || 3000;
const BASE_PATH = process.env.BASE_PATH || "";

app.listen(PORT, async () => {
  console.log(`Running on http://localhost:${PORT}`);
  console.log(`Base path: ${BASE_PATH || "(root)"}`);

  // Pre-warm the auth token cache in the background
  warmUpAuthToken().catch((err) => {
    console.error("Failed to warm up auth token:", err.message);
    console.log("Auth token will be fetched on first request instead");
  });
});
