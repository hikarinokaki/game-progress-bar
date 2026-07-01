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
        button.textContent = `${type.label}: ${hours} hrs`;

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
    <div class="selected-game-info">
      <img src="https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.icon}.jpg" />
      <strong>${game.name}</strong>
      <span class="clear-selection" title="Clear selection" aria-label="Clear selection">&times;</span>
    </div>
    <div class="game-buttons">
      <button class="apply-time-btn">
        ${secondsToText(playtimeInSeconds)} played
      </button>
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
      welcome.innerText = data.name;
    } else {
      authSection.style.display = "block";
      appSection.style.display = "none";
      selectedGameDiv.style.display = "none";
    }
  });
}
