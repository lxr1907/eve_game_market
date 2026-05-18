const pool = require('../config/database');

async function checkMysqlVersion() {
  try {
    console.log('Checking MySQL version...');
    
    // 查询MySQL版本
    const [rows] = await pool.execute('SELECT VERSION() as version');
    const version = rows[0].version;
    
    console.log(`MySQL version: ${version}`);
    
    // 解析版本号
    const versionParts = version.split('.');
    const major = parseInt(versionParts[0]);
    const minor = parseInt(versionParts[1]);
    
    console.log(`Major version: ${major}, Minor version: ${minor}`);
    
    // 检查版本兼容性
    if (major >= 8) {
      console.log('✅ MySQL 8.0+ is fully supported');
    } else if (major === 5 && minor >= 7) {
      console.log('✅ MySQL 5.7+ is supported');
    } else {
      console.log('⚠️  MySQL version may have compatibility issues, recommend 5.7+');
    }
    
  } catch (error) {
    console.error('Error checking MySQL version:', error.message);
  } finally {
    process.exit(0);
  }
}

checkMysqlVersion();