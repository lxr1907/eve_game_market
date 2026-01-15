USE eve;

-- 检查当前主键是否已经是联合主键
SELECT COUNT(*) INTO @pk_count FROM information_schema.statistics WHERE table_schema = 'eve' AND table_name = 'systems' AND index_name = 'PRIMARY';
SELECT GROUP_CONCAT(column_name ORDER BY seq_in_index) INTO @pk_columns FROM information_schema.statistics WHERE table_schema = 'eve' AND table_name = 'systems' AND index_name = 'PRIMARY';

-- 如果主键不是联合主键，则修改
SET @sql = NULL;
IF @pk_count = 1 AND @pk_columns != 'system_id,datasource' THEN
    SET @sql = 'ALTER TABLE systems DROP PRIMARY KEY, ADD PRIMARY KEY (system_id, datasource);';
END IF;

-- 执行修改
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 显示修改后的表结构
SHOW CREATE TABLE systems;