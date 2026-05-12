const mysql = require('mysql2/promise');
require('dotenv').config();

async function importSlotFlags() {
  try {
    // Create connection to database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Create table if not exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS eve_slot_flags (
        flag_id INT PRIMARY KEY,
        flag_name VARCHAR(100) NOT NULL,
        flag_text VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Table eve_slot_flags created or already exists');

    // Insert data with ON DUPLICATE KEY UPDATE to allow multiple executions
    const insertQuery = `
      INSERT INTO eve_slot_flags (flag_id, flag_name, flag_text, category)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        flag_name = VALUES(flag_name),
        flag_text = VALUES(flag_text),
        category = VALUES(category);
    `;

    // Slot flags data
    const slotFlagsData = [
      // 核心装备槽位
      [12, 'Low Slot 1', '低槽位1', '核心装备'],
      [13, 'Low Slot 2', '低槽位2', '核心装备'],
      [14, 'Low Slot 3', '低槽位3', '核心装备'],
      [15, 'Low Slot 4', '低槽位4', '核心装备'],
      [16, 'Low Slot 5', '低槽位5', '核心装备'],
      [17, 'Low Slot 6', '低槽位6', '核心装备'],
      [18, 'Low Slot 7', '低槽位7', '核心装备'],
      [19, 'Mid Slot 1', '中槽位1', '核心装备'],
      [20, 'Mid Slot 2', '中槽位2', '核心装备'],
      [21, 'Mid Slot 3', '中槽位3', '核心装备'],
      [22, 'Mid Slot 4', '中槽位4', '核心装备'],
      [23, 'Mid Slot 5', '中槽位5', '核心装备'],
      [24, 'Mid Slot 6', '中槽位6', '核心装备'],
      [25, 'Mid Slot 7', '中槽位7', '核心装备'],
      [26, 'High Slot 1', '高槽位1', '核心装备'],
      [27, 'High Slot 2', '高槽位2', '核心装备'],
      [28, 'High Slot 3', '高槽位3', '核心装备'],
      [29, 'High Slot 4', '高槽位4', '核心装备'],
      [30, 'High Slot 5', '高槽位5', '核心装备'],
      [31, 'High Slot 6', '高槽位6', '核心装备'],
      [32, 'High Slot 7', '高槽位7', '核心装备'],
      [33, 'High Slot 8', '高槽位8', '核心装备'],
      [92, 'Rig Slot 1', '改装件槽位1', '核心装备'],
      [93, 'Rig Slot 2', '改装件槽位2', '核心装备'],
      [94, 'Rig Slot 3', '改装件槽位3', '核心装备'],
      [95, 'Rig Slot 4', '改装件槽位4', '核心装备'],
      [96, 'Rig Slot 5', '改装件槽位5', '核心装备'],
      [97, 'Rig Slot 6', '改装件槽位6', '核心装备'],
      [98, 'Rig Slot 7', '改装件槽位7', '核心装备'],
      [99, 'Rig Slot 8', '改装件槽位8', '核心装备'],
      [164, 'Subsystem Slot 1', '子系统槽位1', '核心装备'],
      [165, 'Subsystem Slot 2', '子系统槽位2', '核心装备'],
      [166, 'Subsystem Slot 3', '子系统槽位3', '核心装备'],
      [167, 'Subsystem Slot 4', '子系统槽位4', '核心装备'],
      [168, 'Subsystem Slot 5', '子系统槽位5', '核心装备'],
      // 货舱与存储类
      [5, 'Cargo', '货舱', '货舱存储'],
      [133, 'Fuel Bay', '燃料舱', '货舱存储'],
      [172, 'Ammo Hold', '弹药舱', '货舱存储'],
      [173, 'Mining Hold', '矿石舱', '货舱存储'],
      [174, 'Gas Hold', '气云舱', '货舱存储'],
      [175, 'Industrial Core', '工业核心舱', '货舱存储'],
      [176, 'Ore Hold', '矿石舱', '货舱存储'],
      [177, 'Salvage Hold', '打捞件舱', '货舱存储'],
      [178, 'Ship Hangar', '舰船机库', '货舱存储'],
      [179, 'Fleet Hangar', '舰队机库', '货舱存储'],
      [180, 'Command Center Hold', '指挥中心舱', '货舱存储'],
      [181, 'Planetary Commodities Hold', '行星物资舱', '货舱存储'],
      [182, 'Ship Maintenance Bay', '舰船维护舱', '货舱存储'],
      [183, 'Fighter Hangar', '战斗机库', '货舱存储'],
      [184, 'Booster Bay', '增效剂舱', '货舱存储'],
      [185, 'Implant Bay', '植入体舱', '货舱存储'],
      [186, 'Subsystem Bay', '子系统舱', '货舱存储'],
      [187, 'Drone Bay', '无人机挂舱', '货舱存储'],
      [188, 'Fighter Bay', '战斗机挂舱', '货舱存储'],
      [189, 'Capital Ship Hangar', '旗舰机库', '货舱存储'],
      [190, 'Refinery Hold', '精炼舱', '货舱存储'],
      [191, 'Compressed Ore Hold', '压缩矿石舱', '货舱存储'],
      [192, 'Ice Hold', '冰矿舱', '货舱存储'],
      [193, 'Compressed Ice Hold', '压缩冰矿舱', '货舱存储'],
      [194, 'General Cargo Hold', '通用货舱', '货舱存储'],
      [195, 'Specialized Cargo Hold', '专用货舱', '货舱存储'],
      // 无人机与舰载机类
      [87, 'Drone Bay', '无人机挂舱', '无人机舰载机'],
      [155, 'Fighter Bay', '战斗机挂舱', '无人机舰载机'],
      [156, 'Fighter Tube 1', '战斗机发射管1', '无人机舰载机'],
      [157, 'Fighter Tube 2', '战斗机发射管2', '无人机舰载机'],
      [158, 'Fighter Tube 3', '战斗机发射管3', '无人机舰载机'],
      [159, 'Fighter Tube 4', '战斗机发射管4', '无人机舰载机'],
      [160, 'Fighter Tube 5', '战斗机发射管5', '无人机舰载机'],
      [161, 'Fighter Tube 6', '战斗机发射管6', '无人机舰载机'],
      [162, 'Fighter Tube 7', '战斗机发射管7', '无人机舰载机'],
      [163, 'Fighter Tube 8', '战斗机发射管8', '无人机舰载机'],
      // 其他特殊槽位
      [0, 'None', '无', '其他'],
      [1, 'Wallet', '钱包', '其他'],
      [2, 'Skill', '技能', '其他'],
      [3, 'Reward', '奖励', '其他'],
      [4, 'Gift', '礼物', '其他'],
      [6, 'Clone', '克隆体', '其他'],
      [7, 'Implant', '植入体', '其他'],
      [8, 'Booster', '增效剂', '其他'],
      [9, 'Ship', '舰船', '其他'],
      [10, 'Hangar', '机库', '其他'],
      [11, 'Station', '低槽', '其他'],
      [34, 'Cargo Hold', '货舱', '其他'],
      [35, 'Corporate Hangar', '军团机库', '其他'],
      [36, 'Corporate Wallet', '军团钱包', '其他'],
      [37, 'Market', '市场', '其他'],
      [38, 'Contract', '合同', '其他'],
      [39, 'Trade', '交易', '其他'],
      [40, 'Production', '生产', '其他'],
      [41, 'Research', '研究', '其他'],
      [42, 'Blueprint', '蓝图', '其他'],
      [43, 'Mail', '邮件', '其他'],
      [44, 'Undefined', '未定义', '其他']
    ];

    // Execute bulk insert
    await connection.query(insertQuery, [slotFlagsData]);
    console.log(`Successfully imported ${slotFlagsData.length} slot flags`);

    // Close the connection
    await connection.end();
    console.log('Connection closed');
  } catch (error) {
    console.error('Error importing slot flags:', error);
    process.exit(1);
  }
}

importSlotFlags();