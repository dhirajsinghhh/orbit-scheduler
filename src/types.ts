/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Subject {
  id: number;
  name: string;
  color: string;
  isArchived: boolean;
  order: number;
}

export interface ReviewHistory {
  date: string; // ISO String
  score: number; // Quality score 0-5
}

export interface Item {
  id: number;
  subjectId: number;
  name: string;
  duration: number; // minutes
  priority: number; // 1 = Low, 2 = Medium, 3 = High
  isArchived: boolean;
  order: number;
  
  // SuperMemo-2 (SM-2) Spaced Repetition Parameters
  repetitions: number;
  ef: number; // easiness factor (defaults to 2.5)
  interval: number; // in days
  lastReviewed: string | null; // ISO String
  nextReviewDate: string | null; // ISO String
  history: ReviewHistory[];

  // Runtime Schedule Flags
  scheduledToday?: boolean;
  postponed?: boolean;
  dynamicScore?: number;

  // Runtime Visual Properties (used on Canvas)
  orbitAngle?: number;
  orbitSpeed?: number;
  currentOrbitRadius?: number;
  targetOrbitRadius?: number;
  x?: number;
  y?: number;
}

export interface ActivityLog {
  dateStr: string; // YYYY-MM-DD
  allocated: number; // minutes
  utilized: number; // minutes
}

export type SortMode = 'default' | 'custom' | 'asc' | 'desc';
