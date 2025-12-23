# SmartInventory

AI-powered inventory management tool.

## Stack
- **Frontend**: Next.js 15, Tailwind CSS, ShadcnUI (mocked)
- **Backend**: FastAPI
- **Database**: PostgreSQL
- **Infrastructure**: Docker Compose

## Prerequisites
- Docker & Docker Compose
- Node.js (for local dev if needed)
- Python 3.11+ (for local dev if needed)

## Quick Start

1. **Build and Run**
   ```bash
   docker-compose up --build
   ```

2. **Access Services**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
   - Database: localhost:5432

## Development
- Frontend code is in `frontend/`
- Backend code is in `backend/`
- Changes in valid files should hot-reload.

## API Endpoints (Mock)
- `POST /process-object`: Upload image of an object
- `POST /process-invoice`: Upload invoice PDF/Image
