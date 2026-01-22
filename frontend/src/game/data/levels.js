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
  },
  {
    id: 2,
    name: '第二关',
    description: '击败加强型促进级NPC',
    npc: {
      ship: 'prometheus',
      hull: 1500,
      armor: 1200,
      shield: 1000,
      weapons: ['small_railgun'],
      initialDistance: 15000,
      initialSpeed: 0,
      maxSpeed: 1800,
      scramblerEffect: 300, // 被上扰频后的最大速度
      weaponRange: 8000
    },
    arena: {
      radius: 40000,
      center: { x: 0, y: 0 }
    }
  }
];
