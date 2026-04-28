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
          <div class="search-input">
            <input 
              type="text" 
              v-model="typeSearch" 
              placeholder="输入物品名称搜索"
              @input="handleTypeSearch"
            >
            <button @click="handleTypeSearch">搜索</button>
          </div>
        </div>
        
        <div class="search-results">
          <h3>搜索结果</h3>
          <div v-if="querying">
            <p>查询中...</p>
          </div>
          <div v-else-if="availableTypes.length > 0">
            <ul>
              <li 
                v-for="type in availableTypes" 
                :key="type.id"
                @click="selectItem(type)"
                :class="{ active: selectedTypeId === type.id }"
              >
                {{ type.name }} (ID: {{ type.id }})
              </li>
            </ul>
          </div>
          <div v-else>
            <p>{{ typeSearch ? '未找到匹配的物品' : '请输入物品名称进行搜索' }}</p>
          </div>
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { regionApi, orderApi } from '../services/api'

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
    const availableTypes = ref([])
    const selectedTypeId = ref('')
    const typePage = ref(1)
    const typeLimit = ref(20)
    
    // 订单数据
    const buyOrders = ref([])
    const sellOrders = ref([])
    
    // 加载状态
    const syncing = ref(false)
    const querying = ref(false)
    
    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleString()
    }
    
    // 获取所有区域
    const loadRegions = async () => {
      try {
        console.log('开始加载区域数据...')
        const response = await regionApi.getRegions(1, null, '')
        console.log('区域数据加载成功:', response)
        regions.value = response.regions
        
        // 如果默认区域ID存在，自动加载该区域的可用类型
        if (selectedRegionId.value) {
          setTimeout(() => {
            loadAvailableTypes()
          }, 100)
        }
      } catch (error) {
        console.error('加载区域失败:', error)
        console.error('错误详情:', error.response)
      }
    }
    
    // 处理区域选择变化
    const handleRegionChange = () => {
      selectedTypeId.value = ''
      typeSearch.value = ''
      loadAvailableTypes()
    }
    
    // 处理数据源变化
    const handleDatasourceChange = () => {
      if (selectedTypeId.value) {
        queryOrders()
      }
    }
    
    // 加载可用类型
    const loadAvailableTypes = async () => {
      if (!selectedRegionId.value) return
      
      try {
        const response = await orderApi.getAvailableTypesByRegion(selectedRegionId.value, {
          page: typePage.value,
          limit: typeLimit.value,
          search: typeSearch.value
        })
        availableTypes.value = response.data
      } catch (error) {
        console.error('加载可用类型失败:', error)
      }
    }
    
    // 处理类型搜索
    const handleTypeSearch = () => {
      typePage.value = 1
      loadAvailableTypes()
    }
    
    // 选择物品并查询订单
    const selectItem = (type) => {
      selectedTypeId.value = type.id
      queryOrders() // 选中物品后自动触发查询订单
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
    
    // 初始化数据
    onMounted(() => {
      loadRegions()
    })
    
    return {
      // 区域相关
      regions,
      selectedRegionId,
      
      // 数据源
      datasource,
      handleDatasourceChange,
      
      // 类型相关
      typeSearch,
      availableTypes,
      selectedTypeId,
      
      // 订单相关
      buyOrders,
      sellOrders,
      
      // 状态相关
      syncing,
      querying,
      
      // 方法
      formatDate,
      handleRegionChange,
      handleTypeSearch,
      selectItem,
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
  width: 300px;
  background-color: #2c3e50;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

/* 物品搜索 */
.item-search {
  margin-bottom: 20px;
}

.search-input {
  display: flex;
  gap: 10px;
  width: 100%;
}

.search-input input {
  flex: 1;
  padding: 10px;
  border: 1px solid #4a5568;
  border-radius: 4px;
  font-size: 16px;
  background-color: #1a202c;
  color: #e2e8f0;
}

.search-input button {
  padding: 10px 15px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.search-input button:hover {
  background-color: #45a049;
}

/* 搜索结果 */
.search-results {
  flex: 1;
  overflow-y: auto;
}

.search-results h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  font-size: 18px;
}

.search-results ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.search-results li {
  padding: 10px;
  margin-bottom: 8px;
  background-color: #1a202c;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #4a5568;
  transition: all 0.2s ease;
  color: #e2e8f0;
}

.search-results li:hover {
  background-color: #2d3748;
  border-color: #4CAF50;
}

.search-results li.active {
  background-color: #4CAF50;
  color: white;
  border-color: #4CAF50;
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