# SmartInventory

AI-powered inventory management tool built with Next.js 15, FastAPI, and PostgreSQL.

## 🚀 Live Stack
- **Frontend**: Next.js 15 (App Router), Tailwind CSS, ShadcnUI, NextAuth.js
- **Backend**: FastAPI, SQLModel, Alembic, OpenAI Integration
- **Database**: PostgreSQL 15
- **Infrastructure**: Docker Compose

## 🛠 Prerequisites
- **Docker** & **Docker Compose** installed.
- **Git** installed.
- Optional: Node.js 20+ and Python 3.11+ for local development outside Docker.

## ⚡ Quick Start (Productive Mode)

The easiest way to run the full stack is using Docker Compose.

### 1. Configure Environment Variables
The application uses a single **`.env`** file in the root directory.

### 1. Configure Environment Variables
The application uses a single **`.env`** file in the root directory.

1.  Copy the example file:
    ```bash
    cp .env.example .env 
    ```

2.  Fill in your specific values, especially:
    *   `OPENAI_API_KEY`: Required for AI features.
    *   `INITIAL_ADMIN_EMAIL` & `INITIAL_ADMIN_PASSWORD`: Using these will auto-create an Admin user on startup if they don't exist.

    ```env
    # Example snippet
    INITIAL_ADMIN_EMAIL=admin@smartinventory.app
    INITIAL_ADMIN_PASSWORD=secure_password_123
    ```

### 2. Build and Run
Docker Compose automatically reads the `.env` file at the root.
Docker Compose automatically reads the `.env` file at the root.

```bash
docker-compose up --build
```
*Note: This might take a few minutes strictly for the first build.*

### 3. Access the Application
- **Frontend (App)**: [http://localhost:3000](http://localhost:3000)
    -   *Default Redirect*: You will be redirected to `/login`.
-   **Backend (Docs)**: [http://localhost:8000/docs](http://localhost:8000/docs)
-   **Database**: Port `5432` (User: `user`, Pass: `password`)

---

## 🔐 Authentication & Setup
The app uses **NextAuth.js**.
-   **No Account?**: You can log in using **Google** (if configured) or the **Credentials Provider**.
-   **Credentials Login**:
    -   Currently configured to accept `admin@example.com` / `admin` (or check `backend/app/controllers/auth.py` for logic if fully implemented).
    -   *Note*: If you see a `NO_SECRET` error, ensure you have rebuilt the container after pulling latest changes (`docker-compose up --build`).

## ⚠️ Troubleshooting

**"Please define a `secret` in production" (NO_SECRET)**
-   This means the `NEXTAUTH_SECRET` environment variable is missing in the Docker container.
-   **Fix**: We have added a default fallback in `docker-compose.yml`. specificially:
    ```yaml
    environment:
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-super_secret_dev_key}
    ```
-   Make sure to run `docker-compose up --build` to apply this change.

**"Redirect Loop" or "404 on Root"**
-   The app is configured to redirect `/` to `/inventory` (if authed) or `/login`.
-   Clear your browser cookies/cache if you get stuck or manually visit [http://localhost:3000/login](http://localhost:3000/login).

## 📂 Project Structure
-   `frontend/app/(auth)`: Login and Auth pages.
-   `frontend/app/(dashboard)`: Main application (Inventory, Profile, etc) protected by Middleware.
-   `frontend/middleware.ts`: Handles route protection.
-   `backend/app/`: FastAPI application source.
