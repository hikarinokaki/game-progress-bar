// src/public/js/steamSearch.js

import {
  authSection,
  appSection,
  welcome,
  searchInput,
  resultsDiv,
  selectedGameDiv,
} from "./domElements.js";
import {
  checkAuth,
  searchGames,
  fetchMaxTime as fetchMaxTimeApi,
} from "./api.js";
import { secondsToText } from "./utils.js";
import { state, setStart, setMax, setTitle } from "./state.js";
import { render as renderProgressBar } from "./progressBar.js"; // Will be created later

let timeout = null;

async function fetchMaxTime(appid, gameName) {
  const maxTimeContainer = selectedGameDiv.querySelector(".max-time-buttons");

  if (!maxTimeContainer) return;

  try {
    const data = await fetchMaxTimeApi(appid);

    maxTimeContainer.innerHTML = "";

    const completionTypes = [
      { key: "comp_main", label: "Main Story", color: "main" },
      { key: "comp_plus", label: "Main + Extras", color: "plus" },
      { key: "comp_100", label: "Completionist", color: "complete" },
    ];

    let hasAnyData = false;

    completionTypes.forEach((type) => {
      const timeInSeconds = data[type.key];

      if (timeInSeconds && timeInSeconds > 0) {
        hasAnyData = true;
        const hours = Math.round(timeInSeconds / 3600);

        const button = document.createElement("button");
        button.className = `apply-max-btn apply-max-btn-${type.color}`;
        button.innerHTML = `
          <svg class="steam-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-5.52-4.48-10-10-10zm0 18c-4.41 0-8-3.59-8-8 0-1.85.63-3.55 1.69-4.9l5.39 2.23c-.15.45-.23.93-.23 1.42 0 2.49 2.01 4.5 4.5 4.5.34 0 .68-.04 1-.11l2.24 3.21C17.55 19.37 14.85 20 12 20zm6.31-11.9c-1.33-1.33-3.53-1.33-4.86 0-.2.2-.37.42-.5.67l2.23.92c.48-.31 1.03-.49 1.63-.49 1.66 0 3 1.34 3 3s-1.34 3-3 3c-.35 0-.68-.06-1-.16l-2.25 3.22c.73.27 1.5.42 2.31.42 4.41 0 8-3.59 8-8 0-1.85-.63-3.55-1.69-4.9z"/>
          </svg>
          ${type.label}: ${hours} hrs
        `;

        button.addEventListener("click", () => {
          setMax(timeInSeconds);
          setTitle(`${gameName} - ${type.label}`);
          renderProgressBar(); // Re-render the progress bar config
        });

        maxTimeContainer.appendChild(button);
      }
    });

    if (!hasAnyData) {
      maxTimeContainer.innerHTML =
        '<div class="max-time-error">No completion time data available</div>';
    }
  } catch (err) {
    console.error("Failed to fetch max time:", err);
    maxTimeContainer.innerHTML =
      '<div class="max-time-error">Failed to load completion times</div>';
  }
}

function selectGame(game) {
  const playtimeInSeconds = game.playtime * 60;

  searchInput.value = game.name;
  resultsDiv.innerHTML = "";

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
        ${secondsToText(playtimeInSeconds)} played
      </button>
    </div>
    <div class="apply-section" id="applyMax">
      <div class="apply-label">Set max to:</div>
      <div class="max-time-buttons" data-appid="${game.appid}">
        <div class="max-time-loading">Loading completion times...</div>
      </div>
    </div>
  `;

  selectedGameDiv
    .querySelector(".clear-selection")
    .addEventListener("click", () => {
      selectedGameDiv.innerHTML = "";
      searchInput.value = "";
      searchInput.focus();
    });

  selectedGameDiv
    .querySelector(".apply-time-btn")
    .addEventListener("click", () => {
      setStart(playtimeInSeconds);
      renderProgressBar(); // Re-render the progress bar config
    });

  fetchMaxTime(game.appid, game.name);
  searchInput.focus();
}

export function initSteamSearch() {
  searchInput.addEventListener("input", () => {
    clearTimeout(timeout);

    selectedGameDiv.innerHTML = "";

    timeout = setTimeout(async () => {
      const query = searchInput.value.trim();

      if (!query) {
        resultsDiv.innerHTML = "";
        return;
      }

      const games = await searchGames(query);

      resultsDiv.innerHTML = "";

      if (!games.length) {
        resultsDiv.innerHTML = "<p>No matches found.</p>";
        return;
      }

      games.forEach((game) => {
        const div = document.createElement("div");
        div.className = "game";
        div.tabIndex = 0;

        div.innerHTML = `
          <img src="https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.icon}.jpg" />
          <strong>${game.name}</strong>
        `;

        div.addEventListener("click", () => selectGame(game));

        div.addEventListener("keydown", (e) => {
          const gameElements = Array.from(resultsDiv.querySelectorAll(".game"));
          const currentIndex = gameElements.indexOf(div);

          if (e.key === "Enter") {
            e.preventDefault();
            selectGame(game);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (currentIndex < gameElements.length - 1) {
              gameElements[currentIndex + 1].focus();
            }
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (currentIndex > 0) {
              gameElements[currentIndex - 1].focus();
            } else {
              searchInput.focus();
            }
          } else if (e.key === "Tab" && !e.shiftKey) {
            if (currentIndex < gameElements.length - 1) {
              e.preventDefault();
              gameElements[currentIndex + 1].focus();
            }
          } else if (e.key === "Tab" && e.shiftKey) {
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

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      const firstGame = resultsDiv.querySelector(".game");
      if (firstGame) {
        e.preventDefault();
        firstGame.focus();
      }
    }
  });

  // Initial auth check to display correct section
  checkAuth().then((data) => {
    if (data.authenticated) {
      authSection.style.display = "none";
      appSection.style.display = "block";
      selectedGameDiv.style.display = "";
      welcome.innerText = `Welcome, ${data.name}`;
    } else {
      authSection.style.display = "block";
      appSection.style.display = "none";
      selectedGameDiv.style.display = "none";
    }
  });
}
