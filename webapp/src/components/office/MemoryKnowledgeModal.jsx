"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Brain, GitBranch, RefreshCw, Cpu, AlertTriangle } from "lucide-react";
import { playRetroSound } from "@/lib/retroAudio";
import api from "@/lib/api";

// Helper function to normalize both Cytoscape { data: { ... } } and flat { id, label, ... } graph structures
export function normalizeGraphData(rawGraph) {
  if (!rawGraph) return { nodes: [], edges: [] };

  const target = rawGraph.graph || rawGraph;
  const rawNodes = target.nodes || [];
  const rawEdges = target.edges || [];

  const nodes = rawNodes.map((n) => {
    const data = n.data || n;
    const label = data.label || data.name || data.id || "Entity";
    return {
      id: data.id || label,
      label: label,
      displayLabel: label,
      color: data.color || n.color,
      mentionCount: data.mentionCount || n.mentionCount || 1,
      properties: data.properties || {
        mentionCount: data.mentionCount || 1,
        color: data.color || "#90caf9",
        id: data.id,
      },
    };
  });

  const edges = rawEdges.map((e) => {
    const data = e.data || e;
    return {
      id: data.id || `${data.source}-${data.target}`,
      source: data.source || e.source,
      target: data.target || e.target,
      type: data.linkType || data.type || e.type || "cooccurrence",
      weight: data.weight || e.weight || 1,
      color: data.color || e.color || "#ffd700",
      lineStyle: data.lineStyle || "solid",
      properties: data.properties || {
        linkType: data.linkType || "cooccurrence",
        lastCooccurred: data.lastCooccurred,
        weight: data.weight || 1,
      },
    };
  });

  return { nodes, edges };
}

// Fallback Default Graph Structure matching backend { graph: { nodes, edges } } Cytoscape schema
const DEFAULT_MEMORY_GRAPH = {
  nodes: [
    { data: { id: "1c74f7aa-94c3-4269-9ecf-045fb2ecada3", label: "legal industry", mentionCount: 1, color: "#90caf9" } },
    { data: { id: "7948de0e-9199-48c6-a371-0976c9b6d7f7", label: "user", mentionCount: 2, color: "#42a5f5" } },
    { data: { id: "8559d88b-e891-4a26-9fac-b98c056e8bb0", label: "EY", mentionCount: 1, color: "#90caf9" } },
    { data: { id: "0f4eb283-9602-4b12-bd01-e511172b8141", label: "SaaS", mentionCount: 1, color: "#90caf9" } },
    { data: { id: "4654984f-36e6-4e95-885b-269c432cc88d", label: "pricing", mentionCount: 1, color: "#90caf9" } },
    { data: { id: "1c6a04de-e872-4b0b-b00d-a4d3c96e0faa", label: "AI", mentionCount: 1, color: "#90caf9" } },
    { data: { id: "b2d8fc9a-1cc4-4038-a0d7-34170c18f176", label: "Indian law firms", mentionCount: 1, color: "#90caf9" } },
    { data: { id: "75e35b40-db12-457b-950d-bf865d7b54f7", label: "legal tech", mentionCount: 1, color: "#90caf9" } }
  ],
  edges: [
    { data: { id: "e1", source: "1c74f7aa-94c3-4269-9ecf-045fb2ecada3", target: "7948de0e-9199-48c6-a371-0976c9b6d7f7", linkType: "cooccurrence", weight: 1, color: "#ffd700" } },
    { data: { id: "e2", source: "7948de0e-9199-48c6-a371-0976c9b6d7f7", target: "8559d88b-e891-4a26-9fac-b98c056e8bb0", linkType: "cooccurrence", weight: 1, color: "#ffd700" } },
    { data: { id: "e3", source: "1c74f7aa-94c3-4269-9ecf-045fb2ecada3", target: "8559d88b-e891-4a26-9fac-b98c056e8bb0", linkType: "cooccurrence", weight: 1, color: "#ffd700" } },
    { data: { id: "e4", source: "0f4eb283-9602-4b12-bd01-e511172b8141", target: "4654984f-36e6-4e95-885b-269c432cc88d", linkType: "cooccurrence", weight: 1, color: "#ffd700" } },
    { data: { id: "e5", source: "1c6a04de-e872-4b0b-b00d-a4d3c96e0faa", target: "b2d8fc9a-1cc4-4038-a0d7-34170c18f176", linkType: "cooccurrence", weight: 1, color: "#ffd700" } },
    { data: { id: "e6", source: "1c6a04de-e872-4b0b-b00d-a4d3c96e0faa", target: "7948de0e-9199-48c6-a371-0976c9b6d7f7", linkType: "cooccurrence", weight: 1, color: "#ffd700" } },
    { data: { id: "e7", source: "75e35b40-db12-457b-950d-bf865d7b54f7", target: "7948de0e-9199-48c6-a371-0976c9b6d7f7", linkType: "cooccurrence", weight: 1, color: "#ffd700" } },
    { data: { id: "e8", source: "75e35b40-db12-457b-950d-bf865d7b54f7", target: "b2d8fc9a-1cc4-4038-a0d7-34170c18f176", linkType: "cooccurrence", weight: 1, color: "#ffd700" } },
    { data: { id: "e9", source: "1c6a04de-e872-4b0b-b00d-a4d3c96e0faa", target: "75e35b40-db12-457b-950d-bf865d7b54f7", linkType: "cooccurrence", weight: 1, color: "#ffd700" } },
    { data: { id: "e10", source: "7948de0e-9199-48c6-a371-0976c9b6d7f7", target: "b2d8fc9a-1cc4-4038-a0d7-34170c18f176", linkType: "cooccurrence", weight: 1, color: "#ffd700" } }
  ]
};

// Canvas-based Physics Force Graph Renderer for Memory Graph
function MemoryForceGraph({ graphData, onSelectNode, selectedNodeId }) {
  const canvasRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const dragNodeRef = useRef(null);

  // Initialize node layout positions
  useEffect(() => {
    if (!graphData) return;

    const normalized = normalizeGraphData(graphData);
    if (!normalized.nodes || normalized.nodes.length === 0) return;

    const width = 640;
    const height = 340;

    const localNodes = normalized.nodes.map((n, i) => {
      const angle = (i / normalized.nodes.length) * Math.PI * 2;
      const radius = 90 + Math.random() * 60;
      return {
        id: n.id,
        label: n.label,
        displayLabel: n.displayLabel,
        color: n.color,
        properties: n.properties || {},
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: (n.mentionCount && n.mentionCount > 1) || n.label === "Company" ? 32 : 25
      };
    });

    setNodes(localNodes);
    setEdges(normalized.edges || []);
  }, [graphData]);

  // Force-directed physics loop
  useEffect(() => {
    if (nodes.length === 0) return;

    let animationFrameId;
    const width = 640;
    const height = 340;
    const centerX = width / 2;
    const centerY = height / 2;

    const updatePhysics = () => {
      setNodes((currentNodes) => {
        const nextNodes = currentNodes.map((n) => ({ ...n }));

        for (let i = 0; i < nextNodes.length; i++) {
          for (let j = i + 1; j < nextNodes.length; j++) {
            const nodeA = nextNodes[i];
            const nodeB = nextNodes[j];
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const dist = Math.hypot(dx, dy) || 1;

            if (dist < 150) {
              const force = (150 - dist) * 0.06;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              if (dragNodeRef.current?.id !== nodeA.id) {
                nodeA.vx -= fx;
                nodeA.vy -= fy;
              }
              if (dragNodeRef.current?.id !== nodeB.id) {
                nodeB.vx += fx;
                nodeB.vy += fy;
              }
            }
          }
        }

        edges.forEach((edge) => {
          const sourceNode = nextNodes.find((n) => n.id === edge.source);
          const targetNode = nextNodes.find((n) => n.id === edge.target);

          if (sourceNode && targetNode) {
            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const dist = Math.hypot(dx, dy) || 1;

            const force = (dist - 120) * 0.025;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (dragNodeRef.current?.id !== sourceNode.id) {
              sourceNode.vx += fx;
              sourceNode.vy += fy;
            }
            if (dragNodeRef.current?.id !== targetNode.id) {
              targetNode.vx -= fx;
              targetNode.vy -= fy;
            }
          }
        });

        nextNodes.forEach((node) => {
          if (dragNodeRef.current && node.id === dragNodeRef.current.id) {
            node.x = dragNodeRef.current.x;
            node.y = dragNodeRef.current.y;
            node.vx = 0;
            node.vy = 0;
            return;
          }

          node.vx += (centerX - node.x) * 0.002;
          node.vy += (centerY - node.y) * 0.002;

          node.vx *= 0.82;
          node.vy *= 0.82;

          node.x += node.vx;
          node.y += node.vy;

          node.x = Math.max(node.radius + 10, Math.min(width - node.radius - 10, node.x));
          node.y = Math.max(node.radius + 10, Math.min(height - node.radius - 10, node.y));
        });

        return nextNodes;
      });

      animationFrameId = requestAnimationFrame(updatePhysics);
    };

    animationFrameId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animationFrameId);
  }, [nodes.length, edges]);

  // Render nodes & links to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(181, 137, 0, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw Edges
    edges.forEach((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);

      if (sourceNode && targetNode) {
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.strokeStyle = edge.color || "rgba(181, 137, 0, 0.5)";
        ctx.lineWidth = Math.max(1.5, edge.weight || 1);
        ctx.stroke();

        const midX = (sourceNode.x + targetNode.x) / 2;
        const midY = (sourceNode.y + targetNode.y) / 2;
        ctx.fillStyle = "#cb4b16";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(edge.type, midX, midY - 4);
      }
    });

    // Draw Nodes with specific category palette or custom backend node color
    nodes.forEach((node) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

      let color = node.color || "#b58900"; // Default Gold or node.color
      if (!node.color) {
        if (node.label === "Company") color = "#cb4b16"; // Orange
        else if (node.label === "Customer") color = "#859900"; // Green
        else if (node.label === "Investor") color = "#b58900"; // Gold
        else if (node.label === "Tool") color = "#268bd2"; // Blue
        else if (node.label === "Founder") color = "#d33682"; // Magenta
      }

      ctx.fillStyle = color;
      ctx.fill();

      if (selectedNodeId === node.id) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3.5;
        ctx.stroke();
      } else {
        ctx.strokeStyle = "#073642";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.fillStyle = "#111827";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const nameToShow = node.displayLabel || node.label || node.id;
      const displayTitle = nameToShow.length > 14 ? `${nameToShow.substring(0, 12)}..` : nameToShow;
      ctx.fillText(displayTitle, node.x, node.y - 2);

      if (node.label && node.label !== nameToShow) {
        ctx.fillStyle = "rgba(17, 24, 39, 0.75)";
        ctx.font = "8px monospace";
        ctx.fillText(node.label, node.x, node.y + 7);
      }
    });
  }, [nodes, edges, selectedNodeId]);

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clicked = nodes.find((node) => Math.hypot(node.x - x, node.y - y) <= node.radius);
    if (clicked) {
      dragNodeRef.current = { id: clicked.id, x, y };
      onSelectNode(clicked);
    }
  };

  const handleMouseMove = (e) => {
    if (!dragNodeRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    dragNodeRef.current.x = e.clientX - rect.left;
    dragNodeRef.current.y = e.clientY - rect.top;
  };

  const handleMouseUp = () => {
    dragNodeRef.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={340}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="w-full h-[340px] block cursor-grab active:cursor-grabbing bg-[#073642] rounded-lg border-2 border-[#b58900] shadow-inner"
    />
  );
}

export default function MemoryKnowledgeModal({ onClose }) {
  const [graphData, setGraphData] = useState(DEFAULT_MEMORY_GRAPH);
  const [selectedNode, setSelectedNode] = useState(DEFAULT_MEMORY_GRAPH.nodes[0]);
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState("GET /user/memory");

  // Send GET request to /user/memory to fetch memory graph
  const fetchUserMemoryGraph = useCallback(async () => {
    setLoading(true);
    let response;
    let isUnauthorized = false;

    try {
      // Send GET request to /user/memory
      response = await api.get("/user/memory");
      setApiStatus("LIVE GRAPH /user/memory");
    } catch (e1) {
      console.warn("GET /user/memory:", e1.message);
      if (e1.message.includes("401")) {
        isUnauthorized = true;
      }
      try {
        response = await api.get("/memory/graph");
        setApiStatus("LIVE GRAPH /memory/graph");
        isUnauthorized = false;
      } catch (e2) {
        console.warn("GET /memory/graph:", e2.message);
        if (e2.message.includes("401")) {
          isUnauthorized = true;
        }
      }
    }

    // Unwrap response matching { graph: { nodes, edges } } schema
    let targetGraph = null;
    if (response && response.graph && response.graph.nodes) {
      targetGraph = response.graph;
    } else if (response && response.nodes) {
      targetGraph = response;
    }

    if (targetGraph && targetGraph.nodes && targetGraph.nodes.length > 0) {
      setGraphData(targetGraph);
      setSelectedNode(targetGraph.nodes[0]);
    } else {
      setGraphData(DEFAULT_MEMORY_GRAPH);
      if (isUnauthorized) {
        setApiStatus("401 AUTH REQUIRED (GRAPH MODE)");
      } else {
        setApiStatus("MEMORY GRAPH ONLINE");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUserMemoryGraph();
  }, [fetchUserMemoryGraph]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto font-mono select-none">
      <div className="bg-[#fdf6e3] border-4 border-[#b58900] w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#073642]">
        
        {/* Header */}
        <div className="bg-[#eee8d5] border-b-2 border-[#b58900] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded bg-[#b58900] border border-[#b58900] flex items-center justify-center text-[#fdf6e3] text-base font-bold shadow">
              🧠
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-pixel text-sm text-[#073642] font-bold">MEMPALACE KNOWLEDGE GRAPH</h3>
                <span
                  className={`border text-[9px] px-2 py-0.5 rounded font-pixel font-bold flex items-center gap-1 ${
                    apiStatus.includes("401")
                      ? "bg-amber-500/20 text-[#cb4b16] border-[#cb4b16]/50"
                      : "bg-[#859900]/20 text-[#859900] border-[#859900]/40"
                  }`}
                >
                  {apiStatus.includes("401") && <AlertTriangle className="size-3" />}
                  <span>● {apiStatus}</span>
                </span>
              </div>
              <p className="text-xs text-[#586e75]">
                Interactive multi-agent vector memory graph visualization
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playRetroSound("blip");
                fetchUserMemoryGraph();
              }}
              className="flex items-center gap-1 bg-[#fdf6e3] hover:bg-[#eee8d5] text-[#b58900] border border-[#b58900] px-2.5 py-1 rounded font-pixel text-[9px] font-bold cursor-pointer"
            >
              <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Graph</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playRetroSound("click");
                onClose();
              }}
              className="p-1 rounded hover:bg-[#eee8d5] text-[#073642] cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* GRAPH VISUALIZATION & NODE PROPERTIES BODY */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Interactive Physics Knowledge Graph Viewport */}
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between text-xs font-pixel text-[#b58900] font-bold">
                <span className="flex items-center gap-1.5">
                  <GitBranch className="size-3.5" /> INTERACTIVE KNOWLEDGE GRAPH VIEW
                </span>
                <span className="text-[10px] text-[#586e75]">Click or drag nodes</span>
              </div>

              {loading ? (
                <div className="h-[340px] bg-[#073642] rounded-lg border-2 border-[#b58900] flex flex-col items-center justify-center gap-2 text-[#fdf6e3]">
                  <Brain className="size-8 text-[#b58900] animate-pulse" />
                  <span className="font-pixel text-xs">Sending GET request to /user/memory...</span>
                </div>
              ) : (
                <MemoryForceGraph
                  graphData={graphData}
                  onSelectNode={(node) => {
                    playRetroSound("click");
                    setSelectedNode(node);
                  }}
                  selectedNodeId={selectedNode?.id}
                />
              )}
            </div>

            {/* Selected Node Metadata Inspector Card */}
            <div className="bg-[#eee8d5] border-2 border-[#b58900] p-3.5 rounded-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#b58900]/40 pb-2 mb-3">
                  <h4 className="font-pixel text-xs text-[#073642] font-bold">NODE PROPERTIES</h4>
                  <span className="text-[9px] font-pixel bg-[#b58900] text-[#fdf6e3] px-1.5 py-0.5 rounded font-bold">
                    {selectedNode?.label || "Memory Node"}
                  </span>
                </div>

                {selectedNode ? (
                  <div className="space-y-3">
                    <div className="bg-[#fdf6e3] p-2.5 rounded border border-[#b58900]/40 shadow-sm">
                      <div className="text-[10px] text-[#586e75] font-bold uppercase">Node Entity</div>
                      <div className="text-sm font-bold text-[#cb4b16] mt-0.5">{selectedNode.id}</div>
                    </div>

                    <div className="bg-[#fdf6e3] p-2.5 rounded border border-[#b58900]/40 space-y-1.5 shadow-sm">
                      <div className="text-[10px] text-[#586e75] font-bold uppercase">Graph Metadata</div>
                      {Object.entries(selectedNode.properties || {}).length > 0 ? (
                        Object.entries(selectedNode.properties || {}).map(([key, val]) => (
                          <div key={key} className="flex justify-between text-xs py-0.5 border-b border-[#eee8d5] last:border-0">
                            <span className="text-[#586e75] capitalize font-bold">{key}:</span>
                            <span className="text-[#073642] font-bold truncate max-w-[120px]">{String(val)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] text-[#586e75] italic">No extra properties defined</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 text-[#586e75] text-xs font-bold">
                    Click any node in the graph to inspect properties
                  </div>
                )}
              </div>

              <div className="mt-4 bg-[#fdf6e3] p-2 rounded border border-[#b58900]/40 text-[9px] text-[#586e75] font-bold text-center">
                Endpoint: GET /user/memory ➔ Vector Knowledge Model
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#eee8d5] border-t-2 border-[#b58900] p-3 flex items-center justify-between text-xs text-[#073642]">
          <span className="flex items-center gap-1.5 font-bold">
            <Cpu className="size-3.5 text-[#cb4b16]" /> Vector Embeddings: 4,096 Dimension Normalization (Graph Visualization)
          </span>
          <button
            type="button"
            onClick={() => {
              playRetroSound("click");
              onClose();
            }}
            className="bg-[#b58900] hover:bg-[#a17a00] text-[#fdf6e3] px-3 py-1 rounded font-pixel text-[9px] cursor-pointer font-bold"
          >
            Close Vault
          </button>
        </div>

      </div>
    </div>
  );
}
