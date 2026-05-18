<template>
  <div class="video-container">
    <el-card shadow="hover" class="video-card">
      <template #header>
        <div class="card-header">
          <span class="video-title">📺 视频教程</span>
        </div>
      </template>

      <el-tabs v-model="activeCategory" type="border-card" class="video-tabs">
        <el-tab-pane label="势力战争（绕杆子）" name="fw">
          <div class="video-grid">
            <div class="video-item">
              <div class="video-wrapper">
                <iframe
                  src="//player.bilibili.com/player.html?bvid=BV11xkDBdEZL&page=1"
                  scrolling="no"
                  border="0"
                  frameborder="no"
                  framespacing="0"
                  allowfullscreen="true"
                />
              </div>
              <div class="video-title-text">势力战争绕杆子教程</div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="深渊入门" name="abyssal">
          <div class="video-grid">
            <div class="empty-state">
              <p>深渊入门视频正在准备中，敬请期待...</p>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const activeCategory = ref('fw')
</script>

<style scoped>
.video-container {
  padding: 20px;
}

.video-card {
  margin: 0 auto;
  max-width: 1200px;
}

.card-header {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
}

.video-title {
  color: #fff;
}

.video-tabs {
  margin-top: 10px;
}

.video-tabs:deep(.el-tabs__header) {
  background-color: #1a1c26;
  border-bottom: none;
}

.video-tabs:deep(.el-tabs__nav-wrap) {
  background-color: #1a1c26;
}

.video-tabs:deep(.el-tabs__item) {
  color: #909399 !important;
  background-color: transparent !important;
  border: none !important;
  font-weight: 500;
  height: 40px;
  line-height: 40px;
}

.video-tabs:deep(.el-tabs__item.is-active) {
  color: #fff !important;
  background-color: #2d303e !important;
  border-color: #2d303e !important;
}

.video-tabs:deep(.el-tabs__item:hover) {
  color: #e0e0e0 !important;
}

.video-tabs:deep(.el-tabs__content) {
  background-color: #1a1c26;
  border: none;
  padding: 15px;
}

.video-tabs:deep(.el-tabs__nav) {
  border: none !important;
}

.video-tabs:deep(.el-tabs__active-bar) {
  display: none;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(560px, 1fr));
  gap: 20px;
  padding: 10px 0;
}

.video-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.video-wrapper {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.video-wrapper iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.video-title-text {
  margin-top: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #e0e0e0;
  text-align: center;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: #909399;
  font-size: 16px;
}

.video-wrapper {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}
</style>
