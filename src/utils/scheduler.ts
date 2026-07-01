/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Item, Subject, ActivityLog } from '../types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function getDaysUntilDue(item: Item, simulatedDateStr: string): number {
  if (!item.nextReviewDate) return 0;
  const nextDate = new Date(item.nextReviewDate);
  const curDate = new Date(simulatedDateStr);
  return (nextDate.getTime() - curDate.getTime()) / MS_PER_DAY;
}

export function calculateMastery(item: Item, simulatedDateStr: string): number {
  if (item.repetitions === 0) return 0;
  
  const efScore = Math.min(1, Math.max(0, (item.ef - 1.3) / 1.7));
  const repScore = Math.min(1, item.repetitions / 8);
  const stability = (efScore * 0.6) + (repScore * 0.4);

  const curTime = new Date(simulatedDateStr).getTime();
  const lastReviewedTime = item.lastReviewed ? new Date(item.lastReviewed).getTime() : curTime;
  const daysSince = (curTime - lastReviewedTime) / MS_PER_DAY;
  const overdueDays = daysSince - item.interval;
  
  let penalty = 0;
  if (overdueDays > 0) {
    const recencyWeight = 1 - stability;
    penalty = Math.min(1.0, (overdueDays / (item.interval || 1)) * 0.2) * recencyWeight;
  }

  const finalScore = stability * (1 - penalty);
  return Math.max(0, Math.min(100, Math.round(finalScore * 100)));
}

export function calculateSubjectMastery(subjectId: number, items: Item[], simulatedDateStr: string): number {
  const myItems = items.filter(i => i.subjectId === subjectId && !i.isArchived);
  if (myItems.length === 0) return 0;
  let sum = 0;
  myItems.forEach(i => {
    sum += calculateMastery(i, simulatedDateStr);
  });
  return Math.round(sum / myItems.length);
}

export function reviewItem(item: Item, quality: number, simulatedDateStr: string): Item {
  const simulatedDate = new Date(simulatedDateStr);
  const lastReviewed = simulatedDate.toISOString();
  
  const newHistory = [
    ...(item.history || []),
    { date: lastReviewed, score: quality }
  ];

  let repetitions = item.repetitions;
  let interval = item.interval;

  if (quality >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * item.ef);
    }
    repetitions++;
  } else {
    repetitions = 0;
    interval = 1;
  }

  // Easiness factor calculation according to SM-2 formula
  const ef = Math.max(
    1.3,
    item.ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  const nextReviewDate = new Date(simulatedDate.getTime() + (interval * MS_PER_DAY)).toISOString();

  return {
    ...item,
    repetitions,
    interval,
    ef,
    lastReviewed,
    nextReviewDate,
    history: newHistory
  };
}

export function generateMockData(simulatedDateStr: string): {
  subjects: Subject[];
  items: Item[];
  activityLogs: ActivityLog[];
} {
  const simulatedDate = new Date(simulatedDateStr);
  
  const subjects: Subject[] = [
    { id: 1, name: 'Computer Science', color: '#3b82f6', isArchived: false, order: 0 },
    { id: 2, name: 'Mathematics', color: '#a855f7', isArchived: false, order: 1 }
  ];

  const items: Item[] = [
    {
      id: 1,
      subjectId: 1,
      name: 'Data Structures',
      duration: 45,
      priority: 3,
      isArchived: false,
      order: 0,
      repetitions: 4,
      ef: 2.1,
      interval: 5,
      lastReviewed: new Date(simulatedDate.getTime() - 5 * MS_PER_DAY).toISOString(),
      nextReviewDate: new Date(simulatedDate.getTime() - 1 * MS_PER_DAY).toISOString(),
      history: [
        { date: new Date(simulatedDate.getTime() - 5 * MS_PER_DAY).toISOString(), score: 4 }
      ]
    },
    {
      id: 2,
      subjectId: 1,
      name: 'System Design',
      duration: 60,
      priority: 3,
      isArchived: false,
      order: 1,
      repetitions: 1,
      ef: 1.8,
      interval: 2,
      lastReviewed: new Date(simulatedDate.getTime() - 2 * MS_PER_DAY).toISOString(),
      nextReviewDate: new Date(simulatedDate.getTime() + 2 * MS_PER_DAY).toISOString(),
      history: [
        { date: new Date(simulatedDate.getTime() - 2 * MS_PER_DAY).toISOString(), score: 3 }
      ]
    },
    {
      id: 3,
      subjectId: 2,
      name: 'Linear Algebra',
      duration: 40,
      priority: 2,
      isArchived: false,
      order: 0,
      repetitions: 3,
      ef: 1.6,
      interval: 4,
      lastReviewed: new Date(simulatedDate.getTime() - 4 * MS_PER_DAY).toISOString(),
      nextReviewDate: new Date(simulatedDate.getTime() - 3 * MS_PER_DAY).toISOString(),
      history: [
        { date: new Date(simulatedDate.getTime() - 4 * MS_PER_DAY).toISOString(), score: 4 }
      ]
    }
  ];

  // Generate 365 days of mock activity history
  const activityLogs: ActivityLog[] = [];
  const histDate = new Date(simulatedDate);
  histDate.setDate(histDate.getDate() - 365);
  
  for (let i = 0; i < 365; i++) {
    const alloc = 120 + Math.random() * 180; // 2 to 5 hours
    const utilPct = Math.random() < 0.15 ? 0 : 0.4 + Math.random() * 0.6; // some empty days
    activityLogs.push({
      dateStr: histDate.toISOString().split('T')[0],
      allocated: Math.round(alloc),
      utilized: Math.round(alloc * utilPct)
    });
    histDate.setDate(histDate.getDate() + 1);
  }

  return { subjects, items, activityLogs };
}
