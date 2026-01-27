import json

# 读取数据
with open('highsec_data.json', 'r') as f:
    data = json.load(f)

nodes = data['nodes']
print(f'Total highsec nodes: {len(nodes)}')

if nodes:
    # 计算安全状态范围
    security_statuses = [node['security_status'] for node in nodes]
    max_sec = max(security_statuses)
    min_sec = min(security_statuses)
    print(f'Max security status: {max_sec}')
    print(f'Min security status: {min_sec}')
    
    # 统计大于等于0.9的节点
    high_security_nodes = [node for node in nodes if node['security_status'] >= 0.9]
    print(f'Nodes with security >= 0.9: {len(high_security_nodes)}')
    
    # 打印前几个高安全节点
    if high_security_nodes:
        print('\nSample high security nodes:')
        for i, node in enumerate(high_security_nodes[:5]):
            print('Node', i, ':', node['name'], ', security:', node['security_status'])
