const puppeteer = require("puppeteer");

const maxTimeCache = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000;

const HLTB_BASE_URL = "https://howlongtobeat.com";

let browser = null;
let hltbPage = null;
let sessionReady = false;
let pendingSearchResolve = null;

async function initHltbSession() {
  console.log("Initializing persistent HLTB session...");

  try {
    if (browser) {
      await browser.close();
    }

    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-background-networking",
        "--disable-sync",
        "--no-zygote",
      ],
    });

    hltbPage = await browser.newPage();
    await hltbPage.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64; rv:147.0) Gecko/20100101 Firefox/147.0",
    );

    // Listen for API responses to capture search results
    hltbPage.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/api/bleed") && response.ok()) {
        try {
          const data = await response.json();
          // Only resolve if this is an actual search result (has 'data' array)
          if (pendingSearchResolve && Array.isArray(data?.data)) {
            pendingSearchResolve(data);
            pendingSearchResolve = null;
          }
        } catch {
          // Ignore parse errors from non-JSON responses
        }
      }
    });

    await hltbPage.goto(`${HLTB_BASE_URL}/`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    sessionReady = true;
    console.log("HLTB session established");
    return true;
  } catch (error) {
    console.error("Failed to initialize HLTB session:", error.message);
    sessionReady = false;
    return false;
  }
}

async function searchGameOnHltb(searchTerms) {
  if (!sessionReady || !hltbPage) {
    await initHltbSession();
    if (!sessionReady) {
      throw new Error("HLTB session not available");
    }
  }

  const query = encodeURIComponent(searchTerms.join(" "));

  // Set up a promise that resolves when api/bleed responds
  const searchResult = new Promise((resolve, reject) => {
    pendingSearchResolve = resolve;

    // Fail-safe timeout
    setTimeout(() => {
      if (pendingSearchResolve) {
        pendingSearchResolve = null;
        reject(new Error("HLTB search timed out"));
      }
    }, 20000);
  });

  console.time(`hltb-search:${query}`);

  // Navigate to the search page — HLTB's own JS will call api/bleed
  await hltbPage.goto(`${HLTB_BASE_URL}/?q=${query}`, {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });

  // Wait for the response to be captured
  const data = await searchResult;

  console.timeEnd(`hltb-search:${query}`);
  return data;
}

async function getGameMaxTime(appid, gameName) {
  const cached = maxTimeCache[appid];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.maxTime;
  }

  try {
    console.log(`Fetching max time for "${gameName}" (appid: ${appid})`);

    const searchTokens = gameName.trim().split(/\s+/);
    const data = await searchGameOnHltb(searchTokens);

    console.log(`Found ${data?.data?.length || 0} games`);

    const firstGame = data?.data?.[0];

    if (!firstGame) {
      console.log(`No results found for "${gameName}"`);
      return { comp_main: null, comp_plus: null, comp_100: null };
    }

    const completionTimes = {
      comp_main: firstGame.comp_main || null,
      comp_plus: firstGame.comp_plus || null,
      comp_100: firstGame.comp_100 || null,
    };

    console.log("First game found:", {
      name: firstGame.game_name,
      ...completionTimes,
    });

    maxTimeCache[appid] = {
      maxTime: completionTimes,
      timestamp: Date.now(),
    };

    return completionTimes;
  } catch (error) {
    console.error(`HLTB search failed for "${gameName}":`, error.message);
    return { comp_main: null, comp_plus: null, comp_100: null };
  }
}

async function shutdownHltbSession() {
  if (browser) {
    await browser.close();
    browser = null;
    hltbPage = null;
    sessionReady = false;
    pendingSearchResolve = null;
    console.log("HLTB session closed");
  }
}

function clearCache() {
  Object.keys(maxTimeCache).forEach((key) => delete maxTimeCache[key]);
  console.log("Max time cache cleared");
}

module.exports = {
  getGameMaxTime,
  clearCache,
  initHltbSession,
  shutdownHltbSession,
};
