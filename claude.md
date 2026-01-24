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
