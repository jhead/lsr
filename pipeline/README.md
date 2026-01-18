# LSR Ingestion Pipeline

This is the ingestion pipeline for LSR. It fetches problem data from LeetCode's GraphQL API and uses an LLM to extract optimal strategies and complexity information.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set your OpenAI API key:
```bash
export OPENAI_API_KEY=your_api_key_here
```

## Usage

### Build the project:
```bash
npm run build
```

### Run the pipeline:

**With default problems:**
```bash
npm start
```

**With a file containing problem slugs (one per line):**
```bash
npm start problems.txt
```

**With custom output path:**
```bash
OUTPUT_PATH=./output/problems.json npm start
```

**With custom rate limiting:**
```bash
RATE_LIMIT_DELAY=3000 npm start  # 3 second delay between requests
```

### Development mode (with tsx):
```bash
npm run dev problems.txt
```

## Environment Variables

- `OPENAI_API_KEY` (required): Your OpenAI API key
- `RATE_LIMIT_DELAY` (optional): Delay between requests in milliseconds (default: 2000)
- `OUTPUT_PATH` (optional): Path to output JSON file (default: `../../public/problems.json`)

## Input Format

If providing a file with problem slugs, it should contain one slug per line:
```
two-sum
add-two-numbers
longest-substring-without-repeating-characters
```

## Output

The pipeline generates a `problems.json` file with the following structure:
```json
[
  {
    "id": 1,
    "title": "Two Sum",
    "slug": "two-sum",
    "difficulty": "Easy",
    "tags": ["Array", "Hash Table"],
    "optimal_strategy": "Use a hash map to store seen numbers and their indices...",
    "complexity": {
      "time": "O(n)",
      "space": "O(n)"
    }
  }
]
```
