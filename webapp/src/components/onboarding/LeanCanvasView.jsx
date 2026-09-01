"use client";

import { useState } from "react";

import {
  Sparkles,
  AlertCircle,
  Lightbulb,
  Award,
  Zap,
  Users,
  BarChart3,
  Send,
  CreditCard,
  Coins,
  Pencil,
  X,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Code2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";

const ensureArray = (val) => {
  if (Array.isArray(val)) return val.filter((item) => typeof item === "string" ? item.trim() !== "" : item != null);
  if (typeof val === "string" && val.trim()) {
    if (val.includes("\n")) {
      return val.split("\n").map((s) => s.replace(/^[•\-\*\d+\.]\s*/, "").trim()).filter(Boolean);
    }
    return [val.trim()];
  }
  return [];
};

const ensureString = (val) => {
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.join(" ");
  return "";
};

const normalizeCanvasData = (data) => {
  if (!data) return {};
  const uvpVal = ensureString(data.uniqueValueProposition || data.uvp || "");
  const unfairVal = ensureString(data.unfairAdvantage || data.unfair_advantage || "");

  return {
    problem: ensureArray(data.problem),
    solution: ensureArray(data.solution),
    keyMetrics: ensureArray(data.keyMetrics),
    uniqueValueProposition: uvpVal,
    uvp: uvpVal,
    unfairAdvantage: unfairVal,
    unfair_advantage: unfairVal,
    channels: ensureArray(data.channels),
    customerSegments: ensureArray(data.customerSegments),
    costStructure: ensureArray(data.costStructure),
    revenueStreams: ensureArray(data.revenueStreams),
  };
};

const BOX_TITLES = {
  problem: "Problem",
  solution: "Solution",
  keyMetrics: "Key Metrics",
  uniqueValueProposition: "Unique Value Proposition",
  uvp: "Unique Value Proposition",
  unfairAdvantage: "Unfair Advantage",
  unfair_advantage: "Unfair Advantage",
  channels: "Channels",
  customerSegments: "Customer Segments",
  costStructure: "Cost Structure",
  revenueStreams: "Revenue Streams",
};

export default function LeanCanvasView({
  canvasData: initialCanvasData,
  summaryText,
  onFinish,
  isExtracting,
  extractSuccess,
  extractedPayload,
  onProceedToDashboard,
}) {
  const [canvasData, setCanvasData] = useState(() => normalizeCanvasData(initialCanvasData));
  const [showSummaryBriefing, setShowSummaryBriefing] = useState(false);
  const [editingBox, setEditingBox] = useState(null);

  const isStringBox = (key) => key === "uniqueValueProposition" || key === "uvp" || key === "unfairAdvantage" || key === "unfair_advantage";

  const handleSaveAndFinish = () => {
    onFinish(canvasData);
  };

  const updateStringBox = (boxKey, value) => {
    const isUvp = boxKey === "uniqueValueProposition" || boxKey === "uvp";
    const isUnfair = boxKey === "unfairAdvantage" || boxKey === "unfair_advantage";

    setCanvasData((prev) => ({
      ...prev,
      [boxKey]: value,
      ...(isUvp ? { uniqueValueProposition: value, uvp: value } : {}),
      ...(isUnfair ? { unfairAdvantage: value, unfair_advantage: value } : {}),
    }));
  };

  const updateBoxItem = (boxKey, index, value) => {
    const list = [...(canvasData[boxKey] || [])];
    list[index] = value;
    setCanvasData((prev) => ({
      ...prev,
      [boxKey]: list,
    }));
  };

  const removeBoxItem = (boxKey, index) => {
    const list = (canvasData[boxKey] || []).filter((_, i) => i !== index);
    setCanvasData((prev) => ({
      ...prev,
      [boxKey]: list,
    }));
  };

  const addBoxItem = (boxKey) => {
    const currentList = canvasData[boxKey] || [];
    const list = [...currentList, "New canvas item"];
    setCanvasData((prev) => ({
      ...prev,
      [boxKey]: list,
    }));
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Top Controls Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary animate-pulse" />
            <span className="font-pixel text-[10px] tracking-widest text-[#f59e0b] uppercase">
              FOUNDER HARNESS // LEAN CANVAS BLUEPRINT
            </span>
          </div>
          <h1 className="font-sans font-bold text-3xl tracking-tight text-foreground">
            Your Startup Lean Canvas is ready.
          </h1>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed font-mono">
            We've parsed your onboarding inputs to draft this canvas. Click any section to customize or edit details.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSaveAndFinish}
            disabled={isExtracting}
            className="font-pixel text-[10px] px-5 py-2.5 rounded bg-primary text-primary-foreground hover:bg-primary/95 transition-none shadow-none uppercase font-bold cursor-pointer disabled:opacity-50"
          >
            {isExtracting ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>Enter Office Floor 🏢</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Collapsible AI Briefing Summary */}
      {showSummaryBriefing && summaryText && (
        <Card className="border border-primary/20 bg-primary/5 rounded shadow-none">
          <CardContent className="p-5 text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
            <div className="font-semibold text-foreground mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider">
              <Sparkles className="size-3.5 text-primary" />
              AI Executive Briefing
            </div>
            {summaryText}
          </CardContent>
        </Card>
      )}

      {/* Lean Canvas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
        
        {/* Box 1: Problem */}
        <div 
          onClick={() => setEditingBox("problem")}
          className="md:col-span-1 border border-border bg-card rounded p-4 flex flex-col justify-between min-h-[300px] cursor-pointer hover:border-primary/50 group transition-all"
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                <AlertCircle className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span>Problem</span>
              </div>
              <Pencil className="size-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground list-disc list-inside">
              {(canvasData.problem || []).map((item, idx) => (
                <li key={idx} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>
          <div className="text-[9px] font-mono text-muted-foreground/40 mt-4 group-hover:text-primary/60 transition-colors uppercase tracking-wider">
            Click to Edit
          </div>
        </div>

        {/* Box 2: Solution & Key Metrics */}
        <div className="md:col-span-1 flex flex-col gap-3.5">
          {/* Solution */}
          <div 
            onClick={() => setEditingBox("solution")}
            className="border border-border bg-card rounded p-4 flex-1 min-h-[142px] flex flex-col justify-between cursor-pointer hover:border-primary/50 group transition-all"
          >
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                  <Lightbulb className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>Solution</span>
                </div>
                <Pencil className="size-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground list-disc list-inside">
                {(canvasData.solution || []).map((item, idx) => (
                  <li key={idx} className="leading-relaxed">{item}</li>
                ))}
              </ul>
            </div>
            <div className="text-[9px] font-mono text-muted-foreground/40 mt-4 group-hover:text-primary/60 transition-colors uppercase tracking-wider">
              Click to Edit
            </div>
          </div>

          {/* Key Metrics */}
          <div 
            onClick={() => setEditingBox("keyMetrics")}
            className="border border-border bg-card rounded p-4 flex-1 min-h-[142px] flex flex-col justify-between cursor-pointer hover:border-primary/50 group transition-all"
          >
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                  <BarChart3 className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>Key Metrics</span>
                </div>
                <Pencil className="size-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground list-disc list-inside">
                {(canvasData.keyMetrics || []).map((item, idx) => (
                  <li key={idx} className="leading-relaxed">{item}</li>
                ))}
              </ul>
            </div>
            <div className="text-[9px] font-mono text-muted-foreground/40 mt-4 group-hover:text-primary/60 transition-colors uppercase tracking-wider">
              Click to Edit
            </div>
          </div>
        </div>

        {/* Box 3: Unique Value Proposition (STRING VALUE) */}
        <div 
          onClick={() => setEditingBox("uniqueValueProposition")}
          className="md:col-span-1 border border-border bg-card rounded p-4 flex flex-col justify-between min-h-[300px] cursor-pointer hover:border-primary/50 group transition-all"
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                <Award className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span>UVP (STRING)</span>
              </div>
              <Pencil className="size-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
              {canvasData.uniqueValueProposition || "State-of-the-art startup enablement with tailored workspace integrated directly with founder workflows."}
            </p>
          </div>
          <div className="text-[9px] font-mono text-muted-foreground/40 mt-4 group-hover:text-primary/60 transition-colors uppercase tracking-wider">
            Click to Edit String
          </div>
        </div>

        {/* Box 4: Unfair Advantage (STRING VALUE) & Channels */}
        <div className="md:col-span-1 flex flex-col gap-3.5">
          {/* Unfair Advantage (STRING VALUE) */}
          <div 
            onClick={() => setEditingBox("unfairAdvantage")}
            className="border border-border bg-card rounded p-4 flex-1 min-h-[142px] flex flex-col justify-between cursor-pointer hover:border-primary/50 group transition-all"
          >
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                  <Zap className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>Unfair Advantage (STRING)</span>
                </div>
                <Pencil className="size-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {canvasData.unfairAdvantage || "Lean and agile organizational design with proprietary AI routines configured for the specific product niche."}
              </p>
            </div>
            <div className="text-[9px] font-mono text-muted-foreground/40 mt-4 group-hover:text-primary/60 transition-colors uppercase tracking-wider">
              Click to Edit String
            </div>
          </div>

          {/* Channels */}
          <div 
            onClick={() => setEditingBox("channels")}
            className="border border-border bg-card rounded p-4 flex-1 min-h-[142px] flex flex-col justify-between cursor-pointer hover:border-primary/50 group transition-all"
          >
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                  <Send className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>Channels</span>
                </div>
                <Pencil className="size-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground list-disc list-inside">
                {(canvasData.channels || []).map((item, idx) => (
                  <li key={idx} className="leading-relaxed">{item}</li>
                ))}
              </ul>
            </div>
            <div className="text-[9px] font-mono text-muted-foreground/40 mt-4 group-hover:text-primary/60 transition-colors uppercase tracking-wider">
              Click to Edit
            </div>
          </div>
        </div>

        {/* Box 5: Customer Segments */}
        <div 
          onClick={() => setEditingBox("customerSegments")}
          className="md:col-span-1 border border-border bg-card rounded p-4 flex flex-col justify-between min-h-[300px] cursor-pointer hover:border-primary/50 group transition-all"
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                <Users className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span>Customer Segments</span>
              </div>
              <Pencil className="size-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground list-disc list-inside">
              {(canvasData.customerSegments || []).map((item, idx) => (
                <li key={idx} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>
          <div className="text-[9px] font-mono text-muted-foreground/40 mt-4 group-hover:text-primary/60 transition-colors uppercase tracking-wider">
            Click to Edit
          </div>
        </div>

      </div>

      {/* Bottom Row: Cost Structure & Revenue Streams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-3.5">
        {/* Cost Structure */}
        <div 
          onClick={() => setEditingBox("costStructure")}
          className="border border-border bg-card rounded p-4 min-h-[142px] flex flex-col justify-between cursor-pointer hover:border-primary/50 group transition-all"
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                <CreditCard className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span>Cost Structure</span>
              </div>
              <Pencil className="size-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground list-disc list-inside">
              {(canvasData.costStructure || []).map((item, idx) => (
                <li key={idx} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>
          <div className="text-[9px] font-mono text-muted-foreground/40 mt-4 group-hover:text-primary/60 transition-colors uppercase tracking-wider">
            Click to Edit
          </div>
        </div>

        {/* Revenue Streams */}
        <div 
          onClick={() => setEditingBox("revenueStreams")}
          className="border border-border bg-card rounded p-4 min-h-[142px] flex flex-col justify-between cursor-pointer hover:border-primary/50 group transition-all"
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                <Coins className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span>Revenue Streams</span>
              </div>
              <Pencil className="size-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground list-disc list-inside">
              {(canvasData.revenueStreams || []).map((item, idx) => (
                <li key={idx} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>
          <div className="text-[9px] font-mono text-muted-foreground/40 mt-4 group-hover:text-primary/60 transition-colors uppercase tracking-wider">
            Click to Edit
          </div>
        </div>
      </div>

      {/* Canvas Editing Modal */}
      {editingBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg border border-border bg-card rounded shadow-lg">
            <CardContent className="p-6 space-y-4 font-mono">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-sans font-bold text-lg text-foreground uppercase tracking-wider">
                  Edit {BOX_TITLES[editingBox] || editingBox}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingBox(null)}
                  className="size-8 rounded hover:bg-secondary text-muted-foreground"
                >
                  <X className="size-4" />
                </Button>
              </div>
              
              {isStringBox(editingBox) ? (
                /* STRING EDITING TEXTAREA */
                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold">
                    Edit String Content
                  </label>
                  <Textarea
                    rows={5}
                    value={canvasData[editingBox] || ""}
                    onChange={(e) => updateStringBox(editingBox, e.target.value)}
                    className="bg-background border-border text-xs leading-relaxed"
                  />
                </div>
              ) : (
                /* ARRAY ITEM LIST EDITING */
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {(canvasData[editingBox] || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={item}
                        onChange={(e) => updateBoxItem(editingBox, idx, e.target.value)}
                        className="bg-background border-border text-xs py-1.5"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBoxItem(editingBox, idx)}
                        className="size-8 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}

                  {(canvasData[editingBox] || []).length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No items. Add one below.</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border">
                {!isStringBox(editingBox) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addBoxItem(editingBox)}
                    className="text-xs border-border hover:bg-secondary rounded"
                  >
                    + Add Point
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => setEditingBox(null)}
                  className="text-xs px-5 rounded bg-primary text-primary-foreground hover:bg-primary/95 ml-auto"
                >
                  Save & Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
