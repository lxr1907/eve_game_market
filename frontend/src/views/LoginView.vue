<template>
  <div class="login-page">
    <div class="login-container">
      <h1 class="login-title">EVE Online 统一账号登录 (SSO)</h1>

      <div class="login-notice">
        <el-alert
          title="请确认授权网站和授权内容"
          type="warning"
          :closable="false"
          show-icon
        >
          <template #default>
            <p>点击下方按钮，将会带你到EVE Online官方网站登录并授权，请务必确认该网站确实是官方网站并确认授权内容是否正确。</p>
          </template>
        </el-alert>
      </div>

      <div class="auth-sections">
        <el-checkbox-group v-model="selectedIndices" class="scope-checkbox-group">
          <div class="scope-item" v-for="(auth, index) in authOptions" :key="index">
            <el-checkbox :label="index">
              <div class="scope-item-content">
                <span class="scope-title">{{ auth.title }}</span>
                <div class="scope-tags">
                  <el-tag
                    v-for="scope in auth.scopes"
                    :key="scope"
                    type="info"
                    size="small"
                    class="scope-tag"
                  >
                    {{ scope }}
                  </el-tag>
                </div>
              </div>
            </el-checkbox>
          </div>
        </el-checkbox-group>

        <el-button
          type="primary"
          size="large"
          class="auth-btn"
          @click="handleAuth"
          :disabled="selectedIndices.length === 0"
        >
          <el-icon><Key /></el-icon>
          前往EVE官方网站授权
        </el-button>
      </div>

      <el-divider />

      <div class="serenity-section">
        <h2 class="section-title">针对国服用户的特殊授权步骤</h2>
        <el-alert
          title="国服授权说明"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <p>因国服官方暂未正式开放API授权，因此需要此特殊步骤进行授权。</p>
            <p>请将完成授权后的空白页地址贴于下方文本框然后点击登录</p>
          </template>
        </el-alert>

        <div class="serenity-form">
          <el-input
            v-model="serenityCallbackUrl"
            placeholder="请粘贴授权回调后的空白页地址"
            size="large"
            clearable
          >
            <template #prefix>
              <el-icon><Link /></el-icon>
            </template>
          </el-input>
          <el-button
            type="success"
            size="large"
            class="serenity-login-btn"
            @click="handleSerenityLogin"
            :disabled="!serenityCallbackUrl.trim()"
          >
            EVE国服授权登录
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Key, Link } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const serenityCallbackUrl = ref('')
const selectedIndices = ref([])

const authOptions = [
  {
    title: '授权读取个人击毁记录（KM）',
    description: '授权本站自动读取你的KM并上传到本站',
    scopes: ['esi-killmails.read_killmails.v1']
  },
  {
    title: '授权读取军团击毁记录（KM）',
    description: '授权本站自动读取你的军团的KM并上传到本站（需要总监权限）',
    scopes: [
      'esi-characters.read_corporation_roles.v1',
      'esi-killmails.read_corporation_killmails.v1'
    ]
  },
  {
    title: '授权游戏内弹出窗口',
    description: '授权在游戏里直接弹出各类窗口（如市场、分享KM链接、查看个人信息等）',
    scopes: ['esi-ui.open_window.v1']
  },
  {
    title: '授权游戏内自动导航',
    description: '授权在游戏里设置自动导航',
    scopes: ['esi-ui.write_waypoint.v1']
  },
  {
    title: '授权装配导入游戏',
    description: '授权将装配直接导入到游戏中',
    scopes: ['esi-fittings.write_fittings.v1']
  }
]

onMounted(() => {
  // 默认勾选除了军团击毁记录（index=1）外的所有权限
  selectedIndices.value = authOptions.map((_, index) => index).filter(i => i !== 1)
})

const handleAuth = () => {
  const allScopes = selectedIndices.value.map(i => authOptions[i].scopes).flat()
  const scopes = allScopes.join(' ')

  if (allScopes.length === 0) {
    ElMessage.warning('请至少选择一个授权权限')
    return
  }

  const state = generateState()
  sessionStorage.setItem('eve_sso_state', state)
  sessionStorage.setItem('eve_sso_scopes', scopes)

  const callbackUrl = 'https://login.evepc.163.com/v2/account/callback?provider=netease&state=' + state + ':kb_ceve_market'
  const encodedCallback = encodeURIComponent(encodeURIComponent(callbackUrl))

  const authUrl = 'https://login.evepc.163.com/account/neteaselogon?game_id=aecfu6bgiuaaaal2-g-ma79&device_id=kb_ceve_market&client_id=7014295958&redirect_uri=' + encodedCallback + '&relogin=0'

  window.location.href = authUrl
}

const handleSerenityLogin = async () => {
  const url = serenityCallbackUrl.value.trim()
  if (!url) {
    ElMessage.warning('请输入授权回调地址')
    return
  }

  try {
    const parsedUrl = new URL(url)
    const code = parsedUrl.searchParams.get('code')
    const state = parsedUrl.searchParams.get('state')

    if (!code) {
      ElMessage.error('无效的回调地址，未找到授权码(code)')
      return
    }

    const response = await fetch('/api/save-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ callback_url: url })
    })

    const result = await response.json()

    if (response.ok && result.success) {
      ElMessage.success('授权成功！' + (result.character_name ? `欢迎 ${result.character_name}` : ''))
      serenityCallbackUrl.value = ''
      setTimeout(() => {
        window.location.href = '/'
      }, 1500)
    } else {
      ElMessage.error(result.error || '保存授权信息失败')
    }
  } catch (e) {
    console.error('Serenity login error:', e)
    ElMessage.error('处理失败：' + e.message)
  }
}

const generateState = () => {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

const exchangeCodeForToken = async (code) => {
  const clientId = import.meta.env.VITE_EVE_CLIENT_ID || ''
  const clientSecret = import.meta.env.VITE_EVE_CLIENT_SECRET || ''
  const redirectUri = import.meta.env.VITE_EVE_REDIRECT_URI || window.location.origin + '/login/callback'

  try {
    const tokenUrl = 'https://login.evepc.163.com/v2/oauth/token'
    const body = new URLSearchParams()
    body.append('grant_type', 'authorization_code')
    body.append('code', code)
    body.append('client_id', clientId)
    body.append('client_secret', clientSecret)
    body.append('redirect_uri', redirectUri)

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    })

    if (!response.ok) {
      throw new Error('Token exchange failed')
    }

    const data = await response.json()
    localStorage.setItem('eve_access_token', data.access_token)
    localStorage.setItem('eve_refresh_token', data.refresh_token)
    localStorage.setItem('eve_token_expires', String(Date.now() + data.expires_in * 1000))

    ElMessage.success('登录成功！')
    setTimeout(() => {
      window.location.href = '/'
    }, 1500)
  } catch (error) {
    console.error('Token exchange error:', error)
    ElMessage.error('Token 交换失败，请重试')
  }
}
</script>

<style scoped>
.login-page {
  min-height: calc(100vh - 120px);
  display: flex;
  justify-content: center;
  padding: 40px 20px;
}

.login-container {
  max-width: 720px;
  width: 100%;
}

.login-title {
  text-align: center;
  font-size: 28px;
  color: #ffffff;
  margin-bottom: 24px;
  font-weight: 600;
}

.login-notice {
  margin-bottom: 32px;
}

.login-notice p {
  margin: 0;
  line-height: 1.6;
}

.auth-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
}

.scope-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.scope-item {
  background-color: #1e1e2e;
  border: 1px solid #2d3040;
  border-radius: 8px;
  padding: 16px 20px;
  transition: border-color 0.3s;
}

.scope-item:hover {
  border-color: #409eff;
}

.scope-item :deep(.el-checkbox) {
  width: 100%;
  height: auto;
}

.scope-item :deep(.el-checkbox__label) {
  width: 100%;
  color: #e0e0e0;
}

.scope-item-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scope-title {
  font-size: 16px;
  font-weight: 500;
  color: #e0e0e0;
}

.scope-tags {
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

.auth-btn {
  width: 100%;
  margin-top: 8px;
}

.section-title {
  font-size: 20px;
  color: #ffffff;
  margin-bottom: 16px;
  font-weight: 600;
}

.serenity-section {
  margin-top: 8px;
}

.serenity-section p {
  margin: 4px 0;
  line-height: 1.6;
}

.serenity-form {
  margin-top: 20px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.serenity-form .el-input {
  flex: 1;
}

.serenity-login-btn {
  flex-shrink: 0;
  min-width: 160px;
}

:deep(.el-divider) {
  border-color: #2d3040;
  margin: 32px 0;
}

:deep(.el-alert) {
  background-color: #252636;
  border-color: #2d3040;
}

:deep(.el-alert__title) {
  color: #e0e0e0;
}

:deep(.el-input__inner) {
  background-color: #252636 !important;
  border-color: #2d3040 !important;
  color: #e0e0e0 !important;
}

:deep(.el-input__inner::placeholder) {
  color: #666 !important;
}

@media (max-width: 640px) {
  .serenity-form {
    flex-direction: column;
  }

  .serenity-login-btn {
    width: 100%;
  }
}
</style>
