#!/usr/bin/env node

import { IngestionProcessor } from './processor.js';
import { LeetCodeClient } from './leetcode-client.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Main entry point for the ingestion pipeline
 * 
 * Usage:
 *   OPENAI_API_KEY=your_key node dist/index.js [problem-slugs-file]
 *   OPENAI_API_KEY=your_key USE_DEFAULTS=true node dist/index.js
 *   OPENAI_API_KEY=your_key USE_CACHED_SLUGS=true node dist/index.js
 * 
 * Environment variables:
 *   OPENAI_API_KEY - Required: Your OpenAI API key
 *   RATE_LIMIT_DELAY - Optional: Delay between requests in ms (default: 500)
 *   MAX_CONCURRENCY - Optional: Maximum parallel jobs (default: 1)
 *   OUTPUT_PATH - Optional: Path to output JSON file
 *   USE_DEFAULTS - Optional: If "true", use default problem set instead of fetching from API (default: false)
 *   USE_CACHED_SLUGS - Optional: If "true", force use cached slugs file (fails if cache doesn't exist). If "false", skip cache and fetch from API. If not set, use cache if it exists, otherwise fetch from API.
 *   TOP_N_PROBLEMS - Optional: Number of top frequent problems to fetch (default: 150)
 *   FETCH_ALL_PROBLEMS - Optional: If "true", fetch all problems instead of top N (default: false)
 *   LEETCODE_SESSION - Optional: LeetCode session token (required for frequency sorting)
 *   LEETCODE_CSRF_TOKEN - Optional: LeetCode CSRF token (required for frequency sorting)
 * 
 * By default, fetches top 150 most frequent problem slugs from the LeetCode API and caches to a file.
 * On subsequent runs, the cached file is used automatically if it exists.
 * If a problem-slugs-file is provided, it will be used instead.
 * If USE_DEFAULTS=true, uses a default set of problems.
 * If USE_CACHED_SLUGS=true, forces using the cached file (fails if cache doesn't exist).
 */

const DEFAULT_PROBLEMS: string[] = [];

const CACHE_DIR = join(__dirname, '.cache');
const SLUGS_CACHE_FILE = join(CACHE_DIR, 'problem-slugs.txt');

/**
 * Reads slugs from the cache file
 */
async function readCachedSlugs(): Promise<string[] | null> {
  try {
    if (existsSync(SLUGS_CACHE_FILE)) {
      console.log(`[INFO] Reading cached slugs from: ${SLUGS_CACHE_FILE}`);
      const content = await readFile(SLUGS_CACHE_FILE, 'utf-8');
      const slugs = content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      console.log(`[INFO] Found ${slugs.length} cached slugs`);
      return slugs;
    }
    return null;
  } catch (error) {
    console.warn(`[WARN] Failed to read cache file:`, error);
    return null;
  }
}

/**
 * Writes slugs to the cache file
 */
async function writeCachedSlugs(slugs: string[]): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const content = slugs.join('\n') + '\n';
    await writeFile(SLUGS_CACHE_FILE, content, 'utf-8');
    console.log(`[INFO] Cached ${slugs.length} slugs to: ${SLUGS_CACHE_FILE}`);
  } catch (error) {
    console.warn(`[WARN] Failed to write cache file:`, error);
    // Don't throw - caching failure shouldn't stop the pipeline
  }
}

async function main() {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    console.error('[ERROR] OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  const rateLimitDelay = parseInt(process.env.RATE_LIMIT_DELAY || '500', 10);
  const maxConcurrency = parseInt(process.env.MAX_CONCURRENCY || '1', 10);
  const outputPath = process.env.OUTPUT_PATH;

  const processor = new IngestionProcessor(
    openaiApiKey,
    rateLimitDelay,
    maxConcurrency,
    outputPath
  );

  // Read problem slugs from file, cache, API (default), or use defaults
  let problemSlugs: string[] = [];
  const useDefaults = process.env.USE_DEFAULTS === 'true';
  const useCachedSlugs = process.env.USE_CACHED_SLUGS === 'true';
  const slugsFile = process.argv[2];

  if (slugsFile) {
    // If a file is provided, use it (highest priority)
    try {
      console.log(`[INFO] Reading problem slugs from: ${slugsFile}`);
      const content = await readFile(slugsFile, 'utf-8');
      problemSlugs = content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    } catch (error) {
      console.error(`[ERROR] Failed to read slugs file: ${slugsFile}`, error);
      process.exit(1);
    }
  } else if (useDefaults) {
    // Use default problems if explicitly requested
    console.log('[INFO] Using default problem set');
    problemSlugs = DEFAULT_PROBLEMS;
  } else {
    // Handle cache vs API fetch
    const useCachedSlugsEnv = process.env.USE_CACHED_SLUGS;
    const skipCache = useCachedSlugsEnv === 'false';
    
    if (useCachedSlugs) {
      // User explicitly requested cached slugs (USE_CACHED_SLUGS=true)
      const cachedSlugs = await readCachedSlugs();
      if (cachedSlugs && cachedSlugs.length > 0) {
        problemSlugs = cachedSlugs;
        console.log('[INFO] Using cached slugs (USE_CACHED_SLUGS=true)');
      } else {
        console.error('[ERROR] USE_CACHED_SLUGS=true but cache file does not exist');
        process.exit(1);
      }
    } else if (skipCache) {
      // User explicitly requested to skip cache (USE_CACHED_SLUGS=false)
      console.log('[INFO] Skipping cache (USE_CACHED_SLUGS=false), fetching from API...');
      try {
        const leetcodeClient = new LeetCodeClient();
        const fetchAll = process.env.FETCH_ALL_PROBLEMS === 'true';
        const topN = parseInt(process.env.TOP_N_PROBLEMS || '150', 10);
        
        if (fetchAll) {
          console.log('[INFO] Fetching all problem slugs from LeetCode API...');
          problemSlugs = await leetcodeClient.fetchAllProblemSlugs();
        } else {
          console.log(`[INFO] Fetching top ${topN} most frequent problem slugs from LeetCode API...`);
          problemSlugs = await leetcodeClient.fetchTopFrequentProblemSlugs(topN);
        }
        
        // Cache the fetched slugs for future runs
        await writeCachedSlugs(problemSlugs);
      } catch (error) {
        console.error('[ERROR] Failed to fetch slugs from API:', error);
        process.exit(1);
      }
    } else {
      // Default behavior: check cache first, use if available, otherwise fetch from API
      const cachedSlugs = await readCachedSlugs();
      if (cachedSlugs && cachedSlugs.length > 0) {
        // Use cached slugs automatically
        problemSlugs = cachedSlugs;
        console.log('[INFO] Using cached slugs (skipping API fetch)');
      } else {
        // Cache doesn't exist, fetch from API
        try {
          const leetcodeClient = new LeetCodeClient();
          const fetchAll = process.env.FETCH_ALL_PROBLEMS === 'true';
          const topN = parseInt(process.env.TOP_N_PROBLEMS || '150', 10);
          
          if (fetchAll) {
            console.log('[INFO] Fetching all problem slugs from LeetCode API...');
            problemSlugs = await leetcodeClient.fetchAllProblemSlugs();
          } else {
            console.log(`[INFO] Fetching top ${topN} most frequent problem slugs from LeetCode API...`);
            problemSlugs = await leetcodeClient.fetchTopFrequentProblemSlugs(topN);
          }
          
          // Cache the fetched slugs for future runs
          await writeCachedSlugs(problemSlugs);
        } catch (error) {
          console.error('[ERROR] Failed to fetch slugs from API:', error);
          process.exit(1);
        }
      }
    }
  }

  if (problemSlugs.length === 0) {
    console.error('[ERROR] No problem slugs to process');
    process.exit(1);
  }

  console.log(`[INFO] Starting ingestion pipeline for ${problemSlugs.length} problems`);
  console.log(`[INFO] Rate limit delay: ${rateLimitDelay}ms`);
  console.log(`[INFO] Max concurrency: ${maxConcurrency}`);

  try {
    const problems = await processor.processProblems(problemSlugs);
    
    if (problems.length === 0) {
      console.error('[ERROR] No problems were successfully processed');
      process.exit(1);
    }

    console.log(`[SUCCESS] Pipeline completed. Processed ${problems.length}/${problemSlugs.length} problems`);
  } catch (error) {
    console.error('[ERROR] Pipeline failed:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[FATAL] Unhandled error:', error);
  process.exit(1);
});
