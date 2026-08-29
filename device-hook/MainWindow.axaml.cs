using System;
using System.Diagnostics;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Interactivity;
using Avalonia.Media;
using Avalonia.Media.Imaging;
using Avalonia.Platform;
using Avalonia.Threading;

// NOTE: Microsoft.Playwright is no longer used here. The browser is now owned
// entirely by the `playwright-cli` process (npm package @playwright/cli), which
// keeps a persistent background session alive between individual CLI invocations.
// This class becomes a relay: WebSocket in <-> shell out to playwright-cli <-> WebSocket out.

namespace foundersharness
{
    public partial class MainWindow : Window
    {
        // WebSocket Server variables
        private HttpListener? _httpListener;
        private CancellationTokenSource? _serverCts;
        private const int Port = 9000;

        // playwright-cli session state (replaces IPlaywright / IBrowser / IBrowserContext / IPage)
        private bool _browserOpen = false;
        private string _activeSessionName = "";

        // VERIFY: confirm the actual binary name on PATH after `npm install -g @playwright/cli`.
        // Docs/examples consistently show `playwright-cli`, but check `where playwright-cli` (Windows)
        // after install to be sure npm's global bin dir is on PATH.
        private const string CliExecutable = "playwright-cli";

        // Flags
        private bool _isExiting = false;
        private bool _isInstallingCli = false;

        // Tray Icon
        private TrayIcon? _trayIcon;

        public MainWindow()
        {
            InitializeComponent();
            SetupSystemTray();
        }

        protected override void OnOpened(EventArgs e)
        {
            base.OnOpened(e);

            // Log startup
            Log("foundersharness Dev Helper started.");

            // Automatically start the WebSocket server on load
            _ = StartWebSocketServerAsync();

            // Run check and auto-setup in background
            _ = RunAutoSetupAsync();
        }

        private void SetupSystemTray()
        {
            try
            {
                var trayIcon = new TrayIcon
                {
                    ToolTipText = "foundersharness Dev Helper",
                    Icon = CreateDynamicIcon()
                };

                var menu = new NativeMenu();

                var showItem = new NativeMenuItem("Show Logs / Control Panel");
                showItem.Click += (s, e) => ShowWindow();
                menu.Add(showItem);

                var launchItem = new NativeMenuItem("Launch Agent Browser");
                launchItem.Click += async (s, e) => await EnsureBrowserOpenAsync();
                menu.Add(launchItem);

                var closeItem = new NativeMenuItem("Close Browser");
                closeItem.Click += async (s, e) => await CloseBrowserAsync();
                menu.Add(closeItem);

                menu.Add(new NativeMenuItemSeparator());

                var exitItem = new NativeMenuItem("Exit Application");
                exitItem.Click += (s, e) => ExitApplication();
                menu.Add(exitItem);

                trayIcon.Menu = menu;
                trayIcon.Clicked += (s, e) => ShowWindow();

                var icons = TrayIcon.GetIcons(Application.Current!);
                if (icons != null)
                {
                    icons.Add(trayIcon);
                }
                _trayIcon = trayIcon;
            }
            catch (Exception ex)
            {
                Log($"Failed to setup system tray: {ex.Message}");
            }
        }

        private WindowIcon CreateDynamicIcon()
        {
            var pixelSize = new PixelSize(32, 32);
            using var bitmap = new RenderTargetBitmap(pixelSize, new Vector(96, 96));
            using (var ctx = bitmap.CreateDrawingContext())
            {
                // Draw circular background (moss green)
                ctx.DrawRectangle(
                    new SolidColorBrush(Color.Parse("#4a6b4e")),
                    null,
                    new RoundedRect(new Rect(2, 2, 28, 28), 4)
                );

                // Draw central letter 'H' (Field notes cream)
                var formattedText = new FormattedText(
                    "H",
                    System.Globalization.CultureInfo.InvariantCulture,
                    FlowDirection.LeftToRight,
                    new Typeface("Inter, Segoe UI, sans-serif", FontStyle.Normal, FontWeight.Bold),
                    18,
                    new SolidColorBrush(Color.Parse("#edeae2"))
                );

                // Draw text centered
                ctx.DrawText(formattedText, new Point(9, 4));
            }

            using var memoryStream = new MemoryStream();
            bitmap.Save(memoryStream);
            memoryStream.Seek(0, SeekOrigin.Begin);
            return new WindowIcon(memoryStream);
        }

        private void Log(string message)
        {
            Dispatcher.UIThread.Post(() =>
            {
                var txtLogs = this.FindControl<TextBox>("TxtLogs");
                if (txtLogs != null)
                {
                    txtLogs.Text += $"[{DateTime.Now:HH:mm:ss}] {message}{Environment.NewLine}";
                    // Scroll to bottom
                    txtLogs.CaretIndex = txtLogs.Text.Length;
                }
            });
        }

        private void LogInstall(string message, TextBox logBox)
        {
            Dispatcher.UIThread.Post(() =>
            {
                logBox.Text += $"[{DateTime.Now:HH:mm:ss}] {message}{Environment.NewLine}";
                logBox.CaretIndex = logBox.Text.Length;

                var lblInstallDetails = this.FindControl<TextBlock>("LblInstallDetails");
                if (lblInstallDetails != null)
                {
                    lblInstallDetails.Text = message;
                }
            });
        }

        private void UpdateUIStates()
        {
            Dispatcher.UIThread.Post(() =>
            {
                var elServerStatus = this.FindControl<Avalonia.Controls.Shapes.Ellipse>("ElServerStatus");
                var lblServerStatus = this.FindControl<TextBlock>("LblServerStatus");
                var btnToggleServer = this.FindControl<Button>("BtnToggleServer");

                if (lblServerStatus != null && elServerStatus != null && btnToggleServer != null)
                {
                    if (_httpListener?.IsListening == true)
                    {
                        lblServerStatus.Text = $"Server: Running on {Port}";
                        elServerStatus.Fill = new SolidColorBrush(Color.Parse("#4a6b4e")); // Moss Green
                        btnToggleServer.Content = "Stop Server";
                    }
                    else
                    {
                        lblServerStatus.Text = "Server: Stopped";
                        elServerStatus.Fill = new SolidColorBrush(Color.Parse("#a33a3a")); // Red
                        btnToggleServer.Content = "Start Server";
                    }
                }

                var elBrowserStatus = this.FindControl<Avalonia.Controls.Shapes.Ellipse>("ElBrowserStatus");
                var lblBrowserStatus = this.FindControl<TextBlock>("LblBrowserStatus");
                var btnToggleBrowser = this.FindControl<Button>("BtnToggleBrowser");

                if (lblBrowserStatus != null && elBrowserStatus != null && btnToggleBrowser != null)
                {
                    if (_browserOpen)
                    {
                        lblBrowserStatus.Text = $"Browser: Running ({_activeSessionName})";
                        elBrowserStatus.Fill = new SolidColorBrush(Color.Parse("#4a6b4e"));
                        btnToggleBrowser.Content = "Close Browser";
                    }
                    else
                    {
                        lblBrowserStatus.Text = "Browser: Closed";
                        elBrowserStatus.Fill = new SolidColorBrush(Color.Parse("#a33a3a"));
                        btnToggleBrowser.Content = "Launch Browser";
                    }
                }
            });
        }

        #region Window Events

        protected override void OnClosing(WindowClosingEventArgs e)
        {
            if (!_isExiting)
            {
                // Prevent window close, hide instead
                e.Cancel = true;
                this.IsVisible = false;
                Log("Application minimized to system tray.");
            }
            base.OnClosing(e);
        }

        private void ShowWindow()
        {
            Dispatcher.UIThread.Post(() =>
            {
                this.IsVisible = true;
                this.WindowState = WindowState.Normal;
                this.Activate();
            });
        }

        private void ExitApplication()
        {
            _isExiting = true;
            Log("Shutting down application...");

            Task.Run(async () =>
            {
                await StopWebSocketServerAsync();
                await CloseBrowserAsync();

                Dispatcher.UIThread.Post(() =>
                {
                    if (_trayIcon != null)
                    {
                        var icons = TrayIcon.GetIcons(Application.Current!);
                        if (icons != null)
                        {
                            icons.Remove(_trayIcon);
                        }
                        _trayIcon.Dispose();
                    }

                    if (Application.Current?.ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
                    {
                        desktop.Shutdown();
                    }
                });
            });
        }

        private void OnHideClick(object sender, RoutedEventArgs e)
        {
            this.IsVisible = false;
        }

        private void OnClearLogsClick(object sender, RoutedEventArgs e)
        {
            var txtLogs = this.FindControl<TextBox>("TxtLogs");
            if (txtLogs != null) txtLogs.Text = string.Empty;
        }

        #endregion

        #region WebSocket Server Operations

        private async void OnToggleServerClick(object sender, RoutedEventArgs e)
        {
            if (_httpListener?.IsListening == true)
            {
                await StopWebSocketServerAsync();
            }
            else
            {
                await StartWebSocketServerAsync();
            }
        }

        private Task StartWebSocketServerAsync()
        {
            if (_httpListener != null) return Task.CompletedTask;

            try
            {
                _httpListener = new HttpListener();
                _httpListener.Prefixes.Add($"http://localhost:{Port}/");
                _httpListener.Start();

                _serverCts = new CancellationTokenSource();
                Log($"WebSocket Server started on ws://localhost:{Port}/");
                UpdateUIStates();

                // Accept connection loop
                _ = Task.Run(() => AcceptConnectionsAsync(_serverCts.Token));
            }
            catch (Exception ex)
            {
                Log($"Failed to start WebSocket Server: {ex.Message}");
                _httpListener = null;
                UpdateUIStates();
            }
            return Task.CompletedTask;
        }

        private Task StopWebSocketServerAsync()
        {
            if (_httpListener == null) return Task.CompletedTask;

            Log("Stopping WebSocket Server...");
            _serverCts?.Cancel();

            try
            {
                _httpListener.Stop();
                _httpListener.Close();
            }
            catch (Exception ex)
            {
                Log($"Error closing listener: {ex.Message}");
            }

            _httpListener = null;
            _serverCts = null;
            Log("WebSocket Server stopped.");
            UpdateUIStates();
            return Task.CompletedTask;
        }

        private async Task AcceptConnectionsAsync(CancellationToken cancellationToken)
        {
            while (!cancellationToken.IsCancellationRequested && _httpListener?.IsListening == true)
            {
                try
                {
                    var context = await _httpListener.GetContextAsync();
                    if (context.Request.IsWebSocketRequest)
                    {
                        _ = Task.Run(() => HandleAgentConnectionAsync(context, cancellationToken));
                    }
                    else
                    {
                        context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                        context.Response.Close();
                    }
                }
                catch (Exception)
                {
                    break;
                }
            }
        }

        private async Task HandleAgentConnectionAsync(HttpListenerContext context, CancellationToken cancellationToken)
        {
            HttpListenerWebSocketContext? wsContext = null;
            try
            {
                wsContext = await context.AcceptWebSocketAsync(subProtocol: null);
                Log("Backend agent connected via WebSocket!");
            }
            catch (Exception ex)
            {
                Log($"Failed to accept WebSocket connection: {ex.Message}");
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                context.Response.Close();
                return;
            }

            WebSocket webSocket = wsContext.WebSocket;
            byte[] buffer = new byte[8192];

            try
            {
                while (webSocket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
                {
                    var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken);
                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        Log("Backend agent requested close connection.");
                        await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Close acknowledged", CancellationToken.None);
                        break;
                    }

                    if (result.MessageType == WebSocketMessageType.Text)
                    {
                        string messageJson = Encoding.UTF8.GetString(buffer, 0, result.Count);
                        string responseJson = await ProcessCliCommandAsync(messageJson);

                        byte[] responseBytes = Encoding.UTF8.GetBytes(responseJson);
                        await webSocket.SendAsync(new ArraySegment<byte>(responseBytes), WebSocketMessageType.Text, true, cancellationToken);
                    }
                }
            }
            catch (Exception ex)
            {
                Log($"WebSocket connection error: {ex.Message}");
            }
            finally
            {
                webSocket.Dispose();
                Log("Backend agent connection closed.");
            }
        }

        #endregion

        #region playwright-cli process runner

        private class CliResult
        {
            public bool Success;
            public string StdOut = "";
            public string StdErr = "";
            public int ExitCode;
        }

        /// <summary>
        /// Runs `playwright-cli {arguments}` as a subprocess and captures output.
        /// Each call is a fresh OS process; playwright-cli itself is responsible for
        /// keeping the actual browser alive across calls via its background daemon session.
        /// </summary>
        private async Task<CliResult> RunCliAsync(string arguments, int timeoutMs = 30000)
        {
            ProcessStartInfo psi;
            if (OperatingSystem.IsWindows())
            {
                psi = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = $"/c {CliExecutable} {arguments}",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
            }
            else
            {
                psi = new ProcessStartInfo
                {
                    FileName = CliExecutable,
                    Arguments = arguments,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
            }

            Log($"[playwright-cli] {arguments}");

            using var process = new Process { StartInfo = psi };
            var stdOut = new StringBuilder();
            var stdErr = new StringBuilder();

            process.OutputDataReceived += (s, e) => { if (e.Data != null) stdOut.AppendLine(e.Data); };
            process.ErrorDataReceived += (s, e) => { if (e.Data != null) stdErr.AppendLine(e.Data); };

            try
            {
                process.Start();
                process.BeginOutputReadLine();
                process.BeginErrorReadLine();

                using var cts = new CancellationTokenSource(timeoutMs);
                try
                {
                    await process.WaitForExitAsync(cts.Token);
                }
                catch (OperationCanceledException)
                {
                    try { process.Kill(entireProcessTree: true); } catch { /* best effort */ }
                    return new CliResult { Success = false, StdErr = $"Command timed out after {timeoutMs}ms: {arguments}" };
                }

                return new CliResult
                {
                    Success = process.ExitCode == 0,
                    StdOut = stdOut.ToString(),
                    StdErr = stdErr.ToString(),
                    ExitCode = process.ExitCode
                };
            }
            catch (Exception ex)
            {
                return new CliResult { Success = false, StdErr = $"Failed to start playwright-cli: {ex.Message}" };
            }
        }

        /// <summary>
        /// Confirmed syntax per playwright-cli docs: the session flag is a GLOBAL flag that
        /// precedes the subcommand, e.g. `playwright-cli -s=myproj open https://example.com`.
        /// Empty/"default" session name omits the flag and uses the CLI's own default session.
        /// </summary>
        private static string SessionPrefix(string sessionName) =>
            string.IsNullOrEmpty(sessionName) || sessionName == "default" ? "" : $"-s=\"{sessionName}\" ";

        /// <summary>
        /// Builds and runs `playwright-cli [-s=session] {command}` in one place so every
        /// call site gets consistent session scoping.
        /// </summary>
        private Task<CliResult> RunCliCommandAsync(string sessionName, string command, int timeoutMs = 30000) =>
            RunCliAsync($"{SessionPrefix(sessionName)}{command}", timeoutMs);

        /// <summary>
        /// Per-session output directory for snapshot/screenshot files, so concurrent sessions
        /// never collide and we always know the exact path without parsing CLI stdout.
        /// </summary>
        private static string GetSessionOutputDir(string sessionName)
        {
            string dir = Path.Combine(Path.GetTempPath(), "foundersharness-cli", string.IsNullOrEmpty(sessionName) ? "default" : sessionName);
            Directory.CreateDirectory(dir);
            return dir;
        }

        #endregion

        #region Browser (playwright-cli session) Operations

        private async void OnToggleBrowserClick(object sender, RoutedEventArgs e)
        {
            if (_browserOpen)
            {
                await CloseBrowserAsync();
            }
            else
            {
                bool installed = await CheckAndInstallCliAsync(autoInstall: true);
                if (installed)
                {
                    await EnsureBrowserOpenAsync();
                }
            }
        }

        private async Task<bool> EnsureBrowserOpenAsync(string sessionName = "default")
        {
            if (_browserOpen)
            {
                if (_activeSessionName != sessionName)
                {
                    Log($"Switching browser session from '{_activeSessionName}' to '{sessionName}'...");
                    await CloseBrowserAsync();
                }
                else
                {
                    return true;
                }
            }

            _activeSessionName = sessionName;

            Log($"Opening playwright-cli session '{sessionName}'...");

            // Confirmed: open is HEADLESS by default. --headed shows the window (we want that,
            // since this is a desktop app where visibility matters for debugging/trust).
            // --persistent saves the profile to disk so login state survives app restarts.
            var result = await RunCliCommandAsync(sessionName, "open --persistent --headed", timeoutMs: 60000);

            if (!result.Success)
            {
                Log($"Failed to open browser session: {result.StdErr}");

                if (result.StdErr.Contains("browser", StringComparison.OrdinalIgnoreCase) &&
                    (result.StdErr.Contains("not found", StringComparison.OrdinalIgnoreCase) ||
                     result.StdErr.Contains("install", StringComparison.OrdinalIgnoreCase)))
                {
                    Log("Attempting automatic recovery/installation of playwright-cli browser binaries...");
                    bool success = await CheckAndInstallCliAsync(autoInstall: true);
                    if (success)
                    {
                        Log("Installation complete. Retrying browser open...");
                        return await EnsureBrowserOpenAsync(sessionName);
                    }
                }

                _browserOpen = false;
                UpdateUIStates();
                return false;
            }

            _browserOpen = true;
            Log("Browser ready.");
            UpdateUIStates();
            return true;
        }

        private async Task CloseBrowserAsync()
        {
            if (!_browserOpen) return;

            Log("Closing browser...");

            // Confirmed core command: `close` closes the page/browser for the given session.
            var result = await RunCliCommandAsync(_activeSessionName, "close");
            if (!result.Success)
            {
                Log($"Error closing browser: {result.StdErr}");
            }

            _browserOpen = false;
            Log("Browser closed.");
            UpdateUIStates();
        }

        #endregion

        #region Command Processing

        private async Task<string> ProcessCliCommandAsync(string requestJson)
        {
            string id = "unknown";
            try
            {
                using var doc = JsonDocument.Parse(requestJson);
                var root = doc.RootElement;

                if (root.TryGetProperty("id", out var idProp))
                {
                    id = idProp.GetString() ?? "unknown";
                }

                if (!root.TryGetProperty("action", out var actionProp))
                {
                    return CreateResponseJson(id, "error", null, "Missing 'action' parameter.");
                }

                string action = actionProp.GetString() ?? "";
                Log($"Executing agent action: {action}");

                string sessionName = "default";
                if (root.TryGetProperty("sessionName", out var sessionNameProp))
                {
                    string? sn = sessionNameProp.GetString();
                    if (!string.IsNullOrEmpty(sn)) sessionName = sn;
                }

                if (action == "launch")
                {
                    bool ok = await EnsureBrowserOpenAsync(sessionName);
                    return ok
                        ? CreateResponseJson(id, "success", "Browser launched successfully.")
                        : CreateResponseJson(id, "error", null, "Failed to launch browser via playwright-cli.");
                }
                else if (action == "close")
                {
                    await CloseBrowserAsync();
                    return CreateResponseJson(id, "success", "Browser closed successfully.");
                }

                bool opened = await EnsureBrowserOpenAsync(sessionName);
                if (!opened)
                {
                    return CreateResponseJson(id, "error", null, "Browser could not be initialized.");
                }

                string outputDir = GetSessionOutputDir(sessionName);

                switch (action.ToLower())
                {
                    case "snapshot":
                    {
                        // Confirmed: `snapshot --filename=f` saves to a specific path, so we don't
                        // need to parse the auto-generated "[Snapshot](...)" link at all.
                        string snapshotPath = Path.Combine(outputDir, $"snapshot-{Guid.NewGuid():N}.yaml");
                        string cmd = $"snapshot --filename=\"{snapshotPath}\"";

                        // Optional depth limit for efficiency, mirroring `snapshot --depth=N`.
                        if (root.TryGetProperty("depth", out var depthProp) && depthProp.TryGetInt32(out int depth))
                            cmd += $" --depth={depth}";

                        // Optional: snapshot a specific element instead of the whole page
                        // (`snapshot <ref>` / `snapshot "#selector"`).
                        if (root.TryGetProperty("ref", out var snapRefProp))
                            cmd += $" {snapRefProp.GetString()}";

                        var result = await RunCliCommandAsync(sessionName, cmd);
                        if (!result.Success)
                            return CreateResponseJson(id, "error", null, $"snapshot failed: {result.StdErr}");

                        try
                        {
                            string yamlContent = await File.ReadAllTextAsync(snapshotPath);
                            return CreateResponseJson(id, "success", yamlContent);
                        }
                        catch (Exception ex)
                        {
                            return CreateResponseJson(id, "error", null, $"Snapshot file could not be read at '{snapshotPath}': {ex.Message}");
                        }
                    }

                    case "click_ref":
                    {
                        if (!root.TryGetProperty("ref", out var refProp))
                            return CreateResponseJson(id, "error", null, "Missing 'ref' parameter for click_ref action.");
                        string refId = refProp.GetString() ?? "";
                        var result = await RunCliCommandAsync(sessionName, $"click {refId}");
                        return result.Success
                            ? CreateResponseJson(id, "success", $"Clicked ref {refId}")
                            : CreateResponseJson(id, "error", null, $"click_ref failed: {result.StdErr}");
                    }

                    case "dblclick_ref":
                    {
                        if (!root.TryGetProperty("ref", out var refProp))
                            return CreateResponseJson(id, "error", null, "Missing 'ref' parameter for dblclick_ref action.");
                        string refId = refProp.GetString() ?? "";
                        var result = await RunCliCommandAsync(sessionName, $"dblclick {refId}");
                        return result.Success
                            ? CreateResponseJson(id, "success", $"Double-clicked ref {refId}")
                            : CreateResponseJson(id, "error", null, $"dblclick_ref failed: {result.StdErr}");
                    }

                    case "fill_ref":
                    {
                        if (!root.TryGetProperty("ref", out var fillRefProp) || !root.TryGetProperty("text", out var fillTextProp))
                            return CreateResponseJson(id, "error", null, "Missing 'ref' or 'text' parameter for fill_ref action.");
                        string fillRef = fillRefProp.GetString() ?? "";
                        string fillText = fillTextProp.GetString() ?? "";
                        string escapedText = fillText.Replace("\"", "\\\"");

                        // Optional: `fill <ref> <text> --submit` presses Enter afterwards.
                        bool submit = root.TryGetProperty("submit", out var submitProp) && submitProp.GetBoolean();
                        string cmd = $"fill {fillRef} \"{escapedText}\"" + (submit ? " --submit" : "");

                        var result = await RunCliCommandAsync(sessionName, cmd);
                        return result.Success
                            ? CreateResponseJson(id, "success", $"Filled ref {fillRef}")
                            : CreateResponseJson(id, "error", null, $"fill_ref failed: {result.StdErr}");
                    }

                    case "select_ref":
                    {
                        if (!root.TryGetProperty("ref", out var selRefProp) || !root.TryGetProperty("value", out var selValProp))
                            return CreateResponseJson(id, "error", null, "Missing 'ref' or 'value' parameter for select_ref action.");
                        string selRef = selRefProp.GetString() ?? "";
                        string selVal = (selValProp.GetString() ?? "").Replace("\"", "\\\"");
                        var result = await RunCliCommandAsync(sessionName, $"select {selRef} \"{selVal}\"");
                        return result.Success
                            ? CreateResponseJson(id, "success", $"Selected '{selVal}' on ref {selRef}")
                            : CreateResponseJson(id, "error", null, $"select_ref failed: {result.StdErr}");
                    }

                    case "check_ref":
                    case "uncheck_ref":
                    {
                        if (!root.TryGetProperty("ref", out var checkRefProp))
                            return CreateResponseJson(id, "error", null, $"Missing 'ref' parameter for {action} action.");
                        string checkRef = checkRefProp.GetString() ?? "";
                        string cliCmd = action.ToLower() == "check_ref" ? "check" : "uncheck";
                        var result = await RunCliCommandAsync(sessionName, $"{cliCmd} {checkRef}");
                        return result.Success
                            ? CreateResponseJson(id, "success", $"{cliCmd} ref {checkRef}")
                            : CreateResponseJson(id, "error", null, $"{action} failed: {result.StdErr}");
                    }

                    case "hover_ref":
                    {
                        if (!root.TryGetProperty("ref", out var hoverRefProp))
                            return CreateResponseJson(id, "error", null, "Missing 'ref' parameter for hover_ref action.");
                        string hoverRef = hoverRefProp.GetString() ?? "";
                        var result = await RunCliCommandAsync(sessionName, $"hover {hoverRef}");
                        return result.Success
                            ? CreateResponseJson(id, "success", $"Hovered ref {hoverRef}")
                            : CreateResponseJson(id, "error", null, $"hover_ref failed: {result.StdErr}");
                    }

                    case "navigate":
                    {
                        if (!root.TryGetProperty("url", out var urlProp))
                            return CreateResponseJson(id, "error", null, "Missing 'url' parameter for navigate action.");
                        string url = urlProp.GetString() ?? "";
                        var result = await RunCliCommandAsync(sessionName, $"goto \"{url}\"");
                        return result.Success
                            ? CreateResponseJson(id, "success", $"Navigated to {url}")
                            : CreateResponseJson(id, "error", null, $"navigate failed: {result.StdErr}");
                    }

                    case "go_back":
                    case "go_forward":
                    case "reload":
                    {
                        string navCmd = action.ToLower() switch
                        {
                            "go_back" => "go-back",
                            "go_forward" => "go-forward",
                            _ => "reload"
                        };
                        var result = await RunCliCommandAsync(sessionName, navCmd);
                        return result.Success
                            ? CreateResponseJson(id, "success", navCmd)
                            : CreateResponseJson(id, "error", null, $"{navCmd} failed: {result.StdErr}");
                    }

                    case "press":
                    {
                        // Confirmed: `press <key>` acts on whatever element currently has focus
                        // (e.g. right after a `fill`/`click`), not on an arbitrary ref. If a 'ref'
                        // is supplied we click it first purely to move focus there.
                        if (!root.TryGetProperty("key", out var keyProp))
                            return CreateResponseJson(id, "error", null, "Missing 'key' parameter for press action.");
                        string key = keyProp.GetString() ?? "";

                        if (root.TryGetProperty("ref", out var pressRefProp))
                        {
                            string pressRef = pressRefProp.GetString() ?? "";
                            var clickResult = await RunCliCommandAsync(sessionName, $"click {pressRef}");
                            if (!clickResult.Success)
                                return CreateResponseJson(id, "error", null, $"press failed to focus ref {pressRef}: {clickResult.StdErr}");
                        }

                        var result = await RunCliCommandAsync(sessionName, $"press {key}");
                        return result.Success
                            ? CreateResponseJson(id, "success", $"Pressed {key}")
                            : CreateResponseJson(id, "error", null, $"press failed: {result.StdErr}");
                    }

                    case "type":
                    {
                        // `type <text>` types into whatever element currently has focus.
                        if (!root.TryGetProperty("text", out var typeTextProp))
                            return CreateResponseJson(id, "error", null, "Missing 'text' parameter for type action.");
                        string typeText = (typeTextProp.GetString() ?? "").Replace("\"", "\\\"");
                        var result = await RunCliCommandAsync(sessionName, $"type \"{typeText}\"");
                        return result.Success
                            ? CreateResponseJson(id, "success", "Typed text")
                            : CreateResponseJson(id, "error", null, $"type failed: {result.StdErr}");
                    }

                    case "screenshot":
                    {
                        // Confirmed: `screenshot [ref] --filename=f` saves a PNG to a specific path.
                        string screenshotPath = Path.Combine(outputDir, $"screenshot-{Guid.NewGuid():N}.png");
                        string cmd = $"screenshot --filename=\"{screenshotPath}\"";
                        if (root.TryGetProperty("ref", out var shotRefProp))
                            cmd = $"screenshot {shotRefProp.GetString()} --filename=\"{screenshotPath}\"";

                        var result = await RunCliCommandAsync(sessionName, cmd);
                        if (!result.Success)
                            return CreateResponseJson(id, "error", null, $"screenshot failed: {result.StdErr}");

                        try
                        {
                            byte[] bytes = await File.ReadAllBytesAsync(screenshotPath);
                            return CreateResponseJson(id, "success", Convert.ToBase64String(bytes));
                        }
                        catch (Exception ex)
                        {
                            return CreateResponseJson(id, "error", null, $"Screenshot file could not be read at '{screenshotPath}': {ex.Message}");
                        }
                    }

                    case "dialog_accept":
                    {
                        string cmd = "dialog-accept";
                        if (root.TryGetProperty("promptText", out var promptProp))
                            cmd += $" \"{(promptProp.GetString() ?? "").Replace("\"", "\\\"")}\"";
                        var result = await RunCliCommandAsync(sessionName, cmd);
                        return result.Success
                            ? CreateResponseJson(id, "success", "Dialog accepted")
                            : CreateResponseJson(id, "error", null, $"dialog_accept failed: {result.StdErr}");
                    }

                    case "dialog_dismiss":
                    {
                        var result = await RunCliCommandAsync(sessionName, "dialog-dismiss");
                        return result.Success
                            ? CreateResponseJson(id, "success", "Dialog dismissed")
                            : CreateResponseJson(id, "error", null, $"dialog_dismiss failed: {result.StdErr}");
                    }

                    case "eval_ref":
                    case "evaluate":
                    {
                        // Confirmed: `eval <func> [ref]` runs a JS function against the page,
                        // or against a specific element when a ref is given.
                        if (!root.TryGetProperty("script", out var scriptProp))
                            return CreateResponseJson(id, "error", null, $"Missing 'script' parameter for {action} action.");
                        string script = scriptProp.GetString() ?? "";
                        string cmd = $"eval \"{script.Replace("\"", "\\\"")}\"";
                        if (root.TryGetProperty("ref", out var evalRefProp))
                            cmd += $" {evalRefProp.GetString()}";

                        var result = await RunCliCommandAsync(sessionName, cmd);
                        return result.Success
                            ? CreateResponseJson(id, "success", result.StdOut.Trim())
                            : CreateResponseJson(id, "error", null, $"{action} failed: {result.StdErr}");
                    }

                    case "get_text":
                    case "get_value":
                    {
                        // No dedicated CLI command for these; implemented via `eval` against a ref.
                        if (!root.TryGetProperty("ref", out var getRefProp))
                            return CreateResponseJson(id, "error", null, $"Missing 'ref' parameter for {action} action.");
                        string getRef = getRefProp.GetString() ?? "";
                        string jsExpr = action.ToLower() == "get_text"
                            ? "el => el.textContent ?? ''"
                            : "el => el.value ?? ''";
                        var result = await RunCliCommandAsync(sessionName, $"eval \"{jsExpr}\" {getRef}");
                        return result.Success
                            ? CreateResponseJson(id, "success", result.StdOut.Trim())
                            : CreateResponseJson(id, "error", null, $"{action} failed: {result.StdErr}");
                    }

                    case "new_page":
                    {
                        string? url = root.TryGetProperty("url", out var newPageUrlProp) ? newPageUrlProp.GetString() : null;
                        string cmd = "tab-new" + (string.IsNullOrEmpty(url) ? "" : $" \"{url}\"");
                        var result = await RunCliCommandAsync(sessionName, cmd);
                        return result.Success
                            ? CreateResponseJson(id, "success", "Opened new tab")
                            : CreateResponseJson(id, "error", null, $"new_page failed: {result.StdErr}");
                    }

                    case "close_page":
                    {
                        string? tabIdx = root.TryGetProperty("index", out var idxProp) ? idxProp.GetRawText() : null;
                        string cmd = "tab-close" + (tabIdx == null ? "" : $" {tabIdx}");
                        var result = await RunCliCommandAsync(sessionName, cmd);
                        return result.Success
                            ? CreateResponseJson(id, "success", "Closed tab")
                            : CreateResponseJson(id, "error", null, $"close_page failed: {result.StdErr}");
                    }

                    case "active_pages":
                    {
                        var result = await RunCliCommandAsync(sessionName, "tab-list");
                        return result.Success
                            ? CreateResponseJson(id, "success", result.StdOut.Trim())
                            : CreateResponseJson(id, "error", null, $"active_pages failed: {result.StdErr}");
                    }

                    case "content":
                        // Superseded by 'snapshot' — no separate ARIA-only command in playwright-cli.
                        return CreateResponseJson(id, "error", null,
                            "Action 'content' is superseded by 'snapshot' under playwright-cli.");

                    default:
                        return CreateResponseJson(id, "error", null, $"Unknown action: '{action}'");
                }
            }
            catch (Exception ex)
            {
                Log($"Error processing action: {ex.Message}");
                return CreateResponseJson(id, "error", null, ex.Message);
            }
        }

        private string CreateResponseJson(string id, string status, object? result, string? message = null)
        {
            var responseObj = new
            {
                id = id,
                status = status,
                result = result,
                message = message
            };
            return JsonSerializer.Serialize(responseObj);
        }

        #endregion

        #region Setup Wizard & Auto-Installation

        private async Task RunAutoSetupAsync()
        {
            Log("Checking playwright-cli availability...");
            bool isReady = await VerifyCliReadyAsync();
            if (isReady)
            {
                Log("playwright-cli detected and verified.");
            }
            else
            {
                Log("playwright-cli is missing or not fully set up.");

                var txtInstallLogs = this.FindControl<TextBox>("TxtInstallLogs");
                var pnlInstaller = this.FindControl<Grid>("PnlInstaller");

                Dispatcher.UIThread.Post(() =>
                {
                    this.IsVisible = true;
                    this.WindowState = WindowState.Normal;
                    this.Activate();
                    if (pnlInstaller != null) pnlInstaller.IsVisible = true;
                });

                bool success = await CheckAndInstallCliAsync(autoInstall: true, logBoxOverride: txtInstallLogs);

                if (success)
                {
                    Dispatcher.UIThread.Post(() =>
                    {
                        var lblInstallStatus = this.FindControl<TextBlock>("LblInstallStatus");
                        var prgInstall = this.FindControl<ProgressBar>("PrgInstall");
                        if (lblInstallStatus != null) lblInstallStatus.Text = "Installation successful! Setup complete.";
                        if (prgInstall != null)
                        {
                            prgInstall.Value = 100;
                        }
                    });

                    await Task.Delay(2000);

                    Dispatcher.UIThread.Post(() =>
                    {
                        if (pnlInstaller != null) pnlInstaller.IsVisible = false;
                        this.IsVisible = false;
                        Log("Setup complete. Application minimized to system tray.");
                    });
                }
                else
                {
                    Dispatcher.UIThread.Post(() =>
                    {
                        var lblInstallStatus = this.FindControl<TextBlock>("LblInstallStatus");
                        if (lblInstallStatus != null)
                        {
                            lblInstallStatus.Text = "Setup failed. Please check the logs below.";
                            lblInstallStatus.Foreground = new SolidColorBrush(Color.Parse("#a33a3a"));
                        }
                    });
                }
            }
        }

        private async Task<bool> VerifyCliReadyAsync()
        {
            try
            {
                var versionResult = await RunCliAsync("--version", timeoutMs: 10000);
                return versionResult.Success;
            }
            catch
            {
                return false;
            }
        }

        private async void OnInstallPlaywrightClick(object sender, RoutedEventArgs e)
        {
            var txtLogs = this.FindControl<TextBox>("TxtLogs");
            await CheckAndInstallCliAsync(autoInstall: true, logBoxOverride: txtLogs);
        }

        private async Task<bool> CheckAndInstallCliAsync(bool autoInstall, TextBox? logBoxOverride = null)
        {
            if (_isInstallingCli) return false;

            Action<string> logAction = (msg) =>
            {
                if (logBoxOverride != null)
                {
                    LogInstall(msg, logBoxOverride);
                }
                else
                {
                    Log(msg);
                }
            };

            bool alreadyInstalled = await VerifyCliReadyAsync();
            if (alreadyInstalled && !autoInstall)
            {
                logAction("playwright-cli detected and browsers already installed.");
                return true;
            }

            _isInstallingCli = true;
            Dispatcher.UIThread.Post(() =>
            {
                var btnInstallCli = this.FindControl<Button>("BtnInstallPlaywright");
                if (btnInstallCli != null)
                {
                    btnInstallCli.IsEnabled = false;
                    btnInstallCli.Content = "Installing...";
                }
            });

            logAction("Installing @playwright/cli globally via npm...");
            logAction("This may take 1-3 minutes depending on your internet connection.");

            bool success = await Task.Run(async () =>
            {
                try
                {
                    // Step 1: install the npm package globally.
                    if (!await RunNpmStepAsync("install -g @playwright/cli@latest", logAction))
                        return false;

                    // Step 2: install browser binaries.
                    // VERIFY: confirm 'install-browser' is the correct subcommand name/flags.
                    if (!await RunShellStepAsync(CliExecutable, "install-browser", logAction))
                        return false;

                    // Step 3 (optional): install agent skills for IDE-integrated coding agents.
                    // Not required for our own WebSocket-based backend agent, but harmless to run
                    // in case the same machine is also used with Claude Code / Copilot directly.
                    await RunShellStepAsync(CliExecutable, "install --skills", logAction);

                    return true;
                }
                catch (Exception ex)
                {
                    logAction($"Exception during playwright-cli installation: {ex.Message}");
                    return false;
                }
            });

            _isInstallingCli = false;
            Dispatcher.UIThread.Post(() =>
            {
                var btnInstallCli = this.FindControl<Button>("BtnInstallPlaywright");
                if (btnInstallCli != null)
                {
                    btnInstallCli.IsEnabled = true;
                    btnInstallCli.Content = "Install Playwright CLI";
                }
            });

            if (success)
            {
                logAction("playwright-cli installed successfully!");
            }
            else
            {
                logAction("playwright-cli installation failed. See logs above for details.");
            }

            return success;
        }

        private static bool RunShellStepSync(string fileName, string arguments, Action<string> logAction)
        {
            logAction($"Running: {fileName} {arguments}");

            ProcessStartInfo psi;
            if (OperatingSystem.IsWindows())
            {
                psi = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = $"/c {fileName} {arguments}",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
            }
            else
            {
                psi = new ProcessStartInfo
                {
                    FileName = fileName,
                    Arguments = arguments,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
            }

            using var process = new Process { StartInfo = psi };
            process.OutputDataReceived += (s, ev) => { if (ev.Data != null) logAction($"[{fileName}] {ev.Data}"); };
            process.ErrorDataReceived += (s, ev) => { if (ev.Data != null) logAction($"[{fileName} err] {ev.Data}"); };

            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
            process.WaitForExit();

            logAction($"{fileName} exited with code {process.ExitCode}");
            return process.ExitCode == 0;
        }

        private static Task<bool> RunShellStepAsync(string fileName, string arguments, Action<string> logAction) =>
            Task.Run(() => RunShellStepSync(fileName, arguments, logAction));

        private static Task<bool> RunNpmStepAsync(string npmArguments, Action<string> logAction) =>
            RunShellStepAsync("npm", npmArguments, logAction);

        #endregion
    }
}