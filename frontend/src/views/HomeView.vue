<template>
  <div class="home-container">
    <!-- 顶部标题区 -->
    <header class="hero-section">
      <h1 class="main-title">EVE 绕杆子工具站</h1>
      <p class="subtitle">专为EVE Online玩家打造的LP收益分析工具</p>
    </header>

    <!-- 绕杆子玩法介绍 -->
    <section class="intro-section">
      <el-card class="intro-card">
        <template #header>
          <div class="card-header">
            <el-icon><InfoFilled /></el-icon>
            <span>什么是"绕杆子"？</span>
          </div>
        </template>
        <div class="intro-content">
          <p>"绕杆子"是EVE Online中一种经典的PVE玩法，指玩家驾驶飞船围绕空间信标（俗称"杆子"）进行环绕飞行，同时与NPC敌人战斗。</p>
          <div class="intro-features">
            <div class="feature-item">
              <el-icon><CircleCheck /></el-icon>
              <span>通过完成忠诚点(LP)任务获取奖励</span>
            </div>
            <div class="feature-item">
              <el-icon><CircleCheck /></el-icon>
              <span>兑换高价值蓝图和装备</span>
            </div>
            <div class="feature-item">
              <el-icon><CircleCheck /></el-icon>
              <span>稳定高效的ISK收入来源</span>
            </div>
          </div>
        </div>
      </el-card>
    </section>

    <!-- 两大特色模块 -->
    <section class="modules-section">
      <h2 class="section-title">核心功能模块</h2>
      <div class="modules-grid">
        <!-- LP收益数据模块 -->
        <el-card class="module-card" shadow="hover">
          <div class="module-icon lp-icon">
            <el-icon><DataLine /></el-icon>
          </div>
          <h3 class="module-title">LP收益数据</h3>
          <p class="module-desc">
            实时分析各军团LP商店的兑换物品，计算每LP收益、总利润等关键指标，
            帮助您找到最具性价比的兑换选择。
          </p>
          <div class="module-features">
            <el-tag size="small" type="success">实时数据</el-tag>
            <el-tag size="small" type="success">多军团对比</el-tag>
            <el-tag size="small" type="success">收益排序</el-tag>
          </div>
          <el-button 
            type="primary" 
            size="large" 
            class="module-btn"
            @click="$router.push('/profit-data')"
          >
            查看LP收益
            <el-icon class="el-icon--right"><ArrowRight /></el-icon>
          </el-button>
        </el-card>

        <!-- LP蓝图制造模块 -->
        <el-card class="module-card" shadow="hover">
          <div class="module-icon blueprint-icon">
            <el-icon><DocumentChecked /></el-icon>
          </div>
          <h3 class="module-title">LP蓝图制造</h3>
          <p class="module-desc">
            专注于LP商店中的制造蓝图，自动计算制造成本、材料费用、
            预期收益，让蓝图制造决策更加科学高效。
          </p>
          <div class="module-features">
            <el-tag size="small" type="warning">自动计算</el-tag>
            <el-tag size="small" type="warning">成本分析</el-tag>
            <el-tag size="small" type="warning">收益预测</el-tag>
          </div>
          <el-button 
            type="warning" 
            size="large" 
            class="module-btn"
            @click="$router.push('/lp-blueprint')"
          >
            查看蓝图制造
            <el-icon class="el-icon--right"><ArrowRight /></el-icon>
          </el-button>
        </el-card>
      </div>
    </section>

    <!-- 使用提示 -->
    <section class="tips-section">
      <el-card class="tips-card">
        <template #header>
          <div class="card-header">
            <el-icon><Warning /></el-icon>
            <span>使用提示</span>
          </div>
        </template>
        <ul class="tips-list">
          <li>数据来源于游戏市场实时订单，建议定期刷新获取最新价格</li>
          <li>LP兑换比例固定为 1300 ISK/LP，可根据实际市场情况调整</li>
          <li>制造成本计算包含材料费用和LP兑换成本</li>
          <li>收益数据仅供参考，实际交易价格可能有所波动</li>
        </ul>
      </el-card>
    </section>

    <!-- 页脚 -->
    <footer class="footer">
      <p>EVE Online 绕杆子工具站 | 数据仅供参考</p>
    </footer>
  </div>
</template>

<script setup>
import { 
  InfoFilled, 
  CircleCheck, 
  DataLine, 
  DocumentChecked, 
  ArrowRight,
  Warning 
} from '@element-plus/icons-vue'
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f1419 0%, #1a2332 100%);
  padding: 40px 20px;
  color: #e0e6ed;
}

/* 顶部标题区 */
.hero-section {
  text-align: center;
  margin-bottom: 50px;
}

.main-title {
  font-size: 42px;
  font-weight: 700;
  background: linear-gradient(90deg, #409eff, #67c23a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 15px;
  text-shadow: 0 0 30px rgba(64, 158, 255, 0.3);
}

.subtitle {
  font-size: 18px;
  color: #909399;
  font-weight: 400;
}

/* 介绍区 */
.intro-section {
  max-width: 900px;
  margin: 0 auto 50px;
}

.intro-card {
  background: rgba(30, 35, 48, 0.8);
  border: 1px solid #2d303e;
}

.intro-card :deep(.el-card__header) {
  background: rgba(64, 158, 255, 0.1);
  border-bottom: 1px solid #2d303e;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #409eff;
}

.intro-content p {
  font-size: 15px;
  line-height: 1.8;
  color: #c0c4cc;
  margin-bottom: 20px;
}

.intro-features {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #e0e6ed;
}

.feature-item .el-icon {
  color: #67c23a;
  font-size: 18px;
}

/* 模块区 */
.modules-section {
  max-width: 1100px;
  margin: 0 auto 50px;
}

.section-title {
  text-align: center;
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 35px;
  color: #e0e6ed;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 30px;
}

.module-card {
  background: rgba(30, 35, 48, 0.8);
  border: 1px solid #2d303e;
  text-align: center;
  padding: 20px;
  transition: transform 0.3s, box-shadow 0.3s;
}

.module-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.module-icon {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  font-size: 32px;
}

.lp-icon {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.2), rgba(64, 158, 255, 0.1));
  color: #409eff;
  border: 2px solid rgba(64, 158, 255, 0.3);
}

.blueprint-icon {
  background: linear-gradient(135deg, rgba(230, 162, 60, 0.2), rgba(230, 162, 60, 0.1));
  color: #e6a23c;
  border: 2px solid rgba(230, 162, 60, 0.3);
}

.module-title {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 15px;
  color: #e0e6ed;
}

.module-desc {
  font-size: 14px;
  line-height: 1.7;
  color: #a0a8b8;
  margin-bottom: 20px;
  min-height: 70px;
}

.module-features {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 25px;
  flex-wrap: wrap;
}

.module-btn {
  width: 100%;
  font-weight: 600;
}

/* 提示区 */
.tips-section {
  max-width: 900px;
  margin: 0 auto 40px;
}

.tips-card {
  background: rgba(30, 35, 48, 0.6);
  border: 1px solid #2d303e;
}

.tips-card :deep(.el-card__header) {
  background: rgba(230, 162, 60, 0.1);
  border-bottom: 1px solid #2d303e;
}

.tips-card .card-header {
  color: #e6a23c;
}

.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips-list li {
  padding: 10px 0;
  border-bottom: 1px solid #2d303e;
  font-size: 14px;
  color: #a0a8b8;
  position: relative;
  padding-left: 20px;
}

.tips-list li:last-child {
  border-bottom: none;
}

.tips-list li::before {
  content: '•';
  color: #409eff;
  position: absolute;
  left: 0;
  font-size: 18px;
  line-height: 1.2;
}

/* 页脚 */
.footer {
  text-align: center;
  padding-top: 30px;
  border-top: 1px solid #2d303e;
  color: #606266;
  font-size: 13px;
}

/* 响应式 */
@media (max-width: 768px) {
  .main-title {
    font-size: 32px;
  }
  
  .modules-grid {
    grid-template-columns: 1fr;
  }
  
  .module-card {
    padding: 15px;
  }
}
</style>
