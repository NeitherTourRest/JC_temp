# JourneyCraft 🗺️

北京昌平区智能旅行规划平台。覆盖景点、美食、游记、室内导航、AI 行程助手等功能。

---

## 📦 前置条件

| 依赖 | 版本要求 | 用途 |
|------|---------|------|
| Java | 21+ | 后端运行 |
| Node.js | 18+ | 前端构建 |
| MySQL | 8+ | 关系型数据库（景点、美食、用户、行程） |
| MongoDB | 6+ | 文档数据库（游记、AI 对话） |

可选：
- 高德地图开发者 Key（用于地图显示，已内置测试 Key 但有限额）
- DeepSeek API Key（用于 AI 行程规划）
- MiniMax API Key（用于 AI 图片/视频/音乐生成）

---

## 🚀 快速启动（5 分钟）

### 1. 克隆项目

```bash
git clone <repo-url> journeycraft
cd journeycraft
```

### 2. 启动数据库

**MySQL**（确保 root 可本地登录）：

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS journeycraft CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

**MongoDB**（默认端口 27017，无需额外配置）：

```bash
# 确保 mongod 正在运行
mongod --dbpath /data/db
```

### 3. 配置 API Key

所有密钥统一放在一个文件 `JC/src/main/resources/ai-api-key.properties`（已在 `.gitignore` 中）：

```properties
# DeepSeek - 用于 AI 聊天、行程规划
deepseek.api.key=sk-your_deepseek_api_key_here
deepseek.api.url=https://api.deepseek.com
deepseek.model=deepseek-chat

# MiniMax - 用于图片生成、视频生成、音乐生成
minimax.api.key=sk-your_minimax_api_key_here
minimax.api.url=https://api.minimaxi.com

# 高德地图 - 用于地图显示与导航（获取地址：https://console.amap.com）
app.amap.key=your_amap_key_here
app.amap.security-key=your_amap_security_key_here

# JWT 签名密钥 — 生产环境请更换为随机字符串
app.jwt.secret=your_jwt_secret_here
```

参考同目录下的 `ai-api-key.properties.example`。

> 注意：`frontend/index.html` 中也需填入高德地图 Key（前端 JS API 调用，与后端 Key 相同即可）。

### 4. 初始化数据库

```bash
# 导入表结构 + 种子数据（210 个景点、337 家餐馆、337+ 设施、路网）
mysql -u root -p journeycraft < sql/init.sql
mysql -u root -p journeycraft < sql/seed_extended.sql
mysql -u root -p journeycraft < sql/osm_tables.sql
```

### 5. 启动后端

```bash
cd JC
.\mvnw spring-boot:run
```

首次启动会自动：
- JPA 创建所有表（spots, foods, users, itineraries 等）
- 从 MySQL 加载 26 万路网节点到内存
- 耗时约 15~20 秒

看到以下日志即启动成功：

```
╔══════════════════════════════════════════╗
║     JourneyCraft Tourism System v2.0     ║
║     Application started successfully!     ║
╚══════════════════════════════════════════╝
```

### 6. 安装前端依赖并启动

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

### 7. 访问

浏览器打开 `http://localhost:5173`。

同局域网用户访问 `http://你的IP:5173`。

---

## 🧪 运行测试

```bash
# 后端 193 项测试
cd JC && .\mvnw test

# 前端类型检查 + 构建
cd frontend && npm run build

# 前端单元测试
cd frontend && npx vitest run
```

---

## ⚙️ 配置文件详解

### `JC/src/main/resources/application.yml`

所有配置项都可在 `application.yml` 中直接修改。密钥已统一移至 `ai-api-key.properties`。

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|---------|-------|------|
| `spring.datasource.url` | — | `jdbc:mysql://localhost:3306/journeycraft` | MySQL 连接地址 |
| `spring.datasource.username` | `MYSQL_USER` | `root` | MySQL 用户名 |
| `spring.datasource.password` | `MYSQL_PASSWORD` | `root123` | MySQL 密码 |
| `spring.data.mongodb.uri` | `MONGODB_URI` | `mongodb://localhost:27017/JourneyCraft` | MongoDB 连接地址 |
| `server.port` | — | `8080` | 后端端口 |

> 密钥类配置（DeepSeek、MiniMax、高德地图、JWT Secret）统一在 `JC/src/main/resources/ai-api-key.properties` 中填写。

### `frontend/index.html`

高德地图 JS API 加载（如需更换自己的 Key）：

```html
<script src="https://webapi.amap.com/maps?v=2.0&key=YOUR_AMAP_KEY"></script>
```

### `frontend/vite.config.ts`

| 配置 | 默认值 | 说明 |
|------|-------|------|
| `server.port` | `5173` | 前端端口 |
| `server.host` | `localhost` | 监听地址（局域网访问需改为 `0.0.0.0`） |
| proxy `/api` | `localhost:8080` | 后端代理地址 |

---

## 🗄️ 数据库结构

### MySQL `journeycraft`

**核心表**（JPA 自动创建，含 JPA 实体类映射）：

| 表 | 行数 | 说明 |
|---|---|---|
| `spots` | 210 | 景点（景区、公园、商场、校园等，从高德 API 导入） |
| `shops` | 337 | 餐馆（从高德 API 导入的昌平区真实餐馆 POI） |
| `foods` | 0 | 美食（已由 shops 表替代，保留表结构兼容） |
| `facilities` | 337+ | 服务设施（12 个分类，高德 API 导入真实 POI） |
| `itineraries` | — | 行程（route_data 存 JSON 时间线） |
| `itinerary_collaborators` | — | 行程协作者（用户+行程关联） |
| `itinerary_invitations` | — | 行程邀请（待接受/已拒绝） |
| `users` | — | 用户 |
| `user_preferences` | — | 用户偏好设置 |
| `spot_reviews` | — | 景点评分（每人每景点唯一） |
| `food_reviews` | — | 美食评分（同时被 shops 的评分复用） |
| `shop_reviews` | — | 餐馆评分（独立 shop_reviews 表） |
| `congestion_reports` | — | 拥挤度上报（UNIQUE target_type+target_id+user_id） |
| `favorites` | — | 收藏（景点/美食/游记） |
| `browse_histories` | — | 浏览历史 |
| `search_histories` | — | 搜索历史 |
| `route_histories` | — | 路线规划历史 |
| `facility_query_histories` | — | 设施查询历史 |
| `travel_service_links` | — | 旅游服务链接 |

**路网表**（手动创建，OSM 昌平区数据）：

| 表 | 行数 | 说明 |
|---|---|---|
| `road_nodes` | 267,094 | OSM 路网节点（WGS-84 → GCJ-02 加载时转换） |
| `road_edges` | 540,956 | OSM 路网边（含道路类型、限速、拥挤度） |

### MongoDB `JourneyCraft`

| 集合 | 用途 |
|---|---|
| `diaries` | 游记（含 contentHtml 富文本，Deflate 压缩） |
| `diary_ratings` | 游记评分 |
| `chat_sessions` | AI 对话会话（DeepSeek 聊天历史） |
| `indoor_navigation` | 室内导航建筑图 |

### 文件系统

```
~/journeycraft-uploads/
├── spots/      # 景点封面（184 张）
├── foods/      # 美食封面（57 张）
└── yyyy/MM/dd/ # 用户上传文件（日记图片/视频等，≤200MB）
```

文件通过 `GET /uploads/**` 访问，Nginx 或 Spring Boot 均可直出。

---

## 📡 API 概览

所有请求前缀 `/api/v1`，响应格式：

```json
{ "success": true, "message": "", "data": { ... }, "timestamp": "..." }
```

| 方法 | 路径 | 说明 | 需登录 |
|---|---|---|---|
| POST | `/auth/login` | 登录 | — |
| POST | `/auth/register` | 注册 | — |
| POST | `/auth/refresh` | 刷新 Token | — |
| GET | `/spots` | 搜索景点（keyword/category/sortBy） | — |
| GET | `/spots/{id}` | 景点详情 | — |
| POST | `/spots/{id}/rate` | 评分 | ✅ |
| POST | `/spots/{id}/congestion` | 拥挤度上报 | ✅ |
| GET | `/shops/search` | 搜索餐馆（keyword/cuisine） | — |
| GET | `/shops/top` | 热门餐馆 | — |
| GET | `/shops/by-spot/{spotId}` | 景点附近餐馆 | — |
| GET | `/shops/{id}` | 餐馆详情 | — |
| POST | `/shops/{id}/rate` | 餐馆评分 | ✅ |
| POST | `/shops/{id}/congestion` | 餐馆拥挤度上报 | ✅ |
| GET | `/foods/search` | 搜索美食（keyword/cuisine） | — |
| GET | `/foods/{id}` | 美食详情 | — |
| POST | `/foods/{id}/rate` | 评分 | ✅ |
| POST | `/foods/{id}/congestion` | 拥挤度上报 | ✅ |
| GET/POST/PUT/DELETE | `/itineraries` | 行程 CRUD | ✅ |
| GET/POST/PUT/DELETE | `/itineraries/collaborations` | 协作行程 | ✅ |
| GET | `/diaries` | 游记列表 | — |
| GET | `/diaries/search` | 搜索游记（标题+内容+目的地） | — |
| GET/POST/PUT/DELETE | `/diaries/{id}` | 游记 CRUD | — |
| POST | `/diaries/{id}/rate` | 游记评分 | ✅ |
| POST | `/ai/plan` | AI 行程规划（DeepSeek + Amap 匹配 + Dijkstra 路径） | — |
| POST | `/ai/chat` | AI 对话 | — |
| POST | `/ai/budget` | AI 预算估算 | — |
| GET/POST/DELETE | `/ai/sessions` | AI 会话管理 | — |
| POST | `/navigation/route` | Dijkstra 路线规划 | — |
| POST | `/indoor/navigate` | 室内导航 | — |
| GET | `/search` | 统一搜索（景点+餐馆+美食+游记） | — |
| POST | `/admin/spots/refresh` | 刷新景点数据（高德 API） | ✅ |
| POST | `/admin/shops/refresh` | 刷新餐馆数据（高德 API） | ✅ |
| POST | `/admin/facilities/refresh` | 刷新设施数据 | ✅ |
| POST | `/admin/refresh-all` | 全量刷新 | ✅ |
| POST | `/files/upload` | 文件上传（≤200MB） | ✅ |
| GET/PUT | `/users/me` | 用户资料 | ✅ |

---

## 🔐 默认账号

注册页面自行注册，无预设账号。

JWT Token：
- Access Token：15 分钟过期
- Refresh Token：7 天过期
- 前端 Axios 拦截器自动刷新

---

## 🏗️ 项目架构

```
journeycraft/
├── JC/                          # Spring Boot 后端
│   └── src/main/java/.../
│       ├── ai/                  # AI 功能
│       ├── auth/                # JWT 认证
│       ├── common/              # 公共配置、CORS、文件上传
│       ├── diary/               # 游记
│       ├── food/                # 美食
│       ├── indoor/              # 室内导航
│       ├── itinerary/           # 行程
│       ├── navigation/          # 导航算法（Dijkstra/TSP/TopK/Fuzzy）
│       ├── search/              # 统一搜索
│       ├── spot/                # 景点
│       └── user/                # 用户
│
├── frontend/                    # Vue 3 + TypeScript 前端
│   ├── src/
│   │   ├── api/                 # Axios API 客户端
│   │   ├── components/          # 公共组件（RichEditor）
│   │   ├── layouts/             # 布局组件
│   │   ├── stores/              # Pinia 状态管理
│   │   └── views/               # 页面组件
│   └── package.json
│
├── sql/                         # 数据库脚本
│   ├── init.sql                 # 核心种子数据
│   ├── seed_extended.sql        # 扩展种子数据
│   └── osm_tables.sql           # OSM 路网表
│
├── scripts/                     # 工具脚本
│   ├── crawl_images_v2.py       # 百度图片爬虫
│   ├── check_images.py          # 图片检查
│   └── test_search.py           # 搜索接口测试
│
└── OSM/                         # 昌平区 OSM 路网数据
```

---

## 🎨 视觉风格

- **深色主题**：背景 `#0a0e17`，毛玻璃卡片
- **字体**：`Lucida Console` 等宽字体
- **自定义光标**：SVG 十字准线 + 圆环加号
- **彗尾粒子**：Canvas 鼠标轨迹效果
- **设计系统**：`frontend/src/assets/styles/handdrawn.css`（50+ CSS 变量）

---

## 🤖 AI 功能配置

AI 功能需要 API Key，不是必选项。配置文件位于：

```
JC/src/main/resources/ai-api-key.properties (在 .gitignore 中)
```

参考同目录下的示例文件 `ai-api-key.properties.example`。

| 服务 | 用途 | 获取地址 |
|---|---|---|
| **DeepSeek** | AI 行程规划、AI 聊天、AI 预算 | https://platform.deepseek.com |
| **MiniMax** | AI 图片生成、视频生成、音乐生成 | https://platform.minimaxi.com |

---

## 📐 核心算法

| 算法 | 用途 | 复杂度 |
|---|---|---|
| **Dijkstra** | 室外最短路径、附近设施步行距离 | O((V+E)logV) |
| **TSP**（贪心+2-opt） | 多目标最优路线 | O(k·n²) |
| **Top-K**（最小堆） | 景点/美食 Top 10 推荐 | O(nlogk) |
| **Levenshtein + Trie** | 模糊查询 / 拼写容错 | O(m·n) |
| **Deflate (LZ77+Huffman)** | 游记内容无损压缩 | 压缩比 3~8x |
| **拥挤度平均** | 景点/美食实时拥挤度 | O(n) |

---

## 🔧 常见问题

**Q: 前端访问后端报 401？**
A: 先注册账号并登录。未登录只能访问 GET 接口。

**Q: 搜索中文没结果？**
A: 确保 MySQL 连接使用 `characterEncoding=UTF-8`。前端输入中文后需要点击搜索按钮（`@keyup.enter` 在中文输入法下不触发）。

**Q: 地图不显示？**
A: 高德地图 Key 有域名限制。开发环境用 `localhost:5173` 访问。如需局域网访问，更换 `frontend/index.html` 中的 Key。

**Q: 后端启动报 MySQL 连接失败？**
A: 检查 MySQL 是否运行、root 密码是否正确。可在 `application.yml` 中修改或设置环境变量 `MYSQL_PASSWORD`。

**Q: 路网加载失败？**
A: 确保已执行 `sql/osm_tables.sql`。路网数据需要 OSM 原始数据文件（`OSM/Changping.osm.pbf`）。
