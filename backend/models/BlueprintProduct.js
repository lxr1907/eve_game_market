const pool = require('../config/database');

class BlueprintProduct {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS blueprint_products (
        id INT PRIMARY KEY AUTO_INCREMENT,
        blueprint_type_id INT NOT NULL,
        product_type_id INT NOT NULL,
        activity_type VARCHAR(30) NOT NULL DEFAULT 'manufacturing',
        quantity INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_blueprint_activity (blueprint_type_id, activity_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(query);
  }

  static async importFromJsonl(filePath) {
    const fs = require('fs');
    const readline = require('readline');
    
    const stream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: stream });
    
    let count = 0;
    const values = [];
    
    for await (const line of rl) {
      try {
        const data = JSON.parse(line);
        const blueprintTypeID = data.blueprintTypeID;
        
        if (data.activities) {
          for (const [activityType, activity] of Object.entries(data.activities)) {
            if (activity.products && activity.products.length > 0) {
              for (const product of activity.products) {
                values.push([
                  blueprintTypeID,
                  product.typeID,
                  activityType,
                  product.quantity || 1
                ]);
                count++;
              }
            }
          }
        }
      } catch (e) {
        console.error('Error parsing line:', e.message);
      }
    }
    
    if (values.length > 0) {
      const placeholders = values.map(() => '(?, ?, ?, ?)').join(', ');
      const query = `
        INSERT IGNORE INTO blueprint_products 
        (blueprint_type_id, product_type_id, activity_type, quantity) 
        VALUES ${placeholders}
      `;
      
      const flatValues = values.flat();
      await pool.execute(query, flatValues);
    }
    
    return count;
  }

  static async findByBlueprintTypeId(blueprintTypeId, activityType = 'manufacturing') {
    const [rows] = await pool.execute(
      `SELECT * FROM blueprint_products WHERE blueprint_type_id = ? AND activity_type = ?`,
      [blueprintTypeId, activityType]
    );
    return rows;
  }

  static async findProductTypeId(blueprintTypeId, activityType = 'manufacturing') {
    const [rows] = await pool.execute(
      `SELECT product_type_id FROM blueprint_products WHERE blueprint_type_id = ? AND activity_type = ? LIMIT 1`,
      [blueprintTypeId, activityType]
    );
    return rows.length > 0 ? rows[0].product_type_id : null;
  }

  static async count() {
    const [rows] = await pool.execute(`SELECT COUNT(*) as count FROM blueprint_products`);
    return rows[0].count;
  }
}

module.exports = BlueprintProduct;
