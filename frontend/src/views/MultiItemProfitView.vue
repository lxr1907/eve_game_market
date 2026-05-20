<template>
  <div class="multi-item-profit">
    <el-main>
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <span>LP多物品兑换收益</span>
                <el-tooltip content="总收益 = (结果物品卖价 × 兑换数量) - 所需物品总价 - ISK成本" placement="bottom">
                  <el-icon class="info-icon"><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
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
                  <span class="clickable-link" @click="showOrderDetails(scope.row)" :title="'点击查看订单详情'">
                    {{ scope.row.type_name || '物品ID: ' + scope.row.type_id }}
                  </span>
                  <el-tag
                    :type="scope.row.profit_per_lp > 0 ? 'success' : 'danger'"
                    size="large"
                    class="lp-profit-tag"
                    :class="scope.row.profit_per_lp > 0 ? 'profit-positive' : 'profit-negative'"
                    style="margin-left: 10px">
                    {{ scope.row.profit_per_lp > 0 ? '+' : '' }}每LP: {{ Math.floor(parseFloat(scope.row.profit_per_lp) || 0) }}
                  </el-tag>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="需要LP" min-width="80">
              <template #default="scope">
                <span>{{ formatNumber(scope.row.lpCost || scope.row.lp_cost) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="需要ISK" min-width="100">
              <template #default="scope">
                <span>{{ formatISK(scope.row.iskCost || scope.row.isk_cost) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="兑换数量" min-width="100">
              <template #default="scope">
                <span>{{ formatQuantity(scope.row.quantity) }}</span>
              </template>
            </el-table-column>

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

            <el-table-column label="所需物品" min-width="300">
              <template #default="scope">
                <div v-if="scope.row.required_items && scope.row.required_items.length > 0" class="required-items-list">
                  <div
                    v-for="(item, index) in scope.row.required_items"
                    :key="index"
                    class="required-item-row"
                  >
                    <span class="item-name">{{ item.type_name || item.typeId }}</span>
                    <span class="item-quantity">×{{ formatNumber(item.quantity) }}</span>
                    <span class="item-price">@{{ formatISK(item.sell_price) }}</span>
                    <span class="item-total">={{ formatISK(item.total_price) }}</span>
                  </div>
                </div>
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
      v-model="orderDialogVisible"
      :title="`${selectedItem?.type_name || '产品'} - 订单详情`"
      width="70%"
      destroy-on-close
      class="dark-dialog"
    >
      <div v-loading="queryingOrders">
        <el-row :gutter="20">
          <!-- 卖单表格 -->
          <el-col :span="12">
            <div class="dialog-section-header">
              <h3 class="dialog-title sell">
                <el-icon><Top /></el-icon> 卖出订单 (Sell)
              </h3>
            </div>
            <el-table
              :data="sellOrders"
              style="width: 100%"
              height="350px"
              size="small"
            >
              <el-table-column prop="price" label="价格 (ISK)" sortable min-width="120">
                <template #default="{ row }">
                  <span style="color: #f56c6c; font-weight: bold;">{{ formatISKShort(row.price) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="volume_remaining" label="剩余数量" sortable width="100">
                <template #default="{ row }">
                  {{ formatNumber(row.volume_remaining) }}
                </template>
              </el-table-column>
              <el-table-column label="位置" width="180">
                <template #default="{ row }">
                  <div class="location-cell">
                    <span v-if="stationNames[row.location_id]" class="location-name" :title="stationNames[row.location_id]">{{ stationNames[row.location_id] }}</span>
                    <span v-else-if="row.location_name" class="location-name" :title="row.location_name">{{ row.location_name }}</span>
                    <el-link v-else-if="!stationAttempted[row.location_id]" type="primary" size="small" @click="fetchStationName(row.location_id, row.datasource)">{{ row.location_id }}</el-link>
                    <span v-else>{{ row.location_id }}</span>
                    <span v-if="stationNames[row.location_id] || row.location_name" class="location-id">({{ row.location_id }})</span>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </el-col>

          <!-- 买单表格 -->
          <el-col :span="12">
            <div class="dialog-section-header">
              <h3 class="dialog-title buy">
                <el-icon><Bottom /></el-icon> 买入订单 (Buy)
              </h3>
            </div>
            <el-table
              :data="buyOrders"
              style="width: 100%"
              height="350px"
              size="small"
            >
              <el-table-column prop="price" label="价格 (ISK)" sortable min-width="120">
                <template #default="{ row }">
                  <span style="color: #67c23a; font-weight: bold;">{{ formatISKShort(row.price) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="volume_remaining" label="剩余数量" sortable width="100">
                <template #default="{ row }">
                  {{ formatNumber(row.volume_remaining) }}
                </template>
              </el-table-column>
              <el-table-column label="位置" width="180">
                <template #default="{ row }">
                  <div class="location-cell">
                    <span v-if="stationNames[row.location_id]" class="location-name" :title="stationNames[row.location_id]">{{ stationNames[row.location_id] }}</span>
                    <span v-else-if="row.location_name" class="location-name" :title="row.location_name">{{ row.location_name }}</span>
                    <el-link v-else-if="!stationAttempted[row.location_id]" type="primary" size="small" @click="fetchStationName(row.location_id, row.datasource)">{{ row.location_id }}</el-link>
                    <span v-else>{{ row.location_id }}</span>
                    <span v-if="stationNames[row.location_id] || row.location_name" class="location-id">({{ row.location_id }})</span>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </el-col>
        </el-row>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Search, CirclePlus, InfoFilled, Loading, Top, Bottom } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const profitData = ref([])
const orderDialogVisible = ref(false)
const selectedItem = ref(null)
const queryingOrders = ref(false)
const buyOrders = ref([])
const sellOrders = ref([])

// 空间站名称缓存
const stationNames = ref({})
const loadingStation = ref(null)
const stationAttempted = ref({})

const filters = reactive({
  corporationId: 1000180,
  datasource: 'serenity'
})

const pagination = reactive({
  page: 1,
  limit: 50,
  total: 0
})

const corporations = ref([
  { id: 1000436, name: '天使-摩拉辛狂热者' },
  { id: 1000437, name: '古斯塔斯-古力突击队' },
  { id: 1000181, name: '盖伦特-联邦防务联合会' },
  { id: 1000179, name: '艾玛-帝国科洛斯第二十四军团' },
  { id: 1000180, name: '加达里-合众国护卫军' },
  { id: 1000182, name: '米玛塔尔-部族解放力量' }
])

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

const showOrderDetails = async (row) => {
  console.log('showOrderDetails called with row:', row)
  selectedItem.value = row
  orderDialogVisible.value = true
  queryingOrders.value = true
  buyOrders.value = []
  sellOrders.value = []

  try {
    const regionId = row.region_id || 10000002
    const typeId = row.type_id
    const datasource = filters.datasource

    console.log('Fetching orders for:', { regionId, typeId, datasource })

    const response = await fetch(`/api/orders?regionId=${regionId}&typeId=${typeId}&datasource=${datasource}`)
    const result = await response.json()

    console.log('Orders API response:', result)

    if (result.buyOrders && result.buyOrders.data) {
      buyOrders.value = result.buyOrders.data
    }
    if (result.sellOrders && result.sellOrders.data) {
      sellOrders.value = result.sellOrders.data
    }

    if (buyOrders.value.length === 0 && sellOrders.value.length === 0) {
      ElMessage.warning('暂无订单数据')
    } else {
      console.log(`Loaded ${buyOrders.value.length} buy orders and ${sellOrders.value.length} sell orders`)
    }
  } catch (error) {
    console.error('获取订单详情失败:', error)
    ElMessage.error('获取订单详情失败: ' + error.message)
  } finally {
    queryingOrders.value = false
  }
}

const formatNumber = (value) => {
  if (value === null || value === undefined) return '-'
  const num = parseFloat(value)
  if (isNaN(num)) return '-'
  if (num >= 100000000) {
    return (num / 100000000).toFixed(2) + '亿'
  } else if (num >= 10000) {
    return (num / 10000).toFixed(2) + '万'
  }
  return num.toLocaleString()
}

// 简短 ISK 格式化（用于表格显示）
const formatISKShort = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const num = parseFloat(value)
  if (isNaN(num)) return '-'
  if (num >= 100000000) {
    return (num / 100000000).toFixed(2) + '亿'
  } else if (num >= 10000) {
    return (num / 10000).toFixed(2) + '万'
  }
  return Math.floor(num).toLocaleString()
}

// 兑换数量格式化
const formatQuantity = (value) => {
  if (value === null || value === undefined || value === '' || value === 0) {
    return '-'
  }
  const num = parseInt(value, 10)
  if (isNaN(num)) return '-'
  return num.toLocaleString()
}

const formatISK = (value) => {
  if (value === null || value === undefined || value === '') return '0 ISK'
  const num = parseFloat(value)
  if (isNaN(num)) return '0 ISK'
  if (num >= 100000000) {
    return (num / 100000000).toFixed(2) + '亿 ISK'
  } else if (num >= 10000) {
    return (num / 10000).toFixed(2) + '万 ISK'
  }
  return Math.floor(num).toLocaleString() + ' ISK'
}

const formatUpdatedAt = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

// 获取空间站名称
const fetchStationName = async (stationId, ds) => {
  if (loadingStation.value === stationId) return
  loadingStation.value = stationId
  stationAttempted.value = { ...stationAttempted.value, [stationId]: true }
  try {
    const res = await fetch(`/api/stations/${stationId}?datasource=${ds || filters.datasource}`)
    const data = await res.json()
    if (data?.data?.name) {
      stationNames.value = { ...stationNames.value, [stationId]: data.data.name }
    } else {
      stationNames.value = { ...stationNames.value, [stationId]: null }
    }
  } catch (error) {
    console.error('获取空间站名称失败:', error)
    stationNames.value = { ...stationNames.value, [stationId]: null }
  } finally {
    loadingStation.value = null
  }
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

.clickable-link {
  color: #409eff;
  cursor: pointer;
  text-decoration: underline;
}

.clickable-link:hover {
  color: #66b1ff;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-icon {
  color: #909399;
  cursor: help;
}

.required-items-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.required-item-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  padding: 2px 0;
}

.required-item-row .item-name {
  color: #e0e0e0;
  font-weight: 500;
}

.required-item-row .item-quantity {
  color: #909399;
}

.required-item-row .item-price {
  color: #f56c6c;
  font-size: 12px;
}

.required-item-row .item-total {
  color: #67c23a;
  font-weight: bold;
}

/* 深色主题弹窗样式 */
.dialog-section-header {
  margin-bottom: 12px;
}

.dialog-title {
  margin: 0;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dialog-title.sell {
  color: #f56c6c;  /* 红色 - 卖出订单 */
}

.dialog-title.buy {
  color: #67c23a;  /* 绿色 - 买入订单 */
}

/* 深色主题弹窗样式 */
:deep(.dark-dialog) {
  background-color: #1d1e1f !important;
}

:deep(.dark-dialog) .el-dialog__title {
  color: #e5eaf3;
}

:deep(.dark-dialog) .el-dialog__header {
  border-bottom: 1px solid #36364a;
}

:deep(.dark-dialog) .el-dialog__body {
  background-color: #1d1e1f !important;
}

:deep(.dark-dialog) .el-table {
  background-color: transparent !important;
}

:deep(.dark-dialog) .el-table__header-wrapper {
  background-color: #242736 !important;
}

:deep(.dark-dialog) .el-table__header th {
  background-color: #242736 !important;
  color: #94a3b8 !important;
}

:deep(.dark-dialog) .el-table__body-wrapper {
  background-color: transparent !important;
}

:deep(.dark-dialog) .el-table__row {
  background-color: transparent !important;
  color: #cbd5e1 !important;
}

:deep(.dark-dialog) .el-table__row:hover > td {
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