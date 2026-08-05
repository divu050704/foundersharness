"use client";

import { useState } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LeanCanvasView({
  canvasData: initialCanvasData,
  summaryText,
  onFinish,
}) {
  const [canvasData, setCanvasData] = useState(initialCanvasData);
  const [showSummaryBriefing, setShowSummaryBriefing] = useState(false);
  const [editingBox, setEditingBox] = useState(null);

  const handleSaveAndFinish = () => {
    onFinish(canvasData);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary animate-pulse" />
            <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Interactive Startup Blueprint
            </span>
          </div>
          <h1 className="font-sans font-bold text-3xl tracking-tight text-foreground">
            Your Lean Canvas is ready.
          </h1>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            We've parsed your onboarding inputs to draft this canvas. Click any section to customize or edit the details before proceeding.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSaveAndFinish}
            className="font-medium text-xs px-5 rounded bg-primary text-primary-foreground hover:bg-primary/95 transition-none shadow-none"
          >
            Enter Workspace
            <X className="ml-1.5 size-3.5" style={{ transform: "rotate(45deg)" }} />
          </Button>
        </div>
      </div>

      {/* Collapsible AI Briefing Summary */}
      {showSummaryBriefing && summaryText && (
        <Card className="border border-primary/20 bg-primary/5 rounded shadow-none animate-in slide-in-from-top-2 duration-300">
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
          className="md:col-span-1 border border-border bg-card rounded p-4 flex flex-col justify-between min-h-[300px] cursor-pointer hover:border-primary/50 group transition-all animate-in fade-in zoom-in-95 duration-300"
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
            className="border border-border bg-card rounded p-4 flex-1 min-h-[142px] flex flex-col justify-between cursor-pointer hover:border-primary/50 group transition-all animate-in fade-in zoom-in-95 duration-300 delay-75"
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
            className="border border-border bg-card rounded p-4 flex-1 min-h-[142px] flex flex-col justify-between cursor-pointer hover:border-primary/50 group transition-all animate-in fade-in zoom-in-95 duration-300 delay-100"
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

        {/* Box 3: Unique Value Proposition */}
        <div 
          onClick={() => setEditingBox("uvp")}
          className="md:col-span-1 border border-border bg-card rounded p-4 flex flex-col justify-between min-h-[300px] cursor-pointer hover:border-primary/50 group transition-all animate-in fade-in zoom-in-95 duration-300 delay-150"
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                <Award className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span>UVP</span>
              </div>
              <Pencil className="size-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground list-disc list-inside">
              {(canvasData.uvp || []).map((item, idx) => (
                <li key={idx} className="leading-relaxed font-medium">{item}</li>
              ))}
            </ul>
          </div>
          <div className="text-[9px] font-mono text-muted-foreground/40 mt-4 group-hover:text-primary/60 transition-colors uppercase tracking-wider">
            Click to Edit
          </div>
        </div>

        {/* Box 4: Unfair Advantage & Channels */}
        <div className="md:col-span-1 flex flex-col gap-3.5">
          {/* Unfair Advantage */}
          <div 
            onClick={() => setEditingBox("unfairAdvantage")}
            className="border border-border bg-card rounded p-4 flex-1 min-h-[142px] flex flex-col justify-between cursor-pointer hover:border-primary/50 group transition-all animate-in fade-in zoom-in-95 duration-300 delay-200"
          >
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                  <Zap className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>Unfair Advantage</span>
                </div>
                <Pencil className="size-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground list-disc list-inside">
                {(canvasData.unfairAdvantage || []).map((item, idx) => (
                  <li key={idx} className="leading-relaxed">{item}</li>
                ))}
              </ul>
            </div>
            <div className="text-[9px] font-mono text-muted-foreground/40 mt-4 group-hover:text-primary/60 transition-colors uppercase tracking-wider">
              Click to Edit
            </div>
          </div>

          {/* Channels */}
          <div 
            onClick={() => setEditingBox("channels")}
            className="border border-border bg-card rounded p-4 flex-1 min-h-[142px] flex flex-col justify-between cursor-pointer hover:border-primary/50 group transition-all animate-in fade-in zoom-in-95 duration-300 delay-225"
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
          className="md:col-span-1 border border-border bg-card rounded p-4 flex flex-col justify-between min-h-[300px] cursor-pointer hover:border-primary/50 group transition-all animate-in fade-in zoom-in-95 duration-300 delay-300"
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
          className="border border-border bg-card rounded p-4 min-h-[142px] flex flex-col justify-between cursor-pointer hover:border-primary/50 group transition-all animate-in fade-in zoom-in-95 duration-300 delay-350"
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
          className="border border-border bg-card rounded p-4 min-h-[142px] flex flex-col justify-between cursor-pointer hover:border-primary/50 group transition-all animate-in fade-in zoom-in-95 duration-300 delay-400"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-lg border border-border bg-card rounded shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-sans font-bold text-lg text-foreground uppercase tracking-wider">
                  Edit {editingBox.replace(/([A-Z])/g, ' $1')}
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
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {(canvasData[editingBox] || []).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={item}
                      onChange={(e) => {
                        const updatedList = [...canvasData[editingBox]];
                        updatedList[idx] = e.target.value;
                        setCanvasData((prev) => ({
                          ...prev,
                          [editingBox]: updatedList,
                        }));
                      }}
                      className="bg-background border-border text-xs py-1.5"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const updatedList = canvasData[editingBox].filter(
                          (_, i) => i !== idx
                        );
                        setCanvasData((prev) => ({
                          ...prev,
                          [editingBox]: updatedList,
                        }));
                      }}
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

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const currentList = canvasData[editingBox] || [];
                    setCanvasData((prev) => ({
                      ...prev,
                      [editingBox]: [...currentList, "New canvas item"],
                    }));
                  }}
                  className="text-xs border-border hover:bg-secondary rounded"
                >
                  + Add Point
                </Button>
                <Button
                  size="sm"
                  onClick={() => setEditingBox(null)}
                  className="text-xs px-5 rounded bg-primary text-primary-foreground hover:bg-primary/95"
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
