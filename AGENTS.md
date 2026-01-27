# AGENTS.md

## Project Overview
AI Inventory Tool is a full-stack application designed to help users manage inventories using AI for object recognition and data extraction.
- Frontend: Next.js (App Router), TypeScript, Tailwind CSS.
- Backend: FastAPI (Python), SQLModel, PostgreSQL.
- Infrastructure: Docker Compose (backend, frontend, db, redis).

## Repository Structure
- `frontend/`: Next.js app, Tailwind CSS, NextAuth, SWR, UI components.
- `backend/`: FastAPI app, SQLModel models, routers, services, Alembic migrations.
- `docker-compose.yml`: Local stack definition.

## Operational Instructions

### Docker Commands (CRITICAL)
All Docker commands must use `sudo`. Prefer `sudo docker compose` (no dash).
- Start or rebuild full stack: `sudo docker compose up --build -d`
- Rebuild a single service: `sudo docker compose up --build -d backend`
- Stream logs: `sudo docker compose logs -f backend`
- Stop stack: `sudo docker compose down`

### Build, Lint, Test
Backend runs inside Docker; frontend can run locally for UI-only work.

Frontend (local, from `frontend/`):
- Install deps: `npm ci`
- Dev server: `npm run dev`
- Production build: `npm run build`
- Lint: `npm run lint`

Backend (Docker):
- Run API in Docker: `sudo docker compose up --build -d backend`
- Run migrations in container: `sudo docker compose exec backend alembic upgrade head`
- Run all tests: `sudo docker compose exec backend pytest`
- Run a single test: `sudo docker compose exec backend pytest path/to/test_file.py::test_name`
- Run tests by pattern: `sudo docker compose exec backend pytest -k "pattern"`

Notes:
- Backend entrypoint also runs `alembic upgrade head` plus manual migration scripts.
- There are no frontend test scripts configured yet.
- In this environment, all test commands must use legacy `sudo docker-compose` (with a dash).

### Runtime Configuration
- Backend config uses `backend/app/core/config.py` with `.env` and `pydantic-settings`.
- Frontend uses `NEXT_PUBLIC_API_URL` for API base; `/api/proxy` rewrites to backend via `frontend/next.config.js`.
- Docker Compose passes `.env` into backend/frontend services.
- Media files live in `/app/media` inside the backend container and are mounted as `app_media` volume.
- When running locally without Docker, ensure backend URL matches `API_BASE_URL`.

## Code Style and Design Guidelines

### UI/UX: Brutalism Design System (STRICT)
All UI changes, new components, and improvements must follow the established brutalist template.
- Visuals: high contrast, bold typography, stark borders, monochrome palette.
- Components: reuse existing UI primitives like `BrutalistSelect` and `Button`.
- Styling rules:
  - Thick solid black borders (`border-black`).
  - Sharp corners (`rounded-none`).
  - Uppercase headers and labels.
  - Mono-spaced fonts for technical details (`font-mono`).
  - Avoid soft shadows and rounded corners unless already in that file.

### Frontend Conventions (Next.js, TypeScript)
File layout and rendering:
- App Router lives in `frontend/app/` with layouts in `frontend/app/layout.tsx`.
- Client components must include `"use client"` as the first statement.
- Route protection is enforced in `frontend/middleware.ts`; keep protected routes redirecting to `/login`.

Imports and formatting:
- Use the `@/` path alias for project-root imports (see `frontend/tsconfig.json`).
- Group imports by purpose and keep the existing file order to avoid churn.
- Formatting varies by file; follow the local style (some files omit semicolons).
- Use 2-space indentation in TS/TSX; keep JSX props aligned to existing patterns.

Types and naming:
- TypeScript runs in `strict` mode; avoid `any` unless unavoidable (NextAuth session is an exception).
- Use `interface` for props and object shapes, `type` for unions or utility types.
- Components are PascalCase; hooks are `useXxx`; constants are UPPER_SNAKE.

Data fetching and errors:
- Use `API_BASE_URL` from `frontend/lib/config.ts` for API calls.
- Prefer SWR with `useAuthFetcher` for authenticated requests.
- On fetch failure, throw a typed `Error` and surface UI errors via `sonner` toasts.
- For 401 responses, follow the existing pattern: sign out and redirect to `/login`.

Styling and layout:
- Tailwind CSS is used directly in className strings; prefer `cn()` and `cva()` for variants.
- Keep wireframe visual language from `frontend/app/globals.css` (black borders, no radius).
- Avoid adding new fonts; reuse Space Grotesk and Space Mono already configured.

Frontend data flow:
- Prefer SWR with `useAuthFetcher` for authenticated endpoints.
- For cache updates, use `useSWRConfig().mutate` with the same key string used to fetch.
- For background uploads, use `UploadQueueContext` in `frontend/context/UploadQueueContext.tsx`.
- Use `sonner` for toast notifications; avoid `alert`.

### Backend Conventions (FastAPI, SQLModel)
Project layout:
- API routers live in `backend/app/routers/` and are mounted in `backend/app/main.py`.
- Data models live in `backend/app/models.py`; use SQLModel fields and relationships.

Imports and formatting:
- Use 4-space indentation in Python files.
- Group imports into standard library, third-party, and local, but follow file-local order when editing existing files.

Types and naming:
- Use type hints for public functions and Pydantic models.
- Use snake_case for functions and variables; PascalCase for classes; UPPER_SNAKE for constants.

Database and models:
- Use `Session` from `app.database.get_session` and `session.exec(select(...))`.
- Use `session.get(Model, id)` for primary key lookups.
- Preserve JSON structures:
  - Folder settings live in `InventoryGroup.settings`.
  - Item metadata lives in `Item.meta_data`.
- When updating these structures, merge carefully and avoid overwriting unknown keys.

Error handling and auth:
- Raise `HTTPException` with explicit status codes for API errors.
- Catch external or I/O errors, log them, and return 500 with a safe message.
- Use dependencies like `get_current_user` and `get_inventory_scope` for access control.
- Reuse `validate_group_write_access` for group write permissions.
- Add rate limits with `@limiter.limit` where appropriate.

Migrations and scripts:
- Alembic config lives in `backend/alembic.ini`, migrations in `backend/migrations/`.
- The backend entrypoint runs `alembic upgrade head` plus `migrate_language.py`, `migrate_share.py`, and `migrate_public_item.py`.
- Keep migration scripts idempotent and safe for repeated runs.

## Feature Implementation Guidelines
- Specialized inventories: Inventory Types include `GENERAL`, `NATURE`, `PLACES`.
- When modifying items or folders, respect the `settings` (folder) and `meta_data` (item) JSON shapes.

## Security Considerations
- Do not hardcode secrets. Use `.env` and `pydantic-settings` in `backend/app/core/config.py`.
- Access to backend APIs is authenticated via JWT (NextAuth in the frontend).
- Avoid logging tokens, credentials, or API keys.

## File Hygiene
- Ignore compiled artifacts like `__pycache__/` and `*.pyc` when creating patches.
- Avoid committing local media or database volume contents.

## Cursor/Copilot Rules
- No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` found in this repo.

## Commit Guidelines
- Use clear, descriptive commit messages.
