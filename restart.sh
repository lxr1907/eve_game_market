#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
FOREVER="npx forever"

echo "=== 停止服务 ==="
$FOREVER stop backend 2>/dev/null
$FOREVER stop frontend 2>/dev/null
kill $(lsof -ti:3000) 2>/dev/null
kill $(lsof -ti:5174) 2>/dev/null
sleep 2

echo "=== 启动后端 (port 3000) ==="
cd "$PROJECT_DIR/backend"
$FOREVER start --uid "backend" server.js

echo "=== 启动前端 (port 5174) ==="
cd "$PROJECT_DIR/frontend"
$FOREVER start --uid "frontend" -c "npx vite" .

cd "$PROJECT_DIR"
echo "=== 状态 ==="
sleep 3
$FOREVER list
echo ""
echo "后端: http://localhost:3000"
echo "前端: http://localhost:5174"
