const axios = require('axios');
const puppeteer = require('puppeteer');

// In-memory cache for max time data
// Key: appid, Value: { maxTime: number, timestamp: number }
const maxTimeCache = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Cache for the auth token
let authToken = null;
let authTokenTimestamp = null;
const AUTH_TOKEN_DURATION = 60 * 60 * 1000; // 1 hour

// HowLongToBeat API endpoint
const HLTB_API_URL = 'https://howlongtobeat.com/api/finder';
const HLTB_BASE_URL = 'https://howlongtobeat.com';

/**
 * Extracts the authentication token from HowLongToBeat website
 * @returns {Promise<string>} The auth token
 */
async function getAuthToken() {
  // Check if we have a valid cached token
  if (authToken && authTokenTimestamp && (Date.now() - authTokenTimestamp) < AUTH_TOKEN_DURATION) {
    console.log('Using cached auth token');
    return authToken;
  }

  let browser = null;
  
  try {
    console.log('Fetching new auth token from HowLongToBeat...');
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64; rv:147.0) Gecko/20100101 Firefox/147.0');
    
    // Enable request interception to capture the token
    await page.setRequestInterception(true);
    
    let capturedToken = null;
    let requestCount = 0;
    
    // Intercept all requests to find the auth token
    page.on('request', (request) => {
      requestCount++;
      const headers = request.headers();
      const url = request.url();
      
      // Log API requests
      if (url.includes('/api/')) {
        console.log(`API request #${requestCount}: ${url}`);
        console.log('Has x-auth-token:', !!headers['x-auth-token']);
      }
      
      if (headers['x-auth-token']) {
        capturedToken = headers['x-auth-token'];
        console.log(`Auth token captured from request #${requestCount}!`);
      }
      request.continue();
    });
    
    // Also check response headers
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/')) {
        const headers = response.headers();
        console.log(`API response from: ${url}`);
        if (headers['x-auth-token']) {
          capturedToken = headers['x-auth-token'];
          console.log('Auth token found in response headers!');
        }
      }
    });
    
    // Navigate to the search page to trigger API calls
    console.log('Navigating to HowLongToBeat...');
    await page.goto(`${HLTB_BASE_URL}/?q=test`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait longer for API calls to complete (increased from 2s to 5s)
    console.log('Waiting for API calls...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log(`Captured ${requestCount} requests total`);
    
    // If we captured a token from network traffic, use it
    if (capturedToken) {
      authToken = capturedToken;
      authTokenTimestamp = Date.now();
      console.log('✅ Auth token extracted successfully from network');
      return capturedToken;
    }
    
    // If no token yet, wait a bit longer and check again
    console.log('No token yet, waiting 3 more seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (capturedToken) {
      authToken = capturedToken;
      authTokenTimestamp = Date.now();
      console.log('✅ Auth token extracted successfully (delayed)');
      return capturedToken;
    }
    
    // Try to find it in cookies
    const cookies = await page.cookies();
    const tokenCookie = cookies.find(c => c.name === 'x-auth-token' || c.name.includes('auth'));
    if (tokenCookie) {
      authToken = tokenCookie.value;
      authTokenTimestamp = Date.now();
      console.log('Auth token found in cookies');
      return tokenCookie.value;
    }
    
    // Try localStorage
    const lsToken = await page.evaluate(() => {
      return localStorage.getItem('x-auth-token') || 
             localStorage.getItem('authToken') ||
             localStorage.getItem('auth-token');
    });
    
    if (lsToken) {
      authToken = lsToken;
      authTokenTimestamp = Date.now();
      console.log('Auth token found in localStorage');
      return lsToken;
    }
    
    // Try sessionStorage
    const ssToken = await page.evaluate(() => {
      return sessionStorage.getItem('x-auth-token') || 
             sessionStorage.getItem('authToken') ||
             sessionStorage.getItem('auth-token');
    });
    
    if (ssToken) {
      authToken = ssToken;
      authTokenTimestamp = Date.now();
      console.log('Auth token found in sessionStorage');
      return ssToken;
    }
    
    // Last resort: try to find it in window object or page scripts
    const windowToken = await page.evaluate(() => {
      if (window.authToken) return window.authToken;
      if (window.xAuthToken) return window.xAuthToken;
      
      // Try to find it in any global variables
      for (let key in window) {
        if (key.toLowerCase().includes('auth') && typeof window[key] === 'string') {
          if (window[key].length > 20 && window[key].includes('=')) {
            return window[key];
          }
        }
      }
      
      return null;
    });
    
    if (windowToken) {
      authToken = windowToken;
      authTokenTimestamp = Date.now();
      console.log('Auth token found in window object');
      return windowToken;
    }
    
    console.error('Could not extract auth token from any source');
    return null;
    
  } catch (error) {
    console.error('Error getting auth token:', error.message);
    return null;
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Fetches the maximum completion time for a game from HowLongToBeat
 * @param {string} appid - Steam app ID for the game
 * @param {string} gameName - Name of the game to search for
 * @returns {Promise<number>} Maximum time in seconds
 */
async function getGameMaxTime(appid, gameName) {
  // Check cache first
  const cached = maxTimeCache[appid];
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`Cache hit for appid ${appid}`);
    return cached.maxTime;
  }
  
  try {
    console.log(`Fetching max time for "${gameName}" (appid: ${appid})`);
    
    // Get auth token (from cache or by fetching) - this is mandatory
    const token = await getAuthToken();
    
    if (!token) {
      throw new Error('Failed to obtain authentication token from HowLongToBeat');
    }
    
    // Split game name into tokens for searchTerms
    // "Fallout 3" becomes ["Fallout", "3"]
    const searchTokens = gameName.trim().split(/\s+/);
    
    console.log(`Search tokens: ${JSON.stringify(searchTokens)}`);
    
    // Build the request body for HowLongToBeat API
    const requestBody = {
      searchType: "games",
      searchTerms: searchTokens,
      searchPage: 1,
      size: 20,
      searchOptions: {
        games: {
          userId: 0,
          platform: "",
          sortCategory: "popular",
          rangeCategory: "main",
          rangeTime: { min: null, max: null },
          gameplay: {
            perspective: "",
            flow: "",
            genre: "",
            difficulty: ""
          },
          rangeYear: { min: "", max: "" },
          modifier: ""
        },
        users: { sortCategory: "postcount" },
        lists: { sortCategory: "follows" },
        filter: "",
        sort: 0,
        randomizer: 0
      },
      useCache: false
    };
    
    // Build headers matching the browser request
    const headers = {
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Content-Type': 'application/json',
      'Origin': HLTB_BASE_URL,
      'Referer': `${HLTB_BASE_URL}/?q=${encodeURIComponent(gameName)}`,
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:147.0) Gecko/20100101 Firefox/147.0',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'x-auth-token': token
    };
    
    // Make POST request to HowLongToBeat API
    const response = await axios.post(HLTB_API_URL, requestBody, {
      headers,
      timeout: 10000
    });
    
    console.log(`API response status: ${response.status}`);
    console.log(`Found ${response.data?.data?.length || 0} games`);
    
    // Extract the first game from the data array
    const firstGame = response.data?.data?.[0];
    
    if (!firstGame) {
      console.log(`No results found for "${gameName}"`);
      return { comp_main: null, comp_plus: null, comp_100: null }; // Default fallback
    }
    
    // Extract all three completion time fields
    const completionTimes = {
      comp_main: firstGame.comp_main || null,
      comp_plus: firstGame.comp_plus || null,
      comp_100: firstGame.comp_100 || null
    };
    
    console.log('First game found:', {
      name: firstGame.game_name,
      ...completionTimes
    });
    
    // Cache the result
    maxTimeCache[appid] = {
      maxTime: completionTimes,
      timestamp: Date.now()
    };
    
    return completionTimes;
    
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error(`API error for "${gameName}":`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error(`No response from API for "${gameName}":`, error.message);
    } else {
      // Something happened in setting up the request
      console.error(`Error setting up request for "${gameName}":`, error.message);
    }
    
    // Return null values on error
    return { comp_main: null, comp_plus: null, comp_100: null };
  }
}

/**
 * Pre-warm the auth token cache
 * Call this when the server starts to avoid delays on first request
 */
async function warmUpAuthToken() {
  console.log('Pre-warming auth token cache...');
  try {
    const token = await getAuthToken();
    if (token) {
      console.log('✅ Auth token cache warmed up successfully');
      return true;
    } else {
      console.warn('⚠️ Failed to pre-warm auth token cache');
      return false;
    }
  } catch (error) {
    console.error('❌ Error warming up auth token:', error.message);
    return false;
  }
}

/**
 * Clear the cache (useful for testing or manual refresh)
 */
function clearCache() {
  Object.keys(maxTimeCache).forEach(key => delete maxTimeCache[key]);
  authToken = null;
  authTokenTimestamp = null;
  console.log('Max time cache and auth token cleared');
}

module.exports = {
  getGameMaxTime,
  clearCache,
  getAuthToken,
  warmUpAuthToken
};