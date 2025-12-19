<template>
  <div class="region-detail">
    <el-container>
      <el-header>
        <el-menu :default-active="activeIndex" mode="horizontal" @select="handleSelect" style="width: 100%">
          <el-menu-item index="1">
            <el-icon><House /></el-icon>
            首页
          </el-menu-item>
          <el-menu-item index="2">
            <el-icon><Collection /></el-icon>
            Type列表
          </el-menu-item>
          <el-menu-item index="3">
            <el-icon><MapLocation /></el-icon>
            Region列表
          </el-menu-item>
        </el-menu>
      </el-header>
      <el-main>
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>Region信息</span>
              <el-button type="primary" @click="goBack">
                <el-icon><Back /></el-icon>
                返回列表
              </el-button>
            </div>
          </template>
          
          <div v-loading="loading" class="detail-content">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="ID">{{ region.id }}</el-descriptions-item>
              <el-descriptions-item label="名称">{{ region.name }}</el-descriptions-item>
              <el-descriptions-item label="描述">
                <div v-if="region.description" v-html="formatDescription(region.description)" class="description-content"></div>
                <span v-else>无描述信息</span>
              </el-descriptions-item>
              <el-descriptions-item label="区域ID">{{ region.region_id }}</el-descriptions-item>
              <el-descriptions-item label="创建时间" :span="2">
                <el-tag type="info">{{ formatDate(region.created_at) }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="更新时间" :span="2">
                <el-tag type="warning">{{ formatDate(region.updated_at) }}</el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { House, MapLocation, Collection, Back } from '@element-plus/icons-vue'
import { regionApi } from '../services/api'

const router = useRouter()
const route = useRoute()
const activeIndex = ref('3')

// 数据
const region = ref({
  id: null,
  name: '',
  description: '',
  region_id: null,
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

// 格式化描述
const formatDescription = (description) => {
  return description ? description.replace(/<br\s*\/?>/g, '\n').replace(/<\/?p>/g, '') : ''
}

// 加载区域详情
const loadRegionDetail = async () => {
  const regionId = route.params.id
  if (!regionId) {
    ElMessage.error('未找到Region ID')
    router.push('/regions')
    return
  }
  
  loading.value = true
  try {
    const data = await regionApi.getRegionById(regionId)
    region.value = data
  } catch (error) {
    ElMessage.error('加载Region详情失败')
    console.error('Error loading region detail:', error)
    router.push('/regions')
  } finally {
    loading.value = false
  }
}

// 返回列表
const goBack = () => {
  router.push('/regions')
}

// 菜单选择
const handleSelect = (key) => {
  if (key === '1') {
    router.push('/')
  } else if (key === '2') {
    router.push('/types')
  } else if (key === '3') {
    router.push('/regions')
  }
}

// 初始加载
onMounted(() => {
  loadRegionDetail()
})
</script>

<style scoped>
.region-detail {
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
}

.detail-content {
  margin-top: 20px;
}

.description-content {
  white-space: pre-wrap;
  line-height: 1.6;
}
</style>