import mysql.connector

# 连接数据库
cnx = mysql.connector.connect(
    user='root',
    password='',
    host='localhost',
    database='eve_project'
)

cursor = cnx.cursor(dictionary=True)

# 查询serenity数据源中安全状态最高的10个系统
query = """
SELECT system_id, name, security_status 
FROM systems 
WHERE datasource = %s 
ORDER BY security_status DESC 
LIMIT 10
"""
cursor.execute(query, ('serenity',))
rows = cursor.fetchall()

print('Top 10 systems in serenity by security status:')
for row in rows:
    print(f"{row['system_id']}: {row['name']} - {row['security_status']}")

# 统计serenity数据源中安全状态≥0.9的系统数量
count_query = """
SELECT COUNT(*) as count 
FROM systems 
WHERE datasource = %s AND security_status >= 0.9
"""
cursor.execute(count_query, ('serenity',))
count_result = cursor.fetchone()
print(f"\nSystems with security status >= 0.9 in serenity: {count_result['count']}")

# 关闭连接
cursor.close()
cnx.close()
