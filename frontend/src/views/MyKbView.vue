<template>
  <div class="kb-page">
    <div class="kb-container">
      <h1 class="kb-title">我的KB</h1>

      <!-- 未登录提示 -->
      <div v-if="!characterInfo" class="not-logged-in">
        <el-result icon="warning" title="未登录" sub-title="请先登录以查看您的KB数据">
          <template #extra>
            <el-button type="primary" @click="$router.push('/login')">前往登录</el-button>
          </template>
        </el-result>
      </div>

      <!-- 已登录内容 -->
      <div v-else class="kb-content">
        <!-- 角色信息卡片 -->
        <el-card class="character-card" shadow="hover">
          <div class="character-info">
            <div class="char-avatar">
              <img :src="`https://images.evetech.net/characters/${characterInfo.character_id}/portrait?size=64`" 
                   alt="avatar" 
                   @error="handleAvatarError" />
            </div>
            <div class="char-details">
              <h3>{{ characterInfo.character_name }}</h3>
              <p>角色ID: {{ characterInfo.character_id }}</p>
            </div>
            <div class="sync-actions">
              <el-button 
                type="primary" 
                :loading="syncing" 
                @click="syncKB"
                :disabled="!hasKillmailScope"
              >
                {{ syncing ? '同步中...' : '同步KB数据' }}
              </el-button>
              <el-tooltip v-if="!hasKillmailScope" content="需要授权killmails权限才能同步数据" placement="bottom">
                <el-icon class="warning-icon"><Warning /></el-icon>
              </el-tooltip>
            </div>
          </div>
        </el-card>

        <!-- 统计卡片 -->
        <div class="stats-grid" v-if="stats">
          <el-card class="stat-card kills-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-label">击毁</div>
              <div class="stat-value">{{ stats.kills_count || 0 }}</div>
              <div class="stat-isk">{{ formatISK(stats.kills_isk) }} ISK</div>
            </div>
          </el-card>
          <el-card class="stat-card losses-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-label">损失</div>
              <div class="stat-value">{{ stats.losses_count || 0 }}</div>
              <div class="stat-isk">{{ formatISK(stats.losses_isk) }} ISK</div>
            </div>
          </el-card>
          <el-card class="stat-card efficiency-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-label">效率</div>
              <div class="stat-value" :class="getEfficiencyClass(stats.efficiency)">
                {{ stats.efficiency || 0 }}%
              </div>
              <div class="stat-bar">
                <div class="efficiency-bar" :style="{ width: (stats.efficiency || 0) + '%' }"></div>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 同步结果 -->
        <el-alert 
          v-if="syncResult" 
          :title="syncResult.success ? '同步成功' : '同步失败'" 
          :type="syncResult.success ? 'success' : 'error'"
          :description="syncResult.message"
          show-icon
          closable
          @close="syncResult = null"
          style="margin-bottom: 20px;"
        />

        <!-- KB记录标签页 -->
        <el-card class="kb-records-card" shadow="hover">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="击毁记录" name="kills">
              <div v-if="loadingKills" class="loading-section">
                <el-skeleton :rows="5" animated />
              </div>
              <div v-else-if="kills.length === 0" class="empty-section">
                <el-empty description="暂无击毁记录" />
              </div>
              <div v-else class="kb-table-wrapper">
                <el-table :data="kills" style="width: 100%" :row-class-name="getRowClass">
                  <el-table-column label="时间" prop="killmail_time" width="160">
                    <template #default="{ row }">
                      {{ formatDate(row.killmail_time) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="受害者" min-width="150">
                    <template #default="{ row }">
                      <div class="victim-info">
                        <span class="ship-name">{{ row.victim_ship_name || `舰船ID: ${row.victim_ship_type_id}` }}</span>
                        <span class="char-name" v-if="row.victim_character_name">{{ row.victim_character_name }}</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="系统" prop="solar_system_name" width="120">
                    <template #default="{ row }">
                      {{ row.solar_system_name || `ID: ${row.solar_system_id}` }}
                    </template>
                  </el-table-column>
                  <el-table-column label="价值" width="120" align="right">
                    <template #default="{ row }">
                      <span class="isk-value">{{ formatISK(row.total_value) }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="参与人数" prop="attackers_count" width="90" align="center" />
                </el-table>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="损失记录" name="losses">
              <div v-if="loadingLosses" class="loading-section">
                <el-skeleton :rows="5" animated />
              </div>
              <div v-else-if="losses.length === 0" class="empty-section">
                <el-empty description="暂无损失记录" />
              </div>
              <div v-else class="kb-table-wrapper">
                <el-table :data="losses" style="width: 100%" :row-class-name="getRowClass">
                  <el-table-column label="时间" prop="killmail_time" width="160">
                    <template #default="{ row }">
                      {{ formatDate(row.killmail_time) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="损失舰船" min-width="150">
                    <template #default="{ row }">
                      <div class="victim-info">
                        <span class="ship-name loss">{{ row.victim_ship_name || `舰船ID: ${row.victim_ship_type_id}` }}</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="击毁者" min-width="150">
                    <template #default="{ row }">
                      <span v-if="row.final_blow_character_name">{{ row.final_blow_character_name }}</span>
                      <span v-else-if="row.is_npc" class="npc-tag">NPC</span>
                      <span v-else>-</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="系统" width="120">
                    <template #default="{ row }">
                      {{ row.solar_system_name || `ID: ${row.solar_system_id}` }}
                    </template>
                  </el-table-column>
                  <el-table-column label="损失价值" width="120" align="right">
                    <template #default="{ row }">
                      <span class="isk-value loss">{{ formatISK(row.total_value) }}</span>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE || ''

const characterInfo = ref(null)
const syncing = ref(false)
const syncResult = ref(null)
const stats = ref(null)
const kills = ref([])
const losses = ref([])
const loadingKills = ref(false)
const loadingLosses = ref(false)
const activeTab = ref('kills')

// 检查是否有killmail权限
const hasKillmailScope = computed(() => {
  if (!characterInfo.value?.scopes) return false
  const scopes = characterInfo.value.scopes
  return scopes.includes('esi-killmails.read_killmails') || 
         scopes.includes('esi-killmails.read_corporation_killmails')
})

onMounted(async () => {
  loadCharacterInfo()
})

const loadCharacterInfo = () => {
  const saved = localStorage.getItem('eve_character')
  if (saved) {
    const info = JSON.parse(saved)
    characterInfo.value = info
    // 加载KB数据
    loadKBData()
  }
}

const loadKBData = async () => {
  if (!characterInfo.value?.character_id) return
  
  loadingKills.value = true
  loadingLosses.value = true
  
  try {
    const response = await fetch(`${API_BASE}/api/kb/my?character_id=${characterInfo.value.character_id}&datasource=serenity`)
    const data = await response.json()
    
    if (data.success) {
      kills.value = data.kills || []
      losses.value = data.losses || []
      stats.value = data.stats
    }
  } catch (e) {
    console.error('Load KB data error:', e)
  } finally {
    loadingKills.value = false
    loadingLosses.value = false
  }
}

const syncKB = async () => {
  if (!characterInfo.value?.character_id) return
  
  syncing.value = true
  syncResult.value = null
  
  try {
    const response = await fetch(`${API_BASE}/api/kb/sync/${characterInfo.value.character_id}?datasource=serenity`, {
      method: 'POST'
    })
    const data = await response.json()
    
    if (data.success) {
      syncResult.value = {
        success: true,
        message: `成功同步 ${data.saved} 条记录，失败 ${data.errors} 条`
      }
      // 刷新数据
      await loadKBData()
      ElMessage.success('KB数据同步成功')
    } else {
      syncResult.value = {
        success: false,
        message: data.error || '同步失败'
      }
      ElMessage.error(data.error || '同步失败')
    }
  } catch (e) {
    console.error('Sync KB error:', e)
    syncResult.value = {
      success: false,
      message: e.message || '网络错误'
    }
    ElMessage.error('同步失败: ' + e.message)
  } finally {
    syncing.value = false
  }
}

const formatISK = (value) => {
  if (!value) return '0'
  const num = parseFloat(value)
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(2) + 'B'
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K'
  }
  return num.toFixed(2)
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getEfficiencyClass = (efficiency) => {
  const eff = parseFloat(efficiency) || 0
  if (eff >= 70) return 'eff-high'
  if (eff >= 50) return 'eff-medium'
  return 'eff-low'
}

const getRowClass = ({ row }) => {
  return row.is_npc ? 'npc-row' : ''
}

const handleAvatarError = (e) => {
  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgZm9udC1zaXplPSIyMCI+PzwvdGV4dD48L3N2Zz4='
}
</script>

<style scoped>
.kb-page {
  min-height: calc(100vh - 120px);
  padding: 20px;
}

.kb-container {
  max-width: 1200px;
  margin: 0 auto;
}

.kb-title {
  text-align: center;
  font-size: 28px;
  color: #ffffff;
  margin-bottom: 24px;
  font-weight: 600;
}

.not-logged-in {
  margin-top: 60px;
}

.kb-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.character-card {
  background-color: #1e1e2e;
  border-color: #2d3040;
}

.character-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.char-avatar img {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  border: 2px solid #3d4060;
}

.char-details h3 {
  color: #e0e0e0;
  margin: 0 0 4px 0;
  font-size: 18px;
}

.char-details p {
  color: #999;
  margin: 0;
  font-size: 14px;
}

.sync-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.warning-icon {
  color: #e6a23c;
  font-size: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-card {
  background-color: #1e1e2e;
  border-color: #2d3040;
}

.stat-content {
  text-align: center;
  padding: 10px 0;
}

.stat-label {
  color: #999;
  font-size: 14px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #e0e0e0;
}

.stat-isk {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
}

.kills-card .stat-value {
  color: #67c23a;
}

.losses-card .stat-value {
  color: #f56c6c;
}

.eff-high {
  color: #67c23a !important;
}

.eff-medium {
  color: #e6a23c !important;
}

.eff-low {
  color: #f56c6c !important;
}

.stat-bar {
  width: 100%;
  height: 6px;
  background-color: #2d3040;
  border-radius: 3px;
  margin-top: 12px;
  overflow: hidden;
}

.efficiency-bar {
  height: 100%;
  background: linear-gradient(90deg, #67c23a, #e6a23c);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.kb-records-card {
  background-color: #1e1e2e;
  border-color: #2d3040;
}

.loading-section,
.empty-section {
  padding: 40px 0;
}

.kb-table-wrapper {
  margin-top: 16px;
}

.victim-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ship-name {
  color: #67c23a;
  font-weight: 500;
}

.ship-name.loss {
  color: #f56c6c;
}

.char-name {
  color: #999;
  font-size: 12px;
}

.isk-value {
  color: #e6a23c;
  font-family: monospace;
}

.isk-value.loss {
  color: #f56c6c;
}

.npc-tag {
  color: #909399;
  font-style: italic;
}

:deep(.el-tabs__item) {
  color: #999;
}

:deep(.el-tabs__item.is-active) {
  color: #409eff;
}

:deep(.el-tabs__nav-wrap::after) {
  background-color: #2d3040;
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
}

:deep(.el-table--enable-row-hover .el-table__body tr:hover > td) {
  background-color: #252636 !important;
}

:deep(.el-table__body tr.npc-row td) {
  opacity: 0.7;
}

:deep(.el-card__header) {
  background-color: #252636;
  border-bottom-color: #2d3040;
  color: #e0e0e0;
}

:deep(.el-card__body) {
  color: #e0e0e0;
}

:deep(.el-result__title p) {
  color: #e0e0e0;
}

:deep(.el-result__subtitle p) {
  color: #999;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .character-info {
    flex-direction: column;
    text-align: center;
  }
  
  .sync-actions {
    margin-left: 0;
    margin-top: 16px;
  }
}
</style>
