import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { LeetCodeProblem } from '../types';

export function FileUpload() {
  const { setProblems } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

      // Save to localStorage and update state
      setProblems(problems);
      console.log(`Successfully loaded ${problems.length} problems from file`);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
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

  return (
    <div className="flex-1 flex items-center justify-center bg-black h-full p-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-900 rounded-lg shadow-md p-8 text-center border border-gray-800">
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <h2 className="text-2xl font-bold text-white mb-2">
              Upload Problems File
            </h2>
            <p className="text-gray-400 mb-4">
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
            className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
              isUploading
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {isUploading ? 'Loading...' : 'Choose File'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-900/30 border border-red-800 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="mt-6 text-sm text-gray-500">
            <p>The JSON file should be an array of problem objects with the required fields.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
