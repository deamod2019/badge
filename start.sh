#!/bin/bash

# MicroBadge System 启动脚本
# 同时启动前端和后端服务

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   MicroBadge System 2.0 启动中...${NC}"
echo -e "${BLUE}========================================${NC}"

# 检查依赖是否安装
check_dependencies() {
    echo -e "\n${YELLOW}检查依赖...${NC}"
    
    if [ ! -d "$BACKEND_DIR/node_modules" ]; then
        echo -e "${YELLOW}安装后端依赖...${NC}"
        cd "$BACKEND_DIR" && npm install
    fi
    
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        echo -e "${YELLOW}安装前端依赖...${NC}"
        cd "$FRONTEND_DIR" && npm install
    fi
    
    echo -e "${GREEN}依赖检查完成！${NC}"
}

# 清理函数：当脚本退出时终止所有子进程
cleanup() {
    echo -e "\n${YELLOW}正在关闭所有服务...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}服务已关闭${NC}"
    exit 0
}

# 捕获退出信号
trap cleanup SIGINT SIGTERM

# 检查并安装依赖
check_dependencies

# 启动后端
echo -e "\n${GREEN}启动后端服务 (端口 3001)...${NC}"
cd "$BACKEND_DIR"
npm run dev &
BACKEND_PID=$!

# 等待后端启动
sleep 2

# 启动前端
echo -e "\n${GREEN}启动前端服务 (端口 5173)...${NC}"
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✓ 服务已启动！${NC}"
echo -e "${BLUE}----------------------------------------${NC}"
echo -e "  前端: ${GREEN}http://localhost:5173${NC}"
echo -e "  后端: ${GREEN}http://localhost:3001${NC}"
echo -e "${BLUE}----------------------------------------${NC}"
echo -e "${YELLOW}按 Ctrl+C 停止所有服务${NC}"
echo -e "${BLUE}========================================${NC}\n"

# 等待子进程
wait
