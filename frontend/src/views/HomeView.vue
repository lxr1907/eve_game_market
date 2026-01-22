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
              <el-option label="惯性稳定器" value="stabilizer"></el-option>
              <el-option label="加力燃烧器" value="afterburner"></el-option>
              <el-option label="微型跃迁推进器" value="micro_warp_drive"></el-option>
            </el-select>
            <el-select v-model="selectedMidModules[1]" placeholder="选择模块">
              <el-option label="扰频器" value="warp_scrambler"></el-option>
              <el-option label="惯性稳定器" value="stabilizer"></el-option>
              <el-option label="加力燃烧器" value="afterburner"></el-option>
              <el-option label="微型跃迁推进器" value="micro_warp_drive"></el-option>
            </el-select>
          </div>
          
          <div class="slot-group">
            <h4>低槽</h4>
            <el-select v-model="selectedLowModules[0]" placeholder="选择模块">
              <el-option label="装甲维修器" value="armor_repairer"></el-option>
              <el-option label="增强电容器" value="enhanced_capacitor"></el-option>
            </el-select>
            <el-select v-model="selectedLowModules[1]" placeholder="选择模块">
              <el-option label="装甲维修器" value="armor_repairer"></el-option>
              <el-option label="增强电容器" value="enhanced_capacitor"></el-option>
            </el-select>
          </div>
          
          <div class="slot-group">
            <h4>改装件</h4>
            <el-select v-model="selectedRigModules[0]" placeholder="选择改装件">
              <el-option label="速度改装件" value="speed_rig"></el-option>
              <el-option label="伤害改装件" value="damage_rig"></el-option>
            </el-select>
            <el-select v-model="selectedRigModules[1]" placeholder="选择改装件">
              <el-option label="速度改装件" value="speed_rig"></el-option>
              <el-option label="伤害改装件" value="damage_rig"></el-option>
            </el-select>
            <el-select v-model="selectedRigModules[2]" placeholder="选择改装件">
              <el-option label="速度改装件" value="speed_rig"></el-option>
              <el-option label="伤害改装件" value="damage_rig"></el-option>
            </el-select>
          </div>
        </div>
      </div>
      
      <!-- 中心游戏区域 -->
      <div class="game-area">
        <div id="gameCanvas" ref="gameCanvas"></div>
      </div>
      
      <!-- 右侧关卡选择 -->
      <div class="right-panel">
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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
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
    // 设置最大速度
    shipSprite.body.maxVelocity.set(shipData.maxSpeed / 100);
    // 设置质量
    shipSprite.body.mass = shipData.mass / 1000000;
    // 这里可以添加更多属性的应用
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
  graphics.fillStyle(0x0000ff, 1);
  graphics.fillTriangle(20, 0, -10, -10, -10, 10);
  graphics.generateTexture('prometheus', 30, 20);
  graphics.fillStyle(0xffff00, 1);
  graphics.fillCircle(5, 5, 5);
  graphics.generateTexture('bullet', 10, 10);
  graphics.destroy();
  
  // 创建玩家舰船
  scene.player = scene.physics.add.sprite(200, 300, selectedShip.value);
  scene.player.setCollideWorldBounds(true);
  applyShipProperties(scene.player, selectedShip.value);
  
  // 创建NPC舰船
  scene.npc = scene.physics.add.sprite(600, 300, 'prometheus');
  scene.npc.setCollideWorldBounds(true);
  scene.npc.hull = level.npc.hull;
  scene.npc.armor = level.npc.armor;
  scene.npc.shield = level.npc.shield;
  scene.npc.maxSpeed = level.npc.maxSpeed;
  scene.npc.isAttacked = false;
  
  // 创建边界
  scene.boundary = scene.add.circle(400, 300, 400, 0xffffff, 0.1);
  scene.boundary.setStrokeStyle(2, 0xffffff, 0.5);
  
  // 输入控制
  scene.cursors = scene.input.keyboard.createCursorKeys();
  
  // 武器系统
  scene.weapon = selectedWeapon.value || 'small_neutron';
  scene.lastFired = 0;
  // 将武器ID转换为大写键
  const weaponKey = scene.weapon.toUpperCase();
  const weaponData = WEAPONS[weaponKey];
  scene.fireRate = weaponData ? weaponData.rateOfFire : WEAPONS.SMALL_NEUTRON.rateOfFire;
  
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
        ship.body.maxVelocity.set(module.effect.value / 100);
      } else if (module.id === 'micro_warp_drive') {
        // 微型跃迁推进器效果
        ship.body.maxVelocity.set(module.effect.value / 100);
        // 标记开启了微型跃迁推进器
        scene.isMWDActive = true;
      }
    }
  });
  
  // 应用低槽模块效果
  modules.low.forEach(moduleId => {
    const module = MODULES[moduleId.toUpperCase()];
    if (module) {
      console.log('Applying module:', module.name);
      // 这里实现模块效果的应用
    }
  });
  
  // 应用改装件效果
  modules.rig.forEach(moduleId => {
    const module = MODULES[moduleId.toUpperCase()];
    if (module) {
      console.log('Applying module:', module.name);
      // 这里实现模块效果的应用
    }
  });
};

// 生命周期
onMounted(() => {
  // 初始化游戏
  initGame();
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
  playerGraphics.fillStyle(0x0000ff, 1);
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
  
  // 创建边界
  this.boundary = this.add.circle(400, 300, 400, 0xffffff, 0.1);
  this.boundary.setStrokeStyle(2, 0xffffff, 0.5);
  
  // 输入控制
  this.cursors = this.input.keyboard.createCursorKeys();
}

function update() {
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
  const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, 400, 300);
  if (distance > 400) {
    const angle = Phaser.Math.Angle.Between(400, 300, this.player.x, this.player.y);
    this.player.x = 400 + Math.cos(angle) * 400;
    this.player.y = 300 + Math.sin(angle) * 400;
  }
}

// 游戏场景更新函数
const updateGameScene = function() {
  // 玩家控制 - 仅在未选择自动机动时使用
  if (this.cursors.left.isDown) {
    this.player.setAngularVelocity(-100);
  } else if (this.cursors.right.isDown) {
    this.player.setAngularVelocity(100);
  } else {
    this.player.setAngularVelocity(0);
  }
  
  // 自动机动逻辑
  if (this.maneuver && this.npc) {
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
      // 计算加速度方向
      const accelerationX = 50 * Math.cos(this.player.rotation);
      const accelerationY = 50 * Math.sin(this.player.rotation);
      this.player.setAcceleration(accelerationX, accelerationY);
    } else {
      // 没有加速时，逐渐减速（惯性）
      this.player.setAcceleration(
        -this.player.body.velocity.x * 0.1,
        -this.player.body.velocity.y * 0.1
      );
    }
  }
  
  // 武器系统 - 空格键开火
  if (this.input.keyboard.checkDown(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE), this.fireRate)) {
    fireWeapon(this);
  }
  
  // NPC AI
  if (this.npc) {
    updateNPC(this);
  }
  
  // 边界检查
  checkBoundary(this.player, 400, 300, 400);
  if (this.npc) {
    checkBoundary(this.npc, 400, 300, 400);
  }
};

// 接近机动执行函数
const executeApproachManeuver = (scene, distance) => {
  const player = scene.player;
  const target = scene.npc;
  
  // 计算距离（转换为米）
  const currentDistance = Phaser.Math.Distance.Between(player.x, player.y, target.x, target.y) * 100;
  console.log('Current distance:', currentDistance, 'Desired distance:', distance);
  
  // 计算方向角
  const angle = Phaser.Math.Angle.Between(player.x, player.y, target.x, target.y);
  
  // 转向目标
  player.setRotation(angle);
  
  // 如果距离大于设定距离，加速接近
  if (currentDistance > distance) {
    const accelerationX = 100 * Math.cos(angle);
    const accelerationY = 100 * Math.sin(angle);
    player.setAcceleration(accelerationX, accelerationY);
    console.log('Approaching target');
  } else {
    // 距离合适，减速保持
    player.setAcceleration(
      -player.body.velocity.x * 0.1,
      -player.body.velocity.y * 0.1
    );
    console.log('Maintaining distance');
    // 在合适距离自动开炮
    fireWeapon(scene);
  }
};

// 环绕机动执行函数
const executeOrbitManeuver = (scene, distance) => {
  const player = scene.player;
  const target = scene.npc;
  
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
    const accelerationX = 100 * Math.cos(approachAngle);
    const accelerationY = 100 * Math.sin(approachAngle);
    player.setAcceleration(accelerationX, accelerationY);
    console.log('Approaching to orbit distance');
  } else if (currentDistance < distance) {
    // 距离太近，远离目标
    const retreatAngle = angleToTarget + Math.PI;
    const accelerationX = 100 * Math.cos(retreatAngle);
    const accelerationY = 100 * Math.sin(retreatAngle);
    player.setAcceleration(accelerationX, accelerationY);
    console.log('Retreating to orbit distance');
  } else {
    // 距离合适，保持环绕
    const accelerationX = 100 * Math.cos(orbitAngle);
    const accelerationY = 100 * Math.sin(orbitAngle);
    player.setAcceleration(accelerationX, accelerationY);
    console.log('Maintaining orbit');
    // 在合适距离自动开炮
    fireWeapon(scene);
  }
};

// 开火函数
const fireWeapon = (scene) => {
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
      // 计算命中率
      let hitChance = 1.0;
      // 如果NPC开启了微型跃迁推进器，增加命中率
      if (npc.isMWDActive) {
        hitChance = 1.5; // 增加50%命中率
      }
      // 这里可以实现更复杂的命中计算
      damageNPC(npc, weaponData.damage * hitChance);
    }
    bullet.destroy();
  });
  
  // 子弹生命周期
  scene.time.delayedCall(2000, () => {
    if (bullet.active) {
      bullet.destroy();
    }
  });
};

// NPC更新函数
const updateNPC = (scene) => {
  const npc = scene.npc;
  
  // 计算玩家距离
  const distance = Phaser.Math.Distance.Between(npc.x, npc.y, scene.player.x, scene.player.y);
  
  // 转向玩家
  const angle = Phaser.Math.Angle.Between(npc.x, npc.y, scene.player.x, scene.player.y);
  npc.setRotation(angle);
  
  // 如果被攻击，开始接近玩家
  if (npc.isAttacked) {
    // 检查是否被上扰频
    let effectiveMaxSpeed = npc.maxSpeed;
    if (npc.isScrambled) {
      effectiveMaxSpeed = 300; // 被上扰频后的最大速度
    }
    
    // 实现惯性模拟的加速
    const accelerationX = 30 * Math.cos(npc.rotation);
    const accelerationY = 30 * Math.sin(npc.rotation);
    npc.setAcceleration(accelerationX, accelerationY);
    
    // 限制最大速度
    if (npc.body.speed > effectiveMaxSpeed / 100) {
      npc.body.velocity.normalize().scale(effectiveMaxSpeed / 100);
    }
    
    // 如果距离小于武器范围，开火
    if (distance < 500) {
      // NPC开火逻辑
      npcFire(npc, scene.player, scene);
    }
  } else {
    // 没有被攻击时，逐渐减速（惯性）
    npc.setAcceleration(
      -npc.body.velocity.x * 0.1,
      -npc.body.velocity.y * 0.1
    );
  }
};

// NPC开火函数
const npcFire = (npc, target, scene) => {
  // 创建子弹
  const bullet = scene.physics.add.sprite(npc.x, npc.y, 'bullet').setScale(0.1);
  bullet.setRotation(npc.rotation);
  bullet.setVelocity(800 * Math.cos(npc.rotation), 800 * Math.sin(npc.rotation));
  bullet.setCollideWorldBounds(true);
  bullet.body.onWorldBounds = true;
  
  // 子弹碰撞检测
  scene.physics.add.overlap(bullet, target, (bullet, player) => {
    // 这里可以实现玩家受伤逻辑
    bullet.destroy();
  });
  
  // 子弹生命周期
  scene.time.delayedCall(2000, () => {
    if (bullet.active) {
      bullet.destroy();
    }
  });
};

// 伤害NPC函数
const damageNPC = (npc, damage) => {
  // 标记NPC被攻击
  npc.isAttacked = true;
  
  // 伤害计算
  if (npc.shield > 0) {
    npc.shield = Math.max(0, npc.shield - damage);
  } else if (npc.armor > 0) {
    npc.armor = Math.max(0, npc.armor - damage);
  } else {
    npc.hull = Math.max(0, npc.hull - damage);
  }
  
  // 检查NPC是否被摧毁
  if (npc.hull <= 0) {
    npc.destroy();
    // 这里可以添加胜利逻辑
  }
};

// 边界检查函数
const checkBoundary = (sprite, centerX, centerY, radius) => {
  const distance = Phaser.Math.Distance.Between(sprite.x, sprite.y, centerX, centerY);
  if (distance > radius) {
    const angle = Phaser.Math.Angle.Between(centerX, centerY, sprite.x, sprite.y);
    sprite.x = centerX + Math.cos(angle) * radius;
    sprite.y = centerY + Math.sin(angle) * radius;
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
</style>