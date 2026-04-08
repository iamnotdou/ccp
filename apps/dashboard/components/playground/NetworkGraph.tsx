"use client";

import { useRef, useEffect, useCallback } from "react";
import type { ProtocolState } from "@/lib/indexer/types";

interface Node {
  id: string;
  type: "agent" | "operator" | "auditor" | "certificate";
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Edge {
  source: string;
  target: string;
  type: "attestation" | "operates" | "transaction";
}

const NODE_COLORS: Record<Node["type"], string> = {
  agent: "#3b82f6",
  operator: "#8b5cf6",
  auditor: "#10b981",
  certificate: "#f59e0b",
};

const EDGE_COLORS: Record<Edge["type"], string> = {
  attestation: "#10b98180",
  operates: "#8b5cf680",
  transaction: "#3b82f680",
};

function buildGraph(state: ProtocolState): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const seen = new Set<string>();

  const addNode = (id: string, type: Node["type"], label: string) => {
    const key = `${type}:${id}`;
    if (seen.has(key)) return;
    seen.add(key);
    nodes.push({
      id: key,
      type,
      label,
      x: Math.random() * 600 + 100,
      y: Math.random() * 400 + 50,
      vx: 0,
      vy: 0,
    });
  };

  // Add certificates and their relationships
  for (const cert of state.certificates) {
    const certId = cert.certHash.slice(0, 10);
    addNode(certId, "certificate", `Cert ${certId}`);
    addNode(cert.agent, "agent", `${cert.agent.slice(0, 6)}...${cert.agent.slice(-4)}`);
    addNode(cert.operator, "operator", `${cert.operator.slice(0, 6)}...${cert.operator.slice(-4)}`);

    edges.push({ source: `operator:${cert.operator}`, target: `certificate:${certId}`, type: "operates" });
    edges.push({ source: `certificate:${certId}`, target: `agent:${cert.agent}`, type: "operates" });

    for (const auditor of cert.auditors) {
      addNode(auditor, "auditor", `${auditor.slice(0, 6)}...${auditor.slice(-4)}`);
      edges.push({ source: `auditor:${auditor}`, target: `certificate:${certId}`, type: "attestation" });
    }
  }

  // Add standalone agents from tx activity
  for (const agent of state.agents) {
    addNode(agent.address, "agent", `${agent.address.slice(0, 6)}...${agent.address.slice(-4)}`);
  }

  return { nodes, edges };
}

function drawNode(ctx: CanvasRenderingContext2D, node: Node, hovered: boolean) {
  const size = hovered ? 14 : 10;
  const color = NODE_COLORS[node.type];

  ctx.fillStyle = color;
  ctx.strokeStyle = hovered ? "#fff" : color;
  ctx.lineWidth = hovered ? 2 : 1;

  switch (node.type) {
    case "agent": // circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case "operator": // rounded square
      ctx.beginPath();
      ctx.roundRect(node.x - size, node.y - size, size * 2, size * 2, 3);
      ctx.fill();
      ctx.stroke();
      break;
    case "auditor": // hexagon
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = node.x + size * Math.cos(angle);
        const py = node.y + size * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case "certificate": // diamond
      ctx.beginPath();
      ctx.moveTo(node.x, node.y - size);
      ctx.lineTo(node.x + size, node.y);
      ctx.lineTo(node.x, node.y + size);
      ctx.lineTo(node.x - size, node.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
  }

  // Label
  if (hovered) {
    ctx.fillStyle = "#fff";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(node.label, node.x, node.y + size + 16);
  }
}

export function NetworkGraph({ state }: { state: ProtocolState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphRef = useRef<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const hoveredRef = useRef<string | null>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    graphRef.current = buildGraph(state);
  }, [state]);

  const simulate = useCallback(() => {
    const { nodes, edges } = graphRef.current;
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Force simulation step
    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = 800 / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Attraction along edges
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    for (const edge of edges) {
      const s = nodeMap.get(edge.source);
      const t = nodeMap.get(edge.target);
      if (!s || !t) continue;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = (dist - 120) * 0.005;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      s.vx += fx;
      s.vy += fy;
      t.vx -= fx;
      t.vy -= fy;
    }

    // Center gravity
    for (const node of nodes) {
      node.vx += (W / 2 - node.x) * 0.001;
      node.vy += (H / 2 - node.y) * 0.001;
    }

    // Apply velocity with damping
    for (const node of nodes) {
      node.vx *= 0.9;
      node.vy *= 0.9;
      node.x += node.vx;
      node.y += node.vy;
      node.x = Math.max(20, Math.min(W - 20, node.x));
      node.y = Math.max(20, Math.min(H - 20, node.y));
    }

    // Draw
    ctx.clearRect(0, 0, W, H);

    // Edges
    for (const edge of edges) {
      const s = nodeMap.get(edge.source);
      const t = nodeMap.get(edge.target);
      if (!s || !t) continue;
      ctx.strokeStyle = EDGE_COLORS[edge.type];
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
    }

    // Nodes
    for (const node of nodes) {
      drawNode(ctx, node, hoveredRef.current === node.id);
    }

    animRef.current = requestAnimationFrame(simulate);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animRef.current);
  }, [simulate]);

  // Handle hover
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let found: string | null = null;
    for (const node of graphRef.current.nodes) {
      const dx = node.x - mx;
      const dy = node.y - my;
      if (dx * dx + dy * dy < 256) {
        found = node.id;
        break;
      }
    }
    hoveredRef.current = found;
    canvas.style.cursor = found ? "pointer" : "default";
  }, []);

  return (
    <div className="rounded-lg border border-fd-border bg-fd-card overflow-hidden">
      <div className="px-4 py-3 border-b border-fd-border flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Protocol Network</div>
          <div className="text-xs text-fd-muted-foreground">Agents, operators, auditors, and certificates</div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Agents</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-violet-500" /> Operators</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500" style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }} /> Auditors</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-500" style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }} /> Certificates</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-[500px]"
        onMouseMove={handleMouseMove}
      />
    </div>
  );
}
