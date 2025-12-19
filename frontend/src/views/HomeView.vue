<template>
  <div class="home">
    <el-container>
      <el-header>
        <h1>EVE Online Explorer</h1>
        <el-menu :default-active="activeIndex" mode="horizontal" @select="handleSelect">
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
        </el-menu>
      </el-header>
      <el-main>
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>欢迎使用EVE Online Type Explorer</span>
            </div>
          </template>
          <div class="welcome-content">
            <p>这是一个基于EVE Online API构建的数据探索工具，您可以：</p>
            <el-list>
              <el-list-item>
                <el-icon><List /></el-icon> 浏览和搜索所有Type数据
              </el-list-item>
              <el-list-item>
                <el-icon><List /></el-icon> 浏览和搜索所有Region数据
              </el-list-item>
              <el-list-item>
                <el-icon><View /></el-icon> 查看Type的详细信息
              </el-list-item>
              <el-list-item>
                <el-icon><View /></el-icon> 查看Region的详细信息
              </el-list-item>
              <el-list-item>
                <el-icon><RefreshRight /></el-icon> 从EVE Online API同步最新数据
              </el-list-item>
            </el-list>
            <div class="action-buttons">
              <el-button type="primary" size="large" @click="$router.push('/types')">
                <el-icon><Collection /></el-icon>
                开始探索Type数据
              </el-button>
              <el-button type="success" size="large" @click="$router.push('/regions')" style="margin-left: 20px;">
                <el-icon><MapLocation /></el-icon>
                开始探索Region数据
              </el-button>
            </div>
          </div>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { House, Collection, MapLocation, List, View, RefreshRight } from '@element-plus/icons-vue'

const router = useRouter()
const activeIndex = ref('1')

const handleSelect = (key, keyPath) => {
  console.log(key, keyPath)
  if (key === '2') {
    router.push('/types')
  } else if (key === '3') {
    router.push('/regions')
  } else if (key === '1') {
    router.push('/')
  }
}
</script>

<style scoped>
.home {
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

.welcome-content {
  padding: 20px 0;
}

.welcome-content p {
  font-size: 16px;
  margin-bottom: 20px;
}

.welcome-content .el-list {
  margin-bottom: 30px;
}

.welcome-content .el-list-item {
  font-size: 14px;
}

.action-buttons {
  text-align: center;
}
</style>