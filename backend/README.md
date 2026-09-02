# SentinelDMS Backend

NestJS API — see the root `README.md` (one level up) for full setup instructions,
the auth test users, and notes on what's stubbed vs. real.

Quick start (assumes `docker compose up -d` already ran from the repo root):

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

Swagger: http://localhost:3000/api-docs
