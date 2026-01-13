<template>
  <div class="system-list">
    <el-main>
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>System数据列表</span>
              <el-button type="primary" @click="syncSystemIds" style="margin-right: 10px;">
                <el-icon><RefreshRight /></el-icon>
                同步System IDs
              </el-button>
              <el-button type="success" @click="syncSystemDetails" style="margin-right: 10px;">
                <el-icon><RefreshRight /></el-icon>
                同步System详情
              </el-button>
              <el-button type="warning" @click="syncAllSystems">
                <el-icon><RefreshRight /></el-icon>
                同步所有System数据
              </el-button>
            </div>
          </template>
          
          <!-- 搜索和筛选 -->
          <div class="search-bar">
            <el-input
              v-model="searchQuery"
              placeholder="搜索System名称"
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
            :data="systems"
            style="width: 100%"
            @row-click="handleRowClick"
          >
            <el-table-column prop="system_id" label="系统ID" width="120" />
            <el-table-column prop="name" label="名称" min-width="200" />
            <el-table-column prop="constellation_id" label="星座ID" width="120" />
            <el-table-column prop="security_status" label="安全等级" width="120">
              <template #default="scope">
                {{ scope.row.security_status ? scope.row.security_status.toFixed(2) : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="创建时间" width="180" />
            <el-table-column prop="updated_at" label="更新时间" width="180" />
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="scope">
                <el-button
                  type="primary"
                  text
                  size="small"
                  @click.stop="viewSystem(scope.row.system_id)"
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
import { systemApi } from '../services/api'

const router = useRouter()

// 数据
const systems = ref([])
const loading = ref(false)
const total = ref(0)

// 分页
const currentPage = ref(1)
const pageSize = ref(10)

// 搜索
const searchQuery = ref('')

// 加载数据
const loadSystems = async () => {
  loading.value = true
  try {
    const response = await systemApi.getSystems(currentPage.value, pageSize.value, searchQuery.value)
    systems.value = response.systems
    total.value = response.pagination.total
  } catch (error) {
    ElMessage.error('加载System数据失败')
    console.error('Error loading systems:', error)
  } finally {
    loading.value = false
  }
}

// 同步System IDs
const syncSystemIds = async () => {
  loading.value = true
  try {
    await systemApi.syncSystemIds()
    ElMessage.success('System IDs同步任务已开始，将在后台执行')
  } catch (error) {
    ElMessage.error('System IDs同步任务启动失败')
    console.error('Error starting sync system IDs:', error)
  } finally {
    loading.value = false
  }
}

// 同步System详情
const syncSystemDetails = async () => {
  loading.value = true
  try {
    await systemApi.syncSystemDetails()
    ElMessage.success('System详情同步任务已开始，将在后台执行')
  } catch (error) {
    ElMessage.error('System详情同步任务启动失败')
    console.error('Error starting sync system details:', error)
  } finally {
    loading.value = false
  }
}

// 同步所有System数据
const syncAllSystems = async () => {
  loading.value = true
  try {
    await systemApi.syncAllSystems()
    ElMessage.success('所有System数据同步任务已开始，将在后台执行')
  } catch (error) {
    ElMessage.error('所有System数据同步任务启动失败')
    console.error('Error starting sync all systems:', error)
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  loadSystems()
}

// 分页处理
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  loadSystems()
}

const handleCurrentChange = (page) => {
  currentPage.value = page
  loadSystems()
}

// 查看详情
const viewSystem = (id) => {
  router.push(`/systems/${id}`)
}

// 行点击事件
const handleRowClick = (row) => {
  viewSystem(row.system_id)
}



// 初始加载
onMounted(() => {
  loadSystems()
})
</script>

<style scoped>
.system-list {
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
</style>
