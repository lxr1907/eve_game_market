<template>
  <div class="video-container">
    <el-card shadow="hover" class="video-card">
      <template #header>
        <div class="card-header">
          <span class="video-title">📺 视频教程</span>
          <!-- 分类统计徽章 -->
          <span v-if="categorySummary.length > 0" class="category-badges">
            <el-tag
              v-for="cat in categorySummary"
              :key="cat.category"
              size="small"
              type="info"
              class="category-badge"
            >
              {{ cat.category }} {{ cat.count }}
            </el-tag>
          </span>
        </div>
      </template>

      <!-- 分类切换 Tab -->
      <el-tabs
        v-model="activeCategory"
        type="border-card"
        class="video-tabs"
        @tab-change="onCategoryChange"
      >
        <el-tab-pane
          v-for="tab in tabs"
          :key="tab.key"
          :label="tab.label"
          :name="tab.key"
        >
          <!-- 加载状态 -->
          <div v-if="loading" class="video-grid">
            <div class="video-item">
              <el-skeleton :rows="4" animated />
            </div>
          </div>

          <!-- 视频列表 -->
          <div v-else-if="videoList.length > 0" class="video-list">
            <div
              v-for="video in videoList"
              :key="video.bvid"
              class="video-item"
            >
              <!-- B站播放器（点击播放后显示） -->
              <div v-if="playingVideoBvid === video.bvid" class="video-wrapper">
                <iframe
                  :src="`//player.bilibili.com/player.html?bvid=${video.bvid}&page=1&high_quality=1`"
                  scrolling="no"
                  border="0"
                  frameborder="no"
                  framespacing="0"
                  allowfullscreen="true"
                />
              </div>
              <!-- 视频封面（默认显示，点击后播放） -->
              <div v-else class="video-cover" @click="playVideo(video)">
                <img
                  :src="convertHttps(video.pic)"
                  :alt="video.title"
                  class="cover-image"
                  referrerpolicy="no-referrer"
                />
                <div class="cover-overlay">
                  <div class="play-button">
                    <el-icon :size="48"><VideoPlay /></el-icon>
                  </div>
                </div>
                <!-- 时长 -->
                <div v-if="video.duration" class="cover-duration">
                  {{ formatDuration(video.duration) }}
                </div>
              </div>

              <!-- 视频信息 -->
              <div class="video-info">
                <div class="video-title-text">{{ video.title }}</div>
                <div class="video-meta">
                  <span v-if="video.pubdate" class="meta-item">
                    <el-icon><Calendar /></el-icon>
                    {{ formatDate(video.pubdate) }}
                  </span>
                  <span v-if="video.play" class="meta-item">
                    <el-icon><VideoPlay /></el-icon>
                    {{ formatNumber(video.play) }} 播放
                  </span>
                  <span v-if="video.duration" class="meta-item">
                    <el-icon><Timer /></el-icon>
                    {{ formatDuration(video.duration) }}
                  </span>
                </div>
                <div v-if="video.description" class="video-desc">
                  {{ video.description }}
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="empty-state">
            <el-empty description="该分类下暂无视频" />
          </div>

          <!-- 加载更多 -->
          <div v-if="!loading && hasMore" class="load-more-wrapper">
            <el-button
              type="primary"
              plain
              :loading="loadingMore"
              class="load-more-btn"
              @click="loadMore"
            >
              加载更多
            </el-button>
            <span class="page-hint">
              已展示 {{ videoList.length }} / {{ total }} 个
            </span>
          </div>

          <!-- 没有更多 -->
          <div v-else-if="!loading && videoList.length > 0" class="no-more-hint">
            已展示全部 {{ total }} 个视频
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { bilibiliApi } from '../services/api'
import { Calendar, VideoPlay, Timer } from '@element-plus/icons-vue'

// ── 状态 ────────────────────────────────────────────────────────────────────

const activeCategory = ref('势力战')
const videoList = ref([])
const currentOffset = ref(0)   // 相对于分类列表开头的偏移量
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const categorySummary = ref([])
const errorMsg = ref('')
const playingVideoBvid = ref('')  // 当前正在播放的视频 bvid

const tabs = [
  { key: '势力战', label: '势力战争（绕杆子）' },
  { key: '深渊',   label: '深渊入门' },
]

// ── 计算属性 ────────────────────────────────────────────────────────────────

const hasMore = computed(() => {
  // 每次加载数量不固定（首次1条，后续10条），用已展示数量判断
  return videoList.value.length < total.value
})

// ── 方法 ────────────────────────────────────────────────────────────────────

async function fetchCategories() {
  try {
    const res = await bilibiliApi.getCategories()
    if (res.success) {
      categorySummary.value = res.data
    }
  } catch (e) {
    console.error('获取分类失败:', e)
  }
}

async function fetchVideos(reset = false) {
  // 首次加载只显示1条，加载更多一次补10条
  const limit = reset ? 1 : 10

  if (reset) {
    videoList.value = []
    currentOffset.value = 0
    total.value = 0
    loading.value = true
  } else {
    loadingMore.value = true
  }

  try {
    const res = await bilibiliApi.getVideos(activeCategory.value, currentOffset.value, limit)
    if (res.success) {
      if (reset) {
        videoList.value = res.data
      } else {
        videoList.value.push(...res.data)
      }
      total.value = res.total
      // 更新偏移量，为下次加载更多做准备
      currentOffset.value += res.data.length
    }
  } catch (e) {
    console.error('获取视频失败:', e)
    errorMsg.value = '加载视频失败，请刷新重试'
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function onCategoryChange() {
  playingVideoBvid.value = ''  // 切换分类时重置播放状态
  fetchVideos(true)
}

function loadMore() {
  fetchVideos(false)
}

function playVideo(video) {
  playingVideoBvid.value = video.bvid
}

// ── 工具函数 ────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatNumber(n) {
  if (!n) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  return String(n)
}

function formatDuration(seconds) {
  if (!seconds) return ''
  const s = parseInt(seconds, 10)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function convertHttps(url) {
  if (!url) return ''
  return url.replace(/^http:\/\//, 'https://')
}

// ── 初始化 ──────────────────────────────────────────────────────────────────

onMounted(() => {
  fetchCategories()
  fetchVideos(true)
})
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
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.video-title {
  color: #fff;
  font-size: 20px;
  font-weight: bold;
}

.category-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.category-badge {
  font-size: 12px;
}

.video-tabs {
  margin-top: 10px;
}

/* Tab 样式 */
.video-tabs :deep(.el-tabs__header) {
  background-color: #1a1c26;
  border-bottom: none;
}

.video-tabs :deep(.el-tabs__nav-wrap) {
  background-color: #1a1c26;
}

.video-tabs :deep(.el-tabs__item) {
  color: #909399 !important;
  background-color: transparent !important;
  border: none !important;
  font-weight: 500;
  height: 40px;
  line-height: 40px;
}

.video-tabs :deep(.el-tabs__item.is-active) {
  color: #fff !important;
  background-color: #2d303e !important;
  border-color: #2d303e !important;
}

.video-tabs :deep(.el-tabs__item:hover) {
  color: #e0e0e0 !important;
}

.video-tabs :deep(.el-tabs__content) {
  background-color: #1a1c26;
  border: none;
  padding: 15px;
}

.video-tabs :deep(.el-tabs__nav) {
  border: none !important;
}

.video-tabs :deep(.el-tabs__active-bar) {
  display: none;
}

/* 视频列表 */
.video-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 10px 0;
}

.video-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.video-wrapper {
  width: 100%;
  max-width: 700px;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

.video-wrapper iframe {
  width: 100%;
  height: 100%;
  border: none;
}

/* 视频封面（默认显示） */
.video-cover {
  position: relative;
  width: 100%;
  max-width: 700px;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  background-color: #1a1c26;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.video-cover:hover .cover-image {
  transform: scale(1.02);
}

.cover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s ease;
}

.video-cover:hover .cover-overlay {
  background: rgba(0, 0, 0, 0.5);
}

.play-button {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #409eff;
  transition: transform 0.2s ease, background 0.2s ease;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.video-cover:hover .play-button {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 1);
}

.cover-duration {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
}

.video-info {
  width: 100%;
  max-width: 700px;
  margin-top: 12px;
}

.video-title-text {
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
  margin-bottom: 8px;
  line-height: 1.4;
}

.video-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #909399;
}

.meta-item .el-icon {
  font-size: 14px;
}

.video-desc {
  font-size: 13px;
  color: #7a7a7a;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 加载更多 */
.load-more-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 0 10px;
}

.load-more-btn {
  min-width: 160px;
}

.page-hint {
  font-size: 12px;
  color: #606266;
}

.no-more-hint {
  text-align: center;
  padding: 20px 0 10px;
  font-size: 13px;
  color: #606266;
}

/* 空状态 */
.empty-state {
  padding: 60px 20px;
}

:deep(.el-skeleton) {
  max-width: 700px;
  margin: 0 auto;
}
</style>
