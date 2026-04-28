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
              <el-table-column prop="location_id" label="位置 ID" width="120" />
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
              <el-table-column prop="location_id" label="位置 ID" width="120" />
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
import { useRouter } from 'vue-router'
import { regionApi, orderApi, typeApi } from '../services/api'
import { ElMessage } from 'element-plus'

export default {
  name: 'OrderQueryView',
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
    const buyOrders = ref([])
    const sellOrders = ref([])
    const syncing = ref(false)
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
        treeData.value = response
      } catch (error) {
        ElMessage.error('加载物品树失败')
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
          datasource: datasource.value
        })
        buyOrders.value = response.buyOrders.data
        sellOrders.value = response.sellOrders.data
      } catch (error) {
        ElMessage.error('查询订单失败')
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
      selectedTypeId, buyOrders, sellOrders, syncing, querying, loadingTree,
      formatDate, formatISK, handleRegionChange, handleDatasourceChange,
      handleNodeClick, filterNode, syncOrders, queryOrders
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
</style>