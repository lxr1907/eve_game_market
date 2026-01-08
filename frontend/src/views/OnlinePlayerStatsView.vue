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

      <!-- 图表展示 -->
      <div class="chart-container">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <span>在线玩家数量趋势</span>
          </template>
          <v-chart
            v-loading="loading"
            :option="chartOption"
            autoresize
            style="width: 100%; height: 400px;"
          />
        </el-card>
      </div>

      <!-- 表格数据 -->
      <el-card shadow="hover" class="table-card">
        <template #header>
          <span>详细数据</span>
        </template>
        <el-table v-loading="loading" :data="statsData" style="width: 100%">
          <el-table-column prop="recorded_at" label="记录时间" width="180">
            <template #default="scope">
              {{ formatDateTime(scope.row.recorded_at) }}
            </template>
          </el-table-column>
          
          <!-- 根据数据类型显示不同的列 -->
          <template v-if="statsData.length > 0 && 'avg_players' in statsData[0]">
            <!-- 聚合数据列 -->
            <el-table-column prop="avg_players" label="平均在线玩家数" width="120" align="right">
              <template #default="scope">
                {{ Math.round(scope.row.avg_players) }}
              </template>
            </el-table-column>
            <el-table-column prop="max_players" label="最高在线玩家数" width="120" align="right">
              <template #default="scope">
                {{ Math.round(scope.row.max_players) }}
              </template>
            </el-table-column>
            <el-table-column prop="min_players" label="最低在线玩家数" width="120" align="right">
              <template #default="scope">
                {{ Math.round(scope.row.min_players) }}
              </template>
            </el-table-column>
            <el-table-column prop="data_points" label="数据点数量" width="100" align="center" />
          </template>
          <template v-else>
            <!-- 原始数据列 -->
            <el-table-column prop="players" label="在线玩家数" width="120" align="right" />
            <el-table-column prop="server_version" label="服务器版本" width="180" />
            <el-table-column prop="vip" label="VIP模式" width="80" align="center">
              <template #default="scope">
                <el-tag type="success" v-if="scope.row.vip">是</el-tag>
                <el-tag type="info" v-else>否</el-tag>
              </template>
            </el-table-column>
          </template>
        </el-table>

        <div class="pagination" v-if="total > 0">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="total"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
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
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const timeDimension = ref('hour') // 默认为按小时展示

// 格式化日期时间
const formatDateTime = (datetime) => {
  if (!datetime) return ''
  const date = new Date(datetime)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 格式化时间维度的标签
const formatTimeLabel = (datetime) => {
  if (!datetime) return ''
  const date = new Date(datetime)
  
  switch (timeDimension.value) {
    case 'month':
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit'
      })
    case 'day':
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit'
      })
    case 'hour':
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit'
      })
    case 'minute':
      return date.toLocaleString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
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
        page: currentPage.value,
        limit: pageSize.value,
        dimension: timeDimension.value
      }
    })
    statsData.value = response.data.data
    total.value = response.data.pagination.total
  } catch (error) {
    console.error('获取在线玩家统计失败:', error)
    ElMessage.error('获取在线玩家统计失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 图表配置
const chartOption = computed(() => {
  const dates = statsData.value.map(item => formatTimeLabel(item.recorded_at))
  
  // 检查是否是聚合数据
  const isAggregatedData = statsData.value.length > 0 && 'avg_players' in statsData.value[0]
  
  // 根据数据类型获取不同的玩家数据
  let players, maxPlayers, minPlayers
  if (isAggregatedData) {
    players = statsData.value.map(item => Math.round(item.avg_players))
    maxPlayers = statsData.value.map(item => Math.round(item.max_players))
    minPlayers = statsData.value.map(item => Math.round(item.min_players))
  } else {
    players = statsData.value.map(item => item.players)
    maxPlayers = players
    minPlayers = players
  }
  
  // 构建系列数据
  const series = [
    {
      name: isAggregatedData ? '平均在线玩家数' : '在线玩家数',
      type: 'line',
      data: players,
      smooth: true,
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0, color: 'rgba(64, 158, 255, 0.3)'
          }, {
            offset: 1, color: 'rgba(64, 158, 255, 0.05)'
          }]
        }
      },
      lineStyle: {
        color: '#409EFF'
      },
      itemStyle: {
        color: '#409EFF'
      }
    }
  ]
  
  // 如果是聚合数据，添加最高和最低玩家数曲线
  if (isAggregatedData) {
    series.push(
      {
        name: '最高在线玩家数',
        type: 'line',
        data: maxPlayers,
        smooth: true,
        lineStyle: {
          color: '#67C23A',
          width: 2
        },
        itemStyle: {
          color: '#67C23A'
        },
        symbol: 'circle',
        symbolSize: 6
      },
      {
        name: '最低在线玩家数',
        type: 'line',
        data: minPlayers,
        smooth: true,
        lineStyle: {
          color: '#F56C6C',
          width: 2
        },
        itemStyle: {
          color: '#F56C6C'
        },
        symbol: 'circle',
        symbolSize: 6
      }
    )
  }
  
  return {
    title: {
      text: '在线玩家数量趋势',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        let result = `${params[0].name}<br/>`
        params.forEach(param => {
          result += `${param.marker}${param.seriesName}: ${param.value}<br/>`
        })
        
        // 如果是聚合数据，添加数据点数量信息
        if (isAggregatedData && params.length > 0) {
          const index = params[0].dataIndex
          const dataPoint = statsData.value[index]
          if (dataPoint) {
            result += `数据点数量: ${dataPoint.data_points}`
          }
        }
        
        return result
      }
    },
    legend: {
      data: series.map(s => s.name),
      top: 30
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel: {
        rotate: timeDimension.value === 'minute' ? 45 : 0
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1
    },
    series: series
  }
})

// 分页处理
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchStats()
}

const handleCurrentChange = (current) => {
  currentPage.value = current
  fetchStats()
}

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

/* 图表容器样式 */
.chart-container {
  margin-bottom: 20px;
}

.chart-card {
  margin-bottom: 20px;
}

/* 表格卡片样式 */
.table-card {
  margin-top: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>