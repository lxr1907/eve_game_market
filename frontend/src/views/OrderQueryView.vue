<template>
  <div class="order-query-container">
    <el-main>
        <h1>订单查询系统</h1>
    
    <div class="query-form">
      <div class="form-group">
        <label for="regionSelect">选择区域</label>
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
        <label for="typeSearch">类型搜索</label>
        <div class="search-input">
          <input 
            type="text" 
            id="typeSearch" 
            v-model="typeSearch" 
            placeholder="输入类型名称"
            @input="handleTypeSearch"
          >
          <button @click="handleTypeSearch">搜索</button>
        </div>
      </div>
      
      <div class="form-group">
        <label for="typeSelect">选择类型</label>
        <select 
          id="typeSelect" 
          v-model="selectedTypeId"
          :disabled="!selectedRegionId"
        >
          <option value="">请选择类型</option>
          <option 
            v-for="type in availableTypes" 
            :key="type.id" 
            :value="type.id"
          >
            {{ type.name }} (ID: {{ type.id }})
          </option>
        </select>
      </div>
      
      <div class="form-actions">
        <button 
          class="sync-btn" 
          @click="syncOrders"
          :disabled="!selectedRegionId || !selectedTypeId"
        >
          {{ syncing ? '同步中...' : '同步数据' }}
        </button>
        <button 
          class="query-btn" 
          @click="queryOrders"
          :disabled="!selectedRegionId || !selectedTypeId"
        >
          {{ querying ? '查询中...' : '查询数据' }}
        </button>
      </div>
    </div>
    
    <div class="results-container">
      <div class="order-list buy-list">
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
      
      <div class="order-list sell-list">
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
    </div>
    </el-main>
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
    const selectedRegionId = ref('')
    
    // 类型数据
    const typeSearch = ref('')
    const availableTypes = ref([])
    const selectedTypeId = ref('')
    const typePage = ref(1)
    const typeLimit = ref(10)
    
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
    
    // 同步订单数据
    const syncOrders = async () => {
      if (!selectedRegionId.value || !selectedTypeId.value) return
      
      try {
        syncing.value = true
        await orderApi.syncOrders(selectedRegionId.value, selectedTypeId.value)
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
          typeId: selectedTypeId.value
        })
        
        // 分离买入和卖出订单
        buyOrders.value = response.data.filter(order => order.is_buy_order)
        sellOrders.value = response.data.filter(order => !order.is_buy_order)
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
      syncOrders,
      queryOrders
    }
  }
}
</script>

<style scoped>
.order-query-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.query-form {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 30px;
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.form-group {
  flex: 1;
  min-width: 200px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

.form-group select,
.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.search-input {
  display: flex;
  gap: 10px;
}

.search-input input {
  flex: 1;
}

.search-input button {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.search-input button:hover {
  background-color: #45a049;
}

.form-actions {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.sync-btn,
.query-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.sync-btn {
  background-color: #2196F3;
  color: white;
}

.sync-btn:hover {
  background-color: #0b7dda;
}

.sync-btn:disabled,
.query-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.query-btn {
  background-color: #FF9800;
  color: white;
}

.query-btn:hover {
  background-color: #e68900;
}

.results-container {
  display: flex;
  gap: 30px;
  flex-wrap: wrap;
}

.order-list {
  flex: 1;
  min-width: 400px;
  background-color: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
}

.order-list h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
}

.order-list table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
}

.order-list th,
.order-list td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.order-list th {
  background-color: #4CAF50;
  color: white;
  font-weight: bold;
}

.order-list tr:hover {
  background-color: #f5f5f5;
}
</style>