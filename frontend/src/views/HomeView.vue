<template>
  <div class="home-game">
    <div class="game-container">
      <!-- 左侧舰船选择和装备 -->
      <div class="left-panel">
        <h2>舰船选择</h2>
        <div class="ship-selection">
          <el-radio-group v-model="selectedShip" @change="onShipChange">
            <el-radio-button label="atron">阿特龙级</el-radio-button>
            <el-radio-button label="prometheus">促进级</el-radio-button>
          </el-radio-group>
        </div>
        
        <h3>武器装备</h3>
        <div class="weapon-selection">
          <el-select v-model="selectedWeapon" placeholder="选择武器">
            <el-option label="小型中子炮" value="small_neutron"></el-option>
            <el-option label="小型磁轨炮" value="small_railgun"></el-option>
          </el-select>
        </div>
        
        <h3>机动方式</h3>
        <div class="maneuver-selection">
          <el-radio-group v-model="selectedManeuver" @change="onManeuverChange">
            <el-radio-button label="approach">接近</el-radio-button>
            <el-radio-button label="orbit">环绕</el-radio-button>
          </el-radio-group>
        </div>
        
        <h3>距离设置</h3>
        <div class="distance-selection">
          <el-input-number v-model="selectedDistance" :min="100" :max="40000" :step="100" placeholder="输入距离（米）"></el-input-number>
          <span class="distance-unit">米</span>
        </div>
        
        <h3>模块装备</h3>
        <div class="module-selection">
          <div class="slot-group">
            <h4>中槽</h4>
            <el-select v-model="selectedMidModules[0]" placeholder="选择模块">
              <el-option label="扰频器" value="warp_scrambler"></el-option>
              <el-option label="加力燃烧器" value="afterburner"></el-option>
              <el-option label="微型跃迁推进器" value="micro_warp_drive"></el-option>
              <el-option label="护盾扩展装置" value="shield_extender"></el-option>
            </el-select>
            <el-select v-model="selectedMidModules[1]" placeholder="选择模块">
              <el-option label="扰频器" value="warp_scrambler"></el-option>
              <el-option label="加力燃烧器" value="afterburner"></el-option>
              <el-option label="微型跃迁推进器" value="micro_warp_drive"></el-option>
              <el-option label="护盾扩展装置" value="shield_extender"></el-option>
            </el-select>
          </div>
          
          <div class="slot-group">
            <h4>低槽</h4>
            <el-select v-model="selectedLowModules[0]" placeholder="选择模块">
              <el-option label="装甲维修器" value="armor_repairer"></el-option>
              <el-option label="惯性稳定器" value="stabilizer"></el-option>
              <el-option label="磁性立场稳定器" value="magnetic_field_stabilizer"></el-option>
            </el-select>
            <el-select v-model="selectedLowModules[1]" placeholder="选择模块">
              <el-option label="装甲维修器" value="armor_repairer"></el-option>
              <el-option label="惯性稳定器" value="stabilizer"></el-option>
              <el-option label="磁性立场稳定器" value="magnetic_field_stabilizer"></el-option>
            </el-select>
          </div>
          
          <div class="slot-group">
            <h4>改装件</h4>
            <el-select v-model="selectedRigModules[0]" placeholder="选择改装件">
              <el-option label="小型横贯舱壁" value="small_transverse_bulkhead"></el-option>
            </el-select>
            <el-select v-model="selectedRigModules[1]" placeholder="选择改装件">
              <el-option label="小型横贯舱壁" value="small_transverse_bulkhead"></el-option>
            </el-select>
            <el-select v-model="selectedRigModules[2]" placeholder="选择改装件">
              <el-option label="小型横贯舱壁" value="small_transverse_bulkhead"></el-option>
            </el-select>
          </div>
        </div>
      </div>
      
      <!-- 中心游戏区域 -->
      <div class="game-area">
        <div id="gameCanvas" ref="gameCanvas"></div>
        
        <!-- 玩家血量显示 - 左下角 -->
        <div class="player-health-display">
          <div class="health-bars">
            <div class="health-bar-container shield">
              <div class="health-bar-label">
                <span>护盾</span>
                <span class="health-bar-value">{{ playerShieldValue }}/{{ playerMaxShieldValue }}</span>
              </div>
              <div class="health-bar-grid">
                <div v-for="i in 10" :key="'shield-' + i" class="health-bar-segment" :class="{ active: playerShieldPercentage >= i * 10 }"></div>
              </div>
            </div>
            <div class="health-bar-container armor">
              <div class="health-bar-label">
                <span>装甲</span>
                <span class="health-bar-value">{{ playerArmorValue }}/{{ playerMaxArmorValue }}</span>
              </div>
              <div class="health-bar-grid">
                <div v-for="i in 10" :key="'armor-' + i" class="health-bar-segment" :class="{ active: playerArmorPercentage >= i * 10 }"></div>
              </div>
            </div>
            <div class="health-bar-container hull">
              <div class="health-bar-label">
                <span>结构</span>
                <span class="health-bar-value">{{ playerHullValue }}/{{ playerMaxHullValue }}</span>
              </div>
              <div class="health-bar-grid">
                <div v-for="i in 10" :key="'hull-' + i" class="health-bar-segment" :class="{ active: playerHullPercentage >= i * 10 }"></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 目标距离显示 - 左上角 -->
        <div class="distance-display">
          <div class="distance-label">目标距离</div>
          <div class="distance-value">{{ targetDistance }}米</div>
        </div>
        
        <!-- 速度和角速度信息 - 左上角 -->
        <div class="speed-info-display">
          <div class="speed-info-label">速度信息</div>
          <div class="speed-info-item">
            <span>玩家速度:</span>
            <span>{{ playerSpeed }} m/s</span>
          </div>
          <div class="speed-info-item">
            <span>目标速度:</span>
            <span>{{ targetSpeed }} m/s</span>
          </div>
          <div class="speed-info-item">
            <span>角速度:</span>
            <span>{{ angularVelocity.toFixed(2) }} rad/s</span>
          </div>
        </div>
        
        <!-- 倒计时显示 - 左上角 -->
        <div class="countdown-display">
          <div class="countdown-label">倒计时</div>
          <div class="countdown-value">{{ countdownTime }}秒</div>
        </div>
        
        <!-- NPC血量显示 - 右上角 -->
        <div class="npc-health-display">
          <div class="health-bars">
            <div class="health-bar-container shield">
              <div class="health-bar-label">
                <span>护盾</span>
                <span class="health-bar-value">{{ npcShieldValue }}/{{ npcMaxShieldValue }}</span>
              </div>
              <div class="health-bar-grid">
                <div v-for="i in 10" :key="'npc-shield-' + i" class="health-bar-segment" :class="{ active: npcShieldPercentage >= i * 10 }"></div>
              </div>
            </div>
            <div class="health-bar-container armor">
              <div class="health-bar-label">
                <span>装甲</span>
                <span class="health-bar-value">{{ npcArmorValue }}/{{ npcMaxArmorValue }}</span>
              </div>
              <div class="health-bar-grid">
                <div v-for="i in 10" :key="'npc-armor-' + i" class="health-bar-segment" :class="{ active: npcArmorPercentage >= i * 10 }"></div>
              </div>
            </div>
            <div class="health-bar-container hull">
              <div class="health-bar-label">
                <span>结构</span>
                <span class="health-bar-value">{{ npcHullValue }}/{{ npcMaxHullValue }}</span>
              </div>
              <div class="health-bar-grid">
                <div v-for="i in 10" :key="'npc-hull-' + i" class="health-bar-segment" :class="{ active: npcHullPercentage >= i * 10 }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 下方关卡选择 -->
    <div class="bottom-panel">
      <h2>关卡选择</h2>
      <div class="level-selection">
        <el-card v-for="level in levels" :key="level.id" class="level-card">
          <template #header>
            <div class="level-header">
              <span>第{{ level.id }}关</span>
            </div>
          </template>
          <div class="level-content">
            <p>{{ level.description }}</p>
            <el-button type="primary" @click="startLevel(level.id)">开始游戏</el-button>
          </div>
        </el-card>
      </div>
    </div>
    
    <!-- 胜利对话框 -->
    <el-dialog
      v-model="victoryDialogVisible"
      title="胜利！"
      width="400px"
      center
    >
      <div class="victory-content">
        <h3>恭喜你击败了敌人！</h3>
        <p>你成功完成了第{{ currentLevel }}关</p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="resetGame">重新挑战</el-button>
          <el-button type="primary" @click="goToNextLevel">下一关</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 失败对话框 -->
    <el-dialog
      v-model="failureDialogVisible"
      title="失败！"
      width="400px"
      center
    >
      <div class="failure-content">
        <h3>你的舰船被摧毁了！</h3>
        <p>你在第{{ currentLevel }}关失败了</p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="resetGame">重新挑战</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { SHIPS } from '../game/data/ships';
import { WEAPONS } from '../game/data/weapons';
import { MODULES } from '../game/data/modules';
import { LEVELS } from '../game/data/levels';
import Phaser from 'phaser';

// 响应式数据
const selectedShip = ref('atron');
const selectedWeapon = ref('small_neutron');
const selectedManeuver = ref('approach');
const selectedDistance = ref(5000);
const selectedMidModules = ref(['', '']);
const selectedLowModules = ref(['', '']);
const selectedRigModules = ref(['', '', '']);
const gameCanvas = ref(null);
const game = ref(null);
const levels = ref(LEVELS);
const victoryDialogVisible = ref(false);
const failureDialogVisible = ref(false);
const currentLevel = ref(1);

// 血量百分比
const playerHullPercentage = ref(100);
const playerArmorPercentage = ref(100);
const playerShieldPercentage = ref(100);
const npcHullPercentage = ref(100);
const npcArmorPercentage = ref(100);
const npcShieldPercentage = ref(100);

// 实际血量值
const playerHullValue = ref(0);
const playerArmorValue = ref(0);
const playerShieldValue = ref(0);
const npcHullValue = ref(0);
const npcArmorValue = ref(0);
const npcShieldValue = ref(0);

// 最大血量值
const playerMaxHull = ref(SHIPS.ATRON.hull);
const playerMaxArmor = ref(SHIPS.ATRON.armor);
const playerMaxShield = ref(SHIPS.ATRON.shield);
const npcMaxHull = ref(1200);
const npcMaxArmor = ref(1000);
const npcMaxShield = ref(800);

// 计算属性用于显示
const playerMaxHullValue = computed(() => playerMaxHull.value);
const playerMaxArmorValue = computed(() => playerMaxArmor.value);
const playerMaxShieldValue = computed(() => playerMaxShield.value);
const npcMaxHullValue = computed(() => npcMaxHull.value);
const npcMaxArmorValue = computed(() => npcMaxArmor.value);
const npcMaxShieldValue = computed(() => npcMaxShield.value);

// 目标距离
const targetDistance = ref(0);

// 速度和角速度信息
const playerSpeed = ref(0);
const targetSpeed = ref(0);
const angularVelocity = ref(0);

// 倒计时
const countdownTime = ref(100);

// 方法
const onShipChange = () => {
  console.log('Selected ship:', selectedShip.value);
  // 更新游戏中的舰船
  if (game.value && game.value.scene.scenes[0]) {
    const scene = game.value.scene.scenes[0];
    if (scene.player) {
      // 销毁当前舰船
      scene.player.destroy();
      // 创建新舰船
      scene.player = scene.physics.add.sprite(
        scene.player.x,
        scene.player.y,
        selectedShip.value
      );
      scene.player.setCollideWorldBounds(true);
      // 应用舰船属性
      applyShipProperties(scene.player, selectedShip.value);
    }
  }
};

const onManeuverChange = () => {
  console.log('Selected maneuver:', selectedManeuver.value);
};

const startLevel = (levelId) => {
  console.log('Starting level:', levelId);
  console.log('Maneuver:', selectedManeuver.value);
  console.log('Distance:', selectedDistance.value);
  // 初始化游戏场景，应用所有选择的装备
  initGameScene(levelId, selectedManeuver.value, selectedDistance.value);
};

// 应用舰船属性
const applyShipProperties = (shipSprite, shipId) => {
  const shipData = SHIPS[shipId.toUpperCase()];
  if (shipData) {
    // 设置默认最大速度
    shipSprite.targetSpeed = 400; // 玩家不装备加力时最高速度400
    shipSprite.accelerationRate = 400 / 3; // 3秒加速到最大速度
    
    // 设置最大速度（物理引擎用）
    shipSprite.body.maxVelocity.set(shipData.maxSpeed / 100);
    
    // 根据舰船类型设置不同的灵活性
    if (shipId === 'atron') {
      // 阿特龙级 - 更高的灵活性
      shipSprite.body.drag.set(0.02, 0.02); // 更低的惯性
      shipSprite.body.mass = shipData.mass / 4000000; // 更轻的质量
    } else {
      // 促进级 - 较低的灵活性
      shipSprite.body.drag.set(0.07, 0.07); // 更高的惯性
      shipSprite.body.mass = shipData.mass / 1500000; // 更重的质量
    }
    
    // 添加抗性值
    shipSprite.resistances = shipData.resistances;
    // 添加血量值
    shipSprite.hull = shipData.hull;
    shipSprite.armor = shipData.armor;
    shipSprite.shield = shipData.shield;
  }
};

// 初始化游戏场景
const initGameScene = (levelId, maneuver, distance) => {
  if (game.value) {
    game.value.destroy(true);
  }
  
  // 创建新游戏实例
  const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'gameCanvas',
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
        gravity: { x: 0, y: 0 }
      }
    },
    scene: {
      preload: preload,
      create: function() {
        createGameScene(this, levelId, maneuver, distance);
      },
      update: updateGameScene
    }
  };
  
  game.value = new Phaser.Game(config);
};

// 创建游戏场景
const createGameScene = (scene, levelId, maneuver, distance) => {
  // 加载关卡数据
  const level = LEVELS.find(l => l.id === levelId);
  if (!level) return;
  
  // 存储关卡ID
  scene.levelId = levelId;
  
  // 初始化最大血量值
  const shipData = SHIPS[selectedShip.value.toUpperCase()];
  if (shipData) {
    playerMaxHull.value = shipData.hull;
    playerMaxArmor.value = shipData.armor;
    playerMaxShield.value = shipData.shield;
  }
  
  if (level) {
    npcMaxHull.value = level.npc.hull;
    npcMaxArmor.value = level.npc.armor;
    npcMaxShield.value = level.npc.shield;
  }
  
  // 重置血量百分比和实际值
  playerHullPercentage.value = 100;
  playerArmorPercentage.value = 100;
  playerShieldPercentage.value = 100;
  npcHullPercentage.value = 100;
  npcArmorPercentage.value = 100;
  npcShieldPercentage.value = 100;
  
  // 重置实际血量值
  playerHullValue.value = playerMaxHull.value;
  playerArmorValue.value = playerMaxArmor.value;
  playerShieldValue.value = playerMaxShield.value;
  npcHullValue.value = npcMaxHull.value;
  npcArmorValue.value = npcMaxArmor.value;
  npcShieldValue.value = npcMaxShield.value;
  
  // 创建背景
  const background = scene.add.rectangle(400, 300, 800, 600, 0x000033);
  
  // 创建星星背景
  for (let i = 0; i < 100; i++) {
    const x = Phaser.Math.Between(0, 800);
    const y = Phaser.Math.Between(0, 600);
    const star = scene.add.circle(x, y, 1, 0xffffff, 1);
  }
  
  // 使用图形API创建舰船图形
  const graphics = scene.add.graphics();
  graphics.fillStyle(0x00ff00, 1);
  graphics.fillTriangle(20, 0, -10, -10, -10, 10);
  graphics.generateTexture('atron', 30, 20);
  graphics.fillStyle(0xff0000, 1);
  graphics.fillTriangle(20, 0, -10, -10, -10, 10);
  graphics.generateTexture('prometheus', 30, 20);
  graphics.fillStyle(0xffff00, 1);
  graphics.fillCircle(5, 5, 5);
  graphics.generateTexture('bullet', 10, 10);
  graphics.destroy();
  
  // 创建玩家舰船
  scene.player = scene.physics.add.sprite(400, 300, selectedShip.value);
  scene.player.setCollideWorldBounds(true);
  applyShipProperties(scene.player, selectedShip.value);
  
  // 创建NPC舰船 - 在距离中心15000米的轨道上随机位置
  const orbitRadius = 150; // 15000米转换为像素（1像素=100米）
  const randomAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
  const npcX = 400 + Math.cos(randomAngle) * orbitRadius;
  const npcY = 300 + Math.sin(randomAngle) * orbitRadius;
  scene.npc = scene.physics.add.sprite(npcX, npcY, 'prometheus');
  scene.npc.setCollideWorldBounds(true);
  scene.npc.hull = level.npc.hull;
  scene.npc.armor = level.npc.armor;
  scene.npc.shield = level.npc.shield;
  scene.npc.maxSpeed = level.npc.maxSpeed;
  scene.npc.currentSpeed = 0;
  scene.npc.isAttacked = false;
  
  // 添加抗性值 - 使用促进级的抗性
  scene.npc.resistances = {
    shield: {
      electrical: 0.45,
      thermal: 0.35,
      kinetic: 0.25,
      explosive: 0.15
    },
    armor: {
      electrical: 0.15,
      thermal: 0.25,
      kinetic: 0.35,
      explosive: 0.45
    },
    hull: {
      electrical: 0.1,
      thermal: 0.1,
      kinetic: 0.1,
      explosive: 0.1
    }
  };
  

  
  // 输入控制
  scene.cursors = scene.input.keyboard.createCursorKeys();
  
  // 武器系统
  scene.weapon = selectedWeapon.value || 'small_neutron';
  scene.lastFired = 0;
  // 从WEAPONS对象中获取开火频率
  const weaponKey = scene.weapon.toUpperCase();
  const weaponData = WEAPONS[weaponKey];
  scene.fireRate = weaponData ? weaponData.rateOfFire : 1000;
  
  // NPC武器系统 - 固定使用小型磁轨炮
  scene.npcWeapon = 'small_railgun';
  // 从WEAPONS对象中获取开火频率
  const npcWeaponKey = scene.npcWeapon.toUpperCase();
  const npcWeaponData = WEAPONS[npcWeaponKey];
  scene.npcFireRate = npcWeaponData ? npcWeaponData.rateOfFire : 1000;
  scene.npcLastFired = 0;
  
  // 初始化游戏时间
  console.log('Creating game scene, time object:', scene.time);
  if (scene.time && scene.time.now > 0) {
    scene.gameTime = scene.time.now;
    console.log('Game time initialized with Phaser time:', scene.gameTime);
  } else {
    console.log('WARNING: scene.time is undefined or time.now is 0, using Date.now()');
    scene.gameTime = Date.now(); // 作为备用方案
  }
  // 初始化倒计时（100秒）
  scene.countdown = 100;
  // 重置倒计时显示
  countdownTime.value = 100;
  
  // 初始化速度相关变量
  scene.player.currentSpeed = 0;
  scene.player.targetSpeed = 400; // 默认最大速度400m/s
  scene.player.accelerationRate = 400 / 3; // 3秒加速到最大速度
  
  // 初始化NPC速度相关变量
  scene.npc.currentSpeed = 0;
  scene.npc.targetSpeed = 300; // NPC最大速度300m/s
  scene.npc.accelerationRate = 300 / 3; // 3秒加速到最大速度
  scene.npc.orbitDistance = 15000; // NPC环绕距离15000米
  
  // 创建NPC环绕轨道标记
  const orbitMarkerRadius = scene.npc.orbitDistance / 100; // 转换为像素
  const orbitGraphic = scene.add.graphics();
  orbitGraphic.lineStyle(2, 0xffffff, 0.5);
  orbitGraphic.strokeCircle(400, 300, orbitMarkerRadius);
  orbitGraphic.setDepth(1);
  scene.orbitGraphic = orbitGraphic;
  
  // 机动系统
  scene.maneuver = maneuver || 'approach';
  scene.desiredDistance = distance || 5000;
  
  // 模块系统
  scene.modules = {
    mid: selectedMidModules.value.filter(m => m),
    low: selectedLowModules.value.filter(m => m),
    rig: selectedRigModules.value.filter(m => m)
  };
  
  // 应用模块效果
  applyModulesEffects(scene.player, scene.modules, scene);
};

// 应用模块效果
const applyModulesEffects = (ship, modules, scene) => {
  // 应用中槽模块效果
  modules.mid.forEach(moduleId => {
    const module = MODULES[moduleId.toUpperCase()];
    if (module) {
      console.log('Applying module:', module.name);
      // 实现模块效果
      if (module.id === 'afterburner') {
        // 加力燃烧器效果
        ship.targetSpeed = 1000; // 最大速度1000米每秒
        ship.accelerationRate = 1000 / 3; // 3秒加速到最大速度
      } else if (module.id === 'micro_warp_drive') {
        // 微型跃迁推进器效果
        ship.body.maxVelocity.set(module.effect.value / 100);
        // 标记开启了微型跃迁推进器
        scene.isMWDActive = true;
      } else if (module.id === 'shield_extender') {
        // 护盾扩展装置效果
        ship.shield += module.effect.value;
        // 更新最大护盾值
        playerMaxShield.value += module.effect.value;
      }
    }
  });
  
  // 应用低槽模块效果
  modules.low.forEach(moduleId => {
    const module = MODULES[moduleId.toUpperCase()];
    if (module) {
      console.log('Applying module:', module.name);
      // 实现模块效果
      if (module.id === 'magnetic_field_stabilizer') {
        // 磁性立场稳定器效果
        scene.damageBonus = (scene.damageBonus || 0) + module.effect.value;
      } else if (module.id === 'armor_repairer') {
        // 小型装甲维修器效果 - 自动每秒维修50
        if (!scene.repairInterval) {
          scene.repairInterval = scene.time.addEvent({
            delay: 1000, // 1秒
            callback: () => {
              if (scene.player && scene.player.armor < playerMaxArmor.value) {
                const repairAmount = 50;
                scene.player.armor = Math.min(playerMaxArmor.value, scene.player.armor + repairAmount);
                // 显示维修量数值
                createRepairPopup(scene, scene.player.x, scene.player.y, repairAmount);
              }
            },
            loop: true
          });
        }
      }
    }
  });
  
  // 应用改装件效果
  modules.rig.forEach(moduleId => {
    const module = MODULES[moduleId.toUpperCase()];
    if (module) {
      console.log('Applying module:', module.name);
      // 实现模块效果
      if (module.id === 'small_transverse_bulkhead') {
        // 小型横贯舱壁效果
        ship.hull += module.effect.value;
        // 更新最大结构值
        playerMaxHull.value += module.effect.value;
      }
    }
  });
  
  // 确保玩家血量为满
  ship.hull = playerMaxHull.value;
  ship.armor = playerMaxArmor.value;
  ship.shield = playerMaxShield.value;
};

// 生命周期
onMounted(() => {
  // 不再初始化游戏，只在用户点击开始游戏时创建游戏场景
  console.log('HomeView mounted, ready for game start');
});

onUnmounted(() => {
  if (game.value) {
    game.value.destroy(true);
  }
});

// 初始化游戏
const initGame = () => {
  const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'gameCanvas',
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
        gravity: { x: 0, y: 0 }
      }
    },
    scene: {
      preload: preload,
      create: create,
      update: update
    }
  };

  game.value = new Phaser.Game(config);
};

// 游戏场景方法
function preload() {
  // 这里使用Phaser的图形API创建占位符，不再依赖外部图片
}

function create() {
  // 创建游戏场景
  
  // 创建背景
  const background = this.add.rectangle(400, 300, 800, 600, 0x000033);
  
  // 创建星星背景
  for (let i = 0; i < 100; i++) {
    const x = Phaser.Math.Between(0, 800);
    const y = Phaser.Math.Between(0, 600);
    const star = this.add.circle(x, y, 1, 0xffffff, 1);
  }
  
  // 创建玩家舰船
  this.player = this.physics.add.sprite(400, 300, '').setScale(0.5);
  // 使用图形API创建舰船图形
  const playerGraphics = this.add.graphics();
  playerGraphics.fillStyle(0x00ff00, 1);
  playerGraphics.fillTriangle(20, 0, -10, -10, -10, 10);
  playerGraphics.generateTexture('atron', 30, 20);
  playerGraphics.fillStyle(0xff0000, 1);
  playerGraphics.fillTriangle(20, 0, -10, -10, -10, 10);
  playerGraphics.generateTexture('prometheus', 30, 20);
  playerGraphics.fillStyle(0xffff00, 1);
  playerGraphics.fillCircle(5, 5, 5);
  playerGraphics.generateTexture('bullet', 10, 10);
  playerGraphics.destroy();
  
  // 重新创建玩家舰船使用生成的纹理
  this.player.destroy();
  this.player = this.physics.add.sprite(400, 300, 'atron');
  this.player.setCollideWorldBounds(true);
  

  
  // 输入控制
  this.cursors = this.input.keyboard.createCursorKeys();
}

function update() {
  // 检查玩家是否存在
  if (!this.player) {
    return;
  }
  
  // 游戏更新逻辑
  if (this.cursors.left.isDown) {
    this.player.setAngularVelocity(-100);
  } else if (this.cursors.right.isDown) {
    this.player.setAngularVelocity(100);
  } else {
    this.player.setAngularVelocity(0);
  }
  
  if (this.cursors.up.isDown) {
    this.physics.velocityFromRotation(this.player.rotation, 200, this.player.body.velocity);
  } else {
    this.player.setAcceleration(0);
  }
  
  // 边界检查
  checkBoundary(this.player);
}

// 游戏场景更新函数
const updateGameScene = function() {
  // 更新倒计时显示
  console.log('UpdateGameScene called, this:', this);
  console.log('Game object properties:', Object.keys(this));
  
  // 尝试使用Date.now()作为备用方案
  if (this.gameTime !== undefined) {
    const currentTime = this.time?.now || Date.now();
    const elapsedTime = currentTime - this.gameTime;
    const remainingTime = Math.max(0, 100 - Math.floor(elapsedTime / 1000));
    // 更新UI显示
    countdownTime.value = remainingTime;
    // 添加日志输出，调试倒计时更新
    console.log('Countdown update:', { 
      currentTime, 
      gameTime: this.gameTime, 
      elapsedTime, 
      remainingTime, 
      countdownTime: countdownTime.value 
    });
  } else {
    console.log('Countdown update skipped, gameTime:', this.gameTime);
  }
  
  // 检查游戏时长
  if (this.gameTime !== undefined) {
    const currentTime = this.time?.now || Date.now();
    if (currentTime - this.gameTime > 100000) {
      // 超过100秒，玩家失败
      if (this.player) {
        const x = this.player.x;
        const y = this.player.y;
        this.player.destroy();
        createExplosion(this, x, y);
      }
      this.time.delayedCall(2000, () => {
        showFailureMessage(this.levelId);
      });
      return;
    }
  }
  
  // 检查玩家是否存在
  if (!this.player || !this.player.body) {
    return;
  }
  
  // 检查光标是否存在
  if (!this.cursors) {
    this.cursors = this.input.keyboard.createCursorKeys();
  }
  
  // 玩家控制 - 仅在未选择自动机动时使用
  if (this.cursors.left.isDown) {
    this.player.setAngularVelocity(-100);
  } else if (this.cursors.right.isDown) {
    this.player.setAngularVelocity(100);
  } else {
    this.player.setAngularVelocity(0);
  }
  
  // 自动机动逻辑
  if (this.maneuver && this.npc && this.npc.body) {
    if (this.maneuver === 'approach') {
      // 接近模式
      executeApproachManeuver(this, this.desiredDistance);
    } else if (this.maneuver === 'orbit') {
      // 环绕模式
      executeOrbitManeuver(this, this.desiredDistance);
    }
  } else {
    // 手动控制
    if (this.cursors.up.isDown) {
      // 玩家加速逻辑
      this.player.currentSpeed = Math.min(this.player.currentSpeed + this.player.accelerationRate * 0.016, this.player.targetSpeed);
      const speed = this.player.currentSpeed / 100;
      
      // 计算加速度方向
      const accelerationX = speed * Math.cos(this.player.rotation);
      const accelerationY = speed * Math.sin(this.player.rotation);
      this.player.setAcceleration(accelerationX, accelerationY);
    } else {
      // 没有加速时，逐渐减速（惯性）
      this.player.setAcceleration(
        -this.player.body.velocity.x * 0.1,
        -this.player.body.velocity.y * 0.1
      );
      // 重置当前速度
      this.player.currentSpeed = 0;
    }
  }
  
  // 武器系统 - 空格键开火
  if (this.input.keyboard.checkDown(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE), this.fireRate)) {
    fireWeapon(this);
  }
  
  // NPC AI
  if (this.npc && this.npc.body) {
    updateNPC(this);
  }
  
  // 边界检查
  checkBoundary(this.player);
  if (this.npc && this.npc.body) {
    checkBoundary(this.npc);
  }
  
  // 每300ms更新一次速度和角速度信息
  if (!this.lastSpeedUpdate || this.time.now - this.lastSpeedUpdate > 300) {
    updateHealthUI(this);
    this.lastSpeedUpdate = this.time.now;
  }
};

// 接近机动执行函数
const executeApproachManeuver = (scene, distance) => {
  const player = scene.player;
  const target = scene.npc;
  
  // 检查玩家和目标是否存在
  if (!player || !target) {
    return;
  }
  
  // 计算距离（转换为米）
  const currentDistance = Phaser.Math.Distance.Between(player.x, player.y, target.x, target.y) * 100;
  console.log('Current distance:', currentDistance, 'Desired distance:', distance);
  
  // 计算方向角
  const angle = Phaser.Math.Angle.Between(player.x, player.y, target.x, target.y);
  
  // 转向目标
  player.setRotation(angle);
  
  // 如果距离大于设定距离，加速接近
    if (currentDistance > distance) {
      // 玩家加速逻辑
      player.currentSpeed = Math.min(player.currentSpeed + player.accelerationRate * 0.016, player.targetSpeed);
      // 计算目标速度（像素/秒）
      const targetVelocity = player.currentSpeed / 100;
      
      // 使用velocityFromRotation直接设置速度，而不是加速度
      scene.physics.velocityFromRotation(angle, targetVelocity * 100, player.body.velocity);
      console.log('Approaching target, current speed:', player.currentSpeed, 'target speed:', player.targetSpeed);
    } else {
      // 距离合适，减速保持
      player.setAcceleration(
        -player.body.velocity.x * 0.1,
        -player.body.velocity.y * 0.1
      );
      // 重置当前速度
      player.currentSpeed = 0;
      console.log('Maintaining distance');
      // 在合适距离自动开炮
      fireWeapon(scene);
    }
};

// 环绕机动执行函数
const executeOrbitManeuver = (scene, distance) => {
  const player = scene.player;
  const target = scene.npc;
  
  // 检查玩家和目标是否存在
  if (!player || !target) {
    return;
  }
  
  // 计算距离（转换为米）
  const currentDistance = Phaser.Math.Distance.Between(player.x, player.y, target.x, target.y) * 100;
  console.log('Current distance:', currentDistance, 'Desired distance:', distance);
  
  // 计算方向角
  const angleToTarget = Phaser.Math.Angle.Between(player.x, player.y, target.x, target.y);
  
  // 计算环绕方向（垂直于指向目标的方向）
  const orbitAngle = angleToTarget + Math.PI / 2; // 顺时针环绕
  
  // 转向环绕方向
  player.setRotation(orbitAngle);
  
  // 调整距离
    if (currentDistance > distance) {
      // 距离太远，向目标方向移动
      const approachAngle = angleToTarget;
      // 玩家加速逻辑
      player.currentSpeed = Math.min(player.currentSpeed + player.accelerationRate * 0.016, player.targetSpeed);
      const targetVelocity = player.currentSpeed / 100;
      
      // 使用velocityFromRotation直接设置速度
      scene.physics.velocityFromRotation(approachAngle, targetVelocity * 100, player.body.velocity);
      console.log('Approaching to orbit distance');
    } else if (currentDistance < distance * 0.8) {
      // 距离过近，由于惯性会降低速度
      // 远离目标并减速
      const retreatAngle = angleToTarget + Math.PI;
      // 玩家加速逻辑
      player.currentSpeed = Math.min(player.currentSpeed + player.accelerationRate * 0.016, player.targetSpeed);
      const targetVelocity = player.currentSpeed / 100;
      
      // 使用velocityFromRotation直接设置速度
      scene.physics.velocityFromRotation(retreatAngle, targetVelocity * 50, player.body.velocity);
      console.log('Retreating from too close distance');
    } else {
      // 距离合适，保持环绕
      // 玩家加速逻辑
      player.currentSpeed = Math.min(player.currentSpeed + player.accelerationRate * 0.016, player.targetSpeed);
      const targetVelocity = player.currentSpeed / 100;
      
      // 使用velocityFromRotation直接设置速度
      scene.physics.velocityFromRotation(orbitAngle, targetVelocity * 100, player.body.velocity);
      console.log('Maintaining orbit');
      // 在合适距离自动开炮
      fireWeapon(scene);
    }
};

// 开火函数
const fireWeapon = (scene) => {
  // 检查玩家是否存在
  if (!scene.player || !scene.npc) {
    return;
  }
  
  // 计算距离（转换为米）
  const distance = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, scene.npc.x, scene.npc.y) * 100;
  
  // 计算角速度（相对速度）
  const angleToTarget = Phaser.Math.Angle.Between(scene.player.x, scene.player.y, scene.npc.x, scene.npc.y);
  // 计算相对速度（转换为米/秒）
  const relativeVelocity = new Phaser.Math.Vector2(
    (scene.npc.body.velocity.x - scene.player.body.velocity.x) * 100, // 转换为米/秒
    (scene.npc.body.velocity.y - scene.player.body.velocity.y) * 100  // 转换为米/秒
  );
  const relativeSpeed = relativeVelocity.length();
  // 角速度 = 相对速度 / 距离（米）
  const angularVelocity = relativeSpeed / distance;
  
  // 计算命中率
  console.log('=== FIRE DEBUG ===');
  console.log('Weapon:', scene.weapon);
  console.log('Distance:', distance, 'meters');
  console.log('Angular velocity:', angularVelocity, 'rad/s');
  
  let hitChance = calculateHitChance(distance, angularVelocity, scene.weapon);
  console.log('Calculated hit chance:', hitChance);
  
  const randomValue = Math.random();
  console.log('Random value:', randomValue);
  console.log('Hit condition:', randomValue < hitChance);
  console.log('=================');
  
  // 只有命中时才造成伤害
  if (randomValue < hitChance) {
    // 创建子弹
    const bullet = scene.physics.add.sprite(scene.player.x, scene.player.y, 'bullet').setScale(0.1);
    bullet.setRotation(scene.player.rotation);
    bullet.setVelocity(1000 * Math.cos(scene.player.rotation), 1000 * Math.sin(scene.player.rotation));
    bullet.setCollideWorldBounds(true);
    bullet.body.onWorldBounds = true;
    
    // 子弹碰撞检测
    scene.physics.add.overlap(bullet, scene.npc, (bullet, npc) => {
      // 计算伤害
      const weaponKey = scene.weapon.toUpperCase();
      const weaponData = WEAPONS[weaponKey];
      if (weaponData) {
        // 应用伤害 bonus
        const damageBonus = scene.damageBonus || 0;
        const finalDamage = weaponData.damage * (1 + damageBonus);
        damageNPC(npc, finalDamage, scene);
      }
      bullet.destroy();
    });
    
    // 子弹生命周期
    scene.time.delayedCall(2000, () => {
      if (bullet.active) {
        bullet.destroy();
      }
    });
  } else {
    // 未命中提示
    createMissPopup(scene, scene.player.x, scene.player.y);
  }
};

// NPC更新函数
const updateNPC = (scene) => {
  const npc = scene.npc;
  
  // 检查NPC和玩家是否存在
  if (!npc || !npc.body || !scene.player) {
    return;
  }
  
  // 地图中心点
  const mapCenter = { x: 400, y: 300 };
  
  // 计算到地图中心的距离（转换为米）
  const distanceToCenter = Phaser.Math.Distance.Between(npc.x, npc.y, mapCenter.x, mapCenter.y) * 100;
  
  // 计算到玩家的距离（转换为米）
  const distanceToPlayer = Phaser.Math.Distance.Between(npc.x, npc.y, scene.player.x, scene.player.y) * 100;
  
  // 计算到地图中心的角度
  const angleToCenter = Phaser.Math.Angle.Between(npc.x, npc.y, mapCenter.x, mapCenter.y);
  
  // 计算到玩家的角度
  const angleToPlayer = Phaser.Math.Angle.Between(npc.x, npc.y, scene.player.x, scene.player.y);
  
  // NPC按照15000米环绕地图中心
  const orbitDistance = scene.npc.orbitDistance || 15000;
  
  if (distanceToCenter > orbitDistance * 1.2) {
    // 距离地图中心太远，接近中心
    npc.setRotation(angleToCenter);
    
    // 加速逻辑
    npc.currentSpeed = Math.min(npc.currentSpeed + npc.accelerationRate * 0.016, npc.targetSpeed);
    const speed = npc.currentSpeed / 100;
    
    const accelerationX = speed * Math.cos(npc.rotation);
    const accelerationY = speed * Math.sin(npc.rotation);
    npc.setAcceleration(accelerationX, accelerationY);
  } else if (distanceToCenter < orbitDistance * 0.8) {
    // 距离地图中心太近，远离中心
    npc.setRotation(angleToCenter + Math.PI);
    
    // 加速逻辑
    npc.currentSpeed = Math.min(npc.currentSpeed + npc.accelerationRate * 0.016, npc.targetSpeed);
    const speed = npc.currentSpeed / 100;
    
    const accelerationX = speed * Math.cos(npc.rotation);
    const accelerationY = speed * Math.sin(npc.rotation);
    npc.setAcceleration(accelerationX, accelerationY);
  } else {
    // 距离地图中心合适，环绕中心
    // 计算环绕方向（垂直于指向中心的方向）
    const orbitAngle = angleToCenter + Math.PI / 2; // 顺时针环绕
    npc.setRotation(orbitAngle);
    
    // 直接设置速度，确保稳定环绕
    // 使用目标速度的80%，确保稳定运行
    const orbitSpeed = Math.min(npc.targetSpeed * 0.8, 300); // 确保不超过300m/s
    const speedInPixels = orbitSpeed / 100; // 转换为像素/秒（1像素=100米）
    
    // 使用velocityFromRotation直接设置速度，确保稳定环绕
    // 速度单位：像素/秒
    scene.physics.velocityFromRotation(orbitAngle, speedInPixels, npc.body.velocity);
  }
  
  // 如果距离玩家在武器范围内，开火
  // 小型磁轨炮射程：8000-12000米
  if (distanceToPlayer >= 8000 && distanceToPlayer <= 12000) {
    // 检查开火频率
    if (scene.time.now > scene.npcLastFired + scene.npcFireRate) {
      // NPC开火逻辑
      npcFire(npc, scene.player, scene);
      scene.npcLastFired = scene.time.now;
    }
  }
};

// NPC开火函数
const npcFire = (npc, target, scene) => {
  // 计算距离（转换为米）
  const distance = Phaser.Math.Distance.Between(npc.x, npc.y, target.x, target.y) * 100;
  
  // 计算角速度（相对速度）
  // 计算目标相对于NPC的角度变化率
  const angleToTarget = Phaser.Math.Angle.Between(npc.x, npc.y, target.x, target.y);
  // 计算相对速度（转换为米/秒）
  const relativeVelocity = new Phaser.Math.Vector2(
    (target.body.velocity.x - npc.body.velocity.x) * 100, // 转换为米/秒
    (target.body.velocity.y - npc.body.velocity.y) * 100  // 转换为米/秒
  );
  const relativeSpeed = relativeVelocity.length();
  
  // 角速度 = 相对速度 / 距离（米）
  const angularVelocity = relativeSpeed / distance;
  
  // 计算命中率
  let hitChance = calculateHitChance(distance, angularVelocity, scene.npcWeapon);
  
  // 只有命中时才造成伤害
  if (Math.random() < hitChance) {
    // 创建子弹
    const bullet = scene.physics.add.sprite(npc.x, npc.y, 'bullet').setScale(0.1);
    bullet.setRotation(npc.rotation);
    bullet.setVelocity(800 * Math.cos(npc.rotation), 800 * Math.sin(npc.rotation));
    bullet.setCollideWorldBounds(true);
    bullet.body.onWorldBounds = true;
    
    // 子弹碰撞检测
    scene.physics.add.overlap(bullet, target, (bullet, player) => {
      // 计算伤害 - 使用小型磁轨炮的伤害
      const weaponDamage = 20; // 小型磁轨炮伤害
      damagePlayer(player, weaponDamage, scene);
      bullet.destroy();
    });
    
    // 子弹生命周期
    scene.time.delayedCall(2000, () => {
      if (bullet.active) {
        bullet.destroy();
      }
    });
  } else {
    // 未命中提示
    createMissPopup(scene, npc.x, npc.y);
  }
};

// 计算命中率
const calculateHitChance = (distance, angularVelocity, weaponType = 'small_railgun') => {
  // 基础命中率
  let hitChance = 1.0;
  
  // 根据武器类型设置不同的射程参数
  let maxRange, optimalRange, falloffRange;
  
  if (weaponType === 'small_neutron') {
    // 中子炮：最佳射程2000以内，2000-5000命中率下降，5000以上几乎无法命中
    maxRange = 5000;
    optimalRange = 2000;
    falloffRange = 3000;
  } else {
    // 磁轨炮：无最小射程，8000-12000命中率下降
    maxRange = 12000;
    optimalRange = 8000;
    falloffRange = 4000;
  }
  
  // 距离影响 - 移除最小射程检查，只检查最大射程
  if (distance > maxRange * 1.5) { // 最大射程的1.5倍外完全无法命中
    console.log('Range check failed:', { weaponType, distance, maxRange });
    return 0; // 射程外，无法命中
  }
  
  // 添加日志输出，调试命中率计算
  console.log('Hit chance calculation:', { weaponType, distance, angularVelocity });
  
  // 距离衰减
  if (distance <= optimalRange) {
    // 最佳射程内，命中率100%
    hitChance = 1.0;
  } else if (distance > optimalRange && distance <= maxRange) {
    // 从最佳射程到最大射程，命中率逐渐下降
    if (weaponType === 'small_neutron') {
      // 中子炮：2000-5000，命中率从100%下降到30%
      const rangeFactor = (distance - optimalRange) / falloffRange;
      hitChance = 1.0 - rangeFactor * 0.7; // 70%的衰减
    } else {
      // 磁轨炮：从最佳射程到最大射程，命中率逐渐下降
      const rangeFactor = (distance - optimalRange) / falloffRange;
      hitChance = Math.max(0.5, 1.0 - rangeFactor * 0.5);
    }
  } else if (distance > maxRange) {
    // 超过最大射程，命中率极低
    if (weaponType === 'small_neutron') {
      // 中子炮：5000以上，命中率极低，大多数时候打出50%伤害
      const overRange = distance - maxRange;
      const overRangeFactor = Math.min(1.0, overRange / 1000); // 每超过1000米，命中率降低
      hitChance = Math.max(0.1, 0.3 - overRangeFactor * 0.2); // 最低10%命中率
    } else {
      // 磁轨炮：超过最大射程，命中率极低
      hitChance = 0.1;
    }
  }
  
  // 角速度影响（角速度越快，命中率越低）
  // 根据武器类型设置不同的角速度阈值和惩罚参数
  if (weaponType === 'small_neutron') {
    // 中子炮：极大提高角速度容忍度，在高角速度下保持较高命中率
    // 完全移除角速度惩罚，确保近距离100%命中
    hitChance = Math.max(0.8, hitChance); // 最低80%命中率
  } else {
    // 磁轨炮：保持原有的角速度惩罚逻辑
    const angularVelocityThreshold = 0.3;
    if (angularVelocity > angularVelocityThreshold) {
      const angularPenalty = 1.0 - (angularVelocity - angularVelocityThreshold) / 1.5;
      hitChance *= Math.max(0.1, angularPenalty);
    }
  }
  
  // 添加最终命中率日志
  console.log('Final hit chance:', { weaponType, distance, angularVelocity, hitChance });
  
  return Math.max(0, Math.min(1, hitChance));
};

// 爆炸动画函数
const createExplosion = (scene, x, y) => {
  // 创建多个爆炸效果精灵
  for (let i = 0; i < 10; i++) {
    const explosion = scene.add.sprite(x, y, 'bullet');
    explosion.setScale(0.3);
    explosion.setAlpha(1);
    
    // 随机角度和速度
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.FloatBetween(20, 80);
    
    // 计算目标位置
    const targetX = x + Math.cos(angle) * distance;
    const targetY = y + Math.sin(angle) * distance;
    
    // 创建动画
    scene.tweens.add({
      targets: explosion,
      x: targetX,
      y: targetY,
      scale: 0,
      alpha: 0,
      duration: 800,
      ease: 'Power2.easeOut',
      onComplete: function() {
        explosion.destroy();
      }
    });
  }
  
  // 创建中心爆炸效果
  const centerExplosion = scene.add.sprite(x, y, 'bullet');
  centerExplosion.setScale(0);
  centerExplosion.setAlpha(1);
  
  scene.tweens.add({
    targets: centerExplosion,
    scale: 1.5,
    alpha: 0,
    duration: 600,
    ease: 'Power2.easeOut',
    onComplete: function() {
      centerExplosion.destroy();
    }
  });
};

// 伤害NPC函数
const damageNPC = (npc, damage, scene) => {
  // 标记NPC被攻击
  npc.isAttacked = true;
  
  // 伤害类型分布（简化版，实际EVE中不同武器有不同伤害分布）
  const damageDistribution = {
    electrical: 0.25,
    thermal: 0.25,
    kinetic: 0.25,
    explosive: 0.25
  };
  
  // 伤害计算
  if (npc.shield > 0) {
    // 应用护盾抗性
    let effectiveDamage = 0;
    for (const [type, amount] of Object.entries(damageDistribution)) {
      const resistance = npc.resistances?.shield?.[type] || 0;
      effectiveDamage += damage * amount * (1 - resistance);
    }
    npc.shield = Math.max(0, npc.shield - effectiveDamage);
    
    // 显示伤害弹出
    createDamagePopup(scene, npc.x, npc.y, Math.round(effectiveDamage), 'yellow');
  } else if (npc.armor > 0) {
    // 应用装甲抗性
    let effectiveDamage = 0;
    for (const [type, amount] of Object.entries(damageDistribution)) {
      const resistance = npc.resistances?.armor?.[type] || 0;
      effectiveDamage += damage * amount * (1 - resistance);
    }
    npc.armor = Math.max(0, npc.armor - effectiveDamage);
    
    // 显示伤害弹出
    createDamagePopup(scene, npc.x, npc.y, Math.round(effectiveDamage), 'yellow');
  } else {
    // 应用结构抗性
    let effectiveDamage = 0;
    for (const [type, amount] of Object.entries(damageDistribution)) {
      const resistance = npc.resistances?.hull?.[type] || 0;
      effectiveDamage += damage * amount * (1 - resistance);
    }
    npc.hull = Math.max(0, npc.hull - effectiveDamage);
    
    // 显示伤害弹出
    createDamagePopup(scene, npc.x, npc.y, Math.round(effectiveDamage), 'yellow');
  }
  
  // 检查NPC是否被摧毁
  if (npc.hull <= 0) {
    // 记录NPC位置用于爆炸
    const x = npc.x;
    const y = npc.y;
    
    // 销毁NPC
    npc.destroy();
    
    // 创建爆炸动画
    createExplosion(scene, x, y);
    
    // 2秒后显示胜利消息
    scene.time.delayedCall(2000, () => {
      showVictoryMessage(scene.levelId);
    });
  }
};

// 伤害玩家函数
const damagePlayer = (player, damage, scene) => {
  // 伤害类型分布（简化版，实际EVE中不同武器有不同伤害分布）
  const damageDistribution = {
    electrical: 0.25,
    thermal: 0.25,
    kinetic: 0.25,
    explosive: 0.25
  };
  
  // 伤害计算
  if (player.shield > 0) {
    // 应用护盾抗性
    let effectiveDamage = 0;
    for (const [type, amount] of Object.entries(damageDistribution)) {
      const resistance = player.resistances?.shield?.[type] || 0;
      effectiveDamage += damage * amount * (1 - resistance);
    }
    player.shield = Math.max(0, player.shield - effectiveDamage);
    
    // 显示伤害弹出
    createDamagePopup(scene, player.x, player.y, Math.round(effectiveDamage), 'red');
  } else if (player.armor > 0) {
    // 应用装甲抗性
    let effectiveDamage = 0;
    for (const [type, amount] of Object.entries(damageDistribution)) {
      const resistance = player.resistances?.armor?.[type] || 0;
      effectiveDamage += damage * amount * (1 - resistance);
    }
    player.armor = Math.max(0, player.armor - effectiveDamage);
    
    // 显示伤害弹出
    createDamagePopup(scene, player.x, player.y, Math.round(effectiveDamage), 'red');
  } else {
    // 应用结构抗性
    let effectiveDamage = 0;
    for (const [type, amount] of Object.entries(damageDistribution)) {
      const resistance = player.resistances?.hull?.[type] || 0;
      effectiveDamage += damage * amount * (1 - resistance);
    }
    player.hull = Math.max(0, player.hull - effectiveDamage);
    
    // 显示伤害弹出
    createDamagePopup(scene, player.x, player.y, Math.round(effectiveDamage), 'red');
  }
  
  // 检查玩家是否被摧毁
  if (player.hull <= 0) {
    // 记录玩家位置用于爆炸
    const x = player.x;
    const y = player.y;
    
    // 确保结构值显示为0
    player.hull = 0;
    // 更新UI
    updateHealthUI(scene);
    
    // 销毁玩家舰船
    player.destroy();
    
    // 创建爆炸动画
    createExplosion(scene, x, y);
    
    // 2秒后显示失败消息
    scene.time.delayedCall(2000, () => {
      showFailureMessage(scene.levelId);
    });
  }
};

// 边界检查函数 - 使用地图边缘
const checkBoundary = (sprite) => {
  // 限制在地图边界内 (0-800 x, 0-600 y)
  sprite.x = Phaser.Math.Clamp(sprite.x, 0, 800);
  sprite.y = Phaser.Math.Clamp(sprite.y, 0, 600);
};

// 伤害弹出函数
const createDamagePopup = (scene, x, y, damage, color) => {
  // 创建文本对象
  const text = scene.add.text(x, y, '-' + damage, {
    fontSize: '16px',
    fontWeight: 'bold',
    fill: color === 'yellow' ? '#FFFF00' : '#FF0000'
  });
  
  // 设置文本原点为中心
  text.setOrigin(0.5);
  
  // 设置不同的持续时间，红色伤害显示更久
  const duration = color === 'red' ? 2500 : 1000;
  
  // 创建动画
  scene.tweens.add({
    targets: text,
    y: y - 50,
    alpha: 0,
    duration: duration,
    ease: 'Power1.easeOut',
    onComplete: function() {
      text.destroy();
    }
  });
};

// 维修量弹出函数
const createRepairPopup = (scene, x, y, amount) => {
  // 创建文本对象
  const text = scene.add.text(x, y, '+' + amount, {
    fontSize: '16px',
    fontWeight: 'bold',
    fill: '#00FF00'
  });
  
  // 设置文本原点为中心
  text.setOrigin(0.5);
  
  // 创建动画
  scene.tweens.add({
    targets: text,
    y: y - 50,
    alpha: 0,
    duration: 1500,
    ease: 'Power1.easeOut',
    onComplete: function() {
      text.destroy();
    }
  });
};

// 未命中提示函数
const createMissPopup = (scene, x, y) => {
  // 创建文本对象
  const text = scene.add.text(x, y, '未命中', {
    fontSize: '14px',
    fontWeight: 'bold',
    fill: '#FFFFFF'
  });
  
  // 设置文本原点为中心
  text.setOrigin(0.5);
  
  // 创建动画
  scene.tweens.add({
    targets: text,
    y: y - 40,
    alpha: 0,
    duration: 1000,
    ease: 'Power1.easeOut',
    onComplete: function() {
      text.destroy();
    }
  });
};

// 胜利消息函数
const showVictoryMessage = (levelId) => {
  // 显示胜利对话框
  victoryDialogVisible.value = true;
  currentLevel.value = levelId;
};

// 失败消息函数
const showFailureMessage = (levelId) => {
  // 显示失败对话框
  failureDialogVisible.value = true;
  currentLevel.value = levelId;
};

// 重置游戏函数
const resetGame = () => {
  victoryDialogVisible.value = false;
  failureDialogVisible.value = false;
  // 重新开始当前关卡
  startLevel(currentLevel.value);
};

// 进入下一关函数
const goToNextLevel = () => {
  victoryDialogVisible.value = false;
  const nextLevelId = currentLevel.value + 1;
  // 检查下一关是否存在
  const nextLevel = LEVELS.find(l => l.id === nextLevelId);
  if (nextLevel) {
    startLevel(nextLevelId);
  }
};

// 更新血量UI
const updateHealthUI = (scene) => {
  if (scene.player) {
    // 更新玩家血量
    playerHullValue.value = Math.max(0, Math.round(scene.player.hull));
    playerArmorValue.value = Math.max(0, Math.round(scene.player.armor));
    playerShieldValue.value = Math.max(0, Math.round(scene.player.shield));
    playerHullPercentage.value = Math.max(0, (scene.player.hull / playerMaxHull.value) * 100);
    playerArmorPercentage.value = Math.max(0, (scene.player.armor / playerMaxArmor.value) * 100);
    playerShieldPercentage.value = Math.max(0, (scene.player.shield / playerMaxShield.value) * 100);
    
    // 更新玩家速度
    if (scene.player.body) {
      const speed = new Phaser.Math.Vector2(scene.player.body.velocity.x, scene.player.body.velocity.y).length() * 100;
      // 限制显示速度，确保不超过最大速度
      playerSpeed.value = Math.min(Math.round(speed), scene.player.targetSpeed || 400);
    }
  }
  
  if (scene.npc) {
    // 更新NPC血量
    npcHullValue.value = Math.max(0, Math.round(scene.npc.hull));
    npcArmorValue.value = Math.max(0, Math.round(scene.npc.armor));
    npcShieldValue.value = Math.max(0, Math.round(scene.npc.shield));
    npcHullPercentage.value = Math.max(0, (scene.npc.hull / npcMaxHull.value) * 100);
    npcArmorPercentage.value = Math.max(0, (scene.npc.armor / npcMaxArmor.value) * 100);
    npcShieldPercentage.value = Math.max(0, (scene.npc.shield / npcMaxShield.value) * 100);
    
    // 更新目标速度
    if (scene.npc.body) {
      const speed = new Phaser.Math.Vector2(scene.npc.body.velocity.x, scene.npc.body.velocity.y).length() * 100;
      // 限制显示速度，确保不超过最大速度600
      targetSpeed.value = Math.min(Math.round(speed), scene.npc.targetSpeed || 600);
    }
  }
  
  // 更新目标距离
  if (scene.player && scene.npc) {
    const distance = Phaser.Math.Distance.Between(
      scene.player.x, 
      scene.player.y, 
      scene.npc.x, 
      scene.npc.y
    ) * 100; // 转换为米
    targetDistance.value = Math.round(distance);
    
    // 计算角速度（相对速度）
    if (scene.player.body && scene.npc.body) {
      // 计算相对速度
      const relativeVelocity = new Phaser.Math.Vector2(
        scene.npc.body.velocity.x - scene.player.body.velocity.x,
        scene.npc.body.velocity.y - scene.player.body.velocity.y
      );
      const relativeSpeed = relativeVelocity.length();
      
      // 角速度 = 相对速度 / 距离
      const angVelocity = relativeSpeed / (distance / 100);
      angularVelocity.value = angVelocity;
    }
  } else {
    targetDistance.value = 0;
    playerSpeed.value = 0;
    targetSpeed.value = 0;
    angularVelocity.value = 0;
  }
};
</script>

<style scoped>
.home-game {
  min-height: 100vh;
  background-color: #0a0a0a;
  padding: 20px;
}

.game-container {
  display: flex;
  gap: 20px;
  height: 800px;
}

.left-panel {
  width: 300px;
  background-color: #1a1a1a;
  border-radius: 8px;
  padding: 20px;
  overflow-y: auto;
}

.left-panel h2, .left-panel h3, .left-panel h4 {
  color: #ffffff;
  margin-bottom: 15px;
}

.ship-selection {
  margin-bottom: 20px;
}

.weapon-selection, .module-selection {
  margin-bottom: 20px;
}

.slot-group {
  margin-bottom: 15px;
}

.slot-group h4 {
  font-size: 14px;
  color: #cccccc;
  margin-bottom: 10px;
}

.game-area {
  flex: 1;
  background-color: #000000;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

#gameCanvas {
  width: 100%;
  height: 100%;
}

.right-panel {
  width: 300px;
  background-color: #1a1a1a;
  border-radius: 8px;
  padding: 20px;
  overflow-y: auto;
}

.right-panel h2 {
  color: #ffffff;
  margin-bottom: 20px;
}

.level-card {
  margin-bottom: 15px;
  background-color: #2a2a2a !important;
  border-color: #333333 !important;
}

.level-header {
  color: #ffffff;
}

.level-content p {
  color: #cccccc;
  margin-bottom: 15px;
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .game-container {
    flex-direction: column;
    height: auto;
  }
  
  .left-panel, .right-panel {
    width: 100%;
  }
  
  .game-area {
    height: 600px;
  }
}

/* 胜利对话框样式 */
.victory-content {
  text-align: center;
  padding: 20px 0;
}

.victory-content h3 {
  color: #409EFF;
  margin-bottom: 15px;
}

.victory-content p {
  color: #606266;
  margin-bottom: 20px;
}

.dialog-footer {
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 20px;
}

/* 血量显示样式 */
.player-health-display {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 10;
}

.npc-health-display {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
}

.health-bars {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.health-bar-container {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.health-bar-label {
  font-size: 12px;
  color: #fff;
  font-weight: bold;
  text-shadow: 1px 1px 2px #000;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}

.health-bar-value {
  font-size: 11px;
  color: #fff;
  font-weight: normal;
  text-shadow: 1px 1px 2px #000;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 0 4px;
  border-radius: 2px;
}

/* 目标距离显示样式 */
.distance-display {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #444;
}

.distance-label {
  font-size: 12px;
  color: #ccc;
  font-weight: bold;
  margin-bottom: 5px;
  text-align: center;
}

.distance-value {
  font-size: 18px;
  color: #409EFF;
  font-weight: bold;
  text-align: center;
  text-shadow: 1px 1px 2px #000;
}

.speed-info-display {
  position: absolute;
  top: 80px;
  left: 20px;
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #444;
  min-width: 150px;
}

.speed-info-label {
  font-size: 12px;
  color: #ccc;
  font-weight: bold;
  margin-bottom: 8px;
  text-align: center;
}

.speed-info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 12px;
}

.speed-info-item span:first-child {
  color: #ccc;
}

.speed-info-item span:last-child {
  color: #ffffff;
  font-weight: bold;
}

/* 倒计时显示样式 */
.countdown-display {
  position: absolute;
  top: 200px;
  left: 20px;
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #444;
  min-width: 150px;
}

.countdown-label {
  font-size: 12px;
  color: #ccc;
  font-weight: bold;
  margin-bottom: 5px;
  text-align: center;
}

.countdown-value {
  font-size: 18px;
  color: #ff4d4f;
  font-weight: bold;
  text-align: center;
  text-shadow: 1px 1px 2px #000;
}

.health-bar-grid {
  display: flex;
  gap: 2px;
}

.health-bar-segment {
  width: 12px;
  height: 12px;
  background-color: #333;
  border: 1px solid #555;
  transition: background-color 0.3s ease-in-out;
}

.health-bar-segment.active {
  background-color: #fff;
}

/* 不同层级的样式 */
.health-bar-container.shield .health-bar-segment.active {
  background-color: #fff;
}

.health-bar-container.armor .health-bar-segment.active {
  background-color: #fff;
}

.health-bar-container.hull .health-bar-segment.active {
  background-color: #fff;
}
</style>