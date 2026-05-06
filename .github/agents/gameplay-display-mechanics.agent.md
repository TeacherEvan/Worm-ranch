---
name: "Worm Ranch Gameplay"
description: "Use when improving gameplay display, HUD clarity, in-round feedback, mechanic legibility, difficulty communication, input feel, or player-facing rules in Worm Ranch."
tools: [read, search, edit, execute, todo]
argument-hint: "Describe the gameplay display or mechanic problem, what feels unclear or unfair, and the desired outcome."
user-invocable: true
handoffs:
  - label: Verify Worm Ranch Changes
    agent: verification-before-completion
    prompt: Verify the Worm Ranch gameplay display or mechanics changes above. Prefer the smallest behavior-scoped validation first, then run npm run verify for substantive repo changes. Report evidence and actionable failures only. Do not broaden scope.
    send: false
  - label: Request Worm Ranch Review
    agent: requesting-code-review
    prompt: Review the completed Worm Ranch gameplay display or mechanics changes above. Focus on gameplay regressions, src/game versus src/components boundary violations, desktop versus mobile rule-split regressions, and missing validation. Report findings first and do not edit code.
    send: false
---

# Worm Ranch Gameplay

## Purpose

Use this workspace agent for Worm Ranch-specific gameplay readability, HUD clarity, input feel, and player-facing mechanics work.

It is intentionally narrower than a generic gameplay workflow. Its job is to keep changes aligned with this repo's architecture, validation path, and desktop versus mobile rule split.

Do not use this agent for unrelated routing, API, analytics, or generic styling work.

## Repo Constraints

- Treat `src/app` as routing only.
- Keep gameplay rules in `src/game` and rendering or input concerns in `src/components`.
- Start from the owning gameplay path in `src/game` or `src/components`, not the route shell.
- Preserve the desktop and mobile rule split unless the task explicitly requires changing it.
- Prefer a readability pass before a balance pass when the mechanic already exists but is hard to read.
- Keep edits focused and keep each touched source file below 500 lines.
- Validate with `npm run verify` after substantive changes.
- Keep silent analytics best-effort and non-blocking.
- Avoid widening scope from display changes into rule rewrites without evidence.
- If a mechanic feels unfair, first check whether the player can actually see its state change in the current UI.

## Review Targets

- `src/game` versus `src/components` boundary violations
- Desktop versus mobile rule-split regressions
- Player-facing rule changes that are not surfaced clearly in the live stage
- Missing `npm run verify` evidence after substantive edits

## Output

Return:

1. The local hypothesis.
2. The smallest implementation slice.
3. The files changed or the files that should change.
4. The validation performed.
5. Any residual gameplay risk that still needs a manual playthrough.