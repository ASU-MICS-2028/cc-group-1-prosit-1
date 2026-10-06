# ADR 0012: React Compiler

- **Status:** Accepted (2026-10-04)
- **Date:** 2026-10-04

## Context
Cheap phones have slow CPUs. Unnecessary re-renders cost battery and responsiveness, and hand-written `useMemo`/`useCallback` is easy to get wrong.

## Decision
Enable the **React Compiler** at build time through `@rolldown/plugin-babel` with `reactCompilerPreset()` from `@vitejs/plugin-react` (see `vite.config.ts`).

## Alternatives considered
- **Native Rust compiler option (`react({ compiler: true })`):** faster builds but marked experimental in plugin-react 6; revisit when stable.
- **Manual memoisation:** more code, more mistakes.

## Consequences
- Automatic memoisation with no runtime library cost.
- Slightly slower builds because Babel runs on component files.
