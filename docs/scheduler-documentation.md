# 定时同步数据逻辑文档

## 概述
本文档详细描述了 EVE Online 市场数据服务中的定时任务系统，包括任务类型、执行逻辑、调度策略和最佳实践。

## 系统架构

### 1. 定时任务管理器
所有定时任务通过 `setInterval` 实现，在服务器启动时自动注册和执行。每个任务模块独立负责特定的数据同步或计算工作。

### 2. 任务分类
定时任务主要分为以下几类：
- **数据同步类**: 从 ESI 同步游戏数据到本地数据库
- **计算类**: 基于本地数据进行计算和分析
- **维护类**: 系统维护和数据清理

## 定时任务列表

### 1. 在线玩家统计任务

#### 功能
定时从 ESI 获取在线玩家数量并保存到数据库。

#### 实现文件
```
backend/utils/onlinePlayerStatsScheduler.js
```

#### 执行逻辑
```javascript
// 每分钟执行一次
setInterval(recordAllStats, 60 * 1000);

// 执行流程
async function recordAllStats() {
  await recordStats('serenity');   // 晨曦服务器
  await recordStats('infinity');   // 无限服务器
  await recordStats('tranquility'); // 宁静服务器
}
```

#### 调度策略
- **执行频率**: 每分钟一次
- **执行时机**: 服务器启动后立即执行第一次，之后每分钟执行
- **并发控制**: 串行执行不同服务器的统计记录

### 2. LP蓝图收益计算任务

#### 功能
定时计算 LP 蓝图的制造收益，包括材料成本、产品价格和每 LP 收益。

#### 实现文件
```
backend/utils/lpBlueprintScheduler.js
```

#### 执行逻辑
```javascript
// 每5秒执行一次
setInterval(() => {
  runCalculation().catch(console.error);
}, 5 * 1000);

// 执行流程
async function runCalculation() {
  if (isCalculating) return; // 防止并发执行
  isCalculating = true;
  
  try {
    // 获取有市场数据的蓝图列表
    const blueprints = await getBlueprintsWithBuyOrders(regionId, datasource);
    
    // 选择要计算的蓝图（优先未计算的，然后更新最老的）
    const targetBlueprint = selectTargetBlueprint(blueprints);
    
    // 计算蓝图收益
    if (targetBlueprint) {
      const profitData = await calculateBlueprintProfit(targetBlueprint);
      if (profitData) {
        await LpBlueprintProfit.upsert(profitData);
      }
    }
  } catch (error) {
    console.error('Error during calculation:', error);
  } finally {
    isCalculating = false;
  }
}
```

#### 调度策略
- **执行频率**: 每5秒一次
- **执行时机**: 服务器启动后立即执行第一次
- **并发控制**: 使用 `isCalculating` 标志防止并发执行
- **计算策略**: 每次只计算一个蓝图，优先计算未计算的，然后更新最老的记录

### 3. LP忠诚点收益计算任务

#### 功能
定时计算 LP 忠诚点兑换的收益。

#### 实现文件
```
backend/utils/loyaltyProfitScheduler.js
```

#### 执行逻辑
```javascript
// 每小时执行一次
setInterval(calculateAllLoyaltyProfits, 60 * 60 * 1000);
```

#### 调度策略
- **执行频率**: 每小时一次
- **执行时机**: 服务器启动后立即执行第一次
- **计算范围**: 计算所有忠诚点兑换的收益

### 4. 星系击毁统计任务

#### 功能
定时从 ESI 同步星系击毁统计数据。

#### 实现文件
```
backend/utils/systemKillScheduler.js
```

#### 执行逻辑
```javascript
// 每10分钟执行一次
setInterval(syncAllSystemKills, 10 * 60 * 1000);

// 执行流程
async function syncAllSystemKills() {
  const datasources = ['serenity', 'infinity', 'tranquility'];
  
  for (const datasource of datasources) {
    await syncSystemKills(datasource);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 延迟1秒避免并发
  }
}
```

#### 调度策略
- **执行频率**: 每10分钟一次
- **执行时机**: 服务器启动后需要手动启用
- **并发控制**: 串行执行，每个数据源之间延迟1秒

### 5. 星系详情同步任务

#### 功能
定时从 ESI 同步星系详细信息。

#### 实现文件
```
backend/utils/systemDetailsScheduler.js
```

#### 调度策略
- **执行频率**: 每天一次
- **执行时机**: 服务器启动后需要手动启用

### 6. 星门数据同步任务

#### 功能
定时从 ESI 同步星门数据。

#### 实现文件
```
backend/utils/stargateScheduler.js
```

#### 调度策略
- **执行频率**: 每天一次
- **执行时机**: 服务器启动后需要手动启用

### 7. 星系到Jita距离计算任务

#### 功能
定时计算所有星系到 Jita 的距离。

#### 实现文件
```
backend/utils/systemDistanceScheduler.js
```

#### 调度策略
- **执行频率**: 每天一次
- **执行时机**: 服务器启动后需要手动启用

## 任务启动管理

### 1. 自动启动的任务
在 `backend/server.js` 中，服务器启动时会自动启动以下任务：

```javascript
// 启动在线玩家统计调度器
onlinePlayerStatsScheduler.startScheduler();

// 启动LP忠诚点收益计算调度器
loyaltyProfitScheduler.startLoyaltyProfitScheduler();

// 启动LP蓝图收益计算调度器
lpBlueprintScheduler.startScheduler();
```

### 2. 需要手动启动的任务
以下任务在服务器启动时被注释掉，需要手动启用：

```javascript
// // 启动星系击毁统计调度器
// systemKillScheduler.startScheduler();
// 
// // 启动星系详情同步调度器
// systemDetailsScheduler.startScheduler();
// 
// // 启动星门数据同步调度器
// stargateScheduler.startScheduler();
// 
// // 启动星系到Jita距离计算调度器
// systemDistanceScheduler.startScheduler();
```

## 核心设计原则

### 1. 避免并发执行
所有计算密集型任务都使用并发控制机制：

```javascript
let isCalculating = false;

async function runCalculation() {
  if (isCalculating) {
    console.log('Already calculating, skip...');
    return;
  }
  isCalculating = true;
  
  try {
    // 任务逻辑
  } finally {
    isCalculating = false;
  }
}
```

### 2. 增量计算
LP蓝图收益计算采用增量计算策略：
- 每次只计算一个蓝图
- 优先计算未计算的蓝图
- 然后更新最老的记录
- 避免一次性计算所有蓝图导致系统负载过高

### 3. 错误处理
所有定时任务都包含完善的错误处理：

```javascript
async function recordStats(datasource) {
  try {
    // 任务逻辑
  } catch (error) {
    console.error(`Error recording ${datasource} stats:`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}
```

### 4. 日志记录
每个任务都有详细的日志记录，便于监控和调试：
- 任务启动日志
- 任务执行日志
- 错误日志
- 性能日志

## 性能优化策略

### 1. 任务拆分
将大任务拆分为小任务，避免长时间占用系统资源：
- LP蓝图收益计算每次只计算一个蓝图
- 星系数据同步按星系逐个同步

### 2. 缓存机制
使用本地缓存减少对 ESI 的请求：
- 订单数据缓存2小时
- 类型数据缓存永久有效，除非主动同步

### 3. 并发控制
通过串行执行避免并发请求过多：
- 不同服务器的统计记录串行执行
- 星系同步逐个执行，避免同时请求大量 ESI 接口

## 监控和维护

### 1. 日志监控
通过日志可以监控任务执行情况：
```bash
# 查看在线玩家统计日志
tail -f logs/app.log | grep "online player stats"

# 查看LP蓝图计算日志
tail -f logs/app.log | grep "LP Blueprint Scheduler"
```

### 2. 任务状态检查
可以通过 API 检查任务执行结果：
```http
GET /api/online-player-stats/latest
```

### 3. 手动触发任务
可以通过 API 手动触发任务执行：
```http
POST /api/loyalty/offers/calculate-profit
```

## 扩展和定制

### 1. 添加新任务
要添加新的定时任务，遵循以下步骤：

1. 创建新的任务模块：
```javascript
// backend/utils/newTaskScheduler.js
async function runTask() {
  // 任务逻辑
}

function startScheduler() {
  runTask().catch(console.error);
  setInterval(runTask, intervalTime);
}

module.exports = {
  startScheduler
};
```

2. 在 server.js 中注册任务：
```javascript
const newTaskScheduler = require('./utils/newTaskScheduler');
newTaskScheduler.startScheduler();
```

### 2. 调整任务频率
修改任务的执行频率：

```javascript
// 从每分钟一次改为每5分钟一次
setInterval(recordAllStats, 5 * 60 * 1000);
```

## 常见问题

### 1. 任务执行失败
**现象**: 任务执行时出现错误
**排查步骤**:
1. 查看日志中的错误信息
2. 检查 ESI 接口是否正常
3. 检查数据库连接是否正常
4. 检查网络连接是否正常

### 2. 任务执行缓慢
**现象**: 任务执行时间过长
**排查步骤**:
1. 查看日志中的执行时间
2. 检查数据库查询是否优化
3. 检查 ESI 接口响应时间
4. 考虑调整任务执行频率

### 3. 数据不同步
**现象**: 本地数据与 ESI 数据不一致
**排查步骤**:
1. 检查任务是否正常执行
2. 检查同步逻辑是否正确
3. 手动触发同步任务
4. 检查数据库数据是否完整

## 总结

定时任务系统是 EVE Online 市场数据服务的核心组件，负责保持数据的及时性和准确性。通过合理的调度策略和并发控制，系统能够在保证性能的同时提供最新的游戏数据。

---

**文档生成时间**: 2026-05-15
**文档版本**: 1.0