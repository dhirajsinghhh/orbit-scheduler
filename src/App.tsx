/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Subject, Item, ActivityLog } from './types';
import {
  generateMockData,
  reviewItem,
  calculateMastery,
  getDaysUntilDue,
} from './utils/scheduler';
import { GalaxyCanvas } from './components/GalaxyCanvas';
import { SubjectsView } from './components/SubjectsView';
import { AnalyticsView } from './components/AnalyticsView';
import {
  ReviewModal,
  SubjectModal,
  ItemModal,
  SleepModal,
  ProfileModal,
  TimezoneModal,
  MessageBox,
} from './components/Modals';
import {
  Clock,
  Layers,
  Sparkles,
  User,
  MapPin,
  Moon,
  Plus,
  Compass,
  ArrowRightLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Database,
  ArrowDown,
  FileUp,
  FileDown
} from 'lucide-react';

export default function App() {
  // Navigation & UI Layout States
  const [activeTab, setActiveTab] = useState<'view-galaxy' | 'view-subjects' | 'view-analytics'>('view-galaxy');
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);

  // Core Persistence States
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [availableMinutes, setAvailableMinutes] = useState(240); // default 4 hrs
  const [simulatedDateStr, setSimulatedDateStr] = useState<string>('');
  const [profileName, setProfileName] = useState('Guest');
  const [dataFolderName, setDataFolderName] = useState('revisiondata');
  const [userTimeZone, setUserTimeZone] = useState<string | null>(null);

  // Modal Open/Close States
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [activeReviewItem, setActiveReviewItem] = useState<Item | null>(null);

  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);

  const [isItemOpen, setIsItemOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [prefillSubjectId, setPrefillSubjectId] = useState<number | null>(null);

  const [isSleepOpen, setIsSleepOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isTimezoneOpen, setIsTimezoneOpen] = useState(false);
  const [isMsgOpen, setIsMsgOpen] = useState(false);
  const [msgText, setMsgText] = useState('');

  // Hydrate Data on Mount
  useEffect(() => {
    const savedState = localStorage.getItem('orbit_state_v2');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setSubjects(parsed.subjects || []);
        setItems(parsed.items || []);
        setActivityLogs(parsed.activityLogs || []);
        setSimulatedDateStr(parsed.simulatedDate || new Date().toISOString());
        setAvailableMinutes(parsed.availableMinutes || 240);
        setProfileName(parsed.profileName || 'Guest');
        setDataFolderName(parsed.dataFolderName || 'revisiondata');
        setUserTimeZone(parsed.userTimeZone || 'Asia/Kolkata');
      } catch (e) {
        fallbackToMock();
      }
    } else {
      fallbackToMock();
    }
  }, []);

  const fallbackToMock = () => {
    const defaultDate = new Date();
    defaultDate.setHours(8, 0, 0, 0);
    const mock = generateMockData(defaultDate.toISOString());
    setSubjects(mock.subjects);
    setItems(mock.items);
    setActivityLogs(mock.activityLogs);
    setSimulatedDateStr(defaultDate.toISOString());
    setUserTimeZone('Asia/Kolkata');
  };

  // Auto-Save Effect
  const isHydrated = useRef(false);
  useEffect(() => {
    if (!simulatedDateStr) return; // Wait until hydrated
    
    const snapshot = {
      version: 2,
      savedAt: new Date().toISOString(),
      profileName,
      dataFolderName,
      simulatedDate: simulatedDateStr,
      availableMinutes,
      userTimeZone,
      subjects,
      items,
      activityLogs,
    };
    localStorage.setItem('orbit_state_v2', JSON.stringify(snapshot));
  }, [subjects, items, activityLogs, simulatedDateStr, availableMinutes, profileName, dataFolderName, userTimeZone]);

  // Clock Sync to selected timezone (ticks in real-time)
  useEffect(() => {
    if (!userTimeZone) return;

    const updateClock = () => {
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: userTimeZone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
        const parts = formatter.formatToParts(new Date());
        const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));
        const localISO = `${partMap.year}-${partMap.month}-${partMap.day}T${partMap.hour}:${partMap.minute}:${partMap.second}`;
        setSimulatedDateStr(new Date(localISO).toISOString());
      } catch (e) {
        setSimulatedDateStr(new Date().toISOString());
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 60000); // update every minute to save cycles
    return () => clearInterval(interval);
  }, [userTimeZone]);

  // Scheduler core computation: determine today's item schedule
  const getTodaySchedule = () => {
    let timeUsed = 0;
    const activeItems = items.filter((t) => !t.isArchived);

    // Filter cards due today or overdue
    const mapped = activeItems.map((t) => {
      const daysDue = getDaysUntilDue(t, simulatedDateStr);
      let dynamicScore = -999;

      if (daysDue <= 0.5) {
        const overduePenalty = Math.max(0, -daysDue) * 5;
        const difficultyBonus = (2.5 - t.ef) * 10;
        dynamicScore = t.priority * 15 + overduePenalty + difficultyBonus;
      }

      return { ...t, daysDue, dynamicScore };
    });

    // Sort by dynamic priority ranking score descending
    const sortedDue = mapped
      .filter((t) => t.dynamicScore > -990)
      .sort((a, b) => b.dynamicScore - a.dynamicScore);

    // Allocate time capacity limits
    const finalized = items.map((original) => {
      const dueItem = sortedDue.find((d) => d.id === original.id);
      if (dueItem) {
        if (timeUsed + original.duration <= availableMinutes) {
          timeUsed += original.duration;
          return { ...original, scheduledToday: true, postponed: false };
        } else {
          return { ...original, scheduledToday: false, postponed: true };
        }
      } else {
        return { ...original, scheduledToday: false, postponed: false };
      }
    });

    return { finalized, timeUsed };
  };

  const { finalized: processedItems, timeUsed } = getTodaySchedule();
  const dueItemsToday = processedItems.filter((i) => i.scheduledToday || i.postponed);
  const scheduledCount = processedItems.filter((i) => i.scheduledToday).length;

  // Spaced Repetition Quality Review Submit
  const handleReviewSubmit = (quality: number) => {
    if (!activeReviewItem) return;
    const updated = reviewItem(activeReviewItem, quality, simulatedDateStr);
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    setIsReviewOpen(false);
    setActiveReviewItem(null);
    setMsgText(`Review recorded! Mastery is now ${calculateMastery(updated, simulatedDateStr)}%`);
    setIsMsgOpen(true);
  };

  // Save Subject Action
  const handleSaveSubject = (name: string, color: string) => {
    if (activeSubject) {
      // Edit
      setSubjects((prev) =>
        prev.map((s) => (s.id === activeSubject.id ? { ...s, name, color } : s))
      );
    } else {
      // Add
      const nextId = subjects.length > 0 ? Math.max(...subjects.map((s) => s.id)) + 1 : 1;
      const newSubj: Subject = {
        id: nextId,
        name,
        color,
        isArchived: false,
        order: subjects.length,
      };
      setSubjects((prev) => [...prev, newSubj]);
    }
    setIsSubjectOpen(false);
    setActiveSubject(null);
  };

  const handleArchiveSubject = () => {
    if (!activeSubject) return;
    const updatedArchivedState = !activeSubject.isArchived;
    setSubjects((prev) =>
      prev.map((s) => (s.id === activeSubject.id ? { ...s, isArchived: updatedArchivedState } : s))
    );
    // Cascade to items
    setItems((prev) =>
      prev.map((i) => (i.subjectId === activeSubject.id ? { ...i, isArchived: updatedArchivedState } : i))
    );
    setIsSubjectOpen(false);
    setActiveSubject(null);
  };

  const handleDeleteSubject = () => {
    if (!activeSubject) return;
    if (confirm('Archive this subject instead? Orbit protects historical review metrics from hard deletions.')) {
      setSubjects((prev) => prev.map((s) => (s.id === activeSubject.id ? { ...s, isArchived: true } : s)));
      setItems((prev) =>
        prev.map((i) => (i.subjectId === activeSubject.id ? { ...i, isArchived: true } : i))
      );
    }
    setIsSubjectOpen(false);
    setActiveSubject(null);
  };

  // Save Study Item Action
  const handleSaveItem = (data: {
    name: string;
    subjectId: number;
    duration: number;
    priority: number;
  }) => {
    if (activeItem) {
      // Edit
      setItems((prev) =>
        prev.map((i) => (i.id === activeItem.id ? { ...i, ...data } : i))
      );
    } else {
      // Add
      const nextId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
      const newItem: Item = {
        id: nextId,
        subjectId: data.subjectId,
        name: data.name,
        duration: data.duration,
        priority: data.priority,
        isArchived: false,
        order: items.filter((it) => it.subjectId === data.subjectId).length,
        repetitions: 0,
        ef: 2.5,
        interval: 0,
        lastReviewed: null,
        nextReviewDate: simulatedDateStr,
        history: [],
      };
      setItems((prev) => [...prev, newItem]);
    }
    setIsItemOpen(false);
    setActiveItem(null);
  };

  const handleArchiveItem = () => {
    if (!activeItem) return;
    setItems((prev) =>
      prev.map((i) => (i.id === activeItem.id ? { ...i, isArchived: !i.isArchived } : i))
    );
    setIsItemOpen(false);
    setActiveItem(null);
  };

  const handleDeleteItem = () => {
    if (!activeItem) return;
    if (confirm('Archive this card? It is safer to hide elements than erase spaced-repetition histories.')) {
      setItems((prev) => prev.map((i) => (i.id === activeItem.id ? { ...i, isArchived: true } : i)));
    }
    setIsItemOpen(false);
    setActiveItem(null);
  };

  // End Day capacity logging
  const handleConfirmSleep = (utilizedMinutes: number) => {
    const todayStr = new Date(simulatedDateStr).toISOString().split('T')[0];
    const newLog: ActivityLog = {
      dateStr: todayStr,
      allocated: availableMinutes,
      utilized: utilizedMinutes,
    };
    setActivityLogs((prev) => [...prev, newLog]);
    setIsSleepOpen(false);
    
    // Step manually to next morning 8 AM
    const tomorrow = new Date(simulatedDateStr);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    setSimulatedDateStr(tomorrow.toISOString());
    setMsgText('Day closed successfully! Capacity logged and calendar bumped to tomorrow 8:00 AM.');
    setIsMsgOpen(true);
  };

  // Export database backup snapshot
  const handleExportData = () => {
    const snapshot = {
      version: 2,
      savedAt: new Date().toISOString(),
      profileName,
      dataFolderName,
      simulatedDate: simulatedDateStr,
      availableMinutes,
      userTimeZone,
      subjects,
      items,
      activityLogs,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `orbit-backup-${profileName.toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import database backup snapshot
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.subjects && parsed.items) {
          setSubjects(parsed.subjects);
          setItems(parsed.items);
          setActivityLogs(parsed.activityLogs || []);
          if (parsed.profileName) setProfileName(parsed.profileName);
          if (parsed.dataFolderName) setDataFolderName(parsed.dataFolderName);
          if (parsed.availableMinutes) setAvailableMinutes(parsed.availableMinutes);
          if (parsed.userTimeZone) setUserTimeZone(parsed.userTimeZone);
          if (parsed.simulatedDate) setSimulatedDateStr(parsed.simulatedDate);

          setMsgText('Offline learning data vault successfully restored!');
          setIsMsgOpen(true);
        } else {
          setMsgText('Invalid data backup format.');
          setIsMsgOpen(true);
        }
      } catch (err) {
        setMsgText('Failed to parse backup JSON file.');
        setIsMsgOpen(true);
      }
    };
    reader.readAsText(file);
  };

  // Clock formatter for safe client render
  const formattedDate = simulatedDateStr
    ? new Date(simulatedDateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '...';

  const formattedTime = simulatedDateStr
    ? new Date(simulatedDateStr).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '...';

  const isLockedHour = simulatedDateStr ? new Date(simulatedDateStr).getHours() >= 9 : false;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#030611] text-[#e2e8f0] font-sans antialiased">
      {/* Premium Header */}
      <header className="w-full h-16 flex items-center justify-between px-8 z-40 border-b border-slate-800/50 bg-[#060b18] shrink-0">
        <div className="flex items-center gap-2 select-none">
          <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)] animate-pulse">
            <Compass size={18} />
          </div>
          <h1 className="text-lg font-extrabold tracking-tight">
            <span className="text-white font-sans">Orbit</span>
            <span className="text-blue-500 font-sans font-medium ml-0.5">Scheduler</span>
          </h1>
        </div>

        <nav className="flex gap-8 text-sm select-none">
          <button
            onClick={() => setActiveTab('view-galaxy')}
            className={`tab-btn cursor-pointer ${activeTab === 'view-galaxy' ? 'active' : ''}`}
          >
            Galaxy
          </button>
          <button
            onClick={() => setActiveTab('view-subjects')}
            className={`tab-btn cursor-pointer ${activeTab === 'view-subjects' ? 'active' : ''}`}
          >
            Subjects
          </button>
          <button
            onClick={() => setActiveTab('view-analytics')}
            className={`tab-btn cursor-pointer ${activeTab === 'view-analytics' ? 'active' : ''}`}
          >
            Analytics
          </button>
        </nav>

        <div className="flex items-center gap-6 text-right">
          <div className="flex items-center gap-5">
            {/* Local Sync Indicator */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer text-xs font-semibold"
            >
              <User size={13} className="text-blue-400" />
              <span>{profileName}</span>
            </button>

            {/* Time / Zone Controls */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-bold font-mono text-white tracking-wider">
                {formattedTime}
              </span>
              <button
                onClick={() => setIsTimezoneOpen(true)}
                className="text-[10px] text-blue-400 hover:text-blue-300 transition flex items-center gap-1 font-semibold mt-0.5"
              >
                <MapPin size={10} />
                <span>{userTimeZone ? userTimeZone.split('/')[1]?.replace('_', ' ') : 'Select Zone'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Views Stage */}
      <div className="flex-1 relative w-full overflow-hidden">
        
        {/* VIEW 1: GALAXY HUB */}
        <div className={`view-container ${activeTab === 'view-galaxy' ? 'active' : ''}`}>
          <div className="relative flex h-full w-full overflow-hidden">
            
            {/* Sidebar Controls */}
            <aside
              className={`absolute left-0 top-0 bottom-0 bg-[#0a0f1e]/85 backdrop-blur-xl w-80 h-full flex flex-col z-20 border-r border-slate-800/40 shadow-2xl transition-transform duration-300 ${
                isSidebarHidden ? '-translate-x-full' : 'translate-x-0'
              }`}
            >
              <div className="p-6 flex flex-col h-full relative">
                {/* Sidebar Slide Button */}
                <button
                  onClick={() => setIsSidebarHidden(!isSidebarHidden)}
                  className="absolute -right-9 top-4 bg-[#0a0f1e]/90 p-2 rounded-r-xl border-y border-r border-slate-800 hover:text-white text-slate-400 transition shadow-lg cursor-pointer"
                  title={isSidebarHidden ? 'Expand panel' : 'Collapse panel'}
                >
                  <ChevronRight size={18} className={`transition-transform ${isSidebarHidden ? '' : 'rotate-180'}`} />
                </button>

                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-extrabold text-white text-base">Today&apos;s Focus</h2>
                  <span className="bg-blue-500/10 text-blue-400 text-[10px] px-2.5 py-1 rounded-full border border-blue-500/20 font-bold uppercase tracking-wider font-mono">
                    {scheduledCount} items
                  </span>
                </div>

                {/* Capacity Target Setting */}
                <div className="bg-slate-900/30 rounded-xl p-4 mb-5 border border-slate-800/60 backdrop-blur-sm">
                  <div className="flex justify-between items-center mb-3">
                    <label className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                      Allocated Study Time
                    </label>
                    <span className="font-mono text-blue-400 font-extrabold text-xs">
                      {(availableMinutes / 60).toFixed(1)} hrs
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="12"
                    step="0.5"
                    value={availableMinutes / 60}
                    disabled={isLockedHour}
                    onChange={(e) => setAvailableMinutes(Number(e.target.value) * 60)}
                    className="w-full cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex justify-between items-center mt-2.5">
                    <p className={`text-[9px] font-semibold ${isLockedHour ? 'text-red-400' : 'text-emerald-400'}`}>
                      {isLockedHour ? 'Hours locked past 9:00 AM' : 'Adjustable before 9:00 AM'}
                    </p>
                    <button
                      onClick={() => setIsSleepOpen(true)}
                      className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-md cursor-pointer flex items-center gap-1"
                    >
                      <Moon size={11} />
                      End Day
                    </button>
                  </div>
                </div>

                {/* Scheduled list cards scroll viewport */}
                <div className="flex-1 overflow-y-auto mb-4 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                  {dueItemsToday.length === 0 ? (
                    <div className="text-slate-500 text-xs italic mt-12 text-center flex flex-col items-center gap-2">
                      <Sparkles size={20} className="text-slate-600" />
                      <span>Orbit clear! No due cards remaining.</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {dueItemsToday.map((t) => {
                        const subj = subjects.find((s) => s.id === t.subjectId);
                        const statusColorClass = t.scheduledToday
                          ? 'border-blue-500/20 bg-blue-950/10 hover:bg-blue-950/20'
                          : 'border-orange-500/20 bg-orange-950/10 opacity-70';

                        return (
                          <div
                            key={t.id}
                            onClick={() => {
                              setActiveReviewItem(t);
                              setIsReviewOpen(true);
                            }}
                            className={`p-3 rounded-xl border ${statusColorClass} flex flex-col gap-1.5 cursor-pointer hover:border-slate-700 transition`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-100 text-sm truncate pr-2">
                                {t.name}
                              </span>
                              {t.scheduledToday ? (
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: subj?.color || '#fff' }}
                              />
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                                {subj?.name || 'Category'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 font-mono">
                              <span className={t.scheduledToday ? 'text-blue-400 font-bold' : 'text-slate-400'}>
                                {t.duration}m
                              </span>
                              <span>Mastery: {calculateMastery(t, simulatedDateStr)}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Fast Add Action */}
                <button
                  onClick={() => {
                    setActiveItem(null);
                    setPrefillSubjectId(null);
                    setIsItemOpen(true);
                  }}
                  className="w-full bg-slate-900/60 hover:bg-slate-800 text-slate-200 py-3 rounded-xl text-xs font-semibold transition border border-slate-800/80 flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <Plus size={14} />
                  Quick Add Card
                </button>
              </div>
            </aside>

            {/* Orbit Universe Stage */}
            <main className="flex-1 relative w-full h-full">
              <GalaxyCanvas
                items={processedItems}
                subjects={subjects}
                simulatedDateStr={simulatedDateStr}
                onItemClick={(id) => {
                  const clicked = items.find((it) => it.id === id);
                  if (clicked) {
                    setActiveReviewItem(clicked);
                    setIsReviewOpen(true);
                  }
                }}
              />

              {/* Bottom Info Panels */}
              <div className="absolute bottom-6 right-6 pointer-events-none text-right select-none">
                <p className="text-xs text-slate-400 font-bold font-mono tracking-wider">
                  {formattedDate}
                </p>
              </div>
            </main>
          </div>
        </div>

        {/* VIEW 2: SUBJECTS MANAGER */}
        <div className={`view-container ${activeTab === 'view-subjects' ? 'active' : ''}`}>
          <SubjectsView
            subjects={subjects}
            items={items}
            simulatedDateStr={simulatedDateStr}
            onAddSubject={() => {
              setActiveSubject(null);
              setIsSubjectOpen(true);
            }}
            onEditSubject={(s) => {
              setActiveSubject(s);
              setIsSubjectOpen(true);
            }}
            onAddItem={(subjId) => {
              setActiveItem(null);
              setPrefillSubjectId(subjId);
              setIsItemOpen(true);
            }}
            onEditItem={(i) => {
              setActiveItem(i);
              setIsItemOpen(true);
            }}
            onUpdateSubjects={setSubjects}
            onUpdateItems={setItems}
          />
        </div>

        {/* VIEW 3: HISTORIC ANALYTICS */}
        <div className={`view-container ${activeTab === 'view-analytics' ? 'active' : ''}`}>
          <AnalyticsView
            items={items}
            subjects={subjects}
            activityLogs={activityLogs}
            simulatedDateStr={simulatedDateStr}
          />
        </div>

      </div>

      {/* ALL MODALS COMPOSITIONS */}
      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        item={activeReviewItem}
        subjectName={
          activeReviewItem
            ? subjects.find((s) => s.id === activeReviewItem.subjectId)?.name || 'Subject'
            : 'Subject'
        }
        onReviewSubmit={handleReviewSubmit}
        simulatedDateStr={simulatedDateStr}
      />

      <SubjectModal
        isOpen={isSubjectOpen}
        onClose={() => setIsSubjectOpen(false)}
        subject={activeSubject}
        onSave={handleSaveSubject}
        onArchive={handleArchiveSubject}
        onDelete={handleDeleteSubject}
      />

      <ItemModal
        isOpen={isItemOpen}
        onClose={() => setIsItemOpen(false)}
        item={activeItem}
        subjects={subjects}
        onSave={handleSaveItem}
        onArchive={handleArchiveItem}
        onDelete={handleDeleteItem}
        prefillSubjectId={prefillSubjectId}
      />

      <SleepModal
        isOpen={isSleepOpen}
        onClose={() => setIsSleepOpen(false)}
        targetMinutes={availableMinutes}
        onConfirm={handleConfirmSleep}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        initialProfileName={profileName}
        initialFolderName={dataFolderName}
        onSave={(name, folder) => {
          setProfileName(name);
          setDataFolderName(folder);
          setIsProfileOpen(false);
          setMsgText('Profile updated successfully.');
          setIsMsgOpen(true);
        }}
      />

      {/* Add JSON export/import directly inside local Settings modal or custom bottom panel */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-[65] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1225] border border-slate-800 w-full max-w-sm p-6 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Database size={18} className="text-blue-500" />
              Backup & Sync Storage
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instantly backup your workspace or migrate data between platforms with simple JSON snapshots.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleExportData}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-200 rounded-lg cursor-pointer transition"
              >
                <FileDown size={14} className="text-emerald-400" />
                Export Vault
              </button>
              <label className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-200 rounded-lg cursor-pointer transition">
                <FileUp size={14} className="text-blue-400" />
                <span>Import Vault</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>
            </div>
            <button
              onClick={() => setIsProfileOpen(false)}
              className="w-full text-center py-2 bg-slate-800 text-slate-400 text-xs font-semibold rounded-lg hover:text-white transition cursor-pointer"
            >
              Close Backups
            </button>
          </div>
        </div>
      )}

      <TimezoneModal
        isOpen={isTimezoneOpen}
        onClose={() => setIsTimezoneOpen(false)}
        initialTimezone={userTimeZone}
        onSave={(tz) => {
          setUserTimeZone(tz);
          setIsTimezoneOpen(false);
          setMsgText(`Orbit galaxy synced successfully to ${tz.replace('_', ' ')}.`);
          setIsMsgOpen(true);
        }}
      />

      <MessageBox
        isOpen={isMsgOpen}
        onClose={() => setIsMsgOpen(false)}
        message={msgText}
      />
    </div>
  );
}
