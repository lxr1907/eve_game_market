<template>
  <el-container class="navbar-container">
    <el-header class="navbar-header">
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
        <el-menu-item index="4">
          <el-icon><Document /></el-icon>
          订单查询
        </el-menu-item>
        <el-menu-item index="5">
          <el-icon><Star /></el-icon>
          Loyalty商店
        </el-menu-item>
        <el-menu-item index="6">
          <el-icon><Money /></el-icon>
          LP收益数据
        </el-menu-item>
      </el-menu>
    </el-header>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { House, Collection, MapLocation, Document, Star, Money } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

// 根据当前路由动态设置默认激活菜单项
const activeIndex = computed(() => {
  const path = route.path
  if (path === '/') return '1'
  if (path === '/types') return '2'
  if (path === '/regions') return '3'
  if (path === '/orders') return '4'
  if (path === '/loyalty') return '5'
  if (path === '/profit-data') return '6'
  return '1'
})

// 菜单选择处理
const handleSelect = (key, keyPath) => {
  console.log(key, keyPath)
  if (key === '1') {
    router.push('/')
  } else if (key === '2') {
    router.push('/types')
  } else if (key === '3') {
    router.push('/regions')
  } else if (key === '4') {
    router.push('/orders')
  } else if (key === '5') {
    router.push('/loyalty')
  } else if (key === '6') {
    router.push('/profit-data')
  }
}
</script>

<style scoped>
.navbar-container {
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
}

.navbar-header {
  background-color: #409eff;
  color: white;
  padding: 0;
  height: 60px;
  line-height: 60px;
  display: flex;
  align-items: center;
}

:deep(.el-menu) {
  background-color: #409eff;
  border-bottom: none;
}

:deep(.el-menu-item) {
  color: white;
}

:deep(.el-menu-item:hover),
:deep(.el-menu-item.is-active) {
  background-color: #66b1ff;
  color: white;
}
</style>