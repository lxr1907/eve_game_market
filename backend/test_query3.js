require('dotenv').config({ path: './.env' });
const eveApiService = require('./services/eveApiService');

async function test() {
  try {
    const orders = await eveApiService.getMarketOrdersByRegionAndType(10000002, 81050, 'buy', 1, 'serenity');
    console.log(orders[0]);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
test();
