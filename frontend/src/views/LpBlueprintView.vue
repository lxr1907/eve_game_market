<template>
  <div class="lp-blueprint-page">
    <!-- 顶部控制栏 -->
    <header class="query-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">LP蓝图制造</h1>
          <el-tag type="info" effect="plain" round class="status-tag">实时数据</el-tag>
        </div>

        <div class="header-right">
          <div class="filter-item">
            <span class="filter-label">所属区域</span>
            <el-select
              v-model="selectedRegionId"
              placeholder="请选择区域"
              filterable
              class="region-select"
              @change="handleRegionChange"
            >
              <el-option
                v-for="region in regions"
                :key="region.id"
                :label="`${region.name} (${region.id})`"
                :value="region.id"
              />
            </el-select>
          </div>

          <div class="filter-item">
            <el-radio-group v-model="datasource" @change="handleDatasourceChange" size="small">
              <el-radio-button label="serenity">晨曦</el-radio-button>
              <el-radio-button label="infinity">曙光</el-radio-button>
              <el-radio-button label="tranquility">欧服</el-radio-button>
            </el-radio-group>
          </div>

          <div class="filter-item">
            <span class="filter-label">LP兑换比例</span>
            <el-tag type="info" effect="plain" class="lp-ratio-tag">1300 ISK/LP</el-tag>
          </div>
        </div>
      </div>
    </header>

    <!-- 主体布局 -->
    <div class="query-main">
      <!-- 左侧蓝图列表 -->
      <aside class="sidebar">
        <div class="search-box">
          <el-input
            v-model="searchText"
            placeholder="搜索蓝图名称..."
            clearable
            prefix-icon="Search"
            @input="handleSearch"
          />
        </div>
        <div class="filter-switch">
          <el-checkbox v-model="filterPositiveProfit" @change="handleFilterChange">仅显示正收益</el-checkbox>
          <el-button type="primary" size="small" :loading="loadingList" @click="handleRefresh" class="refresh-btn">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>

        <div class="blueprint-list" v-loading="loadingList">
          <div
            v-for="bp in filteredBlueprints"
            :key="bp.offer_id"
            class="blueprint-item"
            :class="{ 'is-active': selectedBlueprint && selectedBlueprint.offer_id === bp.offer_id }"
            @click="handleBlueprintClick(bp)"
          >
            <div class="bp-name">{{ bp.type_name || `ID: ${bp.type_id}` }}</div>
            <div class="bp-info">
              <span class="bp-lp">{{ formatNumber(bp.lp_cost) }} LP</span>
              <span class="bp-isk">{{ formatISKShort(bp.isk_cost) }} ISK</span>
              <span v-if="bp.profit_per_lp !== null && bp.profit_per_lp !== undefined" class="bp-profit" :class="{ 'profit-positive': bp.profit_per_lp > 0, 'profit-negative': bp.profit_per_lp <= 0 }">
                {{ bp.profit_per_lp > 0 ? '+' : '' }}{{ parseInt(bp.profit_per_lp) }}/LP
              </span>
            </div>
          </div>
          <div v-if="!loadingList && filteredBlueprints.length === 0" class="empty-list">
            <span>暂无蓝图数据</span>
          </div>
        </div>
      </aside>

      <!-- 右侧详情 -->
      <main class="content-area" v-loading="querying">
        <div v-if="!selectedBlueprint" class="empty-state">
          <el-empty description="请在左侧选择一个蓝图查看制造收益" />
        </div>

        <template v-else>
          <!-- 收益概览 -->
          <section class="table-section profit-highlight">
            <div class="section-header">
              <h2 class="section-title">
                <el-icon><Money /></el-icon> 收益概览
              </h2>
            </div>
            
            <!-- 每LP收益范围展示 -->
            <div class="profit-range-container">
              <div class="profit-item">
                <div class="profit-label">按买价计算每LP收益</div>
                <div class="profit-value" :class="profitDisplay[0]?.class">
                  {{ profitDisplay[0]?.value }}
                </div>
              </div>
              
              <div class="wave-separator">
                <svg class="wave-svg" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0,10 Q25,0 50,10 T100,10" stroke="currentColor" fill="none" stroke-width="1.5"/>
                </svg>
                <span class="range-text">收益范围</span>
              </div>
              
              <div class="profit-item">
                <div class="profit-label">按卖价计算每LP收益</div>
                <div class="profit-value" :class="profitDisplay[1]?.class">
                  {{ profitDisplay[1]?.value }}
                </div>
              </div>
            </div>
            
            <!-- 其他收益指标表格 -->
            <el-table
              :data="profitDisplay.slice(2)"
              style="width: 100%"
              border
              stripe
              size="small"
              class="profit-table"
            >
              <el-table-column prop="label" label="指标" min-width="180" />
              <el-table-column prop="value" label="数值" min-width="200">
                <template #default="{ row }">
                  <span :class="row.class">{{ row.value }}</span>
                </template>
              </el-table-column>
            </el-table>
            
            <div class="view-orders-btn">
              <el-button type="primary" @click="showOrderDialog" :loading="queryingOrders">
                <el-icon><Search /></el-icon> 查看产品订单
              </el-button>
            </div>
          </section>

          <!-- LP兑换成本 -->
          <section class="table-section">
            <div class="section-header">
              <h2 class="section-title">
                <el-icon><Star /></el-icon> LP兑换成本
              </h2>
            </div>
            <el-table
              :data="lpCostDisplay"
              style="width: 100%"
              border
              stripe
              size="small"
              class="cost-table"
            >
              <el-table-column prop="name" label="项目" min-width="200" />
              <el-table-column prop="value" label="数值" min-width="200">
                <template #default="{ row }">
                  <span class="cost-value">{{ row.value }}</span>
                </template>
              </el-table-column>
            </el-table>
          </section>

          <!-- 原材料成本 -->
          <section class="table-section">
            <div class="section-header">
              <h2 class="section-title">
                <el-icon><List /></el-icon> 制造材料成本
              </h2>
            </div>
            <el-table
              :data="materials"
              style="width: 100%"
              border
              stripe
              size="small"
              class="material-table"
            >
              <el-table-column prop="name" label="材料名称" min-width="200">
                <template #default="{ row }">
                  <span class="material-name clickable" @click="showMaterialOrders(row)">
                    {{ row.name }}
                    <el-icon size="14" class="link-icon"><Link /></el-icon>
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="quantity" label="所需数量" sortable width="100" />
              <el-table-column prop="price" label="单价 (ISK)" sortable min-width="120">
                <template #default="{ row }">
                  <span class="price-text">{{ formatISKShort(row.price) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="total_cost" label="总成本 (ISK)" sortable min-width="150">
                <template #default="{ row }">
                  <span class="total-cost-text">{{ formatISKShort(row.total_cost) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </section>

          <!-- 总成本统计 -->
          <section class="table-section">
            <div class="section-header">
              <h2 class="section-title">
                <el-icon><DataAnalysis /></el-icon> 成本汇总
              </h2>
            </div>
            <el-table
              :data="totalCostDisplay"
              style="width: 100%"
              border
              stripe
              size="small"
              class="total-cost-table"
            >
              <el-table-column prop="name" label="统计项" min-width="200" />
              <el-table-column prop="value" label="数值" min-width="200">
                <template #default="{ row }">
                  <span :class="row.class || 'total-value-text'">{{ row.value }}</span>
                </template>
              </el-table-column>
            </el-table>
          </section>
        </template>
      </main>
    </div>

    <!-- 产品订单详情弹窗 -->
    <el-dialog
      v-model="orderDialogVisible"
      :title="`${productTypeName || '产品'} - 订单详情`"
      width="70%"
      destroy-on-close
    >
      <div v-loading="queryingOrders">
        <el-row :gutter="20">
          <!-- 卖单表格 -->
          <el-col :span="12">
            <div class="dialog-section-header">
              <h3 class="dialog-title sell">
                <el-icon><Top /></el-icon> 卖出订单 (Sell)
              </h3>
            </div>
            <el-table 
              :data="sellOrders" 
              style="width: 100%" 
              height="350px"
              size="small"
            >
              <el-table-column prop="price" label="价格 (ISK)" sortable min-width="120">
                <template #default="{ row }">
                  <span style="color: #f56c6c; font-weight: bold;">{{ formatISKShort(row.price) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="volume_remaining" label="剩余数量" sortable width="100">
                <template #default="{ row }">
                  {{ formatNumber(row.volume_remaining) }}
                </template>
              </el-table-column>
              <el-table-column prop="location_id" label="位置 ID" width="100" />
            </el-table>
          </el-col>

          <!-- 买单表格 -->
          <el-col :span="12">
            <div class="dialog-section-header">
              <h3 class="dialog-title buy">
                <el-icon><Bottom /></el-icon> 买入订单 (Buy)
              </h3>
            </div>
            <el-table 
              :data="buyOrders" 
              style="width: 100%" 
              height="350px"
              size="small"
            >
              <el-table-column prop="price" label="价格 (ISK)" sortable min-width="120">
                <template #default="{ row }">
                  <span style="color: #67c23a; font-weight: bold;">{{ formatISKShort(row.price) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="volume_remaining" label="剩余数量" sortable width="100">
                <template #default="{ row }">
                  {{ formatNumber(row.volume_remaining) }}
                </template>
              </el-table-column>
              <el-table-column prop="location_id" label="位置 ID" width="100" />
            </el-table>
          </el-col>
        </el-row>
      </div>
    </el-dialog>

    <!-- 材料订单详情弹窗 -->
    <el-dialog
      v-model="materialOrderDialogVisible"
      :title="`${selectedMaterialName || '材料'} - 订单详情`"
      width="70%"
      destroy-on-close
    >
      <div v-loading="queryingMaterialOrders">
        <el-row :gutter="20">
          <!-- 卖单表格 -->
          <el-col :span="12">
            <div class="dialog-section-header">
              <h3 class="dialog-title sell">
                <el-icon><Top /></el-icon> 卖出订单 (Sell)
              </h3>
            </div>
            <el-table 
              :data="materialSellOrders" 
              style="width: 100%" 
              height="350px"
              size="small"
            >
              <el-table-column prop="price" label="价格 (ISK)" sortable min-width="120">
                <template #default="{ row }">
                  <span style="color: #f56c6c; font-weight: bold;">{{ formatISKShort(row.price) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="volume_remaining" label="剩余数量" sortable width="100">
                <template #default="{ row }">
                  {{ formatNumber(row.volume_remaining) }}
                </template>
              </el-table-column>
              <el-table-column prop="location_id" label="位置 ID" width="100" />
            </el-table>
          </el-col>

          <!-- 买单表格 -->
          <el-col :span="12">
            <div class="dialog-section-header">
              <h3 class="dialog-title buy">
                <el-icon><Bottom /></el-icon> 买入订单 (Buy)
              </h3>
            </div>
            <el-table 
              :data="materialBuyOrders" 
              style="width: 100%" 
              height="350px"
              size="small"
            >
              <el-table-column prop="price" label="价格 (ISK)" sortable min-width="120">
                <template #default="{ row }">
                  <span style="color: #67c23a; font-weight: bold;">{{ formatISKShort(row.price) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="volume_remaining" label="剩余数量" sortable width="100">
                <template #default="{ row }">
                  {{ formatNumber(row.volume_remaining) }}
                </template>
              </el-table-column>
              <el-table-column prop="location_id" label="位置 ID" width="100" />
            </el-table>
          </el-col>
        </el-row>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { regionApi, loyaltyApi, typeApi, orderApi } from '../services/api'
import { ElMessage } from 'element-plus'
import { List, DataAnalysis, Search, Money, Star, Top, Bottom, Refresh, Link } from '@element-plus/icons-vue'

export default {
  name: 'LpBlueprintView',
  setup() {
    // 状态定义
    const regions = ref([])
    const selectedRegionId = ref(10000002)
    const datasource = ref('serenity')
    const blueprints = ref([])
    const searchText = ref('')
    const filterPositiveProfit = ref(false)
    const selectedBlueprint = ref(null)
    const materials = ref([])
    const profitDisplay = ref([])
    const lpCostDisplay = ref([])
    const totalCostDisplay = ref([])
    const querying = ref(false)
    const loadingList = ref(false)
    const orderDialogVisible = ref(false)
    const queryingOrders = ref(false)
    const buyOrders = ref([])
    const sellOrders = ref([])
    const productTypeId = ref(null)
    const productTypeName = ref('')
    // 材料订单相关状态
    const materialOrderDialogVisible = ref(false)
    const queryingMaterialOrders = ref(false)
    const materialBuyOrders = ref([])
    const materialSellOrders = ref([])
    const selectedMaterialName = ref('')

    // 搜索过滤（现在由后端处理，此处保留用于模板兼容）
    const filteredBlueprints = computed(() => blueprints.value)

    // 格式化工具
    const formatISK = (val) => {
      if (val === undefined || val === null) return '0.00'
      const num = parseFloat(val)
      if (num >= 100000000) return (num / 100000000).toFixed(2) + '亿'
      if (num >= 10000) return (num / 10000).toFixed(2) + '万'
      return Math.floor(num).toLocaleString()
    }

    const formatISKShort = (val) => {
      if (val === undefined || val === null) return '0'
      const num = parseFloat(val)
      if (num >= 100000000) return (num / 100000000).toFixed(2) + '亿'
      if (num >= 10000) return (num / 10000).toFixed(2) + '万'
      return Math.floor(num).toLocaleString()
    }

    const formatNumber = (val) => {
      if (val === undefined || val === null) return '0'
      const num = Number(val)
      if (num >= 100000000) return (num / 100000000).toFixed(2) + '亿'
      if (num >= 10000) return (num / 10000).toFixed(2) + '万'
      return Math.floor(num).toLocaleString()
    }

    // 加载区域列表
    const loadRegions = async () => {
      try {
        const response = await regionApi.getRegions(1, null, '')
        regions.value = response.regions
      } catch (error) {
        ElMessage.error('加载区域失败')
      }
    }

    // 加载LP商店蓝图列表
    const loadBlueprints = async () => {
      loadingList.value = true
      try {
        const data = await loyaltyApi.getLoyaltyBlueprints(
          null,
          datasource.value,
          searchText.value,
          false,
          selectedRegionId.value,
          filterPositiveProfit.value
        )
        blueprints.value = data
      } catch (error) {
        console.error('加载蓝图列表失败:', error)
        ElMessage.error('加载蓝图列表失败')
      } finally {
        loadingList.value = false
        // 列表加载完成后默认选中第一个
        if (blueprints.value && blueprints.value.length > 0 && !selectedBlueprint.value) {
          handleBlueprintClick(blueprints.value[0])
        }
      }
    }

    // 过滤开关变更
    const handleFilterChange = () => {
      loadBlueprints()
    }

    // 刷新按钮
    const handleRefresh = () => {
      loadBlueprints()
    }

    // 搜索处理（防抖，调用后端API）
    let searchTimer = null
    const handleSearch = () => {
      clearTimeout(searchTimer)
      searchTimer = setTimeout(() => {
        loadBlueprints()
      }, 500)
    }

    // 选择蓝图
    const handleBlueprintClick = (bp) => {
      // 已选中该蓝图则无需重复查询
      if (selectedBlueprint.value && selectedBlueprint.value.offer_id === bp.offer_id) {
        return
      }
      selectedBlueprint.value = bp
      queryBlueprintProfit(bp)
    }

    // 查询蓝图制造收益
    const queryBlueprintProfit = async (bp) => {
      if (!bp || !selectedRegionId.value) return
      try {
        querying.value = true

        // 调用统一的蓝图详情API
        const detailData = await loyaltyApi.getBlueprintDetails(
          bp.type_id,
          datasource.value,
          selectedRegionId.value
        )

        // 1. LP兑换成本展示
        lpCostDisplay.value = [
          { name: 'LP需求量', value: formatNumber(detailData.lp_cost) },
          { name: 'ISK需求量', value: formatISKShort(detailData.isk_cost) },
          { name: 'LP换算ISK成本', value: formatISKShort(detailData.lp_total_cost) },
          { name: 'LP兑换总成本', value: formatISKShort(detailData.lp_total_cost + detailData.isk_cost) }
        ]

        // 2. 材料信息
        materials.value = detailData.materials.map(mat => ({
          name: mat.name,
          type_id: mat.type_id,
          quantity: mat.quantity,
          price: mat.price,
          total_cost: mat.total_cost
        }))

        // 3. 产品信息
        if (detailData.product) {
          productTypeId.value = detailData.product.type_id
          productTypeName.value = detailData.product.name
        } else {
          productTypeId.value = null
          productTypeName.value = ''
        }

        // 4. 收益概览（分开显示买/卖收益）
        profitDisplay.value = [
          { label: '每LP收益（按买价）', value: parseInt(detailData.profit_per_lp_buy), class: detailData.profit_per_lp_buy > 0 ? 'profit-positive' : 'profit-negative' },
          { label: '每LP收益（按卖价）', value: parseInt(detailData.profit_per_lp_sell), class: detailData.profit_per_lp_sell > 0 ? 'profit-positive' : 'profit-negative' },
          { label: '总收益（按买价）', value: formatISKShort(detailData.buy_profit), class: detailData.buy_profit > 0 ? 'profit-positive' : 'profit-negative' },
          { label: '总收益（按卖价）', value: formatISKShort(detailData.sell_profit), class: detailData.sell_profit > 0 ? 'profit-positive' : 'profit-negative' },
          { label: '收益率（按买价）', value: `${detailData.buy_profit_rate.toFixed(2)}%`, class: detailData.buy_profit_rate > 0 ? 'profit-positive' : 'profit-negative' },
          { label: '收益率（按卖价）', value: `${detailData.sell_profit_rate.toFixed(2)}%`, class: detailData.sell_profit_rate > 0 ? 'profit-positive' : 'profit-negative' },
          { label: '产品最高买价', value: formatISKShort(detailData.product_buy_price), class: '' },
          { label: '产品最低卖价', value: formatISKShort(detailData.product_sell_price), class: '' },
          { label: '总成本', value: formatISKShort(detailData.total_cost), class: '' }
        ]

        // 5. 成本汇总
        totalCostDisplay.value = [
          { name: 'LP兑换总成本', value: formatISKShort(detailData.lp_total_cost) },
          { name: '制造材料总成本', value: formatISKShort(detailData.material_cost) },
          { name: '总成本', value: formatISKShort(detailData.total_cost) },
          { name: '产品最高买价', value: formatISKShort(detailData.product_buy_price) },
          { name: '产品最低卖价', value: formatISKShort(detailData.product_sell_price) },
          { name: '总收益（按买价）', value: formatISKShort(detailData.buy_profit), class: detailData.buy_profit > 0 ? 'profit-positive' : 'profit-negative' },
          { name: '总收益（按卖价）', value: formatISKShort(detailData.sell_profit), class: detailData.sell_profit > 0 ? 'profit-positive' : 'profit-negative' }
        ]

        // 6. 更新列表页中的收益数据
        const blueprintIndex = blueprints.value.findIndex(item => item.type_id === bp.type_id)
        if (blueprintIndex !== -1) {
          // 更新收益数据
          blueprints.value[blueprintIndex].profit_per_lp = detailData.profit_per_lp
          blueprints.value[blueprintIndex].total_profit = detailData.total_profit
          blueprints.value[blueprintIndex].buy_profit = detailData.buy_profit
          blueprints.value[blueprintIndex].sell_profit = detailData.sell_profit
          blueprints.value[blueprintIndex].profit_per_lp_buy = detailData.profit_per_lp_buy
          blueprints.value[blueprintIndex].profit_per_lp_sell = detailData.profit_per_lp_sell
          blueprints.value[blueprintIndex].product_buy_price = detailData.product_buy_price
          blueprints.value[blueprintIndex].product_sell_price = detailData.product_sell_price
          blueprints.value[blueprintIndex].total_cost = detailData.total_cost
          blueprints.value[blueprintIndex].material_cost = detailData.material_cost
          blueprints.value[blueprintIndex].profit_updated_at = new Date().toISOString()
        }

      } catch (error) {
        console.error('查询蓝图制造收益失败:', error)
        const errorMessage = error.response?.data?.message || error.message || '查询失败'
        ElMessage.error(errorMessage)
      } finally {
        querying.value = false
      }
    }

    // 筛选条件变更
    const handleRegionChange = () => {
      if (selectedBlueprint.value) queryBlueprintProfit(selectedBlueprint.value)
    }

    const handleDatasourceChange = () => {
      loadBlueprints()
      selectedBlueprint.value = null
      materials.value = []
      profitDisplay.value = []
      lpCostDisplay.value = []
      totalCostDisplay.value = []
    }

    // 显示产品订单弹窗
    const showOrderDialog = async () => {
      if (!productTypeId.value) {
        ElMessage.warning('该蓝图没有制造产品')
        return
      }
      orderDialogVisible.value = true
      queryingOrders.value = true
      buyOrders.value = []
      sellOrders.value = []

      try {
        const response = await orderApi.getOrders({
          regionId: selectedRegionId.value,
          typeId: productTypeId.value,
          datasource: datasource.value
        })
        buyOrders.value = response.buyOrders.data || []
        sellOrders.value = response.sellOrders.data || []
      } catch (error) {
        console.error('获取订单失败:', error)
        ElMessage.error('获取订单失败')
      } finally {
        queryingOrders.value = false
      }
    }

    // 显示材料订单弹窗
    const showMaterialOrders = async (material) => {
      if (!material || !material.type_id || !selectedRegionId.value) {
        ElMessage.warning('无法获取材料订单信息')
        return
      }
      selectedMaterialName.value = material.name
      materialOrderDialogVisible.value = true
      queryingMaterialOrders.value = true
      materialBuyOrders.value = []
      materialSellOrders.value = []

      try {
        const response = await orderApi.getOrders({
          regionId: selectedRegionId.value,
          typeId: material.type_id,
          datasource: datasource.value
        })
        materialBuyOrders.value = response.buyOrders.data || []
        materialSellOrders.value = response.sellOrders.data || []
      } catch (error) {
        console.error('获取材料订单失败:', error)
        const errorMessage = error.response?.data?.message || error.message || '获取材料订单失败'
        ElMessage.error(errorMessage)
      } finally {
        queryingMaterialOrders.value = false
      }
    }

    onMounted(() => {
      loadRegions()
      loadBlueprints()
    })

    return {
      regions, selectedRegionId, datasource,
      blueprints, searchText, filterPositiveProfit, filteredBlueprints, selectedBlueprint,
      materials, profitDisplay, lpCostDisplay, totalCostDisplay,
      querying, loadingList,
      orderDialogVisible, queryingOrders, buyOrders, sellOrders, productTypeName,
      // 材料订单相关
      materialOrderDialogVisible, queryingMaterialOrders, materialBuyOrders, materialSellOrders,
      selectedMaterialName,
      formatISK, formatISKShort, formatNumber,
      handleSearch, handleFilterChange, handleRefresh, handleBlueprintClick,
      handleRegionChange, handleDatasourceChange,
      showOrderDialog, showMaterialOrders
    }
  }
}
</script>

<style scoped>
/* 页面整体容器 */
.lp-blueprint-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #0f111a;
  color: #e2e8f0;
  overflow: hidden;
}

/* 顶部标题栏 */
.query-header {
  height: 64px;
  background-color: #1a1c26;
  border-bottom: 1px solid #2d303e;
  padding: 0 24px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.header-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  background: linear-gradient(120deg, #409eff, #e6a23c);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.filter-item {
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 13px;
  color: #94a3b8;
}

.region-select {
  width: 220px;
}

.lp-ratio-tag {
  font-size: 14px;
  padding: 4px 12px;
}

/* 主内容布局 */
.query-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 侧边栏样式 */
.sidebar {
  width: 320px;
  background-color: #161821;
  border-right: 1px solid #2d303e;
  display: flex;
  flex-direction: column;
}

.search-box {
  padding: 16px;
  border-bottom: 1px solid #2d303e;
}

.search-box :deep(.el-input__wrapper) {
  background-color: #2d303e;
  border-color: #3d4050;
}

.search-box :deep(.el-input__inner) {
  color: #fff;
}

.filter-switch {
  padding: 8px 16px;
  border-bottom: 1px solid #2d303e;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-switch :deep(.el-checkbox__label) {
  color: #94a3b8;
  font-size: 13px;
}

.refresh-btn {
  margin-left: auto;
}

/* 蓝图列表 */
.blueprint-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.blueprint-item {
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.blueprint-item:hover {
  background-color: #242736;
  border-color: #3d4050;
}

.blueprint-item.is-active {
  background-color: #1a3a5c;
  border-color: #409eff;
}

.bp-name {
  font-size: 13px;
  font-weight: 500;
  color: #e2e8f0;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bp-info {
  display: flex;
  gap: 12px;
  font-size: 11px;
}

.bp-lp {
  color: #e6a23c;
}

.bp-isk {
  color: #67c23a;
}

.bp-profit {
  font-weight: 600;
}

.bp-profit.profit-positive {
  color: #67c23a;
}

.bp-profit.profit-negative {
  color: #f56c6c;
}

.empty-list {
  text-align: center;
  padding: 40px 0;
  color: #64748b;
  font-size: 14px;
}

/* 右侧内容区 */
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 20px;
  overflow-y: auto;
  background-color: #0f111a;
}

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-section {
  flex: 1;
  background-color: #1a1c26;
  border-radius: 8px;
  border: 1px solid #2d303e;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.section-header {
  margin-bottom: 12px;
}

.section-title {
  margin: 0;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #409eff;
}

/* 表格样式 */
.cost-table, .material-table, .total-cost-table {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: #242736;
  --el-table-border-color: #2d303e;
  --el-table-text-color: #cbd5e1;
  --el-table-header-text-color: #94a3b8;
}

.material-name {
  font-weight: 500;
  color: #e2e8f0;
}

.material-name.clickable {
  cursor: pointer;
  color: #409eff;
  transition: color 0.2s;
  
  &:hover {
    color: #69b1ff;
  }
}

.link-icon {
  margin-left: 4px;
  opacity: 0.8;
  transition: opacity 0.2s;
  
  .material-name.clickable:hover & {
    opacity: 1;
  }
}

.price-text {
  font-family: 'Roboto Mono', monospace;
  font-weight: 600;
  color: #67c23a;
}

.total-cost-text {
  font-family: 'Roboto Mono', monospace;
  font-weight: 600;
  color: #f56c6c;
}

.cost-value {
  font-family: 'Roboto Mono', monospace;
  font-weight: 600;
  color: #e6a23c;
}

.total-value-text {
  font-family: 'Roboto Mono', monospace;
  font-weight: 600;
  color: #409eff;
}

:deep(.el-table__row--striped) td {
  background-color: #1e202e !important;
}

:deep(.el-table__body tr:hover > td) {
  background-color: #2a2d3d !important;
}

/* 收益突出展示 */
.profit-highlight {
  background-color: #1a1c26;
  border: 2px solid #e6a23c;
  box-shadow: 0 0 20px rgba(230, 162, 60, 0.2);
}

.profit-highlight .section-title {
  color: #e6a23c;
  font-size: 18px;
  font-weight: 600;
}

.profit-table {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: #242736;
  --el-table-border-color: #2d303e;
  --el-table-text-color: #cbd5e1;
  --el-table-header-text-color: #94a3b8;
}

.profit-table .el-table__cell {
  padding: 12px 0;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .profit-range-container {
    flex-direction: column;
    gap: 20px;
  }
  
  .wave-separator {
    transform: rotate(90deg);
    padding: 20px 0;
  }
  
  .profit-value {
    font-size: 20px;
  }
}

.profit-positive {
  color: #67c23a;
  font-weight: 700;
  font-size: 16px;
  text-shadow: 0 0 10px rgba(103, 194, 58, 0.3);
}

.profit-negative {
  color: #f56c6c;
  font-weight: 700;
  font-size: 16px;
  text-shadow: 0 0 10px rgba(245, 108, 108, 0.3);
}

/* 收益范围展示样式 */
.profit-range-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, rgba(230, 162, 60, 0.1), rgba(64, 158, 255, 0.1));
  border-radius: 8px;
  border: 1px solid rgba(230, 162, 60, 0.2);
}

.profit-item {
  flex: 1;
  text-align: center;
}

.profit-label {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 8px;
  font-weight: 500;
}

.profit-value {
  font-size: 24px;
  font-weight: 700;
  text-shadow: 0 0 10px currentColor;
}

.wave-separator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  color: #e6a23c;
}

.wave-svg {
  width: 80px;
  height: 30px;
  margin: 10px 0;
  opacity: 0.8;
}

.range-text {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.view-orders-btn {
  margin-top: 16px;
  text-align: center;
}

/* 订单弹窗样式 */
.dialog-section-header {
  margin-bottom: 12px;
}

.dialog-title {
  margin: 0;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dialog-title.sell {
  color: #f56c6c;
}

.dialog-title.buy {
  color: #67c23a;
}
</style>
