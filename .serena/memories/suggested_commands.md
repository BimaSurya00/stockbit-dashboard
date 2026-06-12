# Suggested Commands

## Development
```bash
# Backend (from stockbit-dashboard/backend)
rtk npm run dev          # Start backend with nodemon (port 3001)

# Frontend (from stockbit-dashboard/frontend)
rtk npm run dev          # Vite dev server (port 5173, proxies /api → :3001)
```

## Production
```bash
# Backend
npm start                # node server.js

# Frontend
npm run build            # Production build to dist/
npm run preview          # Preview production build
```

## Docker
```bash
# Backend (from backend/)
docker compose up -d     # 3 containers: API + snapshot-worker + price-worker

# Frontend (from frontend/)
docker compose up -d     # Nginx serving static + reverse proxy
```

## Seed Database
```bash
curl -X POST http://localhost:3001/api/emiten/seed
```

## PM2
```bash
pm2 start ecosystem.config.js
pm2 logs stockbit-server
```

## Git
Always prefix with `rtk`: `rtk git status`, `rtk git diff`, etc.