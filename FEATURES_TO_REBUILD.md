# Features to Rebuild

This document lists features that were removed when reverting to the Jan 3rd 2026 working version to fix iOS PWA sync issues. Please pause after each feature is built to let me check if sync is still workng.

## Missing Features

### 1. Next Week's Goals Page
- **Route:** `/goals/next-week`
- **Description:** A dedicated page to view and manage goals for the upcoming week
- **Components needed:** `src/pages/NextWeekGoals.tsx`
- **Hooks needed:** `useNextWeek()`, `useNextWeekGoals()`

### 2. Goal Editing
- **Description:** Ability to edit Goal Name and Area on Goals pages
- **Affected pages:** Goals, LongTermGoals

### 3. Week Summary Widgets
- **Description:** Additional StatCard widgets on Dashboard showing:
  - Steps count
  - Stages count
  - Features count
  - Reps total
  - Goal Confidence average
- **Fields needed in WeeksRecord:** `steps`, `stages`, `features`, `goalConfidence`

### 4. Words Chart Year Rollover Fix
- **Description:** Fix for words chart to handle year rollover correctly
- **Affected file:** Likely in chart components

### 5. CLAUDE.md and README.md
- **Description:** Documentation files for the project
- **Note:** These can be recreated from scratch

## Notes

- The iOS sync issue appeared after Jan 7th 2026
- The Jan 3rd version is confirmed working on iOS PWA
- When rebuilding features, test iOS sync after each addition to identify which change causes the regression
