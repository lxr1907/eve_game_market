<template>
  <el-container class="navbar-container">
    <el-header class="navbar-header">
      <div class="navbar-inner">
        <el-menu :default-active="activeIndex" mode="horizontal" @select="handleSelect" class="navbar-menu">
          <el-menu-item index="1">
            <el-icon><House /></el-icon>
            首页
          </el-menu-item>
          <el-sub-menu index="2">
            <template #title>
              <el-icon><Collection /></el-icon>
              <span>基础数据</span>
            </template>
            <el-menu-item index="2-1">
              <el-icon><Collection /></el-icon>
              Type列表
            </el-menu-item>
            <el-menu-item index="2-2">
              <el-icon><MapLocation /></el-icon>
              Region列表
            </el-menu-item>
            <el-menu-item index="2-3">
              <el-icon><MapLocation /></el-icon>
              System列表
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item index="4">
            <el-icon><Document /></el-icon>
            订单查询
          </el-menu-item>
          <el-menu-item index="10">
            <el-icon><Money /></el-icon>
            制造成本
          </el-menu-item>
          <el-menu-item index="5">
            <el-icon><Star /></el-icon>
            LP商店
          </el-menu-item>
          <el-menu-item index="6">
            <el-icon><Money /></el-icon>
            LP收益数据
          </el-menu-item>
          <el-menu-item index="7">
            <el-icon><UserFilled /></el-icon>
            在线玩家统计
          </el-menu-item>
          <el-menu-item index="8">
            <el-icon><MapLocation /></el-icon>
            星系击毁统计
          </el-menu-item>
          <el-menu-item index="9">
            <el-icon><MapLocation /></el-icon>
            星图
          </el-menu-item>
          <el-menu-item v-if="isLoggedIn" index="profile">
            <el-icon><User /></el-icon>
            个人信息
          </el-menu-item>
        </el-menu>
        <div class="navbar-actions">
          <template v-if="!isLoggedIn">
            <el-button type="primary" size="small" @click="goToLogin" class="login-btn">
              <el-icon><UserFilled /></el-icon>
              登录
            </el-button>
          </template>
          <template v-else>
            <el-dropdown trigger="click" class="user-dropdown">
              <el-button type="success" size="small" class="profile-btn">
                <el-icon><User /></el-icon>
                {{ characterName || '个人信息' }}
                <el-icon class="el-icon--right"><arrow-down /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="goToProfile">
                    <el-icon><User /></el-icon>个人信息
                  </el-dropdown-item>
                  <el-dropdown-item divided @click="handleLogout">
                    <el-icon><SwitchButton /></el-icon>退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </div>
      </div>
    </el-header>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { House, Collection, MapLocation, Document, Star, Money, UserFilled, User, ArrowDown, SwitchButton } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const isLoggedIn = ref(false)
const characterName = ref('')

const checkLoginStatus = () => {
  try {
    const saved = localStorage.getItem('eve_character')
    if (saved) {
      const info = JSON.parse(saved)
      if (info && info.character_name) {
        isLoggedIn.value = true
        characterName.value = info.character_name
        return
      }
    }
    isLoggedIn.value = false
    characterName.value = ''
  } catch (e) {
    console.error('Check login status error:', e)
    isLoggedIn.value = false
  }
}

onMounted(() => {
  checkLoginStatus()
})

watch(() => route.path, () => {
  checkLoginStatus()
})

// 根据当前路由动态设置默认激活菜单项
const activeIndex = computed(() => {
  const path = route.path
  if (path === '/') return '1'
  if (path === '/profile') return 'profile'
  if (path === '/types') return '2-1'
  if (path === '/regions') return '2-2'
  if (path === '/systems') return '2-3'
  if (path === '/orders') return '4'
  if (path === '/manufacturing-cost') return '10'
  if (path === '/loyalty') return '5'
  if (path === '/profit-data') return '6'
  if (path === '/online-player-stats') return '7'
  if (path === '/system-kills') return '8'
  if (path === '/star-map') return '9'
  return '1'
})

const goToLogin = () => {
  router.push('/login')
}

const goToProfile = () => {
  router.push('/profile')
}

const handleLogout = () => {
  localStorage.removeItem('eve_character')
  isLoggedIn.value = false
  characterName.value = ''
  ElMessage.success('已退出登录')
  router.push('/')
}

// 菜单选择处理
const handleSelect = (key, keyPath) => {
  console.log(key, keyPath)
  if (key === '1') {
    router.push('/')
  } else if (key === 'profile') {
    router.push('/profile')
  } else if (key === '2-1') {
    router.push('/types')
  } else if (key === '2-2') {
    router.push('/regions')
  } else if (key === '2-3') {
    router.push('/systems')
  } else if (key === '4') {
    router.push('/orders')
  } else if (key === '10') {
    router.push('/manufacturing-cost')
  } else if (key === '5') {
    router.push('/loyalty')
  } else if (key === '6') {
    router.push('/profit-data')
  } else if (key === '7') {
    router.push('/online-player-stats')
  } else if (key === '8') {
    router.push('/system-kills')
  } else if (key === '9') {
    router.push('/star-map')
  }
}
</script>

<style scoped>
.navbar-container {
  width: 100%;
  background-color: #1a1c26;
  border-bottom: 1px solid #2d303e;
}

.navbar-header {
  padding: 0;
  background-color: #1a1c26;
  border-bottom: 1px solid #2d303e;
}

.navbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.navbar-menu {
  flex: 1;
}

.navbar-actions {
  display: flex;
  align-items: center;
  padding-right: 20px;
}

.login-btn {
  background-color: #409eff;
  border-color: #409eff;
  font-weight: 500;
}

.login-btn:hover {
  background-color: #66b1ff;
  border-color: #66b1ff;
}

.user-dropdown {
  margin-left: 10px;
}

.profile-btn {
  background-color: #67c23a;
  border-color: #67c23a;
  font-weight: 500;
}

.profile-btn:hover {
  background-color: #85ce61;
  border-color: #85ce61;
}

:deep(.el-menu) {
  background-color: #1a1c26;
  border-bottom: none;
}

:deep(.el-menu-item) {
  color: #fff !important;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

:deep(.el-menu--horizontal > .el-menu-item) {
  color: #fff !important;
  border-bottom: 2px solid transparent;
}

:deep(.el-menu-item:hover) {
  color: #409eff !important;
  border-bottom: 2px solid #409eff;
}

:deep(.el-menu-item.is-active) {
  color: #409eff !important;
  border-bottom: 2px solid #409eff;
}

:deep(.el-sub-menu__title) {
  color: #fff !important;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

:deep(.el-menu--horizontal > .el-sub-menu .el-sub-menu__title) {
  color: #fff !important;
  border-bottom: 2px solid transparent;
}

:deep(.el-sub-menu__title:hover) {
  color: #409eff !important;
  border-bottom: 2px solid #409eff;
}

:deep(.el-sub-menu.is-active .el-sub-menu__title) {
  color: #409eff !important;
  border-bottom: 2px solid #409eff;
}
</style>
