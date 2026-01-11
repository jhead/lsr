import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { LeetCodeProblem } from '../types';
import { useApp } from '../context/AppContext';

interface ProblemCardProps {
  problem: LeetCodeProblem;
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
              className="rounded-lg overflow-hidden border border-gray-700"
            >
              <SyntaxHighlighter
                language={mapLanguage(part.lang)}
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  borderRadius: '0.5rem',
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

export function ProblemCard({ problem }: ProblemCardProps) {
  const { submitReview } = useApp();
  const [showStrategy, setShowStrategy] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const difficultyColors = {
    Easy: 'bg-green-900/30 text-green-300 border-green-700',
    Medium: 'bg-yellow-900/30 text-yellow-300 border-yellow-700',
    Hard: 'bg-red-900/30 text-red-300 border-red-700',
  };

  const handleQualitySubmit = () => {
    if (selectedQuality !== null) {
      submitReview(problem.id, selectedQuality);
      setIsSubmitted(true);
      setShowStrategy(true);
    }
  };

  const handleReset = () => {
    setSelectedQuality(null);
    setIsSubmitted(false);
    setShowStrategy(false);
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-md p-6 border border-gray-800">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-semibold text-white">
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4 text-gray-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            </a>
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${difficultyColors[problem.difficulty]}`}
            >
              {problem.difficulty}
            </span>
            {(showStrategy || isSubmitted) && problem.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="mb-4">
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              {problem.description}
            </p>
            
            {/* Example */}
            {problem.example && (
              <div className="bg-black/50 rounded-lg p-4 border border-gray-800">
                <h4 className="font-semibold text-white mb-3 text-sm">
                  Example:
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-300">Input: </span>
                    <code className="bg-gray-800 text-gray-200 px-2 py-1 rounded font-mono text-xs">
                      {problem.example.input}
                    </code>
                  </div>
                  <div>
                    <span className="font-medium text-gray-300">Output: </span>
                    <code className="bg-gray-800 text-gray-200 px-2 py-1 rounded font-mono text-xs">
                      {problem.example.output}
                    </code>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {!isSubmitted && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setShowStrategy(!showStrategy)}
              className="px-4 py-2 bg-gray-800 text-white rounded border border-gray-600 hover:bg-gray-700 hover:border-gray-500 transition-colors"
            >
              {showStrategy ? 'Hide' : 'Show'} Strategy
            </button>
          </div>

          {showStrategy && (
            <div className="bg-black/50 rounded-lg p-4 mb-4 space-y-3 border border-gray-800">
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
                  onClick={() => setSelectedQuality(quality)}
                  className={`px-4 py-2 rounded transition-colors ${
                    selectedQuality === quality
                      ? 'bg-blue-800 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {quality}
                </button>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-400">
              <p>0 = Complete blackout</p>
              <p>3 = Correct response with difficulty</p>
              <p>5 = Perfect response</p>
            </div>
          </div>

          {selectedQuality !== null && (
            <button
              onClick={handleQualitySubmit}
              className="mt-4 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Submit Review
            </button>
          )}
        </div>
      )}

      {isSubmitted && (
        <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
          <p className="text-green-300 font-medium mb-2">Review submitted successfully!</p>
          <button
            onClick={handleReset}
            className="text-sm text-green-400 hover:text-green-300 underline"
          >
            Review again
          </button>
        </div>
      )}
    </div>
  );
}
