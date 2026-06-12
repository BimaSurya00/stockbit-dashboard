# Task Completion Checklist

When a coding task is considered done:

## Backend Changes
```bash
cd backend && node -c server.js    # Syntax check server.js
cd backend && node -c db.js        # Syntax check db.js
# Check any other modified files similarly
```

## Frontend Changes
```bash
cd frontend && rtk npm run build   # Verify production build succeeds
```

## General
- Verify no broken imports (manually review changed files)
- If modifying API routes, check frontend consumers are updated
- If modifying Mongoose models, consider seed/migration impact
- No unit tests configured — manual verification required
- No linter configured — manual code review needed

## Docker (if deployment config changed)
```bash
cd backend && docker compose build --no-cache
cd frontend && docker compose build --no-cache
```