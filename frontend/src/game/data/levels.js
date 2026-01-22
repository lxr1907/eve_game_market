export const LEVELS = [
  {
    id: 1,
    name: '第一关',
    description: '击败促进级NPC',
    npc: {
      ship: 'prometheus',
      hull: 3600,
      armor: 3000,
      shield: 2400,
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
      hull: 4500,
      armor: 3600,
      shield: 3000,
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
