"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Mic,
  MicOff,
  Upload,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  Check,
  Search,
  Sparkles,
  File,
  X,
  Keyboard,
  Moon,
  Sun
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

// Question Definitions
const QUESTIONS = [
  {
    id: 1,
    type: "textarea",
    title: "What are you building?",
    placeholder: "Describe your startup in 2–5 sentences.",
    purpose: "Understand the product, industry, problem being solved, and value proposition.",
    speechSnippet: "We are building an AI-powered co-pilot for product managers that turns customer interview recordings into formatted PRDs and Jira tickets.",
    microcopy: "That sounds exciting. AI-driven workflow optimization is a massive force multiplier."
  },
  {
    id: 2,
    type: "textarea",
    title: "Who is your ideal customer?",
    placeholder: "Who benefits the most from your product? Individuals, businesses, enterprises, specific industries, etc.",
    purpose: "Identify the ICP.",
    speechSnippet: "Mid-to-large scale B2B SaaS companies, specifically product teams and engineering heads who spend hours aligning specifications.",
    microcopy: "Focused ICPs are key. This helps your AI teammate narrow down target market strategies."
  },
  {
    id: 3,
    type: "options",
    title: "What stage is your startup currently in?",
    options: [
      "Just an idea",
      "Building MVP",
      "MVP launched",
      "Early customers",
      "Revenue generating",
      "Growing fast"
    ],
    purpose: "Identify product-market lifecycle.",
    microcopy: "Great, we're building a good understanding of your business."
  },
  {
    id: 4,
    type: "textarea",
    title: "What are your top three priorities over the next 90 days?",
    placeholder: "Examples:\n• Launch Version 2\n• Get first paying customers\n• Raise funding\n• Hire engineers",
    purpose: "Align milestones.",
    speechSnippet: "1. Roll out our beta dashboard to 50 waitlist users. 2. Secure SOC2 compliance. 3. Close $250k in pre-seed commitments.",
    microcopy: "Got it. Focus on short-term milestones drives momentum."
  },
  {
    id: 5,
    type: "textarea",
    title: "What's currently slowing your company down?",
    placeholder: "Describe your biggest bottlenecks.",
    purpose: "Determine operations bottlenecks.",
    speechSnippet: "Engineering speed is our main bottleneck right now. We are searching for a senior full-stack React/Node developer.",
    microcopy: "Bottlenecks are opportunities for automated leverage. We will set up AI routines for this."
  },
  {
    id: 6,
    type: "textarea",
    title: "Tell us about your team.",
    placeholder: "How many founders? Employees? Contractors? Advisors?",
    purpose: "Analyze organizational makeup.",
    speechSnippet: "We are 2 co-founders, 2 full-time developers, and 1 design contractor.",
    microcopy: "Fascinating. A solid team profile helps the AI tailor its collaboration style."
  },
  {
    id: 7,
    type: "multiselect-search",
    title: "Which tools do you use every day?",
    options: [
      "Gmail", "Google Calendar", "Slack", "Notion", "GitHub", 
      "Linear", "Jira", "Reclaim", "HubSpot", "Discord", 
      "WhatsApp", "Telegram", "Figma", "Google Drive"
    ],
    purpose: "Plan tool integrations.",
    microcopy: "Excellent. Integrating tools allows your AI to sync documents and calendars automatically."
  },
  {
    id: 8,
    type: "textarea",
    title: "What repetitive work would you love to automate?",
    placeholder: "Think about tasks you do every week that waste time.",
    purpose: "Identify automation flows.",
    speechSnippet: "Synthesizing Slack discussions into weekly reports, and cross-posting product updates to LinkedIn.",
    microcopy: "Automations can free up 10+ hours a week. We will create these workflows."
  },
  {
    id: 9,
    type: "textarea",
    title: "What does success look like in the next six months?",
    placeholder: "Describe your biggest milestone.",
    purpose: "Track growth metrics.",
    speechSnippet: "Hitting $15k monthly recurring revenue (MRR) and achieving a 45% customer retention rate.",
    microcopy: "We're almost there! Just a couple more details."
  },
  {
    id: 10,
    type: "upload",
    title: "Upload anything that helps us understand your business.",
    purpose: "Gather collateral context.",
    microcopy: "Having these documents helps the AI draft precise marketing and pitch documents."
  },
  {
    id: 11,
    type: "multiselect",
    title: "Where should your AI assist you first?",
    options: [
      "Marketing & Content", "Sales", "Product Strategy", "Fundraising", 
      "Grant Discovery", "Meetings & Calendar", "Customer Support", 
      "Hiring", "Operations", "Research"
    ],
    purpose: "Determine primary workspaces.",
    microcopy: "Setting up your initial dashboards to target those channels."
  },
  {
    id: 12,
    type: "textarea",
    title: "One last question...",
    placeholder: "Is there anything about your company that an AI teammate should know from day one?",
    purpose: "Capture general exceptions.",
    speechSnippet: "We operate completely asynchronously and put a huge emphasis on writing detailed documentation.",
    microcopy: "Understood. The workspace is configured to prioritize async documentation."
  }
];

export default function Onboarding() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  
  // State
  const [step, setStep] = useState(-1); // -1: Welcome, 0-11: Questions, 12: Analyzing, 13: Summary Screen
  const [answers, setAnswers] = useState({});
  const [voiceActive, setVoiceActive] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [files, setFiles] = useState([]);
  const [isMounted, setIsMounted] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryData, setSummaryData] = useState("");
  const [fileDragging, setFileDragging] = useState(false);

  // Focus and refs
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimer = useRef(null);

  // Pad number utility for plain system mono counter (e.g. "03 / 12")
  const padNum = (num) => String(num).padStart(2, "0");

  // Mount logic & load saved data
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("founder_onboarding_answers");
    if (saved) {
      try {
        setAnswers(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved onboarding answers", e);
      }
    }
  }, []);

  // Save answers to localStorage
  useEffect(() => {
    if (isMounted && Object.keys(answers).length > 0) {
      localStorage.setItem("founder_onboarding_answers", JSON.stringify(answers));
    }
  }, [answers, isMounted]);

  // Focus inputs automatically on step changes
  useEffect(() => {
    if (step >= 0 && step < QUESTIONS.length) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    }
  }, [step]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isTextarea = e.target.tagName === "TEXTAREA";
      
      if (step >= 0 && step < QUESTIONS.length) {
        // Alt + S to Skip
        if (e.altKey && e.key.toLowerCase() === "s") {
          e.preventDefault();
          handleSkip();
        }
        
        // Enter to submit (Ctrl+Enter for textareas)
        if (e.key === "Enter") {
          if (isTextarea && !e.ctrlKey && !e.metaKey) {
            return;
          }
          e.preventDefault();
          handleNext();
        }
        
        // Backspace / Arrow Left to go back
        if (e.key === "ArrowLeft" && e.altKey) {
          e.preventDefault();
          handlePrev();
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, answers]);

  // Simulated Voice Input
  const handleVoiceInput = () => {
    if (voiceActive) {
      setVoiceActive(false);
      if (typingTimer.current) clearInterval(typingTimer.current);
      return;
    }

    setVoiceActive(true);
    
    const currentQ = QUESTIONS[step];
    const speechText = currentQ.speechSnippet || "We are aiming for high-quality, product-led execution.";
    
    let currentLength = 0;
    const initialText = answers[currentQ.id] || "";
    
    if (typingTimer.current) clearInterval(typingTimer.current);

    setTimeout(() => {
      typingTimer.current = setInterval(() => {
        if (currentLength < speechText.length) {
          currentLength += Math.min(3, speechText.length - currentLength);
          setAnswers((prev) => ({
            ...prev,
            [currentQ.id]: initialText + speechText.substring(0, currentLength)
          }));
        } else {
          setVoiceActive(false);
          clearInterval(typingTimer.current);
        }
      }, 40);
    }, 1200);
  };

  // Navigations
  const handleStart = () => {
    setStep(0);
  };

  const handleNext = () => {
    if (step < 0) return;
    
    const currentQ = QUESTIONS[step];
    
    if (currentQ.microcopy) {
      toast.dismiss();
      toast(currentQ.microcopy, {
        style: {
          background: "var(--card)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
          borderRadius: "var(--radius)"
        }
      });
    }

    if (step === QUESTIONS.length - 1) {
      setStep(12);
      generateAnalysisSummary();
    } else {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    } else if (step === 0) {
      setStep(-1);
    }
  };

  const handleSkip = () => {
    if (step >= 0 && step < QUESTIONS.length) {
      setAnswers((prev) => ({
        ...prev,
        [QUESTIONS[step].id]: "[Skipped]"
      }));
      handleNext();
    }
  };

  const toggleTool = (tool) => {
    const currentQ = QUESTIONS[step];
    const currentSelection = answers[currentQ.id] || [];
    let updated;
    if (currentSelection.includes(tool)) {
      updated = currentSelection.filter((t) => t !== tool);
    } else {
      updated = [...currentSelection, tool];
    }
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: updated
    }));
  };

  // File Upload Handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setFileDragging(true);
    } else if (e.type === "dragleave") {
      setFileDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFileDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      addUploadedFiles(e.dataTransfer.files);
    }
  };

  const addUploadedFiles = (fileList) => {
    const newFiles = Array.from(fileList).map((file) => ({
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + " MB"
    }));
    
    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    
    setAnswers((prev) => ({
      ...prev,
      [QUESTIONS[step].id]: updatedFiles.map(f => f.name)
    }));
  };

  const removeFile = (idx) => {
    const updatedFiles = files.filter((_, i) => i !== idx);
    setFiles(updatedFiles);
    setAnswers((prev) => ({
      ...prev,
      [QUESTIONS[step].id]: updatedFiles.map(f => f.name)
    }));
  };

  // Summary builder
  const generateAnalysisSummary = () => {
    setGeneratingSummary(true);
    
    const whatBuilding = answers[1] || "your platform";
    const idealCustomer = answers[2] || "target businesses";
    const startupStage = answers[3] || "development";
    const slowingDown = answers[5] || "growth limitations";
    const assistFirst = answers[11] || ["Product Strategy", "Operations"];

    setTimeout(() => {
      const stageText = startupStage === "[Skipped]" ? "early" : startupStage.toLowerCase();
      const customerSnippet = idealCustomer === "[Skipped]" ? "your target market" : idealCustomer.split(".")[0];
      const bottlenecksText = slowingDown === "[Skipped]" ? "scaling hurdles" : slowingDown.split(".")[0].toLowerCase();
      
      const summary = `You are building a business focused on: "${whatBuilding.split(".")[0]}". Currently, you are in the **${stageText}** stage, targeting **${customerSnippet}**.
      
Your primary roadblocks include **${bottlenecksText}**. 

Based on this context, we have configured your AI Workspace assistants to support you in **${assistFirst.join(" & ")}** from day one.`;
      
      setSummaryData(summary);
      setGeneratingSummary(false);
      setStep(13);
    }, 3000);
  };

  const handleFinishOnboarding = () => {
    localStorage.setItem("founder_onboarded", "true");
    router.push("/dashboard");
  };

  const handleSkipAll = () => {
    localStorage.setItem("founder_onboarded", "true");
    router.push("/dashboard");
  };

  if (!isMounted) return null;

  return (
    <div className="relative flex min-h-screen flex-col justify-center bg-background text-foreground transition-colors duration-300">
      
      {/* Hairline thin top header control */}
      <header className="absolute top-6 left-6 right-6 flex items-center justify-between border-b border-transparent pb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">FOUNDERS HARNESS</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="size-8 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          {step >= 0 && step < QUESTIONS.length && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipAll}
              className="text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded"
            >
              Skip setup
            </Button>
          )}
        </div>
      </header>

      {/* Main card - matte layout, 4px border-radius, no shadow, hairline border */}
      <div className="mx-auto w-full max-w-xl px-6 py-12">
        {step === -1 ? (
          /* Welcome Screen */
          <Card className="border border-border bg-card rounded shadow-none">
            <CardContent className="flex flex-col items-start p-8 sm:p-10">
              <h1 className="font-sans font-bold text-3xl sm:text-4xl text-foreground tracking-tight leading-none">
                Let's understand your company.
              </h1>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                Instead of filling long forms, answer a few simple questions. Your AI will use this information to understand your business, automate work, and make better decisions.
              </p>
              
              <div className="mt-6 flex items-center gap-2 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                <span>ESTIMATED TIME: 3–5 MINUTES</span>
              </div>

              <div className="mt-8 flex w-full flex-col sm:flex-row gap-3">
                {/* Accent primary button used with absolute discipline */}
                <Button
                  size="default"
                  onClick={handleStart}
                  className="w-full sm:w-auto font-medium rounded bg-primary text-primary-foreground hover:bg-primary/95 transition-none shadow-none"
                >
                  Start Setup
                  <ArrowRight className="ml-2 size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="default"
                  onClick={handleSkipAll}
                  className="w-full sm:w-auto text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-none"
                >
                  Skip for now
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : step === 12 ? (
          /* AI Analyzing Loading Screen */
          <Card className="border border-border bg-card rounded shadow-none">
            <CardContent className="flex flex-col items-start p-8 min-h-[250px]">
              <div className="mb-4 h-1 w-12 bg-primary" />
              <h2 className="font-sans font-bold text-2xl tracking-tight text-foreground">Analyzing Business Profile...</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Your AI co-founder is analyzing your answers, mapping out bottlenecks, and building your workflow priorities.
              </p>
            </CardContent>
          </Card>
        ) : step === 13 ? (
          /* Completion Summary Screen */
          <Card className="border border-border bg-card rounded shadow-none">
            <CardContent className="p-8 sm:p-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-12 bg-primary" />
                <h2 className="font-sans font-bold text-2xl tracking-tight">Foundations mapped.</h2>
              </div>

              <div className="border border-border bg-background p-5 text-sm whitespace-pre-line text-muted-foreground rounded">
                <div className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="size-4 text-muted-foreground" />
                  Initial Workspace Profile
                </div>
                {summaryData}
              </div>

              <div className="flex w-full flex-col sm:flex-row gap-3 justify-end pt-2">
                <Button
                  size="default"
                  onClick={handleFinishOnboarding}
                  className="font-medium w-full sm:w-auto rounded bg-primary text-primary-foreground hover:bg-primary/95 transition-none shadow-none"
                >
                  Enter Workspace
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Question Screens (0 to 11) */
          <div className="space-y-6">
            
            {/* Progress indicators - Plain System Mono Counter "03 / 12" */}
            <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
              <span>QUESTION {padNum(step + 1)} / {padNum(QUESTIONS.length)}</span>
              <span>{Math.round(((step + 1) / QUESTIONS.length) * 100)}% COMPLETE</span>
            </div>
            
            {/* Progress bar - sharp corners, no round pill shape */}
            <div className="h-[2px] w-full bg-muted rounded-none overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300 ease-out rounded-none"
                style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
              />
            </div>

            <Card className="border border-border bg-card rounded shadow-none">
              <CardContent className="p-8 space-y-6">
                <div className="space-y-1">
                  <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                    STEP {padNum(step + 1)}
                  </span>
                  {/* High contrast grotesk style headline */}
                  <h2 className="font-sans font-bold text-2xl sm:text-3xl tracking-tight text-foreground leading-none pt-1">
                    {QUESTIONS[step].title}
                  </h2>
                </div>

                {/* Input Fields */}
                <div className="space-y-4">
                  {QUESTIONS[step].type === "textarea" && (
                    <div className="relative">
                      <Textarea
                        ref={inputRef}
                        rows={4}
                        placeholder={QUESTIONS[step].placeholder}
                        value={answers[QUESTIONS[step].id] || ""}
                        onChange={(e) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [QUESTIONS[step].id]: e.target.value
                          }))
                        }
                        className="bg-background border border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 rounded resize-none pr-12 text-sm leading-relaxed"
                      />
                      
                      {/* Voice record trigger */}
                      <button
                        type="button"
                        onClick={handleVoiceInput}
                        className={`absolute right-3 bottom-3 flex size-7 items-center justify-center rounded hover:bg-secondary transition-none text-muted-foreground hover:text-foreground`}
                        title="Simulate Speech Input"
                      >
                        {voiceActive ? (
                          <span className="text-[10px] font-mono text-primary font-semibold tracking-wider">REC</span>
                        ) : (
                          <Mic className="size-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {QUESTIONS[step].type === "options" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {QUESTIONS[step].options.map((opt) => {
                        const isSelected = answers[QUESTIONS[step].id] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setAnswers((prev) => ({
                                ...prev,
                                [QUESTIONS[step].id]: opt
                              }))
                            }
                            className={`flex items-center justify-between rounded border p-3.5 text-left text-xs font-medium transition-none ${
                              isSelected
                                ? "border-primary bg-primary/5 text-foreground"
                                : "border-border hover:bg-secondary bg-transparent text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span>{opt}</span>
                            {isSelected && <Check className="size-3.5 text-primary" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {QUESTIONS[step].type === "multiselect" && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {QUESTIONS[step].options.map((opt) => {
                        const isSelected = (answers[QUESTIONS[step].id] || []).includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => toggleTool(opt)}
                            className={`flex items-center justify-between rounded border p-3 text-left text-[11px] font-medium transition-none ${
                              isSelected
                                ? "border-primary bg-primary/5 text-foreground"
                                : "border-border hover:bg-secondary bg-transparent text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span>{opt}</span>
                            {isSelected && <Check className="size-3.5 text-primary" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {QUESTIONS[step].type === "multiselect-search" && (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search tools..."
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          className="bg-background pl-8.5 border-border rounded text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[160px] overflow-y-auto pr-1">
                        {QUESTIONS[step].options
                          .filter((opt) =>
                            opt.toLowerCase().includes(searchText.toLowerCase())
                          )
                          .map((opt) => {
                            const isSelected = (answers[QUESTIONS[step].id] || []).includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => toggleTool(opt)}
                                className={`flex items-center justify-between rounded border p-2 text-left text-[11px] transition-none ${
                                  isSelected
                                    ? "border-primary bg-primary/5 text-foreground font-medium"
                                    : "border-border hover:bg-secondary bg-transparent text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <span>{opt}</span>
                                {isSelected && <Check className="size-3 text-primary" />}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {QUESTIONS[step].type === "upload" && (
                    <div className="space-y-4">
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center border border-dashed rounded p-8 cursor-pointer transition-none ${
                          fileDragging
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-secondary"
                        }`}
                      >
                        <Upload className="size-6 text-muted-foreground mb-2" />
                        <p className="text-xs font-semibold">Drag & drop files or browse</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Pitch Deck, PRD, website screenshots (Max 10MB)
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          onChange={(e) => addUploadedFiles(e.target.files)}
                          className="hidden"
                        />
                      </div>

                      {/* Uploaded files list */}
                      {files.length > 0 && (
                        <div className="space-y-2">
                          <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">ATTACHMENTS</p>
                          <div className="space-y-1 max-h-[120px] overflow-y-auto">
                            {files.map((file, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between bg-secondary/40 border border-border p-2 rounded text-xs"
                              >
                                <div className="flex items-center gap-2 truncate text-muted-foreground">
                                  <File className="size-3 text-muted-foreground flex-shrink-0" />
                                  <span className="truncate font-medium text-foreground">{file.name}</span>
                                  <span className="text-[9px]">({file.size})</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFile(idx)}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Visual indication for voice typing */}
                  {voiceActive && (
                    <div className="flex items-center gap-2 bg-secondary border border-border px-3 py-2 rounded text-[10px] font-mono text-primary">
                      <span>DICTATION ACTIVE: TYPING TRANSCRIPT...</span>
                    </div>
                  )}
                </div>

                {/* Navigation and shortcuts bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrev}
                      className="text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded"
                    >
                      <ArrowLeft className="mr-1.5 size-3.5" />
                      Back
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSkip}
                      className="text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded"
                    >
                      Skip
                      <SkipForward className="ml-1.5 size-3.5" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <div className="hidden md:flex items-center gap-1 font-mono text-[9px] text-muted-foreground uppercase mr-2">
                      <kbd className="px-1 py-0.5 border border-border rounded bg-secondary">Enter</kbd>
                      <span>to continue</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleNext}
                      className="w-full sm:w-auto text-xs px-5 rounded bg-primary text-primary-foreground hover:bg-primary/95 transition-none shadow-none"
                    >
                      Continue
                      <ArrowRight className="ml-1.5 size-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
