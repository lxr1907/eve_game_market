export const MODULES = {
  // 中槽模块
  WARP_SCRAMBLER: {
    id: 'warp_scrambler',
    name: '扰频器',
    slot: 'mid',
    effect: {
      type: 'speed_modifier',
      value: 0.2 // 降低目标最大速度到20%
    },
    range: 9000,
    cycleTime: 10000
  },
  STABILIZER: {
    id: 'stabilizer',
    name: '惯性稳定器',
    slot: 'mid',
    effect: {
      type: 'agility_modifier',
      value: 0.1 // 增加10%敏捷
    }
  },
  AFTERBURNER: {
    id: 'afterburner',
    name: '加力燃烧器',
    slot: 'mid',
    effect: {
      type: 'speed_boost',
      value: 1000 // 最大速度1000
    }
  },
  MICRO_WARP_DRIVE: {
    id: 'micro_warp_drive',
    name: '微型跃迁推进器',
    slot: 'mid',
    effect: {
      type: 'speed_boost',
      value: 3000, // 最大速度3000
      signature_penalty: 0.5 // 增加50%被命中率
    }
  },
  // 低槽模块
  ARMOR_REPAIRER: {
    id: 'armor_repairer',
    name: '装甲维修器',
    slot: 'low',
    effect: {
      type: 'repair',
      value: 50,
      cycleTime: 3000
    }
  },
  ENHANCED_CAPACITOR: {
    id: 'enhanced_capacitor',
    name: '增强电容器',
    slot: 'low',
    effect: {
      type: 'capacitor_bonus',
      value: 200
    }
  },
  // 改装件
  SPEED_RIG: {
    id: 'speed_rig',
    name: '速度改装件',
    slot: 'rig',
    effect: {
      type: 'speed_modifier',
      value: 0.15 // 增加15%速度
    }
  },
  DAMAGE_RIG: {
    id: 'damage_rig',
    name: '伤害改装件',
    slot: 'rig',
    effect: {
      type: 'damage_modifier',
      value: 0.1 // 增加10%伤害
    }
  }
};
