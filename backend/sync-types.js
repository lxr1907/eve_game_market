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

async function syncTypesTable() {
  const tableName = 'types';
  console.log(`\n=== 开始同步表: ${tableName} ===`);

  try {
    const localConn = await mysql.createConnection(localConfig);
    const [countResult] = await localConn.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
    const localRowCount = countResult[0].count;

    if (localRowCount === 0) {
      console.log(`  本地表 ${tableName} 没有数据，跳过`);
      await localConn.end();
      return { success: true, rows: 0 };
    }

    console.log(`  本地数据行数: ${localRowCount}`);

    // 获取表结构
    const [columns] = await localConn.execute(`DESCRIBE ${tableName}`);
    const columnNames = columns.map(col => col.Field);
    const primaryKey = columns.find(col => col.Key === 'PRI')?.Field;

    if (!primaryKey) {
      console.error(`  ❌ 无法找到主键`);
      await localConn.end();
      return { success: false, error: '无法找到主键' };
    }

    // 构建 ON DUPLICATE KEY UPDATE 子句
    const updateColumns = columnNames
      .filter(col => col !== primaryKey && col !== 'created_at')
      .map(col => `${col} = VALUES(${col})`)
      .join(', ');

    const batchSize = 500;
    const totalBatches = Math.ceil(localRowCount / batchSize);
    let syncedRows = 0;

    for (let batch = 0; batch < totalBatches; batch++) {
      const offset = batch * batchSize;
      const [rows] = await localConn.query(`SELECT * FROM ${tableName} LIMIT ?, ?`, [Number(offset), Number(batchSize)]);

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
          if (typeof val === 'string') return "'" + val.replace(/'/g, "''").replace(/\n/g, "\\n").replace(/\r/g, "\\r") + "'";
          if (Array.isArray(val)) return "'" + JSON.stringify(val) + "'";
          return val;
        });

        sqlContent += `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${values.join(', ')}) ON DUPLICATE KEY UPDATE ${updateColumns};
`;
      });

      const tempFile = path.join(__dirname, `temp_${tableName}_${batch}.sql`);
      fs.writeFileSync(tempFile, sqlContent);

      // 上传到服务器
      const uploadResult = spawnSync('ssh', ['-i', 'C:\\Users\\41898\\Downloads\\ss (1).pem', 'eve-server', `mkdir -p /tmp`]);
      if (uploadResult.error) {
        console.error(`  ❌ 创建临时目录失败: ${uploadResult.error.message}`);
        fs.unlinkSync(tempFile);
        await localConn.end();
        return { success: false, error: uploadResult.error.message };
      }

      const scpResult = spawnSync('scp', ['-i', 'C:\\Users\\41898\\Downloads\\ss (1).pem', tempFile, 'eve-server:/tmp/']);
      if (scpResult.error) {
        console.error(`  ❌ 上传失败: ${scpResult.error.message}`);
        fs.unlinkSync(tempFile);
        await localConn.end();
        return { success: false, error: scpResult.error.message };
      }

      // 在服务器执行SQL
      const execCmd = `mysql -u eve_user -peve_password eve_killboard < /tmp/temp_${tableName}_${batch}.sql 2>&1; echo "EXIT_CODE:$?"`;
      const execResult = spawnSync('ssh', ['-i', 'C:\\Users\\41898\\Downloads\\ss (1).pem', 'eve-server', execCmd]);

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

      // 检查错误
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

      // 验证同步结果
      const checkAfterCmd = `mysql -u eve_user -peve_password eve_killboard -e "SELECT COUNT(*) as count FROM ${tableName} WHERE id IN (${rows.map(r => r.id).join(', ')})"`;
      const afterResult = spawnSync('ssh', ['-i', 'C:\\Users\\41898\\Downloads\\ss (1).pem', 'eve-server', checkAfterCmd]);
      const afterOutput = afterResult.stdout.toString();
      const afterMatch = afterOutput.match(/(\d+)/);
      const afterCount = afterMatch ? parseInt(afterMatch[1], 10) : 0;

      // 清理临时文件
      fs.unlinkSync(tempFile);
      spawnSync('ssh', ['-i', 'C:\\Users\\41898\\Downloads\\ss (1).pem', 'eve-server', `rm -f /tmp/temp_${tableName}_${batch}.sql`]);

      syncedRows += rows.length;
      console.log(`  批次 ${batch + 1}/${totalBatches}: 处理 ${rows.length} 行, 服务器已存在 ${afterCount} 行`);
    }

    await localConn.end();

    // 最终验证
    const finalCheckCmd = `mysql -u eve_user -peve_password eve_killboard -e "SELECT COUNT(*) as count FROM ${tableName}"`;
    const finalResult = spawnSync('ssh', ['-i', 'C:\\Users\\41898\\Downloads\\ss (1).pem', 'eve-server', finalCheckCmd]);
    const finalOutput = finalResult.stdout.toString();
    const finalMatch = finalOutput.match(/(\d+)/);
    const finalCount = finalMatch ? parseInt(finalMatch[1], 10) : 0;

    console.log(`\n✅ 同步完成！`);
    console.log(`  本地数据行数: ${localRowCount}`);
    console.log(`  服务器最终行数: ${finalCount}`);

    return { success: true, rows: syncedRows, finalCount };

  } catch (error) {
    console.error(`  ❌ 同步失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 执行同步
if (require.main === module) {
  syncTypesTable()
    .then(result => {
      if (result.success) {
        console.log(`\n🎉 同步成功！共处理 ${result.rows} 行数据`);
        process.exit(0);
      } else {
        console.error(`\n❌ 同步失败: ${result.error}`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(`\n❌ 同步异常: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { syncTypesTable };