<template>
  <div class="kb-ranking">
    <el-card shadow="hover" class="ranking-card">
      <template #header>
        <div class="card-header">
          <span>KB榜单</span>
          <div class="header-actions">
            <el-radio-group v-model="rankingType" @change="fetchRanking" size="small">
              <el-radio-button label="single">击毁榜</el-radio-button>
              <el-radio-button label="kills">角色击毁榜</el-radio-button>
              <el-radio-button label="losses">角色损失榜</el-radio-button>
            </el-radio-group>
            <el-button type="primary" size="small" @click="fetchRanking" :loading="loading">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <!-- 单次击毁排行 -->
      <div v-if="rankingType === 'single'" v-loading="loading">
        <el-table :data="rankingData" style="width: 100%" size="small">
          <el-table-column type="index" label="排名" width="60" align="center" />
          <el-table-column label="击毁估值" width="140" align="right">
            <template #default="{ row }">
              <span class="kill-value">{{ formatISK(row.total_value) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="舰船" min-width="200">
            <template #default="{ row }">
              <div class="ship-info" @click="viewDetail(row.killmail_id)">
                <img v-if="row.victim_ship_type_id" 
                     :src="`https://images.evetech.net/types/${row.victim_ship_type_id}/render?size=32`" 
                     class="ship-icon"
                     @error="handleShipImgError" />
                <span class="ship-link">{{ row.victim_ship_name || '未知舰船' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="最后一击" min-width="180">
            <template #default="{ row }">
              <div class="character-info">
                <span class="character-name">{{ row.final_blow_character_name ? `${row.final_blow_character_name} (${row.final_blow_character_id})` : `ID: ${row.final_blow_character_id}` }}</span>
                <span class="corp-name">{{ row.final_blow_corporation_name || '' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="星系" width="120">
            <template #default="{ row }">
              {{ row.solar_system_name || '未知星系' }}
            </template>
          </el-table-column>
          <el-table-column label="时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.killmail_time) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 击毁总估值排行 -->
      <div v-else-if="rankingType === 'kills'" v-loading="loading">
        <el-table :data="rankingData" style="width: 100%" size="small">
          <el-table-column type="index" label="排名" width="60" align="center" />
          <el-table-column label="角色" min-width="180">
            <template #default="{ row }">
              <div class="character-info">
                <span class="character-name">{{ row.character_name ? `${row.character_name} (${row.character_id})` : `ID: ${row.character_id}` }}</span>
                <span class="corp-name">{{ row.corporation_name || '' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="击毁次数" width="100" align="center">
            <template #default="{ row }">
              <span class="kill-count">{{ row.kill_count }}</span>
            </template>
          </el-table-column>
          <el-table-column label="总估值" width="140" align="right">
            <template #default="{ row }">
              <span class="kill-value">{{ formatISK(row.total_value) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 损失总估值排行 -->
      <div v-else-if="rankingType === 'losses'" v-loading="loading">
        <el-table :data="rankingData" style="width: 100%" size="small">
          <el-table-column type="index" label="排名" width="60" align="center" />
          <el-table-column label="角色" min-width="180">
            <template #default="{ row }">
              <div class="character-info">
                <span class="character-name">{{ row.character_name ? `${row.character_name} (${row.character_id})` : `ID: ${row.character_id}` }}</span>
                <span class="corp-name">{{ row.corporation_name || '' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="损失次数" width="100" align="center">
            <template #default="{ row }">
              <span class="loss-count">{{ row.loss_count }}</span>
            </template>
          </el-table-column>
          <el-table-column label="总估值" width="140" align="right">
            <template #default="{ row }">
              <span class="loss-value">{{ formatISK(row.total_value) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-empty v-if="!loading && rankingData.length === 0" description="暂无数据" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const rankingType = ref('single')
const rankingData = ref([])
const loading = ref(false)

const fetchRanking = async () => {
  loading.value = true
  try {
    const response = await fetch(`${API_BASE}/kb/ranking?type=${rankingType.value}&limit=50`)
    const data = await response.json()
    if (data.success) {
      rankingData.value = data.data
    } else {
      ElMessage.error(data.error || '获取榜单失败')
    }
  } catch (error) {
    console.error('获取榜单失败:', error)
    ElMessage.error('获取榜单失败')
  } finally {
    loading.value = false
  }
}

const viewDetail = (killmailId) => {
  router.push(`/kb-ranking/${killmailId}`)
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatISK = (value) => {
  if (!value) return '0'
  const num = parseFloat(value)
  if (num >= 100000000) {
    return (num / 100000000).toFixed(2) + '亿'
  } else if (num >= 10000000) {
    return (num / 10000000).toFixed(2) + '千万'
  } else if (num >= 10000) {
    return (num / 10000).toFixed(2) + '万'
  }
  return num.toFixed(2)
}

onMounted(() => {
  fetchRanking()
})
</script>

<style scoped>
.kb-ranking {
  padding: 20px;
  min-height: calc(100vh - 120px);
}

.ranking-card {
  max-width: 1200px;
  margin: 0 auto;
  background-color: #1e1e2e;
  border-color: #2d3040;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #e0e0e0;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.character-info {
  display: flex;
  flex-direction: column;
}

.character-name {
  color: #e0e0e0;
  font-weight: 500;
}

.corp-name {
  color: #999;
  font-size: 12px;
}

.loss-value {
  color: #f56c6c;
  font-weight: 600;
}

.kill-value {
  color: #67c23a;
  font-weight: 600;
}

.kill-count {
  color: #67c23a;
  font-weight: 600;
}

.loss-count {
  color: #f56c6c;
  font-weight: 600;
}

.ship-link {
  color: #409eff;
  cursor: pointer;
  text-decoration: underline;
}

.ship-link:hover {
  color: #66b1ff;
}

:deep(.el-card__header) {
  background-color: #252636;
  border-bottom-color: #2d3040;
}

:deep(.el-table) {
  background-color: transparent;
}

:deep(.el-table th) {
  background-color: #252636 !important;
  color: #999;
}

:deep(.el-table tr) {
  background-color: transparent;
}

:deep(.el-table td) {
  border-bottom-color: #2d3040;
  color: #e0e0e0;
}

:deep(.el-radio-button__inner) {
  background-color: #252636;
  border-color: #2d3040;
  color: #e0e0e0;
}

:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background-color: #409eff;
  border-color: #409eff;
}
</style>
