<template>
  <div class="donate-container">
    <el-card shadow="hover" class="donate-card">
      <template #header>
        <div class="card-header">
          <span class="donate-title">💝 支持我们</span>
        </div>
      </template>

      <div class="donate-content">
        <!-- 左侧：捐赠说明和收款码 -->
        <div class="donate-left">
          <div class="donate-description">
            <h3>关于运营费用</h3>
            <p>
              本网站提供 EVE Online 游戏数据查询服务，包括 LP 收益计算、市场订单查询、KB 榜单等功能。
            </p>
            <p>
              服务器托管、域名维护、API 调用等都需要持续的费用支出。如果您觉得本网站对您有帮助，欢迎通过以下方式支持我们的运营。
            </p>
            <p class="highlight">
              您的每一份支持都将直接用于网站的持续运营和功能改进！
            </p>
          </div>

          <div class="payment-methods">
            <h4>支持方式</h4>
            <div class="payment-grid">
              <div class="payment-item">
                <div class="payment-icon">
                  <img src="/assets/alipay.png" alt="支付宝收款码" class="qr-code" @click="openImagePreview('/assets/alipay.png', '支付宝收款码')" />
                </div>
                <div class="payment-label">支付宝</div>
              </div>
              <div class="payment-item">
                <div class="payment-icon">
                  <img src="/assets/wechatpay.png" alt="微信支付收款码" class="qr-code" @click="openImagePreview('/assets/wechatpay.png', '微信支付收款码')" />
                </div>
                <div class="payment-label">微信支付</div>
              </div>
              <div class="payment-item">
                <div class="payment-icon">
                  <img src="/assets/qq.jpg" alt="QQ交流群" class="qr-code" @click="openImagePreview('/assets/qq.jpg', 'QQ交流群')" />
                </div>
                <div class="payment-label">QQ交流群</div>
                <div class="payment-hint">扫码加入交流群</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：捐赠记录 -->
        <div class="donate-right">
          <div class="donate-tabs">
            <el-tabs v-model="activeTab" class="donate-tabs-inner">
              <el-tab-pane label="个人捐赠" name="personal">
                <div v-if="personalDonations.length === 0" class="empty-state">
                  <el-icon size="48" class="empty-icon"><Money /></el-icon>
                  <p>暂无个人捐赠记录</p>
                </div>
                <el-table v-else :data="personalDonations" size="small" class="donate-table">
                  <el-table-column prop="donor_name" label="捐赠者" />
                  <el-table-column prop="amount" label="金额" :formatter="formatAmount" />
                  <el-table-column prop="message" label="留言" />
                  <el-table-column prop="donate_time" label="时间" :formatter="formatTime" />
                </el-table>
              </el-tab-pane>
              <el-tab-pane label="军团赞助" name="corporation">
                <div class="corporation-section">
                  <div class="corporation-ad">
                    <h4>🏛️ 军团赞助计划</h4>
                    <p>
                      如果您的军团希望获得更多曝光，可以选择军团赞助方案。赞助的军团将在本网站首页和相关页面展示军团信息，
                      包括军团名称、LOGO、简介和招募信息。
                    </p>
                    <p>
                      这是一个很好的机会来展示您的军团实力，吸引新成员加入！
                    </p>
                    <div class="sponsor-details">
                      <h5>📣 横幅广告赞助方案</h5>
                      <ul>
                        <li>💰 价格：100元/月</li>
                        <li>🎯 首页横幅广告展示</li>
                        <li>📝 军团信息展示</li>
                        <li>📢 招募信息展示</li>
                      </ul>
                      <p class="contact-info">
                        📧 如需赞助，请加入QQ群联系管理员：<strong>扫描左侧QQ交流群二维码</strong>
                      </p>
                    </div>
                  </div>
                  
                  <div v-if="corporationDonations.length === 0" class="empty-state">
                    <el-icon size="48" class="empty-icon"><User /></el-icon>
                    <p>暂无军团赞助记录</p>
                  </div>
                  <el-table v-else :data="corporationDonations" size="small" class="donate-table">
                    <el-table-column prop="corporation_name" label="军团名称" />
                    <el-table-column prop="amount" label="赞助金额" :formatter="formatAmount" />
                    <el-table-column prop="sponsor_level" label="赞助等级" />
                    <el-table-column prop="donate_time" label="赞助时间" :formatter="formatTime" />
                  </el-table>
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </div>
      </div>
    </el-card>
  </div>

  <!-- 图片预览弹窗 -->
  <div v-if="showImagePreview" class="image-preview-overlay" @click="closeImagePreview">
    <div class="image-preview-container" @click.stop>
      <div class="image-preview-header">
        <span>{{ previewImageTitle }}</span>
        <button class="close-btn" @click="closeImagePreview">
          关闭
        </button>
      </div>
      <img :src="previewImageUrl" :alt="previewImageTitle" class="preview-image" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Money, User } from '@element-plus/icons-vue'

const activeTab = ref('corporation')

// 图片预览
const showImagePreview = ref(false)
const previewImageUrl = ref('')
const previewImageTitle = ref('')

const openImagePreview = (url, title) => {
  previewImageUrl.value = url
  previewImageTitle.value = title
  showImagePreview.value = true
}

const closeImagePreview = () => {
  showImagePreview.value = false
}

// Mock 数据 - 个人捐赠记录
const personalDonations = ref([
  { id: 1, donor_name: '飞行员小明', amount: 50, message: '支持一下', donate_time: '2026-05-15 14:30:00' },
  { id: 2, donor_name: 'EVE爱好者', amount: 100, message: '网站做得很好', donate_time: '2026-05-14 09:15:00' },
  { id: 3, donor_name: '老舰长', amount: 200, message: '持续支持', donate_time: '2026-05-13 20:45:00' },
  { id: 4, donor_name: '新玩家', amount: 30, message: '谢谢提供这么好的工具', donate_time: '2026-05-12 16:20:00' },
  { id: 5, donor_name: '匿名玩家', amount: 150, message: '', donate_time: '2026-05-11 11:00:00' }
])

// Mock 数据 - 军团赞助记录
const corporationDonations = ref([
  { id: 1, corporation_name: '星际联邦', amount: 1000, sponsor_level: '黄金赞助', donate_time: '2026-05-10 00:00:00' },
  { id: 2, corporation_name: '银河守护者', amount: 500, sponsor_level: '白银赞助', donate_time: '2026-05-08 00:00:00' }
])

const formatAmount = (row) => {
  return `${row.amount} 元`
}

const formatTime = (row) => {
  return row.donate_time
}


</script>

<style scoped>
.donate-container {
  padding: 20px;
}

.donate-card {
  margin: 0 auto;
  max-width: 1200px;
}

.card-header {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
}

.donate-title {
  color: #fff;
}

.donate-content {
  display: flex;
  gap: 30px;
}

.donate-left {
  flex: 1;
  min-width: 400px;
}

.donate-description {
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.donate-description h3 {
  margin-top: 0;
  color: #409eff;
  font-size: 18px;
}

.donate-description p {
  line-height: 1.8;
  color: #606266;
  margin: 10px 0;
}

.donate-description .highlight {
  background-color: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 10px 15px;
  margin-top: 15px;
  border-radius: 0 4px 4px 0;
}

.payment-methods {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.payment-methods h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #303133;
}

.payment-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.payment-item {
  flex: 1;
  text-align: center;
}

.payment-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-code {
  width: 150px;
  max-height: 200px;
  object-fit: contain;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 5px;
  background: #fff;
  cursor: pointer;
}

.payment-label {
  margin-top: 10px;
  font-weight: 500;
}

.payment-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.payment-label {
  color: #606266;
}

.donate-right {
  flex: 1;
  min-width: 400px;
}

.donate-tabs-inner {
  height: 100%;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #909399;
}

.empty-icon {
  margin-bottom: 10px;
  color: #c0c4cc;
}

.donate-table {
  margin-top: 10px;
}

.corporation-section {
  padding: 10px;
}

.corporation-ad {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.corporation-ad h4 {
  margin-top: 0;
}

.corporation-ad p {
  line-height: 1.8;
  opacity: 0.9;
}

.sponsor-details {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 15px;
  margin-top: 15px;
}

.sponsor-details h5 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 15px;
}

.sponsor-details ul {
  margin: 0;
  padding-left: 20px;
  list-style: none;
}

.sponsor-details li {
  padding: 5px 0;
}

.contact-info {
  margin-top: 15px;
  font-size: 14px;
  opacity: 0.95 !important;
}

/* 图片预览弹窗样式 */
.image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.image-preview-container {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  max-width: 90vw;
  max-height: 90vh;
  position: relative;
}

.image-preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e4e7ed;
}

.image-preview-header span {
  font-weight: 600;
  font-size: 16px;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #909399;
  font-size: 20px;
  padding: 5px;
}

.close-btn:hover {
  color: #606266;
}

.preview-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 8px;
}
</style>
