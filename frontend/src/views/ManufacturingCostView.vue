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
            <span class="filter-label">数据源</span>
            <el-radio-group v-model="datasource" @change="handleDatasourceChange" size="small">
              <el-radio-button label="serenity">晨曦</el-radio-button>
              <el-radio-button label="infinity">曙光</el-radio-button>
              <el-radio-button label="tranquility">欧服</el-radio-button>
            </el-radio-group>
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
          <!-- 蓝图信息 -->
          <section class="table-section">
            <div class="section-header">
              <h2 class="section-title">
                <el-icon><Document /></el-icon> 蓝图信息
              </h2>
            </div>
            <el-table 
              :data="blueprintInfo" 
              style="width: 100%" 
              border
              stripe
              size="small"
              class="blueprint-table"
            >
              <el-table-column prop="name" label="蓝图名称" min-width="200" />
              <el-table-column prop="type_id" label="蓝图ID" width="120" />
              <el-table-column prop="manufacturing_time" label="制造时间" width="120" />
              <el-table-column prop="volume" label="体积" width="100" />
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
              height="45%"
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
                <el-icon><Calculator /></el-icon> 总成本统计
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

export default {
  name: 'ManufacturingCostView',
  setup() {
    const router = useRouter()
    
    // 状态定义
    const regions = ref([])
    const selectedRegionId = ref('10000002')
    const datasource = ref('serenity')
    const treeData = ref([])
    const treeRef = ref(null)
    const filterText = ref('')
    const selectedTypeId = ref('')
    const blueprintInfo = ref([])
    const materials = ref([])
    const totalCost = ref([])
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
    
    // 数据加载逻辑
    const loadRegions = async () => {
      try {
        const response = await regionApi.getRegions(1, null, '')
        regions.value = response.regions
      } catch (error) {
        ElMessage.error('加载区域失败')
      }
    }

    const loadHierarchy = async () => {
      try {
        loadingTree.value = true
        const response = await typeApi.getHierarchy(selectedRegionId.value)
        // 只保留蓝图这一类数据（蓝图的category_id是8）
        const blueprintTree = filterBlueprintData(response)
        treeData.value = blueprintTree
      } catch (error) {
        ElMessage.error('加载物品树失败')
      } finally {
        loadingTree.value = false
      }
    }

    // 过滤蓝图数据
    const filterBlueprintData = (data) => {
      // 递归过滤函数，只保留蓝图类别及其下属数据
      const filterRecursive = (items) => {
        return items.filter(item => {
          // 保留蓝图类别（category_id为9）或其下属数据
          if (item.type === 'category' && item.realId === 9) {
            // 如果有子节点，递归过滤子节点
            if (item.children && item.children.length > 0) {
              item.children = filterRecursive(item.children)
            }
            return true
          } else if (item.type === 'group' && item.category_id === 9) {
            // 保留蓝图类别下的组
            if (item.children && item.children.length > 0) {
              item.children = filterRecursive(item.children)
            }
            return true
          } else if (item.type === 'type' && item.category_id === 9) {
            // 保留蓝图类别下的物品
            return true
          }
          return false
        })
      }
      return filterRecursive(data)
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
      loadHierarchy()
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
      const total = materialsWithCost.reduce((sum, material) => sum + material.total_cost, 0)
      totalCost.value = [{
        name: '原材料总成本',
        value: total
      }, {
        name: '单单位成本',
        value: total
      }]

      // 4. 查询产品的市场价格
      const productPriceResponse = await orderApi.getOrders({
        regionId: selectedRegionId.value,
        typeId: selectedTypeId.value,
        datasource: datasource.value
      })
      const buyPrice = productPriceResponse.buyOrders.data.length > 0 
        ? productPriceResponse.buyOrders.data[0].price 
        : 0
      const sellPrice = productPriceResponse.sellOrders.data.length > 0 
        ? productPriceResponse.sellOrders.data[0].price 
        : 0
      
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
    })
    
    return {
      regions, selectedRegionId, datasource, filterText, treeData, treeRef,
      selectedTypeId, blueprintInfo, materials, totalCost, querying, loadingTree,
      formatDate, formatISK, handleRegionChange, handleDatasourceChange,
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
  display: flex;
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

.tree-node-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  width: 100%;
  padding-right: 8px;
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
  min-height: 300px;
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
</style>
