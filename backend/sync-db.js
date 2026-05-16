const mysql = require('mysql2/promise');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const localConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'eve'
};

const tablesToSync = [
  'kb_corporation_stats',
  'kb_character_stats',
  'eve_sso_codes',
  'loyalty_multi_item_profit',
  'corporations',
  'killmails',
  'item_categories',
  'eve_slot_flags',
  'regions',
  'lp_blueprint_profits',
  'loyalty_type_lp_isk',
  'constellations',
  'loyalty_skip_items',
  'item_groups',
  'loyalty_offer_required_items',
  'orders',
  'blueprints',
  'blueprint_products',
  'loyalty_offers',
  'region_types',
  'blueprint_activities',
  'blueprint_skills',
  'systems',
  'stargates',
  'blueprint_materials',
  'types',
  'online_player_stats',
  'system_kills'
];

const ignoreTables = ['region_types', 'item_categories', 'item_groups', 'types', 'systems', 'constellations', 'regions', 'stargates', 'blueprints', 'blueprint_products', 'blueprint_materials', 'blueprint_skills', 'blueprint_activities', 'item_groups', 'corporations', 'killmails', 'orders', 'loyalty_offers', 'loyalty_offer_required_items', 'lp_blueprint_profits', 'loyalty_type_lp_isk', 'loyalty_skip_items', 'kb_corporation_stats', 'kb_character_stats', 'eve_sso_codes', 'online_player_stats', 'system_kills'];

async function syncTable(tableName) {
  console.log(`\n=== 开始同步表: ${tableName} ===`);

  try {
    const useIgnore = ignoreTables.includes(tableName);
    const insertKeyword = useIgnore ? 'INSERT IGNORE' : 'INSERT';

    const localConn = await mysql.createConnection(localConfig);
    const [countResult] = await localConn.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
    const localRowCount = countResult[0].count;

    if (localRowCount === 0) {
      console.log(`  本地表 ${tableName} 没有数据，跳过`);
      await localConn.end();
      return { success: true, rows: 0 };
    }

    const checkCmd = `mysql -u eve_user -peve_password eve_killboard -e "SELECT COUNT(*) as count FROM ${tableName}"`;
    const checkResult = spawnSync('ssh', ['-i', 'C:\\Users\\41898\\Downloads\\ss (1).pem', 'eve-server', checkCmd]);

    if (checkResult.error) {
      console.error(`  ❌ 检查服务器数据失败: ${checkResult.error.message}`);
      await localConn.end();
      return { success: false, error: checkResult.error.message };
    }

    const output = checkResult.stdout.toString();
    const match = output.match(/(\d+)/);
    const serverRowCount = match ? parseInt(match[1], 10) : 0;

    if (serverRowCount >= localRowCount) {
      console.log(`  服务器表 ${tableName} 已有 ${serverRowCount} 行 >= 本地 ${localRowCount} 行，跳过同步`);
      await localConn.end();
      return { success: true, rows: 0, skipped: true };
    }

    console.log(`  服务器 ${serverRowCount} 行 < 本地 ${localRowCount} 行，${useIgnore ? '使用 INSERT IGNORE 模式' : '使用普通 INSERT 模式'}同步`);

    console.log(`  本地数据行数: ${localRowCount}`);

    const [columns] = await localConn.execute(`DESCRIBE ${tableName}`);
    const columnNames = columns.map(col => col.Field);

    const batchSize = 500;
    const totalBatches = Math.ceil(localRowCount / batchSize);
    let beforeCount = 0;
    let syncedRows = 0;

    for (let batch = 0; batch < totalBatches; batch++) {
      const offset = batch * batchSize;
      const [rows] = await localConn.execute(`SELECT * FROM ${tableName} LIMIT ?, ?`, [offset, batchSize]);

      if (rows.length === 0) break;

      let sqlContent = '';
      rows.forEach(row => {
        const values = columnNames.map(col => {
          const val = row[col];
          if (val === null) return 'NULL';
          if (val instanceof Date) {
            const pad = n => n.toString().padStart(2, '0');
            const d = val;
            const dateStr = d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
            return "'" + dateStr + "'";
          }
          if (typeof val === 'string') return "'" + val.replace(/'/g, "\\'").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\r/g, "\\r") + "'";
          if (Array.isArray(val)) return "'" + JSON.stringify(val) + "'";
          return val;
        });
        sqlContent += `${insertKeyword} INTO ${tableName} (${columnNames.join(', ')}) VALUES (${values.join(', ')});\n`;
      });

      const tempFile = path.join(__dirname, `temp_${tableName}_${batch}.sql`);
      fs.writeFileSync(tempFile, sqlContent);

      const uploadResult = spawnSync('scp', ['-i', 'C:\\Users\\41898\\Downloads\\ss (1).pem', tempFile, 'eve-server:/tmp/']);
      if (uploadResult.error) {
        console.error(`  ❌ 上传失败: ${uploadResult.error.message}`);
        fs.unlinkSync(tempFile);
        await localConn.end();
        return { success: false, error: uploadResult.error.message };
      }

      const execResult = spawnSync('ssh', ['-i', 'C:\\Users\\41898\\Downloads\\ss (1).pem', 'eve-server', `mysql -u eve_user -peve_password eve_killboard < /tmp/temp_${tableName}_${batch}.sql 2>&1; echo "EXIT_CODE:$?"`]);

      if (execResult.error) {
        console.error(`  ❌ 执行失败: ${execResult.error.message}`);
        fs.unlinkSync(tempFile);
        await localConn.end();
        return { success: false, error: execResult.error.message };
      }

      const execOutput = execResult.stdout.toString();
      const stderr = execResult.stderr.toString();
      const exitMatch = execOutput.match(/EXIT_CODE:(\d+)/);
      const exitCode = exitMatch ? parseInt(exitMatch[1], 10) : 0;

      const errorLines = execOutput.split('\n').filter(line => line.includes('ERROR') || line.includes('error') || line.includes('Failed'));
      if (errorLines.length > 0) {
        console.error(`  ❌ SQL错误: ${errorLines.join(', ')}`);
        console.error(`  完整输出: ${execOutput.substring(0, 500)}`);
        fs.unlinkSync(tempFile);
        await localConn.end();
        return { success: false, error: errorLines.join(', ') };
      }

      if (exitCode !== 0) {
        console.error(`  ❌ SQL执行失败，退出码: ${exitCode}`);
        console.error(`  输出: ${execOutput.substring(0, 500)}`);
        fs.unlinkSync(tempFile);
        await localConn.end();
        return { success: false, error: `Exit code: ${exitCode}` };
      }

      if (stderr && !stderr.includes('Warning') && stderr.includes('error')) {
        console.error(`  ❌ SQL错误: ${stderr}`);
        fs.unlinkSync(tempFile);
        await localConn.end();
        return { success: false, error: stderr };
      }

      const checkAfterCmd = `mysql -u eve_user -peve_password eve_killboard -e "SELECT COUNT(*) as count FROM ${tableName}"`;
      const afterResult = spawnSync('ssh', ['-i', 'C:\\Users\\41898\\Downloads\\ss (1).pem', 'eve-server', checkAfterCmd]);
      const afterOutput = afterResult.stdout.toString();
      const afterMatch = afterOutput.match(/(\d+)/);
      const afterCount = afterMatch ? parseInt(afterMatch[1], 10) : 0;

      fs.unlinkSync(tempFile);
      spawnSync('ssh', ['-i', 'C:\\Users\\41898\\Downloads\\ss (1).pem', 'eve-server', `rm -f /tmp/temp_${tableName}_${batch}.sql`]);

      if (batch === 0) {
        beforeCount = afterCount - rows.length;
      }

      syncedRows += rows.length;
      const expectedCount = beforeCount + syncedRows;
      console.log(`  批次 ${batch + 1}/${totalBatches}: 同步 ${rows.length} 行, 服务器验证: ${afterCount} 行 (期望: ${expectedCount})`);

      if (afterCount < expectedCount) {
        console.error(`  ❌ 数据验证失败: 服务器 ${afterCount} 行 < 期望 ${expectedCount} 行`);
        await localConn.end();
        return { success: false, error: '数据验证失败' };
      }
    }

    await localConn.end();

    const finalCheckCmd = `mysql -u eve_user -peve_password eve_killboard -e "SELECT COUNT(*) as count FROM ${tableName}"`;
    const finalResult = spawnSync('ssh', ['-i', 'C:\\Users\\41898\\Downloads\\ss (1).pem', 'eve-server', finalCheckCmd]);
    const finalOutput = finalResult.stdout.toString();
    const finalMatch = finalOutput.match(/(\d+)/);
    const finalCount = finalMatch ? parseInt(finalMatch[1], 10) : 0;

    console.log(`  ✅ 成功同步 ${syncedRows} 行数据, 服务器最终: ${finalCount} 行, 本地: ${localRowCount} 行`);

    if (finalCount < localRowCount) {
      console.error(`  ⚠️ 警告: 服务器数据 ${finalCount} 行 < 本地 ${localRowCount} 行`);
    }

    return { success: finalCount >= localRowCount, rows: syncedRows, serverCount: finalCount };

  } catch (error) {
    console.error(`  ❌ 同步失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 开始数据库同步（按数据量从少到多）...');

  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;
  let totalRows = 0;

  for (const table of tablesToSync) {
    const result = await syncTable(table);

    if (result.skipped) {
      skippedCount++;
    } else if (result.success) {
      successCount++;
      totalRows += result.rows;
    } else {
      failCount++;
      console.log(`  ⚠️ 继续下一个表...`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📊 同步完成！');
  console.log(`成功: ${successCount} 个表`);
  console.log(`跳过: ${skippedCount} 个表`);
  console.log(`失败: ${failCount} 个表`);
  console.log(`总同步行数: ${totalRows}`);
}

main().catch(console.error);