# JourneyCraft — 项目交接文档

## 📦 前置条件

| 依赖 | 版本 | 用途 |
|------|------|------|
| Java | 21+ | 后端运行（推荐 Eclipse Temurin 21） |
| Node.js | 18+ | 前端构建与运行 |
| MySQL | 8+ | 关系型数据库 |
| MongoDB | 6+ | 文档数据库 |
| Maven | 3.9+ | 后端构建（项目自带 mvnw） |

---

## 🚀 5 分钟快速启动

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

**MongoDB**（默认端口 27017）：

```bash
mongod --dbpath /data/db
```

### 3. 初始化数据库

```bash
# 一条命令完成：建表 + 种子数据
mysql -u root -p journeycraft < "handover/数据库建立.sql"

# 导入路网数据（267k 节点 + 541k 边，约 30 秒）
python scripts/import_osm_to_mysql.py
```

> 也可使用 Docker 一键启动：`docker compose up -d`

### 4. 配置 API Key

```bash
cp JC/src/main/resources/ai-api-key.properties.example JC/src/main/resources/ai-api-key.properties
```

编辑 `ai-api-key.properties`，填入你的 Key（非必须，AI 功能会优雅降级）：

```properties
deepseek.api.key=sk-your_deepseek_api_key_here
minimax.api.key=sk-your_minimax_api_key_here
app.amap.key=your_amap_key_here
```

### 5. 启动后端

```bash
cd JC
.\mvnw spring-boot:run
```

首次启动会自动：
- JPA 校验并补充缺失的表（表已存在则跳过）
- 从 MySQL 加载路网数据（约 5~10 秒）
- 看到以下日志即成功：

```
╔══════════════════════════════════════════╗
║     JourneyCraft Tourism System v2.0     ║
║     Application started successfully!     ║
╚══════════════════════════════════════════╝
```

### 6. 启动前端

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

### 7. 访问

浏览器打开 `http://localhost:5173` → 注册账号即可使用。

---

## 🐳 Docker 一键启动

```bash
docker compose up -d
```

---

## 🧪 运行测试

```bash
# 后端测试（211 项）
cd JC && .\mvnw test

# 前端类型检查 + 测试
cd frontend
npx vue-tsc --noEmit
npx vitest run
```

---

## 📁 项目结构

```
journeycraft/
├── JC/                    # Spring Boot 后端 (Java 21)
├── frontend/              # Vue 3 前端 (TypeScript)
├── sql/                   # 数据库脚本（原始文件）
├── handover/              # 项目交接文档
│   ├── 数据库建立.sql      # ✅ 完整建表 + 数据（单文件）
│   └── scripts/           # 运维脚本
├── OSM/                   # 昌平区路网原始数据
├── scripts/               # Python 数据导入工具
├── docs/                  # 设计文档
└── docker-compose.yml     # Docker 编排
```

---

## 🔧 常见问题

**Q: 后端启动报 MySQL 连接失败？**
A: 检查 MySQL 是否运行。默认密码 `root123`，可在 `application.yml` 中修改或设环境变量 `MYSQL_PASSWORD`。

**Q: 地图不显示？**
A: 在 `frontend/index.html` 和 `ai-api-key.properties` 中填入高德地图 Key。

**Q: 路网加载失败？**
A: 运行 `python scripts/import_osm_to_mysql.py` 导入 OSM 数据。

**Q: AI 功能不可用？**
A: 在 `ai-api-key.properties` 中配置 DeepSeek / MiniMax API Key。不配置不影响其他功能。
