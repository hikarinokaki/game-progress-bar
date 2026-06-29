import { parseProgressCommand, parseTodoCommand } from "./logic.js";
import tmi from "tmi.js";

let twitchClient = null;

function toggleTodo(params, index, done, callbacks) {
  if (!params.todos || index < 0 || index >= params.todos.length) return;
  params.todos[index] = { ...params.todos[index], done };
  callbacks.renderTodos();
}

export function initTwitch(params, callbacks) {
  const statusEl = document.getElementById("twitch-status");
  if (!params.twitchChannel) {
    if (statusEl) statusEl.style.display = "none";
    return;
  }

  const channel = params.twitchChannel.replace(/^#/, "").toLowerCase();
  if (!channel) {
    if (statusEl) statusEl.style.display = "none";
    return;
  }

  if (statusEl) {
    statusEl.textContent = "Twitch: connecting...";
    statusEl.style.display = "";
  }

  try {
    const client = new tmi.Client({
      channels: [channel],
    });

    client.on("connected", () => {
      if (statusEl) statusEl.textContent = "Twitch: connected to #" + channel;
    });

    client.on("disconnected", (reason) => {
      if (statusEl)
        statusEl.textContent =
          "Twitch: disconnected (" + (reason || "unknown") + ")";
    });

    client.on("message", (_channel, userstate, message, _self) => {
      const username = (
        userstate["display-name"] ||
        userstate.username ||
        ""
      ).toLowerCase();

      if (params.twitchUsername) {
        const allowed = params.twitchUsername.toLowerCase();
        if (username !== allowed) return;
      }

      const trimmed = message.trim();

      if (callbacks && callbacks.setProgressValue) {
        const value = parseProgressCommand(
          trimmed,
          params.milestones,
          params.max,
        );
        if (value !== null) {
          callbacks.setProgressValue(value);
          window.parent.postMessage({ type: "progressJump", value }, "*");
          return;
        }
      }

      const todoCmd = parseTodoCommand(trimmed);
      if (!todoCmd) return;

      const { index, action } = todoCmd;
      let newDone;
      if (action === "done") {
        newDone = true;
      } else if (action === "undone") {
        newDone = false;
      } else {
        if (index >= 0 && index < params.todos.length) {
          newDone = !params.todos[index].done;
        } else {
          return;
        }
      }

      toggleTodo(params, index, newDone, callbacks);

      if (callbacks.updateURL) {
        callbacks.updateURL();
      }

      window.parent.postMessage(
        { type: "todoToggle", index, done: newDone },
        "*",
      );
    });

    client.connect();
    twitchClient = client;
  } catch (err) {
    if (statusEl) statusEl.textContent = "Twitch: error (" + err.message + ")";
    console.error("Twitch init error:", err);
  }
}
