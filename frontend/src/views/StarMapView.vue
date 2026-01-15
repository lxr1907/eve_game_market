<template>
  <div class="star-map-container">
    <h1>星图</h1>
    <div id="starMapChart" style="width: 100%; height: 800px;"></div>
    <div class="controls">
      <label for="datasource">数据源：</label>
      <select id="datasource" v-model="selectedDatasource" @change="loadData">
        <option value="infinity">曙光</option>
        <option value="serenity">晨曦</option>
        <option value="tranquility">欧服</option>
      </select>
      <button @click="resetView">重置视图</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts';
import { starMapApi } from '../services/api';

let chart = null;
const selectedDatasource = ref('infinity');

// 初始化图表
const initChart = () => {
  const chartDom = document.getElementById('starMapChart');
  chart = echarts.init(chartDom);
  
  const option = {
    title: {
      text: '星门连接图',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        if (params.dataType === 'node') {
          return `系统: ${params.name || params.data.system_id}<br/>安全状态: ${params.data.security_status.toFixed(2)}`;
        } else {
          return `连接: ${params.data.source} -> ${params.data.target}`;
        }
      }
    },
    animationDurationUpdate: 1500,
    animationEasingUpdate: 'quinticInOut',
    series: [
      {
        type: 'graph',
        layout: 'force',
        force: {
          repulsion: 150,
          edgeLength: 60
        },
        data: [],
        links: [],
        roam: true,
        symbolSize: 30,
        label: {
          show: true,
          formatter: (params) => {
            return `${params.name}\n${params.data.security_status.toFixed(2)}`;
          },
          fontSize: 10,
          lineHeight: 12,
          position: 'top',
          color: '#ffffff',
          borderWidth: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
          shadowBlur: 3
        },
        lineStyle: {
          color: '#aaa',
          width: 1,
          curveness: 0
        }
      }
    ]
  };
  
  chart.setOption(option);
};

// 加载数据
const loadData = async () => {
  try {
    const data = await starMapApi.getStarMapData(selectedDatasource.value);
    updateChart(data);
  } catch (error) {
    console.error('Failed to load star map data:', error);
  }
};

// 更新图表
const updateChart = (data) => {
  if (!chart) return;
  
  console.log('Received star map data:', data);
  
  // 确保nodes和links是数组
  const nodes = Array.isArray(data.nodes) ? data.nodes : [];
  const links = Array.isArray(data.links) ? data.links : [];
  
  // 确保每个节点都有id和name字段，并且id是字符串类型
  // 根据security_status设置节点颜色
  const validNodes = nodes.map(node => {
    const securityStatus = node.security_status || 0;
    let color;
    
    if (securityStatus >= 0.5) {
      color = '#52c41a'; // 绿色
    } else if (securityStatus > 0) {
      color = '#fa8c16'; // 橘色
    } else {
      color = '#f5222d'; // 红色
    }
    
    return {
      id: String(node.id || node.system_id),
      name: node.name || node.id || node.system_id,
      system_id: node.system_id || node.id,
      security_status: securityStatus,
      itemStyle: {
        color: color
      }
    };
  });
  
  // 确保每个link都有source和target字段，并且都是字符串类型
  const validLinks = links.filter(link => link.source && link.target).map(link => ({
    source: String(link.source),
    target: String(link.target)
  }));
  
  console.log('Processed nodes:', validNodes.length);
  console.log('Processed links:', validLinks.length);
  
  // 只更新数据，不重写整个series配置
  chart.setOption({
    series: [
      {
        data: validNodes,
        links: validLinks
      }
    ]
  });
};

// 重置视图
const resetView = () => {
  if (chart) {
    chart.dispatchAction({
      type: 'restore'
    });
  }
};

// 窗口大小变化时调整图表
const handleResize = () => {
  if (chart) {
    chart.resize();
  }
};

onMounted(() => {
  initChart();
  loadData();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  if (chart) {
    chart.dispose();
    chart = null;
  }
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.star-map-container {
  padding: 20px;
}

.controls {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  align-items: center;
}

select, button {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

button {
  background-color: #409eff;
  color: white;
  cursor: pointer;
  border: none;
}

button:hover {
  background-color: #66b1ff;
}
</style>