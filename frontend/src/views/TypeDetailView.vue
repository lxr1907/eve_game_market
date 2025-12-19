<template>
  <div class="type-detail">
    <el-main>
        <el-card shadow="hover" v-loading="loading">
          <template #header>
            <div class="card-header">
              <span>{{ type.name || 'Type详情' }}</span>
              <div>
                <el-button type="success" @click="updateTask(type)">
                  <el-icon><Check /></el-icon>
                  更新任务
                </el-button>
                <el-button type="primary" @click="$router.back()">
                  <el-icon><ArrowLeft /></el-icon>
                  返回列表
                </el-button>
              </div>
            </div>
          </template>
          
          <div v-if="type" class="type-info">
            <el-descriptions border :column="2">
              <el-descriptions-item label="ID">{{ type.id }}</el-descriptions-item>
              <el-descriptions-item label="名称">{{ type.name }}</el-descriptions-item>
              <el-descriptions-item label="组ID">{{ type.group_id }}</el-descriptions-item>
              <el-descriptions-item label="分类ID">{{ type.category_id }}</el-descriptions-item>
              <el-descriptions-item label="质量">{{ type.mass }}</el-descriptions-item>
              <el-descriptions-item label="体积">{{ type.volume }}</el-descriptions-item>
              <el-descriptions-item label="容量">{{ type.capacity }}</el-descriptions-item>
              <el-descriptions-item label="描述">{{ type.description }}</el-descriptions-item>
              <el-descriptions-item label="发布状态">
                <el-tag :type="type.published ? 'success' : 'info'">
                  {{ type.published ? '已发布' : '未发布' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="半径">{{ type.radius }}</el-descriptions-item>
              <el-descriptions-item label="图形ID">{{ type.graphic_id }}</el-descriptions-item>
              <el-descriptions-item label="图标ID">{{ type.icon_id }}</el-descriptions-item>
              <el-descriptions-item label="市场组ID">{{ type.market_group_id }}</el-descriptions-item>
              <el-descriptions-item label="蓝图制造时间(秒)">{{ type.portion_size }}</el-descriptions-item>
            </el-descriptions>
          </div>
          <div v-else class="empty">
            <el-empty description="未找到Type数据" />
          </div>
        </el-card>
      </el-main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Check } from '@element-plus/icons-vue'
import { typeApi } from '../services/api'

const route = useRoute()
const router = useRouter()

// 数据
const type = ref({})
const loading = ref(false)

// 加载Type详情
const loadTypeDetail = async () => {
  loading.value = true
  try {
    const id = route.params.id
    type.value = await typeApi.getTypeById(id)
  } catch (error) {
    ElMessage.error('加载Type详情失败')
    console.error('Error loading type detail:', error)
  } finally {
    loading.value = false
  }
}



// 更新任务状态
const updateTask = async (type) => {
  try {
    // 弹出确认对话框
    await ElMessageBox.confirm('确定要更新这个任务吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    // 调用API更新状态
    await typeApi.updateStatus(type.id, 'in_progress')
    
    ElMessage.success('任务更新成功')
    
    // 重新加载数据
    loadTypeDetail()
  } catch (error) {
    if (error === 'cancel') {
      // 用户取消了操作
      return
    }
    ElMessage.error('任务更新失败')
    console.error('Error updating task:', error)
  }
}

// 初始加载
onMounted(() => {
  loadTypeDetail()
})
</script>

<style scoped>
.type-detail {
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

.type-info {
  margin-top: 20px;
}

.empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}
</style>