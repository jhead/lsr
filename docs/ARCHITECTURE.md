# Technical Architecture

## 1. System Components

The architecture comprises two main parts: an asynchronous **Data Pipeline** and a synchronous **Frontend Application**.

### 1.1 Data Pipeline (Node.js + TypeScript)

- **Runtime**: Node.js with native ES modules.
- **API Client**: Simple authenticated wrapper using `fetch` for LeetCode GraphQL API requests.
- **LLM Integration**: OpenAI SDK (`openai` package) to process editorial text.
- **Processor**: Sequential script that iterates through problem IDs, includes simple rate limiting (delay between requests), and invokes the LLM.
- **Storage**: Writes output JSON directly to web app's `public/problems.json` using Node.js `fs` module.

### 1.2 Web App (React + Vite + Tailwind)

- **Framework**: React with Vite for build tooling and development server.
- **State Management**: React Context API to manage the `problems.json` data and session progress. Simple hooks pattern suffices for this use case.
- **Storage Layer**: Direct localStorage API usage with TypeScript wrappers for type safety.
- **Scheduler**: Filters `problems.json` against localStorage timestamps to generate the daily "Due" review queue.

---

## 2. Data Models

### 2.1 Problem Schema (`problems.json`)

```typescript
interface LeetCodeProblem {
  id: number;
  title: string;
  slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  optimal_strategy: string; // LLM generated
  complexity: {
    time: string;
    space: string;
  };
}
```

### 2.2 User Progress Schema (`localStorage`)

```typescript
interface UserProgress {
  [problemId: number]: {
    iterations: number;     // 'n' in SM-2
    easinessFactor: number; // 'EF' in SM-2
    interval: number;       // 'I' in SM-2
    lastReviewed: number;   // Epoch timestamp
    nextReview: number;     // Epoch timestamp
  };
}
```

---

## 3. Algorithmic Implementation (SM-2)

The scheduling logic implements the SM-2 spaced repetition algorithm. For a given quality score (`q`) in the range [0, 5]:

- If `q < 3`:
    - Reset iterations (`n = 0`) and interval (`I = 1`).
- If `q ≥ 3`:
    - If `n = 0` → `I = 1`
    - If `n = 1` → `I = 6`
    - If `n > 1` → `I = I_prev × EF`
- **EF Update**:  
  `EF = EF + (0.1 − (5 − q) × (0.08 + (5 − q) × 0.02))`
- **Constraint**:  
  EF must not drop below 1.3.

---

## 4. Ingestion Workflow

1. **Fetch**: Node.js script executes a GraphQL query for each problem using native `fetch`.
2. **Transform**: Strip HTML tags from the editorial using a simple regex or `cheerio` if needed, then send clean text to the LLM.
3. **Prompt**: `"Summarize the most optimal approach for [Title] in one sentence. Provide time and space complexity."`
4. **Append**: Add the result to the flat JSON array.
5. **Static Export**: Write `problems.json` directly to the web app's `public/` directory.

---

## 5. Build and Deployment

- **Development**: Vite dev server with hot module replacement.
- **Build**: Vite production build generates static assets in `dist/` directory.
- **Data File**: `problems.json` is copied to `public/` during build (via Vite's static asset handling).
- **Deployment**: Deploy the `dist/` directory to any static hosting service (Vercel, Netlify, GitHub Pages). No server-side rendering or build-time data fetching required.
