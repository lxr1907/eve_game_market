/**
 * 导入蓝图产品数据到 blueprint_products 表
 * 用法: node scripts/import-blueprint-products.js
 */

const BlueprintProduct = require('../models/BlueprintProduct');
const pool = require('../config/database');

async function importBlueprintProducts() {
  console.log('=== 开始导入 blueprint_products 数据 ===');
  
  try {
    // 创建表
    console.log('创建 blueprint_products 表...');
    await BlueprintProduct.createTable();
    console.log('表创建完成');
    
    // 检查是否已有数据
    const existingCount = await BlueprintProduct.count();
    console.log(`当前表中有 ${existingCount} 条记录`);
    
    if (existingCount > 0) {
      const answer = 'y'; // 如果已有数据，可以跳过或重新导入
      if (answer.toLowerCase() !== 'y') {
        console.log('已取消导入');
        return;
      }
    }
    
    // 导入数据
    const filePath = './static_data/blueprints.jsonl';
    console.log(`从 ${filePath} 导入数据...`);
    
    const count = await BlueprintProduct.importFromJsonl(filePath);
    console.log(`成功导入 ${count} 条产品记录`);
    
    // 验证
    const newCount = await BlueprintProduct.count();
    console.log(`表中现在有 ${newCount} 条记录`);
    
    console.log('=== 导入完成 ===');
  } catch (error) {
    console.error('导入失败:', error);
  } finally {
    process.exit(0);
  }
}

importBlueprintProducts();
