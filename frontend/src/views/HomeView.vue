<template>
  <div class="home">
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
  </div>
</template>

<script setup>
import { List, View, RefreshRight } from '@element-plus/icons-vue'
</script>

<style scoped>
.home {
  min-height: 100vh;
  background-color: transparent;
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