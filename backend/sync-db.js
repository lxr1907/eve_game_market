const mysql = require('mysql2/promise');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 本地数据库配置
const localConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'eve'
};

// 需要同步的表列表（只同步有数据的表）
const tablesToSync = [
  'eve_sso_codes',
  'kb_character_stats', 
  'online_player_stats',
  'killmails',
  'loyalty_skip_items',
  'constellations',
  'regions',
  'stargates',
  'corporations',
  'item_categories',
  'item_groups',
  'systems',
  'region_types',
  'types',
  'loyalty_offers',
  'loyalty_offer_required_items',
  'loyalty_type_lp_isk',
  'loyalty_multi_item_profit',
  'lp_blueprint_profits',
  'system_kills',
  'orders'
];

async function syncTable(tableName) {
  console.log(`\n=== 开始同步表: ${tableName} ===`);
  
  try {
    // 连接本地数据库
    const localConn = await mysql.createConnection(localConfig);
    
    // 获取总行数
    const [countResult] = await localConn.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
    const totalRows = countResult[0].count;
    
    if (totalRows === 0) {
      console.log(`  表 ${tableName} 没有数据，跳过`);
      await localConn.end();
      return { success: true, rows: 0 };
    }
    
    console.log(`  本地数据行数: ${totalRows}`);
    
    // 获取表结构
    const [columns] = await localConn.execute(`DESCRIBE ${tableName}`);
    const columnNames = columns.map(col => col.Field);
    
    // 分批查询并生成 SQL
    const batchSize = 500;
    const totalBatches = Math.ceil(totalRows / batchSize);
    let syncedRows = 0;
    
    for (let batch = 0; batch < totalBatches; batch++) {
      const offset = batch * batchSize;
      const [rows] = await localConn.execute(`SELECT * FROM ${tableName} LIMIT ?, ?`, [offset, batchSize]);
      
      if (rows.length === 0) break;
      
      // 生成 SQL 文件
      let sqlContent = '';
      rows.forEach(row => {
        const values = columnNames.map(col => {
          const val = row[col];
          if (val === null) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "\\'").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\r/g, "\\r")}'`;
          return val;
        });
        sqlContent += `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${values.join(', ')});\n`;
      });
      
      // 写入临时文件
      const tempFile = path.join(__dirname, `temp_${tableName}_${batch}.sql`);
      fs.writeFileSync(tempFile, sqlContent);
      
      // 上传到服务器
      const uploadResult = spawnSync('scp', [tempFile, 'eve-server:/tmp/']);
      if (uploadResult.error) {
        console.error(`  ❌ 上传失败: ${uploadResult.error.message}`);
        fs.unlinkSync(tempFile);
        await localConn.end();
        return { success: false, error: uploadResult.error.message };
      }
      
      // 在服务器上执行 SQL
      const execResult = spawnSync('ssh', ['eve-server', `mysql -u eve_user -peve_password eve_killboard < /tmp/temp_${tableName}_${batch}.sql`]);
      
      if (execResult.error) {
        console.error(`  ❌ 执行失败: ${execResult.error.message}`);
        fs.unlinkSync(tempFile);
        await localConn.end();
        return { success: false, error: execResult.error.message };
      }
      
      if (execResult.stderr.toString()) {
        const stderr = execResult.stderr.toString().trim();
        if (stderr && !stderr.includes('Warning')) {
          console.error(`  ❌ SQL错误: ${stderr}`);
          fs.unlinkSync(tempFile);
          await localConn.end();
          return { success: false, error: stderr };
        }
      }
      
      // 清理
      fs.unlinkSync(tempFile);
      spawnSync('ssh', ['eve-server', `rm -f /tmp/temp_${tableName}_${batch}.sql`]);
      
      syncedRows += rows.length;
      console.log(`  批次 ${batch + 1}/${totalBatches}: 同步 ${rows.length} 行 (总计: ${syncedRows})`);
    }
    
    await localConn.end();
    console.log(`  ✅ 成功同步 ${syncedRows} 行数据`);
    return { success: true, rows: syncedRows };
    
  } catch (error) {
    console.error(`  ❌ 同步失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 开始数据库同步...');
  
  let successCount = 0;
  let failCount = 0;
  let totalRows = 0;
  
  for (const table of tablesToSync) {
    const result = await syncTable(table);
    
    if (result.success) {
      successCount++;
      totalRows += result.rows;
    } else {
      failCount++;
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n📊 同步完成！');
  console.log(`成功: ${successCount} 个表`);
  console.log(`失败: ${failCount} 个表`);
  console.log(`总同步行数: ${totalRows}`);
  
  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch(console.error);