import { useEffect, useRef, useState } from "react";
import { Compass, MapPin } from "lucide-react";
import type { Editor } from "tldraw";

interface MiniMapProps {
  editor?: Editor | null;
}

export function MiniMap({ editor }: MiniMapProps) {
  const [isOpen, setIsOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen || !editor || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderMiniMap = () => {
      if (!canvas || !ctx || !editor) return;

      const dpr = window.devicePixelRatio || 1;
      const width = 180;
      const height = 120;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      // Background
      ctx.fillStyle = "#1e221f";
      ctx.fillRect(0, 0, width, height);

      // Shapes bounding box
      const shapes = editor.getCurrentPageShapes();
      const pageBounds = editor.getViewportPageBounds();

      // Find collective bounds
      let minX = pageBounds.minX;
      let minY = pageBounds.minY;
      let maxX = pageBounds.maxX;
      let maxY = pageBounds.maxY;

      shapes.forEach((shape) => {
        const bounds = editor.getShapePageBounds(shape.id);
        if (bounds) {
          minX = Math.min(minX, bounds.minX);
          minY = Math.min(minY, bounds.minY);
          maxX = Math.max(maxX, bounds.maxX);
          maxY = Math.max(maxY, bounds.maxY);
        }
      });

      // Add padding
      const padding = 200;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;

      const totalW = Math.max(maxX - minX, 1000);
      const totalH = Math.max(maxY - minY, 800);

      const scale = Math.min(width / totalW, height / totalH);
      const offsetX = (width - totalW * scale) / 2;
      const offsetY = (height - totalH * scale) / 2;

      // Draw all shapes in radar
      ctx.fillStyle = "rgba(100, 140, 120, 0.7)";
      shapes.forEach((shape) => {
        const bounds = editor.getShapePageBounds(shape.id);
        if (bounds) {
          const rx = offsetX + (bounds.minX - minX) * scale;
          const ry = offsetY + (bounds.minY - minY) * scale;
          const rw = Math.max(bounds.w * scale, 2);
          const rh = Math.max(bounds.h * scale, 2);
          ctx.fillRect(rx, ry, rw, rh);
        }
      });

      // Draw current camera viewport
      const vx = offsetX + (pageBounds.minX - minX) * scale;
      const vy = offsetY + (pageBounds.minY - minY) * scale;
      const vw = pageBounds.w * scale;
      const vh = pageBounds.h * scale;

      ctx.strokeStyle = "#49655a";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(vx, vy, vw, vh);

      ctx.fillStyle = "rgba(73, 101, 90, 0.2)";
      ctx.fillRect(vx, vy, vw, vh);

      animationFrameRef.current = requestAnimationFrame(renderMiniMap);
    };

    renderMiniMap();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, editor]);

  const handleMiniMapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editor || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const shapes = editor.getCurrentPageShapes();
    const pageBounds = editor.getViewportPageBounds();

    let minX = pageBounds.minX;
    let minY = pageBounds.minY;
    let maxX = pageBounds.maxX;
    let maxY = pageBounds.maxY;

    shapes.forEach((shape) => {
      const bounds = editor.getShapePageBounds(shape.id);
      if (bounds) {
        minX = Math.min(minX, bounds.minX);
        minY = Math.min(minY, bounds.minY);
        maxX = Math.max(maxX, bounds.maxX);
        maxY = Math.max(maxY, bounds.maxY);
      }
    });

    const padding = 200;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const width = 180;
    const height = 120;
    const totalW = Math.max(maxX - minX, 1000);
    const totalH = Math.max(maxY - minY, 800);
    const scale = Math.min(width / totalW, height / totalH);
    const offsetX = (width - totalW * scale) / 2;
    const offsetY = (height - totalH * scale) / 2;

    const targetPageX = minX + (clickX - offsetX) / scale;
    const targetPageY = minY + (clickY - offsetY) / scale;

    editor.centerOnPoint(
      { x: targetPageX, y: targetPageY },
      { animation: { duration: 300 } },
    );
  };

  if (!isOpen) {
    return (
      <button
        aria-label="Open Canvas Mini-Map Radar"
        className="fixed bottom-14 right-4 z-30 hidden size-9 place-items-center rounded-lg border border-line bg-panel shadow-md transition-colors hover:bg-hover hover:text-ink sm:grid"
        onClick={() => setIsOpen(true)}
        title="Canvas Mini-Map"
        type="button"
      >
        <Compass className="size-4 text-muted" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-14 right-4 z-30 hidden overflow-hidden rounded-xl border border-line bg-panel p-2 shadow-xl backdrop-blur-md sm:block">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="flex items-center gap-1 text-[11px] font-medium text-muted">
          <MapPin className="size-3 text-accent" /> Mini-Map
        </span>
        <button
          aria-label="Minimize mini-map"
          className="grid size-4 place-items-center rounded text-muted hover:text-ink"
          onClick={() => setIsOpen(false)}
          type="button"
        >
          &times;
        </button>
      </div>
      <canvas
        className="cursor-crosshair rounded border border-line"
        height={120}
        onClick={handleMiniMapClick}
        ref={canvasRef}
        style={{ width: "180px", height: "120px" }}
        width={180}
      />
    </div>
  );
}
