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
        <div class="auth-card" v-for="(auth, index) in authOptions" :key="index">
          <div class="auth-card-header">
            <h3>{{ auth.title }}</h3>
          </div>
          <div class="auth-card-body">
            <div class="auth-scopes">
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
            <el-button
              type="primary"
              size="large"
              class="auth-btn"
              @click="handleAuth(auth)"
            >
              <el-icon><Key /></el-icon>
              授权登录
            </el-button>
          </div>
        </div>
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
import { ref } from 'vue'
import { Key, Link } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const serenityCallbackUrl = ref('')

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

const handleAuth = (auth) => {
  const clientId = import.meta.env.VITE_EVE_CLIENT_ID || ''
  const redirectUri = import.meta.env.VITE_EVE_REDIRECT_URI || window.location.origin + '/login/callback'
  const scopes = auth.scopes.join(' ')

  if (!clientId) {
    ElMessage.warning('请先配置 EVE SSO Client ID（VITE_EVE_CLIENT_ID）')
    return
  }

  const state = generateState()
  sessionStorage.setItem('eve_sso_state', state)
  sessionStorage.setItem('eve_sso_scopes', scopes)

  const authUrl = new URL('https://login.evepc.163.com/v2/oauth/authorize/')
  authUrl.searchParams.append('response_type', 'code')
  authUrl.searchParams.append('redirect_uri', redirectUri)
  authUrl.searchParams.append('client_id', clientId)
  authUrl.searchParams.append('scope', scopes)
  authUrl.searchParams.append('state', state)

  window.location.href = authUrl.toString()
}

const handleSerenityLogin = () => {
  const url = serenityCallbackUrl.value.trim()
  if (!url) {
    ElMessage.warning('请输入授权回调地址')
    return
  }

  try {
    const parsedUrl = new URL(url)
    const code = parsedUrl.searchParams.get('code')
    const state = parsedUrl.searchParams.get('state')

    if (!code || !state) {
      ElMessage.error('无效的回调地址，请确认已正确粘贴完整URL')
      return
    }

    const savedState = sessionStorage.getItem('eve_sso_state')
    if (state !== savedState) {
      ElMessage.error('State 验证失败，可能存在安全风险')
      return
    }

    ElMessage.success('授权验证成功，正在处理登录...')

    exchangeCodeForToken(code)
  } catch (e) {
    ElMessage.error('URL格式不正确，请检查粘贴的地址')
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

.auth-card {
  background-color: #1e1e2e;
  border: 1px solid #2d3040;
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.3s;
}

.auth-card:hover {
  border-color: #409eff;
}

.auth-card-header {
  background-color: #252636;
  padding: 16px 20px;
  border-bottom: 1px solid #2d3040;
}

.auth-card-header h3 {
  margin: 0;
  font-size: 16px;
  color: #e0e0e0;
  font-weight: 500;
}

.auth-card-body {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.auth-scopes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.scope-tag {
  background-color: #2d3040 !important;
  border-color: #3d4060 !important;
  color: #a0a0c0 !important;
  font-family: monospace;
  font-size: 12px;
}

.auth-btn {
  flex-shrink: 0;
  min-width: 140px;
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
  .auth-card-body {
    flex-direction: column;
    align-items: stretch;
  }

  .auth-btn {
    width: 100%;
  }

  .serenity-form {
    flex-direction: column;
  }

  .serenity-login-btn {
    width: 100%;
  }
}
</style>
