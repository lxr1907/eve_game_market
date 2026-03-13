# EVE Project - EVE Online 数据查询与分析平台

## 📖 项目简介

EVE Project 是一个基于 **EVE Online** 游戏数据的综合性查询与分析平台，提供星图浏览、市场订单查询、忠诚点兑换、玩家在线统计、星系击杀统计等多种功能。项目采用前后端分离架构，后端使用 Node.js + Express，前端使用 Vue 3 + Vite。

## ✨ 核心功能

### 后端功能 (Backend)
- 🌌 **EVE API 数据同步**：从 EVE Online ESI API 同步宇宙数据（类型、星系、区域等）
- 📊 **市场订单查询**：查询和分析游戏内市场订单数据
- 💎 **忠诚点兑换分析**：忠诚点商店兑换物品的利润计算
- 🎮 **玩家在线统计**：实时统计在线玩家数量
- ⚔️ **星系击杀统计**：记录和分析各星系的舰船击杀数据
- 🗺️ **星门导航系统**：星门数据和星系距离计算
- 📈 **定时任务调度**：自动同步各类游戏数据

### 前端功能 (Frontend)
- 🖥️ **数据列表展示**：类型、区域、星系等数据浏览
- 🔍 **详情查询**：查看各类数据的详细信息
- 📊 **数据可视化**：图表展示统计信息
- 🌠 **星图浏览**：可视化星图和星系连接
- 🎨 **暗色主题**：符合游戏风格的界面设计

## 🏗️ 技术架构

### 后端技术栈
```
├── Node.js (v14+)
├── Express.js (v5.2.1)
├── MySQL8 (数据库连接)
├── Axios (HTTP 请求)
├── CORS (跨域支持)
├── Helmet (安全增强)
├── Morgan (日志记录)
└── Dotenv (环境变量管理)
```

### 前端技术栈
```
├── Vue 3 (v3.5.24)
├── Vite (v7.2.4)
├── Vue Router (路由管理)
├── Element Plus (UI 组件库)
├── ECharts (数据可视化)
├── Phaser (游戏引擎 - 用于星图展示)
├── Axios (HTTP 客户端)
└── Vue-ECharts (ECharts Vue 组件)
```

### 数据库
- **MySQL**：存储所有游戏数据、订单信息、统计数据等

## 📁 项目结构

```
eve-project/
├── backend/                      # 后端服务
│   ├── config/                   # 配置文件
│   │   └── database.js          # 数据库连接配置
│   ├── controllers/              # 控制器层
│   │   ├── CategoryController.js
│   │   ├── GroupController.js
│   │   ├── LoyaltyController.js
│   │   ├── OnlinePlayerStatsController.js
│   │   ├── OrderController.js
│   │   ├── RegionController.js
│   │   ├── StarMapController.js
│   │   ├── SystemController.js
│   │   ├── SystemKillController.js
│   │   └── TypeController.js
│   ├── models/                   # 数据模型层
│   │   ├── Category.js
│   │   ├── Constellation.js
│   │   ├── Group.js
│   │   ├── LoyaltyOffer.js
│   │   ├── LoyaltyTypeLpIsk.js
│   │   ├── OnlinePlayerStats.js
│   │   ├── Order.js
│   │   ├── Region.js
│   │   ├── RegionType.js
│   │   ├── Stargate.js
│   │   ├── System.js
│   │   ├── SystemKill.js
│   │   └── Type.js
│   ├── routes/                   # 路由定义
│   │   ├── categoryRoutes.js
│   │   ├── groupRoutes.js
│   │   ├── loyaltyRoutes.js
│   │   ├── onlinePlayerStatsRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── regionRoutes.js
│   │   ├── starMapRoutes.js
│   │   ├── systemKillRoutes.js
│   │   ├── systemRoutes.js
│   │   └── typeRoutes.js
│   ├── services/                 # 服务层
│   │   └── eveApiService.js     # EVE API 调用服务
│   ├── utils/                    # 工具函数和定时任务
│   │   ├── initDatabase.js      # 数据库初始化
│   │   ├── syncDatabaseStructure.js  # 数据库结构同步
│   │   ├── onlinePlayerStatsScheduler.js
│   │   ├── systemKillScheduler.js
│   │   ├── systemDetailsScheduler.js
│   │   ├── stargateScheduler.js
│   │   ├── systemDistanceScheduler.js
│   │   └── loyaltyProfitScheduler.js
│   ├── app.js                    # Express 应用主文件
│   ├── server.js                 # 服务器启动入口
│   └── .env.example              # 环境变量示例
│
├── frontend/                     # 前端应用
│   ├── public/                   # 静态资源
│   ├── src/                      # 源代码
│   │   ├── components/           # 公共组件
│   │   │   ├── Navbar.vue
│   │   │   └── HelloWorld.vue
│   │   ├── views/                # 页面视图
│   │   │   ├── HomeView.vue
│   │   │   ├── TypeListView.vue
│   │   │   ├── TypeDetailView.vue
│   │   │   ├── RegionListView.vue
│   │   │   ├── RegionDetailView.vue
│   │   │   ├── OrderQueryView.vue
│   │   │   ├── LoyaltyOfferView.vue
│   │   │   ├── ProfitDataView.vue
│   │   │   ├── OnlinePlayerStatsView.vue
│   │   │   ├── SystemListView.vue
│   │   │   ├── SystemDetailView.vue
│   │   │   ├── SystemKillView.vue
│   │   │   └── StarMapView.vue
│   │   ├── router/               # 路由配置
│   │   │   └── index.js
│   │   ├── services/             # API 服务
│   │   │   └── api.js
│   │   ├── game/                 # 游戏相关模块
│   │   │   ├── config/
│   │   │   ├── data/
│   │   │   ├── objects/
│   │   │   └── scenes/
│   │   ├── App.vue               # 根组件
│   │   └── main.js               # 应用入口
│   ├── dist/                     # 构建输出目录
│   └── vite.config.js            # Vite 配置文件
│
├── pyfa_fittings/                # PYFA 装配文件
├── check_security.py             # 安全检查脚本
├── analyze_security.py           # 安全分析脚本
└── highsec_data.json             # 高安地区数据
```

## 🚀 快速开始

### 环境要求
- Node.js >= 14.x
- MySQL >= 8.0
- npm 或 yarn

### 1. 克隆项目
```bash
git clone <repository-url>
cd eve-project
```

### 2. 后端配置

#### 安装依赖
```bash
cd backend
npm install
```

#### 配置环境变量
```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
# 服务器配置
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=eve

# EVE Online API配置
EVE_API_BASE_URL=https://ali-esi.evepc.163.com/
EVE_API_VERSION=latest
EVE_API_LANGUAGE=zh
EVE_API_COMPATIBILITY_DATE=2025-11-06
```

#### 初始化数据库
```bash
npm run init-db
```

#### 启动后端服务
```bash
npm start
# 或开发模式
npm run dev
```

后端服务将在 `http://localhost:3000` 启动

### 3. 前端配置

#### 安装依赖
```bash
cd frontend
npm install
```

#### 启动前端开发服务器
```bash
npm run dev
```

前端应用将在 `http://localhost:5173` 启动（默认端口）

#### 构建生产版本
```bash
npm run build
```

## 📡 API 接口

### 主要 API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/types` | GET | 获取类型列表 |
| `/api/types/:id` | GET | 获取类型详情 |
| `/api/types/sync` | POST | 同步类型数据 |
| `/api/regions` | GET | 获取区域列表 |
| `/api/regions/:id` | GET | 获取区域详情 |
| `/api/orders` | GET | 查询市场订单 |
| `/api/loyalty/offers` | GET | 获取忠诚点兑换物品 |
| `/api/online-player-stats` | GET | 获取在线玩家统计 |
| `/api/systems` | GET | 获取星系列表 |
| `/api/system-kills` | GET | 获取星系击杀统计 |
| `/api/star-map` | GET | 获取星图数据 |

### 健康检查
```bash
GET /health
# 响应：{"status": "ok", "message": "EVE Online API Service is running"}
```

## 🎯 核心功能说明

### 1. 数据同步系统
- **Type 同步**：从 EVE API 同步所有物品类型数据
- **Region 同步**：同步游戏内所有区域数据
- **System 同步**：同步星系数据和坐标信息
- **Stargate 同步**：同步星门数据和连接关系
- **定时任务**：自动更新在线人数、击杀统计等动态数据

### 2. 忠诚点利润分析
- 计算忠诚点商店物品的兑换价值
- 分析 LP/ISK 比率
- 识别高利润兑换选项

### 3. 市场订单查询
- 查询各区域的订单数据
- 分析市场价格趋势
- 支持按类型、区域筛选

### 4. 星图可视化
- 使用 Phaser 引擎渲染星图
- 显示星系连接和安全等级
- 支持交互式浏览

## 📝 数据库模型

### 主要数据表
- **types**：物品类型数据
- **regions**：区域数据
- **systems**：星系数据
- **orders**：市场订单
- **loyalty_offers**：忠诚点兑换物品
- **loyalty_type_lp_isk**：LP/ISK 计算数据
- **online_player_stats**：在线玩家统计
- **system_kills**：星系击杀统计
- **stargates**：星门数据
- **categories**：分类数据
- **groups**：组别数据

## 🛠️ 开发指南

### 后端开发
```javascript
// 添加新的 Controller
class NewController {
  static async getData(req, res) {
    try {
      const data = await Model.findAll();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

// 添加路由
router.get('/new-endpoint', NewController.getData);
```

### 前端开发
```vue
<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const data = ref([])

onMounted(async () => {
  const response = await axios.get('/api/endpoint')
  data.value = response.data
})
</script>
```

## 🔧 工具脚本

### 数据库工具
- `initDatabase.js` - 初始化数据库结构
- `syncDatabaseStructure.js` - 同步数据库表结构
- `fixSystemsTable.js` - 修复星系数据
- `fixOrdersTable.js` - 修复订单数据

### 定时任务
- `onlinePlayerStatsScheduler.js` - 在线人数统计调度
- `systemKillScheduler.js` - 击杀数据统计调度
- `stargateScheduler.js` - 星门数据同步调度
- `loyaltyProfitScheduler.js` - 忠诚点利润计算调度

## 📊 性能优化

### 后端优化
- ✅ 使用数据库连接池
- ✅ 实现请求节流控制（1 秒/请求）
- ✅ 异步后台任务处理
- ✅ 批量数据库操作
- ✅ 错误重试机制（最多 3 次）

### 前端优化
- ✅ 使用 Vite 快速构建
- ✅ 组件懒加载
- ✅ 路由按需加载
- ✅ Element Plus 按需引入

## 🐛 常见问题

### 1. 数据库连接失败
检查 `.env` 文件中的数据库配置是否正确，确保 MySQL 服务已启动。

### 2. EVE API 请求失败
- 检查网络连接
- 确认 API URL 配置正确
- 查看服务器日志获取详细错误信息

### 3. 前端页面空白
- 检查后端服务是否启动
- 确认 API 地址配置正确
- 查看浏览器控制台错误信息

## 📄 许可证

本项目仅供学习和研究使用。

## 🙏 致谢

- [EVE Online](https://www.eveonline.com/) - 游戏数据来源
- [ESI API](https://esi.evetech.net/) - EVE Swagger Interface
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Element Plus](https://element-plus.org/) - Vue 3 UI 组件库
- [Phaser](https://phaser.io/) - HTML5 游戏框架

## 📞 联系方式

如有问题或建议，请提交 Issue 或联系项目维护者。

---

**最后更新时间**：2026-03-13
