# Product Requirements Document: LSR

## 1. Product Purpose

LSR (pronounced "laser") facilitates the long-term retention of algorithmic strategies through a decoupled ingestion and review system. It shifts the focus from repetitive coding to the memorization of optimal patterns and complexities.

## 2. User Requirements

- **Pattern Recall:** Users must identify the optimal time/space complexity and algorithmic approach before viewing the solution.
- **Performance Tracking:** Users must see a daily queue of problems scheduled by an SM-2 algorithm.
- **Zero Latency:** The web application must function as a client-side SPA once the data payload is retrieved.

## 3. Functional Requirements

### 3.1 Ingestion Pipeline (CLI Tool)

- **Problem Retrieval:** Fetch problem descriptions and official editorials via LeetCode GraphQL API.
- **Strategy Extraction:** Utilize an LLM to distill official editorials into a single "optimal strategy" string and specific Big-O notation.
- **Data Output:** Generate a static `problems.json` containing the processed dataset.

### 3.2 Web Application (Client)

- **Data Hydration:** Load `problems.json` into the application state on initial mount.
- **Spaced Repetition Engine:** Calculate review intervals using the SM-2 algorithm based on user-reported recall quality (0–5).
- **Local Persistence:** Store user-specific metadata (review history, next review date, interval, easiness factor) in browser `localStorage`.
- **Strategy Reveal UI:** Toggle visibility for the "Optimal Strategy" and "Complexity" fields.

## 4. Non-Functional Requirements

- **Language:** All components implemented in TypeScript.
- **Styling:** Responsive UI built with Tailwind CSS.
- **Portability:** The web app must be deployable as a static site (e.g., Vercel, Netlify, GitHub Pages).
