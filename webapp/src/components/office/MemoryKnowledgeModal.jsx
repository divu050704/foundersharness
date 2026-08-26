"use client";

import { useState } from "react";
import { X, Brain, Database, FileText, Sparkles, CheckCircle2, Search, Cpu } from "lucide-react";
import { playRetroSound } from "@/lib/retroAudio";

export default function MemoryKnowledgeModal({ onClose }) {
  const [activeTab, setActiveTab] = useState("mempalace"); // mempalace, knowledge, connectors
  const [searchQuery, setSearchQuery] = useState("");

  const memoryItems = [
    { id: 1, category: "Architecture", content: "React 19 Next.js 16 setup with Tailwind v4 & Zustand store state", date: "Today, 10:15 AM", confidence: "99.8%" },
    { id: 2, category: "Quality Assurance", content: "Playwright E2E test suites configured for zero-regression check", date: "Today, 09:40 AM", confidence: "98.5%" },
    { id: 3, category: "Design Tokens", content: "Munder Difflin paper brown & CRT retro pixel-art theme variables", date: "Yesterday", confidence: "99.2%" },
    { id: 4, category: "Compliance & Safety", content: "Rate-limiter & OAuth credential masking guardrails enabled", date: "Yesterday", confidence: "100%" }
  ];

  const knowledgeDocs = [
    { name: "startup_prd_v2.pdf", size: "2.4 MB", type: "PDF Document", indexed: true },
    { name: "lean_canvas_model.json", size: "128 KB", type: "JSON Spec", indexed: true },
    { name: "architecture_diagram.png", size: "1.1 MB", type: "Image Asset", indexed: true }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto font-mono">
      <div className="bg-[#141a22] border-4 border-[#2e3e50] w-full max-w-3xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-slate-100 crt-overlay">
        
        {/* Header */}
        <div className="bg-[#18202a] border-b border-[#2e3e50] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded bg-[#f59e0b]/20 border border-[#f59e0b] flex items-center justify-center text-[#f59e0b] text-base">
              🧠
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-pixel text-sm text-[#f3f4f6]">MEMPALACE & KNOWLEDGE BASE</h3>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] px-1.5 py-0.5 rounded font-vt323">
                  VECTOR STORE ONLINE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Shared multi-agent memory vault & document embeddings repository
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playRetroSound("click");
              onClose();
            }}
            className="p-1 rounded hover:bg-[#24303e] text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-[#2e3e50] bg-[#0f1419]">
          <button
            type="button"
            onClick={() => setActiveTab("mempalace")}
            className={`flex-1 py-2.5 text-xs font-pixel flex items-center justify-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "mempalace"
                ? "border-[#f59e0b] text-[#f59e0b] bg-[#f59e0b]/10"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Brain className="size-3.5" />
            <span>MemPalace Context</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("knowledge")}
            className={`flex-1 py-2.5 text-xs font-pixel flex items-center justify-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "knowledge"
                ? "border-[#f59e0b] text-[#f59e0b] bg-[#f59e0b]/10"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="size-3.5" />
            <span>Indexed Documents</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-[#18202a] border-b border-[#2e3e50]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search MemPalace memory vector store (e.g. 'auth logic', 'Zustand')..."
              className="w-full bg-[#0f1419] border border-[#2e3e50] rounded pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-[#f59e0b]"
            />
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3 min-h-[220px]">
          {activeTab === "mempalace" && (
            <div className="space-y-2.5">
              {memoryItems
                .filter((item) => item.content.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((mem) => (
                  <div key={mem.id} className="bg-[#18202a] border border-[#2e3e50] p-3 rounded-lg flex items-start justify-between gap-3 hover:border-[#f59e0b]/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-pixel text-[9px] bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40 px-1.5 py-0.5 rounded">
                          {mem.category}
                        </span>
                        <span className="text-[10px] text-slate-400">{mem.date}</span>
                      </div>
                      <p className="text-xs text-slate-200">{mem.content}</p>
                    </div>

                    <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded shrink-0">
                      Match: {mem.confidence}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {activeTab === "knowledge" && (
            <div className="space-y-2">
              {knowledgeDocs.map((doc, idx) => (
                <div key={idx} className="bg-[#18202a] border border-[#2e3e50] p-3 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="size-5 text-[#f59e0b]" />
                    <div>
                      <h4 className="text-xs font-bold text-white">{doc.name}</h4>
                      <p className="text-[10px] text-slate-400">{doc.type} • {doc.size}</p>
                    </div>
                  </div>

                  <span className="text-[9px] font-pixel text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 px-2 py-1 rounded flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> INDEXED
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#18202a] border-t border-[#2e3e50] p-3 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Cpu className="size-3.5 text-[#f59e0b]" /> Vector Embeddings: 4,096 Dimension Normalization
          </span>
          <button
            type="button"
            onClick={() => {
              playRetroSound("click");
              onClose();
            }}
            className="bg-[#24303e] hover:bg-[#2c3b4e] text-white px-3 py-1 rounded font-pixel text-[9px] cursor-pointer"
          >
            Close Vault
          </button>
        </div>

      </div>
    </div>
  );
}
