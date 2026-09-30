---
name: atomic-commits
description: Structures Git commits to be small, focused, and well-documented with conventional commit messages.
---

# Atomic Commits Skill

## Objective
Create clean, small, focused Git commits that are easy to review, revert, and understand.

## Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring without behavior change
- `style`: Formatting, no logic change
- `test`: Adding or updating tests
- `docs`: Documentation only
- `chore`: Build, config, dependencies
- `perf`: Performance improvement
- `ci`: CI/CD changes
- `revert`: Reverting a commit

### Scope (Optional)
Component or area affected:
```
feat(auth): add Google Sign-In button
fix(scroll): prevent scroll freeze on web
refactor(navigation): extract tab config
```

## Rules for Atomic Commits

### 1. ONE Logical Change Per Commit
- Adding a button + fixing a bug = 2 commits
- Refactoring + adding feature = 2 commits
- Each commit should be independently understandable

### 2. Commit Should Compile/Work
- Never commit broken code (unless WIP with clear intent)
- Each commit should be deployable

### 3. Don't Mix Unrelated Changes
- Don't fix typo + add feature in same commit
- Don't update deps + refactor code in same commit

### 4. Write for Future You
- "fix bug" is bad
- "fix: prevent crash when user taps empty list" is good

## Commit Examples

### Good Atomic Commits
```bash
# Each is one logical change, clear description
git commit -m "feat(profile): add user avatar upload"
git commit -m "fix(home): resolve scroll freeze on web platform"
git commit -m "refactor(utils): extract date formatting helpers"
git commit -m "test(auth): add tests for login validation"
git commit -m "chore: update expo to v55"
git commit -m "style(components): fix lint warnings in Button"
```

### Bad Commits (Don't Do This)
```bash
# Too vague
git commit -m "update"
git commit -m "fix stuff"
git commit -m "WIP"

# Multiple changes
git commit -m "add login and fix scroll and update deps"

# Too long
git commit -m "feat: add a new button that when you press it it does something really cool on the home screen but only on web not on mobile"
```

## Multi-Line Commits (Complex Changes)

```bash
git commit -m "feat(checkout): implement payment flow

- Add Stripe integration for credit cards
- Add PayPal redirect flow
- Handle payment confirmation webhooks
- Add loading states during processing

Closes #123"
```

## Commit Workflow

### Before Committing
```bash
git status                    # See what changed
git diff                      # See actual changes
git diff --staged             # See what will be committed
```

### Staging Selectively
```bash
git add -p                    # Stage chunks interactively
git add src/utils/helper.js   # Stage specific file
```

### Verifying Commit
```bash
git log --oneline -5          # See recent commits
git log -1                    # See last commit details
```

## Branch Strategy (Optional)
```
main
├── feat/user-profile
├── fix/scroll-freeze
└── refactor/auth-logic
```

## Red Flags (Split the Commit)
- More than 3 files changed for a "small fix"
- Mix of test + implementation changes
- Commit message has "and" in it
- You can't describe the change in one sentence
