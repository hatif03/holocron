"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import {
  getDefaultNodeData,
  getNodeTypeLabel,
  type NodeType,
  type GeneratePaperConfig,
} from "@holocron/shared";
import { Save } from "lucide-react";
import { BackLink } from "@/components/layout/back-link";
import { WorkActionsMenu } from "./WorkActionsMenu";
import { nodeTypes } from "./nodes";
import { GraphSidebar, AddNodeMenu } from "./sidebar";
import { NodeInspector } from "./inspector";
import { CanvasToolbar } from "./toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleDialog } from "@/components/ui/simple-dialog";
import { LabeledSwitch } from "@/components/ui/labeled-switch";
import {
  useCanvasStore,
  registerUpdateNodeData,
} from "@/lib/canvas-store";
import { spreadNodes, nodesOverlap } from "@/lib/graph-layout";
import { pushMemoryTrace } from "@/lib/memory-trace";

interface CanvasEditorProps {
  workId: string;
  initialWork: { title: string; description: string; isTemplate?: boolean };
  initialGraph: { nodes: Node[]; edges: Edge[] };
}

function CanvasEditor({ workId, initialWork, initialGraph }: CanvasEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);
  const [workTitle, setWorkTitle] = useState(initialWork.title);
  const [workDescription, setWorkDescription] = useState(initialWork.description);
  const [sidebarTab, setSidebarTab] = useState("Nodes");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [canvasTool, setCanvasTool] = useState<"select" | "pan">("select");
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<GeneratePaperConfig>({
    styleGuide: "Nature",
    targetPages: 10,
    enablePlanning: true,
    enableReviewLoop: true,
    maxReviewIterations: 3,
    pauseForFeedback: false,
    compilePdf: true,
  });

  const {
    selectedNodeId,
    setSelectedNodeId,
    setWorkId,
    genModalOpen,
    setGenModalOpen,
    nodesLocked,
    pushHistory,
    setLastSavedAt,
  } = useCanvasStore();

  const { fitView, getZoom, zoomIn, zoomOut } = useReactFlow();
  const nodeCount = useRef(initialGraph.nodes.length);
  const historyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    setWorkId(workId);
    if (!initialized.current) {
      pushHistory({ nodes: initialGraph.nodes, edges: initialGraph.edges });
      initialized.current = true;
      if (nodesOverlap(initialGraph.nodes)) {
        const spread = spreadNodes(initialGraph.nodes, initialGraph.edges);
        setNodes(spread);
        pushHistory({ nodes: spread, edges: initialGraph.edges });
        setTimeout(() => fitView({ duration: 300, padding: 0.3 }), 100);
      }
    }
  }, [workId, setWorkId, pushHistory, initialGraph.nodes, initialGraph.edges, setNodes, fitView]);

  const scheduleHistory = useCallback(
    (nds: Node[], eds: Edge[]) => {
      if (historyTimer.current) clearTimeout(historyTimer.current);
      historyTimer.current = setTimeout(() => {
        pushHistory({ nodes: nds, edges: eds });
      }, 500);
    },
    [pushHistory]
  );

  const updateNodeDataFn = useCallback(
    (nodeId: string, patch: Record<string, unknown>) => {
      setNodes((nds) => {
        const next = nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n
        );
        scheduleHistory(next, edges);
        return next;
      });
    },
    [setNodes, edges, scheduleHistory]
  );

  useEffect(() => {
    registerUpdateNodeData(updateNodeDataFn);
  }, [updateNodeDataFn]);

  useEffect(() => {
    setZoom(Math.round(getZoom() * 100));
  }, [getZoom]);

  useEffect(() => {
    if (!addMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAddMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addMenuOpen]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const next = addEdge(
          {
            ...connection,
            id: uuidv4(),
            type: "smoothstep",
            style: { stroke: "#3b82f6", strokeWidth: 2 },
          },
          eds
        );
        pushHistory({ nodes, edges: next });
        return next;
      });
    },
    [setEdges, nodes, pushHistory]
  );

  const addNode = (type: NodeType) => {
    nodeCount.current += 1;
    const id = `${type}_${nodeCount.current}`;
    const newNode: Node = {
      id,
      type: "research",
      position: { x: 250 + Math.random() * 200, y: 150 + Math.random() * 200 },
      data: {
        label: `${getNodeTypeLabel(type)}_${nodeCount.current}`,
        nodeType: type,
        ...getDefaultNodeData(type),
      },
    };
    setNodes((nds) => {
      const next = [...nds, newNode];
      pushHistory({ nodes: next, edges });
      return next;
    });
  };

  const selectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    fitView({ nodes: [{ id: nodeId }], duration: 300, padding: 0.5 });
  };

  const handleSpreadNodes = useCallback(() => {
    setNodes((nds) => {
      const spread = spreadNodes(nds, edges);
      pushHistory({ nodes: spread, edges });
      return spread;
    });
    setTimeout(() => fitView({ duration: 300, padding: 0.3 }), 150);
  }, [edges, setNodes, pushHistory, fitView]);

  const save = async () => {
    setSaving(true);
    const graph = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.data.nodeType,
        label: n.data.label,
        position: n.position,
        data: n.data,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    };
    const res = await fetch(`/api/works/${workId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: workTitle,
        description: workDescription,
        graph,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.memoryTrace) pushMemoryTrace(data.memoryTrace);
    setLastSavedAt(new Date().toISOString());
    setSaving(false);
  };

  const generatePaper = async () => {
    await save();
    const graph = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.data.nodeType,
        label: n.data.label,
        data: n.data,
      })),
      edges: edges.map((e) => ({ source: e.source, target: e.target })),
    };
    const res = await fetch("/api/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workId,
        title: workTitle,
        config,
        graph,
      }),
    });
    const data = await res.json();
    setGenModalOpen(false);
    if (data.id) {
      window.location.href = `/paper-generation/${data.id}`;
    }
  };

  const onRestoreSnapshot = (snapshot: { nodes: Node[]; edges: Edge[] }) => {
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
  };

  const wrappedOnNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);
      if (changes.some((c) => c.type === "position" && c.dragging === false)) {
        scheduleHistory(nodes, edges);
      }
    },
    [onNodesChange, scheduleHistory, nodes, edges]
  );

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3 gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <BackLink href="/research-graph" label="Research Graph" className="mt-1" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Input
                value={workTitle}
                onChange={(e) => setWorkTitle(e.target.value)}
                className="font-serif text-xl font-bold border-0 shadow-none px-0 h-auto focus-visible:ring-0 max-w-md"
              />
              {initialWork.isTemplate && <Badge variant="template">TEMPLATE</Badge>}
            </div>
            <Input
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="Add a description..."
              className="text-sm text-muted-foreground border-0 shadow-none px-0 h-auto focus-visible:ring-0 mt-0.5"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <WorkActionsMenu
            workId={workId}
            title={workTitle}
            description={workDescription}
            onTitleChange={setWorkTitle}
            onDescriptionChange={setWorkDescription}
          />
          <Button onClick={save} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <GraphSidebar
          workId={workId}
          nodes={nodes}
          edges={edges}
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          workTitle={workTitle}
          workDescription={workDescription}
          isTemplate={initialWork.isTemplate}
          selectedNodeId={selectedNodeId}
          onSelectNode={selectNode}
        />

        <div className="flex-1 relative flex flex-col min-w-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={wrappedOnNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            nodesDraggable={!nodesLocked}
            nodesConnectable={!nodesLocked}
            elementsSelectable={!nodesLocked}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => {
              setSelectedNodeId(null);
              setAddMenuOpen(false);
            }}
            onMove={() => setZoom(Math.round(getZoom() * 100))}
            panOnDrag={canvasTool === "pan" ? [0, 1, 2] : [1, 2]}
            selectionOnDrag={canvasTool === "select"}
            defaultEdgeOptions={{
              type: "smoothstep",
              animated: false,
              style: { stroke: "#3b82f6", strokeWidth: 2 },
            }}
            fitView
            className="bg-muted/30 flex-1"
          >
            <Background gap={16} size={1} color="var(--border)" />
            <MiniMap className="!bottom-16" />
          </ReactFlow>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-end justify-center pb-24 pointer-events-none">
              <p className="text-sm text-muted-foreground bg-card/80 px-4 py-2 rounded-lg border border-border">
                Welcome to the Research Canvas.
              </p>
            </div>
          )}

          <CanvasToolbar
            zoom={zoom}
            tool={canvasTool}
            onToolChange={setCanvasTool}
            onZoomIn={() => zoomIn({ duration: 200 })}
            onZoomOut={() => zoomOut({ duration: 200 })}
            onFitView={() => fitView({ duration: 300, padding: 0.3 })}
            onSpreadNodes={handleSpreadNodes}
            onAddNode={() => setAddMenuOpen((o) => !o)}
            onGenerate={() => {
              setAddMenuOpen(false);
              setGenModalOpen(true);
            }}
            onRestoreSnapshot={onRestoreSnapshot}
          />

          <AddNodeMenu
            open={addMenuOpen}
            onClose={() => setAddMenuOpen(false)}
            onAdd={addNode}
          />
        </div>

        {selectedNode && (
          <NodeInspector
            node={selectedNode}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>

      <SimpleDialog open={genModalOpen} onClose={() => setGenModalOpen(false)} title="Generate Paper from Canvas">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Style Guide</label>
            <select
              className="mt-1 w-full h-10 rounded-lg border border-border px-3 text-sm"
              value={config.styleGuide}
              onChange={(e) =>
                setConfig({ ...config, styleGuide: e.target.value as GeneratePaperConfig["styleGuide"] })
              }
            >
              <option value="Nature">Nature</option>
              <option value="IEEE">IEEE</option>
              <option value="ICML">ICML</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Target journal / conference format.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Target Pages</label>
            <Input
              type="number"
              value={config.targetPages}
              onChange={(e) =>
                setConfig({ ...config, targetPages: parseInt(e.target.value) || 10 })
              }
            />
          </div>
          <LabeledSwitch
            label="Enable Planning"
            description="AI plans paper structure before writing."
            checked={config.enablePlanning}
            onChange={(v) => setConfig({ ...config, enablePlanning: v })}
          />
          <LabeledSwitch
            label="Enable Review Loop"
            description="Multi-round style/logic/structure review."
            checked={config.enableReviewLoop}
            onChange={(v) => setConfig({ ...config, enableReviewLoop: v })}
          />
          <div>
            <label className="text-sm font-medium">Max Review Iterations</label>
            <Input
              type="number"
              value={config.maxReviewIterations}
              onChange={(e) =>
                setConfig({ ...config, maxReviewIterations: parseInt(e.target.value) || 3 })
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              Number of review rounds before finalizing.
            </p>
          </div>
          <LabeledSwitch
            label="Compile PDF"
            description="Run LaTeX compilation after generation."
            checked={config.compilePdf}
            onChange={(v) => setConfig({ ...config, compilePdf: v })}
          />
          <LabeledSwitch
            label="Pause for Feedback"
            description="Pause after review for your input."
            checked={config.pauseForFeedback}
            onChange={(v) => setConfig({ ...config, pauseForFeedback: v })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setGenModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={generatePaper}>Generate Paper</Button>
          </div>
        </div>
      </SimpleDialog>
    </div>
  );
}

export function ResearchCanvas(props: CanvasEditorProps) {
  return (
    <ReactFlowProvider>
      <CanvasEditor {...props} />
    </ReactFlowProvider>
  );
}
