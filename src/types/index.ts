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

export interface UserProgress {
  [problemId: number]: {
    iterations: number;     // 'n' in SM-2
    easinessFactor: number; // 'EF' in SM-2
    interval: number;       // 'I' in SM-2
    lastReviewed: number;   // Epoch timestamp
    nextReview: number;     // Epoch timestamp
  };
}
