<template>
  <div class="manufacturing-cost-page">
    <!-- 顶部控制栏 -->
    <header class="query-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">制造成本计算</h1>
          <el-tag type="info" effect="plain" round class="status-tag">实时数据</el-tag>
        </div>
        
        <div class="header-right">
          <div class="filter-item">
            <span class="filter-label">所属区域</span>
            <el-select 
              v-model="selectedRegionId" 
              placeholder="请选择区域" 
              filterable 
              class="region-select"
              @change="handleRegionChange"
            >
              <el-option 
                v-for="region in regions" 
                :key="region.id" 
                :label="`${region.name} (${region.id})`" 
                :value="region.id" 
              />
            </el-select>
          </div>

          <div class="filter-item">
            <el-radio-group v-model="datasource" @change="handleDatasourceChange" size="small">
              <el-radio-button label="serenity">晨曦</el-radio-button>
              <el-radio-button label="infinity">曙光</el-radio-button>
              <el-radio-button label="tranquility">欧服</el-radio-button>
            </el-radio-group>
          </div>

          <div class="filter-item">
            <span class="filter-label">LP兑换比例</span>
            <el-input-number v-model="lpToIskRatio" @change="handleLpRatioChange" :min="500" :max="5000" :step="100" size="small" class="lp-ratio-input"></el-input-number>
          </div>
        </div>
      </div>
    </header>
    
    <!-- 主体布局 -->
    <div class="query-main">
      <!-- 左侧物品树 -->
      <aside class="sidebar">
        <div class="search-box">
          <el-input
            v-model="filterText"
            placeholder="搜索蓝图名称或ID..."
            clearable
            prefix-icon="Search"
          />
        </div>
        
        <div class="tree-wrapper" v-loading="loadingTree">
          <el-tree
            ref="treeRef"
            :data="treeData"
            :props="{ label: 'label', children: 'children' }"
            :filter-node-method="filterNode"
            @node-click="handleNodeClick"
            highlight-current
            node-key="id"
            class="custom-tree"
          >
            <template #default="{ node, data }">
              <div class="tree-node-content" :class="{ 'is-active': selectedTypeId === data.id && data.type === 'type' }">
                <el-icon v-if="data.type === 'category' && data.id === 8"><Folder /></el-icon>
                <el-icon v-else-if="data.type === 'group' && data.category_id === 8"><Collection /></el-icon>
                <el-icon v-else><Document /></el-icon>
                <span class="node-text">{{ node.label }}</span>
              </div>
            </template>
          </el-tree>
        </div>
      </aside>
      
      <!-- 右侧制造成本表格 -->
      <main class="content-area" v-loading="querying">
        <div v-if="!selectedTypeId" class="empty-state">
          <el-empty description="请在左侧选择一个蓝图查看制造成本" />
        </div>

        <template v-else>
          <!-- 收益突出展示 -->
          <section class="table-section profit-highlight">
            <div class="section-header">
              <h2 class="section-title">
                <el-icon><Money /></el-icon> 收益概览
              </h2>
            </div>
            <el-table
              :data="profitDisplay"
              style="width: 100%"
              border
              stripe
              size="small"
              class="profit-table"
            >
              <el-table-column prop="label" label="指标" min-width="150" />
              <el-table-column prop="value" label="数值" min-width="200">
                <template #default="{ row }">
                  <span :class="row.class">{{ row.value }}</span>
                </template>
              </el-table-column>
            </el-table>
          </section>

          <!-- 原材料成本表格 -->
          <section class="table-section">
            <div class="section-header">
              <h2 class="section-title">
                <el-icon><List /></el-icon> 原材料成本
              </h2>
            </div>
            <el-table 
              :data="materials" 
              style="width: 100%" 
              border
              stripe
              size="small"
              class="material-table"
            >
              <el-table-column prop="name" label="原材料名称" min-width="200">
                <template #default="{ row }">
                  <span class="material-name">{{ row.name }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="quantity" label="所需数量" sortable width="100" />
              <el-table-column prop="price" label="单价 (ISK)" sortable min-width="120">
                <template #default="{ row }">
                  <span class="price-text">{{ formatISK(row.price) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="total_cost" label="总成本 (ISK)" sortable min-width="150">
                <template #default="{ row }">
                  <span class="total-cost-text">{{ formatISK(row.total_cost) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </section>

          <!-- 总成本统计 -->
          <section class="table-section">
            <div class="section-header">
              <h2 class="section-title">
                <el-icon><DataAnalysis /></el-icon> 总成本统计
              </h2>
            </div>
            <el-table 
              :data="totalCost" 
              style="width: 100%" 
              border
              stripe
              size="small"
              class="total-cost-table"
            >
              <el-table-column prop="name" label="统计项" min-width="200" />
              <el-table-column prop="value" label="数值 (ISK)" min-width="200">
                <template #default="{ row }">
                  <span class="total-value-text">{{ formatISK(row.value) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </section>
        </template>
      </main>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { regionApi, typeApi, orderApi } from '../services/api'
import { ElMessage } from 'element-plus'
import { Folder, Collection, Document, List, DataAnalysis, Search, Money } from '@element-plus/icons-vue'

export default {
  name: 'ManufacturingCostView',
  setup() {
    const router = useRouter()
    
    // 状态定义
    const regions = ref([])
    const selectedRegionId = ref(10000002)
    const datasource = ref('serenity')
    const lpToIskRatio = ref(1300)
    const treeData = ref([])
    const treeRef = ref(null)
    const filterText = ref('')
    const selectedTypeId = ref(null)
    const blueprintInfo = ref([])
    const blueprintCost = ref([])
    const materials = ref([])
    const totalCost = ref([])
    const profitDisplay = ref([])
    const querying = ref(false)
    const loadingTree = ref(false)
    
    // 格式化工具
    const formatDate = (dateString) => {
      if (!dateString) return '-'
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const formatISK = (val) => {
      if (val === undefined || val === null) return '0.00'
      return parseFloat(val).toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }
    
    // 调试方法
    const debugLpRatio = () => {
      console.log('lpToIskRatio value:', lpToIskRatio.value)
    }
    
    // 数据加载逻辑
    const loadRegions = async () => {
      try {
        const response = await regionApi.getRegions(1, null, '')
        regions.value = response.regions
      } catch (error) {
        ElMessage.error('加载区域失败')
      }
    }

    // 缓存相关函数
    const getCacheKey = (categoryId) => {
      return `manufacturing_tree_${categoryId}`
    }

    const saveToCache = (categoryId, data) => {
      const cacheKey = getCacheKey(categoryId)
      const cacheData = {
        data: data,
        timestamp: Date.now(),
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7天有效期
      }
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    }

    const getFromCache = (categoryId) => {
      const cacheKey = getCacheKey(categoryId)
      const cacheData = localStorage.getItem(cacheKey)
      if (!cacheData) return null

      try {
        const parsed = JSON.parse(cacheData)
        if (Date.now() > parsed.expires) {
          localStorage.removeItem(cacheKey)
          return null
        }
        return parsed.data
      } catch (e) {
        localStorage.removeItem(cacheKey)
        return null
      }
    }

    const loadHierarchy = async () => {
      loadingTree.value = true
      try {
        // 先尝试从缓存获取
        const cachedData = getFromCache(9)
        if (cachedData) {
          treeData.value = cachedData
          console.log('从缓存加载层级结构')
          loadingTree.value = false
          return
        }

        // 缓存不存在或过期，从API获取
        const response = await typeApi.getHierarchy(null, 'serenity', 9)
        treeData.value = response
        // 保存到缓存
        saveToCache(9, response)
      } catch (error) {
        console.error('加载层级结构失败:', error)
      } finally {
        loadingTree.value = false
      }
    }

    // 事件处理
    const filterNode = (value, data) => {
      if (!value) return true
      const searchTerm = value.toLowerCase()
      return data.label.toLowerCase().includes(searchTerm)
    }

    watch(filterText, (val) => {
      treeRef.value?.filter(val)
    })
    
    const handleRegionChange = () => {
      if (selectedTypeId.value) queryManufacturingCost()
    }

    const handleLpRatioChange = () => {
      if (selectedTypeId.value) queryManufacturingCost()
    }
    
    const handleDatasourceChange = () => {
      if (selectedTypeId.value) queryManufacturingCost()
    }
    
    const handleNodeClick = (data) => {
      if (data.type === 'type') {
        selectedTypeId.value = data.id
        queryManufacturingCost()
      }
    }
    
    const queryManufacturingCost = async () => {
      if (!selectedRegionId.value || !selectedTypeId.value) return
      try {
        querying.value = true
        // 1. 获取蓝图信息
        const blueprintResponse = await typeApi.getTypeById(selectedTypeId.value)
        blueprintInfo.value = [{
          name: blueprintResponse.name,
          type_id: blueprintResponse.id,
          manufacturing_time: blueprintResponse.manufacturing_time || 'N/A',
          volume: blueprintResponse.volume || 'N/A'
        }]

        // 2. 获取蓝图所需的原材料
      const materialsResponse = await typeApi.getBlueprintMaterials(selectedTypeId.value, datasource.value)
      // 查询蓝图是否在loyalty_offers表中
      const blueprintCostResponse = await typeApi.getBlueprintCost(selectedTypeId.value, datasource.value)
      blueprintCost.value = blueprintCostResponse
      const materialsWithCost = await Promise.all(materialsResponse.map(async (material) => {
        // 获取原材料的市场价格
        const priceResponse = await orderApi.getOrders({
          regionId: selectedRegionId.value,
          typeId: material.type_id,
          datasource: datasource.value
          })
        // 取最低卖价作为成本
        const sellPrice = priceResponse.sellOrders.data.length > 0 
          ? priceResponse.sellOrders.data[0].price 
          : 0
        return {
          name: material.name,
          type_id: material.type_id,
          quantity: material.quantity,
          price: sellPrice,
          total_cost: sellPrice * material.quantity
        }
      }))
      materials.value = materialsWithCost

        // 3. 计算总成本
      const materialsTotal = materialsWithCost.reduce((sum, material) => sum + material.total_cost, 0)
      let total = materialsTotal
      
      // 4. 计算蓝图获取成本（如果在loyalty_offers表中）
      if (blueprintCost.value && blueprintCost.value.length > 0) {
        const blueprintLpCost = blueprintCost.value[0].lp_cost
        const blueprintIskCost = blueprintCost.value[0].isk_cost
        const lpToIskValue = blueprintLpCost * lpToIskRatio.value
        const blueprintTotalCost = lpToIskValue + blueprintIskCost
        total += blueprintTotalCost
        
        totalCost.value = [{
          name: '原材料总成本',
          value: materialsTotal
        }, {
          name: '单单位成本',
          value: materialsTotal
        }, {
          name: '蓝图LP成本',
          value: blueprintLpCost
        }, {
          name: '蓝图ISK成本',
          value: blueprintIskCost
        }, {
          name: 'LP换算ISK成本',
          value: lpToIskValue
        }, {
          name: '蓝图总成本',
          value: blueprintTotalCost
        }, {
          name: '总制造成本',
          value: total
        }]
      } else {
        totalCost.value = [{
          name: '原材料总成本',
          value: materialsTotal
        }, {
          name: '单单位成本',
          value: materialsTotal
        }]
      }

      // 4. 获取蓝图制造的产品信息
      const productsResponse = await typeApi.getBlueprintProducts(selectedTypeId.value, datasource.value)
      
      // 5. 查询产品的市场价格（使用产品的type_id，而不是蓝图的type_id）
      let buyPrice = 0
      let sellPrice = 0
      if (productsResponse.length > 0) {
        const productTypeId = productsResponse[0].type_id
        const productPriceResponse = await orderApi.getOrders({
          regionId: selectedRegionId.value,
          typeId: productTypeId,
          datasource: datasource.value
        })
        buyPrice = productPriceResponse.buyOrders.data.length > 0 
          ? productPriceResponse.buyOrders.data[0].price 
          : 0
        sellPrice = productPriceResponse.sellOrders.data.length > 0 
          ? productPriceResponse.sellOrders.data[0].price 
          : 0
      }
      
      // 计算收益
      const buyProfit = buyPrice - total
      const sellProfit = sellPrice - total
      
      // 计算收益率并保留两位小数
      const buyProfitRate = total > 0 ? Number(((buyProfit / total) * 100).toFixed(2)) : 0
      const sellProfitRate = total > 0 ? Number(((sellProfit / total) * 100).toFixed(2)) : 0
      
      totalCost.value.push({
        name: '产品最低卖价',
        value: sellPrice
      }, {
        name: '产品最高买价',
        value: buyPrice
      }, {
        name: '按卖价收益',
        value: sellProfit
      }, {
        name: '按卖价收益率',
        value: `${sellProfitRate}%`
      }, {
        name: '按买价收益',
        value: buyProfit
      }, {
        name: '按买价收益率',
        value: `${buyProfitRate}%`
      })

      // 设置收益展示数据
      profitDisplay.value = [
        { label: '按卖价收益率', value: `${sellProfitRate}%`, class: sellProfitRate > 0 ? 'profit-positive' : 'profit-negative' },
        { label: '按卖价收益', value: formatISK(sellProfit), class: sellProfit > 0 ? 'profit-positive' : 'profit-negative' },
        { label: '按买价收益率', value: `${buyProfitRate}%`, class: buyProfitRate > 0 ? 'profit-positive' : 'profit-negative' },
        { label: '按买价收益', value: formatISK(buyProfit), class: buyProfit > 0 ? 'profit-positive' : 'profit-negative' },
        { label: '产品卖价', value: formatISK(sellPrice), class: '' },
        { label: '产品买价', value: formatISK(buyPrice), class: '' },
        { label: '总成本', value: formatISK(total), class: '' }
      ]
      } catch (error) {
        console.error('查询制造成本失败:', error)
        const errorMessage = error.response?.data?.message || error.message || '查询制造成本失败'
        ElMessage.error(errorMessage)
      } finally {
        querying.value = false
      }
    }
    
    onMounted(() => {
      loadRegions()
      loadHierarchy()
      console.log('lpToIskRatio onMounted:', lpToIskRatio.value)
    })
    
    return {
      regions, selectedRegionId, datasource, lpToIskRatio, filterText, treeData, treeRef,
      selectedTypeId, blueprintInfo, blueprintCost, materials, totalCost, profitDisplay, querying, loadingTree,
      formatDate, formatISK, handleRegionChange, handleDatasourceChange, handleLpRatioChange,
      handleNodeClick, filterNode, queryManufacturingCost
    }
  }
}
</script>

<style scoped>
/* 页面整体容器 */
.manufacturing-cost-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #0f111a;
  color: #e2e8f0;
  overflow: hidden;
}

/* 顶部标题栏 */
.query-header {
  height: 64px;
  background-color: #1a1c26;
  border-bottom: 1px solid #2d303e;
  padding: 0 24px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.header-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  background: linear-gradient(120deg, #409eff, #67c23a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.filter-item {
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 13px;
  color: #94a3b8;
}

.region-select {
  width: 220px;
}

.lp-ratio-input {
  width: 150px;
}

.lp-ratio-input :deep(.el-input-number__decrease),
.lp-ratio-input :deep(.el-input-number__increase) {
  background-color: #2d303e;
  color: #fff;
  border-color: #3d4050;
}

.lp-ratio-input :deep(.el-input__inner) {
  background-color: #2d303e;
  color: #fff;
}

/* 主内容布局 */
.query-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 侧边栏样式 */
.sidebar {
  width: 320px;
  background-color: #161821;
  border-right: 1px solid #2d303e;
  display: flex;
  flex-direction: column;
}

.search-box {
  padding: 16px;
  border-bottom: 1px solid #2d303e;
}

.search-box :deep(.el-input__wrapper) {
  background-color: #2d303e;
  border-color: #3d4050;
}

.search-box :deep(.el-input__inner) {
  color: #fff;
}

.tree-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

/* 深度定制树样式 */
.custom-tree {
  background: transparent !important;
  --el-tree-node-hover-bg-color: #242736;
}

:deep(.el-tree-node__content) {
  height: 36px !important;
  border-radius: 6px;
  margin-bottom: 2px;
}

:deep(.el-tree) {
  color: #fff;
}

.tree-node-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  width: 100%;
  padding-right: 8px;
  color: #fff;
}

.tree-node-content.is-active {
  color: #409eff;
  font-weight: 500;
}

.node-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 右侧内容区 */
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 20px;
  overflow-y: auto;
  background-color: #0f111a;
}

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-section {
  flex: 1;
  background-color: #1a1c26;
  border-radius: 8px;
  border: 1px solid #2d303e;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.section-header {
  margin-bottom: 12px;
}

.section-title {
  margin: 0;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #409eff;
}

/* 表格样式美化 */
.blueprint-table, .material-table, .total-cost-table {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: #242736;
  --el-table-border-color: #2d303e;
  --el-table-text-color: #cbd5e1;
  --el-table-header-text-color: #94a3b8;
}

.material-name {
  font-weight: 500;
  color: #e2e8f0;
}

.price-text {
  font-family: 'Roboto Mono', monospace;
  font-weight: 600;
  color: #67c23a;
}

.total-cost-text {
  font-family: 'Roboto Mono', monospace;
  font-weight: 600;
  color: #f56c6c;
}

.total-value-text {
  font-family: 'Roboto Mono', monospace;
  font-weight: 600;
  color: #409eff;
}

:deep(.el-table__row--striped) td {
  background-color: #1e202e !important;
}

:deep(.el-table__body tr:hover > td) {
  background-color: #2a2d3d !important;
}

/* 收益突出展示样式 */
.profit-highlight {
  background-color: #1a1c26;
  border: 2px solid #409eff;
  box-shadow: 0 0 20px rgba(64, 158, 255, 0.2);
}

.profit-highlight .section-title {
  color: #409eff;
  font-size: 18px;
  font-weight: 600;
}

.profit-table {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: #242736;
  --el-table-border-color: #2d303e;
  --el-table-text-color: #cbd5e1;
  --el-table-header-text-color: #94a3b8;
}

.profit-table .el-table__cell {
  padding: 12px 0;
}

.profit-positive {
  color: #67c23a;
  font-weight: 700;
  font-size: 16px;
  text-shadow: 0 0 10px rgba(103, 194, 58, 0.3);
}

.profit-negative {
  color: #f56c6c;
  font-weight: 700;
  font-size: 16px;
  text-shadow: 0 0 10px rgba(245, 108, 108, 0.3);
}
</style>
