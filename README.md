# lsr - leetcode spaced repetition

https://jhead.github.io/lsr

<img width="1870" height="1305" alt="image" src="https://github.com/user-attachments/assets/ab5fc08a-3769-4370-bea5-ad4e3941df49" />

A spaced repetition webapp that presents flash cards for Leetcode problems with optimal strategy. 

Fully client-side, runs entirely in your browser; no login, server, etc. Stores progress locally in your browser.

# User Guide

You're presented with a daily queue of problems. Each problem has a flash card with the optimal strategy including code, and a 0-5 spaced repetition rating.

Each card assumes you've already completed the problem on Leetcode already; if you haven't, there's an external link to the problem to do so.

The app will schedule a review of each problem after an initial review depending on your 0-5 rating, with a target of 2 weeks to re-review all.

## Why?

I found that my recall for solutions to problems I solved just days prior was poor and spaced repetition improved it without the time-consuming process of solving the problem again.

The general idea is that you can use this to build reliable recall for already completed Leetcode problems while continuing to solve new ones.

For example: if you've solved 25, you can review those here; each time you complete a new problem on LC, you can review the card and add it to your rotation.

## Keyboard Shortcuts

- `Arrow keys` to navigate problems
- `Num 0 - 5` to rate a problem (advances to the next automatically)
- `CMD + z` to undo

## Import / Export Progress

Progress (state) can be transferred between devices, e.g. from your laptop to phone.

1. Click `Settings` at the bottom
2. Copy state
3. On another device, open `Settings`
4. Paste state to import

## Reset Progress

You can irreversably remove your progress via `Settings`.
This will clear all completed problems/ratings as if starting from scratch.

If you copy your state beforehand, you can import it again after resetting to restore it to the prior state.

## Importing Problems

The app comes with gpt-5-mini processed Leetcode top 150 using the code under `pipeline/`.
You can freely create and import your own problem set using the following schema.

[Problem json schema](./problem-set.schema.json)

### Example Problem JSON

```json
[
  {
    "id": 20,
    "title": "Valid Parentheses",
    "slug": "valid-parentheses",
    "difficulty": "Easy",
    "tags": [
      "String",
      "Stack"
    ],
    "description": "Given a string s containing only the characters '()[]{}', determine whether the string is a valid parentheses sequence: every closing bracket must match the most recent unmatched opening bracket of the same type and all brackets must be closed. Constraints: 1 <= s.length <= 10^4.",
    "example": {
      "input": "s = \"([])\"",
      "output": "true"
    },
    "optimal_strategy": "Use a stack: push opening brackets, and for each closing bracket check the stack top matches the corresponding opening bracket and pop it; reject on mismatch or if the stack is empty, and accept only if the stack is empty at the end.\n\n```typescript\nfunction isValid(s: string): boolean {\n  const pairs: Record<string, string> = { ')': '(', '}': '{', ']': '[' };\n  const stack: string[] = [];\n\n  for (const ch of s) {\n    if (ch === '(' || ch === '{' || ch === '[') {\n      stack.push(ch);\n    } else {\n      if (stack.length === 0 || stack[stack.length - 1] !== pairs[ch]) {\n        return false;\n      }\n      stack.pop();\n    }\n  }\n\n  return stack.length === 0;\n}\n\n// Example usage:\n// console.log(isValid(\"([])\")); // true\n```",
    "complexity": {
      "time": "O(n)",
      "space": "O(n)"
    }
  }
]
```
