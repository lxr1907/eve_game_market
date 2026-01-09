<template>
  <div class="loyalty-offers">
    <el-main>
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>忠诚度商店商品</span>
              <div class="sync-controls">
                <el-input
                  v-model="searchKeyword"
                  placeholder="搜索物品名称"
                  style="width: 200px; margin-right: 10px"
                  @keyup.enter="fetchLoyaltyOffers"
                >
                  <template #append>
                    <el-icon @click="fetchLoyaltyOffers"><Search /></el-icon>
                  </template>
                </el-input>
                <el-select
                  v-model="selectedCorporationId"
                  placeholder="选择公司"
                  style="width: 200px; margin-right: 10px"
                  @change="fetchLoyaltyOffers"
                >
                  <el-option
                    v-for="corp in corporations"
                    :key="corp.id"
                    :label="corp.name"
                    :value="corp.id"
                  />
                </el-select>
                <el-select
                  v-model="selectedDatasource"
                  placeholder="选择数据源"
                  style="width: 150px; margin-right: 10px"
                  @change="fetchLoyaltyOffers"
                >
                  <el-option label="晨曦(serenity)" value="serenity" />
                  <el-option label="曙光(infinity)" value="infinity" />
                </el-select>
                <el-button type="primary" @click="syncLoyaltyOffers">
                  <el-icon><RefreshRight /></el-icon>
                  同步数据
                </el-button>
                <el-button type="success" @click="calculateProfit" style="margin-left: 10px">
                  <el-icon><CirclePlus /></el-icon>
                  计算所有收益
                </el-button>
              </div>
            </div>
          </template>
          
          <!-- 数据表格 -->
          <el-table
            v-loading="loading"
            :data="loyaltyOffers"
            style="width: 100%"
            stripe
          >
            <el-table-column prop="id" label="商品ID" width="100" />
            <el-table-column prop="corporation_id" label="公司ID" width="120" />
            <el-table-column prop="type_name" label="物品名称" width="200" />
            <el-table-column prop="type_id" label="物品类型ID" width="120" />
            <el-table-column prop="quantity" label="数量" width="100" />
            <el-table-column prop="lp_cost" label="LP成本" width="100" />
            <el-table-column prop="isk_cost" label="ISK成本" width="120" />
            <el-table-column prop="ak_cost" label="AK成本" width="100" />
            <el-table-column label="所需物品" min-width="200">
              <template #default="scope">
                <el-tag v-if="!scope.row.required_items || scope.row.required_items.length === 0" type="info">
                  无
                </el-tag>
                <div v-else>
                  <div v-for="(item, index) in scope.row.required_items" :key="index" class="required-item">
                    <el-tag type="success" size="small">
                      类型: {{ item.type_id }}, 数量: {{ item.quantity }}
                    </el-tag>
                  </div>
                </div>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- 分页 -->
          <div class="pagination">
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
    </el-main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { RefreshRight, CirclePlus, Search } from '@element-plus/icons-vue'
import { loyaltyApi } from '../services/api'

// 数据
const loyaltyOffers = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const searchKeyword = ref('')

// 公司选择器
const selectedCorporationId = ref(1000180) // 默认公司ID
const selectedDatasource = ref('serenity') // 默认数据源
const corporations = ref([
  { id: 1000436, name: '天使-摩拉辛狂热者' },
  { id: 1000437, name: '古斯塔斯-古力突击队' },
  { id: 1000181, name: '盖伦特-联邦防务联合会' },
  { id: 1000179, name: '艾玛-帝国科洛斯第二十四军团' },
  { id: 1000180, name: '加达里-合众国护卫军' },
  { id: 1000182, name: '米玛塔尔-部族解放力量' }
])

// 获取忠诚度商店商品
async function fetchLoyaltyOffers() {
  loading.value = true
  try {
    const data = await loyaltyApi.getLoyaltyOffers(
      currentPage.value,
      pageSize.value,
      selectedCorporationId.value,
      searchKeyword.value,
      selectedDatasource.value
    )
    loyaltyOffers.value = data.data
    total.value = data.pagination.totalItems
  } catch (error) {
    console.error('获取忠诚度商店商品失败:', error)
    ElMessage.error('获取忠诚度商店商品失败')
  } finally {
    loading.value = false
  }
}

// 同步忠诚度商店商品
async function syncLoyaltyOffers() {
  if (!selectedCorporationId.value) {
    ElMessage.warning('请先选择公司')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要同步公司 ${selectedCorporationId.value} 的忠诚度商店商品吗？`,
      '同步确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loading.value = true
    const response = await loyaltyApi.syncLoyaltyOffers(selectedCorporationId.value, selectedDatasource.value)
    ElMessage.success(response.message)
    
    // 同步完成后刷新数据
    setTimeout(() => {
      fetchLoyaltyOffers()
    }, 2000) // 延迟2秒，给后台一些处理时间
  } catch (error) {
    if (error !== 'cancel') {
      console.error('同步忠诚度商店商品失败:', error)
      ElMessage.error('同步忠诚度商店商品失败')
    }
  } finally {
    loading.value = false
  }
}

// 清理并计算所有LP收益
async function calculateProfit() {
  if (!selectedCorporationId.value) {
    ElMessage.warning('请先选择公司')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要清理并重新计算公司 ${selectedCorporationId.value} 的所有LP收益吗？这可能需要一些时间。`,
      '计算确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    loading.value = true
    const response = await loyaltyApi.cleanAndRecalculateProfit(selectedCorporationId.value, selectedDatasource.value)
    ElMessage.success(response.message)
    
    // 计算完成后刷新数据
    setTimeout(() => {
      fetchLoyaltyOffers()
    }, 2000) // 延迟2秒，给后台一些处理时间
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清理并计算LP收益失败:', error)
      ElMessage.error('清理并计算LP收益失败')
    }
  } finally {
    loading.value = false
  }
}

// 分页处理
function handleSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
  fetchLoyaltyOffers()
}

function handleCurrentChange(page) {
  currentPage.value = page
  fetchLoyaltyOffers()
}

// 页面加载时获取数据
onMounted(() => {
  fetchLoyaltyOffers()
})
</script>

<style scoped>
.loyalty-offers {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sync-controls {
  display: flex;
  align-items: center;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

.required-item {
  margin-bottom: 5px;
}
</style>
