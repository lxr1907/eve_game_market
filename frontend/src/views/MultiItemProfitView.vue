<template>
  <div class="multi-item-profit">
    <el-main>
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>LP多物品兑换收益</span>
              <div class="filters">
                <el-select
                  v-model="filters.corporationId"
                  placeholder="选择公司"
                  style="width: 200px; margin-right: 10px"
                  @change="fetchData"
                >
                  <el-option
                    v-for="corp in corporations"
                    :key="corp.id"
                    :label="corp.name"
                    :value="corp.id"
                  />
                </el-select>
                <el-select
                  v-model="filters.datasource"
                  placeholder="选择数据源"
                  style="width: 150px; margin-right: 10px"
                  @change="fetchData"
                >
                  <el-option label="晨曦(serenity)" value="serenity" />
                  <el-option label="曙光(infinity)" value="infinity" />
                  <el-option label="欧服(tranquility)" value="tranquility" />
                </el-select>
                <el-button type="primary" @click="fetchData">
                  <el-icon><Search /></el-icon>
                  查询
                </el-button>
                <el-button type="success" @click="calculateProfit" style="margin-left: 10px">
                  <el-icon><CirclePlus /></el-icon>
                  计算收益
                </el-button>
              </div>
            </div>
          </template>
          
          <!-- 数据表格 -->
          <el-table
            v-loading="loading"
            :data="profitData"
            style="width: 100%"
          >
            <el-table-column label="物品名称" min-width="250">
              <template #default="scope">
                <div class="item-name-container">
                  <el-link type="primary" @click="showOrderDetails(scope.row)">{{ scope.row.type_name }}</el-link>
                  <el-tag 
                    :type="scope.row.profit_per_lp > 0 ? 'success' : 'danger'" 
                    size="large" 
                    class="lp-profit-tag" 
                    :class="scope.row.profit_per_lp > 0 ? 'profit-positive' : 'profit-negative'"
                    style="margin-left: 10px">
                    {{ scope.row.profit_per_lp > 0 ? '+' : '' }}每LP: {{ formatNumber(scope.row.profit_per_lp) }}
                  </el-tag>
                </div>
              </template>
            </el-table-column>

            <el-table-column prop="corporation_name" label="公司" min-width="150" />
            <el-table-column prop="lp_cost" label="需要LP" min-width="80" :formatter="formatNumber" />
            <el-table-column prop="isk_cost" label="需要ISK" min-width="100" :formatter="formatISK" />
            <el-table-column prop="quantity" label="兑换数量" min-width="80" :formatter="formatNumber" />
            
            <el-table-column label="所需物品总价" min-width="120">
              <template #default="scope">
                <span>{{ formatISK(scope.row.required_items_total_sell_price) }}</span>
              </template>
            </el-table-column>
            
            <el-table-column label="结果物品卖价" min-width="120">
              <template #default="scope">
                <span>{{ formatISK(scope.row.result_item_sell_price) }}</span>
              </template>
            </el-table-column>
            
            <el-table-column label="结果物品买价" min-width="120">
              <template #default="scope">
                <span>{{ formatISK(scope.row.result_item_buy_price) }}</span>
              </template>
            </el-table-column>
            
            <el-table-column label="所需物品" min-width="200">
              <template #default="scope">
                <el-popover
                  v-if="scope.row.required_items && scope.row.required_items.length > 0"
                  trigger="click"
                  placement="top"
                >
                  <template #reference>
                    <el-button type="text" size="small">查看所需物品</el-button>
                  </template>
                  <el-table :data="scope.row.required_items" size="small" style="width: 400px;">
                    <el-table-column prop="type_name" label="物品名称" />
                    <el-table-column prop="quantity" label="数量" />
                    <el-table-column label="单价" :formatter="(row) => formatISK(row.sell_price)" />
                    <el-table-column label="总价" :formatter="(row) => formatISK(row.total_price)" />
                  </el-table>
                </el-popover>
                <span v-else>-</span>
              </template>
            </el-table-column>
            
            <el-table-column prop="total_profit" label="总收益" min-width="100">
              <template #default="scope">
                <span :class="scope.row.total_profit >= 0 ? 'profit-positive' : 'profit-negative'">
                  {{ scope.row.total_profit >= 0 ? '+' : '' }}{{ formatISK(scope.row.total_profit) }}
                </span>
              </template>
            </el-table-column>
            
            <el-table-column prop="updated_at" label="更新时间" min-width="140" sortable>
              <template #default="{ row }">
                <span class="updated-at-text">{{ formatUpdatedAt(row.updated_at) }}</span>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="pagination-container">
            <el-pagination
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
              :current-page="pagination.page"
              :page-sizes="[20, 50, 100]"
              :page-size="pagination.limit"
              :total="pagination.total"
              layout="total, sizes, prev, pager, next, jumper"
            />
          </div>
        </el-card>
    </el-main>

    <!-- 订单详情弹窗 -->
    <el-dialog
      :title="'订单详情 - ' + selectedItem?.type_name"
      :visible.sync="orderDialogVisible"
      width="800px"
    >
      <OrderDetailComponent v-if="selectedItem" :type-id="selectedItem.type_id" :datasource="filters.datasource" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Search, CirclePlus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import OrderDetailComponent from '../components/OrderDetailComponent.vue'

const loading = ref(false)
const profitData = ref([])
const orderDialogVisible = ref(false)
const selectedItem = ref(null)

const filters = reactive({
  corporationId: '',
  datasource: 'serenity'
})

const pagination = reactive({
  page: 1,
  limit: 50,
  total: 0
})

const corporations = ref([])

const fetchCorporations = async () => {
  try {
    const response = await fetch('/api/corporations')
    const result = await response.json()
    if (result.success) {
      corporations.value = result.data
    }
  } catch (error) {
    console.error('Error fetching corporations:', error)
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: pagination.page,
      limit: pagination.limit,
      datasource: filters.datasource
    })
    if (filters.corporationId) {
      params.append('corporationId', filters.corporationId)
    }
    
    const response = await fetch(`/api/loyalty/multi-item-profit?${params}`)
    const result = await response.json()
    if (result.success) {
      profitData.value = result.data
      pagination.total = result.total
      pagination.page = result.page
      pagination.limit = result.limit
    }
  } catch (error) {
    console.error('Error fetching multi-item profit data:', error)
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

const calculateProfit = async () => {
  if (!filters.corporationId) {
    ElMessage.warning('请先选择公司')
    return
  }
  
  try {
    const response = await fetch(`/api/loyalty/multi-item-profit/calculate?corporationId=${filters.corporationId}`, {
      method: 'POST'
    })
    const result = await response.json()
    if (result.status === 'started') {
      ElMessage.success('计算任务已开始，将在后台执行')
      setTimeout(() => {
        fetchData()
      }, 5000)
    }
  } catch (error) {
    console.error('Error calculating profit:', error)
    ElMessage.error('计算失败')
  }
}

const showOrderDetails = (item) => {
  selectedItem.value = item
  orderDialogVisible.value = true
}

const formatNumber = (value) => {
  if (value === null || value === undefined) return '-'
  return Number(value).toLocaleString()
}

const formatISK = (value) => {
  if (value === null || value === undefined || value === 0) return '0 ISK'
  const num = Number(value)
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(2) + ' 亿 ISK'
  } else if (num >= 10000) {
    return (num / 10000).toFixed(2) + ' 万 ISK'
  }
  return num.toFixed(2) + ' ISK'
}

const formatUpdatedAt = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const handleSizeChange = (val) => {
  pagination.limit = val
  pagination.page = 1
  fetchData()
}

const handleCurrentChange = (val) => {
  pagination.page = val
  fetchData()
}

onMounted(() => {
  fetchCorporations()
  fetchData()
})
</script>

<style scoped>
.multi-item-profit {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filters {
  display: flex;
  align-items: center;
}

.item-name-container {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.lp-profit-tag {
  font-weight: bold;
  font-size: 14px;
  padding: 4px 12px;
  border-radius: 4px;
}

.lp-profit-tag.profit-positive {
  background-color: rgba(103, 194, 54, 0.2);
  color: #67c23a;
}

.lp-profit-tag.profit-negative {
  background-color: rgba(245, 108, 108, 0.2);
  color: #f56c6c;
}

.profit-positive {
  color: #67c23a;
}

.profit-negative {
  color: #f56c6c;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.updated-at-text {
  font-size: 12px;
  color: #999;
}
</style>