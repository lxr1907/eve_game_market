<template>
  <el-container class="navbar-container">
    <el-header class="navbar-header">
      <el-menu :default-active="activeIndex" mode="horizontal" @select="handleSelect" style="width: 100%">
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
          Loyalty商店
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
      </el-menu>
    </el-header>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { House, Collection, MapLocation, Document, Star, Money, UserFilled } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

// 根据当前路由动态设置默认激活菜单项
const activeIndex = computed(() => {
  const path = route.path
  if (path === '/') return '1'
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

// 菜单选择处理
const handleSelect = (key, keyPath) => {
  console.log(key, keyPath)
  if (key === '1') {
    router.push('/')
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

:deep(.el-menu) {
  background-color: #1a1c26;
  border-bottom: none;
}

:deep(.el-menu-item) {
  color: #94a3b8;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

:deep(.el-menu-item:hover) {
  color: #409eff;
  border-bottom: 2px solid #409eff;
}

:deep(.el-menu-item.is-active) {
  color: #409eff;
  border-bottom: 2px solid #409eff;
}

:deep(.el-sub-menu__title) {
  color: #94a3b8;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

:deep(.el-sub-menu__title:hover) {
  color: #409eff;
  border-bottom: 2px solid #409eff;
}

:deep(.el-sub-menu.is-active .el-sub-menu__title) {
  color: #409eff;
  border-bottom: 2px solid #409eff;
}
</style>
