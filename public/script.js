/* ======================
   STEAM LIBRARY SEARCH
====================== */

const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const welcome = document.getElementById('welcome');
const searchInput = document.getElementById('search');
const resultsDiv = document.getElementById('results');
const selectedGameDiv = document.getElementById('selected-game');

async function checkAuth() {
  const res = await fetch('api/me');
  const data = await res.json();

  if (data.authenticated) {
    authSection.style.display = 'none';
    appSection.style.display = 'block';
    welcome.innerText = `Welcome, ${data.name}`;
  } else {
    authSection.style.display = 'block';
    appSection.style.display = 'none';
  }
}

let timeout = null;

searchInput.addEventListener('input', () => {
  clearTimeout(timeout);
  
  // Clear selected game display when user starts typing
  selectedGameDiv.innerHTML = '';

  timeout = setTimeout(async () => {
    const query = searchInput.value.trim();

    if (!query) {
      resultsDiv.innerHTML = '';
      return;
    }

    const res = await fetch(`api/search?q=${encodeURIComponent(query)}`);
    const games = await res.json();

    resultsDiv.innerHTML = '';

    if (!games.length) {
      resultsDiv.innerHTML = "<p>No matches found.</p>";
      return;
    }

    games.forEach((game, index) => {
      const div = document.createElement('div');
      div.className = 'game';
      div.tabIndex = 0; // Make focusable

      const hours = Math.round(game.playtime / 60);

      div.innerHTML = `
        <img src="https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.icon}.jpg" />
        <strong>${game.name}</strong>
      `;

      // Function to select this game
      const selectGame = () => {
        const playtimeInSeconds = game.playtime * 60; // Convert minutes to seconds
        
        // Autocomplete search input with game name
        searchInput.value = game.name;
        
        // Clear search results
        resultsDiv.innerHTML = '';
        
        // Display selected game info with playtime
        selectedGameDiv.innerHTML = `
          <div class="selected-game-content">
            <span class="clear-selection" title="Clear selection">&times;</span>
            <img src="https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.icon}.jpg" />
            <strong>${game.name}</strong>
          </div>
          <div class="apply-section" id="applyStart">
            <div class="apply-label">Set start to:</div>
            <button class="apply-time-btn">
              <svg class="steam-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-5.52-4.48-10-10-10zm0 18c-4.41 0-8-3.59-8-8 0-1.85.63-3.55 1.69-4.9l5.39 2.23c-.15.45-.23.93-.23 1.42 0 2.49 2.01 4.5 4.5 4.5.34 0 .68-.04 1-.11l2.24 3.21C17.55 19.37 14.85 20 12 20zm6.31-11.9c-1.33-1.33-3.53-1.33-4.86 0-.2.2-.37.42-.5.67l2.23.92c.48-.31 1.03-.49 1.63-.49 1.66 0 3 1.34 3 3s-1.34 3-3 3c-.35 0-.68-.06-1-.16l-2.25 3.22c.73.27 1.5.42 2.31.42 4.41 0 8-3.59 8-8 0-1.85-.63-3.55-1.69-4.9z"/>
              </svg>
              ${hours} hrs played
            </button>
          </div>
          <div class="apply-section" id="applyMax">
            <div class="apply-label">Set max to:</div>
            <div class="max-time-buttons" data-appid="${game.appid}">
              <div class="max-time-loading">Loading completion times...</div>
            </div>
          </div>
        `;
        
        // Add click handler for clear button
        selectedGameDiv.querySelector('.clear-selection').addEventListener('click', () => {
          selectedGameDiv.innerHTML = '';
          searchInput.value = '';
          searchInput.focus();
        });
        
        // Add click handler for apply start time button
        selectedGameDiv.querySelector('.apply-time-btn').addEventListener('click', () => {
          setStart(playtimeInSeconds);
        });
        
        // Fetch and display max time buttons
        fetchMaxTime(game.appid, game.name);
        
        // Return focus to search input
        searchInput.focus();
      };

      // Click handler
      div.addEventListener('click', selectGame);

      // Keyboard navigation
      div.addEventListener('keydown', (e) => {
        const gameElements = Array.from(resultsDiv.querySelectorAll('.game'));
        const currentIndex = gameElements.indexOf(div);

        if (e.key === 'Enter') {
          e.preventDefault();
          selectGame();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (currentIndex < gameElements.length - 1) {
            gameElements[currentIndex + 1].focus();
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (currentIndex > 0) {
            gameElements[currentIndex - 1].focus();
          } else {
            searchInput.focus();
          }
        } else if (e.key === 'Tab' && !e.shiftKey) {
          // Tab - move to next game or let it continue naturally if last
          if (currentIndex < gameElements.length - 1) {
            e.preventDefault();
            gameElements[currentIndex + 1].focus();
          }
        } else if (e.key === 'Tab' && e.shiftKey) {
          // Shift+Tab - move to previous game or back to search input
          e.preventDefault();
          if (currentIndex > 0) {
            gameElements[currentIndex - 1].focus();
          } else {
            searchInput.focus();
          }
        }
      });

      resultsDiv.appendChild(div);
    });

  }, 300);
});

// Allow ArrowDown from search input to enter results
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') {
    const firstGame = resultsDiv.querySelector('.game');
    if (firstGame) {
      e.preventDefault();
      firstGame.focus();
    }
  }
});

checkAuth();

// Fetch max time from server and create buttons
async function fetchMaxTime(appid, gameName) {
  const maxTimeContainer = selectedGameDiv.querySelector('.max-time-buttons');
  
  if (!maxTimeContainer) return;
  
  try {
    const res = await fetch(`api/max-time?appid=${appid}`);
    const data = await res.json();
    
    // Clear loading message
    maxTimeContainer.innerHTML = '';
    
    // Define the completion types with their labels and styling
    const completionTypes = [
      { key: 'comp_main', label: 'Main Story', color: 'main' },
      { key: 'comp_plus', label: 'Main + Extras', color: 'plus' },
      { key: 'comp_100', label: 'Completionist', color: 'complete' }
    ];
    
    let hasAnyData = false;
    
    // Create a button for each available completion type
    completionTypes.forEach(type => {
      const timeInSeconds = data[type.key];
      
      if (timeInSeconds && timeInSeconds > 0) {
        hasAnyData = true;
        const hours = Math.round(timeInSeconds / 3600);
        
        const button = document.createElement('button');
        button.className = `apply-max-btn apply-max-btn-${type.color}`;
        button.innerHTML = `
          <svg class="steam-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-5.52-4.48-10-10-10zm0 18c-4.41 0-8-3.59-8-8 0-1.85.63-3.55 1.69-4.9l5.39 2.23c-.15.45-.23.93-.23 1.42 0 2.49 2.01 4.5 4.5 4.5.34 0 .68-.04 1-.11l2.24 3.21C17.55 19.37 14.85 20 12 20zm6.31-11.9c-1.33-1.33-3.53-1.33-4.86 0-.2.2-.37.42-.5.67l2.23.92c.48-.31 1.03-.49 1.63-.49 1.66 0 3 1.34 3 3s-1.34 3-3 3c-.35 0-.68-.06-1-.16l-2.25 3.22c.73.27 1.5.42 2.31.42 4.41 0 8-3.59 8-8 0-1.85-.63-3.55-1.69-4.9z"/>
          </svg>
          ${type.label}: ${hours} hrs
        `;
        
        // Add click handler
        button.addEventListener('click', () => {
          setMax(timeInSeconds);
          // Update title with game name + completion type
          setTitle(`${gameName} - ${type.label}`);
        });
        
        maxTimeContainer.appendChild(button);
      }
    });
    
    // Show message if no data available
    if (!hasAnyData) {
      maxTimeContainer.innerHTML = '<div class="max-time-error">No completion time data available</div>';
    }
    
  } catch (err) {
    console.error('Failed to fetch max time:', err);
    maxTimeContainer.innerHTML = '<div class="max-time-error">Failed to load completion times</div>';
  }
}


/* ======================
   PROGRESS BAR CONFIGURATION
====================== */

/* STATE */
const state = {
  start: 0,
  max: 3600,
  title: '',
  style: 'progress',
  displayFormat: 'percentage',
  accentColor: '#4CAF50'
};

/* HELPERS */
function clamp() {
  state.max = Math.max(0, state.max);
  state.start = Math.max(0, state.start);
  state.start = Math.min(state.start, state.max);
}

function calculatePercent() {
  if (state.max === 0) return 0;
  return Math.round((state.start / state.max) * 100);
}

function secondsToText(seconds) {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (hours > 0 && remaining > 0) {
    return `${hours}h ${remaining}m`;
  }
  if (hours > 0) return `${hours}h`;
  return `${remaining}m`;
}

function parseTimeToSeconds(input) {
  if (!input) return null;

  input = input.trim().toLowerCase();
  let totalMinutes = 0;

  const hourMatch = input.match(/(\d+(\.\d+)?)\s*(h|hr|hrs|hour|hours)/);
  if (hourMatch) {
    totalMinutes += parseFloat(hourMatch[1]) * 60;
  }

  const minuteMatch = input.match(/(\d+(\.\d+)?)\s*(m|min|mins|minute|minutes)/);
  if (minuteMatch) {
    totalMinutes += parseFloat(minuteMatch[1]);
  }

  const implicitMatch = input.match(/(\d+(\.\d+)?)\s*h\s*(\d+(\.\d+)?)/);
  if (implicitMatch) {
    totalMinutes =
      parseFloat(implicitMatch[1]) * 60 +
      parseFloat(implicitMatch[3]);
  }

  if (totalMinutes === 0) {
    const plain = input.match(/^\d+(\.\d+)?$/);
    if (plain) {
      totalMinutes = parseFloat(plain[0]);
    }
  }

  if (totalMinutes > 0) {
    return Math.round(totalMinutes * 60);
  }

  return null;
}

/* STATE SETTERS */
function setStart(value) {
  state.start = Number(value);
  clamp();
  render();
}

function setMax(value) {
  state.max = Number(value);
  clamp();
  render();
}

function setPercent(percent) {
  percent = Math.min(100, Math.max(0, Number(percent)));
  state.start = Math.round((percent / 100) * state.max);
  clamp();
  render();
}

function setTitle(value) {
  state.title = value;
  render();
}

function setStyle(value) {
  state.style = value;
  render();
}

function setDisplayFormat(value) {
  state.displayFormat = value;
  render();
}

function setAccentColor(value) {
  state.accentColor = value;
  render();
}

/* RENDER */
const startInput = document.getElementById("startInput");
const maxInput = document.getElementById("maxInput");
const percentInput = document.getElementById("percentInput");
const startTimeInput = document.getElementById("startTimeInput");
const maxTimeInput = document.getElementById("maxTimeInput");
const startSlider = document.getElementById("startSlider");
const titleInput = document.getElementById("titleInput");
const styleSelect = document.getElementById("styleSelect");
const displayFormatSelect = document.getElementById("displayFormatSelect");
const accentColorInput = document.getElementById("accentColorInput");

function render() {
  clamp();

  startInput.value = state.start;
  maxInput.value = state.max;
  percentInput.value = calculatePercent();

  startTimeInput.value = secondsToText(state.start);
  maxTimeInput.value = secondsToText(state.max);

  startSlider.min = 0;
  startSlider.max = state.max;
  startSlider.value = state.start;
  
  titleInput.value = state.title;
  styleSelect.value = state.style;
  displayFormatSelect.value = state.displayFormat;
  accentColorInput.value = state.accentColor;
}

/* EVENTS */

// Title
titleInput.addEventListener("input", e => setTitle(e.target.value));

// Style
styleSelect.addEventListener("change", e => setStyle(e.target.value));

// Display Format
displayFormatSelect.addEventListener("change", e => setDisplayFormat(e.target.value));

// Accent Color
accentColorInput.addEventListener("input", e => setAccentColor(e.target.value));

// Numeric
startInput.addEventListener("input", e => setStart(e.target.value));
maxInput.addEventListener("input", e => setMax(e.target.value));
percentInput.addEventListener("input", e => setPercent(e.target.value));

// Time text
startTimeInput.addEventListener("change", e => {
  const seconds = parseTimeToSeconds(e.target.value);
  if (seconds !== null) setStart(seconds);
});

maxTimeInput.addEventListener("change", e => {
  const seconds = parseTimeToSeconds(e.target.value);
  if (seconds !== null) setMax(seconds);
});

// Slider
startSlider.addEventListener("input", e => setStart(e.target.value));

// Scroll support
function addScroll(el, callback) {
  el.addEventListener("wheel", e => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    callback(delta);
  });
}

addScroll(percentInput, d => setPercent(calculatePercent() + d));

// Scroll on startSlider - increment by 1% of max value
addScroll(startSlider, d => {
  const increment = Math.max(1, Math.round(state.max * 0.01)); // 1% of max, minimum 1
  setStart(state.start + (d * increment));
});

render();


/* PREVIEW + COPY */
const previewBtn = document.getElementById("previewBtn");
const copyBtn = document.getElementById("copyBtn");
const previewFrame = document.getElementById("previewFrame");

function buildPreviewURL() {
  // Use relative path since bar.html should be served by the server
  const params = new URLSearchParams({
    start: state.start,
    max: state.max,
    title: state.title,
    style: state.style,
    displayFormat: state.displayFormat,
    accentColor: state.accentColor
  });
  return `bar.html?${params.toString()}`;
}

previewBtn.addEventListener("click", () => {
  const url = buildPreviewURL();
  previewFrame.src = url;
});

copyBtn.addEventListener("click", async () => {
  // Get the full URL by resolving relative URL against current location
  const fullUrl = new URL(buildPreviewURL(), window.location.href).href;
  try {
    await navigator.clipboard.writeText(fullUrl);
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy URL"), 1000);
  } catch {
    alert("Failed to copy.");
  }
});
