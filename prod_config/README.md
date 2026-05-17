# EVE 服务器部署配置文档

## 服务器信息

- **服务器 IP**: 47.81.34.173
- **域名**: raoganzi.com
- **操作系统**: Ubuntu 26.04 LTS
- **项目路径**: /root/eve/

## 服务架构

```
用户访问 (raoganzi.com:80)
    ↓
Nginx (端口 80) - 反向代理
    ↓
├── / (前端)     → Vite Dev Server (端口 5175)
└── /api/ (后端) → Node.js API Server (端口 3000)
```

## 服务状态

| 服务 | 状态 | 端口 | 说明 |
|------|------|------|------|
| Nginx | ✅ 运行中 | 80 | Web 服务器/反向代理 |
| MySQL | ✅ 运行中 | 3306 | 数据库服务 |
| 后端 API | ✅ 运行中 | 3000 | Express API 服务 |
| 前端页面 | ✅ 运行中 | 5175 | Vite 开发服务器 |

## Forever 进程管理

### 1. 安装 Forever
```bash
# 全局安装 Forever
npm install -g forever
```

### 2. 启动服务

#### 后端服务
```bash
cd /root/eve/backend
forever start server.js
```

#### 前端服务
```bash
cd /root/eve/frontend
forever start -c 'npm run dev -- --host 0.0.0.0' .
```

### 3. 服务管理命令

#### 查看运行中的进程
```bash
forever list
```

#### 重启所有服务
```bash
forever restartall
```

#### 重启特定服务
```bash
# 根据 uid 或 pid 重启
forever restart <uid_or_pid>
```

#### 停止所有服务
```bash
forever stopall
```

#### 停止特定服务
```bash
# 根据 uid 或 pid 停止
forever stop <uid_or_pid>
```

### 4. 日志查看

#### 查看所有日志
```bash
# 查看所有 Forever 日志
forever logs
```

#### 查看特定服务日志
```bash
# 根据 uid 或 pid 查看日志
forever logs <uid_or_pid>

# 实时查看日志
forever logs <uid_or_pid> -f
```

### 5. 常见问题排查

#### 服务启动失败
```bash
# 查看最新日志
forever logs 0

# 检查端口占用
lsof -i :3000  # 后端端口
lsof -i :5175  # 前端端口

# 杀死占用端口的进程
kill -9 <pid>
```

#### 服务自动退出
```bash
# 查看服务退出原因
forever logs <uid_or_pid>

# 检查是否有足够的内存
free -h

# 检查 Node.js 版本兼容性
node -v
```

## 部署步骤

### 1. 环境安装

```bash
# 安装 MySQL
sudo apt update
sudo apt install -y mysql-server

# 启动 MySQL 并设置开机自启
sudo systemctl start mysql
sudo systemctl enable mysql

# 安装 Node.js 和 npm
sudo apt install -y nodejs npm
```

### 2. 数据库配置

```bash
# 创建数据库和用户
sudo mysql < /path/to/setup_db.sql

# setup_db.sql 内容:
# CREATE DATABASE IF NOT EXISTS eve_killboard;
# CREATE USER IF NOT EXISTS 'eve_user'@'localhost' IDENTIFIED BY 'eve_password';
# GRANT ALL PRIVILEGES ON eve_killboard.* TO 'eve_user'@'localhost';
# FLUSH PRIVILEGES;
```

### 3. 项目部署

```bash
# 拉取代码
cd ~/eve

# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 4. 环境变量配置

将 `backend.env` 文件上传到 `/root/eve/backend/.env`:

```bash
scp backend.env root@47.81.34.173:/root/eve/backend/.env
```

**backend.env 配置内容**:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=eve_user
DB_PASSWORD=eve_password
DB_NAME=eve_killboard
API_PORT=3000
```

### 5. 控制器文件名修复

由于 Git 在 Windows 和 Linux 之间的大小写敏感问题，需要修复控制器文件名：

```bash
cd /root/eve/backend/controllers

# 确保所有控制器文件名首字母大写
# 检查文件列表（应全部为大写开头）：
ls -la

# 如需重命名（正常情况下已正确）:
mv typecontroller.js TypeController.js 2>/dev/null || true
```

### 6. Nginx 配置

将 `nginx.conf` 上传到服务器并启用：

```bash
# 上传配置
scp nginx.conf root@47.81.34.173:/etc/nginx/sites-available/raoganzi.conf

# 启用站点
sudo ln -s /etc/nginx/sites-available/raoganzi.conf /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # 移除默认站点

# 测试并重启
sudo nginx -t
sudo systemctl restart nginx
```

**nginx.conf 配置说明**:
- 监听 80 端口
- `/` 路径代理到前端 (localhost:5175)
- `/api/` 路径代理到后端 API (localhost:3000)

### 7. 启动服务

```bash
# 启动后端
cd /root/eve/backend
npm run start

# 启动前端（后台运行，监听所有接口）
cd /root/eve/frontend
npm run dev -- --host 0.0.0.0
```

## 常用命令

### 服务管理

```bash
# 后端服务
cd /root/eve/backend && npm run start

# 前端服务
cd /root/eve/frontend && npm run dev -- --host 0.0.0.0

# Nginx 服务
sudo systemctl restart nginx
sudo systemctl status nginx

# MySQL 服务
sudo systemctl restart mysql
sudo systemctl status mysql
```

### 日志查看

```bash
# Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# Nginx 访问日志
sudo tail -f /var/log/nginx/access.log

# 后端输出（直接查看终端）
```

### 进程管理

```bash
# 查看 Node 进程
ps aux | grep node

# 杀死进程
kill <PID>

# 杀死所有 node 进程
pkill -9 node
```

## 防火墙配置

```bash
# 检查防火墙状态
sudo ufw status

# 如需开放端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 5175/tcp
```

## 阿里云安全组配置

**重要**: 必须在阿里云 ECS 控制台的安全组中开放以下端口：

- **80/tcp** - HTTP 访问
- **443/tcp** - HTTPS 访问（可选）
- **22/tcp** - SSH 远程连接

## 访问地址

- **网站首页**: http://raoganzi.com
- **API 文档**: http://raoganzi.com/api
- **健康检查**: http://raoganzi.com/api/health

## 数据同步

项目启动时会自动同步以下数据：

1. 数据库表结构初始化
2. LP 收益计算定时任务（每 20 分钟）
3. 在线玩家统计（每 5 分钟）
4. LP 蓝图计算定时任务

## 注意事项

1. **大小写敏感**: Linux 文件系统大小写敏感，确保控制器文件名正确
2. **数据库连接**: 确保 MySQL 已启动且 `eve_user` 权限正确
3. **端口占用**: 如果端口被占用，使用 `lsof -i :端口号` 检查
4. **前端 API 地址**: 前端配置中 API 地址为 `http://localhost:3000`，Nginx 已配置反向代理

## 故障排查

### 无法访问网站

1. 检查 Nginx 是否运行: `sudo systemctl status nginx`
2. 检查端口监听: `sudo netstat -tlnp | grep :80`
3. 检查防火墙: `sudo ufw status`
4. 检查阿里云安全组是否开放 80 端口

### 502 Bad Gateway

1. 检查后端服务是否运行: `curl http://localhost:3000/api/health`
2. 检查前端服务是否运行: `curl http://localhost:5175`
3. 重启相关服务

### 数据库连接失败

1. 检查 MySQL 是否运行: `sudo systemctl status mysql`
2. 检查数据库凭据: `cat /root/eve/backend/.env`
3. 测试数据库连接: `mysql -u eve_user -p eve_killboard`
