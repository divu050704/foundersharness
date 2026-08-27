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
using Microsoft.Playwright;

namespace foundersharness
{
    public partial class MainWindow : Window
    {
        // WebSocket Server variables
        private HttpListener? _httpListener;
        private CancellationTokenSource? _serverCts;
        private const int Port = 9000;

        // Playwright variables
        private IPlaywright? _playwright;
        private IBrowser? _browser;
        private IBrowserContext? _browserContext;
        private IPage? _activePage;

        // Flags
        private bool _isExiting = false;
        private bool _isInstallingPlaywright = false;

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
                    if (_browser != null || _browserContext != null)
                    {
                        lblBrowserStatus.Text = "Browser: Running";
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

                if (_playwright != null)
                {
                    _playwright.Dispose();
                    _playwright = null;
                }

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
                        string responseJson = await ProcessPlaywrightCommandAsync(messageJson);
                        
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

        #region Playwright Browser Operations

        private async void OnToggleBrowserClick(object sender, RoutedEventArgs e)
        {
            if (_browser != null || _browserContext != null)
            {
                await CloseBrowserAsync();
            }
            else
            {
                bool installed = await CheckAndInstallPlaywrightAsync(autoInstall: true);
                if (installed)
                {
                    await EnsureBrowserOpenAsync();
                }
            }
        }

        private string _activeSessionName = "";

        private void BrowserContext_Closed(object? sender, IBrowserContext e)
        {
            Log($"Browser persistent session '{_activeSessionName}' was closed.");
            _browser = null;
            _browserContext = null;
            _activePage = null;
            UpdateUIStates();
        }

        private async Task EnsureBrowserOpenAsync(string sessionName = "default")
        {
            if (_browser != null || _browserContext != null)
            {
                if (_activeSessionName != sessionName)
                {
                    Log($"Switching browser session from '{_activeSessionName}' to '{sessionName}'...");
                    await CloseBrowserAsync();
                }
                else
                {
                    return;
                }
            }

            _activeSessionName = sessionName;

            try
            {
                Log("Starting Playwright driver...");
                if (_playwright == null)
                {
                    _playwright = await Playwright.CreateAsync();
                }

                if (!string.IsNullOrEmpty(sessionName))
                {
                    string profilePath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "browser_profiles", sessionName);
                    Log($"Launching Chromium with persistent session '{sessionName}' at: {profilePath}...");
                    
                    _browserContext = await _playwright.Chromium.LaunchPersistentContextAsync(profilePath, new BrowserTypeLaunchPersistentContextOptions
                    {
                        Headless = false,
                        Args = new[] { "--no-sandbox", "--disable-setuid-sandbox" },
                        ViewportSize = new ViewportSize { Width = 1280, Height = 720 }
                    });

                    _browserContext.Close += BrowserContext_Closed;
                    _activePage = _browserContext.Pages.Count > 0 ? _browserContext.Pages[0] : await _browserContext.NewPageAsync();
                }
                else
                {
                    Log("Launching Chromium browser (ephemeral mode)...");
                    _browser = await _playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
                    {
                        Headless = false,
                        Args = new[] { "--no-sandbox", "--disable-setuid-sandbox" }
                    });

                    _browser.Disconnected += Browser_Disconnected;

                    _browserContext = await _browser.NewContextAsync(new BrowserNewContextOptions
                    {
                        ViewportSize = new ViewportSize { Width = 1280, Height = 720 }
                    });

                    _activePage = await _browserContext.NewPageAsync();
                }

                Log("Browser ready.");
                UpdateUIStates();
            }
            catch (Exception ex)
            {
                Log($"Failed to launch browser: {ex.Message}");
                if (ex.Message.Contains("Executable doesn't exist") || ex.Message.Contains("playwright") || ex.Message.Contains("executable"))
                {
                    Log("Attempting automatic recovery/installation of Playwright browsers...");
                    bool success = await CheckAndInstallPlaywrightAsync(autoInstall: true);
                    if (success)
                    {
                        Log("Playwright installation complete. Retrying browser launch...");
                        await EnsureBrowserOpenAsync(sessionName);
                        return;
                    }
                }
                _browser = null;
                _browserContext = null;
                _activePage = null;
                UpdateUIStates();
            }
        }

        private void Browser_Disconnected(object? sender, IBrowser e)
        {
            Log("Browser window was closed.");
            _browser = null;
            _browserContext = null;
            _activePage = null;
            UpdateUIStates();
        }

        private async Task CloseBrowserAsync()
        {
            if (_browser == null && _browserContext == null) return;

            Log("Closing browser...");
            try
            {
                if (_browser != null)
                {
                    _browser.Disconnected -= Browser_Disconnected;
                    await _browser.CloseAsync();
                }
                else if (_browserContext != null)
                {
                    _browserContext.Close -= BrowserContext_Closed;
                    await _browserContext.CloseAsync();
                }
            }
            catch (Exception ex)
            {
                Log($"Error closing browser: {ex.Message}");
            }

            _browser = null;
            _browserContext = null;
            _activePage = null;
            Log("Browser closed.");
            UpdateUIStates();
        }

        #endregion

        #region Command Processing

        private async Task<string> ProcessPlaywrightCommandAsync(string requestJson)
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

                string sessionName = "";
                if (root.TryGetProperty("sessionName", out var sessionNameProp))
                {
                    sessionName = sessionNameProp.GetString() ?? "";
                }

                if (action == "launch")
                {
                    await EnsureBrowserOpenAsync(sessionName);
                    return CreateResponseJson(id, "success", "Browser launched successfully.");
                }
                else if (action == "close")
                {
                    await CloseBrowserAsync();
                    return CreateResponseJson(id, "success", "Browser closed successfully.");
                }

                await EnsureBrowserOpenAsync(sessionName);
                if (_activePage == null)
                {
                    return CreateResponseJson(id, "error", null, "Browser initialized but active page is unavailable.");
                }

                switch (action.ToLower())
                {
                    case "snapshot":
                    {
                        string snapshotScript = @"
                            (() => {
                                document.querySelectorAll('[data-agent-ref]').forEach(el => el.removeAttribute('data-agent-ref'));
                                const selectors = 'a, button, input, textarea, select, [role], [onclick], [tabindex]';
                                const nodes = Array.from(document.querySelectorAll(selectors));
                                const results = [];
                                const stack = []; // ancestor stack of { el, ref } for currently-open containers
                                let i = 0;

                                for (const el of nodes) {
                                    const rect = el.getBoundingClientRect();
                                    if (rect.width === 0 || rect.height === 0) continue;
                                    const style = window.getComputedStyle(el);
                                    if (style.visibility === 'hidden' || style.display === 'none') continue;

                                    // Pop any ancestors on the stack that don't actually contain this element
                                    while (stack.length && !stack[stack.length - 1].el.contains(el)) {
                                        stack.pop();
                                    }

                                    const ref = 'r' + (i++);
                                    el.setAttribute('data-agent-ref', ref);

                                    const role = el.getAttribute('role') || el.tagName.toLowerCase();
                                    const aria = el.getAttribute('aria-label');
                                    const alt = el.getAttribute('alt');
                                    const placeholder = el.getAttribute('placeholder');
                                    const value = el.value;
                                    // Full text content, NOT hard-capped at a tiny length. Cap generously
                                    // just to avoid pathological multi-KB nodes, with a visible marker if cut.
                                    let fullText = (el.innerText || '').trim();
                                    if (fullText.length > 2000) fullText = fullText.slice(0, 2000) + ' …[truncated]';
                                    const name = (aria || fullText || alt || placeholder || value || '').trim();

                                    const parentRef = stack.length ? stack[stack.length - 1].ref : null;
                                    const depth = stack.length;

                                    results.push({ ref, tag: el.tagName.toLowerCase(), role, name, parentRef, depth });

                                    stack.push({ el, ref });
                                }

                                return JSON.stringify(results);
                            })()
                        ";
                        var snapshotJson = await _activePage.EvaluateAsync<string>(snapshotScript);
                        return CreateResponseJson(id, "success", snapshotJson);
                    }

                    case "click_ref":
                    {
                        if (!root.TryGetProperty("ref", out var refProp))
                            return CreateResponseJson(id, "error", null, "Missing 'ref' parameter for click_ref action.");
                        string refSel = $"[data-agent-ref=\"{refProp.GetString()}\"]";
                        try
                        {
                            await _activePage.ClickAsync(refSel, new PageClickOptions { Timeout = 3000 });
                            return CreateResponseJson(id, "success", $"Clicked ref {refProp.GetString()}");
                        }
                        catch (Exception ex)
                        {
                            try
                            {
                                await _activePage.Locator(refSel).First.EvaluateAsync("el => el.click()");
                                return CreateResponseJson(id, "success", $"Clicked ref {refProp.GetString()} (JS fallback)");
                            }
                            catch (Exception jsEx)
                            {
                                return CreateResponseJson(id, "error", null, $"click_ref failed: {ex.Message} / JS fallback: {jsEx.Message}");
                            }
                        }
                    }

                    case "fill_ref":
                    {
                        if (!root.TryGetProperty("ref", out var fillRefProp) || !root.TryGetProperty("text", out var fillTextProp))
                            return CreateResponseJson(id, "error", null, "Missing 'ref' or 'text' parameter for fill_ref action.");
                        string fillRefSel = $"[data-agent-ref=\"{fillRefProp.GetString()}\"]";
                        try
                        {
                            await _activePage.FillAsync(fillRefSel, fillTextProp.GetString() ?? "");
                            return CreateResponseJson(id, "success", $"Filled ref {fillRefProp.GetString()}");
                        }
                        catch (Exception ex)
                        {
                            return CreateResponseJson(id, "error", null, $"fill_ref failed: {ex.Message}");
                        }
                    }
                    case "navigate":
                        if (!root.TryGetProperty("url", out var urlProp))
                            return CreateResponseJson(id, "error", null, "Missing 'url' parameter for navigate action.");
                        string url = urlProp.GetString() ?? "";
                        Log($"Navigating to: {url}");
                        await _activePage.GotoAsync(url);
                        return CreateResponseJson(id, "success", $"Navigated to {url}");

                    case "click":
                        if (!root.TryGetProperty("selector", out var clickSelProp))
                            return CreateResponseJson(id, "error", null, "Missing 'selector' parameter for click action.");
                        string clickSel = clickSelProp.GetString() ?? "";
                        
                        bool force = false;
                        if (root.TryGetProperty("force", out var forceProp))
                            force = forceProp.GetBoolean();

                        var selectorFallbacks = GetSelectorCandidates(clickSel);

                        bool clickedSuccessfully = false;
                        Exception? lastClickException = null;

                        foreach (var targetSel in selectorFallbacks)
                        {
                            try
                            {
                                var locator = _activePage.Locator(targetSel);
                                var count = await locator.CountAsync();
                                if (count == 0)
                                {
                                    try
                                    {
                                        await locator.First.WaitForAsync(new LocatorWaitForOptions { State = WaitForSelectorState.Attached, Timeout = 1000 });
                                        count = await locator.CountAsync();
                                    }
                                    catch
                                    {
                                        continue;
                                    }
                                }

                                if (count == 0) continue;

                                Log($"Clicking {targetSel}");
                                // First attempt: Playwright standard click with short timeout
                                await _activePage.ClickAsync(targetSel, new PageClickOptions { Force = force, Timeout = 2000 });
                                Log($"Successfully clicked selector via Playwright: {targetSel}");
                                clickedSuccessfully = true;
                                break;
                            }
                            catch (Exception ex)
                            {
                                lastClickException = ex;
                                // Fallback: JavaScript direct click (bypasses interceptability and actionability checks)
                                try
                                {
                                    Log($"Clicking {targetSel} (JS Fallback)");
                                    await _activePage.Locator(targetSel).First.EvaluateAsync("el => (el as HTMLElement).click()");
                                    Log($"Successfully clicked selector via JS Fallback: {targetSel}");
                                    clickedSuccessfully = true;
                                    break;
                                }
                                catch (Exception jsEx)
                                {
                                    lastClickException = new Exception($"Playwright click failed for {targetSel}: {ex.Message}. JS click failed: {jsEx.Message}");
                                }
                            }
                        }

                        // If no candidates matched via CountAsync/WaitForAsync, do one final Playwright Click attempt on the original selector
                        if (!clickedSuccessfully && lastClickException == null)
                        {
                            try
                            {
                                Log($"Clicking primary selector directly: {clickSel}");
                                await _activePage.ClickAsync(clickSel, new PageClickOptions { Force = force, Timeout = 2500 });
                                clickedSuccessfully = true;
                            }
                            catch (Exception ex)
                            {
                                lastClickException = new Exception($"Element '{clickSel}' not found on page (Searched candidates: {string.Join(", ", selectorFallbacks)}). Error: {ex.Message}");
                            }
                        }

                        if (!clickedSuccessfully)
                        {
                            string errMsg = lastClickException?.Message ?? $"Element '{clickSel}' was not found in the DOM.";
                            return CreateResponseJson(id, "error", null, $"Click failed for selector variants of '{clickSel}'. Last error: {errMsg}");
                        }
                        return CreateResponseJson(id, "success", $"Clicked selector {clickSel}");

                    case "fill":
                        if (!root.TryGetProperty("selector", out var fillSelProp) || !root.TryGetProperty("text", out var textProp))
                            return CreateResponseJson(id, "error", null, "Missing 'selector' or 'text' parameter for fill action.");
                        string fillSel = fillSelProp.GetString() ?? "";
                        string text = textProp.GetString() ?? "";
                        
                        bool filled = false;
                        Exception? fillEx = null;
                        foreach (var targetSel in GetSelectorCandidates(fillSel))
                        {
                            try
                            {
                                if (await _activePage.Locator(targetSel).CountAsync() > 0)
                                {
                                    await _activePage.FillAsync(targetSel, text);
                                    filled = true;
                                    break;
                                }
                            }
                            catch (Exception ex) { fillEx = ex; }
                        }
                        if (!filled)
                        {
                            return CreateResponseJson(id, "error", null, $"Fill failed for selector {fillSel}: {fillEx?.Message}");
                        }
                        return CreateResponseJson(id, "success", $"Filled {fillSel} with text");

                    case "press":
                        if (!root.TryGetProperty("selector", out var pressSelProp) || !root.TryGetProperty("key", out var keyProp))
                            return CreateResponseJson(id, "error", null, "Missing 'selector' or 'key' parameter for press action.");
                        string pressSel = pressSelProp.GetString() ?? "";
                        string key = keyProp.GetString() ?? "";
                        
                        bool pressed = false;
                        Exception? pressEx = null;
                        foreach (var targetSel in GetSelectorCandidates(pressSel))
                        {
                            try
                            {
                                if (await _activePage.Locator(targetSel).CountAsync() > 0)
                                {
                                    await _activePage.PressAsync(targetSel, key);
                                    pressed = true;
                                    break;
                                }
                            }
                            catch (Exception ex) { pressEx = ex; }
                        }
                        if (!pressed)
                        {
                            return CreateResponseJson(id, "error", null, $"Press failed for selector {pressSel}: {pressEx?.Message}");
                        }
                        return CreateResponseJson(id, "success", $"Pressed {key} on {pressSel}");

                    case "screenshot":
                        var screenshotBytes = await _activePage.ScreenshotAsync(new PageScreenshotOptions { Type = ScreenshotType.Png });
                        string base64Screenshot = Convert.ToBase64String(screenshotBytes);
                        return CreateResponseJson(id, "success", base64Screenshot);

                    case "content":
                        string snapshot = await _activePage.AriaSnapshotAsync();
                        return CreateResponseJson(id, "success", snapshot);

                    case "get_text":
                        if (!root.TryGetProperty("selector", out var textSelProp))
                            return CreateResponseJson(id, "error", null, "Missing 'selector' parameter for get_text action.");
                        string textSel = textSelProp.GetString() ?? "";
                        string txtVal = "";
                        foreach (var targetSel in GetSelectorCandidates(textSel))
                        {
                            try
                            {
                                if (await _activePage.Locator(targetSel).CountAsync() > 0)
                                {
                                    txtVal = await _activePage.TextContentAsync(targetSel) ?? "";
                                    break;
                                }
                            }
                            catch { }
                        }
                        return CreateResponseJson(id, "success", txtVal);

                    case "get_value":
                        if (!root.TryGetProperty("selector", out var valSelProp))
                            return CreateResponseJson(id, "error", null, "Missing 'selector' parameter for get_value action.");
                        string valSel = valSelProp.GetString() ?? "";
                        string val = "";
                        foreach (var targetSel in GetSelectorCandidates(valSel))
                        {
                            try
                            {
                                if (await _activePage.Locator(targetSel).CountAsync() > 0)
                                {
                                    val = await _activePage.InputValueAsync(targetSel) ?? "";
                                    break;
                                }
                            }
                            catch { }
                        }
                        return CreateResponseJson(id, "success", val);

                    case "new_page":
                        if (_browserContext == null)
                            return CreateResponseJson(id, "error", null, "No browser context active.");
                        _activePage = await _browserContext.NewPageAsync();
                        return CreateResponseJson(id, "success", "Opened new tab");

                    case "close_page":
                        if (_activePage != null)
                        {
                            await _activePage.CloseAsync();
                        }
                        _activePage = _browserContext?.Pages.LastOrDefault();
                        return CreateResponseJson(id, "success", "Closed tab");

                    case "active_pages":
                        if (_browserContext == null)
                            return CreateResponseJson(id, "success", new string[] { });
                        var urls = _browserContext.Pages.Select(p => p.Url).ToArray();
                        return CreateResponseJson(id, "success", urls);

                    case "evaluate":
                        if (!root.TryGetProperty("script", out var scriptProp))
                            return CreateResponseJson(id, "error", null, "Missing 'script' parameter for evaluate action.");
                        string script = scriptProp.GetString() ?? "";
                        var evalRes = await _activePage.EvaluateAsync<System.Text.Json.JsonElement>(script);
                        return CreateResponseJson(id, "success", evalRes.ToString());

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
            Log("Checking Playwright browser availability...");
            bool isReady = await VerifyPlaywrightReadyAsync();
            if (isReady)
            {
                Log("Playwright browser engines verified and ready.");
            }
            else
            {
                Log("Expected Playwright browser engines are missing or out of date.");
                
                var txtInstallLogs = this.FindControl<TextBox>("TxtInstallLogs");
                var pnlInstaller = this.FindControl<Grid>("PnlInstaller");

                Dispatcher.UIThread.Post(() =>
                {
                    this.IsVisible = true;
                    this.WindowState = WindowState.Normal;
                    this.Activate();
                    if (pnlInstaller != null) pnlInstaller.IsVisible = true;
                });

                bool success = await CheckAndInstallPlaywrightAsync(autoInstall: true, logBoxOverride: txtInstallLogs);
                
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

        private async Task<bool> VerifyPlaywrightReadyAsync()
        {
            try
            {
                using var playwright = await Playwright.CreateAsync();
                var testBrowser = await playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions { Headless = true });
                await testBrowser.CloseAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        private async void OnInstallPlaywrightClick(object sender, RoutedEventArgs e)
        {
            var txtLogs = this.FindControl<TextBox>("TxtLogs");
            await CheckAndInstallPlaywrightAsync(autoInstall: true, logBoxOverride: txtLogs);
        }

        private async Task<bool> CheckAndInstallPlaywrightAsync(bool autoInstall, TextBox? logBoxOverride = null)
        {
            if (_isInstallingPlaywright) return false;

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

            string playwrightCachePath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
                "ms-playwright"
            );

            bool browsersExist = Directory.Exists(playwrightCachePath) && Directory.GetDirectories(playwrightCachePath).Length > 0;

            if (browsersExist && !autoInstall)
            {
                logAction("Playwright browser files detected in ms-playwright cache folder.");
                return true;
            }

            _isInstallingPlaywright = true;
            Dispatcher.UIThread.Post(() =>
            {
                var btnInstallPlaywright = this.FindControl<Button>("BtnInstallPlaywright");
                if (btnInstallPlaywright != null)
                {
                    btnInstallPlaywright.IsEnabled = false;
                    btnInstallPlaywright.Content = "Installing...";
                }
            });

            logAction("Starting Playwright browser installation (Chromium, Firefox, Webkit)...");
            logAction("This may take 1-3 minutes depending on your internet connection.");

            bool success = await Task.Run(() =>
            {
                try
                {
                    string scriptPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "playwright.ps1");
                    if (!File.Exists(scriptPath))
                    {
                        logAction($"Error: Installer script 'playwright.ps1' not found in: {AppDomain.CurrentDomain.BaseDirectory}");
                        return false;
                    }

                    logAction($"Found installer script at {scriptPath}");
                    logAction("Executing PowerShell process to run the Playwright installer script...");

                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = "powershell.exe",
                        Arguments = $"-ExecutionPolicy Bypass -File \"{scriptPath}\" install",
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    };

                    using Process process = new Process { StartInfo = psi };
                    process.OutputDataReceived += (s, ev) => { if (ev.Data != null) logAction($"[Playwright Installer] {ev.Data}"); };
                    process.ErrorDataReceived += (s, ev) => { if (ev.Data != null) logAction($"[Playwright Error] {ev.Data}"); };

                    process.Start();
                    process.BeginOutputReadLine();
                    process.BeginErrorReadLine();
                    process.WaitForExit();

                    logAction($"Playwright installer exited with code {process.ExitCode}");
                    return process.ExitCode == 0;
                }
                catch (Exception ex)
                {
                    logAction($"Exception during Playwright installation: {ex.Message}");
                    return false;
                }
            });

            _isInstallingPlaywright = false;
            Dispatcher.UIThread.Post(() =>
            {
                var btnInstallPlaywright = this.FindControl<Button>("BtnInstallPlaywright");
                if (btnInstallPlaywright != null)
                {
                    btnInstallPlaywright.IsEnabled = true;
                    btnInstallPlaywright.Content = "Install Playwright";
                }
            });

            if (success)
            {
                logAction("Playwright browsers installed successfully!");
            }
            else
            {
                logAction("Playwright installation failed. See logs above for details.");
            }

            return success;
        }

        private static List<string> GetSelectorCandidates(string rawSelector)
        {
            var candidates = new List<string>();
            if (string.IsNullOrWhiteSpace(rawSelector)) return candidates;

            string trimmed = rawSelector.Trim();

            // 1. Check if rawSelector is in ARIA snapshot format: e.g. 'link "leeglin_india\'s profile picture"'
            var ariaMatch = System.Text.RegularExpressions.Regex.Match(
                trimmed,
                @"^(link|button|heading|textbox|img|checkbox|radio|combobox|tab|menuitem|option|dialog|region|group|article|listitem)\s+[""](.*)[""]$",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase
            );

            if (!ariaMatch.Success)
            {
                ariaMatch = System.Text.RegularExpressions.Regex.Match(
                    trimmed,
                    @"^(link|button|heading|textbox|img|checkbox|radio|combobox|tab|menuitem|option|dialog|region|group|article|listitem)\s+['](.*)[']$",
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase
                );
            }

            if (ariaMatch.Success)
            {
                string role = ariaMatch.Groups[1].Value.ToLower();
                string name = ariaMatch.Groups[2].Value;

                string escapedDouble = name.Replace("\"", "\\\"");

                candidates.Add($"role={role}[name=\"{escapedDouble}\"]");
                candidates.Add($"internal:role={role}[name=\"{escapedDouble}\"]");
                candidates.Add($"text=\"{escapedDouble}\"");
                candidates.Add($":has-text(\"{escapedDouble}\")");

                if (role == "link")
                {
                    candidates.Add($"a:has-text(\"{escapedDouble}\")");
                    candidates.Add($"a[aria-label=\"{escapedDouble}\"]");
                    candidates.Add($"a[alt=\"{escapedDouble}\"]");
                    candidates.Add($"img[alt=\"{escapedDouble}\"]");
                }
                else if (role == "button")
                {
                    candidates.Add($"button:has-text(\"{escapedDouble}\")");
                    candidates.Add($"button[aria-label=\"{escapedDouble}\"]");
                    candidates.Add($"input[type=\"button\"][value=\"{escapedDouble}\"]");
                    candidates.Add($"input[type=\"submit\"][value=\"{escapedDouble}\"]");
                }
                else if (role == "textbox")
                {
                    candidates.Add($"input[placeholder=\"{escapedDouble}\"]");
                    candidates.Add($"input[aria-label=\"{escapedDouble}\"]");
                    candidates.Add($"textarea[placeholder=\"{escapedDouble}\"]");
                }
                else if (role == "img")
                {
                    candidates.Add($"img[alt=\"{escapedDouble}\"]");
                    candidates.Add($"img[aria-label=\"{escapedDouble}\"]");
                }

                candidates.Add($"[aria-label=\"{escapedDouble}\"]");
                candidates.Add($"[alt=\"{escapedDouble}\"]");
                candidates.Add($"[title=\"{escapedDouble}\"]");

                return candidates;
            }

            // 2. Already Playwright engine selector
            if (trimmed.StartsWith("role=") || trimmed.StartsWith("text=") || trimmed.StartsWith("xpath=") || trimmed.StartsWith("internal:"))
            {
                candidates.Add(trimmed);
                return candidates;
            }

            // 3. CSS Selector
            candidates.Add(trimmed);

            // Tag name replacement fallback
            var match = System.Text.RegularExpressions.Regex.Match(trimmed, @"^([a-zA-Z0-9\-]+)(\[.*\])$");
            if (match.Success)
            {
                var originalTag = match.Groups[1].Value;
                var attributes = match.Groups[2].Value;
                var fallbackTags = new[] { "div", "span", "a", "svg", "button", "*" };
                foreach (var tag in fallbackTags)
                {
                    if (tag != originalTag)
                    {
                        candidates.Add(tag + attributes);
                    }
                }
            }

            // Child element fallbacks ONLY for simple CSS selectors without quotes or spaces
            if (!trimmed.Contains("\"") && !trimmed.Contains("'") && !trimmed.Contains(" "))
            {
                candidates.Add(trimmed + " svg");
                candidates.Add(trimmed + " span");
                candidates.Add(trimmed + " div");
                candidates.Add(trimmed + " a");
            }

            return candidates;
        }

        #endregion
    }
}