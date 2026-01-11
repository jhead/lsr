export interface LeetCodeProblem {
  id: number;
  title: string;
  slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  description: string; // LLM summarized problem description
  example: {
    input: string;
    output: string;
  };
  optimal_strategy: string; // LLM generated
  complexity: {
    time: string;
    space: string;
  };
}

export interface LeetCodeGraphQLResponse {
  data: {
    question: {
      questionId: string;
      title: string;
      titleSlug: string;
      difficulty: string;
      content?: string; // Problem description content (HTML)
      topicTags: Array<{ name: string }>;
      solution?: {
        content: string;
      };
    };
  };
}

export interface LeetCodeProblemListResponse {
  data: {
    problemsetQuestionList?: {
      total: number;
      questions: Array<{
        titleSlug: string;
        difficulty?: string;
      }>;
    };
    problemsetQuestionListV2?: {
      totalLength: number;
      questions: Array<{
        titleSlug: string;
        difficulty?: string;
        frequency?: number;
      }>;
    };
  };
}

export interface LLMResponse {
  description: string;
  example: {
    input: string;
    output: string;
  };
  strategy: string;
  codeSnippet: string;
  timeComplexity: string;
  spaceComplexity: string;
}
