# AGENTS.md

## Project Overview
AI Inventory Tool is a full-stack application designed to help users manage inventories using AI for object recognition and data extraction.
- **Frontend**: Next.js (React), TypeScript, Tailwind CSS.
- **Backend**: FastAPI (Python), SQLModel, PostgreSQL.
- **Infrastructure**: Docker Compose.

## Operational Instructions

### Docker Commands (CRITICAL)
**All Docker commands must use `sudo`.** The project runs entirely on Docker.
- **Start/Restart**: `sudo docker compose up --build -d`
- **Logs**: `sudo docker compose logs -f [service_name]`
- **Stop**: `sudo docker compose down`
- **Rebuild specific service**: `sudo docker compose up --build -d [service_name]`

### Build and Test
- **Development**: Run the full stack using the Docker commands above.
- **Frontend Local**: Can be run with `npm run dev` in `frontend/` directory, but Docker is preferred to ensure full backend connectivity.
- **Testing**: Run tests inside the container: `sudo docker compose exec backend pytest`.

## Code Style & Design Guidelines

### UI/UX: Brutalism Design System (STRICT)
All UI changes, new components, and improvements **MUST** follow the established **Brutalism** design template.
- **Visuals**: High contrast, bold typography, stark borders, neo-brutalist aesthetics.
- **Components**: 
    - Use existing components like `BrutalistSelect`.
    - Style new components to match:
        - Thick solid black borders (`border-black`).
        - Sharp corners (`rounded-none`).
        - Uppercase headers and labels.
        - Mono-spaced fonts for technical details (`font-mono`).
- **Prohibited**: Do NOT introduce soft shadows, rounded corners (unless specified), or "clean corporate" styles. Stick to the raw, bold aesthetic.

## Feature Implementation Guidelines
- **Specialized Inventories**: The system supports "Inventory Types" (General, Nature, Places). When modifying items or folders, ensure you respect the `settings` (Folder) and `meta_data` (Item) JSON structures.
- **Authentication**: Route protection is handled by `middleware.ts`. Ensure strictly protected routes redirect to `/login`.

## Security Considerations
- **Environment**: Do not hardcode secrets. Use `.env`.
- **API Access**: Access to backend APIs should be authenticated via JWT (NextAuth).

## Commit Guidelines
- Use clear, descriptive commit messages.
