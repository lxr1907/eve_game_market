<template>
  <div class="kb-page">
    <div class="kb-container">
      <!-- 未登录提示 -->
      <div v-if="!characterInfo" class="not-logged-in">
        <el-result icon="warning" title="未登录" sub-title="请先登录以查看您的KB数据">
          <template #extra>
            <el-button type="primary" @click="$router.push('/login')">前往登录</el-button>
          <!-- 效率分详情弹窗 -->
<el-dialog title="效率分计算方式" v-model="showEfficiencyDialog" width="400px" append-to-body>
  <div class="efficiency-explanation">
    <h4>效率分计算公式</h4>
    <p class="formula">
      效率分 = (击毁总价值 - 损失总价值) / 击毁总价值 × 100%
    </p>
    <h4>公式说明</h4>
    <ul>
      <li><strong>击毁总价值</strong>: 所有参与击毁的舰船和物品的总价值</li>
      <li><strong>损失总价值</strong>: 所有损失的舰船和物品的总价值</li>
      <li><strong>效率分范围</strong>: -∞ ~ 100%</li>
    </ul>
    <h4>结果解读</h4>
    <ul>
      <li><strong>100%</strong>: 只击毁，无任何损失</li>
      <li><strong>0% ~ 100%</strong>: 击毁价值大于损失价值</li>
      <li><strong>0%</strong>: 击毁价值等于损失价值</li>
      <li><strong>负数</strong>: 损失价值大于击毁价值</li>
    </ul>
  </div>
</el-dialog>
</template>
        </el-result>
      </div>

      <!-- 已登录内容 -->
      <div v-else class="kb-content">
        <!-- 角色信息卡片 -->
        <el-card class="character-card" shadow="hover">
          <div class="character-info">
            <div class="char-avatar">
              <img :src="`/evetech/characters/${characterInfo.character_id}/portrait?size=64`" 
                   alt="avatar" 
                   @error="handleAvatarError" />
            </div>
            <div class="char-details">
              <h3>{{ characterInfo.character_name }}</h3>
              <p>角色ID: {{ characterInfo.character_id }}</p>
            </div>
            <div class="sync-actions">
              <el-button 
                type="primary" 
                :loading="syncing" 
                @click="syncKB"
                :disabled="!hasKillmailScope"
              >
                {{ syncing ? '同步中...' : '同步KB数据' }}
              </el-button>
              <el-tooltip v-if="!hasKillmailScope" content="需要授权killmails权限才能同步数据" placement="bottom">
                <el-icon class="warning-icon"><Warning /></el-icon>
              </el-tooltip>
            </div>
          </div>
        </el-card>

        <!-- 统计卡片 -->
        <div class="stats-grid" v-if="stats">
          <el-card class="stat-card kills-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-label">击毁</div>
              <div class="stat-value">{{ stats.kills_count || 0 }}</div>
              <div class="stat-isk highlighted">{{ formatISK(stats.kills_isk) }} ISK</div>
            </div>
          </el-card>
          <el-card class="stat-card losses-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-label">损失</div>
              <div class="stat-value">{{ stats.losses_count || 0 }}</div>
              <div class="stat-isk highlighted">{{ formatISK(stats.losses_isk) }} ISK</div>
            </div>
          </el-card>
          <el-card class="stat-card efficiency-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-label">
                效率分
                <el-tooltip content="效率分 = (击毁总价值 - 损失总价值) / 击毁总价值 × 100%" placement="top">
                  <el-button size="small" link @click="showEfficiencyDialog = true" class="info-icon">
                    <i class="el-icon-info"></i>
                  </el-button>
                </el-tooltip>
              </div>
              <div class="stat-value" :class="getEfficiencyClass(stats.efficiency)">
                {{ Math.round(parseFloat(stats.efficiency) || 0) }}
              </div>
              <div class="stat-bar">
                <div class="efficiency-bar" :style="{ width: Math.min(Math.abs(parseFloat(stats.efficiency) || 0), 100) + '%' }"></div>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 同步结果 -->
        <el-alert 
          v-if="syncResult" 
          :title="syncResult.success ? '同步成功' : '同步失败'" 
          :type="syncResult.success ? 'success' : 'error'"
          :description="syncResult.message"
          show-icon
          closable
          @close="syncResult = null"
          style="margin-bottom: 20px;"
        />

        <!-- ========== 详情页（隐藏列表） ========== -->
        <div v-if="selectedKill" class="detail-view">
          <div class="detail-header">
            <el-button type="info" text @click="selectedKill = null; detailData = null">
              <el-icon><ArrowLeft /></el-icon> 返回列表
            </el-button>
            <h3 class="detail-title">击毁详情 #{{ selectedKill.killmail_id }}</h3>
          </div>

          <!-- 加载中 -->
          <div v-if="loadingDetail" class="loading-section">
            <el-skeleton :rows="10" animated />
          </div>

          <!-- 详情内容 -->
          <div v-else-if="detailData" class="detail-content">
            <!-- 基本信息 -->
            <el-card class="detail-card" shadow="hover">
              <template #header><span>基本信息</span></template>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="Killmail ID">{{ detailData.killmail_id }}</el-descriptions-item>
                <el-descriptions-item label="时间">{{ formatDate(detailData.killmail_time) }}</el-descriptions-item>
                <el-descriptions-item label="星系">
                  {{ selectedKill.solar_system_name ? `${selectedKill.solar_system_name}（${detailData.solar_system_id}）` : `ID: ${detailData.solar_system_id}` }}
                </el-descriptions-item>
                <el-descriptions-item label="安全等级">
                  <span v-if="selectedKill.security_status !== null" :style="{ color: getSecurityColor(selectedKill.security_status) }">
                    {{ selectedKill.security_status.toFixed(1) }}
                  </span>
                  <span v-else>-</span>
                </el-descriptions-item>
                <el-descriptions-item label="总价值">
                  <span class="isk-value">{{ formatISK(detailData.total_value) }} ISK</span>
                </el-descriptions-item>
                <el-descriptions-item label="攻击者数量">{{ detailData.attackers_count }}</el-descriptions-item>
                <el-descriptions-item label="War ID">{{ detailData.war_id || '-' }}</el-descriptions-item>
                <el-descriptions-item label="NPC击杀">
                  <span v-if="selectedKill.is_npc" class="npc-kill-tag yes">
                    <el-tag type="info" size="small">是</el-tag>
                  </span>
                  <span v-else class="npc-kill-tag no">
                    否
                  </span>
                </el-descriptions-item>
              </el-descriptions>
            </el-card>

            <!-- 舰船图片 -->
            <div class="ship-images" v-if="detailData.victim?.ship_type_id || detailData.main_attacker?.ship_type_id">
              <div class="ship-img-box" v-if="detailData.victim?.ship_type_id">
                <span class="img-label loss">受害者舰船</span>
                <span class="img-ship-name loss">{{ detailData.victim.ship_type_name || '-' }}</span>
                <img :src="`/evetech/types/${detailData.victim.ship_type_id}/render?size=256`" 
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
                  {{ detailData.victim.character_id || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="公司">
                  {{ detailData.victim.corporation_id || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="联盟">
                  {{ detailData.victim.alliance_id || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="派系">
                  {{ detailData.victim.faction_id || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="舰船">
                  <span class="ship-name loss">{{ detailData.victim.ship_type_name || '-' }}</span>
                  <span v-if="detailData.victim.ship_type_id" class="type-id"> ({{ detailData.victim.ship_type_id }})</span>
                </el-descriptions-item>
                <el-descriptions-item label="承受伤害">{{ detailData.victim.damage_taken || 0 }}</el-descriptions-item>
              </el-descriptions>
            </el-card>

            <!-- 受害者物品 -->
            <el-card class="detail-card" shadow="hover">
              <template #header>
                <div class="items-header">
                  <span class="section-title-text victim-title">物品列表</span>
                  <span class="total-value">总损失估值: {{ formatISK(detailData.victim.items_value) }} ISK</span>
                </div>
              </template>
              
              <!-- 高槽 -->
              <div v-if="groupedItems.highSlots.length > 0" class="slot-section">
                <div class="slot-title high-slot">高槽 ({{ groupedItems.highSlots.length }}) - {{ formatISK(groupedItems.highSlotsValue) }}</div>
                <el-table :data="groupedItems.highSlots" style="width: 100%" size="small" :row-class-name="getItemRowClass">
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
                <el-table :data="groupedItems.midSlots" style="width: 100%" size="small" :row-class-name="getItemRowClass">
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
                <el-table :data="groupedItems.lowSlots" style="width: 100%" size="small" :row-class-name="getItemRowClass">
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
                <el-table :data="groupedItems.rigs" style="width: 100%" size="small" :row-class-name="getItemRowClass">
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
                <el-table :data="groupedItems.cargo" style="width: 100%" size="small" :row-class-name="getItemRowClass">
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
                <el-table :data="groupedItems.other" style="width: 100%" size="small" :row-class-name="getItemRowClass">
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

            <!-- 最后一击 -->
            <el-card class="detail-card" shadow="hover" v-if="detailData.main_attacker">
              <template #header><span class="section-title-text killer-title">最后一击</span></template>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="角色">
                  <span v-if="detailData.main_attacker.character_id === 'NPC'">NPC</span>
                  <span v-else-if="detailData.main_attacker.character_name">
                    {{ detailData.main_attacker.character_name }} ({{ detailData.main_attacker.character_id }})
                  </span>
                  <span v-else>{{ getCharacterNameWithId(detailData.main_attacker.character_id) }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="公司">
                  {{ detailData.main_attacker.corporation_id || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="联盟">
                  {{ detailData.main_attacker.alliance_id || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="派系">
                  {{ detailData.main_attacker.faction_id || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="舰船">
                  <span class="ship-name">{{ detailData.main_attacker.ship_type_name || '-' }}</span>
                  <span v-if="detailData.main_attacker.ship_type_id" class="type-id"> ({{ detailData.main_attacker.ship_type_id }})</span>
                </el-descriptions-item>
                <el-descriptions-item label="武器">
                  <span class="weapon-name">{{ detailData.main_attacker.weapon_type_name || '-' }}</span>
                  <span v-if="detailData.main_attacker.weapon_type_id" class="type-id"> ({{ detailData.main_attacker.weapon_type_id }})</span>
                </el-descriptions-item>
                <el-descriptions-item label="造成伤害">{{ detailData.main_attacker.damage_done || 0 }}</el-descriptions-item>
                <el-descriptions-item label="安全等级">{{ detailData.main_attacker.security_status ?? '-' }}</el-descriptions-item>
              </el-descriptions>
            </el-card>

            <!-- 协助者列表 -->
            <el-card class="detail-card" shadow="hover">
              <template #header>
                <span class="section-title-text killer-title">协助者 ({{ detailData.supporters?.length || 0 }})</span>
              </template>
              <el-table :data="detailData.supporters || []" style="width: 100%" size="small" max-height="400">
                <el-table-column label="角色" prop="character_id" width="120">
                  <template #default="{ row }">
                    {{ row.character_id || 'NPC' }}
                  </template>
                </el-table-column>
                <el-table-column label="公司" prop="corporation_id" width="120" />
                <el-table-column label="舰船" min-width="180">
                  <template #default="{ row }">
                    <span class="ship-name">{{ row.ship_type_name || '-' }}</span>
                    <span v-if="row.ship_type_id" class="type-id"> ({{ row.ship_type_id }})</span>
                  </template>
                </el-table-column>
                <el-table-column label="武器" min-width="150">
                  <template #default="{ row }">
                    <span v-if="row.weapon_type_name">{{ row.weapon_type_name }}</span>
                    <span v-else-if="row.weapon_type_id">ID: {{ row.weapon_type_id }}</span>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
                <el-table-column label="伤害" prop="damage_done" width="100" align="right">
                  <template #default="{ row }">
                    <span class="isk-value">{{ row.damage_done?.toLocaleString() || 0 }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="安全等级" width="90" align="center">
                  <template #default="{ row }">
                    {{ row.security_status ?? '-' }}
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </div>
        </div>

        <!-- ========== KB记录列表 ========== -->
        <el-card v-else class="kb-records-card" shadow="hover">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="击毁记录" name="kills">
              <div v-if="loadingKills" class="loading-section">
                <el-skeleton :rows="5" animated />
              </div>
              <div v-else-if="kills.length === 0" class="empty-section">
                <el-empty description="暂无击毁记录" />
              </div>
              <div v-else class="kb-table-wrapper">
                <el-table :data="kills" style="width: 100%" :row-class-name="getRowClass">
                  <el-table-column label="时间" prop="killmail_time" width="160">
                    <template #default="{ row }">
                      {{ formatDate(row.killmail_time) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="受害者" min-width="150">
                    <template #default="{ row }">
                      <div class="victim-info">
                        <span class="ship-name clickable" @click="showDetail(row)">{{ row.victim_ship_name || `舰船ID: ${row.victim_ship_type_id}` }}</span>
                        <span class="char-name" v-if="row.victim_character_name">{{ row.victim_character_name }}</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="星系" prop="solar_system_name" width="180">
                    <template #default="{ row }">
                      {{ row.solar_system_name ? `${row.solar_system_name}（${row.solar_system_id}）` : `ID: ${row.solar_system_id}` }}
                    </template>
                  </el-table-column>
                  <el-table-column label="安全等级" width="90" align="center">
                    <template #default="{ row }">
                      <span v-if="row.security_status !== null" :style="{ color: getSecurityColor(row.security_status) }">
                        {{ row.security_status.toFixed(1) }}
                      </span>
                      <span v-else>-</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="价值" width="120" align="right">
                    <template #default="{ row }">
                      <span class="isk-value">{{ formatISK(row.total_value) }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="参与人数" prop="attackers_count" width="90" align="center" />
                </el-table>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="损失记录" name="losses">
              <div v-if="loadingLosses" class="loading-section">
                <el-skeleton :rows="5" animated />
              </div>
              <div v-else-if="losses.length === 0" class="empty-section">
                <el-empty description="暂无损失记录" />
              </div>
              <div v-else class="kb-table-wrapper">
                <el-table :data="losses" style="width: 100%" :row-class-name="getRowClass">
                  <el-table-column label="时间" prop="killmail_time" width="160">
                    <template #default="{ row }">
                      {{ formatDate(row.killmail_time) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="损失舰船" min-width="150">
                    <template #default="{ row }">
                      <div class="victim-info">
                        <span class="ship-name loss clickable" @click="showDetail(row)">{{ row.victim_ship_name || `舰船ID: ${row.victim_ship_type_id}` }}</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="击毁者" min-width="150">
                    <template #default="{ row }">
                      <span v-if="row.final_blow_character_name">{{ row.final_blow_character_name }}</span>
                      <span v-else-if="row.is_npc" class="npc-tag">NPC</span>
                      <span v-else>-</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="星系" width="180">
                    <template #default="{ row }">
                      {{ row.solar_system_name ? `${row.solar_system_name}（${row.solar_system_id}）` : `ID: ${row.solar_system_id}` }}
                    </template>
                  </el-table-column>
                  <el-table-column label="安全等级" width="90" align="center">
                    <template #default="{ row }">
                      <span v-if="row.security_status !== null" :style="{ color: getSecurityColor(row.security_status) }">
                        {{ row.security_status.toFixed(1) }}
                      </span>
                      <span v-else>-</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="损失价值" width="120" align="right">
                    <template #default="{ row }">
                      <span class="isk-value loss">{{ formatISK(row.total_value) }}</span>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Warning, ArrowLeft, Top, Bottom, Refresh } from '@element-plus/icons-vue'

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE || ''

const characterInfo = ref(null)
const syncing = ref(false)
const syncResult = ref(null)
const stats = ref(null)
const kills = ref([])
const losses = ref([])
const loadingKills = ref(false)
const loadingLosses = ref(false)
const activeTab = ref('kills')
const selectedKill = ref(null)
const detailData = ref(null)
const loadingDetail = ref(false)

// 订单详情弹窗相关
const orderDialogVisible = ref(false)
const selectedItem = ref(null)
const queryingOrders = ref(false)
const syncingOrder = ref(false)
const buyOrders = ref([])
const sellOrders = ref([])

// 效率分详情弹窗
const showEfficiencyDialog = ref(false)

// 检查是否有killmail权限
const hasKillmailScope = computed(() => {
  if (!characterInfo.value?.scopes) return false
  const scopes = characterInfo.value.scopes
  return scopes.includes('esi-killmails.read_killmails') || 
         scopes.includes('esi-killmails.read_corporation_killmails')
})

// 根据flag值判断槽位类型
const getSlotType = (flag) => {
  // 高槽: 27-34
  if (flag >= 27 && flag <= 34) return 'high'
  // 中槽: 19-26
  if (flag >= 19 && flag <= 26) return 'mid'
  // 低槽: 11-18
  if (flag >= 11 && flag <= 18) return 'low'
  // 改装件: 92-99
  if (flag >= 92 && flag <= 99) return 'rig'
  // 货仓: 5
  if (flag === 5) return 'cargo'
  // 其他
  return 'other'
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
    } else {
      merged[key] = { ...item }
    }
  }
  return Object.values(merged)
}

// 按槽位分组并合并物品
const groupedItems = computed(() => {
  if (!detailData.value?.victim?.items) {
    return { 
      highSlots: [], midSlots: [], lowSlots: [], rigs: [], cargo: [], other: [],
      highSlotsValue: 0, midSlotsValue: 0, lowSlotsValue: 0, rigsValue: 0, cargoValue: 0, otherValue: 0
    }
  }

  const items = detailData.value.victim.items
  const grouped = {
    highSlots: [],
    midSlots: [],
    lowSlots: [],
    rigs: [],
    cargo: [],
    other: []
  }

  // 先按槽位分组
  for (const item of items) {
    const slotType = getSlotType(item.flag)
    grouped[slotType === 'high' ? 'highSlots' :
           slotType === 'mid' ? 'midSlots' :
           slotType === 'low' ? 'lowSlots' :
           slotType === 'rig' ? 'rigs' :
           slotType === 'cargo' ? 'cargo' : 'other'].push(item)
  }

  // 合并相同type_id的物品
  const merged = {
    highSlots: mergeItems(grouped.highSlots),
    midSlots: mergeItems(grouped.midSlots),
    lowSlots: mergeItems(grouped.lowSlots),
    rigs: mergeItems(grouped.rigs),
    cargo: mergeItems(grouped.cargo),
    other: grouped.other // 其他不需要合并
  }

  // 计算各类别的小计
  const sumValue = (items) => items.reduce((sum, item) => sum + (item.value || 0), 0)

  return {
    ...merged,
    highSlotsValue: sumValue(merged.highSlots),
    midSlotsValue: sumValue(merged.midSlots),
    lowSlotsValue: sumValue(merged.lowSlots),
    rigsValue: sumValue(merged.rigs),
    cargoValue: sumValue(merged.cargo),
    otherValue: sumValue(merged.other)
  }
})

onMounted(async () => {
  loadCharacterInfo()
})

const loadCharacterInfo = async () => {
  const saved = localStorage.getItem('eve_character')
  if (saved) {
    const info = JSON.parse(saved)
    characterInfo.value = info
    loadKBData()
  }
  // 加载角色名称映射
  try {
    const response = await fetch(`${API_BASE}/api/characters/names`)
    const data = await response.json()
    if (data.success && data.data) {
      characterNames.value = data.data
    }
  } catch (error) {
    console.error('加载角色名称失败:', error)
  }
}

const loadKBData = async () => {
  if (!characterInfo.value?.character_id) return
  
  loadingKills.value = true
  loadingLosses.value = true
  
  try {
    const response = await fetch(`${API_BASE}/api/kb/my?character_id=${characterInfo.value.character_id}&datasource=serenity`)
    const data = await response.json()
    
    if (data.success) {
      kills.value = data.kills || []
      losses.value = data.losses || []
      stats.value = data.stats
    }
  } catch (e) {
    console.error('Load KB data error:', e)
  } finally {
    loadingKills.value = false
    loadingLosses.value = false
  }
}

const syncKB = async () => {
  if (!characterInfo.value?.character_id) return

  syncing.value = true
  syncResult.value = null

  try {
    const response = await fetch(`${API_BASE}/api/kb/sync/${characterInfo.value.character_id}?datasource=serenity`, {
      method: 'POST'
    })
    const data = await response.json()

    if (data.success) {
      syncResult.value = {
        success: true,
        message: `成功同步 ${data.saved} 条记录，失败 ${data.errors} 条`
      }
      await loadKBData()
      ElMessage.success('KB数据同步成功')
    } else {
      syncResult.value = {
        success: false,
        message: data.error || '同步失败'
      }
      ElMessage.error(data.error || '同步失败')
    }
  } catch (e) {
    console.error('Sync KB error:', e)
    syncResult.value = {
      success: false,
      message: e.message || '网络错误'
    }
    ElMessage.error('同步失败: ' + e.message)
  } finally {
    syncing.value = false
  }
}

const showDetail = async (row) => {
  selectedKill.value = row
  detailData.value = null
  loadingDetail.value = true
  
  try {
    const response = await fetch(`${API_BASE}/api/kb/detail/${row.killmail_id}?datasource=serenity`)
    const data = await response.json()
    
    if (data.success) {
      detailData.value = data
    } else {
      ElMessage.error(data.error || '获取详情失败')
      selectedKill.value = null
    }
  } catch (e) {
    console.error('Fetch detail error:', e)
    ElMessage.error('获取详情失败: ' + e.message)
    selectedKill.value = null
  } finally {
    loadingDetail.value = false
  }
}

// 从数据库获取角色名称映射
const characterNames = ref({})

// 初始化时加载角色名称


// 获取角色名称和ID的显示格式
const getCharacterNameWithId = (characterId) => {
  if (!characterId) return '未知'
  const name = characterNames.value[characterId]
  if (name) {
    return `${name} (${characterId})`
  }
  return characterId
}

const formatISK = (value) => {
  if (!value) return '0'
  const num = parseFloat(value)
  // 中文单位格式化
  if (num >= 10000000000) {
    // 超过100亿：以"百亿"结尾
    return (num / 100000000).toFixed(2) + '亿'
  } else if (num >= 100000000) {
    // 超过亿：以"亿"结尾
    return (num / 100000000).toFixed(2) + '亿'
  } else if (num >= 10000000) {
    // 超过1000万：以"千万"结尾
    return (num / 10000000).toFixed(2) + '千万'
  } else if (num >= 10000) {
    // 超过1万：以"万"结尾
    return (num / 10000).toFixed(2) + '万'
  }
  return num.toFixed(2)
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

const getEfficiencyClass = (efficiency) => {
  const eff = parseFloat(efficiency) || 0
  if (eff >= 70) return 'eff-high'
  if (eff >= 50) return 'eff-medium'
  return 'eff-low'
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
    const response = await fetch(`${API_BASE}/api/orders?type_id=${typeId}&region_id=10000002&datasource=serenity`)
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
    const response = await fetch(`${API_BASE}/api/orders/sync?type_id=${typeId}&region_id=10000002&datasource=serenity`, {
      method: 'POST'
    })
    const data = await response.json()
    
    if (data.success) {
      ElMessage.success(`成功同步 ${data.count} 条订单数据`)
      // 重新加载订单数据
      await showOrderDetails(selectedItem.value)
    } else {
      ElMessage.error(data.error || '同步订单数据失败')
    }
  } catch (error) {
    console.error('同步订单数据失败:', error)
    ElMessage.error('同步订单数据失败')
  } finally {
    syncingOrder.value = false
  }
}

const getSecurityColor = (sec) => {
  if (sec === null || sec === undefined) return '#999'
  const s = parseFloat(sec)
  if (s >= 1.0) return '#409eff'
  if (s >= 0.9) return '#53a8fb'
  if (s >= 0.8) return '#67c23a'
  if (s >= 0.7) return '#8fd13a'
  if (s >= 0.6) return '#b4d84a'
  if (s >= 0.5) return '#e6a23c'
  if (s >= 0.4) return '#e8983c'
  if (s >= 0.3) return '#e86c3a'
  if (s >= 0.2) return '#e85038'
  if (s >= 0.1) return '#e83436'
  if (s > 0) return '#e81834'
  return '#f56c6c'
}

const getRowClass = ({ row }) => {
  return row.is_npc ? 'npc-row' : ''
}

const getItemRowClass = ({ row }) => {
  const classes = []
  if (row.quantity_dropped > 0) {
    classes.push('has-dropped')
  }
  if (row.quantity_destroyed > 0) {
    classes.push('has-destroyed')
  }
  return classes.join(' ')
}

const handleAvatarError = (e) => {
  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgZm9udC1zaXplPSIyMCI+PzwvdGV4dD48L3N2Zz4='
}

const handleImgError = (e) => {
  e.target.style.display = 'none'
}
</script>

<style scoped>
/* NPC击杀显示样式 */
.npc-kill-tag.no {
  color: #ffffff;
  font-weight: 500;
}
.kb-page {
  min-height: calc(100vh - 120px);
  padding: 20px;
}

.kb-container {
  max-width: 1200px;
  margin: 0 auto;
}

.kb-title {
  text-align: center;
  font-size: 28px;
  color: #ffffff;
  margin-bottom: 24px;
  font-weight: 600;
}

.not-logged-in {
  margin-top: 60px;
}

.kb-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.character-card {
  background-color: #1e1e2e;
  border-color: #2d3040;
}

.character-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.char-avatar img {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  border: 2px solid #3d4060;
}

.char-details h3 {
  color: #e0e0e0;
  margin: 0 0 4px 0;
  font-size: 18px;
}

.char-details p {
  color: #999;
  margin: 0;
  font-size: 14px;
}

.sync-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.warning-icon {
  color: #e6a23c;
  font-size: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-card {
  background-color: #1e1e2e;
  border-color: #2d3040;
}

.stat-content {
  text-align: center;
  padding: 10px 0;
}

.stat-label {
  color: #999;
  font-size: 14px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #e0e0e0;
}

.stat-isk {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
}

.stat-isk.highlighted {
  color: #409eff;
  font-size: 14px;
  font-weight: bold;
  margin-top: 6px;
}

.info-icon {
  padding: 0;
  margin: 0;
  font-size: 14px;
  color: #999;
}

.efficiency-explanation h4 {
  margin-top: 20px;
  margin-bottom: 10px;
  color: #303133;
  font-size: 16px;
}

.efficiency-explanation h4:first-child {
  margin-top: 0;
}

.efficiency-explanation .formula {
  background-color: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 14px;
  color: #303133;
  text-align: center;
  margin-bottom: 15px;
}

.efficiency-explanation ul {
  margin: 0;
  padding-left: 20px;
}

.efficiency-explanation li {
  margin-bottom: 8px;
  color: #606266;
  font-size: 14px;
}

.kills-card .stat-value { color: #67c23a; }
.losses-card .stat-value { color: #f56c6c; }
.eff-high { color: #67c23a !important; }
.eff-medium { color: #e6a23c !important; }
.eff-low { color: #f56c6c !important; }

.stat-bar {
  width: 100%;
  height: 6px;
  background-color: #2d3040;
  border-radius: 3px;
  margin-top: 12px;
  overflow: hidden;
}

.efficiency-bar {
  height: 100%;
  background: linear-gradient(90deg, #67c23a, #e6a23c);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.kb-records-card {
  background-color: #1e1e2e;
  border-color: #2d3040;
}

.loading-section,
.empty-section {
  padding: 40px 0;
}

.kb-table-wrapper {
  margin-top: 16px;
}

.victim-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ship-name { color: #67c23a; font-weight: 500; }
.ship-name.loss { color: #f56c6c; }
.char-name { color: #999; font-size: 12px; }
.isk-value { color: #e6a23c; font-family: monospace; }
.isk-value.loss { color: #f56c6c; }
.npc-tag { color: #909399; font-style: italic; }

.clickable {
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.clickable:hover { opacity: 0.8; }

/* ===== 详情页样式 ===== */
.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.detail-title {
  color: #e0e0e0;
  font-size: 20px;
  margin: 0;
  font-weight: 600;
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

/* ===== Element Plus 暗色覆盖 ===== */
:deep(.el-tabs__item) { color: #999; }
:deep(.el-tabs__item.is-active) { color: #409eff; }
:deep(.el-tabs__nav-wrap::after) { background-color: #2d3040; }

:deep(.el-table) { background-color: transparent; }
:deep(.el-table th) { background-color: #252636 !important; color: #999; }
:deep(.el-table tr) { background-color: transparent; }
:deep(.el-table td) { border-bottom-color: #2d3040; }
:deep(.el-table--enable-row-hover .el-table__body tr:hover:not(.has-dropped):not(.has-destroyed) > td) { background-color: #252636 !important; }
:deep(.el-table__body tr.npc-row td) { opacity: 0.7; }
:deep(.el-table__body tr.has-dropped td) { background-color: rgba(103, 194, 58, 0.1) !important; }
:deep(.el-table__body tr.has-destroyed td) { background-color: rgba(245, 108, 108, 0.1) !important; }
:deep(.el-table__body tr.has-dropped.has-destroyed td) { background-color: rgba(103, 194, 58, 0.05) !important; background-image: linear-gradient(45deg, rgba(103, 194, 58, 0.05) 25%, rgba(245, 108, 108, 0.05) 25%, rgba(245, 108, 108, 0.05) 50%, rgba(103, 194, 58, 0.05) 50%, rgba(103, 194, 58, 0.05) 75%, rgba(245, 108, 108, 0.05) 75%, rgba(245, 108, 108, 0.05) 100%) !important; background-size: 10px 10px !important; }

:deep(.el-card__header) { background-color: #252636; border-bottom-color: #2d3040; color: #e0e0e0; }
:deep(.el-card__body) { color: #e0e0e0; }

:deep(.el-descriptions__label) { background-color: #252636 !important; color: #e0e0e0 !important; }
:deep(.el-descriptions__content) { background-color: #1e1e2e !important; color: #e0e0e0 !important; }
:deep(.el-descriptions__cell) { border-color: #2d3040 !important; }

:deep(.el-result__title p) { color: #e0e0e0; }
:deep(.el-result__subtitle p) { color: #999; }
:deep(.el-tag) { border-color: #2d3040; }
:deep(.el-skeleton__item) { background-color: #2d3040; }

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: 1fr; }
  .character-info { flex-direction: column; text-align: center; }
  .sync-actions { margin-left: 0; margin-top: 16px; }
}

/* 订单详情弹窗样式 */
.order-dialog :deep(.el-dialog__header) {
  background-color: #252636;
  border-bottom: 1px solid #2d3040;
}
.order-dialog :deep(.el-dialog__title) {
  color: #e0e0e0;
}
.order-dialog :deep(.el-dialog__body) {
  background-color: #1e1e2e;
  padding: 20px;
}

.sync-order-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background-color: #252636;
  border-radius: 4px;
}

.sync-hint {
  color: #999;
  font-size: 13px;
}

.section-header {
  margin-bottom: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.section-title.sell {
  color: #67c23a;
}

.section-title.buy {
  color: #409eff;
}

.sell-price {
  color: #67c23a;
  font-weight: 500;
}

.buy-price {
  color: #409eff;
  font-weight: 500;
}

/* 物品名称链接样式 */
.item-name-link {
  font-weight: 500;
}

.item-name-link:hover {
  text-decoration: underline;
}
</style>
