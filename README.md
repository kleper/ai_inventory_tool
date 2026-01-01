# SmartInventory

**SmartInventory** is an AI-powered inventory management tool designed for individuals and businesses to track assets with precision and style. Built with a "Wireframe Brutalism" design system, it combines high-performance visuals with intelligent automation.

## 🌟 Key Features

### 🧠 AI-Powered Automation
-   **Object Recognition**: Upload a photo, and the AI automatically identifies the object, categorization, and description.
-   **Price Estimation**: The system estimates the value of your items based on visual analysis and context.
-   **Context-Aware**: The AI understands if an item is being added to a specific folder (e.g., "Camping Gear" vs. "Kitchen") to provide more accurate categorizations.

### 💰 Financial Analytics & Multi-Currency
-   **Global Currency Support**: Track your portfolio in **USD**, **COP** (Colombian Peso), or **EUR**.
-   **Strict Formatting**: Prices are formatted according to local standards (e.g., `$ 1.500.000` for COP, `$ 1,500.00` for USD).
-   **Real-time Valuation**: Instantly see the total value of your assets, average unit prices, and high-value items.
-   **Dynamic Charts**: Visualize category distribution and portfolio completion rates.

### 📂 Advanced Folder Management
-   **Granular Control**: Create folders for specific collections (e.g., "Office Equipment", "Home Assets").
-   **Permission System**: Share folders with **Viewer** or **Editor** permissions.
-   **Full Editing**: Rename folders, update descriptions, and change target currencies at any time.

### 🎨 Wireframe Brutalism Design
-   **Distinct Aesthetic**: High-contrast, monochromatic design with zero curves and generous spacing.
-   **Responsive**: Optimized for both desktop and mobile experiences.
-   **Performance First**: Built on Next.js 15 for lightning-fast navigation.

---

## 🚀 Usage Guide

### 1. Creating an Inventory
1.  Navigate to the **Dashboard** (`/inventory`).
2.  Click **"Create Folder"**.
3.  Enter a name (e.g., "Tech setup"), description, and select your preferred currency (USD, COP, EUR).

### 2. Adding Items
1.  Open your new folder.
2.  Click **"Add Item"** or **"Scan"**.
3.  **Upload a Photo**: The AI will analyze the image and pre-fill the Name, Category, and Estimated Price.
4.  **Review & Save**: Edit any details if necessary (the price label will remind you of the folder's currency) and save.

### 3. Analyzing Your Net Worth
1.  Click the **"Analytics"** tab within any folder.
2.  View your **Total Valuation**, **Item Count**, and **Category Breakdown**.
3.  Use the charts to identify your most valuable asset classes.

---

## 🛠 Technical Stack
-   **Frontend**: Next.js 15 (App Router), Tailwind CSS, ShadcnUI, Recharts.
-   **Backend**: FastAPI, SQLModel (SQLAlchemy), Alembic, Pydantic.
-   **AI**: OpenAI GPT-4o Integration.
-   **Database**: PostgreSQL 15.
-   **Infrastructure**: Docker Compose.

---

## ⚡ Quick Start (Productive Mode)

### 1. Configure Environment Variables
1.  Copy the example file:
    ```bash
    cp .env.example .env 
    ```
2.  Fill in your keys (OPENAI_API_KEY is essential for AI features).

### 2. Build and Run
```bash
docker-compose up --build
```
*Note: The first build may take a few minutes.*

### 3. Access the Application
-   **Frontend**: [http://localhost:3000](http://localhost:3000)
-   **Backend Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🔐 Authentication
-   **Google OAuth**: seamless login (configure CLIENT_ID/SECRET in `.env`).
-   **Email/Password**: Standard credentials login supported.

## ⚠️ Troubleshooting
-   **Database Errors**: If you encounter `UndefinedColumn` errors on deployment, run `docker-compose exec backend alembic upgrade head` to ensure all migrations are applied.
