const { getAuthToken } = require("./gameDataFetcher");

/**
 * Debug script to test auth token extraction
 * Run with: node debugAuthToken.js
 */
async function testAuthToken() {
  console.log("=== Testing Auth Token Extraction ===\n");

  try {
    const token = await getAuthToken();

    if (token) {
      console.log("\n✅ SUCCESS!");
      console.log("Token extracted:", token.substring(0, 50) + "...");
      console.log("Token length:", token.length);
    } else {
      console.log("\n❌ FAILED");
      console.log("Could not extract auth token");
      console.log("\nTroubleshooting tips:");
      console.log("1. Check if Puppeteer can launch Chrome/Chromium");
      console.log(
        "2. Try running with headless: false to see what's happening",
      );
      console.log("3. Check if howlongtobeat.com is accessible");
      console.log("4. Look at the console logs above for clues");
    }
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

testAuthToken();
