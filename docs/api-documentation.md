# EVE Online 市场数据服务 API 文档

## 概述
本文档详细描述了 EVE Online 市场数据服务提供的所有 API 接口。所有接口均基于 RESTful 设计风格，使用 JSON 格式进行数据交互。

## 基础信息
- **基础 URL**: `/api`
- **数据格式**: JSON
- **字符编码**: UTF-8
- **认证方式**: 暂无（后续会添加 JWT 认证）

## 接口列表

### 1. 类型管理接口

#### 获取类型层级结构
```http
GET /api/types/hierarchy
```
返回所有类型的层级结构（分类 → 组 → 类型）。

#### 获取所有分类
```http
GET /api/types/categories
```
返回所有物品分类。

#### 获取指定区域的分类
```http
GET /api/types/categories-by-region?regionId={regionId}
```
返回指定区域内有市场数据的物品分类。

#### 获取指定分类下的组
```http
GET /api/types/groups-by-category?categoryId={categoryId}
```
返回指定分类下的所有物品组。

#### 获取指定区域和分类下的组
```http
GET /api/types/groups-by-category-region?categoryId={categoryId}&regionId={regionId}
```
返回指定区域和分类下有市场数据的物品组。

#### 获取指定组下的类型
```http
GET /api/types/types-by-group?groupId={groupId}
```
返回指定组下的所有物品类型。

#### 获取指定区域和组下的类型
```http
GET /api/types/types-by-group-region?groupId={groupId}&regionId={regionId}
```
返回指定区域和组下有市场数据的物品类型。

#### 获取所有类型
```http
GET /api/types
```
返回所有物品类型，支持分页和过滤。

#### 同步类型ID
```http
GET /api/types/sync-ids
```
从 ESI 同步所有类型 ID 到本地数据库。

#### 同步类型详情
```http
GET /api/types/sync-details
```
从 ESI 同步所有类型的详细信息到本地数据库。

#### 同步单个类型
```http
POST /api/types/sync-one
Content-Type: application/json

{
  "typeId": 12345
}
```
从 ESI 同步指定类型的详细信息到本地数据库。

#### 获取有名称的类型数量
```http
GET /api/types/count-with-name-not-null
```
返回名称不为空的类型总数。

#### 根据ID获取类型
```http
GET /api/types/{id}
```
返回指定ID的类型详细信息。

#### 获取蓝图材料
```http
GET /api/types/{id}/blueprint-materials
```
返回指定蓝图类型所需的材料列表。

#### 获取蓝图成本
```http
GET /api/types/{id}/blueprint-cost
```
计算并返回指定蓝图的制造成本。

#### 获取蓝图产品
```http
GET /api/types/{id}/blueprint-products
```
返回指定蓝图制造的产品信息。

#### 创建类型
```http
POST /api/types
Content-Type: application/json

{
  "id": 12345,
  "name": "示例类型",
  "description": "示例描述",
  "group_id": 67890
}
```
创建一个新的类型记录。

#### 更新类型
```http
PUT /api/types/{id}
Content-Type: application/json

{
  "name": "更新后的名称",
  "description": "更新后的描述"
}
```
更新指定ID的类型信息。

#### 更新类型状态
```http
PUT /api/types/{id}/update-status
Content-Type: application/json

{
  "status": "active"
}
```
更新指定ID的类型状态。

#### 删除类型
```http
DELETE /api/types/{id}
```
删除指定ID的类型记录。

---

### 2. 区域管理接口

#### 获取所有区域
```http
GET /api/regions
```
返回所有游戏区域信息。

#### 同步区域ID
```http
GET /api/regions/sync-ids
```
从 ESI 同步所有区域 ID 到本地数据库。

#### 同步区域详情
```http
GET /api/regions/sync-details
```
从 ESI 同步所有区域的详细信息到本地数据库。

#### 同步指定区域的类型
```http
GET /api/regions/{regionId}/sync-types
```
从 ESI 同步指定区域内的所有市场类型到本地数据库。

#### 同步所有区域的类型
```http
GET /api/regions/sync-all-types
```
从 ESI 同步所有区域内的所有市场类型到本地数据库。

#### 根据ID获取区域
```http
GET /api/regions/{id}
```
返回指定ID的区域详细信息。

#### 创建区域
```http
POST /api/regions
Content-Type: application/json

{
  "id": 10000002,
  "name": "伏尔戈",
  "description": "伏尔戈区域"
}
```
创建一个新的区域记录。

#### 更新区域
```http
PUT /api/regions/{id}
Content-Type: application/json

{
  "name": "更新后的区域名称",
  "description": "更新后的描述"
}
```
更新指定ID的区域信息。

#### 删除区域
```http
DELETE /api/regions/{id}
```
删除指定ID的区域记录。

---

### 3. 订单管理接口

#### 同步订单数据
```http
POST /api/orders/{regionId}/{typeId}/sync
```
从 ESI 同步指定区域和类型的订单数据到本地数据库。

#### 获取订单数据
```http
GET /api/orders?regionId={regionId}&typeId={typeId}&orderType={orderType}
```
返回指定区域和类型的订单数据，支持按买单/卖单过滤。

#### 获取指定区域的可用类型
```http
GET /api/regions/{regionId}/types
```
返回指定区域内有市场数据的所有类型。

---

### 4. 忠诚点管理接口

#### 获取所有忠诚点兑换
```http
GET /api/loyalty/offers
```
返回所有忠诚点兑换优惠信息。

#### 同步忠诚点兑换
```http
POST /api/loyalty/offers/sync
Content-Type: application/json

{
  "corporationId": 1000001
}
```
从 ESI 同步指定军团的忠诚点兑换优惠信息。

#### 同步所有忠诚点兑换
```http
POST /api/loyalty/offers/sync-all
```
从 ESI 同步所有军团的忠诚点兑换优惠信息。

#### 计算蓝图收益
```http
POST /api/loyalty/offers/calculate-profit
Content-Type: application/json

{
  "regionId": 10000002,
  "datasource": "serenity"
}
```
计算指定区域内所有蓝图的制造收益。

#### 清理并重新计算收益
```http
POST /api/loyalty/offers/clean-recalculate-profit
Content-Type: application/json

{
  "regionId": 10000002,
  "datasource": "serenity"
}
```
清理现有收益数据并重新计算指定区域内所有蓝图的制造收益。

#### 获取收益数据
```http
GET /api/loyalty/profit-data?regionId={regionId}&datasource={datasource}
```
返回指定区域内所有蓝图的收益数据。

#### 获取LP蓝图列表
```http
GET /api/loyalty/blueprints?regionId={regionId}&datasource={datasource}&search={search}
```
返回指定区域内的LP蓝图列表，支持搜索过滤。

#### 获取蓝图详情
```http
GET /api/loyalty/blueprints/{typeId}/details?regionId={regionId}&datasource={datasource}
```
返回指定蓝图的详细收益信息。

#### 根据ID获取忠诚点兑换
```http
GET /api/loyalty/offers/{id}
```
返回指定ID的忠诚点兑换优惠信息。

#### 创建忠诚点兑换
```http
POST /api/loyalty/offers
Content-Type: application/json

{
  "corporation_id": 1000001,
  "type_id": 12345,
  "lp_cost": 1000,
  "isk_cost": 100000
}
```
创建一个新的忠诚点兑换记录。

#### 更新忠诚点兑换
```http
PUT /api/loyalty/offers/{id}
Content-Type: application/json

{
  "lp_cost": 1500,
  "isk_cost": 150000
}
```
更新指定ID的忠诚点兑换信息。

#### 删除忠诚点兑换
```http
DELETE /api/loyalty/offers/{id}
```
删除指定ID的忠诚点兑换记录。

---

### 5. 组管理接口

#### 获取所有组
```http
GET /api/groups
```
返回所有物品组。

#### 从类型同步所有组
```http
GET /api/groups/sync-all
```
从现有类型数据中同步所有组信息。

#### 根据ID获取组
```http
GET /api/groups/{id}
```
返回指定ID的组详细信息。

#### 同步指定组
```http
GET /api/groups/{id}/sync
```
从 ESI 同步指定组的详细信息。

---

### 6. 分类管理接口

#### 获取所有分类
```http
GET /api/categories
```
返回所有物品分类。

#### 从组同步所有分类
```http
GET /api/categories/sync-all
```
从现有组数据中同步所有分类信息。

#### 根据ID获取分类
```http
GET /api/categories/{id}
```
返回指定ID的分类详细信息。

#### 同步指定分类
```http
GET /api/categories/{id}/sync
```
从 ESI 同步指定分类的详细信息。

---

### 7. 在线玩家统计接口

#### 记录在线玩家统计
```http
POST /api/online-player-stats/record
Content-Type: application/json

{
  "onlinePlayers": 12345,
  "timestamp": "2023-01-01T00:00:00Z"
}
```
记录在线玩家数量统计数据。

#### 获取所有统计数据
```http
GET /api/online-player-stats
```
返回所有在线玩家统计数据。

#### 获取指定日期范围的统计数据
```http
GET /api/online-player-stats/by-date-range?startDate={startDate}&endDate={endDate}
```
返回指定日期范围内的在线玩家统计数据。

#### 获取最新统计数据
```http
GET /api/online-player-stats/latest
```
返回最新的在线玩家统计数据。

---

### 8. 星系管理接口

#### 获取所有星系
```http
GET /api/systems
```
返回所有星系信息。

#### 同步星系ID
```http
GET /api/systems/sync-ids
```
从 ESI 同步所有星系 ID 到本地数据库。

#### 同步星系详情
```http
GET /api/systems/sync-details
```
从 ESI 同步所有星系的详细信息到本地数据库。

#### 同步所有星系
```http
GET /api/systems/sync-all
```
从 ESI 同步所有星系的完整信息到本地数据库。

#### 根据ID获取星系
```http
GET /api/systems/{id}
```
返回指定ID的星系详细信息。

#### 同步单个星系
```http
POST /api/systems/{system_id}/sync
```
从 ESI 同步指定星系的详细信息到本地数据库。

#### 创建星系
```http
POST /api/systems
Content-Type: application/json

{
  "id": 30000142,
  "name": "Jita",
  "region_id": 10000002
}
```
创建一个新的星系记录。

#### 更新星系
```http
PUT /api/systems/{id}
Content-Type: application/json

{
  "name": "更新后的星系名称",
  "security_status": 0.9
}
```
更新指定ID的星系信息。

#### 删除星系
```http
DELETE /api/systems/{id}
```
删除指定ID的星系记录。

---

### 9. 星系击毁统计接口

#### 获取星系击毁统计
```http
GET /api/system-kills
```
返回所有星系的击毁统计数据。

#### 同步星系击毁统计
```http
GET /api/system-kills/sync
```
从 ESI 同步所有星系的击毁统计数据。

#### 获取最新更新时间
```http
GET /api/system-kills/latest-update
```
返回星系击毁统计数据的最新更新时间。

#### 根据ID获取星系击毁统计
```http
GET /api/system-kills/{id}
```
返回指定ID的星系击毁统计数据。

---

### 10. EVE SSO 接口

#### 保存SSO授权码
```http
POST /api/eve-sso/save-code
Content-Type: application/json

{
  "code": "authorization_code_here",
  "characterName": "Character Name"
}
```
保存 EVE SSO 授权码。

#### 获取所有SSO授权码
```http
GET /api/eve-sso/codes
```
返回所有保存的 SSO 授权码。

---

### 11. KB (Killboard) 接口

#### 同步角色KB数据
```http
POST /api/kb/sync/{character_id}
```
从 ESI 同步指定角色的 KB 数据。

#### 获取角色KB数据
```http
GET /api/kb/character/{character_id}
```
返回指定角色的 KB 数据。

#### 获取当前登录用户的KB数据
```http
GET /api/kb/my
```
返回当前登录用户的 KB 数据（需要认证）。

#### 获取最近击毁记录
```http
GET /api/kb/recent
```
返回最近的公共击毁记录。

#### 获取Killmail详情
```http
GET /api/kb/detail/{killmail_id}
```
返回指定Killmail的完整详情，包括攻击者和物品信息。

#### 获取KB榜单
```http
GET /api/kb/ranking
```
返回KB榜单数据（击毁数、损失数等排名）。

---

### 12. 系统接口

#### 健康检查
```http
GET /health
```
检查服务运行状态。

#### 测试接口
```http
GET /test
```
测试服务是否正常响应。

## 错误处理

所有错误响应均包含以下格式：
```json
{
  "message": "错误描述信息",
  "code": "错误代码（可选）"
}
```

常见错误码：
- **400 Bad Request**: 请求参数错误
- **404 Not Found**: 请求的资源不存在
- **500 Internal Server Error**: 服务器内部错误
- **429 Too Many Requests**: 请求过于频繁（限流）

## 版本历史

| 版本 | 日期       | 描述                     |
|------|------------|--------------------------|
| 1.0  | 2026-05-15 | 初始版本，包含基础功能   |

## 后续规划

- 添加 JWT 认证机制
- 支持 WebSocket 实时数据推送
- 添加更多统计分析接口
- 完善文档和示例

---

**文档生成时间**: 2026-05-15
**文档版本**: 1.0