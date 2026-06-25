const STORAGE_KEY = "game-progress-theme";

export function getTheme() {
  return localStorage.getItem(STORAGE_KEY) || "default";
}

export function setTheme(theme) {
  document.documentElement.setAttribute(
    "data-theme",
    theme === "default" ? "" : theme,
  );
  localStorage.setItem(STORAGE_KEY, theme);
}

export function initTheme() {
  const saved = getTheme();
  setTheme(saved);

  const select = document.getElementById("themeSelect");
  if (select) {
    select.value = saved;
    select.addEventListener("change", (e) => {
      setTheme(e.target.value);
    });
  }
}
