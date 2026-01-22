export const SHIPS = {
  ATRON: {
    id: 'atron',
    name: '阿特龙级',
    hull: 1000,
    armor: 800,
    shield: 600,
    maxSpeed: 3000,
    acceleration: 150,
    agility: 0.8,
    mass: 1000000,
    signatureRadius: 30,
    turretSlots: 3,
    midSlots: 2,
    lowSlots: 2,
    rigSlots: 3,
    droneBay: 10,
    resistances: {
      shield: {
        electrical: 0.4,
        thermal: 0.3,
        kinetic: 0.2,
        explosive: 0.1
      },
      armor: {
        electrical: 0.1,
        thermal: 0.2,
        kinetic: 0.3,
        explosive: 0.4
      },
      hull: {
        electrical: 0.05,
        thermal: 0.05,
        kinetic: 0.05,
        explosive: 0.05
      }
    }
  },
  PROMETHEUS: {
    id: 'prometheus',
    name: '促进级',
    hull: 1200,
    armor: 1000,
    shield: 800,
    maxSpeed: 2500,
    acceleration: 120,
    agility: 0.7,
    mass: 1200000,
    signatureRadius: 35,
    turretSlots: 4,
    midSlots: 3,
    lowSlots: 2,
    rigSlots: 3,
    droneBay: 15,
    resistances: {
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
    }
  }
};
