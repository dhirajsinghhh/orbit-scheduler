/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ActivityLog, Item, Subject } from '../types';
import { calculateMastery } from '../utils/scheduler';
import { Award, Layers, RotateCcw } from 'lucide-react';

interface AnalyticsViewProps {
  items: Item[];
  subjects: Subject[];
  activityLogs: ActivityLog[];
  simulatedDateStr: string;
}

export function AnalyticsView({
  items,
  subjects,
  activityLogs,
  simulatedDateStr,
}: AnalyticsViewProps) {
  const activeItems = items.filter((i) => !i.isArchived);

  // Compute stats
  const totalItems = activeItems.length;
  
  const globalMastery = totalItems > 0
    ? Math.round(
        activeItems.reduce((acc, item) => acc + calculateMastery(item, simulatedDateStr), 0) /
          totalItems
      )
    : 0;

  const avgRevisions = totalItems > 0
    ? (
        activeItems.reduce((acc, item) => acc + item.repetitions, 0) /
        totalItems
      ).toFixed(1)
    : '0.0';

  // Heatmap configuration
  const cellSize = 11;
  const cellGap = 3;
  const weekWidth = cellSize + cellGap;
  const height = 7 * weekWidth + 20; // 7 days a week + label space

  // We show up to 365 days of records. Ensure logs are sorted or padded.
  const totalDays = activityLogs.length;
  const colsCount = Math.ceil(totalDays / 7);
  const svgWidth = colsCount * weekWidth + 10;

  const getHeatClass = (log: ActivityLog) => {
    if (log.allocated === 0) return 'fill-slate-900/40 stroke-slate-800/20';
    const ratio = log.utilized / log.allocated;
    if (log.utilized === 0) return 'fill-slate-900/60 stroke-slate-800/30';
    if (ratio <= 0.3) return 'fill-emerald-950 stroke-emerald-900/30';
    if (ratio <= 0.6) return 'fill-emerald-800 stroke-emerald-700/20';
    if (ratio <= 0.9) return 'fill-emerald-500 stroke-emerald-400/20';
    return 'fill-emerald-400 stroke-emerald-300/30';
  };

  return (
    <div className="max-w-5xl mx-auto w-full p-8 pb-24">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">Study Analytics</h2>
        <p className="text-sm text-slate-400">
          Review your daily study utilization over the past year.
        </p>
      </div>

      {/* Activity Heatmap Grid */}
      <div className="bg-[#0b1021]/50 rounded-2xl p-6 border border-slate-800/80 mb-8 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-300">Activity Calendar</h3>
            <p className="text-xs text-slate-500 mt-1">
              Actual utilized hours vs. Allocated capacity
            </p>
          </div>
          <div className="flex gap-2 items-center text-[10px] text-slate-500 self-start sm:self-auto font-medium">
            <span>Less</span>
            <div className="w-3 h-3 bg-slate-950 border border-slate-800/50 rounded-sm"></div>
            <div className="w-3 h-3 bg-emerald-950 rounded-sm"></div>
            <div className="w-3 h-3 bg-emerald-800 rounded-sm"></div>
            <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
            <div className="w-3 h-3 bg-emerald-400 rounded-sm"></div>
            <span>More</span>
          </div>
        </div>

        {/* Scalable Container for SVG */}
        <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          <svg
            width={svgWidth}
            height={height}
            className="block"
            style={{ minWidth: `${Math.min(svgWidth, 800)}px` }}
          >
            {activityLogs.map((log, index) => {
              const colIdx = Math.floor(index / 7);
              const rowIdx = index % 7;
              const x = colIdx * weekWidth;
              const y = rowIdx * weekWidth + 15;

              return (
                <rect
                  key={log.dateStr + '-' + index}
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  className={`transition-colors duration-200 cursor-help ${getHeatClass(log)}`}
                >
                  <title>
                    {`${log.dateStr}\nUtilized: ${(log.utilized / 60).toFixed(1)}h / ${(log.allocated / 60).toFixed(1)}h capacity`}
                  </title>
                </rect>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0b1021]/50 border border-slate-800/80 p-6 rounded-2xl flex items-center justify-between shadow-lg backdrop-blur-sm">
          <div className="space-y-1">
            <h4 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
              Global Mastery
            </h4>
            <p className="text-4xl font-extrabold text-white font-sans">
              {globalMastery}%
            </p>
          </div>
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Award size={28} />
          </div>
        </div>

        <div className="bg-[#0b1021]/50 border border-slate-800/80 p-6 rounded-2xl flex items-center justify-between shadow-lg backdrop-blur-sm">
          <div className="space-y-1">
            <h4 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
              Active Items
            </h4>
            <p className="text-4xl font-extrabold text-white font-sans">
              {totalItems}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Layers size={28} />
          </div>
        </div>

        <div className="bg-[#0b1021]/50 border border-slate-800/80 p-6 rounded-2xl flex items-center justify-between shadow-lg backdrop-blur-sm">
          <div className="space-y-1">
            <h4 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
              Avg Revisions
            </h4>
            <p className="text-4xl font-extrabold text-white font-sans">
              {avgRevisions}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <RotateCcw size={28} />
          </div>
        </div>
      </div>
    </div>
  );
}
