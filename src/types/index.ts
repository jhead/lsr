export interface LeetCodeProblem {
  id: number;
  title: string;
  slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  description: string;
  example: {
    input: string;
    output: string;
  };
  optimal_strategy: string;
  complexity: {
    time: string;
    space: string;
  };
}

export interface ProblemProgress {
  iterations: number;     // 'n' in SM-2
  easinessFactor: number; // 'EF' in SM-2
  interval: number;       // 'I' in SM-2
  lastReviewed: number;   // Epoch timestamp
  nextReview: number;     // Epoch timestamp
  lapseCount: number;     // Number of times card was failed (quality < 3)
  isLeech: boolean;       // True if lapseCount >= 8
}

export interface UserProgress {
  [problemId: number]: ProblemProgress;
}

// For undo functionality
export interface ReviewHistoryEntry {
  problemId: number;
  previousProgress: ProblemProgress | null; // null if this was the first review
  timestamp: number;
}
