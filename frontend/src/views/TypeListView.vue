<template>
  <div class="type-list">
    <el-main>
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <div class="title-container">
                <span>Type数据列表</span>
                <el-tag type="info" size="small" style="margin-left: 10px;">
                  已同步数据总数: {{ typeCountWithNameNotNull }}
                </el-tag>
              </div>
              <div class="button-container">
                <el-button type="primary" @click="syncTypeIds" style="margin-right: 10px;">
                  <el-icon><RefreshRight /></el-icon>
                  同步Type IDs
                </el-button>
                <el-button type="success" @click="syncTypeDetails" style="margin-right: 10px;">
                  <el-icon><RefreshRight /></el-icon>
                  同步Type详情
                </el-button>
                <el-button type="warning" @click="syncAllGroupsFromTypes" style="margin-right: 10px;">
                  <el-icon><RefreshRight /></el-icon>
                  同步Group数据
                </el-button>
                <el-button type="info" @click="syncAllCategoriesFromGroups">
                  <el-icon><RefreshRight /></el-icon>
                  同步Category数据
                </el-button>
              </div>
            </div>
          </template>
          
          <!-- 搜索和筛选 -->
          <div class="search-bar">
            <el-input
              v-model="searchQuery"
              placeholder="搜索Type名称"
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
            :data="types"
            style="width: 100%"
            stripe
            @row-click="handleRowClick"
          >
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="name" label="名称" min-width="200" />
            <el-table-column prop="group_id" label="组ID" width="100" />
            <el-table-column prop="category_id" label="分类ID" width="120" />
            <el-table-column prop="mass" label="质量" width="100" />
            <el-table-column prop="volume" label="体积" width="100" />
            <el-table-column prop="published" label="发布状态" width="120">
              <template #default="scope">
                <el-tag :type="scope.row.published ? 'success' : 'info'">
                  {{ scope.row.published ? '已发布' : '未发布' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="scope">
                <el-button
                  type="primary"
                  text
                  size="small"
                  @click.stop="viewType(scope.row.id)"
                >
                  查看
                </el-button>
                <el-button
                  type="success"
                  text
                  size="small"
                  @click.stop="updateTask(scope.row)"
                >
                  更新任务
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
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { RefreshRight, Search } from '@element-plus/icons-vue'
import { typeApi, groupApi, categoryApi } from '../services/api'

const router = useRouter()

// 数据
const types = ref([])
const loading = ref(false)
const total = ref(0)
const typeCountWithNameNotNull = ref(0)

// 分页
const currentPage = ref(1)
const pageSize = ref(10)

// 搜索
const searchQuery = ref('')

// 加载数据
const loadTypes = async () => {
  loading.value = true
  try {
    const response = await typeApi.getTypes(
      currentPage.value,
      pageSize.value,
      searchQuery.value
    )
    types.value = response.types
    total.value = response.pagination.total
  } catch (error) {
    ElMessage.error('加载Type数据失败')
    console.error('Error loading types:', error)
  } finally {
    loading.value = false
  }
}

// 同步Type IDs
const syncTypeIds = async () => {
  loading.value = true
  try {
    await typeApi.syncTypeIds()
    ElMessage.success('Type IDs同步任务已开始，将在后台执行')
    // 不立即重新加载数据，因为同步在后台进行
  } catch (error) {
    ElMessage.error('Type IDs同步任务启动失败')
    console.error('Error starting sync type IDs:', error)
  } finally {
    loading.value = false
  }
}

// 同步Type详情
const syncTypeDetails = async () => {
  loading.value = true
  try {
    await typeApi.syncTypeDetails()
    ElMessage.success('Type详情同步任务已开始，将在后台执行')
    // 不立即重新加载数据，因为同步在后台进行
  } catch (error) {
    ElMessage.error('Type详情同步任务启动失败')
    console.error('Error starting sync type details:', error)
  } finally {
    loading.value = false
  }
}

// 同步Group数据
const syncAllGroupsFromTypes = async () => {
  loading.value = true
  try {
    await groupApi.syncAllGroupsFromTypes()
    ElMessage.success('Group数据同步任务已开始，将在后台执行')
    // 不立即重新加载数据，因为同步在后台进行
  } catch (error) {
    ElMessage.error('Group数据同步任务启动失败')
    console.error('Error starting sync group data:', error)
  } finally {
    loading.value = false
  }
}

// 同步Category数据
const syncAllCategoriesFromGroups = () => {
  loading.value = true
  // 改为异步执行，不等待API响应
  categoryApi.syncAllCategoriesFromGroups()
    .then(() => {
      ElMessage.success('Category数据同步任务已开始，将在后台执行')
    })
    .catch((error) => {
      ElMessage.error('Category数据同步任务启动失败')
      console.error('Error starting sync category data:', error)
    })
    .finally(() => {
      loading.value = false
    })
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  loadTypes()
}

// 分页处理
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  loadTypes()
}

const handleCurrentChange = (page) => {
  currentPage.value = page
  loadTypes()
}

// 查看详情
const viewType = (id) => {
  router.push(`/types/${id}`)
}

// 更新任务状态
const updateTask = async (row) => {
  try {
    // 弹出确认对话框
    await ElMessageBox.confirm('确定要更新这个任务吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    // 调用API更新状态
    await typeApi.updateStatus(row.id, 'in_progress')
    
    ElMessage.success('任务更新成功')
    
    // 重新加载数据
    loadTypes()
  } catch (error) {
    if (error === 'cancel') {
      // 用户取消了操作
      return
    }
    ElMessage.error('任务更新失败')
    console.error('Error updating task:', error)
  }
}

// 行点击事件
const handleRowClick = (row) => {
  viewType(row.id)
}



// 加载类型总数（name不为null）
const loadTypeCountWithNameNotNull = async () => {
  try {
    const response = await typeApi.getCountWithNameNotNull()
    typeCountWithNameNotNull.value = response.count
  } catch (error) {
    console.error('加载类型总数失败:', error)
  }
}

// 加载数据（包含列表和总数）
const loadAllData = async () => {
  await Promise.all([
    loadTypes(),
    loadTypeCountWithNameNotNull()
  ])
}

// 自动刷新定时器
let refreshTimer = null

// 开始自动刷新
const startAutoRefresh = () => {
  // 清除现有的定时器
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  // 设置新的定时器，每5秒刷新一次
  refreshTimer = setInterval(() => {
    loadAllData()
  }, 5000)
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// 初始加载
onMounted(() => {
  loadAllData()
  startAutoRefresh()
})

// 组件卸载时清除定时器
onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.type-list {
  min-height: 100vh;
  background-color: #f5f7fa;
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
  flex-wrap: wrap;
}

.title-container {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.button-container {
  display: flex;
  align-items: center;
}

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }
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
</style>