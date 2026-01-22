export const WEAPONS = {
  SMALL_NEUTRON: {
    id: 'small_neutron',
    name: '小型中子炮',
    type: 'turret',
    size: 'small',
    damage: 30,
    range: 5000,
    tracking: 0.15,
    rateOfFire: 2000,
    optimalRange: 2000,
    falloffRange: 3000,
    ammoCapacity: 200
  },
  SMALL_RAILGUN: {
    id: 'small_railgun',
    name: '小型磁轨炮',
    type: 'turret',
    size: 'small',
    damage: 20,
    range: 13000,
    tracking: 0.05,
    rateOfFire: 3000,
    optimalRange: 8000,
    falloffRange: 5000,
    ammoCapacity: 200
  }
};
