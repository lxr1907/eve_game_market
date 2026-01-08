<template>
  <div class="online-player-stats">
    <el-card shadow="hover" class="stats-card">
      <template #header>
        <div class="card-header">
          <span>在线玩家统计</span>
          <el-button type="primary" size="small" @click="fetchStats">
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="statsData" style="width: 100%">
        <el-table-column prop="recorded_at" label="记录时间" width="180">
          <template #default="scope">
            {{ formatDateTime(scope.row.recorded_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="players" label="在线玩家数" width="120" align="right" />
        <el-table-column prop="server_version" label="服务器版本" width="180" />
        <el-table-column prop="vip" label="VIP模式" width="80" align="center">
          <template #default="scope">
            <el-tag type="success" v-if="scope.row.vip">是</el-tag>
            <el-tag type="info" v-else>否</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="start_time" label="数据开始时间" width="180">
          <template #default="scope">
            {{ formatDateTime(scope.row.start_time) }}
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination" v-if="total > 0">
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import axios from 'axios'

// 状态管理
const loading = ref(false)
const statsData = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

// 格式化日期时间
const formatDateTime = (datetime) => {
  if (!datetime) return ''
  const date = new Date(datetime)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 获取统计数据
const fetchStats = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/online-player-stats', {
      params: {
        page: currentPage.value,
        limit: pageSize.value
      }
    })
    statsData.value = response.data.data
    total.value = response.data.pagination.total
  } catch (error) {
    console.error('获取在线玩家统计失败:', error)
    ElMessage.error('获取在线玩家统计失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 分页处理
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchStats()
}

const handleCurrentChange = (current) => {
  currentPage.value = current
  fetchStats()
}

// 组件挂载时获取数据
onMounted(() => {
  fetchStats()
})
</script>

<style scoped>
.online-player-stats {
  padding: 20px;
}

.stats-card {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>