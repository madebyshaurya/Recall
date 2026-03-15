"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Memory } from "@/lib/types";

const SOURCE_COLORS: Record<string, string> = {
  screen: "#3b82f6",
  slack: "#a855f7",
  notion: "#10b981",
  claude_code: "#f97316",
  cursor: "#eab308",
  mcp_log: "#6b7280",
  docs: "#14b8a6",
};

interface Node {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  content: string;
  source: string;
  radius: number;
}

interface Edge {
  from: number;
  to: number;
  strength: number;
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen).trimEnd() + "...";
}

export function MemoryGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const animRef = useRef<number>(0);
  const hoveredRef = useRef<number>(-1);
  const mouseRef = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);

  const { data: memories = [] } = useQuery<Memory[]>({
    queryKey: ["memories-graph"],
    queryFn: async () => {
      const { data } = await supabase
        .from("memories")
        .select("id, source, content, metadata, source_url, captured_at, session_id, is_duplicate")
        .eq("is_duplicate", false)
        .order("captured_at", { ascending: false })
        .limit(50);
      return (data || []) as Memory[];
    },
  });

  // Initialize nodes from memories
  useEffect(() => {
    if (!memories.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    const nodes: Node[] = memories.map((m) => ({
      id: m.id,
      x: Math.random() * (w - 80) + 40,
      y: Math.random() * (h - 80) + 40,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      color: SOURCE_COLORS[m.source] || "#6b7280",
      content: m.content,
      source: m.source,
      radius: 5 + Math.min(m.content.length / 80, 4),
    }));

    // Build edges based on temporal proximity and same-source affinity
    const edges: Edge[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const mi = memories[i];
        const mj = memories[j];
        const timeDiff = Math.abs(
          new Date(mi.captured_at).getTime() - new Date(mj.captured_at).getTime()
        );
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        // Connect if close in time (within 2 hours) or same source within 12 hours
        let strength = 0;
        if (hoursDiff < 2) {
          strength = 1 - hoursDiff / 2;
        }
        if (mi.source === mj.source && hoursDiff < 12) {
          strength = Math.max(strength, 0.5 * (1 - hoursDiff / 12));
        }

        if (strength > 0.15) {
          edges.push({ from: i, to: j, strength });
        }
      }
    }

    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [memories]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    timeRef.current += 0.01;
    const t = timeRef.current;

    ctx.clearRect(0, 0, w, h);

    // Update positions with gentle floating
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      node.x += node.vx + Math.sin(t + i * 0.7) * 0.15;
      node.y += node.vy + Math.cos(t + i * 0.5) * 0.15;

      // Bounce off walls
      if (node.x < node.radius + 10 || node.x > w - node.radius - 10) {
        node.vx *= -0.8;
        node.x = Math.max(node.radius + 10, Math.min(w - node.radius - 10, node.x));
      }
      if (node.y < node.radius + 10 || node.y > h - node.radius - 10) {
        node.vy *= -0.8;
        node.y = Math.max(node.radius + 10, Math.min(h - node.radius - 10, node.y));
      }

      // Mild repulsion between nodes
      for (let j = i + 1; j < nodes.length; j++) {
        const other = nodes[j];
        const dx = other.x - node.x;
        const dy = other.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 60 && dist > 0) {
          const force = (60 - dist) * 0.003;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          node.vx -= fx;
          node.vy -= fy;
          other.vx += fx;
          other.vy += fy;
        }
      }

      // Damping
      node.vx *= 0.99;
      node.vy *= 0.99;
    }

    // Attraction along edges
    for (const edge of edges) {
      const a = nodes[edge.from];
      const b = nodes[edge.to];
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const targetDist = 100 + (1 - edge.strength) * 120;
      if (dist > targetDist && dist > 0) {
        const force = (dist - targetDist) * 0.0005 * edge.strength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    // Draw edges
    for (const edge of edges) {
      const a = nodes[edge.from];
      const b = nodes[edge.to];
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(255,255,255,${edge.strength * 0.08})`;
      ctx.lineWidth = edge.strength * 1.5;
      ctx.stroke();
    }

    // Detect hover
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;
    let newHovered = -1;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const dx = mx - node.x;
      const dy = my - node.y;
      if (dx * dx + dy * dy < (node.radius + 6) * (node.radius + 6)) {
        newHovered = i;
        break;
      }
    }
    hoveredRef.current = newHovered;

    // Draw nodes
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const isHovered = i === hoveredRef.current;

      // Glow
      if (isHovered) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
        const glow = ctx.createRadialGradient(
          node.x, node.y, node.radius,
          node.x, node.y, node.radius + 8
        );
        glow.addColorStop(0, node.color + "40");
        glow.addColorStop(1, node.color + "00");
        ctx.fillStyle = glow;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, isHovered ? node.radius + 2 : node.radius, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? node.color : node.color + "cc";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(node.x, node.y, isHovered ? node.radius + 2 : node.radius, 0, Math.PI * 2);
      ctx.strokeStyle = node.color;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw tooltip
    if (newHovered >= 0) {
      const node = nodes[newHovered];
      const text = truncateText(node.content, 80);
      const label = node.source;
      const padding = 8;

      ctx.font = "11px ui-monospace, monospace";
      const textWidth = Math.max(
        ctx.measureText(text).width,
        ctx.measureText(label).width
      );
      const boxW = textWidth + padding * 2;
      const boxH = 36;
      let tx = node.x - boxW / 2;
      let ty = node.y - node.radius - boxH - 8;
      if (tx < 4) tx = 4;
      if (tx + boxW > w - 4) tx = w - boxW - 4;
      if (ty < 4) ty = node.y + node.radius + 8;

      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.beginPath();
      ctx.roundRect(tx, ty, boxW, boxH, 6);
      ctx.fill();

      ctx.strokeStyle = node.color + "60";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tx, ty, boxW, boxH, 6);
      ctx.stroke();

      ctx.fillStyle = node.color;
      ctx.font = "bold 10px ui-monospace, monospace";
      ctx.fillText(label, tx + padding, ty + 14);

      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "11px ui-monospace, monospace";
      ctx.fillText(text, tx + padding, ty + 28);
    }

    animRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    canvas.addEventListener("mousemove", handleMouseMove);

    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animRef.current);
    };
  }, [animate]);

  return (
    <div className="relative w-full h-[220px]">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />
      {memories.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] themed-text-muted">
            No memories to visualize
          </span>
        </div>
      )}
    </div>
  );
}
