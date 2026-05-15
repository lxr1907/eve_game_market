<template>
  <div class="kb-detail-page">
    <div class="detail-container">
      <!-- 返回按钮 -->
      <div class="back-header">
        <el-button type="primary" @click="goBack" size="small">
          <el-icon><ArrowLeft /></el-icon>
          返回榜单
        </el-button>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-section">
        <el-skeleton :rows="10" animated />
      </div>

      <!-- 详情内容 -->
      <div v-else-if="detailData" class="detail-view">
        <!-- 基本信息 -->
        <el-card class="detail-card" shadow="hover">
          <template #header><span>基本信息</span></template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="Killmail ID">{{ detailData.killmail_id }}</el-descriptions-item>
            <el-descriptions-item label="时间">{{ formatDate(detailData.killmail_time) }}</el-descriptions-item>
            <el-descriptions-item label="星系">
              {{ detailData.solar_system_name ? `${detailData.solar_system_name}（${detailData.solar_system_id}）` : `ID: ${detailData.solar_system_id}` }}
            </el-descriptions-item>
            <el-descriptions-item label="总价值">
              <span class="isk-value">{{ formatISK(detailData.total_value) }} ISK</span>
            </el-descriptions-item>
            <el-descriptions-item label="攻击者数量">{{ detailData.attackers_count }}</el-descriptions-item>
            <el-descriptions-item label="NPC击杀">
              <el-tag :type="detailData.is_npc ? 'info' : 'success'" size="small">
                {{ detailData.is_npc ? '是' : '否' }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 舰船图片 -->
        <div class="ship-images" v-if="detailData.victim?.ship_type_id || detailData.main_attacker?.ship_type_id">
          <div class="ship-img-box" v-if="detailData.victim?.ship_type_id">
            <span class="img-label loss">受害者舰船</span>
            <span class="img-ship-name loss">{{ detailData.victim.ship_type_name || '-' }}</span>
            <img :src="`https://images.evetech.net/types/${detailData.victim.ship_type_id}/render?size=256`" 
                 @error="handleImgError" />
          </div>
          <div class="ship-img-box" v-if="detailData.main_attacker?.ship_type_id">
            <span class="img-label">最后一击舰船</span>
                  <span class="img-ship-name">{{ detailData.main_attacker.ship_type_name || '-' }}</span>
                  <span v-if="detailData.main_attacker?.character_name" class="img-character-name">{{ detailData.main_attacker.character_name }}</span>
            <img :src="`https://images.evetech.net/types/${detailData.main_attacker.ship_type_id}/render?size=256`" 
                 @error="handleImgError" />
          </div>
        </div>

        <!-- 受害者信息 -->
        <el-card class="detail-card" shadow="hover">
          <template #header><span class="section-title-text victim-title">受害者</span></template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="角色">
              {{ detailData.victim?.character_id || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="公司">
              {{ detailData.victim?.corporation_id || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="联盟">
              {{ detailData.victim?.alliance_id || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="舰船">
              <el-link type="primary" @click="showShipOrderDetails(detailData.victim)" class="ship-name loss">{{ detailData.victim?.ship_type_name || '-' }}</el-link>
              <span v-if="detailData.victim?.ship_type_id" class="type-id"> ({{ detailData.victim.ship_type_id }})</span>
              <span v-if="detailData.victim?.ship_value > 0" class="ship-value"> (估值: {{ formatISK(detailData.victim.ship_value) }} ISK)</span>
            </el-descriptions-item>
            <el-descriptions-item label="承受伤害">{{ detailData.victim?.damage_taken || 0 }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 攻击者信息 -->
        <el-card class="detail-card" shadow="hover" v-if="detailData.main_attacker">
          <template #header><span class="section-title-text killer-title">最后一击</span></template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="角色">
              <span v-if="detailData.main_attacker.character_name">
                {{ detailData.main_attacker.character_name }} ({{ detailData.main_attacker.character_id }})
              </span>
              <span v-else>{{ detailData.main_attacker.character_id || '-' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="公司">
              {{ detailData.main_attacker.corporation_id || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="联盟">
              {{ detailData.main_attacker.alliance_id || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="舰船">
              <el-link type="primary" @click="showShipOrderDetails(detailData.main_attacker)" class="ship-name">{{ detailData.main_attacker.ship_type_name || '-' }}</el-link>
              <span v-if="detailData.main_attacker.ship_type_id" class="type-id"> ({{ detailData.main_attacker.ship_type_id }})</span>
              <span v-if="detailData.main_attacker.ship_value > 0" class="ship-value"> (估值: {{ formatISK(detailData.main_attacker.ship_value) }} ISK)</span>
            </el-descriptions-item>
            <el-descriptions-item label="武器">
              <span class="weapon-name">{{ detailData.main_attacker.weapon_type_name || '-' }}</span>
              <span v-if="detailData.main_attacker.weapon_type_id" class="type-id"> ({{ detailData.main_attacker.weapon_type_id }})</span>
            </el-descriptions-item>
            <el-descriptions-item label="造成伤害">{{ detailData.main_attacker.damage_done || 0 }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 受害者物品 -->
        <el-card class="detail-card" shadow="hover" v-if="detailData.victim?.items?.length > 0">
          <template #header>
            <div class="items-header">
              <span class="section-title-text victim-title">物品列表</span>
              <span class="total-value">总损失估值: {{ formatISK(detailData.victim.total_loss_value) }} ISK</span>
            </div>
          </template>
          
          <!-- 高槽 -->
          <div v-if="groupedItems.highSlots.length > 0" class="slot-section">
            <div class="slot-title high-slot">高槽 ({{ groupedItems.highSlots.length }}) - {{ formatISK(groupedItems.highSlotsValue) }}</div>
            <el-table :data="groupedItems.highSlots" style="width: 100%" size="small">
              <el-table-column label="物品" min-width="180">
                <template #default="{ row }">
                  <el-link type="primary" @click="showOrderDetails(row)" class="item-name-link">{{ row.type_name || '-' }}</el-link>
                </template>
              </el-table-column>
              <el-table-column label="掉落数量" width="80" align="center">
                <template #default="{ row }">
                  <span v-if="row.quantity_dropped > 0" class="qty-dropped">{{ row.quantity_dropped }}</span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column label="未掉落" width="80" align="center">
                <template #default="{ row }">
                  <span v-if="row.quantity_destroyed > 0" class="qty-destroyed">{{ row.quantity_destroyed }}</span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column label="单价" width="100" align="right">
                <template #default="{ row }">
                  <span class="unit-price">{{ formatISK(row.unit_price) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="估值" width="100" align="right">
                <template #default="{ row }">
                  <span class="item-value">{{ formatISK(row.value) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
          
          <!-- 中槽 -->
          <div v-if="groupedItems.midSlots.length > 0" class="slot-section">
            <div class="slot-title mid-slot">中槽 ({{ groupedItems.midSlots.length }}) - {{ formatISK(groupedItems.midSlotsValue) }}</div>
            <el-table :data="groupedItems.midSlots" style="width: 100%" size="small">
              <el-table-column label="物品" min-width="180">
                <template #default="{ row }">
                  <el-link type="primary" @click="showOrderDetails(row)" class="item-name-link">{{ row.type_name || '-' }}</el-link>
                </template>
              </el-table-column>
              <el-table-column label="掉落数量" width="80" align="center">
                <template #default="{ row }">
                  <span v-if="row.quantity_dropped > 0" class="qty-dropped">{{ row.quantity_dropped }}</span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column label="未掉落" width="80" align="center">
                <template #default="{ row }">
                  <span v-if="row.quantity_destroyed > 0" class="qty-destroyed">{{ row.quantity_destroyed }}</span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column label="单价" width="100" align="right">
                <template #default="{ row }">
                  <span class="unit-price">{{ formatISK(row.unit_price) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="估值" width="100" align="right">
                <template #default="{ row }">
                  <span class="item-value">{{ formatISK(row.value) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
          
          <!-- 低槽 -->
          <div v-if="groupedItems.lowSlots.length > 0" class="slot-section">
            <div class="slot-title low-slot">低槽 ({{ groupedItems.lowSlots.length }}) - {{ formatISK(groupedItems.lowSlotsValue) }}</div>
            <el-table :data="groupedItems.lowSlots" style="width: 100%" size="small">
              <el-table-column label="物品" min-width="180">
                <template #default="{ row }">
                  <el-link type="primary" @click="showOrderDetails(row)" class="item-name-link">{{ row.type_name || '-' }}</el-link>
                </template>
              </el-table-column>
              <el-table-column label="掉落数量" width="80" align="center">
                <template #default="{ row }">
                  <span v-if="row.quantity_dropped > 0" class="qty-dropped">{{ row.quantity_dropped }}</span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column label="未掉落" width="80" align="center">
                <template #default="{ row }">
                  <span v-if="row.quantity_destroyed > 0" class="qty-destroyed">{{ row.quantity_destroyed }}</span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column label="单价" width="100" align="right">
                <template #default="{ row }">
                  <span class="unit-price">{{ formatISK(row.unit_price) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="估值" width="100" align="right">
                <template #default="{ row }">
                  <span class="item-value">{{ formatISK(row.value) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
          
          <!-- 改装件 -->
          <div v-if="groupedItems.rigs.length > 0" class="slot-section">
            <div class="slot-title rig-slot">改装件 ({{ groupedItems.rigs.length }}) - {{ formatISK(groupedItems.rigsValue) }}</div>
            <el-table :data="groupedItems.rigs" style="width: 100%" size="small">
              <el-table-column label="物品" min-width="180">
                <template #default="{ row }">
                  <el-link type="primary" @click="showOrderDetails(row)" class="item-name-link">{{ row.type_name || '-' }}</el-link>
                </template>
              </el-table-column>
              <el-table-column label="掉落数量" width="80" align="center">
                <template #default="{ row }">
                  <span v-if="row.quantity_dropped > 0" class="qty-dropped">{{ row.quantity_dropped }}</span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column label="未掉落" width="80" align="center">
                <template #default="{ row }">
                  <span v-if="row.quantity_destroyed > 0" class="qty-destroyed">{{ row.quantity_destroyed }}</span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column label="单价" width="100" align="right">
                <template #default="{ row }">
                  <span class="unit-price">{{ formatISK(row.unit_price) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="估值" width="100" align="right">
                <template #default="{ row }">
                  <span class="item-value">{{ formatISK(row.value) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
          
          <!-- 货仓 -->
          <div v-if="groupedItems.cargo.length > 0" class="slot-section">
            <div class="slot-title cargo-slot">货仓 ({{ groupedItems.cargo.length }}) - {{ formatISK(groupedItems.cargoValue) }}</div>
            <el-table :data="groupedItems.cargo" style="width: 100%" size="small">
              <el-table-column label="物品" min-width="180">
                <template #default="{ row }">
                  <el-link type="primary" @click="showOrderDetails(row)" class="item-name-link">{{ row.type_name || '-' }}</el-link>
                </template>
              </el-table-column>
              <el-table-column label="掉落数量" width="80" align="center">
                <template #default="{ row }">
                  <span v-if="row.quantity_dropped > 0" class="qty-dropped">{{ row.quantity_dropped }}</span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column label="未掉落" width="80" align="center">
                <template #default="{ row }">
                  <span v-if="row.quantity_destroyed > 0" class="qty-destroyed">{{ row.quantity_destroyed }}</span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column label="单价" width="100" align="right">
                <template #default="{ row }">
                  <span class="unit-price">{{ formatISK(row.unit_price) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="估值" width="100" align="right">
                <template #default="{ row }">
                  <span class="item-value">{{ formatISK(row.value) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
          
          <!-- 其他 -->
          <div v-if="groupedItems.other.length > 0" class="slot-section">
            <div class="slot-title other-slot">其他 ({{ groupedItems.other.length }}) - {{ formatISK(groupedItems.otherValue) }}</div>
            <el-table :data="groupedItems.other" style="width: 100%" size="small">
              <el-table-column label="物品" min-width="180">
                <template #default="{ row }">
                  <el-link type="primary" @click="showOrderDetails(row)" class="item-name-link">{{ row.type_name || '-' }}</el-link>
                  <span class="flag-info">(flag: {{ row.flag }})</span>
                </template>
              </el-table-column>
              <el-table-column label="掉落数量" width="80" align="center">
                <template #default="{ row }">
                  <span v-if="row.quantity_dropped > 0" class="qty-dropped">{{ row.quantity_dropped }}</span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column label="未掉落" width="80" align="center">
                <template #default="{ row }">
                  <span v-if="row.quantity_destroyed > 0" class="qty-destroyed">{{ row.quantity_destroyed }}</span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column label="单价" width="100" align="right">
                <template #default="{ row }">
                  <span class="unit-price">{{ formatISK(row.unit_price) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="估值" width="100" align="right">
                <template #default="{ row }">
                  <span class="item-value">{{ formatISK(row.value) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>

        <!-- 协助者 -->
        <el-card class="detail-card" shadow="hover" v-if="detailData.supporters && detailData.supporters.length > 0">
          <template #header><span class="section-title-text">协助者 ({{ detailData.supporters.length }})</span></template>
          <el-table :data="detailData.supporters" style="width: 100%" size="small" max-height="400">
            <el-table-column label="角色" min-width="120">
              <template #default="{ row }">
                {{ row.character_id || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="舰船" width="140">
              <template #default="{ row }">
                <span class="ship-name">{{ row.ship_type_name || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="武器" width="140">
              <template #default="{ row }">
                <span class="weapon-name">{{ row.weapon_type_name || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="伤害" width="100" align="right">
              <template #default="{ row }">
                {{ row.damage_done || 0 }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>

      <!-- 错误状态 -->
      <el-empty v-else-if="!loading" description="未找到数据" />
    </div>
  </div>

  <!-- 订单详情弹窗 -->
  <el-dialog
    v-model="orderDialogVisible"
    :title="`${selectedItem?.type_name || '物品'} - 市场订单`"
    width="70%"
    destroy-on-close
    class="order-dialog"
  >
    <div v-loading="queryingOrders" class="order-dialog-content">
      <!-- 手动同步按钮 -->
      <div class="sync-order-actions">
        <el-button 
          type="primary" 
          :loading="syncingOrder" 
          @click="syncItemOrders"
          size="small"
        >
          <el-icon><Refresh /></el-icon>
          同步订单数据
        </el-button>
        <span class="sync-hint" v-if="selectedItem?.item_type_id">
          Type ID: {{ selectedItem.item_type_id }}
        </span>
      </div>

      <el-row :gutter="20">
        <!-- 卖单表格 -->
        <el-col :span="12">
          <div class="section-header">
            <h3 class="section-title sell">
              <el-icon><Top /></el-icon> 卖出订单 (Sell)
            </h3>
          </div>
          <el-table 
            :data="sellOrders" 
            style="width: 100%" 
            height="350px"
            size="small"
            v-if="sellOrders.length > 0"
          >
            <el-table-column prop="price" label="价格 (ISK)" sortable min-width="120">
              <template #default="{ row }">
                <span class="sell-price">{{ formatISK(row.price) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="volume_remaining" label="数量" sortable width="100" />
            <el-table-column prop="location_id" label="位置 ID" width="120" />
          </el-table>
          <el-empty v-else description="暂无卖单数据" />
        </el-col>

        <!-- 买单表格 -->
        <el-col :span="12">
          <div class="section-header">
            <h3 class="section-title buy">
              <el-icon><Bottom /></el-icon> 买入订单 (Buy)
            </h3>
          </div>
          <el-table 
            :data="buyOrders" 
            style="width: 100%" 
            height="350px"
            size="small"
            v-if="buyOrders.length > 0"
          >
            <el-table-column prop="price" label="价格 (ISK)" sortable min-width="120">
              <template #default="{ row }">
                <span class="buy-price">{{ formatISK(row.price) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="volume_remaining" label="数量" sortable width="100" />
            <el-table-column prop="location_id" label="位置 ID" width="120" />
          </el-table>
          <el-empty v-else description="暂无买单数据" />
        </el-col>
      </el-row>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Refresh, Top, Bottom } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const detailData = ref(null)
const loading = ref(false)
const orderDialogVisible = ref(false)
const queryingOrders = ref(false)
const syncingOrder = ref(false)
const selectedItem = ref(null)
const buyOrders = ref([])
const sellOrders = ref([])

// 槽位分类
const slotFlags = {
  highSlots: [27, 28, 29, 30, 31, 32, 33, 34],
  midSlots: [19, 20, 21, 22, 23, 24, 25, 26],
  lowSlots: [11, 12, 13, 14, 15, 16, 17, 18],
  rigs: [92, 93, 94, 95, 96, 97, 98, 99],
  cargo: [5]
}

// 合并相同item_type_id的物品
const mergeItems = (items) => {
  const merged = {}
  for (const item of items) {
    const key = item.item_type_id
    if (!key) continue
    if (merged[key]) {
      merged[key].quantity_dropped += (item.quantity_dropped || 0)
      merged[key].quantity_destroyed += (item.quantity_destroyed || 0)
      // 重新计算总价值：单价 × 总数量
      const totalQuantity = merged[key].quantity_dropped + merged[key].quantity_destroyed
      merged[key].value = merged[key].unit_price * totalQuantity
    } else {
      merged[key] = { ...item }
      // 确保value字段正确计算
      const totalQuantity = item.quantity_dropped + item.quantity_destroyed
      merged[key].value = item.unit_price * totalQuantity
    }
  }
  return Object.values(merged)
}

// 分组物品
const groupedItems = computed(() => {
  if (!detailData.value?.victim?.items) {
    return { highSlots: [], midSlots: [], lowSlots: [], rigs: [], cargo: [], other: [], highSlotsValue: 0, midSlotsValue: 0, lowSlotsValue: 0, rigsValue: 0, cargoValue: 0, otherValue: 0 }
  }
  
  let items = detailData.value.victim.items
  // 合并相同类型的物品
  items = mergeItems(items)
  const result = {
    highSlots: [],
    midSlots: [],
    lowSlots: [],
    rigs: [],
    cargo: [],
    other: [],
    highSlotsValue: 0,
    midSlotsValue: 0,
    lowSlotsValue: 0,
    rigsValue: 0,
    cargoValue: 0,
    otherValue: 0
  }
  
  items.forEach(item => {
    const flag = item.flag
    const value = parseFloat(item.value) || 0
    
    if (slotFlags.highSlots.includes(flag)) {
      result.highSlots.push(item)
      result.highSlotsValue += value
    } else if (slotFlags.midSlots.includes(flag)) {
      result.midSlots.push(item)
      result.midSlotsValue += value
    } else if (slotFlags.lowSlots.includes(flag)) {
      result.lowSlots.push(item)
      result.lowSlotsValue += value
    } else if (slotFlags.rigs.includes(flag)) {
      result.rigs.push(item)
      result.rigsValue += value
    } else if (slotFlags.cargo.includes(flag)) {
      result.cargo.push(item)
      result.cargoValue += value
    } else {
      result.other.push(item)
      result.otherValue += value
    }
  })
  
  return result
})

const fetchDetail = async () => {
  const killmailId = route.params.id
  if (!killmailId) {
    ElMessage.error('缺少 Killmail ID')
    return
  }
  
  loading.value = true
  try {
    const response = await fetch(`${API_BASE}/kb/detail/${killmailId}`)
    const data = await response.json()
    if (data.success) {
      detailData.value = data
    } else {
      ElMessage.error(data.error || '获取详情失败')
    }
  } catch (error) {
    console.error('获取详情失败:', error)
    ElMessage.error('获取详情失败')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/kb-ranking')
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatISK = (value) => {
  if (!value) return '0'
  const num = parseFloat(value)
  if (num >= 100000000) {
    return (num / 100000000).toFixed(2) + '亿'
  } else if (num >= 10000000) {
    return (num / 10000000).toFixed(2) + '千万'
  } else if (num >= 10000) {
    return (num / 10000).toFixed(2) + '万'
  }
  return num.toFixed(2)
}

const handleImgError = (e) => {
  e.target.style.display = 'none'
}

// 显示舰船订单详情
const showShipOrderDetails = (shipData) => {
  if (!shipData?.ship_type_id) {
    ElMessage.warning('无法获取舰船类型ID')
    return
  }
  // 创建临时物品对象，复用showOrderDetails逻辑
  const tempItem = {
    item_type_id: shipData.ship_type_id,
    type_name: shipData.ship_type_name
  }
  showOrderDetails(tempItem)
}

// 显示订单详情弹窗
const showOrderDetails = async (item) => {
  selectedItem.value = item
  orderDialogVisible.value = true
  queryingOrders.value = true
  buyOrders.value = []
  sellOrders.value = []
  
  try {
    const typeId = item.item_type_id
    if (!typeId) {
      ElMessage.warning('物品类型ID无效')
      return
    }
    
    // 从后端获取订单数据
    const response = await fetch(`${API_BASE}/orders?type_id=${typeId}&region_id=10000002&datasource=serenity`)
    const data = await response.json()
    
    // 支持两种数据格式
    if (data.success) {
      // 格式1: { success: true, data: { buyOrders: [...], sellOrders: [...] } }
      buyOrders.value = data.data?.buyOrders?.data || data.data?.buyOrders || []
      sellOrders.value = data.data?.sellOrders?.data || data.data?.sellOrders || []
    } else if (data.buyOrders || data.sellOrders) {
      // 格式2: { buyOrders: [...], sellOrders: [...] } 或 { buyOrders: { data: [...] } }
      buyOrders.value = data.buyOrders?.data || data.buyOrders || []
      sellOrders.value = data.sellOrders?.data || data.sellOrders || []
    } else {
      ElMessage.warning(data.error || '获取订单数据失败')
    }
  } catch (error) {
    console.error('获取订单详情失败:', error)
    ElMessage.error('获取订单详情失败')
  } finally {
    queryingOrders.value = false
  }
}

// 同步物品订单数据
const syncItemOrders = async () => {
  if (!selectedItem.value?.item_type_id) return
  
  syncingOrder.value = true
  try {
    const typeId = selectedItem.value.item_type_id
    const response = await fetch(`${API_BASE}/orders/sync?type_id=${typeId}&region_id=10000002&datasource=serenity`, {
      method: 'POST'
    })
    const data = await response.json()
    
    if (data.success) {
      ElMessage.success('订单数据同步成功')
      // 重新查询订单
      await showOrderDetails(selectedItem.value)
    } else {
      ElMessage.error(data.error || '同步订单数据失败')
    }
  } catch (error) {
    console.error('同步订单失败:', error)
    ElMessage.error('同步订单失败')
  } finally {
    syncingOrder.value = false
  }
}

onMounted(() => {
  fetchDetail()
})
</script>

<style scoped>
/* 物品名称链接样式 */
.item-name-link {
  cursor: pointer;
  color: #409eff;
}

.item-name-link:hover {
  color: #66b1ff;
}

/* 订单弹窗样式 */
.order-dialog-content {
  padding: 20px 0;
}

.sync-order-actions {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  gap: 10px;
}

.sync-hint {
  color: #909399;
  font-size: 14px;
}

.section-header {
  margin-bottom: 10px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title.sell {
  color: #f56c6c;
}

.section-title.buy {
  color: #67c23a;
}

.sell-price {
  color: #f56c6c;
  font-weight: 600;
}

.buy-price {
  color: #67c23a;
  font-weight: 600;
}
.kb-detail-page {
  min-height: calc(100vh - 120px);
  padding: 20px;
}

.detail-container {
  max-width: 1200px;
  margin: 0 auto;
}

.back-header {
  margin-bottom: 16px;
}

.loading-section {
  padding: 40px 0;
}

.detail-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-card {
  background-color: #1e1e2e;
  border-color: #2d3040;
}

.detail-content {
  color: #e0e0e0;
}

.section-title-text {
  font-weight: 600;
  color: #e0e0e0 !important;
}

.victim-title { color: #f56c6c; }
.killer-title { color: #67c23a; }
.type-id { color: #666; font-size: 12px; }
.weapon-name { color: #e6a23c; }

.item-name { color: #e0e0e0; }
.qty-dropped { color: #67c23a; }
.qty-destroyed { color: #f56c6c; }

/* 槽位分类样式 */
.slot-section {
  margin-bottom: 20px;
}
.slot-section:last-child {
  margin-bottom: 0;
}
.slot-title {
  font-weight: 600;
  font-size: 14px;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 8px;
}
.high-slot {
  background-color: rgba(64, 158, 255, 0.2);
  color: #409eff;
  border-left: 3px solid #409eff;
}
.mid-slot {
  background-color: rgba(64, 158, 255, 0.2);
  color: #409eff;
  border-left: 3px solid #409eff;
}
.low-slot {
  background-color: rgba(64, 158, 255, 0.2);
  color: #409eff;
  border-left: 3px solid #409eff;
}
.rig-slot {
  background-color: rgba(64, 158, 255, 0.2);
  color: #409eff;
  border-left: 3px solid #409eff;
}
.cargo-slot {
  background-color: rgba(64, 158, 255, 0.2);
  color: #409eff;
  border-left: 3px solid #409eff;
}
.other-slot {
  background-color: rgba(96, 98, 102, 0.2);
  color: #606266;
  border-left: 3px solid #606266;
}
.flag-info {
  color: #666;
  font-size: 11px;
  margin-left: 8px;
}

/* 物品列表头部 */
.items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.total-value {
  color: #e6a23c;
  font-weight: 600;
  font-size: 14px;
}

/* 单价和估值样式 */
.unit-price {
  color: #909399;
  font-size: 12px;
}
.item-value {
  color: #e6a23c;
  font-weight: 500;
}

/* 舰船估值样式 */
.ship-value {
  color: #67c23a;
  font-size: 12px;
  margin-left: 8px;
  font-weight: 500;
}

.ship-images {
  display: flex;
  justify-content: center;
  gap: 40px;
  flex-wrap: wrap;
}

.ship-img-box {
  text-align: center;
}

.ship-img-box img {
  width: 200px;
  height: 200px;
  object-fit: contain;
  background: rgba(0,0,0,0.3);
  border-radius: 8px;
}

.img-label {
  display: block;
  font-size: 12px;
  color: #67c23a;
  margin-bottom: 4px;
}

.img-label.loss { color: #f56c6c; }
.img-ship-name {
  display: block;
  font-size: 13px;
  color: #e0e0e0;
  margin-bottom: 6px;
}

.img-ship-name.loss { color: #f56c6c; }

.ship-name { color: #67c23a; font-weight: 500; }
.ship-name.loss { color: #f56c6c; }
.isk-value { color: #e6a23c; font-family: monospace; }

/* ===== Element Plus 暗色覆盖 ===== */
:deep(.el-tabs__item) { color: #999; }
:deep(.el-tabs__item.is-active) { color: #409eff; }
:deep(.el-tabs__nav-wrap::after) { background-color: #2d3040; }

:deep(.el-table) { background-color: transparent; }
:deep(.el-table th) { background-color: #252636 !important; color: #999; }
:deep(.el-table tr) { background-color: transparent; }
:deep(.el-table td) { border-bottom-color: #2d3040; }
:deep(.el-table--enable-row-hover .el-table__body tr:hover > td) { background-color: #252636 !important; }

:deep(.el-card__header) { background-color: #252636; border-bottom-color: #2d3040; color: #e0e0e0; }
:deep(.el-card__body) { color: #e0e0e0; }

:deep(.el-descriptions__label) { background-color: #252636 !important; color: #e0e0e0 !important; }
:deep(.el-descriptions__content) { background-color: #1e1e2e !important; color: #e0e0e0 !important; }
:deep(.el-descriptions__cell) { border-color: #2d3040 !important; }

:deep(.el-result__title p) { color: #e0e0e0; }
:deep(.el-result__subtitle p) { color: #999; }
:deep(.el-tag) { border-color: #2d3040; }
:deep(.el-skeleton__item) { background-color: #2d3040; }
</style>
