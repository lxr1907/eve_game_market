<template>
  <div class="online-player-stats">
    <el-card shadow="hover" class="stats-card">
      <template #header>
        <div class="card-header">
          <span>在线玩家统计</span>
          <el-button type="primary" size="small" @click="fetchStats">
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </div>
      </template>

      <!-- 时间维度选择 -->
      <div class="time-dimension-selector">
        <el-radio-group v-model="timeDimension" @change="fetchStats">
          <el-radio-button label="month">按月</el-radio-button>
          <el-radio-button label="day">按日</el-radio-button>
          <el-radio-button label="hour">按小时</el-radio-button>
          <el-radio-button label="minute">按分钟</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 数据源选择 -->
      <div class="datasource-selector">
        <el-radio-group v-model="datasource" @change="fetchStats">
          <el-radio-button label="serenity">晨曦</el-radio-button>
          <el-radio-button label="infinity">曙光</el-radio-button>
          <el-radio-button label="tranquility">欧服</el-radio-button>
          <el-radio-button label="all">全部</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 图表展示 -->
      <div class="chart-container">
        <el-card shadow="hover" class="chart-card">
          <template #header>
          </template>
          <v-chart
            v-loading="loading"
            :option="chartOption"
            autoresize
            style="width: 100%; height: 400px;"
          />
        </el-card>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import axios from 'axios'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import {
  LineChart
} from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 注册 ECharts 组件
use([
  LineChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  CanvasRenderer
])

// 状态管理
const loading = ref(false)
const statsData = ref([])
const timeDimension = ref('hour') // 默认为按小时展示
const datasource = ref('serenity') // 默认为晨曦数据源

// 格式化日期时间（东八区）
const formatDateTime = (datetime) => {
  if (!datetime) return ''
  const date = new Date(datetime)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Shanghai'
  })
}

// 格式化时间维度的标签（东八区）
const formatTimeLabel = (datetime) => {
  if (!datetime) return ''
  const date = new Date(datetime)
  
  switch (timeDimension.value) {
    case 'month':
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        timeZone: 'Asia/Shanghai'
      })
    case 'day':
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Shanghai'
      })
    case 'hour':
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        timeZone: 'Asia/Shanghai'
      })
    case 'minute':
      return date.toLocaleString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Shanghai'
      })
    default:
      return formatDateTime(datetime)
  }
}

// 获取统计数据
const fetchStats = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/online-player-stats', {
      params: {
        page: 1,
        limit: 100, // 增加默认限制以获取更多数据用于图表
        dimension: timeDimension.value,
        datasource: datasource.value // 直接传递'all'或具体数据源
      }
    })
    // 反转数据顺序，使图表从左到右展示从24小时前到当前时间的数据
    statsData.value = response.data.data.reverse()
  } catch (error) {
    console.error('获取在线玩家统计失败:', error)
    ElMessage.error('获取在线玩家统计失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 图表配置
const chartOption = computed(() => {
  if (statsData.value.length === 0) {
    // 如果没有数据，返回空图表配置
    return {
      backgroundColor: '#1e1e1e',
      textStyle: { color: '#e0e0e0' },
      title: { text: '', left: 'center', textStyle: { color: '#ffffff' } },
      tooltip: { trigger: 'axis' },
      legend: { show: false },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: { type: 'category', data: [], axisLabel: { color: '#e0e0e0' } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#e0e0e0' } },
      series: []
    }
  }

  // 检查是否是聚合数据
  const isAggregatedData = 'avg_players' in statsData.value[0]
  // 检查是否有多个数据源
  const hasMultipleDatasources = datasource === 'all' || 
                                (statsData.value.some(item => item.datasource) && 
                                new Set(statsData.value.map(item => item.datasource)).size > 1)

  let series = []
  let dates = []

  if (hasMultipleDatasources) {
    // 多数据源情况：按数据源分组
    const groupedData = {}
    const datasources = [...new Set(statsData.value.map(item => item.datasource))]
    const allDates = [...new Set(statsData.value.map(item => item.recorded_at))].sort()
    dates = allDates.map(date => formatTimeLabel(date))

    // 初始化分组数据
    datasources.forEach(source => {
      groupedData[source] = { dates: allDates, players: [] }
    })

    // 填充数据，确保每个时间点都有数据（如果没有则使用null）
    allDates.forEach(date => {
      datasources.forEach(source => {
        const dataPoint = statsData.value.find(item => item.recorded_at === date && item.datasource === source)
        if (dataPoint) {
          if (isAggregatedData) {
            groupedData[source].players.push(Math.round(dataPoint.avg_players))
          } else {
            groupedData[source].players.push(dataPoint.players)
          }
        } else {
          groupedData[source].players.push(null)
        }
      })
    })

    // 为每个数据源创建系列
    const sourceColors = {
      'serenity': '#409EFF',
      'infinity': '#67C23A',
      'tranquility': '#F56C6C'
    }

    const sourceNames = {
      'serenity': '晨曦',
      'infinity': '曙光',
      'tranquility': '欧服'
    }

    datasources.forEach(source => {
      const color = sourceColors[source] || '#909399'
      const name = sourceNames[source] || source
      
      // 添加主系列（平均/实际玩家数）
      series.push({
        name: isAggregatedData ? `${name}平均在线玩家数` : `${name}在线玩家数`,
        type: 'line',
        data: groupedData[source].players,
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: color.replace('1)', '0.3)') },
              { offset: 1, color: color.replace('1)', '0.05)') }
            ]
          }
        },
        lineStyle: { color: color },
        itemStyle: { color: color }
      })
    })
  } else {
    // 单数据源情况：使用原有逻辑
    dates = statsData.value.map(item => formatTimeLabel(item.recorded_at))
    
    // 根据数据类型获取不同的玩家数据
    let players
    if (isAggregatedData) {
      players = statsData.value.map(item => Math.round(item.avg_players))
    } else {
      players = statsData.value.map(item => item.players)
    }
    
    // 构建系列数据
    series = [
      {
        name: isAggregatedData ? '平均在线玩家数' : '在线玩家数',
        type: 'line',
        data: players,
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
              { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
            ]
          }
        },
        lineStyle: { color: '#409EFF' },
        itemStyle: { color: '#409EFF' }
      }
    ]
  }
  
  return {
    backgroundColor: '#1e1e1e',
    textStyle: { color: '#e0e0e0' },
    title: { text: '', left: 'center', textStyle: { color: '#ffffff' } },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(44, 62, 80, 0.9)',
      borderColor: '#333',
      textStyle: { color: '#e0e0e0' },
      formatter: (params) => {
        let result = `${params[0].name}<br/>`
        params.forEach(param => {
          if (param.value !== null) {
            result += `${param.marker}${param.seriesName}: ${param.value}<br/>`
          }
        })
        return result
      }
    },
    legend: {
      data: series.map(s => s.name),
      top: 30,
      textStyle: { color: '#e0e0e0' },
      itemWidth: 12,
      itemHeight: 12
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
      backgroundColor: 'transparent'
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel: {
        rotate: timeDimension.value === 'minute' ? 45 : 0,
        color: '#e0e0e0'
      },
      axisLine: { lineStyle: { color: '#333' } },
      axisTick: { lineStyle: { color: '#333' } },
      splitLine: { lineStyle: { color: '#333', type: 'dashed' } }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#e0e0e0' },
      axisLine: { lineStyle: { color: '#333' } },
      axisTick: { lineStyle: { color: '#333' } },
      splitLine: { lineStyle: { color: '#333', type: 'dashed' } }
    },
    series: series
  }
})

// 组件挂载时获取数据
onMounted(() => {
  fetchStats()
})
</script>

<style scoped>
.online-player-stats {
  padding: 20px;
}

.stats-card {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 时间维度选择器样式 */
.time-dimension-selector {
  margin: 20px 0;
  display: flex;
  justify-content: center;
}

/* 数据源选择器样式 */
.datasource-selector {
  margin: 10px 0 20px 0;
  display: flex;
  justify-content: center;
}

/* 图表容器样式 */
.chart-container {
  margin-bottom: 20px;
}

.chart-card {
  margin-bottom: 20px;
}

/* 单选按钮组样式 - 确保选中和未选中状态有明显区别 */
:deep(.el-radio-button__inner) {
  background-color: #2c3e50;
  border-color: #333;
  color: #e0e0e0;
}

:deep(.el-radio-button__inner:hover) {
  background-color: #34495e;
  color: #ffffff;
  border-color: #409eff;
}

:deep(.el-radio-button__orig-radio:checked + .el-radio-button__inner) {
  background-color: #409eff;
  border-color: #409eff;
  color: #ffffff;
}

:deep(.el-radio-button:first-child .el-radio-button__inner) {
  border-radius: 4px 0 0 4px;
}

:deep(.el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 0 4px 4px 0;
}
</style>