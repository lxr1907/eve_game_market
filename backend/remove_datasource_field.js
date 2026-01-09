const mysql = require('mysql2/promise');
require('dotenv').config();

async function removeDatasourceField() {
  try {
    // 创建数据库连接
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('Connected to database');

    // 从loyalty_offers表中删除datasource字段
    await connection.execute(
      'ALTER TABLE loyalty_offers DROP COLUMN datasource'
    );

    console.log('Successfully removed datasource field from loyalty_offers table');

    // 验证字段已被删除
    const [rows] = await connection.execute(
      'SHOW COLUMNS FROM loyalty_offers'
    );

    console.log('\nUpdated loyalty_offers table structure:');
    console.table(rows);

    // 关闭连接
    await connection.end();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error removing datasource field:', error);
  }
}

removeDatasourceField();
