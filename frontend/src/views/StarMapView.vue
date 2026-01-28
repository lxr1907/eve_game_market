<template>
  <div class="star-map-container">
    <div id="starMapChart" style="width: 100%; height: 800px;"></div>
    <div class="controls">
    <label for="datasource">数据源：</label>
    <select id="datasource" v-model="selectedDatasource" @change="loadData">
      <option value="infinity">曙光</option>
      <option value="serenity">晨曦</option>
      <option value="tranquility">欧服</option>
    </select>
    <label for="systemFilter">过滤：</label>
    <select id="systemFilter" v-model="systemFilter" @change="loadData">
      <option value="active">活跃</option>
      <option value="all">全部</option>
    </select>
    <label for="securityFilter">安全状态：</label>
    <select id="securityFilter" v-model="securityFilter" @change="loadData">
      <option value="all">全部</option>
      <option value="highsec">高安 (≥0.5)</option>
      <option value="highsec9">高安全 (≥0.9)</option>
      <option value="lowsec">低安 (0-0.5)</option>
      <option value="nullsec">00 (≤0)</option>
    </select>
    <label for="searchInput">搜索：</label>
    <input 
      id="searchInput" 
      v-model="searchQuery" 
      @input="handleSearch"
      placeholder="输入星系名称搜索"
      style="padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; width: 200px;"
    />
    <button @click="resetView">重置视图</button>
  </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts';
import { starMapApi } from '../services/api';

let chart = null;
const selectedDatasource = ref('serenity');
const systemFilter = ref('active'); // 默认选择活跃
const securityFilter = ref('all'); // 默认选择全部安全状态
const searchQuery = ref(''); // 搜索查询
let allNodes = []; // 存储所有节点数据
let allLinks = []; // 存储所有连接数据

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
    const data = await starMapApi.getStarMapData(selectedDatasource.value, systemFilter.value, securityFilter.value);
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
  
  // 存储所有节点和连接数据用于搜索
  allNodes = nodes;
  allLinks = links;
  
  // 确保每个节点都有id和name字段，并且id是字符串类型
  // 根据security_status设置节点颜色
  const validNodes = nodes.map(node => {
    const securityStatus = node.security_status || 0;
    let color;
    
    if (securityStatus >= 0.7) {
      color = '#1890ff'; // 蓝色
    } else if (securityStatus >= 0.5) {
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

// 搜索处理函数
const handleSearch = () => {
  if (!chart || !allNodes.length) return;
  
  const query = searchQuery.value.trim().toLowerCase();
  
  if (!query) {
    // 如果搜索框为空，显示所有节点和连接
    const validNodes = allNodes.map(node => {
      const securityStatus = node.security_status || 0;
      let color;
      
      if (securityStatus >= 0.7) {
        color = '#1890ff';
      } else if (securityStatus >= 0.5) {
        color = '#52c41a';
      } else if (securityStatus > 0) {
        color = '#fa8c16';
      } else {
        color = '#f5222d';
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
    
    const validLinks = allLinks.filter(link => link.source && link.target).map(link => ({
      source: String(link.source),
      target: String(link.target)
    }));
    
    chart.setOption({
      series: [
        {
          data: validNodes,
          links: validLinks
        }
      ]
    });
    return;
  }
  
  // 模糊搜索匹配的节点
  const matchedNodes = allNodes.filter(node => {
    const name = String(node.name || '').toLowerCase();
    return name.includes(query);
  });
  
  if (matchedNodes.length === 0) {
    // 如果没有匹配的节点，显示空图表
    chart.setOption({
      series: [
        {
          data: [],
          links: []
        }
      ]
    });
    return;
  }
  
  // 获取匹配节点的ID集合
  const matchedNodeIds = new Set(matchedNodes.map(node => String(node.id || node.system_id)));
  
  // 获取与匹配节点相关的连接
  const matchedLinks = allLinks.filter(link => {
    return matchedNodeIds.has(String(link.source)) || matchedNodeIds.has(String(link.target));
  });
  
  // 获取连接到的所有节点ID（包括匹配节点和它们的邻居）
  const connectedNodeIds = new Set(matchedNodeIds);
  matchedLinks.forEach(link => {
    connectedNodeIds.add(String(link.source));
    connectedNodeIds.add(String(link.target));
  });
  
  // 构建要显示的节点（匹配节点及其邻居）
  const displayNodes = allNodes.filter(node => {
    return connectedNodeIds.has(String(node.id || node.system_id));
  }).map(node => {
    const nodeId = String(node.id || node.system_id);
    const isMatched = matchedNodeIds.has(nodeId);
    const securityStatus = node.security_status || 0;
    let color;
    
    if (isMatched) {
      // 匹配的节点用黄色高亮
      color = '#ffec3d';
    } else {
      // 邻居节点保持原色
      if (securityStatus >= 0.7) {
        color = '#1890ff';
      } else if (securityStatus >= 0.5) {
        color = '#52c41a';
      } else if (securityStatus > 0) {
        color = '#fa8c16';
      } else {
        color = '#f5222d';
      }
    }
    
    return {
      id: nodeId,
      name: node.name || node.id || node.system_id,
      system_id: node.system_id || node.id,
      security_status: securityStatus,
      itemStyle: {
        color: color
      }
    };
  });
  
  // 构建要显示的连接
  const displayLinks = matchedLinks.map(link => ({
    source: String(link.source),
    target: String(link.target)
  }));
  
  chart.setOption({
    series: [
      {
        data: displayNodes,
        links: displayLinks
      }
    ]
  });
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