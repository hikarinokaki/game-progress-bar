# game-progress-bar

## Chat Commands

Commands are read from Twitch chat. If a `twitchUsername` is configured, only that user can run commands.

### Timer

| Command                  | Description                                                              |
| ------------------------ | ------------------------------------------------------------------------ |
| `!bar set <seconds>`     | Set current time to an absolute value in seconds (e.g., `!bar set 3600`) |
| `!bar set <time>`        | Set current time using a time expression (e.g., `!bar set 1h 30m`)       |
| `!bar set milestone <n>` | Jump to the nth milestone's time                                         |
| `!bar pause`             | Pause the auto-tick timer                                                |
| `!bar resume`            | Resume the timer                                                         |

### Todos

| Command                 | Description                       |
| ----------------------- | --------------------------------- |
| `!bar todo <id> done`   | Mark a todo as done               |
| `!bar todo <id> undone` | Mark a todo as not done           |
| `!bar todo <id> toggle` | Toggle a todo between done/undone |
| `!bar todo add <text>`  | Add a new todo                    |
| `!bar todo delete <id>` | Delete a todo                     |

### Milestones

| Command                                | Description                                                              |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `!bar milestone add <seconds> [label]` | Add a milestone at `seconds` with optional label                         |
| `!bar milestone add <time> [label]`    | Same using a time expression (e.g., `!bar milestone add 1h 30m Halfway`) |
| `!bar milestone remove <n>`            | Remove milestone #n                                                      |

### Identifying Todos

The `<id>` in todo commands can be any of:

| Form          | Example                        | Description                                                      |
| ------------- | ------------------------------ | ---------------------------------------------------------------- |
| Number        | `!bar todo 3 done`             | 1-indexed position in the todo list                              |
| Quoted text   | `!bar todo "dragon boss" done` | Exact match inside quotes (use for multi-word queries)           |
| Unquoted text | `!bar todo dragon toggle`      | Fuzzy match — searches todo text for `dragon` (case-insensitive) |

If multiple todos contain the same search text, the first match is used. Numbered IDs always take priority over fuzzy matching when the number is in range.

## Necessary environment variables

- STEAM_API_KEY
- BASE_URL
- BASE_PATH=/game-progress-bar
- SESSION_SECRET
- NODE_ENV=production
- PORT
