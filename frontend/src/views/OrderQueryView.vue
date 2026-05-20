<template>
  <div class="order-query-page">
    <!-- 顶部控制栏 -->
    <header class="query-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">市场订单查询</h1>
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

          <el-button 
            type="primary" 
            :loading="syncing" 
            :disabled="!selectedTypeId"
            @click="syncOrders"
            icon="Refresh"
          >
            同步订单
          </el-button>
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
            placeholder="搜索物品名称或ID..."
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
                <el-icon v-if="data.type === 'category'"><Folder /></el-icon>
                <el-icon v-else-if="data.type === 'group'"><Collection /></el-icon>
                <el-icon v-else><Document /></el-icon>
                <span class="node-text">{{ node.label }}</span>
              </div>
            </template>
          </el-tree>
        </div>
      </aside>
      
      <!-- 右侧订单表格 -->
      <main class="content-area" v-loading="querying">
        <div v-if="!selectedTypeId" class="empty-state">
          <el-empty description="请在左侧选择一个物品查看订单详情" />
        </div>
        
        <template v-else>
          <!-- 卖单表格 -->
          <section class="table-section">
            <div class="section-header">
              <h2 class="section-title sell">
                <el-icon><Top /></el-icon> 卖出订单 (Sell)
              </h2>
            </div>
            <el-table 
              :data="sellOrders" 
              style="width: 100%" 
              height="45%"
              border
              stripe
              size="small"
              class="order-table sell-table"
            >
              <el-table-column prop="price" label="价格 (ISK)" sortable min-width="120">
                <template #default="{ row }">
                  <span class="price-text sell">{{ formatISK(row.price) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="volume_total" label="数量" sortable width="100" />
              <el-table-column prop="min_volume" label="最小数量" width="90" />
              <el-table-column label="位置" width="180">
                <template #default="{ row }">
                  <div class="location-cell">
                    <span v-if="stationNames[row.location_id]" class="location-name" :title="stationNames[row.location_id]?.en || ''">{{ stationNames[row.location_id]?.cn || stationNames[row.location_id]?.en }}</span>
                    <span v-else-if="row.location_name" class="location-name" :title="row.location_name_en || row.location_name || ''">{{ row.location_name }}</span>
                    <span v-else-if="row.location_name_en" class="location-name" :title="row.location_name_en">{{ row.location_name_en }}</span>
                    <el-link v-else-if="!stationAttempted[row.location_id]" type="primary" size="small" @click="fetchStationName(row.location_id, row.datasource)">{{ row.location_id }}</el-link>
                    <span v-else>{{ row.location_id }}</span>
                    <span v-if="stationNames[row.location_id] || row.location_name || row.location_name_en" class="location-id">({{ row.location_id }})</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="duration" label="有效期" width="80" />
              <el-table-column prop="created_at" label="创建时间" sortable width="160">
                <template #default="{ row }">
                  {{ formatDate(row.created_at) }}
                </template>
              </el-table-column>
            </el-table>
          </section>

          <!-- 买单表格 -->
          <section class="table-section">
            <div class="section-header">
              <h2 class="section-title buy">
                <el-icon><Bottom /></el-icon> 买入订单 (Buy)
              </h2>
            </div>
            <el-table 
              :data="buyOrders" 
              style="width: 100%" 
              height="45%"
              border
              stripe
              size="small"
              class="order-table buy-table"
            >
              <el-table-column prop="price" label="价格 (ISK)" sortable min-width="120">
                <template #default="{ row }">
                  <span class="price-text buy">{{ formatISK(row.price) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="volume_total" label="数量" sortable width="100" />
              <el-table-column prop="min_volume" label="最小数量" width="90" />
              <el-table-column label="位置" width="180">
                <template #default="{ row }">
                  <div class="location-cell">
                    <span v-if="stationNames[row.location_id]" class="location-name" :title="stationNames[row.location_id]?.en || ''">{{ stationNames[row.location_id]?.cn || stationNames[row.location_id]?.en }}</span>
                    <span v-else-if="row.location_name" class="location-name" :title="row.location_name_en || row.location_name || ''">{{ row.location_name }}</span>
                    <span v-else-if="row.location_name_en" class="location-name" :title="row.location_name_en">{{ row.location_name_en }}</span>
                    <el-link v-else-if="!stationAttempted[row.location_id]" type="primary" size="small" @click="fetchStationName(row.location_id, row.datasource)">{{ row.location_id }}</el-link>
                    <span v-else>{{ row.location_id }}</span>
                    <span v-if="stationNames[row.location_id] || row.location_name || row.location_name_en" class="location-id">({{ row.location_id }})</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="duration" label="有效期" width="80" />
              <el-table-column prop="created_at" label="创建时间" sortable width="160">
                <template #default="{ row }">
                  {{ formatDate(row.created_at) }}
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
import { useRoute } from 'vue-router'
import { regionApi, orderApi, typeApi, stationApi } from '../services/api'
import { ElMessage } from 'element-plus'

export default {
  name: 'OrderQueryView',
  setup() {
    const router = useRoute()
    
    // 状态定义
    const regions = ref([])
    const selectedRegionId = ref(10000002)
    const datasource = ref('serenity')
    const treeData = ref([])
    const treeRef = ref(null)
    const filterText = ref('')
    const selectedTypeId = ref('')
    const buyOrders = ref([])
    const sellOrders = ref([])
    const syncing = ref(false)
    const querying = ref(false)
    const loadingTree = ref(false)
    
    // 空间站名称缓存
    const stationNames = ref({})
    const loadingStation = ref(null)
    const stationAttempted = ref({}) // 已尝试过获取名称的站
    
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

    // 缓存相关函数
    const getCacheKey = (regionId, datasource) => {
      return `order_tree_${regionId}_${datasource}`
    }

    const saveToCache = (regionId, datasource, data) => {
      const cacheKey = getCacheKey(regionId, datasource)
      const cacheData = {
        data: data,
        timestamp: Date.now(),
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7天有效期
      }
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    }

    const getFromCache = (regionId, datasource) => {
      const cacheKey = getCacheKey(regionId, datasource)
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
      try {
        loadingTree.value = true
        console.log('开始加载物品树（根据区域过滤）...')
        
        // 先尝试从缓存获取
        const cachedData = getFromCache(selectedRegionId.value, datasource.value)
        if (cachedData) {
          treeData.value = cachedData
          console.log('从缓存加载物品树')
          loadingTree.value = false
          return
        }

        // 缓存不存在或过期，从API获取
        const response = await typeApi.getHierarchy(selectedRegionId.value, datasource.value)
        console.log('物品树加载成功，数据长度:', response?.length || 0)
        treeData.value = response
        // 保存到缓存
        saveToCache(selectedRegionId.value, datasource.value, response)
      } catch (error) {
        console.error('加载物品树失败:', error)
        ElMessage.error('加载物品树失败: ' + (error.message || error))
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
      loadHierarchy()
      if (selectedTypeId.value) queryOrders()
    }
    
    const handleDatasourceChange = () => {
      if (selectedTypeId.value) queryOrders()
    }
    
    const handleNodeClick = (data) => {
      if (data.type === 'type') {
        selectedTypeId.value = data.id
        queryOrders()
      }
    }
    
    const syncOrders = async () => {
      if (!selectedRegionId.value || !selectedTypeId.value) return
      try {
        syncing.value = true
        await orderApi.syncOrders(selectedRegionId.value, selectedTypeId.value, datasource.value)
        ElMessage.success('订单同步任务已下发，请稍后刷新')
      } catch (error) {
        ElMessage.error('同步失败: ' + (error.response?.data?.message || error.message))
      } finally {
        syncing.value = false
      }
    }
    
    const queryOrders = async () => {
      if (!selectedRegionId.value || !selectedTypeId.value) return
      try {
        querying.value = true
        const response = await orderApi.getOrders({
          regionId: selectedRegionId.value,
          typeId: selectedTypeId.value,
          datasource: datasource.value,
          locationId: 60003760
        })
        buyOrders.value = response.buyOrders.data
        sellOrders.value = response.sellOrders.data
      } catch (error) {
        ElMessage.error('查询订单失败')
      } finally {
        querying.value = false
      }
    }
    
    // 获取空间站名称
    const fetchStationName = async (stationId, ds) => {
      if (loadingStation.value === stationId) return
      loadingStation.value = stationId
      stationAttempted.value = { ...stationAttempted.value, [stationId]: true }
      try {
        const res = await stationApi.getStation(stationId, ds || datasource.value)
        if (res.data?.data?.name) {
          stationNames.value = {
            ...stationNames.value,
            [stationId]: { cn: res.data.data.name, en: res.data.data.name_en || null }
          }
        } else {
          // ESI 无数据，标记为已尝试但无名称
          stationNames.value = { ...stationNames.value, [stationId]: null }
        }
      } catch (error) {
        console.error('获取空间站名称失败:', error)
        stationNames.value = { ...stationNames.value, [stationId]: null }
      } finally {
        loadingStation.value = null
      }
    }
    
    onMounted(() => {
      loadRegions()
      loadHierarchy()
      
      // 检查是否有从 LP 商店传来的查询参数
      const route = router
      if (route.query.typeId) {
        selectedTypeId.value = parseInt(route.query.typeId)
        // 延迟查询订单，等待树结构加载完成
        setTimeout(() => {
          queryOrders()
        }, 2000)
      }
    })
    
    return {
      regions, selectedRegionId, datasource, filterText, treeData, treeRef,
      selectedTypeId, buyOrders, sellOrders, syncing, querying, loadingTree,
      stationNames, loadingStation, stationAttempted,
      formatDate, formatISK, handleRegionChange, handleDatasourceChange,
      handleNodeClick, filterNode, syncOrders, queryOrders, fetchStationName
    }
  }
}
</script>

<style scoped>
/* 页面整体容器 */
.order-query-page {
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
  color: #fff;
}

:deep(.el-tree-node__content) {
  height: 36px !important;
  border-radius: 6px;
  margin-bottom: 2px;
  color: #fff;
}

:deep(.el-tree-node__label) {
  color: #fff;
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
}

.section-title.sell { color: #f56c6c; }
.section-title.buy { color: #67c23a; }

/* 表格样式美化 */
.order-table {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: #242736;
  --el-table-border-color: #2d303e;
  --el-table-text-color: #cbd5e1;
  --el-table-header-text-color: #94a3b8;
}

.price-text {
  font-family: 'Roboto Mono', monospace;
  font-weight: 600;
}

.price-text.sell { color: #ff8e8e; }
.price-text.buy { color: #8ef58e; }

:deep(.el-table__row--striped) td {
  background-color: #1e202e !important;
}

:deep(.el-table__body tr:hover > td) {
  background-color: #2a2d3d !important;
}

/* 位置列样式 */
.location-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
}

.location-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.location-id {
  color: #94a3b8;
  font-size: 11px;
  flex-shrink: 0;
}
</style>