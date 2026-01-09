const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkLoyaltyOffersStructure() {
  try {
    // 创建数据库连接
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('Connected to database');

    // 查询loyalty_offers表结构
    const [rows] = await connection.execute(
      'SHOW COLUMNS FROM loyalty_offers'
    );

    console.log('loyalty_offers table structure:');
    console.table(rows);

    // 查询表中是否有datasource相关数据
    const [dataRows] = await connection.execute(
      'SELECT DISTINCT datasource FROM loyalty_offers LIMIT 5'
    );

    console.log('\nSample datasource values:');
    console.log(dataRows);

    // 关闭连接
    await connection.end();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error checking table structure:', error);
  }
}

checkLoyaltyOffersStructure();
