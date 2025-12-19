const mysql = require('mysql2/promise');
require('dotenv').config();

async function createDatabase() {
  try {
    // Create connection without database name
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    // Create database if not exists
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    console.log(`Database '${process.env.DB_NAME}' created successfully`);

    // Close the connection
    await connection.end();
    console.log('Connection closed');
  } catch (error) {
    console.error('Error creating database:', error);
    process.exit(1);
  }
}

createDatabase();