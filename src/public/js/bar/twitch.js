import { parseBarCommand, findTodoIndex } from "./logic.js";
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
      const cmd = parseBarCommand(trimmed, params.milestones, params.max);

      if (cmd) {
        switch (cmd.type) {
          case "set":
            callbacks.setProgressValue(cmd.value);
            window.parent.postMessage(
              { type: "progressJump", value: cmd.value },
              "*",
            );
            return;

          case "setMilestone": {
            const value = Math.min(
              params.milestones[cmd.index].seconds,
              params.max,
            );
            callbacks.setProgressValue(value);
            window.parent.postMessage({ type: "progressJump", value }, "*");
            return;
          }

          case "pause":
            if (callbacks.pauseTimer) callbacks.pauseTimer();
            if (statusEl) statusEl.textContent = "Twitch: paused";
            return;

          case "resume":
            if (callbacks.resumeTimer) callbacks.resumeTimer();
            if (statusEl)
              statusEl.textContent = "Twitch: connected to #" + channel;
            return;

          case "todoAction": {
            const index = findTodoIndex(params.todos, cmd.id);
            if (index < 0) return;
            let newDone;
            if (cmd.action === "done") newDone = true;
            else if (cmd.action === "undone") newDone = false;
            else newDone = !params.todos[index].done;
            toggleTodo(params, index, newDone, callbacks);
            callbacks.updateURL();
            window.parent.postMessage(
              { type: "todoToggle", index, done: newDone },
              "*",
            );
            return;
          }

          case "todoAdd":
            params.todos.push({ text: cmd.text, done: false });
            callbacks.renderTodos();
            callbacks.updateURL();
            window.parent.postMessage({ type: "todoAdd", text: cmd.text }, "*");
            return;

          case "todoDelete": {
            const index = findTodoIndex(params.todos, cmd.id);
            if (index < 0) return;
            params.todos.splice(index, 1);
            callbacks.renderTodos();
            callbacks.updateURL();
            window.parent.postMessage({ type: "todoDelete", index }, "*");
            return;
          }

          case "milestoneAdd":
            params.milestones.push({
              seconds: cmd.seconds,
              text: cmd.text || "",
            });
            params.milestones.sort((a, b) => a.seconds - b.seconds);
            callbacks.renderMilestones();
            callbacks.updateURL();
            window.parent.postMessage(
              {
                type: "milestoneAdd",
                seconds: cmd.seconds,
                text: cmd.text,
              },
              "*",
            );
            return;

          case "milestoneRemove":
            if (cmd.index >= 0 && cmd.index < params.milestones.length) {
              params.milestones.splice(cmd.index, 1);
              callbacks.renderMilestones();
              callbacks.updateURL();
              window.parent.postMessage(
                { type: "milestoneRemove", index: cmd.index },
                "*",
              );
            }
            return;
        }
        return;
      }
    });

    client.connect();
    twitchClient = client;
  } catch (err) {
    if (statusEl) statusEl.textContent = "Twitch: error (" + err.message + ")";
    console.error("Twitch init error:", err);
  }
}
