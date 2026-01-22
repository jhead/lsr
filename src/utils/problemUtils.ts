import type { LeetCodeProblem, UserProgress, ProblemProgress } from '../types';

/**
 * Section types for the problem list UI
 */
export type ProblemSection = 
  | 'today'      // Due reviews + new cards for today
  | 'scheduled'  // Future reviews (not due yet)
  | 'backlog';   // New problems not in today's queue

/**
 * A problem with its computed status for display
 */
export interface ProblemWithSection {
  problem: LeetCodeProblem;
  section: ProblemSection;
  progress: ProblemProgress | null;
  /** Human-readable label like "Due", "New", "2d", "1w" */
  badge: string;
  /** Sort key within section (lower = earlier) */
  sortKey: number;
}

/**
 * Group header for rendering sections
 */
export interface SectionGroup {
  section: ProblemSection;
  label: string;
  problems: ProblemWithSection[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Format a timestamp into a human-readable badge
 */
function formatBadge(nextReview: number, now: number): string {
  const diff = nextReview - now;
  const days = Math.ceil(diff / DAY_MS);

  if (days < 0) {
    const overdue = Math.abs(days);
    return overdue === 1 ? '1d ago' : `${overdue}d ago`;
  } else if (days === 0) {
    return 'Due';
  } else if (days === 1) {
    return '1d';
  } else if (days < 7) {
    return `${days}d`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks}w`;
  } else {
    const months = Math.floor(days / 30);
    return `${months}mo`;
  }
}

/**
 * Get a unified, sorted list of problems with section assignments.
 * 
 * Sorting priority:
 * 1. Today's Queue: (Overdue + Due Today + Daily New Cards)
 * 2. Scheduled: (Future reviews, sorted by date)
 * 3. Backlog: (Remaining new problems, sorted by ID)
 */
export function getUnifiedProblemList(
  problems: LeetCodeProblem[],
  userProgress: UserProgress,
  dailyQueueIds: Set<number>
): ProblemWithSection[] {
  const now = Date.now();
  const result: ProblemWithSection[] = [];

  for (const problem of problems) {
    const progress = userProgress[problem.id] || null;
    
    let section: ProblemSection;
    let badge: string;
    let sortKey: number;

    if (!progress) {
      // New problem - check if it's in today's queue
      if (dailyQueueIds.has(problem.id)) {
        section = 'today';
        badge = 'New';
        // Sort new cards after reviews, by their position in queue
        sortKey = 1000 + problem.id;
      } else {
        section = 'backlog';
        badge = 'New';
        sortKey = problem.id;
      }
    } else {
      // Has progress - determine section by due date
      const daysUntilDue = (progress.nextReview - now) / DAY_MS;

      if (daysUntilDue <= 0) {
        // Overdue or due today
        section = 'today';
        badge = formatBadge(progress.nextReview, now);
        // Sort by how overdue (most overdue first), then by EF (lowest first)
        const overduenessFactor = Math.min(365, Math.abs(daysUntilDue));
        sortKey = -overduenessFactor * 100 + progress.easinessFactor;
      } else {
        // Future review - scheduled
        section = 'scheduled';
        badge = formatBadge(progress.nextReview, now);
        sortKey = progress.nextReview;
      }
    }

    result.push({ problem, section, progress, badge, sortKey });
  }

  // Sort: today first, then scheduled, then backlog
  // Within each section, sort by sortKey
  const sectionOrder: Record<ProblemSection, number> = {
    today: 0,
    scheduled: 1,
    backlog: 2,
  };

  result.sort((a, b) => {
    const sectionDiff = sectionOrder[a.section] - sectionOrder[b.section];
    if (sectionDiff !== 0) return sectionDiff;
    return a.sortKey - b.sortKey;
  });

  return result;
}

/**
 * Group problems by section for rendering with headers
 */
export function groupProblemsBySection(
  unifiedList: ProblemWithSection[]
): SectionGroup[] {
  const groups: Map<ProblemSection, ProblemWithSection[]> = new Map();

  for (const item of unifiedList) {
    const existing = groups.get(item.section) || [];
    existing.push(item);
    groups.set(item.section, existing);
  }

  const sectionLabels: Record<ProblemSection, string> = {
    today: "Today's Queue",
    scheduled: 'Scheduled',
    backlog: 'New Problems',
  };

  const sectionOrder: ProblemSection[] = ['today', 'scheduled', 'backlog'];

  const result: SectionGroup[] = [];
  for (const section of sectionOrder) {
    const problems = groups.get(section);
    if (problems && problems.length > 0) {
      result.push({
        section,
        label: sectionLabels[section],
        problems,
      });
    }
  }

  return result;
}

/**
 * Get just the flat array of problems in unified order (for navigation)
 */
export function getUnifiedProblemIds(
  problems: LeetCodeProblem[],
  userProgress: UserProgress,
  dailyQueueIds: Set<number>
): number[] {
  const unified = getUnifiedProblemList(problems, userProgress, dailyQueueIds);
  return unified.map(item => item.problem.id);
}
