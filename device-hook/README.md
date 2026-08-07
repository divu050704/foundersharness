# foundersharness Dev Helper (`device-hook`)

A lightweight C# .NET 8 Windows Forms system tray utility designed to act as an execution bridge between your backend AI agent and a locally managed Playwright browser.

## Features

1. **System Tray Residency**: The application sits in your system tray under the name `foundersharness Dev Helper`. It renders a dynamic badge icon (`H`) in the tray, keeping your taskbar clean.
2. **Double-Click Action**: Double-clicking the tray icon (or selecting **Show Logs / Control Panel** from the right-click menu) opens the Control Panel window.
3. **Graceful Minimize-to-Tray**: Clicking the "X" close button doesn't quit the application; it hides the UI and keeps the browser and server running in the background. To quit, right-click the system tray icon and choose **Exit Application**.
4. **Programmatic Playwright Installer**: Playwright requires browser engines (Chromium, Firefox, Webkit) to be downloaded. The app detects if they are missing and downloads them silently in a background thread when you click **Install Playwright**, logging the installation progress in real-time.
5. **Built-in WebSocket Server**: Operates a native, lightweight WebSocket server on `ws://localhost:9000` to receive control requests from your NestJS backend or other agents.
6. **Beautiful Dark-Theme Control Panel**: Features an Charcoal-Dark control panel showing live status indicators for the WebSocket server and browser connection, controls to manual toggle them, and a scrollable console displaying timestamped debug logs.

---

## Getting Started

### 1. How to Build and Run the App

Open your terminal in the `device-hook` folder and run the standard .NET CLI commands:

```bash
# Navigate to the project folder
cd device-hook

# Build the project
dotnet build

# Run the application
dotnet run
```

Once started, the application will initialize silently and sit in your Windows System Tray (typically in the bottom right overflow menu). Double-click the tray icon to open the Control Panel.

---

## Connecting Your Backend Agent

Your backend (e.g., NestJS application in `/backend`) can easily connect to this helper via WebSockets. Here is a TypeScript example of how to connect and send commands:

```typescript
import WebSocket from 'ws';

// Connect to the C# helper's WebSocket server
const ws = new WebSocket('ws://localhost:9000/');

ws.on('open', () => {
  console.log('Connected to foundersharness C# Helper!');

  // Send a navigation command to the browser
  const command = {
    id: 'cmd_1',
    action: 'navigate',
    url: 'https://news.ycombinator.com'
  };
  ws.send(JSON.stringify(command));
});

ws.on('message', (data) => {
  const response = JSON.parse(data.toString());
  console.log('Received response from C# helper:', response);
  
  if (response.status === 'success') {
     // Execute next action, e.g., click an element or take a screenshot
  }
});
```

---

## JSON API Protocol Reference

The C# helper processes incoming JSON text messages and returns JSON replies.

### General Message Format

**Request:**
```json
{
  "id": "unique_message_id",
  "action": "action_name",
  "url": "optional_url",
  "selector": "optional_css_selector",
  "text": "optional_input_text",
  "key": "optional_keyboard_key",
  "script": "optional_js_script"
}
```

**Response:**
```json
{
  "id": "same_message_id",
  "status": "success" | "error",
  "result": "action_dependent_result_payload",
  "message": "error_message_string_if_failed"
}
```

### Supported Actions

| Action | Parameters | Description | Result Returned |
| :--- | :--- | :--- | :--- |
| `launch` | None | Launches the visible Chromium browser if not already open. | `"Browser launched successfully."` |
| `close` | None | Closes the running browser instance. | `"Browser closed successfully."` |
| `navigate` | `url` | Navigates the browser to the specified website. | `"Navigated to [URL]"` |
| `click` | `selector` | Clicks the element matching the CSS selector. | `"Clicked selector [selector]"` |
| `fill` | `selector`, `text` | Types text into an input field matching the CSS selector. | `"Filled [selector] with text"` |
| `press` | `selector`, `key` | Presses a key (e.g., `"Enter"`) on the specified selector. | `"Pressed [key] on [selector]"` |
| `screenshot`| None | Takes a screenshot of the active browser page. | Base64-encoded PNG string |
| `content` | None | Retrieves the ARIA accessibility tree snapshot of the active page. | YAML-formatted ARIA snapshot string |
| `get_text` | `selector` | Reads the text content of the specified selector. | String text content |
| `get_value` | `selector` | Reads the input value of the specified selector. | String input value |
| `new_page` | None | Opens a new browser tab/page. | `"Opened new tab"` |
| `close_page`| None | Closes the current active tab and switches to the last one. | `"Closed tab"` |
| `active_pages`| None | Lists all URLs currently open across your tabs. | Array of URL strings |
| `evaluate` | `script` | Executes custom JavaScript inside the active page context. | Stringified JSON result |

---

## Code Architecture (How We Did It)

Here is a quick overview of the code written in [Form1.cs](file:///D:/Divyanshu/Work/foundersharness/device-hook/Form1.cs):

1. **`SetupCustomUI()`**: Instantiates UI panels, labels, textbox logs, and styled flat buttons programmatically. This ensures the app is styled beautifully (Charcoal Dark UI theme) without relying on Visual Studio's drag-and-drop designer.
2. **`SetupSystemTray()`**: Creates a `NotifyIcon` and associates it with a `ContextMenuStrip` featuring common controls (Show, Launch Browser, Exit). It calls `CreateDynamicIcon()` which uses C# `Graphics` to draw a vector circular gradient icon at runtime.
3. **`SetVisibleCore(bool)`**: We override this WinForms method to intercept the form's visibility on startup. It forces the form to remain hidden during launch, allowing the application to boot cleanly straight to the system tray.
4. **`StartWebSocketServerAsync()`**: Boots an asynchronous `HttpListener` on port `9000`. It filters incoming requests to accept WebSocket handshakes using `context.AcceptWebSocketAsync()` and processes incoming client command strings.
5. **`CheckAndInstallPlaywrightAsync(bool)`**: Resolves browser dependencies. Since automated processes cannot interact with user UAC dialogs, this checks the local AppData folder for browser engines. If missing, it starts a silent background `PowerShell.exe` process that executes `playwright.ps1 install` in your project build directory, redirecting standard output directly into our UI console logs.
6. **`ProcessPlaywrightCommandAsync(string)`**: Standard router that parses incoming JSON agent commands and maps them to async calls on the `Microsoft.Playwright` API (such as `_activePage.GotoAsync()`, `_activePage.ClickAsync()`, etc.).
