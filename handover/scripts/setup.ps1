# ============================================
# JourneyCraft — Windows 环境一键设置脚本
# 以管理员身份运行 PowerShell，执行：
#   .\setup.ps1
# ============================================

$MYSQL_USER = "root"
$MYSQL_PASS = "root123"
$MYSQL_DB   = "journeycraft"
$PROJECT_DIR = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  JourneyCraft 项目环境设置" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 0. 检查依赖
Write-Host "`n[0/6] 检查依赖..." -ForegroundColor Yellow
$hasJava = Get-Command java -ErrorAction SilentlyContinue
$hasNode = Get-Command node -ErrorAction SilentlyContinue
$hasMysql = Get-Command mysql -ErrorAction SilentlyContinue

if (-not $hasJava) { Write-Host "  ⚠️  Java 未安装。后端需要 Java 21+" -ForegroundColor Red }
else { $javaVer = java -version 2>&1 | Select-String "version" | ForEach-Object { $_.ToString() }; Write-Host "  ✅ Java: $javaVer" -ForegroundColor Green }

if (-not $hasNode) { Write-Host "  ⚠️  Node.js 未安装。前端需要 Node.js 18+" -ForegroundColor Red }
else { $nodeVer = node -v; Write-Host "  ✅ Node.js: $nodeVer" -ForegroundColor Green }

if (-not $hasMysql) { Write-Host "  ❌ MySQL 客户端未安装！" -ForegroundColor Red; exit 1 }
else { Write-Host "  ✅ MySQL 客户端可用" -ForegroundColor Green }

# 1. 创建数据库
Write-Host "`n[1/6] 创建数据库 $MYSQL_DB ..." -ForegroundColor Yellow
mysql -u $MYSQL_USER -p$MYSQL_PASS -e "CREATE DATABASE IF NOT EXISTS $MYSQL_DB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>$null
if ($?) { Write-Host "  ✅ 数据库创建成功" -ForegroundColor Green }
else { Write-Host "  ❌ 数据库创建失败，请检查 MySQL 连接" -ForegroundColor Red; exit 1 }

# 2. 创建全部业务表（21 张表，含 OSM 路网表）
Write-Host "`n[2/6] 创建全部业务表..." -ForegroundColor Yellow
mysql -u $MYSQL_USER -p$MYSQL_PASS $MYSQL_DB < "$PROJECT_DIR\handover\database\init_complete.sql" 2>$null
if ($?) { Write-Host "  ✅ 全部表创建成功" -ForegroundColor Green }
else { Write-Host "  ❌ 表创建失败" -ForegroundColor Red }

# 3. 导入种子数据（景点、美食、设施）
Write-Host "`n[3/6] 导入种子数据（景点 + 美食 + 设施）..." -ForegroundColor Yellow
mysql -u $MYSQL_USER -p$MYSQL_PASS $MYSQL_DB < "$PROJECT_DIR\sql\init.sql" 2>$null
if ($?) { Write-Host "  ✅ 种子数据导入成功" -ForegroundColor Green }
else { Write-Host "  ❌ 种子数据导入失败" -ForegroundColor Red }

# 4. 导入扩展种子数据
Write-Host "`n[4/6] 导入扩展种子数据..." -ForegroundColor Yellow
mysql -u $MYSQL_USER -p$MYSQL_PASS $MYSQL_DB < "$PROJECT_DIR\sql\seed_extended.sql" 2>$null
if ($?) { Write-Host "  ✅ 扩展数据导入成功" -ForegroundColor Green }
else { Write-Host "  ❌ 扩展数据导入失败" -ForegroundColor Red }

# 5. 导入 OSM 路网数据
Write-Host "`n[5/6] 导入 OSM 路网数据（267k 节点 + 541k 边）..." -ForegroundColor Yellow
Write-Host "  运行 Python 导入脚本..." -ForegroundColor Gray
python "$PROJECT_DIR\scripts\import_osm_to_mysql.py" 2>$null
if ($?) { Write-Host "  ✅ OSM 数据导入成功" -ForegroundColor Green }
else { 
    Write-Host "  ⚠️  OSM 数据导入失败，可稍后手动运行：" -ForegroundColor Yellow
    Write-Host "     python scripts/import_osm_to_mysql.py" -ForegroundColor Gray
    Write-Host "  后端启动时会跳过路网加载，不影响其他功能" -ForegroundColor Gray
}

# 6. 配置 API Key
Write-Host "`n[6/6] 检查 API Key 配置..." -ForegroundColor Yellow
$keyFile = "$PROJECT_DIR\JC\src\main\resources\ai-api-key.properties"
if (-not (Test-Path $keyFile)) {
    Copy-Item "$PROJECT_DIR\JC\src\main\resources\ai-api-key.properties.example" $keyFile
    Write-Host "  ✅ 已创建 ai-api-key.properties（请编辑填入你的 Key）" -ForegroundColor Green
    Write-Host "  编辑文件: JC\src\main\resources\ai-api-key.properties" -ForegroundColor Gray
} else {
    Write-Host "  ✅ ai-api-key.properties 已存在" -ForegroundColor Green
}

# 完成
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  🎉 数据库初始化完成！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步：" -ForegroundColor Yellow
Write-Host "  1. 启动后端: cd JC && .\mvnw spring-boot:run" -ForegroundColor White
Write-Host "  2. 启动前端: cd frontend && npm install && npm run dev" -ForegroundColor White
Write-Host "  3. 访问: http://localhost:5173" -ForegroundColor White
