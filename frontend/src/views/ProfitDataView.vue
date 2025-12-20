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
                <el-button type="primary" @click="fetchProfitData">
                  <el-icon><Search /></el-icon>
                  查询
                </el-button>
              </div>
            </div>
          </template>
          
          <!-- 数据表格 -->
          <el-table
            v-loading="loading"
            :data="profitData"
            style="width: 100%"
            stripe
          >
            <el-table-column prop="type_id" label="物品类型ID" width="120" />
            <el-table-column label="物品名称" min-width="250">
              <template #default="scope">
                <div class="item-name-container">
                  <span>{{ scope.row.type_name }}</span>
                  <el-tag type="info" size="small" style="margin-left: 10px">每LP: {{ formatNumber(scope.row.profit_per_lp) }}</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="corporation_id" label="公司ID" width="120" />
            <el-table-column prop="region_id" label="区域ID" width="120" />
            <el-table-column prop="lp_cost" label="LP成本" width="100" :formatter="formatNumber" />
            <el-table-column prop="isk_cost" label="ISK成本" width="120" :formatter="formatNumber" />
            <el-table-column prop="sell_price" label="售价" width="120" :formatter="formatNumber" />
            <el-table-column prop="quantity" label="数量" width="80" :formatter="formatNumber" />
            <el-table-column prop="total_profit" label="总收益" width="120" :formatter="formatNumber" />
            <el-table-column prop="updated_at" label="更新时间" width="180" :formatter="formatDate" />
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
    </el-main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { loyaltyApi } from '../services/api'

// 数据
const profitData = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 过滤器
const filters = ref({
  corporationId: 1000180, // 默认公司ID
  regionId: 10000002      // 默认区域ID
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
  { id: 10000002, name: '加达里首星' },
  // 可以根据需要添加更多区域
])

// 格式化日期
const formatDate = (row, column, cellValue) => {
  if (!cellValue) return ''
  const date = new Date(cellValue)
  return date.toLocaleString()
}

// 格式化数字，只保留整数部分
const formatNumber = (row, column, cellValue) => {
  // 处理直接调用的情况（如在物品名称列中）
  if (column === undefined && cellValue === undefined) {
    // 直接调用：formatNumber(value)
    return Math.floor(row)
  }
  // 处理表格列格式化的情况：formatNumber(row, column, cellValue)
  if (cellValue === null || cellValue === undefined) return ''
  return Math.floor(cellValue)
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

// 组件挂载时获取数据
onMounted(() => {
  fetchProfitData()
})
</script>

<style scoped>
.profit-data {
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

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>