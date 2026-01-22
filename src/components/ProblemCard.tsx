import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import type { LeetCodeProblem } from '../types';
import { useApp } from '../context/AppContext';

// Quality score descriptions for the full scale
const QUALITY_DESCRIPTIONS: Record<number, string> = {
  0: 'Complete blackout',
  1: 'Incorrect, but remembered upon seeing answer',
  2: 'Incorrect, but answer felt familiar',
  3: 'Correct with serious difficulty',
  4: 'Correct with hesitation',
  5: 'Perfect response',
};

interface ProblemCardProps {
  problem: LeetCodeProblem;
  currentIndex?: number;
  totalCount?: number;
  onReviewSubmitted?: (quality: number) => void;
  canSkip?: boolean;
  onSkip?: () => void;
}

/**
 * Component to render strategy content with code block formatting
 */
function StrategyContent({ content }: { content: string }) {

  // Split content by code blocks (```typescript ... ```)
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts: Array<{ type: 'text' | 'code'; lang?: string; content: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex, match.index).trim(),
      });
    }
    
    // Add code block
    parts.push({
      type: 'code',
      lang: match[1] || '',
      content: match[2].trim(),
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.substring(lastIndex).trim(),
    });
  }

  // If no code blocks found, render as plain text
  if (parts.length === 0) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  // Map language names to Prism language identifiers
  const mapLanguage = (lang?: string): string => {
    if (!lang) return 'typescript';
    const langLower = lang.toLowerCase();
    if (langLower === 'ts' || langLower === 'typescript') return 'typescript';
    if (langLower === 'js' || langLower === 'javascript') return 'javascript';
    if (langLower === 'tsx') return 'tsx';
    if (langLower === 'jsx') return 'jsx';
    if (langLower === 'json') return 'json';
    if (langLower === 'python' || langLower === 'py') return 'python';
    if (langLower === 'java') return 'java';
    if (langLower === 'cpp' || langLower === 'c++') return 'cpp';
    if (langLower === 'c') return 'c';
    if (langLower === 'go') return 'go';
    if (langLower === 'rust') return 'rust';
    return langLower;
  };

  return (
    <div className="space-y-3">
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <div
              key={index}
              className="rounded-lg overflow-hidden border border-gray-700 overflow-x-auto"
            >
              <SyntaxHighlighter
                language={mapLanguage(part.lang)}
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                }}
              >
                {part.content}
              </SyntaxHighlighter>
            </div>
          );
        } else {
          return (
            <div key={index} className="whitespace-pre-wrap">
              {part.content}
            </div>
          );
        }
      })}
    </div>
  );
}

export function ProblemCard({ problem, currentIndex, totalCount, onReviewSubmitted, canSkip, onSkip }: ProblemCardProps) {
  const { userProgress } = useApp();
  const progress = userProgress[problem.id];
  const isLeech = progress?.isLeech ?? false;
  const lapseCount = progress?.lapseCount ?? 0;
  const [showStrategy, setShowStrategy] = useState(false);

  const difficultyColors = {
    Easy: 'bg-green-900/30 text-green-300 border-green-700',
    Medium: 'bg-yellow-900/30 text-yellow-300 border-yellow-700',
    Hard: 'bg-red-900/30 text-red-300 border-red-700',
  };

  const handleQualityClick = (quality: number) => {
    //submitReview(problem.id, quality); // Handled by parent now
    onReviewSubmitted?.(quality); // Pass quality to parent
  };

  return (
    <div className={`bg-gray-900 rounded-lg shadow-md p-4 md:p-6 border relative ${isLeech ? 'border-orange-700/60' : 'border-gray-800'}`}>
      {/* Leech warning banner */}
      {isLeech && (
        <div className="mb-4 px-3 py-2 bg-orange-900/30 border border-orange-700/50 rounded-lg">
          <div className="flex items-center gap-2 text-orange-300 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>
              <strong>Leech detected</strong> — This problem has been failed {lapseCount} times. Consider reviewing the fundamentals or breaking it into smaller concepts.
            </span>
          </div>
        </div>
      )}
      
      {/* Top right controls: counter and skip */}
      <div className="absolute top-3 right-3 md:top-5 md:right-5 flex flex-col items-end gap-2">
        {currentIndex !== undefined && totalCount !== undefined && (
          <div className="px-2 py-1 md:px-3 md:py-1.5 bg-gray-800/60 backdrop-blur-sm rounded-md border border-gray-700/50">
            <span className="text-xs md:text-sm font-semibold text-gray-300 tabular-nums">
              <span className="text-white">{currentIndex + 1}</span>
              <span className="mx-1 md:mx-1.5 text-gray-500">/</span>
              <span>{totalCount}</span>
            </span>
          </div>
        )}
        {canSkip && onSkip && (
          <button
            onClick={onSkip}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Skip for today
          </button>
        )}
      </div>
      <div className="flex items-start justify-between mb-3 md:mb-4 pr-12 md:pr-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg md:text-xl font-semibold text-white break-words">
              {problem.title}
            </h3>
            <a
              href={`https://leetcode.com/problems/${problem.slug}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-800 transition-colors"
              aria-label={`Open ${problem.title} on LeetCode`}
              title="Open on LeetCode"
            >
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${difficultyColors[problem.difficulty]}`}
            >
              {problem.difficulty}
            </span>
            {showStrategy && problem.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
          <div>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              {problem.description}
            </p>
            
            {/* Example */}
            {problem.example && (
              <div className="bg-black/50 rounded-lg p-3 md:p-4 border border-gray-800">
                <h4 className="font-semibold text-white mb-2 md:mb-3 text-sm">
                  Example:
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-300">Input: </span>
                    <code className="bg-gray-800 text-gray-200 px-2 py-1 rounded font-mono text-xs break-all">
                      {problem.example.input}
                    </code>
                  </div>
                  <div>
                    <span className="font-medium text-gray-300">Output: </span>
                    <code className="bg-gray-800 text-gray-200 px-2 py-1 rounded font-mono text-xs break-all">
                      {problem.example.output}
                    </code>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setShowStrategy(!showStrategy)}
            className="px-4 md:px-5 py-2 md:py-2.5 bg-gradient-to-r from-blue-600/80 to-blue-700/80 text-white rounded-lg border border-blue-500/50 hover:from-blue-500/90 hover:to-blue-600/90 hover:border-blue-400/60 hover:shadow-lg hover:shadow-blue-900/50 transition-all duration-200 font-medium shadow-sm text-sm md:text-base"
          >
            {showStrategy ? 'Hide' : 'Show'} Strategy
          </button>
        </div>

        {showStrategy && (
          <div className="bg-black/50 rounded-lg p-3 md:p-4 mb-4 space-y-3 border border-gray-800 overflow-x-auto">
            <div>
              <h4 className="font-semibold text-white mb-2">Optimal Strategy</h4>
              <div className="text-gray-300 text-sm">
                <StrategyContent content={problem.optimal_strategy} />
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Complexity</h4>
              <div className="flex gap-4 text-sm text-gray-300">
                <span>
                  <span className="font-medium">Time:</span> {problem.complexity.time}
                </span>
                <span>
                  <span className="font-medium">Space:</span> {problem.complexity.space}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-gray-800 pt-4">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            How well did you recall the strategy? (0-5)
          </label>
          <div className="flex gap-2 flex-wrap">
            {[0, 1, 2, 3, 4, 5].map(quality => (
              <button
                key={quality}
                onClick={() => handleQualityClick(quality)}
                className="px-4 py-2 rounded transition-colors bg-gray-800 text-gray-300 hover:bg-gray-700"
              >
                {quality}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400">
            {Object.entries(QUALITY_DESCRIPTIONS).map(([score, desc]) => (
              <p key={score}>
                <span className="font-medium text-gray-300">{score}</span> = {desc}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
