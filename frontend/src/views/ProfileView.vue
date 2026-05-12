<template>
  <div class="profile-page">
    <div class="profile-container">

      <div v-if="loading" class="loading-section">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="error" class="error-section">
        <el-alert :title="error" type="error" :closable="false" show-icon />
        <el-button type="primary" @click="$router.push('/login')" style="margin-top: 16px;">
          重新登录
        </el-button>
      </div>

      <div v-else-if="characterInfo" class="profile-content">
        <!-- 角色名称标题 -->
        <div class="character-header">
          <h2 class="character-name">{{ characterInfo.character_name || '未知' }} (ID: {{ characterInfo.character_id || '未知' }})</h2>
          <el-button type="primary" @click="$router.push('/my-kb')">
            <el-icon><Document /></el-icon>
            我的KB
          </el-button>
        </div>

        <!-- ESI角色详细信息 -->
        <el-card class="detail-card" shadow="hover" v-if="characterDetails">
          <template #header>
            <span>角色详细信息</span>
          </template>
          <div class="detail-grid">
            <div class="detail-item" v-if="characterDetails.name">
              <label>名称</label>
              <span>{{ characterDetails.name }}</span>
            </div>
            <div class="detail-item" v-if="characterDetails.corporation_id">
              <label>公司ID</label>
              <span>{{ characterDetails.corporation_id }}</span>
            </div>
            <div class="detail-item" v-if="characterDetails.alliance_id">
              <label>联盟ID</label>
              <span>{{ characterDetails.alliance_id }}</span>
            </div>
            <div class="detail-item" v-if="characterDetails.gender">
              <label>性别</label>
              <span>{{ characterDetails.gender === 'male' ? '男' : '女' }}</span>
            </div>
            <div class="detail-item" v-if="characterDetails.birthday">
              <label>创建日期</label>
              <span>{{ formatDate(characterDetails.birthday) }}</span>
            </div>
            <div class="detail-item" v-if="characterDetails.security_status !== undefined">
              <label>安全等级</label>
              <span :class="getSecurityClass(characterDetails.security_status)">
                {{ characterDetails.security_status.toFixed(2) }}
              </span>
            </div>
            <div class="detail-item" v-if="characterDetails.race_id">
              <label>种族ID</label>
              <span>{{ characterDetails.race_id }}</span>
            </div>
            <div class="detail-item" v-if="characterDetails.bloodline_id">
              <label>血统ID</label>
              <span>{{ characterDetails.bloodline_id }}</span>
            </div>
          </div>
        </el-card>

        <!-- 授权范围卡片 -->
        <el-card class="scopes-card" shadow="hover" v-if="esiData && esiData.Scopes">
          <template #header>
            <span>授权范围</span>
          </template>
          <div class="scopes-list">
            <el-tag
              v-for="scope in parseScopes(esiData.Scopes)"
              :key="scope"
              type="info"
              size="small"
              class="scope-tag"
            >
              {{ scope }}
            </el-tag>
          </div>
        </el-card>

        <!-- 公司信息 -->
        <el-card class="corporation-card" shadow="hover" v-if="corporationInfo">
          <template #header>
            <span>公司信息</span>
          </template>
          <div class="corp-info">
            <div class="info-item" v-if="corporationInfo.name">
              <label>公司名称：</label>
              <span>{{ corporationInfo.name }}</span>
            </div>
            <div class="info-item" v-if="corporationInfo.ticker">
              <label>股票代码：</label>
              <span>{{ corporationInfo.ticker }}</span>
            </div>
            <div class="info-item" v-if="corporationInfo.member_count">
              <label>成员数量：</label>
              <span>{{ corporationInfo.member_count }}</span>
            </div>
          </div>
        </el-card>


      </div>

      <div v-else class="not-logged-in">
        <el-result icon="warning" title="未登录" sub-title="请先登录以查看个人信息">
          <template #extra>
            <el-button type="primary" @click="$router.push('/login')">前往登录</el-button>
          </template>
        </el-result>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Document } from '@element-plus/icons-vue'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const characterInfo = ref(null)
const characterDetails = ref(null)
const corporationInfo = ref(null)

onMounted(async () => {
  loadProfile()
})

const loadProfile = async () => {
  loading.value = true
  error.value = ''

  try {
    const saved = localStorage.getItem('eve_character')
    if (!saved) {
      error.value = '未找到登录信息，请先登录'
      loading.value = false
      return
    }

    const info = JSON.parse(saved)
    characterInfo.value = info

    // 使用 character_id 获取角色信息（不再依赖前端的 access_token）
    if (info.character_id) {
      await fetchCharacterDetails(info.character_id)
    } else {
      error.value = '未找到角色ID，请重新登录'
    }
  } catch (e) {
    console.error('Load profile error:', e)
    error.value = '加载个人信息失败：' + e.message
  } finally {
    loading.value = false
  }
}

const fetchCharacterDetails = async (characterId) => {
  try {
    const response = await fetch(`https://ali-esi.evepc.163.com/latest/characters/${characterId}/`, {
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`获取角色详情失败: ${response.status}`)
    }

    characterDetails.value = await response.json()
    
    // 获取公司信息
    if (characterDetails.value.corporation_id) {
      await fetchCorporationInfo(characterDetails.value.corporation_id)
    }
  } catch (e) {
    console.error('Character details fetch error:', e)
  }
}

const fetchCorporationInfo = async (corporationId) => {
  try {
    const response = await fetch(`https://ali-esi.evepc.163.com/latest/corporations/${corporationId}/`, {
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`获取公司信息失败: ${response.status}`)
    }

    corporationInfo.value = await response.json()
  } catch (e) {
    console.error('Corporation info fetch error:', e)
  }
}

const parseScopes = (scopesStr) => {
  if (!scopesStr) return []
  return scopesStr.split(' ').filter(s => s.trim())
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

const getSecurityClass = (sec) => {
  if (sec >= 5) return 'sec-high'
  if (sec >= 0) return 'sec-neutral'
  return 'sec-low'
}

const handleLogout = () => {
  localStorage.removeItem('eve_character')
  characterInfo.value = null
  esiData.value = null
  characterDetails.value = null
  corporationInfo.value = null
  ElMessage.success('已退出登录')
  router.push('/')
}
</script>

<style scoped>
.profile-page {
  min-height: calc(100vh - 120px);
  display: flex;
  justify-content: center;
  padding: 40px 20px;
}

.profile-container {
  max-width: 900px;
  width: 100%;
}

.profile-title {
  text-align: center;
  font-size: 28px;
  color: #ffffff;
  margin-bottom: 24px;
  font-weight: 600;
}

.loading-section,
.error-section {
  margin-top: 40px;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.profile-card,
.detail-card,
.scopes-card,
.corporation-card {
  background-color: #1e1e2e;
  border-color: #2d3040;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #e0e0e0;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e0e0e0;
}

.info-item label {
  color: #999;
  min-width: 100px;
}

.info-item .value {
  color: #67c23a;
  font-weight: 500;
}

/* 角色名称标题 */
.character-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 20px;
  background-color: #1e1e2e;
  border-radius: 8px;
  border: 1px solid #2d3040;
}

.character-name {
  margin: 0;
  font-size: 20px;
  color: #e0e0e0;
  font-weight: 600;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item label {
  color: #999;
  font-size: 12px;
}

.detail-item span {
  color: #e0e0e0;
  font-size: 14px;
}

.sec-high {
  color: #67c23a;
}

.sec-neutral {
  color: #e6a23c;
}

.sec-low {
  color: #f56c6c;
}

.scopes-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.scope-tag {
  background-color: #2d3040 !important;
  border-color: #3d4060 !important;
  color: #a0a0c0 !important;
  font-family: monospace;
  font-size: 12px;
}

.corp-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.not-logged-in {
  margin-top: 60px;
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

@media (max-width: 640px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
