<template>
  <div class="order-query-container">
    <!-- 顶部查询条件 -->
    <div class="top-query-form">
      <div class="form-group">
        <label for="regionSelect">区域</label>
        <select 
          id="regionSelect" 
          v-model="selectedRegionId"
          @change="handleRegionChange"
        >
          <option value="">请选择区域</option>
          <option 
            v-for="region in regions" 
            :key="region.id" 
            :value="region.id"
          >
            {{ region.name }} (ID: {{ region.id }})
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>数据源</label>
        <div class="datasource-selector">
          <label class="radio-label">
            <input type="radio" v-model="datasource" value="serenity" @change="handleDatasourceChange"> 晨曦
          </label>
          <label class="radio-label">
            <input type="radio" v-model="datasource" value="infinity" @change="handleDatasourceChange"> 曙光
          </label>
          <label class="radio-label">
            <input type="radio" v-model="datasource" value="tranquility" @change="handleDatasourceChange"> 欧服
          </label>
        </div>
      </div>
    </div>
    
    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 左侧：物品搜索 -->
      <div class="left-panel">
        <div class="item-search">
          <el-input
            v-model="filterText"
            placeholder="输入物品名称或ID搜索"
            clearable
            class="search-input"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        
        <div class="search-results">
          <div v-if="loadingTree" class="loading-container">
            <el-skeleton :rows="10" animated />
          </div>
          <el-tree
            v-else
            ref="treeRef"
            :data="treeData"
            :props="{ label: 'label', children: 'children' }"
            :filter-node-method="filterNode"
            @node-click="handleNodeClick"
            highlight-current
            node-key="id"
            class="type-tree"
          >
            <template #default="{ node, data }">
              <span class="custom-tree-node" :class="{ 'is-active': selectedTypeId === data.id && data.type === 'type' }">
                <el-icon v-if="data.type === 'category'"><Folder /></el-icon>
                <el-icon v-else-if="data.type === 'group'"><Collection /></el-icon>
                <el-icon v-else><Document /></el-icon>
                <span class="node-label">{{ node.label }}</span>
              </span>
            </template>
          </el-tree>
        </div>
      </div>
      
      <!-- 右侧：订单展示 -->
      <div class="right-panel">
        <!-- 右上：卖单 -->
        <div class="order-section sell-orders">
          <h2>卖出订单</h2>
          <div v-if="querying">
            <p>查询中...</p>
          </div>
          <div v-else-if="sellOrders.length > 0">
            <table>
              <thead>
                <tr>
                  <th>订单ID</th>
                  <th>类型ID</th>
                  <th>类型名称</th>
                  <th>价格</th>
                  <th>数量</th>
                  <th>最小数量</th>
                  <th>有效期</th>
                  <th>位置</th>
                  <th>创建时间</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in sellOrders" :key="order.order_id">
                  <td>{{ order.order_id }}</td>
                  <td>{{ order.type_id }}</td>
                  <td>{{ order.type_name }}</td>
                  <td>{{ parseFloat(order.price).toFixed(2) }}</td>
                  <td>{{ order.volume_total }}</td>
                  <td>{{ order.min_volume }}</td>
                  <td>{{ order.duration }}</td>
                  <td>{{ order.location_id }}</td>
                  <td>{{ formatDate(order.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else>
            <p>{{ sellOrders.length === 0 && !querying ? '暂无卖出订单' : '' }}</p>
          </div>
        </div>
        
        <!-- 右下：买单 -->
        <div class="order-section buy-orders">
          <h2>买入订单</h2>
          <div v-if="querying">
            <p>查询中...</p>
          </div>
          <div v-else-if="buyOrders.length > 0">
            <table>
              <thead>
                <tr>
                  <th>订单ID</th>
                  <th>类型ID</th>
                  <th>类型名称</th>
                  <th>价格</th>
                  <th>数量</th>
                  <th>最小数量</th>
                  <th>有效期</th>
                  <th>位置</th>
                  <th>创建时间</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in buyOrders" :key="order.order_id">
                  <td>{{ order.order_id }}</td>
                  <td>{{ order.type_id }}</td>
                  <td>{{ order.type_name }}</td>
                  <td>{{ parseFloat(order.price).toFixed(2) }}</td>
                  <td>{{ order.volume_total }}</td>
                  <td>{{ order.min_volume }}</td>
                  <td>{{ order.duration }}</td>
                  <td>{{ order.location_id }}</td>
                  <td>{{ formatDate(order.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else>
            <p>{{ buyOrders.length === 0 && !querying ? '暂无买入订单' : '' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { regionApi, orderApi, typeApi } from '../services/api'

export default {
  name: 'OrderQueryView',
  setup() {
      // 路由
      const router = useRouter()
      
      // 区域数据
    const regions = ref([])
    const selectedRegionId = ref('10000002') // 默认选择区域10000002
    
    // 数据源
    const datasource = ref('serenity')
    
    // 类型数据
    const typeSearch = ref('')
    const treeData = ref([])
    const treeRef = ref(null)
    const filterText = ref('')
    const selectedTypeId = ref('')
    
    // 订单数据
    const buyOrders = ref([])
    const sellOrders = ref([])
    
    // 加载状态
    const syncing = ref(false)
    const querying = ref(false)
    const loadingTree = ref(false)
    
    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleString()
    }
    
    // 获取所有区域
    const loadRegions = async () => {
      try {
        const response = await regionApi.getRegions(1, null, '')
        regions.value = response.regions
      } catch (error) {
        console.error('加载区域失败:', error)
      }
    }

    // 获取层级结构
    const loadHierarchy = async () => {
      try {
        loadingTree.value = true
        const response = await typeApi.getHierarchy()
        treeData.value = response
      } catch (error) {
        console.error('加载层级结构失败:', error)
      } finally {
        loadingTree.value = false
      }
    }

    // 树过滤逻辑
    const filterNode = (value, data) => {
      if (!value) return true
      // 如果是分类层，始终保留显示
      if (data.type === 'category') return true
      // 搜索名称或ID
      const searchTerm = value.toLowerCase()
      return data.label.toLowerCase().includes(searchTerm)
    }

    // 监听过滤文本变化
    watch(filterText, (val) => {
      treeRef.value?.filter(val)
    })
    
    // 处理区域选择变化
    const handleRegionChange = () => {
      // 区域变化不再需要重新加载可用类型，因为我们现在用全量树
      if (selectedTypeId.value) {
        queryOrders()
      }
    }
    
    // 处理数据源变化
    const handleDatasourceChange = () => {
      if (selectedTypeId.value) {
        queryOrders()
      }
    }
    
    // 处理树节点点击
    const handleNodeClick = (data) => {
      if (data.type === 'type') {
        selectedTypeId.value = data.id
        queryOrders()
      }
    }
    
    // 同步订单数据
    const syncOrders = async () => {
      if (!selectedRegionId.value || !selectedTypeId.value) return
      
      try {
        syncing.value = true
        await orderApi.syncOrders(selectedRegionId.value, selectedTypeId.value, datasource.value)
        alert('订单数据同步已开始，请稍后查询结果')
      } catch (error) {
        console.error('同步订单失败:', error)
        alert('同步失败：' + (error.response?.data?.message || error.message))
      } finally {
        syncing.value = false
      }
    }
    
    // 查询订单数据
    const queryOrders = async () => {
      if (!selectedRegionId.value || !selectedTypeId.value) return
      
      try {
        querying.value = true
        const response = await orderApi.getOrders({
          regionId: selectedRegionId.value,
          typeId: selectedTypeId.value,
          datasource: datasource.value
        })
        
        // 使用API返回的分离好的订单数据
        buyOrders.value = response.buyOrders.data
        sellOrders.value = response.sellOrders.data
      } catch (error) {
        console.error('查询订单失败:', error)
        alert('查询失败：' + (error.response?.data?.message || error.message))
      } finally {
        querying.value = false
      }
    }
    
    // 生命周期钩子
    onMounted(() => {
      loadRegions()
      loadHierarchy()
    })
    
    return {
      regions,
      selectedRegionId,
      datasource,
      filterText,
      treeData,
      treeRef,
      selectedTypeId,
      buyOrders,
      sellOrders,
      syncing,
      querying,
      loadingTree,
      formatDate,
      handleRegionChange,
      handleDatasourceChange,
      handleNodeClick,
      filterNode,
      syncOrders,
      queryOrders
    }
  }
}
</script>

<style scoped>
.order-query-container {
  padding: 20px;
}

.top-query-form {
  display: flex;
  gap: 30px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
  align-items: center;
}

.form-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.form-group label {
  font-weight: bold;
  color: #606266;
}

.datasource-selector {
  display: flex;
  gap: 15px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-size: 14px;
}

/* 主内容区域 */
.main-content {
  display: flex;
  gap: 20px;
  min-height: 600px;
}

/* 左侧面板 */
.left-panel {
  width: 350px;
  min-width: 350px;
  flex-shrink: 0;
  background-color: #1a1a1a;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.item-search {
  padding: 15px;
  border-bottom: 1px solid #333;
}

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.type-tree {
  background: transparent !important;
  color: #ccc !important;
}

:deep(.el-tree-node__content) {
  height: 32px !important;
}

:deep(.el-tree-node__content:hover) {
  background-color: #2a2a2a !important;
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background-color: #333 !important;
  color: #409eff !important;
}

.custom-tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  width: 100%;
}

.custom-tree-node.is-active {
  color: #409eff;
  font-weight: bold;
}

.node-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-container {
  padding: 20px;
}

/* 右侧面板 */
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 订单区域 */
.order-section {
  background-color: #2c3e50;
  border-radius: 8px;
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  width: 800px;
}

.order-section h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #e2e8f0;
  font-size: 20px;
}

.order-section table {
  width: 100%;
  border-collapse: collapse;
  background-color: #1a202c;
  color: #e2e8f0;
}

.order-section th,
.order-section td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #4a5568;
  font-size: 14px;
}

.order-section th {
  background-color: #2c3e50;
  color: white;
  font-weight: bold;
}

.order-section tr {
  background-color: #1a202c;
}

.order-section tr:nth-child(even) {
  background-color: #1a202c;
}

.order-section tr:nth-child(odd) {
  background-color: #1a202c;
}

.order-section tr:hover {
  background-color: #34495e;
}

/* 表单样式 */
.form-group {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

.form-group select {
  width: 100%;
  max-width: 300px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}
</style>