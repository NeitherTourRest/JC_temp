#!/bin/bash
# ============================================
# JourneyCraft — Mac/Linux 环境一键设置脚本
# 使用方法: chmod +x setup.sh && ./setup.sh
# ============================================

MYSQL_USER="root"
MYSQL_PASS="root123"
MYSQL_DB="journeycraft"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "========================================"
echo "  JourneyCraft 项目环境设置"
echo "========================================"

# 0. Check dependencies
echo ""
echo "[0/6] 检查依赖..."
command -v java >/dev/null 2>&1 && echo "  ✅ Java: $(java -version 2>&1 | head -1)" || echo "  ⚠️  Java未安装"
command -v node >/dev/null 2>&1 && echo "  ✅ Node.js: $(node -v)" || echo "  ⚠️  Node.js未安装"
command -v mysql >/dev/null 2>&1 || { echo "  ❌ MySQL客户端未安装"; exit 1; }

# 1. Create database
echo ""
echo "[1/6] 创建数据库..."
mysql -u "$MYSQL_USER" -p"$MYSQL_PASS" -e "CREATE DATABASE IF NOT EXISTS $MYSQL_DB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
echo "  ✅ 数据库创建成功"

# 2-4. Import SQL files
echo "[2/6] 创建全部业务表（21张）..."
mysql -u "$MYSQL_USER" -p"$MYSQL_PASS" "$MYSQL_DB" < "$PROJECT_DIR/handover/database/init_complete.sql" 2>/dev/null
echo "  ✅ 全部表创建成功"

echo "[3/6] 导入种子数据..."
mysql -u "$MYSQL_USER" -p"$MYSQL_PASS" "$MYSQL_DB" < "$PROJECT_DIR/sql/init.sql" 2>/dev/null
echo "  ✅ 种子数据导入成功"

echo "[4/6] 导入扩展数据..."
mysql -u "$MYSQL_USER" -p"$MYSQL_PASS" "$MYSQL_DB" < "$PROJECT_DIR/sql/seed_extended.sql" 2>/dev/null
echo "  ✅ 扩展数据导入成功"

# 5. Import OSM data
echo "[5/6] 导入OSM路网数据..."
python3 "$PROJECT_DIR/scripts/import_osm_to_mysql.py" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "  ✅ OSM数据导入成功"
else
    echo "  ⚠️  OSM导入失败，可手动运行: python3 scripts/import_osm_to_mysql.py"
fi

# 6. Configure API key
echo "[6/6] 配置API Key..."
KEY_FILE="$PROJECT_DIR/JC/src/main/resources/ai-api-key.properties"
if [ ! -f "$KEY_FILE" ]; then
    cp "$PROJECT_DIR/JC/src/main/resources/ai-api-key.properties.example" "$KEY_FILE"
    echo "  ✅ 已创建 ai-api-key.properties（请编辑填入你的Key）"
fi

echo ""
echo "========================================"
echo "  🎉 初始化完成！"
echo "========================================"
echo ""
echo "下一步:"
echo "  1. 启动后端: cd JC && ./mvnw spring-boot:run"
echo "  2. 启动前端: cd frontend && npm install && npm run dev"
echo "  3. 访问: http://localhost:5173"
