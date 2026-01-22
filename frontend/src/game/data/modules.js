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
  SHIELD_EXTENDER: {
    id: 'shield_extender',
    name: '护盾扩展装置',
    slot: 'mid',
    effect: {
      type: 'shield_bonus',
      value: 500 // 增加500护盾值
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
  STABILIZER: {
    id: 'stabilizer',
    name: '惯性稳定器',
    slot: 'low',
    effect: {
      type: 'agility_modifier',
      value: 0.1 // 增加10%敏捷
    }
  },
  MAGNETIC_FIELD_STABILIZER: {
    id: 'magnetic_field_stabilizer',
    name: '磁性立场稳定器',
    slot: 'low',
    effect: {
      type: 'damage_modifier',
      value: 0.2 // 增加20%伤害
    }
  },
  // 改装件
  SMALL_TRANSVERSE_BULKHEAD: {
    id: 'small_transverse_bulkhead',
    name: '小型横贯舱壁',
    slot: 'rig',
    effect: {
      type: 'structure_bonus',
      value: 300 // 增加300结构值
    }
  }
};
