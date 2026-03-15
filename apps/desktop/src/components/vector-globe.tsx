"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const SOURCE_COLORS: Record<string, string> = {
  screen: "#3b82f6",
  slack: "#a855f7",
  notion: "#10b981",
  claude_code: "#f97316",
  cursor: "#eab308",
  mcp_log: "#6b7280",
};

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
}

export function VectorGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const angleRef = useRef(0);

  const { data: sources } = useQuery({
    queryKey: ["source-counts-viz"],
    queryFn: async () => {
      const { data } = await supabase
        .from("memories")
        .select("source")
        .eq("is_duplicate", false)
        .limit(200);
      return data || [];
    },
  });

  useEffect(() => {
    if (!sources) return;

    // Create particles from actual memory sources
    const particles: Particle[] = sources.map((m) => {
      const color = SOURCE_COLORS[m.source] || "#6b7280";
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.6 + Math.random() * 0.4;

      return {
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        vx: (Math.random() - 0.5) * 0.002,
        vy: (Math.random() - 0.5) * 0.002,
        vz: (Math.random() - 0.5) * 0.002,
        color,
        size: 1.5 + Math.random() * 2,
      };
    });

    // Add some extra ambient particles
    for (let i = 0; i < 30; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.3 + Math.random() * 0.7;
      particles.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        vx: (Math.random() - 0.5) * 0.001,
        vy: (Math.random() - 0.5) * 0.001,
        vz: (Math.random() - 0.5) * 0.001,
        color: "rgba(255,255,255,0.15)",
        size: 0.5 + Math.random(),
      });
    }

    particlesRef.current = particles;
  }, [sources]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(w, h) * 0.4;

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      angleRef.current += 0.003;
      const angle = angleRef.current;

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Sort by z for depth
      const sorted = [...particlesRef.current].map((p) => {
        // Rotate around Y axis
        const rx = p.x * cosA - p.z * sinA;
        const rz = p.x * sinA + p.z * cosA;
        return { ...p, rx, ry: p.y, rz };
      });
      sorted.sort((a, b) => a.rz - b.rz);

      // Draw connections between nearby particles
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < Math.min(i + 8, sorted.length); j++) {
          const a = sorted[i];
          const b = sorted[j];
          const dx = a.rx - b.rx;
          const dy = a.ry - b.ry;
          const dz = a.rz - b.rz;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < 0.4) {
            const alpha = (1 - dist / 0.4) * 0.08;
            ctx!.beginPath();
            ctx!.moveTo(cx + a.rx * scale, cy + a.ry * scale);
            ctx!.lineTo(cx + b.rx * scale, cy + b.ry * scale);
            ctx!.strokeStyle = `rgba(255,255,255,${alpha})`;
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        }
      }

      // Draw particles
      for (const p of sorted) {
        const depth = (p.rz + 1) / 2; // 0 to 1
        const alpha = 0.3 + depth * 0.7;
        const sz = p.size * (0.5 + depth * 0.5);

        ctx!.beginPath();
        ctx!.arc(cx + p.rx * scale, cy + p.ry * scale, sz, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = alpha;
        ctx!.fill();
        ctx!.globalAlpha = 1;

        // Glow effect for larger particles
        if (p.size > 2) {
          ctx!.beginPath();
          ctx!.arc(cx + p.rx * scale, cy + p.ry * scale, sz * 3, 0, Math.PI * 2);
          const gradient = ctx!.createRadialGradient(
            cx + p.rx * scale, cy + p.ry * scale, 0,
            cx + p.rx * scale, cy + p.ry * scale, sz * 3
          );
          gradient.addColorStop(0, p.color.replace(")", ",0.15)").replace("rgb", "rgba"));
          gradient.addColorStop(1, "transparent");
          ctx!.fillStyle = gradient;
          ctx!.fill();
        }

        // Drift
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        // Keep within sphere
        const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
        if (dist > 1) {
          p.x /= dist;
          p.y /= dist;
          p.z /= dist;
          p.vx *= -0.5;
          p.vy *= -0.5;
          p.vz *= -0.5;
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [sources]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: "100%", height: "220px" }}
      />
      <div className="absolute bottom-2 left-3 flex items-center gap-3">
        {Object.entries(SOURCE_COLORS).map(([source, color]) => (
          <div key={source} className="flex items-center gap-1">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-[9px] text-neutral-600 capitalize">
              {source.replace("_", " ")}
            </span>
          </div>
        ))}
      </div>
      <div className="absolute top-2 right-3">
        <span className="text-[9px] text-neutral-700 font-mono">
          Vector Space
        </span>
      </div>
    </div>
  );
}
