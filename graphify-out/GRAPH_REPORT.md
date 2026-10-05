# Graph Report - ai_inventory_tool  (2026-10-05)

## Corpus Check
- 149 files · ~59,089 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 7, .example 1, .ini 1)

## Summary
- 868 nodes · 2193 edges · 53 communities (38 shown, 15 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 153 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Service Worker Caching
- Item & Inventory Operations
- Authentication & Admin Models
- Root Layout & Brutalist Styling
- LLM & Invoice Processing
- FastAPI App & Rate Limiting
- Architecture & Operational Rules
- Invitation & Access Sharing
- Dashboard & Audit Views
- Developer Portal & API Keys
- User Profile & Share Modal
- Invoices & Scanner Pages
- Database Schema & Migrations
- Frontend Production Dependencies
- User Authentication Forms
- Frontend Package Configuration
- Inventory Groups & GeoJSON
- UI Components Configuration
- TypeScript Build Configuration
- Brutalist UI Inputs & Modals
- Item Detail & Map Preview
- Media Storage & Scope Security
- Public Share & Analytics
- Public API Endpoints
- Frontend Development Dependencies
- Public Gallery & Token Access
- Web App Manifest
- Mapbox Geocoding & Static Maps
- DuckDuckGo Price Estimation
- WebSocket Connection Manager
- Alembic Migration Environment
- NextAuth TypeScript Declarations
- Portfolio Valuation Analytics
- Multi-Currency Conversion
- Brutalist Badge UI Component
- NPM Run Scripts
- NextAuth API Handler
- ESLint Linting Configuration
- Auth Routing Middleware
- Next.js PWA Configuration
- Request Rate Limiter Strategy
- Admin Administration Page
- API Documentation Page
- App Shell Navigation
- NPM Dependency Overrides
- General UI Vector Icons
- Docker Container Entrypoint
- PostCSS Build Configuration
- Application Branding Icons
- Next.js Platform Logos

## God Nodes (most connected - your core abstractions)
1. `User` - 64 edges
2. `cn()` - 56 edges
3. `react` - 53 edges
4. `Item` - 45 edges
5. `lucide-react` - 41 edges
6. `next-auth` - 35 edges
7. `InventoryGroup` - 27 edges
8. `API_BASE_URL` - 27 edges
9. `sonner` - 24 edges
10. `useAuthFetcher()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Project Rules and Governance` --semantically_similar_to--> `Docker Operational Instructions`  [INFERRED] [semantically similar]
  RULES.md → AGENTS.md
- `Specialized Inventory Modes` --semantically_similar_to--> `Specialized Inventories`  [INFERRED] [semantically similar]
  README.md → AGENTS.md
- `Service: backend` --conceptually_related_to--> `Backend Architectural Conventions`  [INFERRED]
  docker-compose.yml → AGENTS.md
- `check_item()` --uses--> `Item`  [INFERRED]
  backend/check_db.py → backend/app/models.py
- `SmartInventory` --implements--> `Brutalism Design System`  [INFERRED]
  README.md → AGENTS.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **AI Inventory Full-Stack Services** — docker_compose_service_frontend, docker_compose_service_backend, docker_compose_service_db, docker_compose_service_redis [EXTRACTED 1.00]
- **Task Lifecycle and Deployment Governance** — rules_project_rules, agent_workflows_finish_task_finish_task_workflow, agents_operational_instructions [INFERRED 0.85]
- **Specialized Domain Inventories** — readme_specialized_modes, agents_specialized_inventories, readme_smartinventory [INFERRED 0.95]
- **Next.js Starter UI Icons** — frontend_public_file_icon, frontend_public_globe_icon, frontend_public_window_icon [INFERRED 0.85]
- **Next.js Boilerplate Assets** — frontend_public_next_logo, frontend_public_vercel_logo, frontend_public_file_icon, frontend_public_globe_icon, frontend_public_window_icon [INFERRED 0.85]

## Communities (53 total, 15 thin omitted)

### Community 0 - "Service Worker Caching"
Cohesion: 0.06
Nodes (25): a, b(), constructor(), deleteCacheAndMetadata(), et, F, G, get() (+17 more)

### Community 1 - "Item & Inventory Operations"
Cohesion: 0.09
Nodes (45): asyncio, Invoice, Item, add_item_image(), analyze_item_manual(), create_item(), delete_item(), generate_public_link() (+37 more)

### Community 2 - "Authentication & Admin Models"
Cohesion: 0.09
Nodes (33): get_current_user(), require_admin(), AIUsageLog, ApiKey, SQLModel, list_pending_invitations(), list_users(), get (+25 more)

### Community 3 - "Root Layout & Brutalist Styling"
Cohesion: 0.07
Nodes (27): frontend_app_globals, metadata, space, spaceGrotesk, viewport, QueueTab(), QueueTabProps, ReconciliationModal() (+19 more)

### Community 4 - "LLM & Invoice Processing"
Cohesion: 0.08
Nodes (23): Settings, InvoiceItem, InvoiceMatchResponse, InvoiceSummary, ItemExtracted, LLMService, MatchingResult, MatchItem (+15 more)

### Community 5 - "FastAPI App & Rate Limiting"
Cohesion: 0.09
Nodes (22): get_session(), init_db(), get_user_from_api_key(), on_startup(), retry_stuck_items(), get, read_root(), check_item() (+14 more)

### Community 6 - "Architecture & Operational Rules"
Cohesion: 0.07
Nodes (28): Finish Task Workflow, Backend Architectural Conventions, Brutalism Design System, Frontend Architectural Conventions, Docker Operational Instructions, Specialized Inventories, alembic, fastapi (+20 more)

### Community 7 - "Invitation & Access Sharing"
Cohesion: 0.11
Nodes (33): Invitation, create_invitation(), InvitationRequest, BackgroundTasks, BaseModel, delete, limit, post (+25 more)

### Community 8 - "Dashboard & Audit Views"
Cohesion: 0.14
Nodes (21): InventoryFoldersPage(), AnalyticsDashboard(), AuditLog(), Invitation, PendingInvitationsTable(), AdminDashboard(), User, CreateUpdateFolderModal() (+13 more)

### Community 9 - "Developer Portal & API Keys"
Cohesion: 0.13
Nodes (23): ApiKey, ApiKeyManager(), ItemGalleryUploader(), ItemGalleryUploaderProps, ItemPhotoUpdater(), ItemPhotoUpdaterProps, ItemFormValues, itemSchema (+15 more)

### Community 10 - "User Profile & Share Modal"
Cohesion: 0.12
Nodes (23): Member, ShareManagerModal(), ShareManagerModalProps, Avatar(), AvatarFallback(), AvatarImage(), CardAction(), DropdownMenu() (+15 more)

### Community 11 - "Invoices & Scanner Pages"
Cohesion: 0.14
Nodes (17): FolderDetailPage(), TODO: Get auth token if needed, or rely on cookie/session if configured, ApiDocsClientProps, CameraCapture(), CameraCaptureProps, InventoryCard(), InventoryCardSkeleton(), Item (+9 more)

### Community 12 - "Database Schema & Migrations"
Cohesion: 0.10
Nodes (4): alembic, sqlalchemy, sqlalchemy_dialects, typing

### Community 13 - "Frontend Production Dependencies"
Cohesion: 0.07
Nodes (27): dependencies, class-variance-authority, clsx, @ducanh2912/next-pwa, framer-motion, @hookform/resolvers, lucide-react, next (+19 more)

### Community 14 - "User Authentication Forms"
Cohesion: 0.19
Nodes (13): COLORS, InventoryFolderCardProps, Card(), CardContent(), CardDescription(), CardFooter(), CardHeader(), CardTitle() (+5 more)

### Community 15 - "Frontend Package Configuration"
Cohesion: 0.08
Nodes (23): name, private, version, clsx, @ducanh2912/next-pwa, framer-motion, @hookform/resolvers, @radix-ui/react-avatar (+15 more)

### Community 16 - "Inventory Groups & GeoJSON"
Cohesion: 0.21
Nodes (22): InventoryGroup, InventoryGroupBase, SharedAccess, create_group(), get_group(), get_group_geojson(), GroupCreate, GroupUpdate (+14 more)

### Community 17 - "UI Components Configuration"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+10 more)

### Community 18 - "TypeScript Build Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 19 - "Brutalist UI Inputs & Modals"
Cohesion: 0.17
Nodes (9): CreateUpdateFolderModalProps, BrutalistSelect, BrutalistSelectProps, Checkbox, GalleryCarouselProps, SecureImage(), SecureImageProps, Textarea() (+1 more)

### Community 20 - "Item Detail & Map Preview"
Cohesion: 0.20
Nodes (11): ItemDetailPage(), StaticMapThumbnail(), StaticMapThumbnailProps, frontend_components_ui_tooltip_tooltip, TooltipContent, frontend_components_ui_tooltip_tooltipprovider, frontend_components_ui_tooltip_tooltiptrigger, usePriceSearch() (+3 more)

### Community 21 - "Media Storage & Scope Security"
Cohesion: 0.32
Nodes (14): get_inventory_scope(), Returns a list of InventoryGroup IDs that the user has access to. This…, User, download_item_image(), get_gallery_image_original(), get_gallery_image_thumbnail(), _get_gallery_images(), get_item_image() (+6 more)

### Community 22 - "Public Share & Analytics"
Cohesion: 0.26
Nodes (10): generateMetadata(), getItem(), Props, PublicSharePage(), InventoryAnalyticsTab(), InventoryAnalyticsTabProps, GalleryCarousel(), calculateInventoryTotal() (+2 more)

### Community 23 - "Public API Endpoints"
Cohesion: 0.36
Nodes (11): Envelope, get_item_detail(), list_group_items(), list_inventories(), PaginationMeta, PublicGroup, PublicItem, BaseModel (+3 more)

### Community 24 - "Frontend Development Dependencies"
Cohesion: 0.18
Nodes (11): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tw-animate-css, @types/node, @types/react (+3 more)

### Community 25 - "Public Gallery & Token Access"
Cohesion: 0.29
Nodes (10): _get_public_gallery_filenames(), get_public_gallery_image(), get_public_gallery_thumbnail(), _get_public_item(), get_public_item_image(), get, Get item details by public token. No auth required., Get item image by public token. No auth required. (+2 more)

### Community 26 - "Web App Manifest"
Cohesion: 0.20
Nodes (9): background_color, display, icons, name, orientation, scope, short_name, start_url (+1 more)

### Community 27 - "Mapbox Geocoding & Static Maps"
Cohesion: 0.29
Nodes (6): ensure_item_map_background(), Background task to generate map image if missing., MapboxService, Generates a static map image from Mapbox, saves it to /app/media/maps, and…, dotenv, requests

### Community 28 - "DuckDuckGo Price Estimation"
Cohesion: 0.33
Nodes (4): Searches for an approximate price for the given item query using DuckDuckGo.…, search_approximate_price(), duckduckgo_search, re

### Community 30 - "Alembic Migration Environment"
Cohesion: 0.33
Nodes (5): Run migrations in 'offline' mode. This configures the context with just a URL…, Run migrations in 'online' mode. In this scenario we need to create an Engine…, run_migrations_offline(), run_migrations_online(), logging_config

### Community 31 - "NextAuth TypeScript Declarations"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 32 - "Portfolio Valuation Analytics"
Cohesion: 0.50
Nodes (3): Any, AnalyticsService, Aggregates user inventory data and normalizes to USD.

### Community 34 - "Brutalist Badge UI Component"
Cohesion: 0.50
Nodes (4): Badge(), badgeVariants, class-variance-authority, @radix-ui/react-slot

### Community 35 - "NPM Run Scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 37 - "ESLint Linting Configuration"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

### Community 40 - "Request Rate Limiter Strategy"
Cohesion: 0.67
Nodes (3): get_key_func(), Request, Strategy: - If user is authenticated (request.state.user), use user ID. -…

### Community 44 - "NPM Dependency Overrides"
Cohesion: 0.67
Nodes (3): overrides, glob, inflight

### Community 45 - "General UI Vector Icons"
Cohesion: 1.00
Nodes (3): File Document Icon, Globe Network Icon, Window UI Icon

## Knowledge Gaps
- **165 isolated node(s):** `entrypoint.sh script`, `dynamic`, `handler`, `spaceGrotesk`, `space` (+160 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 315 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Media Storage & Scope Security` to `Item & Inventory Operations`, `Authentication & Admin Models`, `FastAPI App & Rate Limiting`, `Invitation & Access Sharing`, `Database Schema & Migrations`, `Inventory Groups & GeoJSON`, `Public API Endpoints`, `Alembic Migration Environment`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `react` connect `Invoices & Scanner Pages` to `Brutalist Badge UI Component`, `Root Layout & Brutalist Styling`, `Dashboard & Audit Views`, `Developer Portal & API Keys`, `User Profile & Share Modal`, `User Authentication Forms`, `Frontend Package Configuration`, `Brutalist UI Inputs & Modals`, `Item Detail & Map Preview`, `Public Share & Analytics`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Frontend Production Dependencies` to `Frontend Package Configuration`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 48 inferred relationships involving `User` (e.g. with `get_user_from_api_key()` and `get_current_user()`) actually correct?**
  _`User` has 48 INFERRED edges - model-reasoned connections that need verification._
- **Are the 31 inferred relationships involving `Item` (e.g. with `on_startup()` and `get_group_geojson()`) actually correct?**
  _`Item` has 31 INFERRED edges - model-reasoned connections that need verification._
- **What connects `entrypoint.sh script`, `dynamic`, `handler` to the rest of the system?**
  _165 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Service Worker Caching` be split into smaller, more focused modules?**
  _Cohesion score 0.05541368743615935 - nodes in this community are weakly interconnected._