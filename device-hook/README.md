# foundersharness Dev Helper (`device-hook`) 🖥️

A lightweight **C# .NET 8 (Avalonia UI)** Windows system tray utility designed to act as an execution bridge between your backend AI agents and locally managed Playwright browser sessions.

---

## 🌟 Features

1. **System Tray Residency**: Sits cleanly in your Windows system tray under `foundersharness Dev Helper` with a dynamic vector icon (`H`).
2. **Avalonia Control Panel**: Built-in dark theme control panel showing live status indicators for the WebSocket server (`ws://localhost:9000`) and active Playwright browser sessions.
3. **Minimize-to-Tray**: Intercepts close (`X`) events to keep server and browser execution uninterrupted in the background. To quit, right-click the system tray icon and select **Exit Application**.
4. **Automated `playwright-cli` Installer**: Detects missing browser CLI tooling and downloads required browser engines in background threads, logging installation progress in real-time.
5. **Native Asynchronous WebSocket Server**: Hosts an `HttpListener` WebSocket gateway on `ws://localhost:9000` for real-time agent control.
6. **Session-Aware Browser Execution**: Supports multi-session isolated browser profiles via `playwright-cli`.

---

## 🚀 Getting Started

### 1. Build and Run

```bash
# Navigate to device-hook directory
cd device-hook

# Build project with .NET CLI
dotnet build

# Run application
dotnet run
```

Once launched, the app minimizes to your Windows system tray. Double-click the tray icon to open the Control Panel.

---

## 📡 Message Routing & Connection Architecture

The application hosts a WebSocket server on `ws://localhost:9000/`.

In Founders Harness:
- **Frontend WebApp** (`DeviceHookBridge`) connects directly to `device-hook` at `ws://localhost:9000/` and to the Backend WebSocket relay at `ws://localhost:5001`.
- **Backend Services** (`DeviceHookService`) send browser commands to Frontend over `ws://localhost:5001`.
- **Frontend** relays the commands over `ws://localhost:9000/` to `device-hook`, receives responses from `device-hook`, and relays them back to Backend.

```
+----------------+      ws://localhost:5001      +---------------+      ws://localhost:9000      +----------------------+
| NestJS Backend | <---------------------------> | Next.js WebApp | <---------------------------> | device-hook (C# App) |
+----------------+                               +---------------+                               +----------------------+
```

---

## 📑 Protocol Specification

### General Message Format

**Request Payload:**
```json
{
  "id": "unique_message_id",
  "action": "action_name",
  "sessionName": "optional_session_identifier",
  "url": "https://example.com",
  "ref": "element_ref_id",
  "text": "input_text",
  "key": "Enter",
  "script": "JavaScript code"
}
```

**Response Payload:**
```json
{
  "id": "unique_message_id",
  "status": "success" | "error",
  "result": "action_dependent_result_payload",
  "message": "error_message_string_if_failed"
}
```

---

### Supported Actions

| Action | Parameters | Description | Result Payload |
| :--- | :--- | :--- | :--- |
| `launch` | `sessionName` | Opens Playwright Chromium browser | `"Browser launched successfully."` |
| `close` | `sessionName` | Closes active browser session | `"Browser closed successfully."` |
| `navigate` | `url`, `sessionName` | Navigates browser to specified URL | `"Navigated to [URL]"` |
| `snapshot` | `ref`, `depth` | Captures YAML accessibility tree snapshot | YAML string content |
| `click_ref` | `ref` | Clicks target ref element | `"Clicked ref [ref]"` |
| `dblclick_ref`| `ref` | Double-clicks target ref element | `"Double-clicked ref [ref]"` |
| `fill_ref` | `ref`, `text`, `submit` | Types text into input field (optional enter key submit) | `"Filled ref [ref]"` |
| `select_ref` | `ref`, `value` | Selects dropdown option by value | `"Selected [value] on ref [ref]"` |
| `check_ref` | `ref` | Checks checkbox or radio button | `"check ref [ref]"` |
| `uncheck_ref`| `ref` | Unchecks checkbox | `"uncheck ref [ref]"` |
| `hover_ref` | `ref` | Hovers mouse over target ref | `"Hovered ref [ref]"` |
| `press` | `key`, `ref` | Focuses element (optional) and presses keyboard key | `"Pressed [key]"` |
| `type` | `text` | Types raw text into focused element | `"Typed text"` |
| `screenshot` | `ref` (optional) | Captures screenshot of page or element | Base64-encoded PNG string |
| `dialog_accept`| `promptText` | Accepts JS alert/prompt dialog | `"Dialog accepted"` |
| `dialog_dismiss`| None | Dismisses JS alert dialog | `"Dialog dismissed"` |
| `evaluate` | `script`, `ref` | Executes custom JS inside page or element context | Stringified execution output |
| `get_text` | `ref` | Extracts `textContent` of ref element | Text string |
| `get_value` | `ref` | Extracts `value` property of ref element | Value string |
| `new_page` | `url` | Opens a new browser tab | `"Opened new tab"` |
| `close_page`| `index` | Closes tab by index or active tab | `"Closed tab"` |
| `active_pages`| None | Lists open tabs in session | Tab list payload |
| `go_back` | None | Navigates back in history | `"go-back"` |
| `go_forward`| None | Navigates forward in history | `"go-forward"` |
| `reload` | None | Reloads active page | `"reload"` |

---

## 🏛️ Code Architecture

- **`MainWindow.axaml / cs`**: Main Avalonia Window managing UI logs, system tray creation (`SetupSystemTray`), and auto-setup checks.
- **`StartWebSocketServerAsync()`**: Asynchronous `HttpListener` managing client connections on `ws://localhost:9000/`.
- **`ProcessCliCommandAsync()`**: Routes agent WebSocket requests to underlying `playwright-cli` processes.
- **`RunCliAsync()`**: Asynchronous process runner executing `playwright-cli` CLI subcommands safely in the background.
