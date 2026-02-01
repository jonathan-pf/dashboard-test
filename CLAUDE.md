# Claude Instructions

## Before Starting Work

**Important:** Before making any changes, always check for and pull remote changes:

```bash
git fetch origin
git log HEAD..origin/<current-branch> --oneline
```

If there are commits you don't have, pull them first:

```bash
git pull origin <current-branch>
```

This prevents merge conflicts and ensures you're working with the latest code.

## Version Management

**Important:** After making any code changes to this project, always increment the version number in:

- File: `src/pages/Settings.tsx`
- Location: The "About" section, line containing `Airtable Dashboard PWA vX.X.X`

Use semantic versioning:
- Patch (X.X.**1**): Bug fixes, small improvements
- Minor (X.**1**.0): New features, non-breaking changes
- Major (**2**.0.0): Breaking changes, major rewrites

## Deployment

To deploy changes to production:

1. Commit changes: `git add . && git commit -m "Your message"`
2. Push to remote: `git push`
3. Deploy to Vercel: `vercel --prod`

The production URL is: https://dashboard-iota-topaz-17.vercel.app

## Known Issues

### iPad External Keyboard Viewport Jump Bug

**Symptoms:** When typing in input fields on iPad with an external keyboard (e.g., Magic Keyboard), the screen jumps down, hiding the input from view.

**Root Cause:** iOS has a built-in "scroll element into view" behavior when inputs receive focus. The existing fixes in `main.tsx` (visualViewport.resize listener) only work for on-screen keyboards because external keyboards don't trigger viewport resize events.

**Existing Mitigations (partial):**
- `src/main.tsx` lines 8-32: Listens to `visualViewport.resize` to restore scroll position
- `src/index.css` lines 36-55: Uses `-webkit-fill-available` and `100dvh` for dynamic viewport
- `index.html`: Viewport meta with `interactive-widget=resizes-content`

**Current Fix Approach:**
- Using `focus({ preventScroll: true })` instead of `autoFocus` attribute on inputs
- This tells the browser not to auto-scroll when focusing elements

**If issue persists, additional options:**
1. Enhanced JS fix to prevent scroll during `focusin` event with `requestAnimationFrame`
2. CSS `scroll-margin-top/bottom` on input elements
3. Change viewport meta to `interactive-widget=overlays-content`
