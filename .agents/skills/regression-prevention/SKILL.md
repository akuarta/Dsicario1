---
name: regression-prevention
description: Prevents code regressions by enforcing incremental changes, preserving existing functionality, and managing context properly.
---

# Regression Prevention Skill

## Objective
Prevent the AI from breaking existing functionality when making changes. Enforce incremental modifications and preserve working code.

## Core Rules

### 1. NEVER REWRITE FULL FILES
When fixing an error or adding a feature:
- Identify the EXACT lines that need changing
- Provide ONLY the diff/patch for those lines
- Specify exact line numbers or class names where changes go

**Format:**
```
Change in: src/components/Header.js (lines 45-52)

OLD:
  <View style={styles.container}>

NEW:
  <View style={[styles.container, styles.fixed]}>

Add after line 23:
  const [isScrolled, setIsScrolled] = useState(false);
```

### 2. PRESERVE EXISTING STATE
Before making changes, acknowledge what currently works:
- Scroll behavior
- Navigation flow
- Platform-specific rendering
- Touch/click interactions
- Animations

### 3. ANCHOR YOUR CODE
When requesting fixes, always provide the current working code:

```
This is my current code that works:
[Paste code here]

Error: [Variable] is not defined

Tell me what line to add to THIS SPECIFIC CODE to define it, without changing anything else.
```

### 4. BLACK BOX APPROACH
Treat existing working code as untouchable:

```
Consider my current code as a 'Black Box' that cannot be modified.
To fix the missing imports or variables, give me the code to put
OUTSIDE or ABOVE that box, but do not touch what's inside.
```

### 5. IMPACT ANALYSIS REQUEST
Before receiving code, force analysis of consequences:

```
Before giving me the code for [feature], analyze if this change could:
- Break scrolling
- Break touch interactions
- Break platform-specific behavior
- Affect other components
If so, adjust to prevent it.
```

## Error Resolution Pattern

### When Missing Import/Variable
```
The error says [component/variable] is missing.
Do NOT rewrite the file. Give me ONLY:
1. The exact import line to add at the top
2. The exact line where to declare the variable
3. Where in my existing structure each goes
```

### When CSS/Style Breaks Scroll
Common causes to check:
- `overflow: 'hidden'` on parent container
- `height: 0` or missing height on scroll container
- `pointerEvents: 'none'` blocking touches
- `position: 'fixed'` without platform check
- Missing `flex: 1` on scroll wrapper

### When Component Doesn't Render
```
The [Component] isn't showing. Check:
1. Is it properly imported?
2. Is it in the render tree?
3. Are there conditional renders blocking it?
4. Is the style hiding it (display: none, opacity: 0)?
Give me ONLY the fix, not a rewrite.
```

## Context Management

### Keep Conversations Focused
- One issue per request
- Provide error messages verbatim
- Include file paths and line numbers
- Share relevant code snippets (not entire files)

### Prevent Context Loss
- Start new conversation for unrelated issues
- Reference previous decisions: "As we discussed..."
- Keep a change log in your project

## Validation Checklist

Before accepting any code change, verify:
- [ ] Does scroll still work?
- [ ] Do all buttons still press?
- [ ] Does navigation still function?
- [ ] Are platform checks preserved?
- [ ] Are existing imports still present?
- [ ] Are new variables properly declared?
- [ ] Is the change minimal and focused?

## Quick Reference Commands

### Request Patch Only
```
Don't rewrite. Give me a PATCH or DIFF only.
If variables or imports are missing, list them separately
without altering my layout or scroll.
```

### Validate Before Delivery
```
Before delivering this code, verify:
1. All existing imports are preserved
2. No scroll behavior is broken
3. Platform-specific code is intact
4. No unused variables are introduced
```

### Emergency Rollback Request
```
The last change broke [feature].
Show me exactly what to revert and what to keep.
Do not rewrite from scratch.
```
