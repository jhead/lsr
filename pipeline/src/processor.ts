import { LeetCodeClient } from './leetcode-client.js';
import { LLMProcessor } from './llm-processor.js';
import type { LeetCodeProblem } from './types.js';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Main processor that orchestrates the ingestion pipeline
 */
export class IngestionProcessor {
  private readonly leetcodeClient: LeetCodeClient;
  private readonly llmProcessor: LLMProcessor;
  private readonly rateLimitDelay: number; // milliseconds between requests
  private readonly outputPath: string;
  private readonly maxConcurrency: number;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    openaiApiKey: string,
    rateLimitDelay: number,
    maxConcurrency: number = 1,
    outputPath?: string
  ) {
    this.leetcodeClient = new LeetCodeClient();
    this.llmProcessor = new LLMProcessor(openaiApiKey);
    this.rateLimitDelay = rateLimitDelay;
    this.maxConcurrency = maxConcurrency;
    this.outputPath = outputPath || join(__dirname, '../../public/problems.json');
  }

  /**
   * Initializes the output JSON file with an empty array if it doesn't exist
   */
  private async initializeOutputFile(): Promise<void> {
    if (!existsSync(this.outputPath)) {
      const outputDir = dirname(this.outputPath);
      await mkdir(outputDir, { recursive: true });
      await writeFile(this.outputPath, '[]\n', 'utf-8');
      console.log(`[INFO] Initialized output file: ${this.outputPath}`);
    }
  }

  /**
   * Appends a problem to the JSON file (thread-safe via write queue)
   */
  private async appendProblem(problem: LeetCodeProblem): Promise<void> {
    // Serialize writes using a queue to prevent race conditions
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        await this.initializeOutputFile();
        
        // Read existing problems
        const existingContent = await readFile(this.outputPath, 'utf-8');
        const existingProblems: LeetCodeProblem[] = JSON.parse(existingContent);
        
        // Check if problem already exists (by ID) and update, otherwise append
        const existingIndex = existingProblems.findIndex((p) => p.id === problem.id);
        if (existingIndex >= 0) {
          existingProblems[existingIndex] = problem;
          console.log(`[INFO] Updated existing problem: ${problem.title}`);
        } else {
          existingProblems.push(problem);
          console.log(`[INFO] Added new problem: ${problem.title}`);
        }
        
        // Write updated array back to file
        const jsonContent = JSON.stringify(existingProblems, null, 2);
        await writeFile(this.outputPath, jsonContent + '\n', 'utf-8');
        console.log(`[SUCCESS] Wrote problem to ${this.outputPath}`);
      } catch (error) {
        console.error(`[ERROR] Failed to write problem to file:`, error);
        throw error;
      }
    });
    
    await this.writeQueue;
  }

  /**
   * Processes a single problem and writes it to JSON immediately
   */
  async processProblem(slug: string): Promise<LeetCodeProblem | null> {
    try {
      console.log(`[INFO] Fetching problem: ${slug}`);
      const response = await this.leetcodeClient.fetchProblem(slug);

      const problem = response.data.question;
      
      if (!problem) {
        console.warn(`[WARN] No problem data found for slug: ${slug}`);
        return null;
      }

      // Process problem description and editorial in a single LLM call
      const descriptionContent = problem.content 
        ? this.llmProcessor.stripHtml(problem.content)
        : 'No description available';
      
      const editorialContent = problem.solution?.content
        ? this.llmProcessor.stripHtml(problem.solution.content)
        : undefined;

      console.log(`[INFO] Processing problem with LLM: ${problem.title}`);
      const llmResult = await this.llmProcessor.processProblem(
        problem.title,
        descriptionContent,
        editorialContent
      );

      // Combine strategy and code snippet with backticks for code block (TypeScript)
      const optimalStrategy = `${llmResult.strategy}\n\n\`\`\`typescript\n${llmResult.codeSnippet}\n\`\`\``;

      const result: LeetCodeProblem = {
        id: parseInt(problem.questionId),
        title: problem.title,
        slug: problem.titleSlug,
        difficulty: problem.difficulty as 'Easy' | 'Medium' | 'Hard',
        tags: problem.topicTags.map((tag) => tag.name),
        description: llmResult.description,
        example: {
          input: llmResult.example.input,
          output: llmResult.example.output,
        },
        optimal_strategy: optimalStrategy,
        complexity: {
          time: llmResult.timeComplexity,
          space: llmResult.spaceComplexity,
        },
      };

      console.log(`[SUCCESS] Processed: ${problem.title}`);
      
      // Write to JSON immediately
      await this.appendProblem(result);
      
      return result;
    } catch (error) {
      console.error(`[ERROR] Failed to process problem ${slug}:`, error);
      return null;
    }
  }

  /**
   * Processes multiple problems with parallel execution and rate limiting
   * Each problem is written to JSON immediately after processing
   */
  async processProblems(slugs: string[]): Promise<LeetCodeProblem[]> {
    const results: LeetCodeProblem[] = [];
    const runningJobs = new Map<number, Promise<LeetCodeProblem | null>>();
    let jobId = 0;
    let nextIndex = 0;

    // Process with concurrency limit
    while (nextIndex < slugs.length || runningJobs.size > 0) {
      // Start new jobs up to concurrency limit
      while (runningJobs.size < this.maxConcurrency && nextIndex < slugs.length) {
        const slug = slugs[nextIndex++];
        const currentJobId = jobId++;
        const jobIndex = nextIndex - 1;
        
        const jobPromise = this.processProblemWithRateLimit(slug, jobIndex)
          .then((result) => {
            if (result) {
              results.push(result);
            }
            return result;
          })
          .catch((error) => {
            console.error(`[ERROR] Job failed for ${slug}:`, error);
            return null;
          })
          .finally(() => {
            runningJobs.delete(currentJobId);
          });
        
        runningJobs.set(currentJobId, jobPromise);
      }

      // Wait for at least one job to complete before starting more
      if (runningJobs.size > 0) {
        await Promise.race(Array.from(runningJobs.values()));
      }
    }

    return results;
  }

  /**
   * Processes a single problem with rate limiting applied per job
   */
  private async processProblemWithRateLimit(
    slug: string,
    index: number
  ): Promise<LeetCodeProblem | null> {
    // Apply rate limiting delay before processing
    if (index > 0) {
      await this.delay(this.rateLimitDelay);
    }
    return this.processProblem(slug);
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
