# Tech Stack

## Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | v22 | Runtime (Docker) |
| Express | ^4.18.2 | HTTP server / API framework |
| Mongoose | ^9.6.1 | MongoDB ODM |
| MongoDB | Atlas | Database |
| jsonwebtoken | ^9.0.3 | JWT generation & verification |
| bcryptjs | ^3.0.3 | Password hashing (salt rounds: 12) |
| dotenv | ^16.3.1 | Environment variables |
| cors | ^2.8.5 | Cross-Origin |
| axios | ^1.6.0 | HTTP client (proxy to Stockbit API) |
| nodemon | ^3.0.1 | Dev auto-reload |
| technicalindicators | ^3.1.0 | TA calculations |
| yahoo-finance2 | ^3.15.2 | Yahoo Finance data (volume backfill) |

## Frontend
| Technology | Version | Purpose |
|---|---|---|
| Vue | ^3.5.32 | Composition API + <script setup> |
| Vite | ^8.0.10 | Build tool & dev server |
| Vue Router | ^5.0.7 | Client-side routing |
| Chart.js | ^4.5.1 | Chart rendering |
| vue-chartjs | ^5.3.3 | Vue wrapper for Chart.js |
| lightweight-charts | ^5.2.0 | Professional charting (TradingView-style) |
| Axios | ^1.16.0 | HTTP client |

## Infrastructure
- Docker + Docker Compose (multi-container)
- Nginx: static serving + reverse proxy
- PM2: production process manager
- GitHub Actions: CI/CD with self-hosted runner (stockbit-runner)

## No: TypeScript, UI library, state management library, CSS framework
- Plain JavaScript throughout
- Custom CSS only
- Reactive object in stores/auth.js (no Pinia/Vuex)
- Font: DM Sans + Inter (Google Fonts)