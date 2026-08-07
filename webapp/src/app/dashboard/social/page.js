"use client";

import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Edit,
  Loader2,
  Monitor,
  RefreshCw,
  Save,
  Send,
  Share2,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

const Linkedin = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <title>LinkedIn</title>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const Instagram = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <title>Instagram</title>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export default function SocialMediaPage() {
  const [hookStatus, setHookStatus] = useState({
    connected: false,
    loading: true,
  });

  const [linkedinStatus, setLinkedinStatus] = useState({
    connected: false,
    username: null,
    checking: false,
    checked: false,
  });
  const [linkedinContent, setLinkedinContent] = useState("");
  const [linkedinPosting, setLinkedinPosting] = useState(false);

  const [instagramStatus, setInstagramStatus] = useState({
    connected: false,
    username: null,
    checking: false,
    checked: false,
  });

  // Browser Control states
  const [customSessionName, setCustomSessionName] =
    useState("");
  const [launchingBrowser, setLaunchingBrowser] = useState(false);
  const [closingBrowser, setClosingBrowser] = useState(false);
  const [activeBrowserSession, setActiveBrowserSession] = useState(null);

  // Calendar states
  const [calendar, setCalendar] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [generatingCalendar, setGeneratingCalendar] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [postingIndex, setPostingIndex] = useState(null);
  const [copiedText, setCopiedText] = useState(null);

  const checkHookStatus = useCallback(async () => {
    setHookStatus((prev) => ({ ...prev, loading: true }));
    try {
      const res = await api.get("/social/hook-status");
      setHookStatus({ connected: res.connected, loading: false });
      if (res.connected) {
        // Fetch the real active session from the backend
        try {
          const sessionRes = await api.get("/social/active-session");
          const name = sessionRes.activeSessionName || "default";
          setActiveBrowserSession(name);
        } catch (_e) {
          setActiveBrowserSession("default");
        }
      } else {
        setActiveBrowserSession(null);
        toast.warning(
          "desktop helper is offline. Please start foundersharness Dev Helper.",
        );
      }
    } catch (err) {
      console.error("Error checking hook status:", err);
      setHookStatus({ connected: false, loading: false });
      setActiveBrowserSession(null);
      toast.error("Failed to contact backend server.");
    }
  }, []);

  const loadCalendar = useCallback(async () => {
    setCalendarLoading(true);
    try {
      const res = await api.get("/social/calendar");
      setCalendar(res || []);
    } catch (err) {
      console.error("Failed to load calendar:", err);
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  // Check hook status and load calendar on mount, and poll every 10s
  useEffect(() => {
    checkHookStatus();
    loadCalendar();
    const interval = setInterval(checkHookStatus, 10000);
    return () => clearInterval(interval);
  }, [checkHookStatus, loadCalendar]);

  const verifySession = async (platform) => {
    if (!hookStatus.connected) {
      toast.error("Please connect the desktop browser helper first.");
      return;
    }

    const setStatus =
      platform === "linkedin" ? setLinkedinStatus : setInstagramStatus;
    setStatus((prev) => ({ ...prev, checking: true }));

    toast.info(`Launching agent browser to verify ${platform} session...`);

    try {
      const res = await api.get(`/social/session-status?platform=${platform}`);

      setStatus({
        connected: res.connected,
        username: res.username || null,
        checking: false,
        checked: true,
      });

      if (res.connected) {
        toast.success(
          `Active session verified on ${platform}! ${res.username ? `Logged in as ${res.username}` : ""}`,
        );
      } else {
        toast.error(
          `No active session found on ${platform}. Please log in in the browser window.`,
        );
      }
    } catch (err) {
      setStatus((prev) => ({ ...prev, checking: false }));
      toast.error(`Session verification failed: ${err.message}`);
    }
  };

  const handlePostLinkedin = async () => {
    if (!linkedinContent.trim()) {
      toast.error("Please enter some content to post.");
      return;
    }

    setLinkedinPosting(true);
    toast.info("Sending post to agent browser execution...");

    try {
      const res = await api.post("/social/post", {
        platform: "linkedin",
        content: linkedinContent,
      });

      if (res.success) {
        toast.success("Successfully posted to LinkedIn!");
        setLinkedinContent("");
      } else {
        toast.error(`Failed to post: ${res.message}`);
      }
    } catch (err) {
      toast.error(`Request failed: ${err.message}`);
    } finally {
      setLinkedinPosting(false);
    }
  };

  // Launch named browser persistent session
  const handleLaunchBrowser = async () => {
    if (!hookStatus.connected) {
      toast.error("Please connect the desktop browser helper first.");
      return;
    }
    if (!customSessionName.trim()) {
      toast.error("Please enter a valid session name.");
      return;
    }
    setLaunchingBrowser(true);
    toast.info(
      `Requesting helper to open browser session "${customSessionName}"...`,
    );
    try {
      const res = await api.post("/social/launch-browser", {
        sessionName: customSessionName.trim(),
      });
      if (res.success) {
        toast.success(`Browser session "${customSessionName}" is open!`);
        setActiveBrowserSession(customSessionName);
      } else {
        toast.error(res.message || "Failed to open browser.");
      }
    } catch (err) {
      toast.error(`Error launching browser: ${err.message}`);
    } finally {
      setLaunchingBrowser(false);
    }
  };

  // Close active browser window
  const handleCloseBrowser = async () => {
    if (!hookStatus.connected) {
      toast.error("Desktop helper is not connected.");
      return;
    }
    setClosingBrowser(true);
    try {
      const res = await api.post("/social/close-browser");
      if (res.success) {
        toast.success("Browser window closed successfully.");
        setActiveBrowserSession(null);
      } else {
        toast.error(res.message || "Failed to close browser.");
      }
    } catch (err) {
      toast.error(`Error closing browser: ${err.message}`);
    } finally {
      setClosingBrowser(false);
    }
  };

  // Generate 7-Day calendar using LLM pipeline
  const handleGenerateCalendar = async (platform) => {
    setGeneratingCalendar(true);
    toast.info(
      `Generating a 7-day ${platform} schedule matching your company memory...`,
    );

    try {
      const res = await api.post("/social/generate-calendar", { platform });
      if (res.success) {
        setCalendar(res.calendar);
        toast.success("Successfully generated new post calendar!");
      } else {
        toast.error(`Failed to generate calendar: ${res.message}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Pipeline calendar generation request failed.");
    } finally {
      setGeneratingCalendar(false);
    }
  };

  // Save changes to calendar item
  const handleSaveEdit = async (index) => {
    const updated = [...calendar];
    updated[index].content = editContent;

    setCalendar(updated);
    setEditingIndex(null);

    try {
      await api.post("/social/save-calendar", { calendar: updated });
      toast.success("Post calendar changes saved.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes to backend database.");
    }
  };

  // Copy text to clipboard helper
  const handleCopyText = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedText(index);
    toast.success("Copied post content to clipboard!");
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Publish specific calendar post using agent automation
  const handlePublishCalendarPost = async (index, post) => {
    if (!hookStatus.connected) {
      toast.error(
        "Please connect desktop helper to publish posts automatically.",
      );
      return;
    }

    const platformConnected =
      post.platform === "linkedin"
        ? linkedinStatus.connected
        : instagramStatus.connected;
    if (!platformConnected) {
      toast.error(
        `Please verify your ${post.platform} session is connected before publishing.`,
      );
      return;
    }

    setPostingIndex(index);
    toast.info(`Agent launching browser to publish ${post.platform} post...`);

    try {
      const res = await api.post("/social/post", {
        platform: post.platform,
        content: post.content,
      });

      if (res.success) {
        toast.success(`Successfully published to ${post.platform}!`);

        // Mark post as published and save
        const updated = [...calendar];
        updated[index].status = "published";
        setCalendar(updated);
        await api.post("/social/save-calendar", { calendar: updated });
      } else {
        toast.error(`Agent failed to post: ${res.message}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Publishing command request failed.");
    } finally {
      setPostingIndex(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Social Media Automation
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Publish updates and verify browser login sessions on your startup
            accounts via the local agent browser.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={checkHookStatus}
          disabled={hookStatus.loading}
          className="flex items-center gap-2 border-border bg-card hover:bg-secondary font-semibold"
        >
          {hookStatus.loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Check Helper
        </Button>
      </div>

      {/* Helper Status Alert */}
      {!hookStatus.loading && !hookStatus.connected && (
        <Card className="border-warning bg-warning/10 text-warning-foreground">
          <CardContent className="pt-6 flex gap-4 items-start">
            <AlertTriangle className="h-6 w-6 text-warning flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-base">
                Desktop Helper Offline
              </h4>
              <p className="text-sm opacity-90 leading-relaxed">
                The browser agent connection is offline. Please launch the
                **`foundersharness Dev Helper`** desktop application on your
                system and ensure the WebSocket server is running. This
                application runs a visible browser window allowing you to
                inspect login sessions.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {hookStatus.connected && (
        <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/15 border border-green-500/30 rounded px-4 py-2">
          <Monitor className="h-4 w-4" />
          <span>
            Desktop Helper is connected. Active session:{" "}
            <strong className="font-mono text-green-400">
              {activeBrowserSession || "default"}
            </strong>
          </span>
        </div>
      )}

      {/* Platforms Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* LinkedIn Connection & Posting */}
        <Card className="flex flex-col h-full bg-card/60 backdrop-blur-md border-border">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                  <Linkedin className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">LinkedIn</CardTitle>
                  <CardDescription>
                    Verify session and post content
                  </CardDescription>
                </div>
              </div>

              <div>
                {!linkedinStatus.checked ? (
                  <Badge variant="secondary">Not Checked</Badge>
                ) : linkedinStatus.connected ? (
                  <Badge
                    variant="success"
                    className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  >
                    Connected
                  </Badge>
                ) : (
                  <Badge
                    variant="destructive"
                    className="bg-rose-500/10 text-rose-500 border-rose-500/20"
                  >
                    Disconnected
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Session verification info */}
              <div className="bg-muted/40 p-4 rounded-lg flex items-center justify-between border border-border/30">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Session Status
                  </p>
                  <p className="text-sm font-medium">
                    {linkedinStatus.checking ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                        Verifying...
                      </span>
                    ) : linkedinStatus.checked ? (
                      linkedinStatus.connected ? (
                        <span className="text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" /> Connected{" "}
                          {linkedinStatus.username
                            ? `(${linkedinStatus.username})`
                            : ""}
                        </span>
                      ) : (
                        <span className="text-rose-500 flex items-center gap-1">
                          <XCircle className="h-4 w-4" /> Disconnected
                        </span>
                      )
                    ) : (
                      <span className="text-muted-foreground">
                        Click verify to check status
                      </span>
                    )}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => verifySession("linkedin")}
                  disabled={linkedinStatus.checking || !hookStatus.connected}
                >
                  {linkedinStatus.checking ? "Verifying..." : "Verify Session"}
                </Button>
              </div>

              {/* Posting block */}
              <div className="space-y-2">
                <label
                  htmlFor="linkedin-post-input"
                  className="text-sm font-semibold text-foreground"
                >
                  Write a post
                </label>
                <Textarea
                  id="linkedin-post-input"
                  placeholder="What would you like to share to your startup's LinkedIn page?"
                  value={linkedinContent}
                  onChange={(e) => setLinkedinContent(e.target.value)}
                  disabled={linkedinPosting || !linkedinStatus.connected}
                  rows={5}
                  className="resize-none border-border/80 text-xs bg-secondary/20 leading-relaxed"
                />
                <p className="text-xs text-muted-foreground">
                  The post will be submitted via the active session in the
                  agent's browser.
                </p>
              </div>
            </div>

            <div className="pt-4 mt-auto">
              <Button
                className="w-full flex items-center justify-center gap-2 text-xs font-semibold"
                onClick={handlePostLinkedin}
                disabled={
                  linkedinPosting ||
                  !linkedinStatus.connected ||
                  !linkedinContent.trim()
                }
              >
                {linkedinPosting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Posting to
                    LinkedIn...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Publish to Feed
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instagram Connection */}
        <Card className="flex flex-col h-full bg-card/60 backdrop-blur-md border-border">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-500/10 rounded-lg text-pink-500">
                  <Instagram className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">Instagram</CardTitle>
                  <CardDescription>Verify session status</CardDescription>
                </div>
              </div>

              <div>
                {!instagramStatus.checked ? (
                  <Badge variant="secondary">Not Checked</Badge>
                ) : instagramStatus.connected ? (
                  <Badge
                    variant="success"
                    className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  >
                    Connected
                  </Badge>
                ) : (
                  <Badge
                    variant="destructive"
                    className="bg-rose-500/10 text-rose-500 border-rose-500/20"
                  >
                    Disconnected
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Session verification info */}
              <div className="bg-muted/40 p-4 rounded-lg flex items-center justify-between border border-border/30">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Session Status
                  </p>
                  <p className="text-sm font-medium">
                    {instagramStatus.checking ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                        Verifying...
                      </span>
                    ) : instagramStatus.checked ? (
                      instagramStatus.connected ? (
                        <span className="text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" /> Connected{" "}
                          {instagramStatus.username
                            ? `(${instagramStatus.username})`
                            : ""}
                        </span>
                      ) : (
                        <span className="text-rose-500 flex items-center gap-1">
                          <XCircle className="h-4 w-4" /> Disconnected
                        </span>
                      )
                    ) : (
                      <span className="text-muted-foreground">
                        Click verify to check status
                      </span>
                    )}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => verifySession("instagram")}
                  disabled={instagramStatus.checking || !hookStatus.connected}
                >
                  {instagramStatus.checking ? "Verifying..." : "Verify Session"}
                </Button>
              </div>

              {/* Warning/Notes on Instagram posting */}
              <div className="border border-border/60 bg-muted/20 rounded-lg p-4 space-y-2">
                <h5 className="text-sm font-semibold flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-pink-500" />
                  Instagram Post Information
                </h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Instagram enforces media upload (images/videos) for feed
                  posts. Direct text-only posting is not supported on the
                  Instagram website.
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You can verify the browser session. If you need to make posts,
                  ensure you use the browser instance started by the desktop
                  helper application directly to drag-and-drop images manually.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Social Media Content Planner Card */}
      <Card className="bg-card/60 backdrop-blur-md border-border w-full">
        <CardHeader className="pb-4 border-b border-border/40">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">
                  AI Social Media Content Planner
                </CardTitle>
                <CardDescription>
                  Generate a context-aware 7-day social media calendar based on
                  business goals and past updates.
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateCalendar("instagram")}
                disabled={generatingCalendar}
                className="text-xs font-semibold border-border hover:bg-secondary"
              >
                {generatingCalendar ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Zap className="h-3.5 w-3.5 mr-1.5 text-primary" />
                )}
                Plan Instagram Calendar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {calendarLoading ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">
                Loading calendar schedule...
              </p>
            </div>
          ) : calendar && calendar.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {calendar.map((item, idx) => (
                <div
                  key={`post_${item.day}_${idx}`}
                  className="border border-border/55 rounded-xl p-4 bg-secondary/15 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase font-mono">
                        {item.day}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-semibold">
                        {item.platform === "linkedin" ? (
                          <Linkedin className="h-3.5 w-3.5 text-blue-500" />
                        ) : (
                          <Instagram className="h-3.5 w-3.5 text-pink-500" />
                        )}
                        {item.time}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-xs text-foreground uppercase tracking-wide">
                        Topic: {item.topic}
                      </h4>
                      {item.content_type && (
                        <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-pink-500/10 text-pink-500 border border-pink-500/20">
                          {item.content_type}
                        </span>
                      )}
                      {editingIndex === idx ? (
                        <div className="space-y-2 pt-1">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={6}
                            className="text-xs bg-card leading-relaxed border-border resize-none"
                          />
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => setEditingIndex(null)}
                              className="text-[10px] px-2.5 h-7"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="xs"
                              onClick={() => handleSaveEdit(idx)}
                              className="text-[10px] px-2.5 h-7"
                            >
                              <Save className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed bg-card/50 border border-border/10 p-3 rounded-lg">
                          {item.content}
                        </p>
                      )}
                    </div>

                    {item.image_description && (
                      <div className="border border-dashed border-pink-500/25 bg-pink-500/5 rounded-lg p-2.5 space-y-1">
                        <p className="text-[9px] text-pink-500 uppercase font-bold tracking-wider">
                          📸 Visual Suggestion
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          {item.image_description}
                        </p>
                      </div>
                    )}

                    <div className="border-t border-border/25 pt-2.5 space-y-1 bg-secondary/10 p-2.5 rounded-lg border border-border/10">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                        Strategic Rationale
                      </p>
                      <p className="text-[10px] text-muted-foreground/80 leading-relaxed italic">
                        "{item.rationale}"
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/25">
                    <div className="flex gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingIndex(idx);
                          setEditContent(item.content);
                        }}
                        disabled={editingIndex !== null}
                        className="h-8 w-8 hover:bg-secondary rounded-lg"
                        title="Edit Post"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyText(item.content, idx)}
                        className="h-8 w-8 hover:bg-secondary rounded-lg text-muted-foreground"
                        title="Copy to Clipboard"
                      >
                        {copiedText === idx ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <div>
                      {item.status === "published" ? (
                        <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                          <Check className="h-3.5 w-3.5" />
                          Published
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handlePublishCalendarPost(idx, item)}
                          disabled={
                            postingIndex !== null ||
                            !hookStatus.connected ||
                            (item.platform === "linkedin"
                              ? !linkedinStatus.connected
                              : !instagramStatus.connected)
                          }
                          className="text-[10px] font-bold h-8 px-3 flex gap-1 items-center bg-primary hover:bg-primary/95 text-primary-foreground"
                        >
                          {postingIndex === idx ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          Publish Now
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 border border-dashed border-border/60 rounded-xl flex flex-col items-center justify-center p-6 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground/30 mb-2 stroke-1" />
              <h4 className="text-sm font-bold text-foreground">
                No Posting Calendar Generated
              </h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Generate a custom 7-day post calendar matching your startup's
                brand voice, target customers, and business goals.
              </p>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  onClick={() => handleGenerateCalendar("instagram")}
                  disabled={generatingCalendar}
                  className="text-xs font-semibold"
                >
                  {generatingCalendar ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Zap className="h-3.5 w-3.5 mr-1.5 text-primary-foreground" />
                  )}
                  Plan 7-Day Schedule
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
