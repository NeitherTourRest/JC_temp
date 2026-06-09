# JourneyCraft — AGENTS.md

## What this is

Compact onboarding for an agent working in this repo. Every fact here was hard-earned by reading config, manifests, and code. Omit what you can infer from filenames alone.

---

## Repository structure

```
D:\JC\
├── JC/                    # Spring Boot backend (Java 21, Maven, Spring Boot 4.0.6)
├── frontend/              # Vue 3 frontend (TypeScript, Vite 6, Element Plus)
├── sql/                   # MySQL init scripts (spots, foods, facilities, users, etc.)
├── OSM/                   # OpenStreetMap road data (267k nodes, 541k edges)
├── scripts/               # Python utility scripts (crawl_images.py, apply_images.py, etc.)
├── docs/                  # Design docs, indoor graph spec
├── docker-compose.yml     # MySQL 8.4 + MongoDB 7 + backend + frontend
└── README.md
```

---

## Quick commands

| Action | Command | Notes |
|--------|---------|-------|
| Run backend | `cd JC && .\mvnw spring-boot:run` | Port 8080. Must kill old process first (`taskkill /F /PID <pid>`). Takes ~15s. |
| Build frontend | `cd frontend && npm run build` | Runs `vue-tsc --noEmit` then `vite build` |
| Run frontend dev | `cd frontend && npm run dev` | Port 5173, `/api` + `/uploads` proxied to 8080 |
| Run backend tests | `cd JC && .\mvnw test` | 155 tests across 18 classes |
| Run frontend tests | `cd frontend && npx vitest run` | 15 tests (4 test files) |
| DB init | `mysql -u root -p journeycraft < sql/init.sql` | Run `sql/*.sql` in order |
| Docker | `docker compose up -d` | Starts MySQL + MongoDB + backend + frontend |

### CRITICAL: Killing backend before restart

```
netstat -ano | Select-String ":8080 " | Select-String "LISTENING"
  → extract PID → taskkill /PID <pid> /F
  → wait 5s → .\mvnw spring-boot:run
```

Port 8080 often has orphaned processes. Check with `netstat -ano | Select-String ":8080 "` before starting. Starting Maven build takes ~8s, app startup ~15s.

---

## Architecture

- **Backend modules** follow: `controller/` → `service/` → `repository/` + `entity/` (MySQL) or `document/` (MongoDB). DTOs in `dto/` subpackage.
- **MySQL** holds relational data: spots (20), foods (50), facilities (50+), users, itineraries, reviews, congestion reports.
- **MongoDB** holds documents: diaries (with images/video/music), AI chat sessions, indoor buildings.
- **Auth**: JWT (access token 15min, refresh token 7 days). Both tokens stored in `localStorage`. Axios interceptor auto-refreshes on 401.
- **Frontend hosts images** at `~/journeycraft-uploads/yyyy/MM/dd/UUID.ext`, served via `/uploads/**`. Max 200MB.
- **No Redis** despite being in docker-compose — only MySQL + MongoDB + backend + frontend.

### Backend modules

| Package | DB | Key classes |
|---------|----|------------|
| `ai/` | MongoDB | `AIConfig` (loads `ai-api-key.properties`), `MiniMaxClient`, `AIChatController`, `AIPlanController`, `AIBudgetController` |
| `auth/` | MySQL | `AuthController` (login/register/refresh), `JwtAuthenticationFilter` |
| `spot/` | MySQL | `Spot`, `SpotReview`, `CongestionReport`; `SpotController` (search/recommend/detail/rate/congestion) |
| `food/` | MySQL | `Food` entity; `FoodController` (search/detail/rate/nearby) |
| `facility/` | MySQL | `Facility` entity; `FacilityController.getNearbyFacilities()` uses Dijkstra for actual walking distance |
| `diary/` | MongoDB | `Diary` document (images[], videoMeta, musicUrl); `DiaryController` |
| `itinerary/` | MySQL | `Itinerary` entity with `routeData` (JSON); `ItineraryController` |
| `navigation/` | MySQL | `RoadNode`, `RoadEdge`, `Graph` (adjacency-list), `DijkstraAlgorithm`, `TSPAlgorithm`, `TopKSorter`, `FuzzyMatcher` |
| `indoor/` | MongoDB | `IndoorBuilding` document; `IndoorNavigationService` (Dijkstra on indoor graph) |
| `search/` | — | Cross-module search across spots/foods/diaries |
| `user/` | MySQL | `User`, `UserPreference`; `UserController` (profile/preferences update with JWT rotation) |
| `config/` | — | `SecurityConfig`, `CorsConfig`, `GraphConfig`, `MongoConfig`, `GraphDataLoader` |
| `common/` | — | `ApiResponse<T>` envelope, `PageResponse<T>`, `FileUploadController`, `JwtUtil`, global exception handlers |

### Frontend file structure

```
frontend/src/
├── api/             # Axios API modules — one file per backend domain
├── types/api.ts     # Shared TS interfaces: ApiResponse<T>, PageResponse<T>, SpotResponse, etc.
├── assets/styles/   # handdrawn.css (Pop Art theme), main.css, pixel-art.css
├── layouts/         # DefaultLayout.vue (sidebar + main area + profile section)
├── router/          # Vue Router — lazy-loaded routes
├── stores/          # Pinia (authStore with checkAuth, spotStore)
└── views/           # One subdirectory per feature
```

---

## Critical config details

### API Keys (gitignored)

File: `JC/src/main/resources/ai-api-key.properties` (must be created manually)

```properties
minimax.api.key=...
deepseek.api.key=...
```

Loaded at startup by `AIConfig.java` via `@PostConstruct` + `ClassPathResource`. If missing, AI features log a warning and are disabled (no crash). Do NOT look for `@Value` or `@ConfigurationProperties` for AI keys — they're not in `application.yml`.

### Default credentials (dev only)

- **MySQL**: `root` / `root123`, database `journeycraft`
- **MongoDB**: `mongodb://localhost:27017/JourneyCraft`
- **JWT secret**: `ThisIsAJourneyCraftSecretKeyForJWTTokenGeneration2026`
- All overridable via env vars or `application.yml` / docker profile

### AMap (Gaode maps)

- JS API key is hardcoded in `frontend/index.html`
- Global `window.AMap` — no npm package. Must wait for SDK load before creating map instances (polling pattern: `setTimeout(tryInit, 500)`).
- Used in: NavigationView (outdoor routing, indoor floorplans), SpotDetailView (location marker), FoodDetailView (location marker), ItineraryListView (map picker dialog).

### File uploads

- Backend saves to `~/journeycraft-uploads/yyyy/MM/dd/UUID.ext`
- Served at `/uploads/**` via `WebMvcConfig` (file handler mapping)
- `SecurityConfig` permits `/uploads/**` without auth
- Frontend uses `FormData` upload; Axios interceptor deletes `Content-Type` header for FormData (browser sets it with boundary)
- **Limits**: `max-file-size: 200MB`, `max-request-size: 200MB` (both in `application.yml` AND hardcoded in `FileUploadController.MAX_FILE_SIZE`)
- Images stored in `~/journeycraft-uploads/spots/` and `~/journeycraft-uploads/foods/` by the crawler script

### Vue build

- `npm run build` = `vue-tsc --noEmit && vite build`
- `minify: false` in vite.config.ts
- `vue-tsc` with `strict: true` — **zero tolerance for `as any` or `@ts-ignore`**
- LSP diagnostics catch type errors; failing `vue-tsc` blocks build
- Known large file: `ItineraryListView.vue` is 50k+ chars (~1900 lines)
- Vite proxy in config: `/api` → `localhost:8080`, `/uploads` → `localhost:8080`

---

## Backend REST patterns

### Envelope
```java
record ApiResponse<T>(boolean success, String message, T data, Map<String, List<String>> errors, LocalDateTime timestamp)
```

### Pagination
```java
record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages, boolean hasNext)
```
Page numbers are **0-indexed**. Both backend (`PageRequest.of(page, size)`) and frontend (`params: { page: 0, size: 10 }`) use this convention.

### Controller pattern
```java
@RestController @RequestMapping("/api/v1/{module}")
public class XxxController {
    @PostMapping — create
    @GetMapping — list (paginated)
    @GetMapping("/{id}") — get by id
    @PutMapping("/{id}") — update
    @DeleteMapping("/{id}") — delete
}
```

### Security whitelist (unauthenticated GETs)
- `/api/v1/auth/**` — all methods (login, register, **refresh**)
- `GET /api/v1/spots/**`, `/api/v1/foods/**`, `/api/v1/diaries/**`, `/api/v1/navigation/**`
- `/uploads/**`, `/swagger-ui/**`, `/api-docs/**`
- Everything else requires JWT, including `POST /spots/{id}/rate`, `POST /spots/{id}/congestion`, `POST /files/upload`

Frontend router mirrors this: routes with `meta: { requiresAuth: true }` redirect to `/login`.

---

## Auth system (important details)

### Token refresh flow
- Backend `POST /api/v1/auth/refresh` was added later — if missing, 401 refresh fails and user gets logged out.
- JWT payload uses **base64url** encoding, not standard base64. `atob()` fails on base64url. Frontend uses custom `base64UrlDecode()` function.
- `checkAuth()` in authStore is called in `App.vue`'s `onMounted`. It decodes token expiry proactively.
- **Do NOT call `logout()` on refresh failure** — that was a bug. Refresh should fail gracefully and preserve existing tokens (the next API 401 will be handled by the axios interceptor).

### Auth store structure
- `accessToken` + `refreshToken` refs backed by localStorage
- `isAuthenticated` computed from `!!accessToken.value`
- `user` ref initialized from localStorage (nickname, avatar)
- `login()` → stores both tokens + nickname + avatar
- `logout()` → clears all localStorage keys: `accessToken`, `refreshToken`, `nickname`, `avatar`
- `checkAuth()` → verifies token, refreshes if expired, does NOT logout on failure

### Username change → JWT rotation
- `UserService.updateCurrentUser()` detects username change → generates new access token via `jwtUtil.generateAccessToken()`.
- `UserResponse` has optional `token` field populated only when username changes.
- Frontend detects `data.token` and updates `localStorage.setItem('accessToken', newToken)`.

---

## Visual style contract

- **Font**: `Lucida Console`, monospace everywhere — never use system UI fonts
- **CSS variables**: `--pop-yellow (#ffdd00)`, `--pop-pink (#ff69b4)`, `--pop-blue (#00bfff)`, `--pop-green (#00e676)`, `--pop-red (#ff3b3b)`, `--pop-orange (#ff9100)`
- **Cards**: class `glass` = `border: 3px solid #000; border-radius: 12px; box-shadow: 6px 6px 0 #000`
- **Element Plus overrides**: all in `handdrawn.css` — buttons, inputs, dialogs, tags, tabs all have `!important` Pop Art styling
- **Background**: `#fffef5` with dot pattern via `radial-gradient`
- **Don't** add new npm CSS dependencies; all visual theming is in the two CSS files
- **Don't** override Element Plus styles outside `handdrawn.css`

---

## Feature-specific gotchas

### Spot detail page features
- **Rating**: Uses `<el-rate>` component. User rating persisted to `localStorage` key `spotRating_{id}`. Requires auth.
- **Congestion**: 5 levels (OVERFLOWING→EMPTY). Weighted algorithm: reports within 30min get full weight, 30-60min half, >60min 0.2×. Requires auth. After submit, badge pulses via CSS `@keyframes congPulse`.
- **Facilities**: Grouped by category with section headers (🚻 Toilets, 🅿️ Parking, etc.). 50+ facility records pre-seeded in SQL.
- **Walking food**: `GET /spots/{id}/foods/nearby?maxDistance=2000` — uses `computeAllDistances()` (single O((V+E)logV) Dijkstra pass) for efficiency.
- **Error messages**: Catch blocks show actual backend error messages — NOT generic "need login". Console.error logs the full error.

### Food detail page features
- Rating: `POST /foods/{id}/rate` — backend `FoodService.rateFood()` maintains rolling average.
- Congestion: Displayed if `food.congestionLevel` is populated from parent spot.
- AMap location marker (same polling pattern as spot).
- Nearby spots card list.

### Profile page
- Editable fields: nickname, username, email, avatar.
- Username + email uniqueness validated server-side.
- UID shown as read-only `#id`.
- Email validation uses regex `pattern` (not `type: 'email'`) to allow empty values.
- Avatar upload via file picker → `POST /api/v1/files/upload` → URL stored.

### Itinerary / Trips page
- 3 floating action buttons: 📋 Plan, 💰 Budget, 🤖 Chat.
- Plan dialog: `aiApi.plan()` → preview result → "Apply to Trip" fills day schedule.
- Budget dialog: `aiApi.budget()` → category breakdown + suggestions.
- Chat dialog: `aiApi.chat()` with session persistence via `aiSessionId`.

### Image crawling (scripts/crawl_images.py)
- Used Python `icrawler` (Baidu/Bing fallback) to find images for 20 spots + 50 foods.
- Generated colored Pillow placeholders as fallback.
- Images stored in `~/journeycraft-uploads/spots/` and `~/journeycraft-uploads/foods/`.
- SQL UPDATEs applied via `scripts/apply_images.py` using PyMySQL.

---

## Testing

- **Backend**: JUnit 5 + Mockito (`@ExtendWith(MockitoExtension.class)`). Run via `./mvnw test`
  - 155 unit/integration tests across 18 test classes
  - **Pure algorithm tests** (no Spring context): Graph, GraphEdge, Dijkstra, TSP, TopKSorter, FuzzyMatcher
  - **Service tests**: SpotService, FoodService, DiaryService, ItineraryService
  - **Controller tests** (standalone Mockito, not `@WebMvcTest` — Spring Boot 4.x removed `spring-boot-test-autoconfigure.web`): Spot, Food, Diary, Auth, Itinerary
  - **Indoor navigation tests**: IndoorNavigationService (mocked MongoDB)
  - **Performance tests** (`@Tag("performance")`): AlgorithmBenchmark, GraphScale
  - **Package notice**: Spring Boot 4.x removed `@WebMvcTest` — controller tests use standalone Mockito `@InjectMocks` + `@Mock`

- **Frontend**: Vitest + `@vue/test-utils` + `happy-dom` — `npm run test`
  - 4 test files, 15 tests (authStore, spotStore, foodApi, diaryApi)
  - Uses `vi.mock` pattern for API module mocking
  - Uses `vi.hoisted()` for mock data (Vitest 2+ hoisting requirement)

- **No CI/CD** — tests run manually via the commands above
- **No e2e tests**
- **Performance tests** opt-in: `./mvnw test -Dgroups="performance"`

---

## Things an agent would waste time on

1. The `ItineraryController` was **missing its `@PutMapping`** — save would return 404. It was recently added.
2. The `AIConfig` loads AI keys from `ai-api-key.properties` with `@PostConstruct`, not from `application.yml` — don't look for `@Value` or `@ConfigurationProperties` there.
3. Indoor navigation is a separate MongoDB-backed service, not part of the outdoor navigation module — don't search `navigation/` for indoor logic.
4. The `frontend/src/` directory has `.js` files alongside `.ts` files — the `.js` files are outdated copies and not imported anywhere (tree-shaken out).
5. Element Plus is globally registered — no per-component imports needed. Add new components freely.
6. JWT tokens use base64url encoding — `atob()` in browser fails. Always use a `base64UrlDecode()` wrapper that replaces `-` → `+` and `_` → `/` before decoding.
7. The `/auth/refresh` endpoint was recently added — if missing, token refresh silently fails, causing all POST endpoints to return 401.
8. `FileUploadController` has a hardcoded `MAX_FILE_SIZE` that duplicates `application.yml`'s `max-file-size` — both must be updated in sync.
9. Form validation: `type: 'email'` validator rejects empty strings. Use a custom `pattern` regex for optional email fields.
10. Changing username invalidates existing JWT tokens — `UserService` must return a new token via `UserResponse.token` field.
