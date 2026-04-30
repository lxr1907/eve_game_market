const pool = require('./config/database');

async function checkBlueprintCategory() {
  try {
    // 查询item_categories表，查找蓝图相关的类别
    const [categories] = await pool.execute(
      'SELECT * FROM item_categories WHERE name LIKE ?',
      ['%蓝图%']
    );

    console.log('蓝图相关的类别：');
    console.log(categories);

    // 查询types表，查找蓝图类型
    const [blueprints] = await pool.execute(
      'SELECT * FROM types WHERE category_id = ? LIMIT 10',
      [8]
    );

    console.log('\n蓝图类型示例：');
    console.log(blueprints);

    // 查询types表，查找所有类别
    const [allCategories] = await pool.execute(
      'SELECT DISTINCT category_id FROM types LIMIT 20'
    );

    console.log('\n所有类别ID：');
    console.log(allCategories.map(item => item.category_id));

  } catch (error) {
    console.error('查询数据库时出错：', error);
  } finally {
    pool.end();
  }
}

checkBlueprintCategory();
