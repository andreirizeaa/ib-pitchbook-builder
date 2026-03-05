# AI Pitch Deck Builder

An AI-powered pitch book generation system for investment banking. Built as a monorepo with Turborepo.

## Architecture

- `apps/web` — Next.js 15 web application (marketing + authenticated dashboard)
- `apps/service` — Express.js TypeScript backend with Swagger docs
- `packages/shared-types` — Shared TypeScript type definitions

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS v4, shadcn/ui
- **Backend:** Express.js, TypeScript, Swagger/OpenAPI
- **Database:** Supabase (PostgreSQL, Auth, Storage)
- **AI:** Google Gemini (content planning, VLM editing)
- **Document:** PptxGenJS (PowerPoint generation)
- **Data:** Yahoo Finance API, SEC EDGAR API

## Getting Started

```bash
npm install
npm run dev
```

Web app runs on `http://localhost:3000`, service on `http://localhost:3002`.

## Environment Variables

Copy `.env.example` to `.env.local` in each app and fill in your keys.
