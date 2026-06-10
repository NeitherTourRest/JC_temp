# JourneyCraft 🗺️

北京昌平区智能旅行规划平台。覆盖景点、美食、室内导航、AI 行程助手等功能。

---

## 技术栈

| 层 | 技术 |
|---|---|
| **前端** | Vue 3, TypeScript, Vite 6, Element Plus, Vue Router, Pinia, Axios |
| **后端** | Java 21, Spring Boot 3.x, Spring Security, Spring Data JPA |
| **数据库** | MySQL (spots, foods, itineraries, users), MongoDB (diaries, AI chat sessions) |
| **地图** | AMap (高德) — 室内地图 & 室外导航 |
| **AI** | DeepSeek API — 行程规划、预算估算; MiniMax API — 日记生成、图片生成 |
| **室内导航** | Dijkstra 最短路径 + 自定义室内图 (416 节点, 415 边) |
| **认证** | JWT (access token 15 分钟, refresh token 7 天) |
| **部署** | Docker Compose (MySQL + MongoDB + backend) |

## 目录结构

```
├── JC/                          # Spring Boot 后端
│   └── src/main/java/.../
│       ├── ai/                  # AI 对话、预算、规划、DeepSeek/MiniMax 集成
│       ├── auth/                # JWT 认证、登录、注册
│       ├── common/              # 配置 (CORS, Security, MongoDB, Jackson), 异常处理, 文件上传
│       ├── congestion/          # 拥挤度上报 (统一 SPOT/FOOD 表)
│       ├── diary/               # 游记 CRUD, AI 自动生成
│       ├── food/                # 美食搜索 & 详情
│       ├── indoor/              # 室内建筑模型 & 导航
│       ├── itinerary/           # 行程 CRUD (JSON route_data)
│       ├── navigation/          # Dijkstra, TSP, POI 搜索, 路网
│       ├── search/              # 跨模块统一搜索
│       ├── spot/                # 景点 CRUD & 搜索
│       └── user/                # 用户资料 & 偏好
│
├── frontend/                    # Vue 3 前端
│   ├── src/
│   │   ├── api/                 # REST API 客户端 (Axios)
│   │   ├── assets/styles/       # handdrawn.css (完整设计系统)
│   │   ├── layouts/             # 默认布局 (顶部导航栏)
│   │   ├── router/              # 路由 (懒加载)
│   │   ├── stores/              # Pinia 状态管理 (auth, ai)
│   │   ├── types/               # TypeScript 类型定义
│   │   └── views/               # 功能页面 (按模块分目录)
│   └── package.json
│
├── sql/                         # 数据库初始化脚本
│   ├── init.sql                 # 建表 (spots, foods, itineraries...)
│   ├── osm_tables.sql           # OSM 路网表
│   └── seed_extended.sql        # 种子数据
│
├── OSM/                         # OpenStreetMap 路网数据 (昌平区)
├── scripts/                     # Python 工具脚本 (爬图、数据迁移)
├── docs/                        # 设计文档
└── docker-compose.yml           # Docker 部署
```

## 功能一览

### 🗺️ 行程规划
- **时间轴编辑器** — 逐天添加时间槽 (09:00-18:00)，支持景点/美食/自由活动
- **AI 行程规划** — 输入天数、兴趣、预算 → AI 生成完整行程 → 自动匹配数据库景点/美食 → 一键填入时间轴
- **路线规划** — 按时间顺序对各时间槽做 Dijkstra 路径计算，显示总距离/步行时间
- **预算估算** — AI 估算各类花费，可一键填入行程
- **地图拾取** — 在高德地图上点击添加位置点

### 🏛️ 景点 & 美食
- **206 个景点** — 景区、博物馆、公园、高校、商圈、交通枢纽、生活服务
- **57 道美食** — 本地菜、日料、火锅、小吃等
- **详情页** — 统一 900px 布局，轮播图、详情表、评分、拥挤度、附近景点/美食
- **评分系统** — 每人每目标一条评分 (可覆盖)，实时计算平均分
- **拥挤度上报** — 5 级 (Empty~Overflowing)，简单平均算法，每人每目标一条

### 🧭 室内导航
- 北邮综合楼 5 层室内图 (416 节点)
- Dijkstra 室内路径规划，跨楼层楼梯连接
- 交互式楼层选择器，Canvas 路线绘制

### 🌐 室外导航
- 高德地图集成，路线可视化
- POI 搜索、路网查询
- TSP 多目标优化

### 🤖 AI 功能
- **AI 行程规划** — DeepSeek 生成结构化行程，自动匹配景点/美食实体
- **AI 预算估算** — 分类别费用估算
- **AI 对话** — 会话管理 (持久化到 MongoDB)，侧边栏切换/新建/删除
- **AI 日记** — 从签到数据自动生成游记，AI 配图/视频/音乐

### 🔍 搜索
- 跨模块统一搜索 (景点 + 美食 + 游记)
- 分类筛选、分页、模糊匹配

## 快速开始

### 前置条件

- Java 21+
- Node.js 18+
- MySQL 8+
- MongoDB 6+
- 高德地图开发者 Key *(用于地图)*
- DeepSeek API Key *(用于 AI 行程规划)*
- MiniMax API Key *(用于 AI 图片/视频生成)*

### 配置文件

**AI API Keys** (`JC/src/main/resources/ai-api-key.properties`，gitignored)：

```properties
minimax.api.key=your_minimax_api_key
deepseek.api.key=your_deepseek_api_key
```

**数据库** (按顺序执行)：

```bash
mysql -u root -p journeycraft < sql/init.sql
mysql -u root -p journeycraft < sql/osm_tables.sql
mysql -u root -p journeycraft < sql/seed_extended.sql
```

**高德地图 Key** (`frontend/index.html`)：

```html
<script src="https://webapi.amap.com/maps?v=2.0&key=YOUR_AMAP_KEY"></script>
```

也支持在 `application.yml` 中用环境变量覆盖：

```yaml
# 高德地图安全密钥 (JS API 1.4+ 需要)
app.amap.key=${AMAP_KEY:your_key}
app.amap.security-key=${AMAP_SECURITY_KEY:your_security_key}

# JWT
app.jwt.secret=${JWT_SECRET:your_secret}

# MySQL
spring.datasource.password=${MYSQL_PASSWORD:root123}

# MongoDB
spring.data.mongodb.uri=${MONGODB_URI:mongodb://localhost:27017/JourneyCraft}
```

### 运行

```bash
# 1. 启动后端 (端口 8080)
cd JC
.\mvnw spring-boot:run

# 2. 启动前端 (端口 5173)
cd frontend
npm install
npm run dev

# 局域网访问: 启动前端时加 --host
npm run dev -- --host 0.0.0.0
# 同局域网用户访问 http://你的IP:5173
```

### Docker

```bash
docker compose up -d
```
启动 MySQL :3306 + MongoDB :27017 + 后端 :8080（前端需另外运行）。

### 测试

```bash
# 后端 161 项测试
cd JC && .\mvnw test

# 前端类型检查 + 构建
cd frontend && npm run build

# 前端单元测试
cd frontend && npx vitest run
```

## API 概览

所有 API 前缀 `/api/v1`，响应格式 `ApiResponse<T>`：

```json
{ "success": true, "message": "", "data": { ... }, "timestamp": "..." }
```

| 方法 | 路径 | 说明 | 需认证 |
|---|---|---|---|
| POST | `/auth/login` | 登录 | - |
| POST | `/auth/register` | 注册 | - |
| POST | `/auth/refresh` | 刷新 Token | - |
| GET | `/spots` | 搜索景点 (分页/关键词/分类) | - |
| GET | `/spots/{id}` | 景点详情 | - |
| POST | `/spots/{id}/rate` | 给景点评分 | ✅ |
| POST | `/spots/{id}/congestion` | 上报景点拥挤度 | ✅ |
| GET | `/spots/{id}/foods/nearby` | 附近美食 | - |
| GET | `/foods` | 搜索美食 | - |
| GET | `/foods/{id}` | 美食详情 | - |
| POST | `/foods/{id}/rate` | 给美食评分 | ✅ |
| POST | `/foods/{id}/congestion` | 上报美食拥挤度 | ✅ |
| GET/POST/PUT/DELETE | `/itineraries` | 行程 CRUD | ✅ |
| POST | `/ai/plan` | AI 行程规划 (返回匹配实体) | - |
| POST | `/ai/budget` | AI 预算估算 | - |
| POST | `/ai/chat` | AI 对话 | - |
| GET/POST/DELETE | `/ai/sessions` | AI 会话管理 | - |
| POST | `/navigation/route` | 路线计算 (Dijkstra) | - |
| POST | `/indoor/navigate` | 室内导航 | - |
| GET | `/search` | 统一搜索 | - |
| POST | `/files/upload` | 文件上传 (≤200MB) | ✅ |
| GET/PUT | `/users/me` | 用户资料 | ✅ |

## 视觉设计

### 主题 (Dark)
- 背景 `#0a0e17`，全站深色主题
- 灵感来源于 haowallpaper.com 的毛玻璃 + 科技感设计
- 字体: `Lucida Console`, 等宽字体

### 设计系统 (`handdrawn.css`)
- CSS 变量: `--bg-primary`, `--frosted-glass`, `--text-primary` 等 50+ 变量
- 毛玻璃卡片: `class="glass"` — `backdrop-filter: blur()` + 半透明背景
- 自定义光标: SVG 十字准线 (默认) / 圆环加号 (可交互元素)
- 彗尾粒子效果: Canvas 鼠标轨迹

### 关键样式类
```css
.glass    /* 毛玻璃卡片 */
.glass-sm /* 小号毛玻璃 */
.hao-card /* 内容卡片 */
.frosted  /* 毛玻璃背景区 */
```

## 图片数据

项目包含 206 个景点和 57 道美食的图片，均通过百度图片搜索自动爬取并存放在 `~/journeycraft-uploads/`：

```
~/journeycraft-uploads/
├── spots/      # 184 张景点图片 (平均 99KB)
└── foods/      # 57 张美食图片 (平均 75KB)
```

如需重新爬取，运行脚本：

```bash
cd scripts
pip install requests pymysql Pillow
python crawl_images_v2.py
```

## 算法说明

### 拥挤度算法
- 每人每目标一条记录 (UNIQUE 约束)
- 重复提交覆盖原值
- 所有用户简单平均 → 映射 5 级 (Empty/SPARSE/MODERATE/CROWDED/OVERFLOWING)
- 无时间权重

### 路线规划
- Dijkstra 最短路径 (DISTANCE/TIME 策略)
- 行程内: 按时间槽顺序，相邻两点间依次计算，累加总距离/时间
- 步行速度: 80m/min (≈ 5km/h)

### AI 行程匹配
- AI 返回活动名称 → 逐级模糊匹配 (LIKE %keyword%)
- 优先级: 景点名 → 美食名 → 地点文本 (降级)
- 匹配到的实体携带坐标，直接用于路线规划

## License

[MIT](LICENSE)
