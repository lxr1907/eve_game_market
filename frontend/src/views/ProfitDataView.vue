<template>
  <div class="profit-data">
    <el-main>
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>收益数据</span>
              <div class="filters">
                <el-select
                  v-model="filters.corporationId"
                  placeholder="选择公司"
                  style="width: 200px; margin-right: 10px"
                  @change="fetchProfitData"
                >
                  <el-option
                    v-for="corp in corporations"
                    :key="corp.id"
                    :label="corp.name"
                    :value="corp.id"
                  />
                </el-select>
                <el-select
                  v-model="filters.regionId"
                  placeholder="选择区域"
                  style="width: 200px; margin-right: 10px"
                >
                  <el-option
                    v-for="region in regions"
                    :key="region.id"
                    :label="region.name"
                    :value="region.id"
                  />
                </el-select>
                <el-select
                  v-model="filters.datasource"
                  placeholder="选择数据源"
                  style="width: 150px; margin-right: 10px"
                >
                  <el-option label="晨曦(serenity)" value="serenity" />
                  <el-option label="曙光(infinity)" value="infinity" />
                  <el-option label="欧服(tranquility)" value="tranquility" />
                </el-select>
                <el-input
                  v-model="filters.search"
                  placeholder="搜索物品名称"
                  clearable
                  style="width: 180px; margin-right: 10px"
                  @keyup.enter="fetchProfitData"
                  @clear="fetchProfitData"
                />
                <el-select
                  v-model="filters.profitFilter"
                  placeholder="利润筛选"
                  style="width: 140px; margin-right: 10px"
                  @change="fetchProfitData"
                >
                  <el-option label="全部" value="" />
                  <el-option label="> 0" value="gt0" />
                  <el-option label="> 500" value="gt500" />
                  <el-option label="> 1000" value="gt1000" />
                  <el-option label="> 1500" value="gt1500" />
                </el-select>
                <el-button type="primary" @click="fetchProfitData">
                  <el-icon><Search /></el-icon>
                  查询
                </el-button>
                <el-button type="success" @click="calculateProfit" style="margin-left: 10px">
                  <el-icon><CirclePlus /></el-icon>
                  计算所有收益
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
                  <el-button 
                    type="primary" 
                    link 
                    style="margin-left: 8px; padding: 0; font-size: 16px;"
                    @click="showTypeDetails(scope.row.type_id)"
                    title="查看物品详情"
                  >
                    <el-icon><Warning /></el-icon>
                  </el-button>
                  <el-icon v-if="scope.row.is_unique === 1" class="unique-icon" title="独特物品"><Star /></el-icon>
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

            <el-table-column prop="lp_cost" label="LP成本" min-width="80" :formatter="formatNumber" />
            <el-table-column prop="isk_cost" label="ISK成本" min-width="100" :formatter="formatNumber" />
            <el-table-column prop="sell_price" label="售价" min-width="100" :formatter="formatNumber" />
            <el-table-column prop="quantity" label="数量" min-width="80" :formatter="formatQuantity" />
            <el-table-column prop="total_profit" label="总收益" min-width="100" :formatter="formatNumber" />
            <el-table-column prop="updated_at" label="更新时间" min-width="140" sortable>
              <template #default="{ row }">
                <span class="updated-at-text">{{ formatUpdatedAt(row.updated_at) }}</span>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- 分页 -->
          <div class="pagination">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="total"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </el-card>

        <!-- 订单详情弹窗 -->
        <el-dialog
          v-model="orderDialogVisible"
          :title="`${selectedOrderData?.type_name || ''} - 订单详情`"
          width="70%"
          destroy-on-close
          class="dark-dialog"
        >
          <div v-loading="queryingOrders" class="dark-dialog-content">
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
                  height="400px"
                  size="small"
                >
                  <el-table-column prop="price" label="价格 (ISK)" sortable min-width="120">
                    <template #default="{ row }">
                      <span style="color: #f56c6c; font-weight: bold;">{{ formatISK(row.price) }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="volume_total" label="数量" sortable width="100">
                    <template #default="{ row }">
                      {{ formatNumber(row.volume_total) }}
                    </template>
                  </el-table-column>
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
                  <el-table-column prop="created_at" label="创建时间" sortable min-width="140">
                    <template #default="{ row }">
                      {{ formatDate(row.created_at) }}
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
                  height="400px"
                  size="small"
                >
                  <el-table-column prop="price" label="价格 (ISK)" sortable min-width="120">
                    <template #default="{ row }">
                      <span style="color: #67c23a; font-weight: bold;">{{ formatISK(row.price) }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="volume_total" label="数量" sortable width="100">
                    <template #default="{ row }">
                      {{ formatNumber(row.volume_total) }}
                    </template>
                  </el-table-column>
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
                  <el-table-column prop="created_at" label="创建时间" sortable min-width="140">
                    <template #default="{ row }">
                      {{ formatDate(row.created_at) }}
                    </template>
                  </el-table-column>
                </el-table>
              </el-col>
            </el-row>
          </div>
        </el-dialog>

        <!-- 物品详情弹窗 -->
        <el-dialog
          v-model="typeDialogVisible"
          :title="`${selectedTypeData?.name || '物品'} - 详情`"
          width="50%"
          destroy-on-close
          class="dark-dialog"
        >
          <div v-loading="loadingType" class="dark-dialog-content">
            <div v-if="selectedTypeData" class="type-info">
              <el-descriptions :column="2" class="dark-descriptions">
                <el-descriptions-item label="ID">{{ selectedTypeData.id }}</el-descriptions-item>
                <el-descriptions-item label="名称">{{ selectedTypeData.name }}</el-descriptions-item>
                <el-descriptions-item label="组ID">{{ selectedTypeData.group_id }}</el-descriptions-item>
                <el-descriptions-item label="分类ID">{{ selectedTypeData.category_id }}</el-descriptions-item>
                <el-descriptions-item label="质量">{{ selectedTypeData.mass }}</el-descriptions-item>
                <el-descriptions-item label="体积">{{ selectedTypeData.volume }}</el-descriptions-item>
                <el-descriptions-item label="容量">{{ selectedTypeData.capacity }}</el-descriptions-item>
                <el-descriptions-item label="描述">{{ selectedTypeData.description }}</el-descriptions-item>
                <el-descriptions-item label="发布状态">
                  <el-tag :type="selectedTypeData.published ? 'success' : 'info'" size="small">
                    {{ selectedTypeData.published ? '已发布' : '未发布' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="半径">{{ selectedTypeData.radius }}</el-descriptions-item>
                <el-descriptions-item label="图形ID">{{ selectedTypeData.graphic_id }}</el-descriptions-item>
                <el-descriptions-item label="图标ID">{{ selectedTypeData.icon_id }}</el-descriptions-item>
                <el-descriptions-item label="市场组ID">{{ selectedTypeData.market_group_id }}</el-descriptions-item>
                <el-descriptions-item label="蓝图制造时间(秒)">{{ selectedTypeData.portion_size }}</el-descriptions-item>
              </el-descriptions>
            </div>
            <div v-else class="empty">
              <el-empty description="未找到物品数据" />
            </div>
          </div>
        </el-dialog>
    </el-main>
  </div>
</template>

<script setup>// 导入
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Star, CirclePlus, Top, Bottom, Warning } from '@element-plus/icons-vue'
import { loyaltyApi, orderApi, typeApi, stationApi } from '../services/api'

const router = useRouter()

// 数据
const profitData = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 订单弹窗数据
const orderDialogVisible = ref(false)
const selectedOrderData = ref(null)
const queryingOrders = ref(false)
const buyOrders = ref([])
const sellOrders = ref([])

// 空间站名称缓存
const stationNames = ref({})
const loadingStation = ref(null)
const stationAttempted = ref({})

// 物品详情弹窗数据
const typeDialogVisible = ref(false)
const selectedTypeData = ref(null)
const loadingType = ref(false)

// 过滤器
const filters = ref({
  corporationId: 1000180, // 默认公司ID
  regionId: 10000002,     // 默认区域ID
  datasource: 'serenity',  // 默认数据源
  search: '',              // 搜索关键词
  profitFilter: ''         // 利润筛选
})

// 监听数据源变化，自动更新区域ID并查询数据
watch(() => filters.value.datasource, (newDatasource) => {
  if (newDatasource === 'infinity') {
    filters.value.regionId = 10000016; // 长征区域ID
  } else {
    filters.value.regionId = 10000002; // 加达里首星区域ID (serenity和tranquility共用)
  }
  // 在区域ID更新后查询数据
  fetchProfitData();
})

// 公司列表
const corporations = ref([
  { id: 1000436, name: '天使-摩拉辛狂热者' },
  { id: 1000437, name: '古斯塔斯-古力突击队' },
  { id: 1000181, name: '盖伦特-联邦防务联合会' },
  { id: 1000179, name: '艾玛-帝国科洛斯第二十四军团' },
  { id: 1000180, name: '加达里-合众国护卫军' },
  { id: 1000182, name: '米玛塔尔-部族解放力量' }
])

// 区域列表
const regions = ref([
  { id: 10000002, name: '吉他-加达里首星' },
  { id: 10000016, name: '索八色基-长征' },
  // 可以根据需要添加更多区域
])

// 格式化日期
const formatDate = (row, column, cellValue) => {
  if (!cellValue) return ''
  const date = new Date(cellValue)
  return date.toLocaleString()
}

// 友好格式化更新时间
const formatUpdatedAt = (val) => {
  if (!val) return '-'
  const date = new Date(val)
  if (isNaN(date.getTime())) return '-'
  const now = new Date()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}小时前`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}天前`
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化数字，大数字转换为带单位的形式（10000 → 1w）
const formatNumber = (row, column, cellValue) => {
  // 确定实际要格式化的值
  let value;
  if (column === undefined && cellValue === undefined) {
    // 直接调用：formatNumber(value)
    value = row;
  } else {
    // 处理表格列格式化的情况：formatNumber(row, column, cellValue)
    value = cellValue;
  }
  
  if (value === null || value === undefined) return '';
  
  // 转换为数字
  value = Number(value);
  if (isNaN(value)) return '';
  
  // 格式化逻辑：添加单位转换
  if (value >= 100000000) {
    // 大于等于1亿
    return (value / 100000000).toFixed(2) + '亿';
  } else if (value >= 10000) {
    // 大于等于1万
    return (value / 10000).toFixed(2) + '万';
  } else {
    // 小于1万，只保留整数
    return Math.floor(value).toLocaleString();
  }
}

// 数量格式化（只保留整数）
const formatQuantity = (row, column, cellValue) => {
  let value;
  if (column === undefined && cellValue === undefined) {
    value = row;
  } else {
    value = cellValue;
  }
  if (value === null || value === undefined) return '';
  value = Number(value);
  if (isNaN(value)) return '';
  if (value >= 100000000) {
    return (value / 100000000).toFixed(2) + '亿';
  } else if (value >= 10000) {
    return (value / 10000).toFixed(2) + '万';
  }
  return Math.floor(value).toLocaleString();
}

// 获取收益数据
async function fetchProfitData() {
  loading.value = true
  try {
    const data = await loyaltyApi.getProfitData(
      currentPage.value,
      pageSize.value,
      filters.value
    )
    profitData.value = data.data
    total.value = data.pagination.totalItems
  } catch (error) {
    console.error('获取收益数据失败:', error)
    ElMessage.error('获取收益数据失败')
  } finally {
    loading.value = false
  }
}

// 清理并计算所有LP收益
async function calculateProfit() {
  if (!filters.value.corporationId) {
    ElMessage.warning('请先选择公司')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要清理并重新计算公司 ${filters.value.corporationId} 的所有LP收益吗？这可能需要一些时间。`,
      '计算确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    loading.value = true
    // 只调用一次API，后端会自动处理所有数据源
    const res = await loyaltyApi.cleanAndRecalculateProfit(filters.value.corporationId)
    
    // 显示成功消息
    ElMessage.success('收益计算任务已启动，将同时处理所有数据源')
    
    // 计算完成后刷新数据（使用当前选择的数据源）
    setTimeout(() => {
      fetchProfitData()
    }, 2000) // 延迟2秒，给后台一些处理时间
  } catch (error) {
    if (error?.response?.status === 429) {
      // 冷却中提示
      const msg = error.response.data?.message || '收益计算冷却中，请稍后再试'
      ElMessage.warning(msg)
    } else if (error !== 'cancel') {
      console.error('清理并计算LP收益失败:', error)
      ElMessage.error('清理并计算LP收益失败')
    }
  } finally {
    loading.value = false
  }
}

// 分页处理
function handleSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1 // 重置到第一页
  fetchProfitData()
}

function handleCurrentChange(page) {
  currentPage.value = page
  fetchProfitData()
}

// 格式化 ISK (用于订单详情)
const formatISK = (value) => {
  if (value === null || value === undefined) return '0.00'
  const num = Number(value)
  if (num >= 100000000) {
    return (num / 100000000).toFixed(2) + '亿'
  } else if (num >= 10000) {
    return (num / 10000).toFixed(2) + '万'
  }
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// 显示物品详情弹窗
async function showTypeDetails(id) {
  typeDialogVisible.value = true
  loadingType.value = true
  selectedTypeData.value = null
  
  try {
    const response = await typeApi.getTypeById(id)
    selectedTypeData.value = response
  } catch (error) {
    console.error('获取物品详情失败:', error)
    ElMessage.error('获取物品详情失败')
  } finally {
    loadingType.value = false
  }
}

// 显示订单详情
async function showOrderDetails(row) {
  selectedOrderData.value = row
  orderDialogVisible.value = true
  queryingOrders.value = true
  buyOrders.value = []
  sellOrders.value = []
  
  try {
    const response = await orderApi.getOrders({
      regionId: row.region_id || filters.value.regionId,
      typeId: row.type_id,
      datasource: filters.value.datasource
    })
    buyOrders.value = response.buyOrders.data || []
    sellOrders.value = response.sellOrders.data || []
  } catch (error) {
    console.error('获取订单详情失败:', error)
    ElMessage.error('获取订单详情失败')
  } finally {
    queryingOrders.value = false
  }
}

// 组件挂载时获取数据
onMounted(() => {
  fetchProfitData()
})

// 获取空间站名称
async function fetchStationName(stationId, ds) {
  if (loadingStation.value === stationId) return
  loadingStation.value = stationId
  stationAttempted.value = { ...stationAttempted.value, [stationId]: true }
  try {
    const res = await stationApi.getStation(stationId, ds || selectedOrderData.value?.datasource || filters.value.datasource)
    if (res.data?.data?.name) {
      stationNames.value = {
        ...stationNames.value,
        [stationId]: { cn: res.data.data.name, en: res.data.data.name_en || null }
      }
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
</script>

<style scoped>
.profit-data {
  padding: 20px;
  width: 100%;
  overflow-x: auto;
}

.profit-data >>> .el-main {
  padding: 0;
}

.profit-data >>> .el-card {
  margin: 0;
}

.profit-data >>> .el-table {
  width: 100% !important;
  table-layout: auto !important;
}

.profit-data >>> .el-table__header,
.profit-data >>> .el-table__body {
  width: 100% !important;
}

.profit-data >>> .el-table__row {
  width: 100% !important;
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

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.unique-icon {
  color: #f56c6c !important;
  font-size: 16px;
  margin-left: 5px;
  vertical-align: middle;
}

.updated-at-text {
  font-size: 12px;
  color: #909399;
}

/* 每LP收益标签样式增强 */
.lp-profit-tag {
  font-size: 14px !important;
  font-weight: bold !important;
  padding: 6px 14px !important;
  border-radius: 6px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
  transition: all 0.3s ease !important;
}

.lp-profit-tag:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
}

.lp-profit-tag.profit-positive {
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.25), rgba(103, 194, 58, 0.1)) !important;
  border-color: #67c23a !important;
  color: #67c23a !important;
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.3) !important;
}

.lp-profit-tag.profit-negative {
  background: linear-gradient(135deg, rgba(245, 108, 108, 0.25), rgba(245, 108, 108, 0.1)) !important;
  border-color: #f56c6c !important;
  color: #f56c6c !important;
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.3) !important;
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

.dark-dialog-content {
  color: #e5eaf3;
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

/* 物品详情弹窗样式 */
:deep(.dark-descriptions) {
  background-color: transparent;
}

:deep(.dark-descriptions) .el-descriptions__body {
  background-color: transparent !important;
}

:deep(.dark-descriptions) .el-descriptions__label {
  color: #a3a6ad;
  font-weight: bold;
}

:deep(.dark-descriptions) .el-descriptions__content {
  color: #e5eaf3;
}

/* 深色主题 filter 区域样式 — 通过 CSS 变量全局覆盖 */
:deep(.el-card) {
  background-color: #1a1a2e;
  border-color: #36364a;
}

:deep(.el-card__header) {
  background-color: #1a1a2e;
  border-bottom: 1px solid #36364a;
  color: #e5eaf3;
}

:deep(.el-card__body) {
  background-color: #1a1a2e;
  color: #e5eaf3;
}

/* 通过 CSS 变量覆盖 Element Plus 主题色 */
.filters {
  display: flex;
  align-items: center;
  --el-fill-color: #242736;
  --el-fill-color-light: #242736;
  --el-fill-color-lighter: #242736;
  --el-fill-color-blank: #242736;
  --el-input-bg-color: #242736;
  --el-input-hover-border-color: #409eff;
  --el-input-border-color: #36364a;
  --el-input-focus-border-color: #409eff;
  --el-select-input-focus-bg-color: #242736;
  --el-text-color-placeholder: #6b7280;
  --el-border-color: #36364a;
  --el-border-color-hover: #409eff;
}

/* 选择器/输入框深色样式 */
:deep(.el-select) {
  --el-select-input-focus-bg-color: #242736;
}
:deep(.el-select .el-input__wrapper) {
  background-color: #242736 !important;
  box-shadow: 0 0 0 1px #36364a inset !important;
}
:deep(.el-select .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #409eff inset !important;
}
:deep(.el-select .el-input__inner) {
  color: #e5eaf3 !important;
}
:deep(.el-select .el-select__caret) {
  color: #94a3b8 !important;
}
:deep(.el-select .el-select__placeholder) {
  color: #e5eaf3 !important;
}
:deep(.el-select-dropdown) {
  background-color: #1d1e1f !important;
  border: 1px solid #36364a !important;
  --el-fill-color: transparent;
}
:deep(.el-select-dropdown__item) {
  color: #e5eaf3 !important;
}
:deep(.el-select-dropdown__item.hover) {
  background-color: #2a2d3d !important;
}
:deep(.el-select-dropdown__item.selected) {
  color: #409eff !important;
  background-color: #2a2d3d !important;
}

/* 输入框深色样式 */
:deep(.el-input__wrapper) {
  background-color: #242736 !important;
  box-shadow: 0 0 0 1px #36364a inset !important;
}
:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #409eff inset !important;
}
:deep(.el-input__inner) {
  color: #e5eaf3 !important;
}
:deep(.el-input__inner::placeholder) {
  color: #6b7280 !important;
}
:deep(.el-input__clear) {
  color: #94a3b8 !important;
}
:deep(.el-input-group__append) {
  background-color: #242736 !important;
  border-color: #36364a !important;
  color: #cbd5e1 !important;
}

/* 分页深色样式 */
:deep(.el-pagination) {
  color: #cbd5e1 !important;
}

:deep(.el-pagination button) {
  background-color: transparent !important;
  color: #cbd5e1 !important;
}

:deep(.el-pagination button:disabled) {
  color: #6b7280 !important;
}

:deep(.el-pager li) {
  background-color: transparent !important;
  color: #cbd5e1 !important;
}

:deep(.el-pager li.active) {
  color: #409eff !important;
}

:deep(.el-pagination .el-select .el-input__wrapper) {
  background-color: #242736 !important;
}

:deep(.el-pagination .el-select .el-input__inner) {
  color: #e5eaf3 !important;
}

/* 按钮样式优化 */
:deep(.el-button--primary) {
  background-color: #409eff;
  border-color: #409eff;
}

:deep(.el-button--success) {
  background-color: #67c23a;
  border-color: #67c23a;
}

/* 表格深色样式 */
:deep(.el-table) {
  background-color: transparent !important;
  color: #cbd5e1 !important;
}

:deep(.el-table__header th) {
  background-color: #242736 !important;
  color: #94a3b8 !important;
}

:deep(.el-table__row) {
  background-color: transparent !important;
}

:deep(.el-table__row:hover > td) {
  background-color: #2a2d3d !important;
}

:deep(.el-table td) {
  border-bottom: 1px solid #36364a !important;
}

:deep(.el-table__body tr:hover > td) {
  background-color: #2a2d3d !important;
}

:deep(.el-table th.el-table__cell) {
  background-color: #242736 !important;
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