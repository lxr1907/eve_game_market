<template>
  <div class="loyalty-offers">
    <el-main>
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>忠诚度商店商品</span>
              <div class="sync-controls">
                <el-input
                  v-model="searchKeyword"
                  placeholder="搜索物品名称"
                  class="input-white"
                  style="width: 200px; margin-right: 10px"
                  @keyup.enter="fetchLoyaltyOffers"
                >
                  <template #append>
                    <el-icon @click="fetchLoyaltyOffers"><Search /></el-icon>
                  </template>
                </el-input>
                <el-select
                  v-model="selectedCorporationId"
                  placeholder="选择公司"
                  style="width: 200px; margin-right: 10px"
                  @change="fetchLoyaltyOffers"
                >
                  <el-option
                    v-for="corp in corporations"
                    :key="corp.id"
                    :label="corp.name"
                    :value="corp.id"
                  />
                </el-select>

                <el-button type="primary" @click="syncLoyaltyOffers">
                  <el-icon><RefreshRight /></el-icon>
                  同步数据
                </el-button>

                <el-button type="warning" @click="syncAllLoyaltyOffers">
                  <el-icon><RefreshRight /></el-icon>
                  同步所有数据源
                </el-button>

              </div>
            </div>
          </template>
          
          <!-- 数据表格 -->
          <el-table
            v-loading="loading"
            :data="loyaltyOffers"
            style="width: 100%"
          >
            <el-table-column label="公司" width="180">
              <template #default="scope">
                {{ getCorporationName(scope.row.corporation_id) }} ({{ scope.row.corporation_id }})
              </template>
            </el-table-column>
            <el-table-column label="物品" min-width="300">
              <template #default="scope">
                <div class="item-name-container">
                  <span v-if="scope.row.type_name">
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
                  </span>
                  <el-button v-else type="warning" size="small" @click="syncOneType(scope.row.type_id, scope.row.datasource)">
                    同步 {{ scope.row.type_id }}
                  </el-button>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="quantity" label="数量" width="100" />
            <el-table-column label="LP成本" width="120">
              <template #default="scope">
                {{ formatCost(scope.row.lp_cost) }}
              </template>
            </el-table-column>
            <el-table-column label="ISK成本" width="140">
              <template #default="scope">
                {{ formatCost(scope.row.isk_cost) }}
              </template>
            </el-table-column>
            <el-table-column label="所需物品" min-width="250">
              <template #default="scope">
                <el-tag v-if="!scope.row.required_items || scope.row.required_items.length === 0" class="tag-dark">
                  无
                </el-tag>
                <div v-else>
                  <div v-for="(item, index) in scope.row.required_items" :key="index" class="required-item">
                    <el-tag class="tag-dark" size="small">
                      {{ item.type_name || `物品${item.type_id}` }} ({{ item.type_id }}), x{{ item.quantity }}
                    </el-tag>
                  </div>
                </div>
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
                  <el-table-column prop="location_id" label="位置 ID" width="100" />
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
                  <el-table-column prop="location_id" label="位置 ID" width="100" />
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

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { RefreshRight, CirclePlus, Search, Warning, Top, Bottom } from '@element-plus/icons-vue'
import { loyaltyApi, typeApi, orderApi } from '../services/api'

const router = useRouter()

// 数据
const loyaltyOffers = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const searchKeyword = ref('')

// 订单弹窗数据
const orderDialogVisible = ref(false)
const selectedOrderData = ref(null)
const queryingOrders = ref(false)
const buyOrders = ref([])
const sellOrders = ref([])

// 物品详情弹窗数据
const typeDialogVisible = ref(false)
const selectedTypeData = ref(null)
const loadingType = ref(false)

// 公司选择器
const selectedCorporationId = ref(1000180) // 默认公司ID
const corporations = ref([
  { id: 1000436, name: '天使-摩拉辛狂热者' },
  { id: 1000437, name: '古斯塔斯-古力突击队' },
  { id: 1000181, name: '盖伦特-联邦防务联合会' },
  { id: 1000179, name: '艾玛-帝国科洛斯第二十四军团' },
  { id: 1000180, name: '加达里-合众国护卫军' },
  { id: 1000182, name: '米玛塔尔-部族解放力量' }
])

// 获取忠诚度商店商品
async function fetchLoyaltyOffers() {
  loading.value = true
  try {
    const data = await loyaltyApi.getLoyaltyOffers(
      currentPage.value,
      pageSize.value,
      selectedCorporationId.value,
      searchKeyword.value
    )
    loyaltyOffers.value = data.data
    total.value = data.pagination.totalItems
  } catch (error) {
    console.error('获取忠诚度商店商品失败:', error)
    ElMessage.error('获取忠诚度商店商品失败')
  } finally {
    loading.value = false
  }
}

// 同步忠诚度商店商品
async function syncLoyaltyOffers() {
  if (!selectedCorporationId.value) {
    ElMessage.warning('请先选择公司')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要同步公司 ${selectedCorporationId.value} 的忠诚度商店商品吗？`,
      '同步确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loading.value = true
    const response = await loyaltyApi.syncLoyaltyOffers(selectedCorporationId.value)
    ElMessage.success(response.message)

    // 同步完成后刷新数据
    setTimeout(() => {
      fetchLoyaltyOffers()
    }, 2000) // 延迟2秒，给后台一些处理时间
  } catch (error) {
    if (error !== 'cancel') {
      console.error('同步忠诚度商店商品失败:', error)
      ElMessage.error('同步忠诚度商店商品失败')
    }
  } finally {
    loading.value = false
  }
}

// 同步所有数据源的忠诚度商店商品
async function syncAllLoyaltyOffers() {
  try {
    await ElMessageBox.confirm(
      '此操作将同步所有数据源（晨曦、曙光、欧服）的忠诚度商店商品，可能需要较长时间，是否继续？',
      '同步所有数据源',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loading.value = true
    const response = await loyaltyApi.syncAllLoyaltyOffers()
    ElMessage.success(response.data?.message || response.message || '同步任务已开始')

    // 延迟刷新数据
    setTimeout(() => {
      fetchLoyaltyOffers()
    }, 3000)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('同步所有数据源失败:', error)
      ElMessage.error('同步所有数据源失败')
    }
  } finally {
    loading.value = false
  }
}

// 同步单个Type详情
async function syncOneType(typeId, datasource) {
  try {
    loading.value = true
    await typeApi.syncOneType(typeId, datasource)
    ElMessage.success(`物品 ${typeId} 同步成功`)

    // 延迟刷新数据
    setTimeout(() => {
      fetchLoyaltyOffers()
    }, 1000)
  } catch (error) {
    console.error('同步单个Type失败:', error)
    ElMessage.error(`同步物品 ${typeId} 失败`)
  } finally {
    loading.value = false
  }
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
      regionId: 10000002, // 默认伏尔戈星域
      typeId: row.type_id,
      datasource: row.datasource || 'serenity'
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

// 获取公司名称
function getCorporationName(id) {
  const corp = corporations.value.find(c => c.id === id)
  return corp ? corp.name : `公司${id}`
}

// 格式化成本显示
function formatCost(value) {
  if (value === null || value === undefined) return '-'
  if (value >= 10000000) {
    return (value / 10000).toFixed(0) + 'KW'
  } else if (value >= 10000) {
    return (value / 10000).toFixed(1) + 'W'
  }
  return value.toLocaleString()
}

// 格式化 ISK
function formatISK(value) {
  if (value === null || value === undefined) return '0.00'
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// 格式化数字
function formatNumber(value) {
  if (value === null || value === undefined) return '-'
  return Number(value).toLocaleString('zh-CN')
}

// 格式化日期
function formatDate(dateString) {
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


// 分页处理
function handleSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
  fetchLoyaltyOffers()
}

function handleCurrentChange(page) {
  currentPage.value = page
  fetchLoyaltyOffers()
}

// 页面加载时获取数据
onMounted(() => {
  fetchLoyaltyOffers()
})
</script>

<style scoped>
.loyalty-offers {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sync-controls {
  display: flex;
  align-items: center;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

.required-item {
  margin-bottom: 5px;
}

.item-name-container {
  display: flex;
  align-items: center;
}

:deep(.tag-dark) {
  background-color: #333;
  color: #fff;
  border-color: #444;
}

:deep(.input-white .el-input__wrapper) {
  background-color: #333;
  box-shadow: 0 0 0 1px #444 inset;
}

:deep(.input-white .el-input__inner) {
  color: #fff;
}

:deep(.input-white .el-input__inner::placeholder) {
  color: #999;
}

:deep(.input-white .el-input-group__append) {
  background-color: #444;
  color: #fff;
  border-color: #444;
}

/* 弹窗样式 */
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
</style>
