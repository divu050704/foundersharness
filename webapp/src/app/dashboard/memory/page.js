"use client";

import {
  Brain,
  Check,
  Clock,
  Database,
  GitBranch,
  PlusCircle,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";

// Interactive force-directed canvas knowledge graph renderer
function ForceGraph({ graphData }) {
  const canvasRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const dragNodeRef = useRef(null);

  // Initialize nodes and edges
  useEffect(() => {
    if (!graphData || !graphData.nodes) return;

    const width = 800;
    const height = 450;

    // Map graph data to local node representation with random positions around the center
    const localNodes = graphData.nodes.map((n, i) => {
      const angle = (i / graphData.nodes.length) * Math.PI * 2;
      const radius = 100 + Math.random() * 100;
      return {
        id: n.id,
        label: n.label,
        properties: n.properties || {},
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: n.label === "Company" ? 35 : 25,
      };
    });

    setNodes(localNodes);
    setEdges(graphData.edges || []);
  }, [graphData]);

  // Force-directed physics loop
  useEffect(() => {
    if (nodes.length === 0) return;

    let animationFrameId;
    const width = 800;
    const height = 450;
    const centerX = width / 2;
    const centerY = height / 2;

    const updatePhysics = () => {
      setNodes((currentNodes) => {
        // Create a copy to mutate
        const nextNodes = currentNodes.map((n) => ({ ...n }));

        // 1. Repel nodes from each other
        for (let i = 0; i < nextNodes.length; i++) {
          for (let j = i + 1; j < nextNodes.length; j++) {
            const nodeA = nextNodes[i];
            const nodeB = nextNodes[j];
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            // Stronger repulsion if too close
            if (dist < 180) {
              const force = (180 - dist) * 0.08;
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

        // 2. Attract connected nodes
        edges.forEach((edge) => {
          const sourceNode = nextNodes.find((n) => n.id === edge.source);
          const targetNode = nextNodes.find((n) => n.id === edge.target);

          if (sourceNode && targetNode) {
            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            // Optimal link distance of 140px
            const force = (dist - 140) * 0.03;
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

        // 3. Friction and update positions
        nextNodes.forEach((node) => {
          if (dragNodeRef.current && node.id === dragNodeRef.current.id) {
            // Keep dragged node at current mouse position
            node.x = dragNodeRef.current.x;
            node.y = dragNodeRef.current.y;
            node.vx = 0;
            node.vy = 0;
            return;
          }

          // Pull to center slightly
          node.vx += (centerX - node.x) * 0.003;
          node.vy += (centerY - node.y) * 0.003;

          // Apply damping/friction
          node.vx *= 0.8;
          node.vy *= 0.8;

          node.x += node.vx;
          node.y += node.vy;

          // Bound within canvas boundary
          node.x = Math.max(node.radius, Math.min(width - node.radius, node.x));
          node.y = Math.max(
            node.radius,
            Math.min(height - node.radius, node.y),
          );
        });

        return nextNodes;
      });

      animationFrameId = requestAnimationFrame(updatePhysics);
    };

    animationFrameId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animationFrameId);
  }, [nodes.length, edges]);

  // Render nodes and edges to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid background
    ctx.strokeStyle = "rgba(100, 116, 139, 0.05)";
    ctx.lineWidth = 1;
    const gridSize = 30;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw Edges (Relationships)
    edges.forEach((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);

      if (sourceNode && targetNode) {
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.strokeStyle = "rgba(139, 92, 246, 0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw arrow tip
        const angle = Math.atan2(
          targetNode.y - sourceNode.y,
          targetNode.x - sourceNode.x,
        );
        const arrowLength = 10;
        const targetX = targetNode.x - Math.cos(angle) * targetNode.radius;
        const targetY = targetNode.y - Math.sin(angle) * targetNode.radius;

        ctx.beginPath();
        ctx.moveTo(targetX, targetY);
        ctx.lineTo(
          targetX - arrowLength * Math.cos(angle - Math.PI / 6),
          targetY - arrowLength * Math.sin(angle - Math.PI / 6),
        );
        ctx.lineTo(
          targetX - arrowLength * Math.cos(angle + Math.PI / 6),
          targetY - arrowLength * Math.sin(angle + Math.PI / 6),
        );
        ctx.fillStyle = "rgba(139, 92, 246, 0.6)";
        ctx.fill();

        // Draw relationship text
        const midX = (sourceNode.x + targetNode.x) / 2;
        const midY = (sourceNode.y + targetNode.y) / 2;
        ctx.fillStyle = "rgba(156, 163, 175, 0.8)";
        ctx.font = "10px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(edge.type, midX, midY - 6);
      }
    });

    // Draw Nodes (Entities)
    nodes.forEach((node) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

      // Node colors based on label
      let color = "rgba(99, 102, 241, 0.85)"; // Purple-Indigo
      if (node.label === "Company") {
        color = "rgba(236, 72, 153, 0.9)"; // Pink
      } else if (node.label === "Tool") {
        color = "rgba(59, 130, 246, 0.85)"; // Blue
      } else if (node.label === "Customer") {
        color = "rgba(16, 185, 129, 0.85)"; // Green
      } else if (node.label === "Founder") {
        color = "rgba(245, 158, 11, 0.85)"; // Amber
      } else if (node.label === "Feature") {
        color = "rgba(14, 165, 233, 0.85)"; // Cyan
      }

      ctx.fillStyle = color;
      ctx.fill();

      // Border highlight if selected
      if (selectedNode && selectedNode.id === node.id) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw node text (centered)
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const labelText =
        node.id.length > 10 ? `${node.id.substring(0, 8)}..` : node.id;
      ctx.fillText(labelText, node.x, node.y - 4);

      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = "8px Inter, sans-serif";
      ctx.fillText(node.label, node.x, node.y + 8);
    });
  }, [nodes, edges, selectedNode]);

  // Handle dragging nodes
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked a node
    const clickedNode = nodes.find((node) => {
      const dist = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
      return dist <= node.radius;
    });

    if (clickedNode) {
      dragNodeRef.current = { id: clickedNode.id, x, y };
      setSelectedNode(clickedNode);
    } else {
      setSelectedNode(null);
    }
  };

  const handleMouseMove = (e) => {
    if (!dragNodeRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    dragNodeRef.current.x = x;
    dragNodeRef.current.y = y;
  };

  const handleMouseUp = () => {
    dragNodeRef.current = null;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 relative border border-border rounded-xl bg-card/60 backdrop-blur-md overflow-hidden">
        <div className="absolute top-4 left-4 z-10 bg-secondary/80 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm">
          <GitBranch className="size-3.5 text-primary" />
          Neo4j: Knowledge Graph Model
        </div>
        <canvas
          ref={canvasRef}
          width={800}
          height={450}
          className="w-full h-[450px] block cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      <Card className="bg-card/60 backdrop-blur-md border-border h-[450px] flex flex-col">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-bold">Node properties</CardTitle>
          <CardDescription>
            Click a node in the graph to view properties
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto pt-4 space-y-4">
          {selectedNode ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary text-primary-foreground">
                  {selectedNode.label}
                </span>
                <span className="font-semibold text-foreground text-sm">
                  {selectedNode.id}
                </span>
              </div>

              <div className="border border-border/50 rounded-lg p-3 bg-secondary/40 space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Properties
                </p>
                {Object.keys(selectedNode.properties).length > 0 ? (
                  Object.entries(selectedNode.properties).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between text-xs py-1 border-b border-border/10 last:border-0"
                      >
                        <span className="text-muted-foreground capitalize">
                          {key}
                        </span>
                        <span className="text-foreground font-medium">
                          {String(value)}
                        </span>
                      </div>
                    ),
                  )
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No extra properties defined for this node.
                  </p>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                Drag nodes around inside the viewport to customize layout
                simulation constraints.
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <GitBranch className="size-10 text-muted-foreground/30 mb-2 stroke-1" />
              <p className="text-sm font-medium">No node selected</p>
              <p className="text-xs mt-1">
                Select any point in the interactive diagram to browse semantic
                metadata relationships.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function MemoryDashboard() {
  const [activeTab, setActiveTab] = useState("mongodb");
  const [loading, setLoading] = useState(true);

  // States for DB contents
  const [company, setCompany] = useState(null);
  const [entities, setEntities] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [graph, setGraph] = useState({ nodes: [], edges: [] });

  // Sandbox States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [contextQuery, setContextQuery] = useState("");
  const [compiledContext, setCompiledContext] = useState("");
  const [contextLoading, setContextLoading] = useState(false);

  const [ingestTitle, setIngestTitle] = useState("");
  const [ingestContent, setIngestContent] = useState("");
  const [ingestCategory, setIngestCategory] = useState("meeting");
  const [ingestLoading, setIngestLoading] = useState(false);

  const [resetLoading, setResetLoading] = useState(false);

  // Fetch initial memory content
  const loadMemoryData = useCallback(async () => {
    try {
      setLoading(true);
      const companyData = await api.get("/memory/company");
      const entitiesData = await api.get("/memory/entities");
      const timelineData = await api.get("/memory/timeline");
      const graphData = await api.get("/memory/graph");

      setCompany(companyData || null);
      setEntities(entitiesData || []);
      setTimeline(timelineData || []);
      setGraph(graphData || { nodes: [], edges: [] });
    } catch (e) {
      console.error(e);
      toast.error("Failed to load business memory stores from backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMemoryData();
  }, [loadMemoryData]);

  // Vector DB Search
  const handleVectorSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const results = await api.post("/memory/search", { query: searchQuery });
      setSearchResults(results);
      toast.success(`Found ${results.length} semantic matches`);
    } catch (err) {
      console.error(err);
      toast.error("Vector search failed.");
    } finally {
      setSearching(false);
    }
  };

  // Context Builder
  const handleContextQuery = async (e) => {
    e.preventDefault();
    if (!contextQuery.trim()) return;

    try {
      setContextLoading(true);
      const response = await api.post("/memory/context", {
        query: contextQuery,
      });
      setCompiledContext(response.context);
      toast.success("Compiled final context prompt snippet!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to compile context prompt.");
    } finally {
      setContextLoading(false);
    }
  };

  // Ingest Document
  const handleIngest = async (e) => {
    e.preventDefault();
    if (!ingestTitle.trim() || !ingestContent.trim()) {
      toast.error("Please provide both title and content to ingest");
      return;
    }

    try {
      setIngestLoading(true);
      const res = await api.post("/memory/ingest", {
        title: ingestTitle,
        content: ingestContent,
        category: ingestCategory,
      });

      if (res.success) {
        toast.success(
          "Document ingested and memory pipeline run successfully!",
        );
        setIngestTitle("");
        setIngestContent("");
        // Reload all data
        await loadMemoryData();
      } else {
        toast.error(`Ingest pipeline failed: ${res.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Pipeline execution failed.");
    } finally {
      setIngestLoading(false);
    }
  };

  // Reset Memory
  const handleReset = async () => {
    if (
      !confirm(
        "Are you sure you want to delete all stored business memory databases?",
      )
    )
      return;

    try {
      setResetLoading(true);
      await api.post("/memory/reset", {});
      toast.success("Simulated databases reset successfully.");
      await loadMemoryData();
      setSearchResults([]);
      setCompiledContext("");
    } catch (err) {
      console.error(err);
      toast.error("Reset failed.");
    } finally {
      setResetLoading(false);
    }
  };

  const tabs = [
    { id: "mongodb", label: "MongoDB Atlas Facts", icon: Database },
    { id: "neo4j", label: "Knowledge Graph", icon: GitBranch },
    { id: "timeline", label: "Timeline Events", icon: Clock },
    { id: "sandbox", label: "Context Builder Sandbox", icon: Brain },
    { id: "pipeline", label: "Ingest Context", icon: PlusCircle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Business Memory Engine
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visual inspection and query center for the founder's long-term
            multi-system memory model.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMemoryData}
            disabled={loading}
            className="border-border hover:bg-secondary font-medium"
          >
            <RefreshCw
              className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleReset}
            disabled={resetLoading}
            className="font-medium"
          >
            <Trash2 className="size-4 mr-2" />
            Reset Stores
          </Button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-card border border-border/80 max-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-3">
          <div className="relative size-12 flex items-center justify-center">
            <Brain className="size-8 text-primary animate-pulse" />
            <div className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Syncing memory systems...
          </p>
        </div>
      ) : (
        <div className="transition-all duration-300">
          {/* Tab 1: MongoDB Facts */}
          {activeTab === "mongodb" && (
            <div className="space-y-6">
              {/* Company Details */}
              <Card className="bg-card/60 backdrop-blur-md border-border">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <Database className="size-5 text-pink-500" />
                    <CardTitle className="text-lg font-bold">
                      Company Overview (MongoDB Atlas Facts)
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Primary company stats and entities verified by AI teammate.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {company ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="bg-secondary/40 border border-border/40 p-4 rounded-xl">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          Company Name
                        </p>
                        <p className="text-xl font-extrabold text-foreground mt-1">
                          {company.name}
                        </p>
                      </div>
                      <div className="bg-secondary/40 border border-border/40 p-4 rounded-xl">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          Product Concept
                        </p>
                        <p className="text-sm font-semibold text-foreground mt-1 line-clamp-2">
                          {company.product}
                        </p>
                      </div>
                      <div className="bg-secondary/40 border border-border/40 p-4 rounded-xl">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          Startup Stage
                        </p>
                        <p className="text-xl font-extrabold text-foreground mt-1 capitalize">
                          {company.stage}
                        </p>
                      </div>
                      <div className="bg-secondary/40 border border-border/40 p-4 rounded-xl">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          Team Size
                        </p>
                        <p className="text-xl font-extrabold text-foreground mt-1">
                          {company.teamSize || "1"} Members
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-6 text-muted-foreground italic text-sm">
                      No company profile created yet. Complete the onboarding
                      flow to build your company memory.
                    </div>
                  )}

                  {company && (
                    <div className="grid gap-6 md:grid-cols-3 mt-6">
                      <div className="border border-border/40 p-5 rounded-xl bg-card">
                        <h4 className="text-sm font-bold text-foreground mb-3">
                          Top Goals & Priorities
                        </h4>
                        <div className="space-y-2">
                          {company.goals?.map((g, i) => (
                            <div
                              key={`goal_${g}`}
                              className="flex gap-2 items-start text-xs text-muted-foreground"
                            >
                              <span className="text-primary font-bold">
                                {i + 1}.
                              </span>
                              <span>{g}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="border border-border/40 p-5 rounded-xl bg-card">
                        <h4 className="text-sm font-bold text-foreground mb-3">
                          Primary Bottlenecks
                        </h4>
                        <div className="space-y-2">
                          {company.bottlenecks?.map((b, _i) => (
                            <div
                              key={`bottleneck_${b}`}
                              className="flex gap-2 items-start text-xs text-red-500"
                            >
                              <span className="font-bold">•</span>
                              <span>{b}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="border border-border/40 p-5 rounded-xl bg-card">
                        <h4 className="text-sm font-bold text-foreground mb-3">
                          Daily Tool Stack
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {company.tools?.map((tool, _i) => (
                            <span
                              key={`tool_${tool}`}
                              className="px-2.5 py-1 bg-secondary text-foreground text-xs font-semibold rounded-md border border-border/30"
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Entities List */}
              <Card className="bg-card/60 backdrop-blur-md border-border">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-lg font-bold">
                    Extracted Entities (MongoDB Atlas)
                  </CardTitle>
                  <CardDescription>
                    A dictionary of structured entities extracted from notes and
                    logs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {entities.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {entities.map((ent, _idx) => (
                        <div
                          key={`entity_${ent.type}_${ent.name}`}
                          className="border border-border/50 rounded-xl p-4 bg-secondary/20 flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">
                                {ent.type}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                Confidence: {(ent.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-foreground">
                              {ent.name}
                            </h4>
                            <div className="text-[11px] text-muted-foreground space-y-1 mt-1">
                              {Object.entries(ent.data).map(([k, v]) => (
                                <div
                                  key={k}
                                  className="flex justify-between border-b border-border/5 py-0.5"
                                >
                                  <span className="font-medium text-muted-foreground/80">
                                    {k}:
                                  </span>
                                  <span className="text-foreground truncate max-w-[150px]">
                                    {String(v)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/20 text-[9px] text-muted-foreground">
                            <span>Source: {ent.source}</span>
                            <span className="flex items-center text-emerald-500 font-bold gap-0.5">
                              <Check className="size-3" />
                              Verified
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8 text-muted-foreground italic text-sm">
                      No entities extracted yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tab 2: Neo4j Graph */}
          {activeTab === "neo4j" && (
            <div className="space-y-6">
              <div className="border border-border/50 rounded-xl p-6 bg-card/60 backdrop-blur-md">
                <h3 className="text-lg font-bold text-foreground">
                  Neo4j Relationships
                </h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Visual relationship connections (Moat). Graph shows how
                  entities, tools, and founders relate. Click nodes to view
                  data.
                </p>
                {graph.nodes && graph.nodes.length > 0 ? (
                  <ForceGraph graphData={graph} />
                ) : (
                  <div className="h-[450px] flex flex-col items-center justify-center text-center text-muted-foreground italic text-sm">
                    <GitBranch className="size-12 mb-2 stroke-1 text-muted-foreground/30" />
                    No relationships found. Run onboarding to generate graph
                    node structures.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Timeline */}
          {activeTab === "timeline" && (
            <div className="space-y-6">
              <Card className="bg-card/60 backdrop-blur-md border-border">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <Clock className="size-5 text-amber-500" />
                    <CardTitle className="text-lg font-bold">
                      Startup Timeline
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Chronological milestones and history of startup events.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {timeline.length > 0 ? (
                    <div className="relative border-l border-border/80 pl-6 ml-4 space-y-8">
                      {timeline.map((ev, idx) => (
                        <div
                          key={`timeline_${ev.date}_${idx}`}
                          className="relative"
                        >
                          {/* Dot marker */}
                          <div className="absolute -left-[31px] top-1.5 size-4 rounded-full border-4 border-card bg-amber-500 shadow-sm" />
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">
                                {ev.date}
                              </span>
                              <h4 className="font-extrabold text-sm text-foreground">
                                {ev.title}
                              </h4>
                            </div>
                            <p className="text-xs text-muted-foreground max-w-2xl">
                              {ev.description}
                            </p>
                            <div className="flex gap-2 text-[10px] text-muted-foreground/80 mt-2">
                              <span>Source: {ev.source}</span>
                              <span>•</span>
                              <span>
                                Confidence: {(ev.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8 text-muted-foreground italic text-sm">
                      No timeline events logged yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tab 4: Sandbox (Context Builder & Qdrant) */}
          {activeTab === "sandbox" && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Context Builder panel */}
              <Card className="bg-card/60 backdrop-blur-md border-border">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <Brain className="size-5 text-indigo-500" />
                    <CardTitle className="text-lg font-bold">
                      Context Builder Sandbox
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Query the Context Builder. It fetches coordinates across all
                    databases to build a consolidated LLM prompt snippet.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <form onSubmit={handleContextQuery} className="flex gap-2">
                    <Input
                      placeholder="e.g., Should we hire another backend engineer? or What tools do we use?"
                      value={contextQuery}
                      onChange={(e) => setContextQuery(e.target.value)}
                      className="bg-secondary/40 border-border text-xs"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={contextLoading}
                      className="font-semibold text-xs px-4"
                    >
                      {contextLoading ? (
                        <RefreshCw className="size-4 animate-spin" />
                      ) : (
                        "Build Context"
                      )}
                    </Button>
                  </form>

                  {compiledContext && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-foreground">
                        Compiled Context (Ready for Prompt Injection):
                      </p>
                      <pre className="p-4 bg-secondary/50 rounded-lg text-[10px] font-mono text-muted-foreground overflow-x-auto max-h-[300px] border border-border/40 leading-relaxed whitespace-pre-wrap">
                        {compiledContext}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Vector Search Panel */}
              <Card className="bg-card/60 backdrop-blur-md border-border">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <Search className="size-5 text-cyan-500" />
                    <CardTitle className="text-lg font-bold">
                      Qdrant Vector Database Search
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Perform hybrid TF-IDF cosine-similarity queries on
                    unstructured transcripts, decks, and onboarding notes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <form onSubmit={handleVectorSearch} className="flex gap-2">
                    <Input
                      placeholder="Search unstructured memory transcripts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-secondary/40 border-border text-xs"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={searching}
                      className="font-semibold text-xs px-4"
                    >
                      {searching ? (
                        <RefreshCw className="size-4 animate-spin" />
                      ) : (
                        "Query Vector DB"
                      )}
                    </Button>
                  </form>

                  {searchResults.length > 0 ? (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                      {searchResults.map((doc, _idx) => (
                        <div
                          key={`search_${doc.id}`}
                          className="border border-border/40 p-3 rounded-lg bg-secondary/20 space-y-1"
                        >
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span className="font-bold uppercase text-primary">
                              {doc.category}
                            </span>
                            <span>
                              Score: {(doc.score * 100).toFixed(1)}% Match
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-foreground">
                            {doc.title}
                          </h4>
                          <p className="text-[11px] text-muted-foreground line-clamp-3 bg-card/40 p-2 rounded border border-border/10">
                            "{doc.content}"
                          </p>
                          <p className="text-[9px] text-muted-foreground text-right italic pt-1">
                            Indexed:{" "}
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8 text-muted-foreground italic text-xs border border-dashed border-border/40 rounded-lg">
                      Search results will appear here. Try querying
                      "competitors", "marketing", or "engineering".
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tab 5: Ingest Note */}
          {activeTab === "pipeline" && (
            <Card className="bg-card/60 backdrop-blur-md border-border max-w-2xl mx-auto">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <PlusCircle className="size-5 text-emerald-500" />
                  <CardTitle className="text-lg font-bold">
                    Ingest Context (Memory Extraction Pipeline)
                  </CardTitle>
                </div>
                <CardDescription>
                  Paste new emails, meeting transcripts, or voice note text. The
                  pipeline parses entities, relationships, events, and indexes
                  them.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleIngest} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="ingest-title"
                        className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1"
                      >
                        Context Title
                      </label>
                      <Input
                        id="ingest-title"
                        placeholder="e.g., Sequoia Advisory Meeting or Hiring Sync"
                        value={ingestTitle}
                        onChange={(e) => setIngestTitle(e.target.value)}
                        className="bg-secondary/40 border-border text-xs"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="ingest-category"
                        className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1"
                      >
                        Category
                      </label>
                      <select
                        id="ingest-category"
                        value={ingestCategory}
                        onChange={(e) => setIngestCategory(e.target.value)}
                        className="w-full h-9 rounded-md border border-border bg-secondary/40 px-3 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="meeting">Meeting Transcript</option>
                        <option value="note">Memo / Note</option>
                        <option value="pitch">Pitch / Deck Info</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="ingest-content"
                      className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1"
                    >
                      Content Body
                    </label>
                    <Textarea
                      id="ingest-content"
                      placeholder="Paste details here (e.g. 'We need to hire a React engineer. Raj from Sequoia introduced us to a design agency. We are delaying launch by two weeks.')"
                      value={ingestContent}
                      onChange={(e) => setIngestContent(e.target.value)}
                      rows={5}
                      className="bg-secondary/40 border-border text-xs leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="submit"
                      disabled={ingestLoading}
                      size="sm"
                      className="font-semibold text-xs px-6"
                    >
                      {ingestLoading ? (
                        <>
                          <RefreshCw className="size-4 mr-2 animate-spin" />
                          Extracting Facts...
                        </>
                      ) : (
                        <>
                          <Send className="size-4 mr-2" />
                          Process & Store Memory
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
