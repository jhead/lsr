import { useRef, useState } from 'react';
import { CloudUpload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { LeetCodeProblem } from '../types';

interface FileUploadModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  variant?: 'modal' | 'fullpage';
}

/**
 * Validates and parses problems from JSON data
 */
function validateAndParseProblems(data: unknown): LeetCodeProblem[] {
  // Validate that it's an array
  if (!Array.isArray(data)) {
    throw new Error('JSON file must contain an array of problems.');
  }

  // Validate that each item has required fields (basic validation)
  const problems: LeetCodeProblem[] = [];
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Item at index ${i} is not an object.`);
    }

    const problem = item as Partial<LeetCodeProblem>;
    if (
      typeof problem.id !== 'number' ||
      typeof problem.title !== 'string' ||
      typeof problem.slug !== 'string' ||
      typeof problem.difficulty !== 'string' ||
      !Array.isArray(problem.tags) ||
      typeof problem.description !== 'string' ||
      !problem.example ||
      typeof problem.example.input !== 'string' ||
      typeof problem.example.output !== 'string' ||
      typeof problem.optimal_strategy !== 'string' ||
      !problem.complexity ||
      typeof problem.complexity.time !== 'string' ||
      typeof problem.complexity.space !== 'string'
    ) {
      throw new Error(`Item at index ${i} is missing required fields or has invalid types.`);
    }

    problems.push(item as LeetCodeProblem);
  }

  if (problems.length === 0) {
    throw new Error('JSON file must contain at least one problem.');
  }

  return problems;
}

export function FileUploadModal({ isOpen = true, onClose, variant = 'modal' }: FileUploadModalProps) {
  const { setProblems } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const isModal = variant === 'modal';

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // Read file as text
      const text = await file.text();

      // Parse JSON
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error('Invalid JSON file. Please select a valid JSON file.');
      }

      // Validate and parse problems
      const problems = validateAndParseProblems(data);

      // Save to localStorage and update state
      setProblems(problems);
      console.log(`Successfully loaded ${problems.length} problems from file`);

      // Reset file input and close modal (if in modal mode)
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (isModal && onClose) {
        onClose();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while loading the file.';
      setError(errorMessage);
      console.error('Error loading file:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleLoadFromStatic = async () => {
    setError(null);
    setIsUploading(true);

    try {
      // Fetch problems.json from the static resource
      // Using the base path from vite.config.ts (/lsr/)
      const response = await fetch('/lsr/problems.json');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch problems.json: ${response.status} ${response.statusText}`);
      }

      // Parse JSON
      let data: unknown;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error('Invalid JSON file. The fetched file is not valid JSON.');
      }

      // Validate and parse problems
      const problems = validateAndParseProblems(data);

      // Save to localStorage and update state
      setProblems(problems);
      console.log(`Successfully loaded ${problems.length} problems from static resource`);

      // Close modal (if in modal mode)
      if (isModal && onClose) {
        onClose();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while loading the problems.';
      setError(errorMessage);
      console.error('Error loading problems from static resource:', err);
    } finally {
      setIsUploading(false);
    }
  };

  if (isModal && !isOpen) {
    return null;
  }

  const cardContent = (
        <div className="bg-gray-900 rounded-lg shadow-md p-8 text-center border border-gray-800">
          <div className="mb-6">
            <CloudUpload className={`mx-auto ${isModal ? 'h-12 w-12' : 'h-16 w-16'} text-gray-400 mb-4`} />
            <h2 className={`${isModal ? 'text-xl' : 'text-2xl'} font-bold text-white mb-2`}>
              {isModal ? 'Replace Problem Set' : 'Upload Problems File'}
            </h2>
            <p className={`text-gray-400 mb-4 ${isModal ? 'text-sm' : ''}`}>
              Select a JSON file containing your LeetCode problems
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Upload problems JSON file"
          />

          <button
            onClick={handleClick}
            disabled={isUploading}
            className={`w-full px-6 py-3 rounded-lg font-medium transition-colors mb-3 ${
              isUploading
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {isUploading ? 'Loading...' : 'Choose File'}
          </button>

          <div className="mb-4 flex items-center gap-3">
            <div className="flex-1 border-t border-gray-700"></div>
            <span className="text-sm text-gray-500">or</span>
            <div className="flex-1 border-t border-gray-700"></div>
          </div>

          <button
            onClick={handleLoadFromStatic}
            disabled={isUploading}
            className={`w-full px-6 py-3 rounded-lg font-medium transition-colors mb-4 ${
              isUploading
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
            }`}
          >
            {isUploading ? 'Loading...' : 'Top 150'}
          </button>

          {error && (
            <div className="mb-4 p-4 bg-red-900/30 border border-red-800 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {isModal && (
            <button
              onClick={onClose}
              disabled={isUploading}
              className="w-full px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}

          {!isModal && (
            <div className="mt-6 text-sm text-gray-500">
              <p>The JSON file should be an array of problem objects with the required fields.</p>
            </div>
          )}
        </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="max-w-md w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {cardContent}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-black h-full p-4">
      <div className="max-w-md w-full">
        {cardContent}
      </div>
    </div>
  );
}
