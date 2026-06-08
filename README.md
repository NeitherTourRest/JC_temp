# JourneyCraft 🗺️

**Intelligent campus trip planner with indoor navigation and AI-powered features.**

JourneyCraft is a full-stack web application that helps users plan trips, navigate indoor spaces, discover spots and dining options, generate AI-powered travel diaries, and collaborate on itineraries — all with a distinctive Pop Art + Frosted Glass visual style.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│        Vue 3 + TypeScript + Vite + Element Plus   │
│     (Pop Art + Frosted Glass UI / Lucida Console) │
└────────────────────┬────────────────────────────┘
                     │ HTTP REST API
┌────────────────────▼────────────────────────────┐
│                   Backend                        │
│        Java 21 + Spring Boot 3.x + Maven         │
│     ┌─────────────────────────────────────────┐  │
│     │  MySQL  │  MongoDB  │  Redis (optional) │  │
│     └─────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vue 3, TypeScript, Vite, Element Plus, Vue Router, Pinia, Axios |
| **Backend** | Java 21, Spring Boot 3.x, Spring Security, Spring Data JPA |
| **Database** | MySQL (spots, foods, itineraries, users), MongoDB (diaries, AI chat sessions) |
| **Maps** | AMap (Gaode) — indoor floor plans & outdoor navigation |
| **AI** | MiniMax API — diary generation, image/video/music creation, trip planning |
| **Indoor** | Dijkstra shortest-path + custom indoor graph (416 nodes, 415 edges) |
| **Auth** | JWT-based authentication |
| **Deploy** | Docker Compose (MySQL + MongoDB + backend + frontend) |

## Project Structure

```
├── JC/                          # Backend (Spring Boot)
│   ├── src/main/java/.../
│   │   ├── ai/                  # AI chat, budget, plan, MiniMax integration
│   │   ├── auth/                # JWT auth, login, registration
│   │   ├── common/              # Config (CORS, Security, MongoDB, Jackson), exceptions, file upload
│   │   ├── diary/               # Diary CRUD, auto-generation, ratings
│   │   ├── food/                # Food/dining search & detail
│   │   ├── indoor/              # Indoor building model & navigation
│   │   ├── itinerary/           # Trip plan CRUD
│   │   ├── navigation/          # Dijkstra, TSP, POI search, road network
│   │   ├── search/              # Unified search across spots/diaries/foods
│   │   ├── spot/                # Spot/attraction CRUD & search
│   │   ├── user/                # User profile & preferences
│   │   └── ...                  # collaboration, facility, favorite, history, etc.
│   └── pom.xml
│
├── frontend/                    # Frontend (Vue 3)
│   ├── src/
│   │   ├── api/                 # REST API clients (Axios)
│   │   ├── assets/styles/       # handdrawn.css (Pop Art), main.css, pixel-art.css
│   │   ├── layouts/             # Default layout (sidebar, topbar)
│   │   ├── router/              # Vue Router config
│   │   ├── stores/              # Pinia stores (auth, spot)
│   │   ├── types/               # TypeScript type definitions
│   │   ├── utils/               # Formatting utilities
│   │   └── views/
│   │       ├── ai/              # AI Chat, Budget, Plan views
│   │       ├── auth/            # Login, Register
│   │       ├── diary/           # Diary List, Editor, Detail
│   │       ├── food/            # Food Search, Detail
│   │       ├── home/            # Home page
│   │       ├── indoor/          # Indoor floorplan navigation
│   │       ├── itinerary/       # Trip planning (List + Planning mode)
│   │       ├── navigation/      # Outdoor map & routing
│   │       ├── profile/         # Profile, Favorites, History
│   │       └── spot/            # Spot List, Detail
│   └── package.json
│
├── sql/                         # Database init scripts
│   ├── init.sql                 # Schema (spots, foods, itineraries, etc.)
│   ├── osm_tables.sql           # OSM road network tables
│   └── seed_extended.sql        # Extended seed data
│
├── OSM/                         # OpenStreetMap data (Changping area)
│   └── Changping.osm.pbf
│
├── scripts/                     # Python/JS utility scripts (data import, graph building, etc.)
│
├── docs/                        # Design docs, indoor graph spec, frontend polish plan
│
└── docker-compose.yml           # Multi-service deployment
```

## Features

### 🗺️ Trip Planning
- List view and interactive planning mode with day-by-day itinerary
- Drag-and-drop attractions, dining, and notes per day
- **Map Picker** — click on an AMap to drop points directly into your plan
- **Spot/Food Search** — search the database and add results with lat/lng coordinates
- **AI Assistant** — inline chat dialog for trip advice, session persistence across page visits

### 🧭 Indoor Navigation
- Detailed floor plans for BUPT Zhonghe/Zonghe building (5 floors, 416 nodes)
- Indoor pathfinding with Dijkstra algorithm, multi-floor via stair connections
- Interactive floor selector, real-time route display on canvas

### 🌐 Outdoor Navigation
- AMap integration with route visualization
- POI search, road network queries, traffic-aware routing
- TSP (Traveling Salesman) algorithm for multi-stop optimization

### 🤖 AI-Powered Diary
- Auto-generate travel diaries from check-in data
- AI image generation, video creation, background music via MiniMax API
- Rich text editor with media uploads

### 🔍 Search
- Unified search across spots, diaries, and foods
- Category filters, pagination, fuzzy matching

### 👥 Social & Collaboration
- Collaborative trip planning
- Favorites, browse history, facility queries

## Setup

### Prerequisites

- Java 21+
- Node.js 18+
- MySQL 8+
- MongoDB 6+
- AMap (Gaode) developer key *(for maps)*
- MiniMax API key *(for AI features)*

### Configuration

**API Keys** (required for AI features):

Create `JC/src/main/resources/ai-api-key.properties`:
```properties
minimax.api.key=your_minimax_api_key_here
```

> This file is listed in `.gitignore` and will never be committed to the repository.

**Database**:

Run the SQL scripts in `sql/` to initialize MySQL:
```bash
mysql -u root -p journeycraft < sql/init.sql
mysql -u root -p journeycraft < sql/osm_tables.sql
mysql -u root -p journeycraft < sql/seed_extended.sql
```

**AMap Key**:

Add your AMap JavaScript API key to `frontend/index.html`:
```html
<script src="https://webapi.amap.com/maps?v=2.0&key=YOUR_AMAP_KEY"></script>
```

### Run Locally

**Backend:**
```bash
cd JC
./mvnw spring-boot:run
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Docker

```bash
docker-compose up -d
```

This starts MySQL, MongoDB, backend (port 8080), and frontend (port 5173).

## API Overview

| Method | Prefix | Module |
|--------|--------|--------|
| POST | `/api/v1/auth/*` | Authentication (login, register) |
| GET/PUT | `/api/v1/users/*` | User profile & preferences |
| GET | `/api/v1/spots` | Spot search, detail, reviews |
| GET | `/api/v1/foods` | Food/dining search |
| GET/POST/DELETE | `/api/v1/diaries` | Diary CRUD |
| GET/POST/DELETE | `/api/v1/ai/sessions` | AI chat sessions |
| POST | `/api/v1/ai/chat` | AI chat messages |
| GET/POST/PUT/DELETE | `/api/v1/itineraries` | Trip plan CRUD |
| POST | `/api/v1/navigation/route` | Outdoor route calculation |
| POST | `/api/v1/indoor/navigate` | Indoor pathfinding |
| GET | `/api/v1/search` | Unified search |
| POST | `/api/v1/files/upload` | File upload |

## Visual Style

JourneyCraft features a unique **Pop Art + Frosted Glass** hybrid:

- **Pop Art**: Bold primary colors (`--pop-yellow #ffdd00`, `--pop-pink #ff69b4`, `--pop-blue #00bfff`), thick black borders, hard drop shadows
- **Frosted Glass**: `.glass` class cards with `backdrop-filter: blur()` and semi-transparent backgrounds
- **Typography**: Lucida Console / monospace throughout

## License

[MIT](LICENSE)