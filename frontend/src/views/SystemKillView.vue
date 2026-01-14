<template>
  <div class="system-kill">
    <el-main>
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>星系击毁统计</span>
              <el-button type="primary" @click="syncSystemKills">
                <el-icon><RefreshRight /></el-icon>
                同步击毁统计数据
              </el-button>
            </div>
          </template>
          
          <!-- 搜索和筛选 -->
          <div class="search-bar">
            <el-select
              v-model="selectedDatasource"
              placeholder="选择数据源"
              style="width: 150px; margin-right: 10px"
              @change="handleSearch"
            >
              <el-option label="晨曦 (Serenity)" value="serenity" />
              <el-option label="曙光 (Infinity)" value="infinity" />
              <el-option label="欧服 (Tranquility)" value="tranquility" />
            </el-select>
            <el-select
              v-model="securityStatusFilter"
              placeholder="安全状态过滤"
              style="width: 150px; margin-right: 10px"
              @change="handleSearch"
              clearable
            >
              <el-option label="高安 (>0.5)" value="high" />
              <el-option label="低安 (0~0.5)" value="low" />
              <el-option label="00 (<=0)" value="nullsec" />
            </el-select>
            <el-input
              v-model="searchQuery"
              placeholder="搜索星系ID或名称"
              clearable
              style="width: 300px; margin-right: 10px"
              @keyup.enter="handleSearch"
            >
              <template #append>
                <el-button icon="Search" @click="handleSearch" />
              </template>
            </el-input>
          </div>
          
          <!-- 数据表格 -->
          <el-table
            v-loading="loading"
            :data="systemKills"
            style="width: 100%"
            @sort-change="handleSortChange"
          >
            <el-table-column prop="system_id" label="星系ID" width="120" />
            <el-table-column prop="system_name" label="星系名称" min-width="200" />
            <el-table-column prop="security_status" label="安全状态" width="100" sortable="custom">
              <template #header>
                <span>安全状态 <el-icon v-if="sortBy === 'security_status'" :class="{ 'sort-desc': sortOrder === 'descending', 'sort-asc': sortOrder === 'ascending' }"><ArrowDown /></el-icon></span>
              </template>
              <template #default="scope">
                {{ scope.row.security_status !== null ? scope.row.security_status.toFixed(2) : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="npc_kills" label="NPC击杀" width="100" align="right" sortable="custom">
              <template #header>
                <span>NPC击杀 <el-icon v-if="sortBy === 'npc_kills'" :class="{ 'sort-desc': sortOrder === 'descending', 'sort-asc': sortOrder === 'ascending' }"><ArrowDown /></el-icon></span>
              </template>
            </el-table-column>
            <el-table-column prop="pod_kills" label="玩家舱击杀" width="120" align="right" sortable="custom">
              <template #header>
                <span>玩家舱击杀 <el-icon v-if="sortBy === 'pod_kills'" :class="{ 'sort-desc': sortOrder === 'descending', 'sort-asc': sortOrder === 'ascending' }"><ArrowDown /></el-icon></span>
              </template>
            </el-table-column>
            <el-table-column prop="ship_kills" label="舰船击杀" width="100" align="right" sortable="custom">
              <template #header>
                <span>舰船击杀 <el-icon v-if="sortBy === 'ship_kills'" :class="{ 'sort-desc': sortOrder === 'descending', 'sort-asc': sortOrder === 'ascending' }"><ArrowDown /></el-icon></span>
              </template>
            </el-table-column>
            <el-table-column prop="timestamp" label="更新时间" width="180">
              <template #default="scope">
                {{ formatDate(scope.row.timestamp) }}
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
    </el-main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { RefreshRight, Search, ArrowDown } from '@element-plus/icons-vue'
import { systemKillApi } from '../services/api'

// 数据
const systemKills = ref([])
const loading = ref(false)
const total = ref(0)

// 分页
const currentPage = ref(1)
const pageSize = ref(10)

// 搜索和筛选
const searchQuery = ref('')
const selectedDatasource = ref('serenity')
const securityStatusFilter = ref('')

// 排序
const sortBy = ref('ship_kills')
const sortOrder = ref('descending')

// 加载数据
const loadSystemKills = async () => {
  loading.value = true
  try {
    const response = await systemKillApi.getSystemKills(
      currentPage.value, 
      pageSize.value, 
      selectedDatasource.value, 
      searchQuery.value,
      sortBy.value,
      sortOrder.value,
      securityStatusFilter.value
    )
    systemKills.value = response.system_kills
    total.value = response.pagination.total
  } catch (error) {
    ElMessage.error('加载星系击毁数据失败')
    console.error('Error loading system kills:', error)
  } finally {
    loading.value = false
  }
}

// 同步击毁数据
const syncSystemKills = async () => {
  loading.value = true
  try {
    await systemKillApi.syncSystemKills()
    ElMessage.success('星系击毁数据同步任务已开始，将在后台执行')
    // 不需要立即刷新，因为数据同步是异步的
  } catch (error) {
    ElMessage.error('星系击毁数据同步任务启动失败')
    console.error('Error starting sync system kills:', error)
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  loadSystemKills()
}

// 分页处理
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  loadSystemKills()
}

const handleCurrentChange = (page) => {
  currentPage.value = page
  loadSystemKills()
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 处理排序变化
const handleSortChange = ({ prop, order }) => {
  if (!prop || !order) return
  
  sortBy.value = prop
  sortOrder.value = order === 'descending' ? 'descending' : 'ascending'
  
  // 重新加载数据
  currentPage.value = 1
  loadSystemKills()
}

// 初始加载
onMounted(() => {
  loadSystemKills()
})
</script>

<style scoped>
.system-kill {
  min-height: 100vh;
  background-color: transparent;
}

.el-header {
  background-color: #409eff;
  color: white;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.el-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.el-main {
  padding: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.search-bar {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

/* 移除表格行的悬浮特殊样式 */
:deep(.el-table__row) {
  transition: none;
}

:deep(.el-table__row:hover) {
  background-color: transparent !important;
}

.sort-desc {
  transform: rotate(180deg);
}

.sort-asc {
  transform: rotate(0deg);
}

.sort-desc, .sort-asc {
  transition: transform 0.2s ease;
}
</style>