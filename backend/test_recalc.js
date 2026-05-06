require('dotenv').config({ path: './.env' });
const LoyaltyController = require('./controllers/LoyaltyController');

async function test() {
  try {
    console.log('Testing recalculation for corporationId 1000179, serenity');
    await LoyaltyController.calculateProfitInternal(1000179, 'serenity');
    console.log('Done');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
test();
