const fs = require('fs');
const readline = require('readline');
const pool = require('../config/database');

/**
 * 蓝图数据导入工具
 * 从blueprints.jsonl文件导入数据到新的蓝图表结构
 */

async function importBlueprintData() {
  console.log('开始导入蓝图表数据...');
  
  const filePath = './static_data/blueprints.jsonl';
  
  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.error(`文件不存在: ${filePath}`);
      process.exit(1);
    }
    
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    let processedCount = 0;
    let errorCount = 0;
    
    for await (const line of rl) {
      try {
        const blueprint = JSON.parse(line);
        await processBlueprint(blueprint);
        processedCount++;
        
        if (processedCount % 100 === 0) {
          console.log(`已处理 ${processedCount} 个蓝图表...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`处理蓝图表数据时出错:`, error.message);
      }
    }
    
    console.log(`蓝图表数据导入完成！`);
    console.log(`成功处理: ${processedCount} 个`);
    console.log(`错误数量: ${errorCount} 个`);
    
  } catch (error) {
    console.error('导入蓝图表数据时出错:', error);
    throw error;
  }
}

/**
 * 处理单个蓝图表数据
 * @param {Object} blueprint 蓝图表数据
 */
async function processBlueprint(blueprint) {
  const blueprintTypeId = blueprint.blueprintTypeID;
  
  // 1. 插入或更新蓝图表基本信息
  await pool.execute(`
    INSERT INTO blueprints (blueprint_type_id, max_production_limit)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE
      max_production_limit = VALUES(max_production_limit)
  `, [blueprintTypeId, blueprint.maxProductionLimit]);
  
  // 2. 处理制造活动
  if (blueprint.activities && blueprint.activities.manufacturing) {
    const manufacturing = blueprint.activities.manufacturing;
    
    // 插入或更新制造活动时间
    await pool.execute(`
      INSERT INTO blueprint_activities (blueprint_type_id, activity_type, activity_time)
      VALUES (?, 'manufacturing', ?)
      ON DUPLICATE KEY UPDATE
        activity_time = VALUES(activity_time)
    `, [blueprintTypeId, manufacturing.time]);
    
    // 3. 处理制造材料
    if (manufacturing.materials && Array.isArray(manufacturing.materials)) {
      for (const material of manufacturing.materials) {
        await pool.execute(`
          INSERT INTO blueprint_materials (blueprint_type_id, material_type_id, quantity, activity_type)
          VALUES (?, ?, ?, 'manufacturing')
          ON DUPLICATE KEY UPDATE
            quantity = VALUES(quantity)
        `, [blueprintTypeId, material.typeID, material.quantity]);
      }
    }
    
    // 4. 处理制造产品
    if (manufacturing.products && Array.isArray(manufacturing.products)) {
      for (const product of manufacturing.products) {
        const probability = product.probability !== undefined ? product.probability : 1.00;
        await pool.execute(`
          INSERT INTO blueprint_products (blueprint_type_id, product_type_id, quantity, probability, activity_type)
          VALUES (?, ?, ?, ?, 'manufacturing')
          ON DUPLICATE KEY UPDATE
            quantity = VALUES(quantity),
            probability = VALUES(probability)
        `, [blueprintTypeId, product.typeID, product.quantity, probability]);
      }
    }
    
    // 5. 处理制造技能
    if (manufacturing.skills && Array.isArray(manufacturing.skills)) {
      for (const skill of manufacturing.skills) {
        await pool.execute(`
          INSERT INTO blueprint_skills (blueprint_type_id, skill_type_id, skill_level, activity_type)
          VALUES (?, ?, ?, 'manufacturing')
          ON DUPLICATE KEY UPDATE
            skill_level = VALUES(skill_level)
        `, [blueprintTypeId, skill.typeID, skill.level]);
      }
    }
  }
  
  // 6. 处理发明活动
  if (blueprint.activities && blueprint.activities.invention) {
    const invention = blueprint.activities.invention;
    
    // 插入或更新发明活动时间
    await pool.execute(`
      INSERT INTO blueprint_activities (blueprint_type_id, activity_type, activity_time)
      VALUES (?, 'invention', ?)
      ON DUPLICATE KEY UPDATE
        activity_time = VALUES(activity_time)
    `, [blueprintTypeId, invention.time]);
    
    // 处理发明材料
    if (invention.materials && Array.isArray(invention.materials)) {
      for (const material of invention.materials) {
        await pool.execute(`
          INSERT INTO blueprint_materials (blueprint_type_id, material_type_id, quantity, activity_type)
          VALUES (?, ?, ?, 'invention')
          ON DUPLICATE KEY UPDATE
            quantity = VALUES(quantity)
        `, [blueprintTypeId, material.typeID, material.quantity]);
      }
    }
    
    // 处理发明产品
    if (invention.products && Array.isArray(invention.products)) {
      for (const product of invention.products) {
        const probability = product.probability !== undefined ? product.probability : 1.00;
        await pool.execute(`
          INSERT INTO blueprint_products (blueprint_type_id, product_type_id, quantity, probability, activity_type)
          VALUES (?, ?, ?, ?, 'invention')
          ON DUPLICATE KEY UPDATE
            quantity = VALUES(quantity),
            probability = VALUES(probability)
        `, [blueprintTypeId, product.typeID, product.quantity, probability]);
      }
    }
    
    // 处理发明技能
    if (invention.skills && Array.isArray(invention.skills)) {
      for (const skill of invention.skills) {
        await pool.execute(`
          INSERT INTO blueprint_skills (blueprint_type_id, skill_type_id, skill_level, activity_type)
          VALUES (?, ?, ?, 'invention')
          ON DUPLICATE KEY UPDATE
            skill_level = VALUES(skill_level)
        `, [blueprintTypeId, skill.typeID, skill.level]);
      }
    }
  }
  
  // 7. 处理复制活动
  if (blueprint.activities && blueprint.activities.copying) {
    const copying = blueprint.activities.copying;
    
    // 插入或更新复制活动时间
    await pool.execute(`
      INSERT INTO blueprint_activities (blueprint_type_id, activity_type, activity_time)
      VALUES (?, 'copying', ?)
      ON DUPLICATE KEY UPDATE
        activity_time = VALUES(activity_time)
    `, [blueprintTypeId, copying.time]);
    
    // 处理复制材料
    if (copying.materials && Array.isArray(copying.materials)) {
      for (const material of copying.materials) {
        await pool.execute(`
          INSERT INTO blueprint_materials (blueprint_type_id, material_type_id, quantity, activity_type)
          VALUES (?, ?, ?, 'copying')
          ON DUPLICATE KEY UPDATE
            quantity = VALUES(quantity)
        `, [blueprintTypeId, material.typeID, material.quantity]);
      }
    }
    
    // 处理复制技能
    if (copying.skills && Array.isArray(copying.skills)) {
      for (const skill of copying.skills) {
        await pool.execute(`
          INSERT INTO blueprint_skills (blueprint_type_id, skill_type_id, skill_level, activity_type)
          VALUES (?, ?, ?, 'copying')
          ON DUPLICATE KEY UPDATE
            skill_level = VALUES(skill_level)
        `, [blueprintTypeId, skill.typeID, skill.level]);
      }
    }
  }
  
  // 8. 处理材料研究活动
  if (blueprint.activities && blueprint.activities.research_material) {
    const researchMaterial = blueprint.activities.research_material;
    
    // 插入或更新材料研究活动时间
    await pool.execute(`
      INSERT INTO blueprint_activities (blueprint_type_id, activity_type, activity_time)
      VALUES (?, 'research_material', ?)
      ON DUPLICATE KEY UPDATE
        activity_time = VALUES(activity_time)
    `, [blueprintTypeId, researchMaterial.time]);
    
    // 处理材料研究材料
    if (researchMaterial.materials && Array.isArray(researchMaterial.materials)) {
      for (const material of researchMaterial.materials) {
        await pool.execute(`
          INSERT INTO blueprint_materials (blueprint_type_id, material_type_id, quantity, activity_type)
          VALUES (?, ?, ?, 'research_material')
          ON DUPLICATE KEY UPDATE
            quantity = VALUES(quantity)
        `, [blueprintTypeId, material.typeID, material.quantity]);
      }
    }
    
    // 处理材料研究技能
    if (researchMaterial.skills && Array.isArray(researchMaterial.skills)) {
      for (const skill of researchMaterial.skills) {
        await pool.execute(`
          INSERT INTO blueprint_skills (blueprint_type_id, skill_type_id, skill_level, activity_type)
          VALUES (?, ?, ?, 'research_material')
          ON DUPLICATE KEY UPDATE
            skill_level = VALUES(skill_level)
        `, [blueprintTypeId, skill.typeID, skill.level]);
      }
    }
  }
  
  // 9. 处理时间研究活动
  if (blueprint.activities && blueprint.activities.research_time) {
    const researchTime = blueprint.activities.research_time;
    
    // 插入或更新时间研究活动时间
    await pool.execute(`
      INSERT INTO blueprint_activities (blueprint_type_id, activity_type, activity_time)
      VALUES (?, 'research_time', ?)
      ON DUPLICATE KEY UPDATE
        activity_time = VALUES(activity_time)
    `, [blueprintTypeId, researchTime.time]);
    
    // 处理时间研究材料
    if (researchTime.materials && Array.isArray(researchTime.materials)) {
      for (const material of researchTime.materials) {
        await pool.execute(`
          INSERT INTO blueprint_materials (blueprint_type_id, material_type_id, quantity, activity_type)
          VALUES (?, ?, ?, 'research_time')
          ON DUPLICATE KEY UPDATE
            quantity = VALUES(quantity)
        `, [blueprintTypeId, material.typeID, material.quantity]);
      }
    }
    
    // 处理时间研究技能
    if (researchTime.skills && Array.isArray(researchTime.skills)) {
      for (const skill of researchTime.skills) {
        await pool.execute(`
          INSERT INTO blueprint_skills (blueprint_type_id, skill_type_id, skill_level, activity_type)
          VALUES (?, ?, ?, 'research_time')
          ON DUPLICATE KEY UPDATE
            skill_level = VALUES(skill_level)
        `, [blueprintTypeId, skill.typeID, skill.level]);
      }
    }
  }
}

// 执行导入
if (require.main === module) {
  importBlueprintData().then(() => {
    console.log('蓝图表数据导入完成');
    process.exit(0);
  }).catch(error => {
    console.error('导入失败:', error);
    process.exit(1);
  });
}

module.exports = { importBlueprintData };