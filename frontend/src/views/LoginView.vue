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
        <h2 class="section-title">国服用户授权登录</h2>
        <el-alert
          title="国服授权说明"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <p><strong>步骤1：</strong>点击下方按钮生成授权链接</p>
            <p><strong>步骤2：</strong>复制授权链接，在浏览器中打开并完成授权</p>
            <p><strong>步骤3：</strong>授权完成后，将跳转页面的URL粘贴到下方输入框</p>
            <p><strong>步骤4：</strong>点击"授权登录"按钮完成登录</p>
          </template>
        </el-alert>

        <!-- 步骤1: 生成授权URL -->
        <div class="step-section">
          <div class="step-header">
            <el-tag type="primary" effect="dark" size="small">步骤1</el-tag>
            <span class="step-title">生成授权链接</span>
          </div>
          <div class="step-content">
            <el-button
              type="primary"
              @click="generateAuthUrl"
              :icon="Link"
            >
              生成授权链接
            </el-button>
          </div>
        </div>

        <!-- 步骤2: 显示并复制授权URL -->
        <div class="step-section" v-if="generatedAuthUrl">
          <div class="step-header">
            <el-tag type="success" effect="dark" size="small">步骤2</el-tag>
            <span class="step-title">复制授权链接并在浏览器中打开</span>
          </div>
          <div class="step-content">
            <div class="auth-url-display">
              <el-input
                v-model="generatedAuthUrl"
                type="textarea"
                :rows="3"
                readonly
                class="auth-url-input"
              />
              <div class="auth-url-actions">
                <el-button
                  type="success"
                  @click="copyAuthUrl"
                  :icon="DocumentCopy"
                >
                  复制链接
                </el-button>
                <el-button
                  type="primary"
                  @click="openAuthUrl"
                  :icon="Position"
                >
                  打开链接
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 步骤3: 粘贴回调URL -->
        <div class="step-section" v-if="generatedAuthUrl">
          <div class="step-header">
            <el-tag type="warning" effect="dark" size="small">步骤3</el-tag>
            <span class="step-title">粘贴授权完成后的URL</span>
          </div>
          <div class="step-content">
            <el-input
              v-model="serenityCallbackUrl"
              placeholder="请粘贴授权完成后的回调URL（包含code参数的地址）"
              size="large"
              clearable
              class="callback-input"
            >
              <template #prefix>
                <el-icon><Link /></el-icon>
              </template>
            </el-input>
            <div class="callback-hint">
              <el-text type="info" size="small">
                示例：https://ali-esi.evepc.163.com/ui/oauth2-redirect.html?code=xxx&state=xxx
              </el-text>
            </div>
          </div>
        </div>

        <!-- 步骤4: 授权登录按钮 -->
        <div class="step-section" v-if="generatedAuthUrl">
          <div class="step-header">
            <el-tag effect="dark" size="small">步骤4</el-tag>
            <span class="step-title">完成授权登录</span>
          </div>
          <div class="step-content">
            <el-button
              type="success"
              size="large"
              class="serenity-login-btn"
              @click="handleSerenityLogin"
              :disabled="!serenityCallbackUrl.trim()"
              :loading="loginLoading"
            >
              <el-icon><User /></el-icon>
              授权登录
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Key, Link, DocumentCopy, Position, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const serenityCallbackUrl = ref('')
const selectedIndices = ref([])
const generatedAuthUrl = ref('')
const loginLoading = ref(false)

// 国服ESI内置的client_id
const SERENITY_CLIENT_ID = 'bc90aa496a404724a93f41b4f4e97761'
const SERENITY_REDIRECT_URI = 'https://ali-esi.evepc.163.com/ui/oauth2-redirect.html'

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

// 生成国服授权URL (使用PKCE模式)
const generateAuthUrl = async () => {
  // 限制最多选择4个权限
  const allScopes = selectedIndices.value.slice(0, 4).map(i => authOptions[i].scopes).flat()
  const scopes = allScopes.join(' ')

  if (allScopes.length === 0) {
    ElMessage.warning('请至少选择一个授权权限')
    return
  }

  const state = generateState()
  sessionStorage.setItem('eve_sso_state', state)

  // 生成PKCE参数
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  sessionStorage.setItem('eve_code_verifier', codeVerifier)

  // 使用PKCE模式参数
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: 'bc90aa496a404724a93f41b4f4e97761',
    redirect_uri: 'https://ali-esi.evepc.163.com/ui/oauth2-redirect.html',
    scope: scopes,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    device_id: 'kb_ceve_market'
  })

  const authUrl = `https://login.evepc.163.com/v2/oauth/authorize?${params.toString()}`
  
  // 先退出登录清除Cookie，再跳转授权链接
  generatedAuthUrl.value = `https://login.evepc.163.com/account/logoff?returnUrl=${encodeURIComponent(authUrl)}`
  ElMessage.success('授权链接已生成！')
}

// 生成PKCE code_verifier
const generateCodeVerifier = () => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64URLEncode(array)
}

// 生成PKCE code_challenge
const generateCodeChallenge = (verifier) => {
  // 使用SHA-256哈希
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = crypto.subtle.digest('SHA-256', data)
  return hash.then(buffer => base64URLEncode(new Uint8Array(buffer)))
}

// Base64URL编码
const base64URLEncode = (bytes) => {
  let binary = ''
  const len = bytes.byteLength || bytes.length
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// 复制授权URL
const copyAuthUrl = async () => {
  try {
    await navigator.clipboard.writeText(generatedAuthUrl.value)
    ElMessage.success('授权链接已复制到剪贴板！')
  } catch (e) {
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = generatedAuthUrl.value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success('授权链接已复制！')
  }
}

// 打开授权URL
const openAuthUrl = () => {
  window.open(generatedAuthUrl.value, '_blank')
}

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

  loginLoading.value = true

  try {
    const parsedUrl = new URL(url)
    const code = parsedUrl.searchParams.get('code')
    const state = parsedUrl.searchParams.get('state')

    if (!code) {
      ElMessage.error('无效的回调地址，未找到授权码(code)')
      return
    }

    // 获取PKCE code_verifier
    const codeVerifier = sessionStorage.getItem('eve_code_verifier')
    
    const response = await fetch('/api/eve-sso/save-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        callback_url: url,
        code_verifier: codeVerifier
      })
    })

    const result = await response.json()

    if (response.ok && result.success) {
      const characterInfo = {
        character_id: result.character_id,
        character_name: result.character_name,
        access_token: result.access_token,
        token_saved: result.token_saved
      }
      localStorage.setItem('eve_character', JSON.stringify(characterInfo))

      ElMessage.success('授权成功！' + (result.character_name ? `欢迎 ${result.character_name}` : ''))
      serenityCallbackUrl.value = ''
      
      setTimeout(() => {
        window.location.href = '/profile'
      }, 1000)
    } else {
      ElMessage.error(result.error || '保存授权信息失败')
    }
  } catch (e) {
    console.error('Serenity login error:', e)
    ElMessage.error('处理失败：' + e.message)
  } finally {
    loginLoading.value = false
  }
}

const generateState = () => {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
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
  max-width: 800px;
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

.serenity-section :deep(.el-alert__content p) {
  margin: 4px 0;
  line-height: 1.8;
}

.step-section {
  margin-top: 20px;
  padding: 16px;
  background-color: #1e1e2e;
  border-radius: 8px;
  border: 1px solid #2d3040;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.step-title {
  color: #e0e0e0;
  font-size: 15px;
  font-weight: 500;
}

.step-content {
  padding-left: 4px;
}

.auth-url-display {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auth-url-input :deep(.el-textarea__inner) {
  background-color: #252636 !important;
  border-color: #2d3040 !important;
  color: #67c23a !important;
  font-family: monospace;
  font-size: 13px;
}

.auth-url-actions {
  display: flex;
  gap: 12px;
}

.callback-input {
  width: 100%;
}

.callback-input :deep(.el-input__inner) {
  background-color: #252636 !important;
  border-color: #2d3040 !important;
  color: #e0e0e0 !important;
  font-family: monospace;
}

.callback-hint {
  margin-top: 8px;
}

.serenity-login-btn {
  width: 100%;
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

@media (max-width: 640px) {
  .auth-url-actions {
    flex-direction: column;
  }
  
  .auth-url-actions .el-button {
    width: 100%;
  }
}
</style>
