/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Item, Subject } from '../types';
import { getDaysUntilDue, calculateMastery } from '../utils/scheduler';

interface GalaxyCanvasProps {
  items: Item[];
  subjects: Subject[];
  onItemClick: (itemId: number) => void;
  simulatedDateStr: string;
}

export function GalaxyCanvas({
  items,
  subjects,
  onItemClick,
  simulatedDateStr,
}: GalaxyCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Runtime positions and speeds are stored in a ref to avoid React state re-render latency in the loop
  const runtimeRef = useRef<{
    [id: number]: {
      orbitAngle: number;
      orbitSpeed: number;
      currentOrbitRadius: number;
      x: number;
      y: number;
      radius: number;
    };
  }>({});

  const [hoveredItem, setHoveredItem] = useState<Item | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let animationId: number;
    let cx = container.clientWidth / 2;
    let cy = container.clientHeight / 2;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = container.clientHeight;

      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      cx = width / 2;
      cy = height / 2;
    };

    // Initial setup
    handleResize();

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // Render loop
    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      // Draw Horizon Orbit Limit Ring
      const TODAY_RADIUS = Math.min(cx, cy) * 0.65;
      ctx.beginPath();
      ctx.arc(cx, cy, TODAY_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Active items inside simulation
      const activeItems = items.filter((i) => !i.isArchived);

      activeItems.forEach((item) => {
        // Initialize runtime info for this item if not present
        if (!runtimeRef.current[item.id]) {
          runtimeRef.current[item.id] = {
            orbitAngle: item.orbitAngle || Math.random() * Math.PI * 2,
            orbitSpeed: item.orbitSpeed || (Math.random() * 0.001 + 0.0005) * (Math.random() > 0.5 ? 1 : -1),
            currentOrbitRadius: item.currentOrbitRadius || TODAY_RADIUS + 200,
            x: 0,
            y: 0,
            radius: Math.max(4, Math.min(10, item.duration / 6)),
          };
        }

        const rt = runtimeRef.current[item.id];
        const subject = subjects.find((s) => s.id === item.subjectId);
        const subjColor = subject ? subject.color : '#64748b';

        // Calculate Target Radius
        let targetRadius = TODAY_RADIUS;
        
        // Find if item is due today
        const daysDue = getDaysUntilDue(item, simulatedDateStr);
        const isScheduledToday = item.scheduledToday;
        const isPostponed = item.postponed;

        if (isScheduledToday) {
          // Inside orbit
          targetRadius = TODAY_RADIUS * 0.5 + (item.id % 5) * 15;
        } else if (isPostponed) {
          // Perimeter orbit
          targetRadius = TODAY_RADIUS + 22 + (item.id % 3) * 8;
        } else {
          // Outer orbits based on remaining days
          targetRadius = TODAY_RADIUS + 50 + Math.min(180, daysDue * 18);
        }

        // Smooth transition
        rt.currentOrbitRadius += (targetRadius - rt.currentOrbitRadius) * 0.03;
        rt.orbitAngle += rt.orbitSpeed;

        // Position coordinates
        rt.x = cx + Math.cos(rt.orbitAngle) * rt.currentOrbitRadius;
        rt.y = cy + Math.sin(rt.orbitAngle) * rt.currentOrbitRadius;

        const isHovered = hoveredItem?.id === item.id;
        let coreColor = isScheduledToday ? '#3b82f6' : subjColor;
        if (isPostponed) coreColor = '#f97316'; // orange

        // Draw orbital particle
        ctx.beginPath();
        ctx.arc(rt.x, rt.y, isHovered ? rt.radius * 1.5 : rt.radius, 0, Math.PI * 2);

        if (isHovered || isScheduledToday) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = coreColor;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = coreColor;
        ctx.fill();

        if (isHovered) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.shadowBlur = 0; // reset
      });

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, [items, subjects, simulatedDateStr, hoveredItem]);

  // Handle Mouse Hover / Move over particles
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let foundItem: Item | null = null;
    const activeItems = items.filter((i) => !i.isArchived);

    for (let i = activeItems.length - 1; i >= 0; i--) {
      const item = activeItems[i];
      const rt = runtimeRef.current[item.id];
      if (rt) {
        const dist = Math.hypot(mouseX - rt.x, mouseY - rt.y);
        if (dist < rt.radius * 2 + 5) {
          foundItem = item;
          break;
        }
      }
    }

    if (foundItem) {
      setHoveredItem(foundItem);
      // Position tooltip close to the item
      const rt = runtimeRef.current[foundItem.id];
      if (rt) {
        setTooltipPos({ x: rt.x, y: rt.y });
      }
    } else {
      setHoveredItem(null);
    }
  };

  const handleCanvasClick = () => {
    if (hoveredItem) {
      onItemClick(hoveredItem.id);
    }
  };

  const hoveredSubject = hoveredItem
    ? subjects.find((s) => s.id === hoveredItem.subjectId)
    : null;

  const hoveredDaysDue = hoveredItem
    ? getDaysUntilDue(hoveredItem, simulatedDateStr)
    : 0;

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleCanvasClick}
        className="w-full h-full cursor-crosshair block"
      />

      {/* Floating Canvas Tooltip */}
      {hoveredItem && (
        <div
          style={{
            position: 'absolute',
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y - 15}px`,
          }}
          className="pointer-events-none z-50 bg-[#0c1226]/95 border border-slate-700/60 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-2xl transform -translate-x-1/2 -translate-y-[115%] min-w-[220px] transition-opacity duration-150"
        >
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: hoveredSubject?.color || '#fff' }}
            />
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">
              {hoveredSubject?.name || 'Subject'}
            </h3>
          </div>
          <h4 className="font-bold text-sm mb-2 text-white truncate max-w-[190px]">
            {hoveredItem.name}
          </h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-300">
            <span className="text-slate-500">Mastery:</span>
            <span className="text-right font-bold text-blue-400">
              {calculateMastery(hoveredItem, simulatedDateStr)}%
            </span>
            <span className="text-slate-500">Duration:</span>
            <span className="text-right font-medium">{hoveredItem.duration}m</span>
            <span className="text-slate-500">Priority:</span>
            <span className="text-right font-medium">
              {hoveredItem.priority === 3
                ? 'High'
                : hoveredItem.priority === 2
                ? 'Medium'
                : 'Low'}
            </span>
            <span className="text-slate-500">Due In:</span>
            <span className="text-right font-medium text-slate-100 font-mono">
              {hoveredDaysDue <= 0 ? 'Today' : `${hoveredDaysDue.toFixed(1)} days`}
            </span>
          </div>

          <div
            className={`mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-center font-semibold ${
              hoveredItem.scheduledToday
                ? 'text-blue-400'
                : hoveredItem.postponed
                ? 'text-orange-400'
                : 'text-slate-400'
            }`}
          >
            {hoveredItem.scheduledToday
              ? 'Scheduled For Today'
              : hoveredItem.postponed
              ? 'Postponed (No Capacity)'
              : 'Scheduled for Future'}
          </div>
        </div>
      )}
    </div>
  );
}
