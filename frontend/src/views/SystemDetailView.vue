<template>
  <div class="system-detail">
    <el-main>
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>System信息</span>
              <div>
                <el-button type="primary" @click="goBack">
                  <el-icon><Back /></el-icon>
                  返回列表
                </el-button>
              </div>
            </div>
          </template>
          
          <div v-loading="loading" class="detail-content">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="系统ID">{{ system.system_id }}</el-descriptions-item>
              <el-descriptions-item label="名称">{{ system.name }}</el-descriptions-item>
              <el-descriptions-item label="星座ID">{{ system.constellation_id }}</el-descriptions-item>
              <el-descriptions-item label="安全等级">
                <el-tag :type="getSecurityStatusType(system.security_status)">
                  {{ system.security_status ? system.security_status.toFixed(2) : '未知' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="位置坐标" :span="2">
                <div class="position-content">
                  <div>X: {{ formatCoordinate(system.position_x) }}</div>
                  <div>Y: {{ formatCoordinate(system.position_y) }}</div>
                  <div>Z: {{ formatCoordinate(system.position_z) }}</div>
                </div>
              </el-descriptions-item>
              <el-descriptions-item label="创建时间" :span="2">
                <el-tag type="info">{{ formatDate(system.created_at) }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="更新时间" :span="2">
                <el-tag type="warning">{{ formatDate(system.updated_at) }}</el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>
      </el-main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back } from '@element-plus/icons-vue'
import { systemApi } from '../services/api'

const router = useRouter()
const route = useRoute()

// 数据
const system = ref({
  system_id: null,
  constellation_id: null,
  name: '',
  position_x: null,
  position_y: null,
  position_z: null,
  security_status: null,
  created_at: null,
  updated_at: null
})
const loading = ref(false)

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

// 格式化坐标
const formatCoordinate = (coordinate) => {
  if (coordinate === null || coordinate === undefined) return '未知'
  const num = parseFloat(coordinate)
  return num.toExponential(2)
}

// 根据安全等级获取标签类型
const getSecurityStatusType = (securityStatus) => {
  if (securityStatus === null || securityStatus === undefined) return 'info'
  if (securityStatus > 0.5) return 'success'
  if (securityStatus > 0) return 'warning'
  return 'danger'
}

// 加载系统详情
const loadSystemDetail = async () => {
  const systemId = route.params.id
  if (!systemId) {
    ElMessage.error('未找到System ID')
    router.push('/systems')
    return
  }
  
  loading.value = true
  try {
    const data = await systemApi.getSystemById(systemId)
    system.value = data
  } catch (error) {
    ElMessage.error('加载System详情失败')
    console.error('Error loading system detail:', error)
    router.push('/systems')
  } finally {
    loading.value = false
  }
}

// 返回列表
const goBack = () => {
  router.push('/systems')
}



// 初始加载
onMounted(() => {
  loadSystemDetail()
})
</script>

<style scoped>
.system-detail {
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

.detail-content {
  margin-top: 20px;
}

.position-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
