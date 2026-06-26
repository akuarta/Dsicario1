---
name: code-review
description: Performs structured code reviews before marking code as complete. Checks style, patterns, security, and performance.
---

# Code Review Skill

## Objective
Perform thorough, structured code reviews that catch bugs, enforce best practices, and ensure code quality before delivery.

## Review Checklist

### 1. CORRECTNESS
- Does the code do what was requested?
- Are edge cases handled (null, empty, undefined)?
- Are error boundaries implemented?
- Will this work on both mobile and web platforms?

### 2. STYLE & READABILITY
- Variable/function names are descriptive and consistent
- No single-letter variables except loop counters
- Functions do ONE thing (Single Responsibility)
- Maximum function length: ~30 lines
- No magic numbers - use named constants

### 3. SECURITY
- No hardcoded secrets, API keys, or credentials
- User input is validated and sanitized
- No `eval()` or `innerHTML` usage
- Firebase rules properly configured
- Authentication checks present on protected routes

### 4. PERFORMANCE
- No unnecessary re-renders (React.memo, useMemo, useCallback where needed)
- Lists use `key` prop correctly (no index as key for dynamic lists)
- Images are optimized and lazy-loaded
- No memory leaks (cleanup in useEffect)
- FlatList used instead of ScrollView for long lists

### 5. PATTERNS (React Native + Expo)
- Platform-specific code uses `Platform.select()` or `Platform.OS`
- Styles use `StyleSheet.create()` not inline objects
- Navigation follows React Navigation patterns
- No direct DOM manipulation without platform check

### 6. MAINTAINABILITY
- No duplicated code (DRY principle)
- Complex logic has comments explaining WHY not WHAT
- Constants extracted for reuse
- Components are properly sized and split

## Review Format

When reviewing code, output:

```
## Code Review Summary

### Critical Issues (Must Fix)
- [ ] Issue 1: Description + file:line

### Warnings (Should Fix)
- [ ] Issue 1: Description + file:line

### Suggestions (Nice to Have)
- [ ] Issue 1: Description

### Approved: YES/NO
```

## Common Anti-Patterns to Flag
- `useEffect` with no dependency array
- `useEffect` with async functions directly
- Mutating state directly instead of using setter
- Creating objects/functions inside render without memoization
- Using `any` type in TypeScript
- Catching errors without handling them
- Console.log statements in production code
