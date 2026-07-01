/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Trash2, Archive, AlertCircle, Save, FolderPlus, Clock } from 'lucide-react';
import { Item, Subject } from '../types';
import { calculateMastery } from '../utils/scheduler';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  subjectName: string;
  onReviewSubmit: (quality: number) => void;
  simulatedDateStr: string;
}

export function ReviewModal({
  isOpen,
  onClose,
  item,
  subjectName,
  onReviewSubmit,
  simulatedDateStr,
}: ReviewModalProps) {
  if (!isOpen || !item) return null;

  const currentMastery = calculateMastery(item, simulatedDateStr);

  const reviewOptions = [
    { score: 0, label: '0 - Blackout', desc: 'Blanked completely', color: 'bg-red-950/40 hover:bg-red-600/60 border-red-500/30 text-white' },
    { score: 1, label: '1 - Very Hard', desc: 'Faint memory', color: 'bg-orange-950/40 hover:bg-orange-600/60 border-orange-500/30 text-white' },
    { score: 2, label: '2 - Hard', desc: 'Took major effort', color: 'bg-yellow-950/40 hover:bg-yellow-600/60 border-yellow-500/30 text-white' },
    { score: 3, label: '3 - Good', desc: 'Recalled with effort', color: 'bg-blue-950/40 hover:bg-blue-600/60 border-blue-500/30 text-white' },
    { score: 4, label: '4 - Easy', desc: 'Slight hesitation', color: 'bg-emerald-950/40 hover:bg-emerald-600/60 border-emerald-500/30 text-white' },
    { score: 5, label: '5 - Perfect', desc: 'Instant recall', color: 'bg-green-950/40 hover:bg-green-500/60 border-green-400/30 text-white' },
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a0f1e]/95 border border-slate-700/60 backdrop-blur-xl w-full max-w-md p-8 rounded-2xl shadow-2xl flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-1">
              {subjectName}
            </p>
            <h2 className="text-2xl font-bold text-white leading-tight">
              {item.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition p-1 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-slate-400 mb-6 text-sm">
          How well did you remember this concept?
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {reviewOptions.map((opt) => (
            <button
              key={opt.score}
              onClick={() => onReviewSubmit(opt.score)}
              className={`border p-3 rounded-xl flex flex-col items-center text-center transition cursor-pointer ${opt.color}`}
            >
              <span className="font-bold text-xs">{opt.label}</span>
              <span className="text-[10px] text-slate-400 mt-1">{opt.desc}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-800/80 pt-4 mt-2 font-mono">
          <span>Reps: <span className="text-white font-bold">{item.repetitions}</span></span>
          <span>EF: <span className="text-white font-bold">{item.ef.toFixed(2)}</span></span>
          <span>Mastery: <span className="text-blue-400 font-bold">{currentMastery}%</span></span>
        </div>
      </div>
    </div>
  );
}

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null; // null if creating a new one
  onSave: (name: string, color: string) => void;
  onArchive?: () => void;
  onDelete?: () => void;
}

export function SubjectModal({
  isOpen,
  onClose,
  subject,
  onSave,
  onArchive,
  onDelete,
}: SubjectModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');

  useEffect(() => {
    if (subject) {
      setName(subject.name);
      setColor(subject.color);
    } else {
      setName('');
      // Generate random color
      const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
      setColor(randomColor);
    }
  }, [subject, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), color);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a0f1e]/95 border border-slate-700/60 backdrop-blur-xl w-full max-w-md p-8 rounded-2xl shadow-2xl flex flex-col">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FolderPlus size={24} className="text-blue-500" />
            {subject ? 'Edit Subject' : 'New Subject'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition p-1"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Subject Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition"
              placeholder="e.g. Computer Science"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Theme Color
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-10 bg-slate-900 border border-slate-700/60 rounded-lg cursor-pointer"
              />
              <span className="text-sm text-slate-400 font-mono select-all">
                {color.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            {subject && onArchive && (
              <button
                type="button"
                onClick={onArchive}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition border border-slate-700/50 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <Archive size={14} />
                {subject.isArchived ? 'Restore' : 'Archive'}
              </button>
            )}
            {subject && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-4 py-3 bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition border border-red-800/50 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition shadow-lg flex items-center justify-center gap-1.5 text-sm cursor-pointer"
            >
              <Save size={16} />
              Save Subject
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null; // null if creating a new item
  subjects: Subject[];
  onSave: (data: { name: string; subjectId: number; duration: number; priority: number }) => void;
  onArchive?: () => void;
  onDelete?: () => void;
  prefillSubjectId?: number | null;
}

export function ItemModal({
  isOpen,
  onClose,
  item,
  subjects,
  onSave,
  onArchive,
  onDelete,
  prefillSubjectId,
}: ItemModalProps) {
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState(0);
  const [duration, setDuration] = useState(30);
  const [priority, setPriority] = useState(2);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setSubjectId(item.subjectId);
      setDuration(item.duration);
      setPriority(item.priority);
    } else {
      setName('');
      setSubjectId(prefillSubjectId || (subjects.length > 0 ? subjects[0].id : 0));
      setDuration(30);
      setPriority(2);
    }
  }, [item, subjects, prefillSubjectId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && subjectId > 0) {
      onSave({
        name: name.trim(),
        subjectId,
        duration: Number(duration),
        priority: Number(priority),
      });
    }
  };

  const activeSubjects = subjects.filter(s => !s.isArchived);

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a0f1e]/95 border border-slate-700/60 backdrop-blur-xl w-full max-w-md p-8 rounded-2xl shadow-2xl flex flex-col">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-white">
            {item ? 'Edit Study Item' : 'New Study Item'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition p-1"
          >
            <X size={20} />
          </button>
        </div>
        {activeSubjects.length === 0 ? (
          <div className="text-center py-6">
            <AlertCircle className="mx-auto text-yellow-500 mb-3" size={32} />
            <p className="text-slate-300 text-sm mb-4">
              You must create at least one active subject before adding items.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition font-semibold"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Item Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition"
                placeholder="e.g. Quick Sort Algorithm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Subject
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(Number(e.target.value))}
                required
                className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition"
              >
                {activeSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Duration (min)
                </label>
                <input
                  type="number"
                  min="5"
                  max="240"
                  step="5"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  required
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="1">Low (1)</option>
                  <option value="2">Medium (2)</option>
                  <option value="3">High (3)</option>
                </select>
              </div>
            </div>
            <div className="pt-4 flex gap-2">
              {item && onArchive && (
                <button
                  type="button"
                  onClick={onArchive}
                  className="px-3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition border border-slate-700/50 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Archive size={12} />
                  {item.isArchived ? 'Restore' : 'Archive'}
                </button>
              )}
              {item && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-3 py-3 bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition border border-red-800/50 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              )}
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition shadow-lg text-sm flex items-center justify-center gap-1 cursor-pointer"
              >
                <Save size={14} />
                Save Item
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

interface SleepModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMinutes: number;
  onConfirm: (utilizedMinutes: number) => void;
}

export function SleepModal({
  isOpen,
  onClose,
  targetMinutes,
  onConfirm,
}: SleepModalProps) {
  const targetHours = (targetMinutes / 60).toFixed(1);
  const [actualHours, setActualHours] = useState(targetHours);

  useEffect(() => {
    setActualHours((targetMinutes / 60).toFixed(1));
  }, [targetMinutes, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hrs = parseFloat(actualHours);
    if (!isNaN(hrs) && hrs >= 0) {
      onConfirm(Math.round(hrs * 60));
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a0f1e]/95 border border-slate-700/60 backdrop-blur-xl w-full max-w-sm p-8 rounded-2xl shadow-2xl flex flex-col text-center">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
          <Clock className="text-yellow-500" />
          End of Day
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          Log your actual study time before advancing to the next day.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Actual Time Utilized
            </label>
            <div className="flex items-center justify-center gap-2">
              <input
                type="number"
                step="0.1"
                min="0"
                max="24"
                value={actualHours}
                onChange={(e) => setActualHours(e.target.value)}
                required
                className="w-24 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-center text-xl font-bold focus:outline-none focus:border-blue-500 font-mono"
              />
              <span className="text-slate-400 font-medium">hours</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Capacity was: <span className="text-blue-400 font-bold font-mono">{targetHours}</span> hrs
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition shadow-lg cursor-pointer"
          >
            Log & Finish Day
          </button>
        </form>
      </div>
    </div>
  );
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProfileName: string;
  initialFolderName: string;
  onSave: (profileName: string, folderName: string) => void;
}

export function ProfileModal({
  isOpen,
  onClose,
  initialProfileName,
  initialFolderName,
  onSave,
}: ProfileModalProps) {
  const [profileName, setProfileName] = useState('');
  const [folderName, setFolderName] = useState('');

  useEffect(() => {
    setProfileName(initialProfileName);
    setFolderName(initialFolderName);
  }, [initialProfileName, initialFolderName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (profileName.trim()) {
      onSave(profileName.trim(), folderName.trim() || 'revisiondata');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a0f1e]/95 border border-slate-700/60 backdrop-blur-xl w-full max-w-sm p-8 rounded-2xl shadow-2xl flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Local Database Vault</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition">
            <X size={18} />
          </button>
        </div>
        <p className="text-slate-400 text-xs mb-6 leading-relaxed">
          Your data is persisted in a local database vault, enabling full offline capabilities.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Your Profile Name
            </label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm transition"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Tauri Data Folder Name
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm font-mono transition"
              placeholder="revisiondata"
            />
          </div>
          <p className="text-[10px] text-slate-500">
            Storage operates locally using durable offline browser and platform mechanisms.
          </p>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg text-sm transition shadow-lg cursor-pointer"
          >
            Save Settings
          </button>
        </form>
      </div>
    </div>
  );
}

interface TimezoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTimezone: string | null;
  onSave: (timezone: string) => void;
}

export function TimezoneModal({
  isOpen,
  onClose,
  initialTimezone,
  onSave,
}: TimezoneModalProps) {
  const [timezone, setTimezone] = useState('Asia/Kolkata');

  useEffect(() => {
    if (initialTimezone) setTimezone(initialTimezone);
  }, [initialTimezone, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(timezone);
  };

  const zones = [
    { value: 'America/New_York', label: 'United States (EST)' },
    { value: 'America/Los_Angeles', label: 'United States (PST)' },
    { value: 'Europe/London', label: 'United Kingdom (GMT)' },
    { value: 'Europe/Paris', label: 'France (CET)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Asia/Tokyo', label: 'Japan (JST)' },
    { value: 'Australia/Sydney', label: 'Australia (AEST)' },
    { value: 'America/Toronto', label: 'Canada (EST)' },
    { value: 'America/Sao_Paulo', label: 'Brazil (BRT)' },
    { value: 'Africa/Johannesburg', label: 'South Africa (SAST)' },
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a0f1e]/95 border border-slate-700/60 backdrop-blur-xl w-full max-w-sm p-8 rounded-2xl shadow-2xl flex flex-col">
        <h2 className="text-2xl font-bold text-white mb-2">Timezone Settings</h2>
        <p className="text-slate-400 text-sm mb-6">
          Sync your Orbit galaxy clock real-time to your location.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition text-sm"
          >
            {zones.map((z) => (
              <option key={z.value} value={z.value}>
                {z.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition shadow-lg cursor-pointer"
          >
            Save Timezone
          </button>
        </form>
      </div>
    </div>
  );
}

interface MessageBoxProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export function MessageBox({ isOpen, onClose, message }: MessageBoxProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a0f1e]/95 border border-slate-700/60 backdrop-blur-xl w-full max-w-xs p-6 rounded-2xl shadow-2xl flex flex-col text-center">
        <p className="text-white mb-6 text-sm leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className="bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg transition font-semibold text-xs cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
