const pool = require('../config/database');

async function insertMockData() {
  try {
    const mockTypes = [
      {
        id: 1,
        name: '测试物品1',
        description: '这是测试物品1的描述',
        group_id: 1,
        category_id: 1,
        mass: 1000,
        volume: 1,
        capacity: 0.5,
        portion_size: 1,
        published: true
      },
      {
        id: 2,
        name: '测试物品2',
        description: '这是测试物品2的描述',
        group_id: 1,
        category_id: 1,
        mass: 2000,
        volume: 2,
        capacity: 1,
        portion_size: 1,
        published: true
      },
      {
        id: 3,
        name: '测试物品3',
        description: '这是测试物品3的描述',
        group_id: 2,
        category_id: 1,
        mass: 3000,
        volume: 3,
        capacity: 1.5,
        portion_size: 1,
        published: false
      },
      {
        id: 4,
        name: '飞船蓝图',
        description: '这是一个飞船蓝图',
        group_id: 3,
        category_id: 2,
        mass: 5000,
        volume: 5,
        capacity: 2,
        portion_size: 1,
        published: true
      },
      {
        id: 5,
        name: '武器系统',
        description: '这是一个武器系统',
        group_id: 4,
        category_id: 3,
        mass: 1500,
        volume: 1.5,
        capacity: 0.8,
        portion_size: 1,
        published: true
      }
    ];

    for (const type of mockTypes) {
      await pool.execute(
        `INSERT INTO types (id, name, description, group_id, category_id, mass, volume, capacity, portion_size, published) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
           name = VALUES(name), 
           description = VALUES(description), 
           group_id = VALUES(group_id), 
           category_id = VALUES(category_id), 
           mass = VALUES(mass), 
           volume = VALUES(volume), 
           capacity = VALUES(capacity), 
           portion_size = VALUES(portion_size), 
           published = VALUES(published)`,
        [type.id, type.name, type.description, type.group_id, type.category_id, type.mass, type.volume, type.capacity, type.portion_size, type.published]
      );
    }

    console.log('Successfully inserted mock data');
  } catch (error) {
    console.error('Error inserting mock data:', error);
  } finally {
    process.exit();
  }
}

insertMockData();