export const LEVELS = [
  {
    id: 1,
    name: '第一关',
    description: '击败促进级NPC',
    npc: {
      ship: 'prometheus',
      hull: 1200,
      armor: 1000,
      shield: 800,
      weapons: ['small_neutron'],
      initialDistance: 10000,
      initialSpeed: 0,
      maxSpeed: 1500,
      scramblerEffect: 300, // 被上扰频后的最大速度
      weaponRange: 5000
    },
    arena: {
      radius: 40000,
      center: { x: 0, y: 0 }
    }
  }
];
