<template>
  <div class="region-list">
    <el-main>
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>Region数据列表</span>
              <el-button type="primary" @click="syncRegionIds" style="margin-right: 10px;">
                <el-icon><RefreshRight /></el-icon>
                同步Region IDs
              </el-button>
              <el-button type="success" @click="syncRegionDetails" style="margin-right: 10px;">
                <el-icon><RefreshRight /></el-icon>
                同步Region详情
              </el-button>
              <el-button type="warning" @click="syncAllRegionTypes">
                <el-icon><RefreshRight /></el-icon>
                同步所有Region Types
              </el-button>
            </div>
          </template>
          
          <!-- 搜索和筛选 -->
          <div class="search-bar">
            <el-input
              v-model="searchQuery"
              placeholder="搜索Region名称"
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
            :data="regions"
            style="width: 100%"
            @row-click="handleRowClick"
          >
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="name" label="名称" min-width="200" />
            <el-table-column prop="description" label="描述" min-width="300" show-overflow-tooltip />
            <el-table-column prop="region_id" label="区域ID" width="100" />
            <el-table-column prop="created_at" label="创建时间" width="180" />
            <el-table-column prop="updated_at" label="更新时间" width="180" />
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="scope">
                <el-button
                  type="primary"
                  text
                  size="small"
                  @click.stop="viewRegion(scope.row.id)"
                >
                  查看
                </el-button>
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
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { RefreshRight, Search } from '@element-plus/icons-vue'
import { regionApi } from '../services/api'

const router = useRouter()

// 数据
const regions = ref([])
const loading = ref(false)
const total = ref(0)

// 分页
const currentPage = ref(1)
const pageSize = ref(10)

// 搜索
const searchQuery = ref('')

// 加载数据
const loadRegions = async () => {
  loading.value = true
  try {
    const response = await regionApi.getRegions(currentPage.value, pageSize.value, searchQuery.value)
    regions.value = response.regions
    total.value = response.pagination.total
  } catch (error) {
    ElMessage.error('加载Region数据失败')
    console.error('Error loading regions:', error)
  } finally {
    loading.value = false
  }
}

// 同步Region IDs
const syncRegionIds = async () => {
  loading.value = true
  try {
    await regionApi.syncRegionIds()
    ElMessage.success('Region IDs同步任务已开始，将在后台执行')
  } catch (error) {
    ElMessage.error('Region IDs同步任务启动失败')
    console.error('Error starting sync region IDs:', error)
  } finally {
    loading.value = false
  }
}

// 同步Region详情
const syncRegionDetails = async () => {
  loading.value = true
  try {
    await regionApi.syncRegionDetails()
    ElMessage.success('Region详情同步任务已开始，将在后台执行')
  } catch (error) {
    ElMessage.error('Region详情同步任务启动失败')
    console.error('Error starting sync region details:', error)
  } finally {
    loading.value = false
  }
}

// 同步所有Region Types
const syncAllRegionTypes = async () => {
  loading.value = true
  try {
    await regionApi.syncAllRegionTypes()
    ElMessage.success('所有Region Types同步任务已开始，将在后台执行')
  } catch (error) {
    ElMessage.error('所有Region Types同步任务启动失败')
    console.error('Error starting sync all region types:', error)
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  loadRegions()
}

// 分页处理
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  loadRegions()
}

const handleCurrentChange = (page) => {
  currentPage.value = page
  loadRegions()
}

// 查看详情
const viewRegion = (id) => {
  router.push(`/regions/${id}`)
}

// 行点击事件
const handleRowClick = (row) => {
  viewRegion(row.id)
}



// 初始加载
onMounted(() => {
  loadRegions()
})
</script>

<style scoped>
.region-list {
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
</style>