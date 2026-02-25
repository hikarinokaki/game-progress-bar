// src/public/js/api.js

export async function checkAuth() {
  const res = await fetch("api/me");
  return res.json();
}

export async function searchGames(query) {
  const res = await fetch(`api/search?q=${encodeURIComponent(query)}`);
  return res.json();
}

export async function fetchMaxTime(appid) {
  const res = await fetch(`api/max-time?appid=${appid}`);
  return res.json();
}
