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

