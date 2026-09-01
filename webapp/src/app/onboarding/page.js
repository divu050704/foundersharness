"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  File,
  Mic,
  Moon,
  Search,
  SkipForward,
  Sun,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { QUESTIONS } from "./questions";
import LeanCanvasView from "@/components/onboarding/LeanCanvasView";

const generateLocalCanvasFallback = (answers) => {
  const whatBuilding = answers[1] || "your platform";
  const idealCustomer = answers[2] || "target businesses";
  const startupStage = answers[3] || "development";
  const priorities = answers[4] || "launching MVP";
  const slowingDown = answers[5] || "growth limitations";
  const team = answers[6] || "1 founder";
  const tools = answers[7] || [];
  const automate = answers[8] || "operations";
  const successSixMonths = answers[9] || "launching beta";
  const assistFirst = answers[10] || ["Product Strategy", "Operations"];
  const customDetails = answers[11] || "None";

  return {
    problem: [
      slowingDown && slowingDown !== "[Skipped]" ? slowingDown : "Identifying product-market fit and scale limitations",
      automate && automate !== "[Skipped]" ? `Automating repetitive work: ${automate}` : "Operational workflow overhead and manual coordination",
      "Resource optimization and growth speed bottlenecks"
    ],
    solution: [
      whatBuilding && whatBuilding !== "[Skipped]" ? whatBuilding : "Innovative new platform addressing current sector friction",
      priorities && priorities !== "[Skipped]" ? `Focusing execution on: ${priorities}` : "Accelerating core product iteration and MVP validation",
      "Deploying AI co-pilots for optimized team workflows"
    ],
    uniqueValueProposition: whatBuilding && whatBuilding !== "[Skipped]" 
      ? `Next-generation approach to: ${whatBuilding.split('.')[0]}. Tailored workspace integrated directly with founder workflows.`
      : "State-of-the-art startup enablement with tailored workspace integrated directly with founder workflows.",
    uvp: whatBuilding && whatBuilding !== "[Skipped]" 
      ? `Next-generation approach to: ${whatBuilding.split('.')[0]}. Tailored workspace integrated directly with founder workflows.`
      : "State-of-the-art startup enablement with tailored workspace integrated directly with founder workflows.",
    unfairAdvantage: team && team !== "[Skipped]" 
      ? `Agile core team configuration: ${team}. Custom operational guidelines & proprietary AI routines.`
      : "Lean and agile organizational design with proprietary AI routines configured for the specific product niche.",
    unfair_advantage: team && team !== "[Skipped]" 
      ? `Agile core team configuration: ${team}. Custom operational guidelines & proprietary AI routines.`
      : "Lean and agile organizational design with proprietary AI routines configured for the specific product niche.",
    customerSegments: [
      idealCustomer && idealCustomer !== "[Skipped]" ? idealCustomer : "Early adopters in target sector",
      "Users experiencing high friction in current workflow alternatives",
      startupStage && startupStage !== "[Skipped]" ? `Ideal targets compatible with ${startupStage} product capabilities` : "High-intent client profiles"
    ],
    keyMetrics: [
      successSixMonths && successSixMonths !== "[Skipped]" ? `6-Month Target: ${successSixMonths}` : "Active user adoption and growth trajectory",
      priorities && priorities !== "[Skipped]" ? `90-Day Milestone Execution: ${priorities.split('\n')[0]}` : "Core MVP feature completion rate",
      "Weekly user retention and workflow automation efficiency"
    ],
    channels: [
      assistFirst && assistFirst.length > 0 ? `Targeted AI automation for ${assistFirst.join(' & ')}` : "AI-driven marketing and outbound operations",
      tools && tools.length > 0 ? `Direct API triggers using: ${tools.slice(0, 3).join(', ')}` : "Direct slack notifications and dashboard views",
      "Organic product-led growth loops and partner ecosystems"
    ],
    costStructure: [
      team && team !== "[Skipped]" ? `Engineering and product development costs: ${team}` : "Software engineering and design payroll",
      tools && tools.length > 0 ? `SaaS licenses & API costs: ${tools.slice(0, 4).join(', ')}` : "SaaS subscription costs and cloud hosting",
      "Marketing, sales customer acquisition, and general operations"
    ],
    revenueStreams: [
      successSixMonths && successSixMonths.toLowerCase().includes("mrr") 
        ? `Subscription-based model aiming for target MRR: ${successSixMonths}`
        : "Direct monetization / Subscription licensing fee",
      startupStage === "Revenue generating" || startupStage === "Growing fast"
        ? "Scaling existing premium software tiers"
        : "Early pilot contracts, pre-sales, or freemium-to-paid conversion",
      "Value-added premium services and analytics access"
    ]
  };
};

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
  const [fileDragging, setFileDragging] = useState(false);

  // Lean Canvas State
  const [loadingSteps, setLoadingSteps] = useState([
    { label: "Parsing startup description and sector details", status: "pending" },
    { label: "Modeling ideal customer segments and ICP targets", status: "pending" },
    { label: "Synthesizing unique value propositions", status: "pending" },
    { label: "Formulating operational metrics and channels", status: "pending" },
    { label: "Constructing Lean Canvas model workspace", status: "pending" },
  ]);
  const [canvasData, setCanvasData] = useState(null);
  const [summaryText, setSummaryText] = useState("");

  // Focus and refs
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimer = useRef(null);

  const padNum = (num) => String(num).padStart(2, "0");

  useEffect(() => {
    setIsMounted(true);
    const user = localStorage.getItem("founder_user");
    if (!user) {
      router.replace("/login");
      return;
    }
    const saved = localStorage.getItem("founder_onboarding_answers");
    if (saved) {
      try {
        setAnswers(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved onboarding answers", e);
      }
    }
  }, [router]);

  useEffect(() => {
    if (isMounted && Object.keys(answers).length > 0) {
      localStorage.setItem("founder_onboarding_answers", JSON.stringify(answers));
    }
  }, [answers, isMounted]);

  useEffect(() => {
    if (step >= 0 && step < QUESTIONS.length) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);

      const currentQ = QUESTIONS[step];
      if (currentQ.microcopy) {
        toast.dismiss();
        toast(currentQ.microcopy, {
          style: {
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
            borderRadius: "var(--radius)",
          },
        });
      }
    }
  }, [step]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isTextarea = e.target.tagName === "TEXTAREA";

      if (step >= 0 && step < QUESTIONS.length) {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          handleNext();
        }

        if (e.key === "ArrowLeft" && e.altKey) {
          e.preventDefault();
          handlePrev();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, answers]);

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
            [currentQ.id]: initialText + speechText.substring(0, currentLength),
          }));
        } else {
          setVoiceActive(false);
          clearInterval(typingTimer.current);
        }
      }, 40);
    }, 1200);
  };

  const handleStart = () => setStep(0);

  const handleNext = () => {
    if (step < 0) return;

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
        [QUESTIONS[step].id]: "[Skipped]",
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
      [currentQ.id]: updated,
    }));
  };

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
      size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
    }));

    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    setAnswers((prev) => ({
      ...prev,
      [QUESTIONS[step].id]: updatedFiles.map((f) => f.name),
    }));
  };

  const removeFile = (idx) => {
    const updatedFiles = files.filter((_, i) => i !== idx);
    setFiles(updatedFiles);
    setAnswers((prev) => ({
      ...prev,
      [QUESTIONS[step].id]: updatedFiles.map((f) => f.name),
    }));
  };

  const generateAnalysisSummary = async () => {
    setGeneratingSummary(true);
    const intervalTime = 700;
    let currentIndex = 0;
    
    setLoadingSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: "loading" } : s));

    const interval = setInterval(() => {
      setLoadingSteps(prev => {
        const next = [...prev];
        if (next[currentIndex]) {
          next[currentIndex].status = "completed";
        }
        if (next[currentIndex + 1]) {
          next[currentIndex + 1].status = "loading";
        }
        return next;
      });
      currentIndex++;
      if (currentIndex >= 5) {
        clearInterval(interval);
      }
    }, intervalTime);

    let apiResponse = null;
    let apiSummary = "";

    try {
      const formattedDto = QUESTIONS.map((q) => ({
        question: q.title,
        answer: answers[q.id] !== undefined && answers[q.id] !== null ? answers[q.id] : "",
      }));

      const response = await api.post("/onboarding", formattedDto);
      if (response && response.canvas) {
        apiResponse = response.canvas;
        apiSummary = response.summary || "";
      } else if (response && response.summary) {
        apiSummary = response.summary;
        apiResponse = generateLocalCanvasFallback(answers);
      } else {
        throw new Error("Invalid response from backend");
      }
    } catch (error) {
      console.error("Failed to generate summary from backend:", error);
      apiResponse = generateLocalCanvasFallback(answers);
      apiSummary = "We have customized your startup canvas template. Click below to enter the dashboard.";
    }

    setTimeout(() => {
      setCanvasData(apiResponse);
      setSummaryText(apiSummary);
      setGeneratingSummary(false);
      setStep(13);
    }, 3800);
  };

  const [extractedPayload, setExtractedPayload] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractSuccess, setExtractSuccess] = useState(false);

  const handleFinishOnboarding = async (finalCanvasData) => {
    setIsExtracting(true);
    const dataToFormat = finalCanvasData || canvasData || generateLocalCanvasFallback(answers);

    const formattedPayload = {
      problem: Array.isArray(dataToFormat.problem) ? dataToFormat.problem : [dataToFormat.problem].filter(Boolean),
      solution: Array.isArray(dataToFormat.solution) ? dataToFormat.solution : [dataToFormat.solution].filter(Boolean),
      uniqueValueProposition: typeof dataToFormat.uniqueValueProposition === "string" 
        ? dataToFormat.uniqueValueProposition 
        : (typeof dataToFormat.uvp === "string" ? dataToFormat.uvp : (Array.isArray(dataToFormat.uniqueValueProposition) ? dataToFormat.uniqueValueProposition.join(" ") : "")),
      customerSegments: Array.isArray(dataToFormat.customerSegments) ? dataToFormat.customerSegments : [dataToFormat.customerSegments].filter(Boolean),
      channels: Array.isArray(dataToFormat.channels) ? dataToFormat.channels : [dataToFormat.channels].filter(Boolean),
      revenueStreams: Array.isArray(dataToFormat.revenueStreams) ? dataToFormat.revenueStreams : [dataToFormat.revenueStreams].filter(Boolean),
      costStructure: Array.isArray(dataToFormat.costStructure) ? dataToFormat.costStructure : [dataToFormat.costStructure].filter(Boolean),
      keyMetrics: Array.isArray(dataToFormat.keyMetrics) ? dataToFormat.keyMetrics : [dataToFormat.keyMetrics].filter(Boolean),
      unfairAdvantage: typeof dataToFormat.unfairAdvantage === "string" 
        ? dataToFormat.unfairAdvantage 
        : (typeof dataToFormat.unfair_advantage === "string" ? dataToFormat.unfair_advantage : (Array.isArray(dataToFormat.unfairAdvantage) ? dataToFormat.unfairAdvantage.join(" ") : "")),
    };

    setExtractedPayload(formattedPayload);

    const userJson = localStorage.getItem("founder_user");
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        localStorage.setItem(`founder_onboarded_${user.email}`, "true");
      } catch (e) {
        console.error(e);
      }
    }

    try {
      const res = await api.post("/onboarding/extract", formattedPayload);
      console.log("Extraction response from backend:", res);
      setExtractSuccess(true);
      toast.success("Startup blueprint saved successfully! Entering office floor...");
      router.push("/dashboard");
    } catch (err) {
      console.error("Error posting to /onboarding/extract:", err);
      setExtractSuccess(true);
      toast.success("Entering office floor...");
      router.push("/dashboard");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSkipAll = () => {
    const userJson = localStorage.getItem("founder_user");
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        localStorage.setItem(`founder_onboarded_${user.email}`, "true");
      } catch (e) {
        console.error(e);
      }
    }
    localStorage.setItem("founder_onboarded", "true");
    router.push("/dashboard");
  };

  if (!isMounted) return null;

  return (
    <div className="relative flex min-h-screen flex-col justify-center bg-background text-foreground transition-colors duration-300">
      {/* Hairline thin top header control */}
      <header className="absolute top-6 left-6 right-6 flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-6 rounded bg-[#f59e0b]/20 border border-[#f59e0b] flex items-center justify-center font-pixel text-[#f59e0b] text-[10px]">
            FH
          </div>
          <span className="font-pixel text-[10px] tracking-widest text-[#f59e0b] uppercase">
            FOUNDER HARNESS
          </span>
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
      <div className={`mx-auto w-full px-6 py-12 transition-all duration-500 ease-in-out ${step === 13 ? "max-w-6xl" : "max-w-xl"}`}>
        {step === -1 ? (
          /* Welcome Screen */
          <Card className="border border-border bg-card rounded shadow-none">
            <CardContent className="flex flex-col items-start p-8 sm:p-10">
              <h1 className="font-sans font-bold text-3xl sm:text-4xl text-foreground tracking-tight leading-none">
                Let's understand your company.
              </h1>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                Instead of filling long forms, answer a few simple questions.
                Your AI will use this information to understand your business,
                automate work, and make better decisions.
              </p>

              <div className="mt-6 flex items-center gap-2 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                <span>ESTIMATED TIME: 3–5 MINUTES</span>
              </div>

              <div className="mt-8 flex w-full flex-col sm:flex-row gap-3">
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
          /* AI Analyzing Loading Screen with Checklist Simulation */
          <Card className="border border-border bg-card rounded shadow-none">
            <CardContent className="p-8 space-y-6 min-h-[300px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  <h2 className="font-sans font-bold text-lg tracking-tight text-foreground">
                    Analyzing Startup Profile
                  </h2>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                  AI ASSISTANT ACTIVE
                </span>
              </div>
              
              <div className="space-y-4 pt-2">
                {loadingSteps.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs transition-all duration-300">
                    <div className="flex items-center gap-3">
                      {s.status === "completed" ? (
                        <div className="flex size-5 items-center justify-center rounded bg-primary/10 text-primary">
                          <Check className="size-3" />
                        </div>
                      ) : s.status === "loading" ? (
                        <div className="flex size-5 items-center justify-center rounded bg-secondary text-primary animate-pulse">
                          <span className="size-1.5 rounded-full bg-primary" />
                        </div>
                      ) : (
                        <div className="flex size-5 items-center justify-center rounded bg-secondary/50 text-muted-foreground/30">
                          <span className="size-1 rounded-full bg-muted-foreground/20" />
                        </div>
                      )}
                      <span className={`transition-colors duration-200 ${
                        s.status === "completed" 
                          ? "text-muted-foreground font-normal line-through decoration-muted-foreground/30" 
                          : s.status === "loading" 
                            ? "text-foreground font-medium" 
                            : "text-muted-foreground/50"
                      }`}>
                        {s.label}
                      </span>
                    </div>
                    {s.status === "loading" && (
                      <span className="font-mono text-[9px] text-primary animate-pulse uppercase">
                        IN PROGRESS
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : step === 13 && canvasData ? (
          /* Completion Summary - Interactive Lean Canvas Screen */
          <LeanCanvasView 
            canvasData={canvasData} 
            summaryText={summaryText} 
            onFinish={handleFinishOnboarding}
            isExtracting={isExtracting}
            extractSuccess={extractSuccess}
            extractedPayload={extractedPayload}
            onProceedToDashboard={() => router.push("/dashboard")}
          />
        ) : (
          /* Question Screens (0 to 11) */
          <div className="space-y-6">
            {/* Progress indicators - Plain System Mono Counter "03 / 12" */}
            <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
              <span>
                QUESTION {padNum(step + 1)} / {padNum(QUESTIONS.length)}
              </span>
              <span>
                {Math.round(((step + 1) / QUESTIONS.length) * 100)}% COMPLETE
              </span>
            </div>

            {/* Progress bar */}
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
                            [QUESTIONS[step].id]: e.target.value,
                          }))
                        }
                        className="bg-background border border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 rounded resize-none pr-12 text-sm leading-relaxed"
                      />

                      <button
                        type="button"
                        onClick={handleVoiceInput}
                        className="absolute right-3 bottom-3 flex size-7 items-center justify-center rounded hover:bg-secondary transition-none text-muted-foreground hover:text-foreground"
                        title="Simulate Speech Input"
                      >
                        {voiceActive ? (
                          <span className="text-[10px] font-mono text-primary font-semibold tracking-wider">
                            REC
                          </span>
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
                            type="button; "
                            onClick={() =>
                              setAnswers((prev) => ({
                                ...prev,
                                [QUESTIONS[step].id]: opt,
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
                          .filter((opt) => opt.toLowerCase().includes(searchText.toLowerCase()))
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
                          fileDragging ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"
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
                          <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                            ATTACHMENTS
                          </p>
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
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <div className="hidden md:flex items-center gap-1 font-mono text-[9px] text-muted-foreground uppercase mr-2">
                      <kbd className="px-1 py-0.5 border border-border rounded bg-secondary">
                        Ctrl + Enter
                      </kbd>
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
