#!/bin/bash

echo "=== 检查 LP 多物品兑换数据 ==="
echo ""

echo "1. 查询加达里公司（1000180）的多物品数据："
curl -s "http://localhost:3000/api/loyalty/multi-item-profit?corporationId=1000180&datasource=serenity&page=1&limit=10" | jq '.data | length' | xargs echo "数据条数:"

echo ""
echo "2. 检查所有数据的 quantity 字段："
curl -s "http://localhost:3000/api/loyalty/multi-item-profit?corporationId=1000180&datasource=serenity&page=1&limit=10" | jq -r '.data[] | "物品: \(.type_name // .type_id) | quantity: \(.quantity) | 总收益: \(.total_profit)"'

echo ""
echo "3. 检查其他公司的数据："
for corp_id in 1000436 1000437 1000181 1000179 1000182; do
  count=$(curl -s "http://localhost:3000/api/loyalty/multi-item-profit?corporationId=${corp_id}&datasource=serenity&page=1&limit=1" | jq '.total')
  echo "公司 ${corp_id}: ${count} 条数据"
done

echo ""
echo "4. 查询数据库中 quantity 为0或NULL的记录："
echo "（需要直接访问数据库，这里通过API检查）"
