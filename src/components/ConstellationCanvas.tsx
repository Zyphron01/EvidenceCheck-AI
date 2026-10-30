"use client";

import React, { useEffect, useRef } from "react";

interface Node3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  color: string;
  glow: number;
}

export function ConstellationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse coordinates with damping
    const mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    // Initialize 3D constellation nodes
    const nodeCount = width < 768 ? 45 : 90;
    const nodes: Node3D[] = [];
    const colors = ["#23C9C5", "#38BDF8", "#818CF8", "#34D399"];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: (Math.random() - 0.5) * width * 1.5,
        y: (Math.random() - 0.5) * height * 1.5,
        z: Math.random() * 800 + 100,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        vz: (Math.random() - 0.5) * 0.2,
        radius: Math.random() * 1.6 + 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        glow: Math.random() * 0.5 + 0.5,
      });
    }

    const fov = 400;

    const render = () => {
      // Damped camera motion based on mouse parallax
      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;

      const offsetX = (mouse.x - width / 2) * 0.15;
      const offsetY = (mouse.y - height / 2) * 0.15;

      ctx.clearRect(0, 0, width, height);

      // Project 3D nodes to 2D screen coordinates
      const projectedNodes: Array<{ sx: number; sy: number; scale: number; node: Node3D }> = [];

      for (const node of nodes) {
        if (!prefersReducedMotion) {
          node.x += node.vx;
          node.y += node.vy;
          node.z += node.vz;

          // Boundary bounce / wrap
          if (node.x < -width) node.x = width;
          if (node.x > width) node.x = -width;
          if (node.y < -height) node.y = height;
          if (node.y > height) node.y = -height;
          if (node.z < 100) node.z = 900;
          if (node.z > 900) node.z = 100;
        }

        const scale = fov / (fov + node.z);
        const sx = width / 2 + (node.x - offsetX) * scale;
        const sy = height / 2 + (node.y - offsetY) * scale;

        if (sx >= -50 && sx <= width + 50 && sy >= -50 && sy <= height + 50) {
          projectedNodes.push({ sx, sy, scale, node });
        }
      }

      // Draw constellation filaments between proximate nodes
      const maxDistance = 140;
      ctx.lineWidth = 0.75;

      for (let i = 0; i < projectedNodes.length; i++) {
        const p1 = projectedNodes[i];
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const p2 = projectedNodes[j];
          const dx = p1.sx - p2.sx;
          const dy = p1.sy - p2.sy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.22 * Math.min(p1.scale, p2.scale);
            ctx.strokeStyle = `rgba(35, 201, 197, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.sx, p1.sy);
            ctx.lineTo(p2.sx, p2.sy);
            ctx.stroke();
          }
        }
      }

      // Draw celestial nodes
      for (const p of projectedNodes) {
        const size = p.node.radius * p.scale * 1.8;
        ctx.fillStyle = p.node.color;
        ctx.globalAlpha = Math.min(1, p.scale * p.node.glow * 1.2);

        // Core dot
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, Math.max(0.6, size), 0, Math.PI * 2);
        ctx.fill();

        // Subtle bloom for near nodes
        if (p.scale > 0.6) {
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, size * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(35, 201, 197, 0.08)";
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ pointerEvents: "none" }}
      className="pointer-events-none fixed inset-0 z-0 opacity-40 transition-opacity duration-1000"
      aria-hidden="true"
    />
  );
}

