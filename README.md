# JourneyCraft 🗺️

北京昌平区智能旅行规划平台。覆盖景点、美食、游记、室内导航、AI 行程助手。

---

## 🚀 快速启动（3 分钟）

### 1. 前置条件

| 依赖 | 版本 | 验证命令 |
|------|------|---------|
| Java | 21+ | `java -version` |
| Node.js | 18+ | `node -v` |
| MySQL | 8+ | `mysql --version` |
| MongoDB | 6+ | `mongod --version` |

### 2. 初始化数据库

```bash
# 一条命令完成：建表 + 种子数据
mysql -u root -p journeycraft < "handover/数据库建立.sql"

# 然后导入路网数据（267k 节点 + 541k 边，约 30 秒）
python scripts/import_osm_to_mysql.py
```

> 也可用 Docker 一键启动：`docker compose up -d`（自动完成全部初始化）

### 3. 配置 API Key（可选）

```bash
cp JC/src/main/resources/ai-api-key.properties.example JC/src/main/resources/ai-api-key.properties
```

编辑 `ai-api-key.properties` 填入你的 Key。不配置不影响非 AI 功能。

### 4. 启动后端

```bash
cd JC
.\mvnw spring-boot:run   # Windows
./mvnw spring-boot:run   # Mac/Linux
```

看到以下日志即成功：

```
╔══════════════════════════════════════════╗
║     JourneyCraft Tourism System v2.0     ║
║     Application started successfully!     ║
╚══════════════════════════════════════════╝
```

### 5. 启动前端

```bash
cd frontend
npm install
npm run dev
```

### 6. 访问

浏览器打开 `http://localhost:5173` → 注册账号即可使用。

---

## 🐳 Docker 一键启动

```bash
docker compose up -d
```

自动启动 MySQL + MongoDB + 后端 + 前端，并初始化数据库。

---

## 🧪 运行测试

```bash
# 后端 211 项测试
cd JC && .\mvnw test

# 前端类型检查 + 30 项测试
cd frontend
npx vue-tsc --noEmit
npx vitest run
```

---

## 📁 项目结构

```
journeycraft/
├── JC/                    # Spring Boot 后端 (Java 21, Maven)
│   └── src/main/java/.../
│       ├── ai/            # AI 功能（DeepSeek + MiniMax）
│       ├── navigation/    # 导航算法（Dijkstra / TSP / TopK / Fuzzy）
│       ├── spot/          # 景点模块
│       ├── shop/          # 餐馆模块
│       ├── food/          # 美食模块
│       ├── diary/         # 游记模块（含 Deflate 压缩）
│       ├── itinerary/     # 行程模块（含协作）
│       ├── indoor/        # 室内导航
│       └── facility/      # 设施查询
│
├── frontend/              # Vue 3 + TypeScript（Element Plus）
│   ├── src/views/         # 页面组件
│   ├── src/api/           # Axios API 客户端
│   └── src/stores/        # Pinia 状态管理
│
├── sql/                   # 数据库初始化脚本
├── OSM/                   # 昌平区路网数据（OSM PBF）
├── scripts/               # Python 数据导入工具
├── handover/              # 项目交接文档和脚本
└── docker-compose.yml     # Docker 编排
```

---

## 🗄️ 数据库

### MySQL `journeycraft`

| 表 | 行数 | 说明 |
|---|---|---|
| `spots` | 210 | 景点（高德 API 真实 POI） |
| `shops` | 337 | 餐馆（高德 API 真实 POI） |
| `facilities` | 337+ | 服务设施（12 个分类） |
| `road_nodes` | 267,094 | OSM 路网节点 |
| `road_edges` | 540,956 | OSM 路网边 |
| `users` | — | 用户 |
| `itineraries` | — | 行程 |

其余表（spot_reviews、favorites、histories 等）由 JPA 自动创建。

### MongoDB `JourneyCraft`

| 集合 | 用途 |
|---|---|
| `diaries` | 游记（Deflate 压缩存储） |
| `chat_sessions` | AI 对话会话 |
| `indoor_navigation` | 室内导航建筑图 |

---

## 📡 API 概览

所有请求前缀 `/api/v1`，响应格式：`{ success, message, data, timestamp }`

| 方法 | 路径 | 说明 | 需登录 |
|------|------|------|--------|
| POST | `/auth/login` / `/auth/register` / `/auth/refresh` | 认证 | — |
| GET | `/spots` / `/spots/{id}` | 景点搜索/详情 | — |
| GET | `/shops/search` / `/shops/{id}` | 餐馆搜索/详情 | — |
| GET/POST/PUT/DELETE | `/itineraries` | 行程 CRUD | ✅ |
| GET | `/diaries` / `/diaries/search` | 游记列表/搜索 | — |
| POST | `/diaries/{id}/rate` | 游记评分 | ✅ |
| POST | `/ai/plan` / `/ai/chat` / `/ai/budget` | AI 功能 | — |
| POST | `/navigation/route` | 路径规划（Dijkstra/TSP） | — |
| POST | `/indoor/navigate` | 室内导航 | — |
| POST | `/files/upload` | 文件上传（≤200MB） | ✅ |
| POST | `/admin/refresh-all` | 全量数据刷新 | ✅ |

完整 API 文档见 `handover/` 或启动后端后访问 `/swagger-ui.html`。

---

## 🔐 默认配置

| 配置 | 默认值 | 说明 |
|------|--------|------|
| MySQL | `root` / `root123` | 可通过 `MYSQL_PASSWORD` 环境变量覆盖 |
| MongoDB | `mongodb://localhost:27017/JourneyCraft` | 可通过 `MONGODB_URI` 覆盖 |
| JWT Secret | `ThisIsAJourneyCraftSecretKeyForJWTTokenGeneration2026` | 生产环境务必更换 |
| 后端端口 | `8080` | |
| 前端端口 | `5173` | |

---

## 🔧 常见问题

**Q: 后端报 MySQL 连接失败？**
A: 检查 MySQL 是否运行，默认密码 `root123`。可在 `application.yml` 中修改。

**Q: 地图不显示？**
A: 在 `frontend/index.html` 和 `ai-api-key.properties` 中填入高德地图 Key。

**Q: 路网加载失败？**
A: 运行 `python scripts/import_osm_to_mysql.py` 导入 OSM 数据。

**Q: AI 功能不可用？**
A: 在 `ai-api-key.properties` 中配置 DeepSeek / MiniMax Key。不配置不影响其他功能。

**Q: 搜索中文不生效？**
A: 确保 MySQL 连接使用 `characterEncoding=UTF-8`。中文输入后需点击搜索按钮。

---

> 详细交接文档见 [handover/README.md](./handover/README.md)
