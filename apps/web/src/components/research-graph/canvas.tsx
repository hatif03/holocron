"use client";

import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
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
import { Save, Plus, FileText } from "lucide-react";
import { nodeTypes } from "./nodes";
import { GraphSidebar, AddNodeMenu } from "./sidebar";
import { Button, Dialog, Input, Switch } from "@/components/ui";

interface CanvasEditorProps {
  workId: string;
  initialWork: { title: string; description: string };
  initialGraph: { nodes: Node[]; edges: Edge[] };
}

function CanvasEditor({ workId, initialWork, initialGraph }: CanvasEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);
  const [sidebarTab, setSidebarTab] = useState("Nodes");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<GeneratePaperConfig>({
    styleGuide: "Nature",
    targetPages: 10,
    enablePlanning: true,
    enableReviewLoop: true,
    maxReviewIterations: 3,
    pauseForFeedback: false,
  });
  const nodeCount = useRef(initialGraph.nodes.length);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge({ ...connection, id: uuidv4() }, eds)
      ),
    [setEdges]
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
    setNodes((nds) => [...nds, newNode]);
  };

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
    await fetch(`/api/works/${workId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: initialWork.title,
        description: initialWork.description,
        graph,
      }),
    });
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
        title: initialWork.title,
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

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h1 className="font-serif text-xl font-bold">{initialWork.title}</h1>
          <p className="text-sm text-muted-foreground">{initialWork.description}</p>
        </div>
        <Button onClick={save} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        <GraphSidebar
          nodes={nodes}
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          workTitle={initialWork.title}
          workDescription={initialWork.description}
        />

        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            className="bg-muted/30"
          >
            <Background gap={16} size={1} />
            <Controls />
            <MiniMap />
          </ReactFlow>

          <AddNodeMenu
            open={addMenuOpen}
            onClose={() => setAddMenuOpen(false)}
            onAdd={addNode}
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 shadow-lg">
            <Button size="sm" variant="outline" onClick={() => setAddMenuOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" />
              Add Node
            </Button>
            <Button size="sm" onClick={() => setGenModalOpen(true)} className="gap-1">
              <FileText className="h-4 w-4" />
              Generate Paper
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={genModalOpen} onClose={() => setGenModalOpen(false)} title="Generate Paper from Canvas">
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
            <p className="text-xs text-muted-foreground mt-1">Target journal / conference format.</p>
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
          <Switch
            label="Enable Planning"
            description="AI plans paper structure before writing."
            checked={config.enablePlanning}
            onChange={(v) => setConfig({ ...config, enablePlanning: v })}
          />
          <Switch
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
          </div>
          <Switch
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
      </Dialog>
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
