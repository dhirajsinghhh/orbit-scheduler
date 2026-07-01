/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Subject, Item, SortMode } from '../types';
import { calculateMastery, calculateSubjectMastery } from '../utils/scheduler';
import { ChevronDown, Plus, Edit2, GripVertical, Archive } from 'lucide-react';

interface SubjectsViewProps {
  subjects: Subject[];
  items: Item[];
  simulatedDateStr: string;
  onAddSubject: () => void;
  onEditSubject: (subject: Subject) => void;
  onAddItem: (subjectId: number) => void;
  onEditItem: (item: Item) => void;
  onUpdateSubjects: (updatedSubjects: Subject[]) => void;
  onUpdateItems: (updatedItems: Item[]) => void;
}

export function SubjectsView({
  subjects,
  items,
  simulatedDateStr,
  onAddSubject,
  onEditSubject,
  onAddItem,
  onEditItem,
  onUpdateSubjects,
  onUpdateItems,
}: SubjectsViewProps) {
  const [activeSortTab, setActiveSortTab] = useState<'subjects' | 'items'>('subjects');
  const [subjSortMode, setSubjSortMode] = useState<SortMode>('default');
  const [itemSortMode, setItemSortMode] = useState<SortMode>('default');
  const [expandedSubjIds, setExpandedSubjIds] = useState<Set<number>>(new Set([1]));

  // Drag-and-drop state
  const [draggedSubjId, setDraggedSubjId] = useState<number | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [dragOverSubjId, setDragOverSubjId] = useState<number | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<number | null>(null);

  const toggleSubject = (id: number) => {
    const next = new Set(expandedSubjIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedSubjIds(next);
  };

  // --- SUBJECT DRAG-AND-DROP ---
  const handleSubjDragStart = (e: React.DragEvent, id: number) => {
    setDraggedSubjId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'subject');
  };

  const handleSubjDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    if (draggedSubjId !== null && draggedSubjId !== id) {
      setDragOverSubjId(id);
    }
  };

  const handleSubjDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    setDragOverSubjId(null);
    if (draggedSubjId === null || draggedSubjId === targetId) return;

    // Get sorted subjects for dragging
    const activeSubjs = [...subjects].filter((s) => !s.isArchived);
    sortSubjects(activeSubjs, subjSortMode);

    const draggedIdx = activeSubjs.findIndex((s) => s.id === draggedSubjId);
    const targetIdx = activeSubjs.findIndex((s) => s.id === targetId);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      const [moved] = activeSubjs.splice(draggedIdx, 1);
      activeSubjs.splice(targetIdx, 0, moved);

      // Reassign sequential ordering key
      activeSubjs.forEach((s, idx) => {
        s.order = idx;
      });

      // Update the complete subjects array preserving archived items
      const merged = subjects.map((original) => {
        const updated = activeSubjs.find((s) => s.id === original.id);
        return updated ? { ...original, order: updated.order } : original;
      });

      onUpdateSubjects(merged);
      setSubjSortMode('custom');
    }
    setDraggedSubjId(null);
  };

  // --- ITEM DRAG-AND-DROP ---
  const handleItemDragStart = (e: React.DragEvent, id: number) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'item');
  };

  const handleItemDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    if (draggedItemId !== null && draggedItemId !== id) {
      setDragOverItemId(id);
    }
  };

  const handleItemDrop = (e: React.DragEvent, targetId: number, subjectId: number) => {
    e.preventDefault();
    setDragOverItemId(null);
    if (draggedItemId === null || draggedItemId === targetId) return;

    // Get sorted items belonging to this subject
    const subjItems = [...items].filter((i) => i.subjectId === subjectId && !i.isArchived);
    sortItems(subjItems, itemSortMode);

    const draggedIdx = subjItems.findIndex((i) => i.id === draggedItemId);
    const targetIdx = subjItems.findIndex((i) => i.id === targetId);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      const [moved] = subjItems.splice(draggedIdx, 1);
      subjItems.splice(targetIdx, 0, moved);

      // Reassign sequential ordering key
      subjItems.forEach((item, idx) => {
        item.order = idx;
      });

      // Merge back into original array preserving other subjects' items
      const merged = items.map((original) => {
        const updated = subjItems.find((i) => i.id === original.id);
        return updated ? { ...original, order: updated.order } : original;
      });

      onUpdateItems(merged);
      setItemSortMode('custom');
    }
    setDraggedItemId(null);
  };

  // Sorting Helpers
  const sortSubjects = (list: Subject[], mode: SortMode) => {
    if (mode === 'asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (mode === 'desc') {
      list.sort((a, b) => b.name.localeCompare(a.name));
    } else if (mode === 'custom') {
      list.sort((a, b) => a.order - b.order);
    } else {
      // Default: Highest subject mastery first
      list.sort((a, b) => calculateSubjectMastery(b.id, items, simulatedDateStr) - calculateSubjectMastery(a.id, items, simulatedDateStr));
    }
  };

  const sortItems = (list: Item[], mode: SortMode) => {
    if (mode === 'asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (mode === 'desc') {
      list.sort((a, b) => b.name.localeCompare(a.name));
    } else if (mode === 'custom') {
      list.sort((a, b) => a.order - b.order);
    } else {
      // Default: Priority (High to Low), then duration
      list.sort((a, b) => b.priority - a.priority || b.duration - a.duration);
    }
  };

  // Render list of active subjects
  const activeSubjects = [...subjects].filter((s) => !s.isArchived);
  sortSubjects(activeSubjects, subjSortMode);

  return (
    <div className="max-w-5xl mx-auto w-full p-8 pb-24">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Knowledge Base</h2>
          <p className="text-sm text-slate-400">
            Manage study subjects, customize orbital colors, and catalog items.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Sorting Switch Panel */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-inner text-xs">
            <div className="flex bg-slate-800 rounded-lg p-0.5 mr-2">
              <button
                onClick={() => setActiveSortTab('subjects')}
                className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition ${
                  activeSortTab === 'subjects' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Subjects
              </button>
              <button
                onClick={() => setActiveSortTab('items')}
                className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition ${
                  activeSortTab === 'items' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Items
              </button>
            </div>

            {activeSortTab === 'subjects' ? (
              <select
                value={subjSortMode}
                onChange={(e) => setSubjSortMode(e.target.value as SortMode)}
                className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer py-1 pr-2 border-none"
              >
                <option value="default">Sort: Mastery (Default)</option>
                <option value="custom">Sort: Custom (Drag)</option>
                <option value="asc">Sort: A-Z</option>
                <option value="desc">Sort: Z-A</option>
              </select>
            ) : (
              <select
                value={itemSortMode}
                onChange={(e) => setItemSortMode(e.target.value as SortMode)}
                className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer py-1 pr-2 border-none"
              >
                <option value="default">Sort: Priority (Default)</option>
                <option value="custom">Sort: Custom (Drag)</option>
                <option value="asc">Sort: A-Z</option>
                <option value="desc">Sort: Z-A</option>
              </select>
            )}
          </div>

          <button
            onClick={onAddSubject}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-lg whitespace-nowrap cursor-pointer flex items-center gap-1.5"
          >
            <Plus size={16} />
            New Subject
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {activeSubjects.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
            <p className="text-slate-500 text-sm">
              No active subjects found. Click &apos;New Subject&apos; above to create your first learning category.
            </p>
          </div>
        ) : (
          activeSubjects.map((subj) => {
            const subjItems = [...items].filter((i) => i.subjectId === subj.id && !i.isArchived);
            sortItems(subjItems, itemSortMode);

            const mastery = calculateSubjectMastery(subj.id, items, simulatedDateStr);
            const isExpanded = expandedSubjIds.has(subj.id);

            return (
              <div
                key={subj.id}
                draggable
                onDragStart={(e) => handleSubjDragStart(e, subj.id)}
                onDragOver={(e) => handleSubjDragOver(e, subj.id)}
                onDragLeave={() => setDragOverSubjId(null)}
                onDrop={(e) => handleSubjDrop(e, subj.id)}
                onDragEnd={() => {
                  setDraggedSubjId(null);
                  setDragOverSubjId(null);
                }}
                className={`bg-[#0b1021]/30 border rounded-xl overflow-hidden shadow-sm transition-all duration-250 ${
                  dragOverSubjId === subj.id
                    ? 'border-blue-500 border-dashed scale-[1.01]'
                    : 'border-slate-800/80 hover:border-slate-700/60'
                }`}
              >
                {/* Header Row */}
                <div
                  onClick={() => toggleSubject(subj.id)}
                  className="p-4 flex items-center justify-between bg-slate-800/10 cursor-pointer hover:bg-slate-800/20 transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="text-slate-600 hover:text-slate-300 p-1 cursor-grab active:cursor-grabbing"
                      title="Drag to reorder subjects"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical size={16} />
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 transition-transform duration-300 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                    <div
                      className="w-4 h-4 rounded-full shadow-inner"
                      style={{ backgroundColor: subj.color }}
                    />
                    <div>
                      <h3 className="text-base font-bold text-white leading-none">
                        {subj.name}
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {subjItems.length} active items
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6" onClick={(e) => e.stopPropagation()}>
                    <div className="text-right hidden sm:block">
                      <p className="text-[9px] uppercase text-slate-500 tracking-wide font-semibold mb-1">
                        Mastery
                      </p>
                      <div className="w-24 bg-slate-800/60 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${mastery}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEditSubject(subj)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 rounded border border-slate-700/50 transition cursor-pointer flex items-center gap-1"
                      >
                        <Edit2 size={10} />
                        Edit
                      </button>
                      <button
                        onClick={() => onAddItem(subj.id)}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-[11px] text-white rounded transition shadow cursor-pointer flex items-center gap-1"
                      >
                        <Plus size={10} />
                        Add Item
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub-Items List Accordion */}
                <div
                  className={`transition-all duration-300 ease-in-out ${
                    isExpanded ? 'max-h-[1000px] border-t border-slate-900/60' : 'max-h-0 overflow-hidden'
                  }`}
                >
                  {subjItems.length === 0 ? (
                    <p className="p-4 text-xs text-slate-500 italic text-center">
                      No cards found in this subject. Click &apos;Add Item&apos; to start.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-900/50">
                      {subjItems.map((item) => {
                        const itemMastery = calculateMastery(item, simulatedDateStr);

                        return (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleItemDragStart(e, item.id)}
                            onDragOver={(e) => handleItemDragOver(e, item.id)}
                            onDragLeave={() => setDragOverItemId(null)}
                            onDrop={(e) => handleItemDrop(e, item.id, subj.id)}
                            onDragEnd={() => {
                              setDraggedItemId(null);
                              setDragOverItemId(null);
                            }}
                            className={`p-3 pl-4 pr-4 transition-colors flex items-center justify-between ${
                              dragOverItemId === item.id
                                ? 'bg-blue-950/20 border-t-2 border-blue-500/80 border-dashed'
                                : 'hover:bg-slate-800/10'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div
                                className="text-slate-700 hover:text-slate-400 cursor-grab active:cursor-grabbing p-0.5"
                                title="Drag to reorder card"
                              >
                                <GripVertical size={14} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-200 text-sm truncate max-w-[280px] sm:max-w-md">
                                  {item.name}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  Priority: {item.priority} | EF: {item.ef.toFixed(2)} | Next:{' '}
                                  {item.nextReviewDate
                                    ? new Date(item.nextReviewDate).toLocaleDateString()
                                    : 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-bold text-blue-400 w-8 text-right font-mono">
                                {itemMastery}%
                              </span>
                              <button
                                onClick={() => onEditItem(item)}
                                className="text-slate-500 hover:text-white p-1 transition cursor-pointer"
                              >
                                <Edit2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
