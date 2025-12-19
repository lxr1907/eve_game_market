const express = require('express');
const LoyaltyController = require('../controllers/LoyaltyController');
const router = express.Router();

// Loyalty Routes
router.get('/loyalty/offers', LoyaltyController.getLoyaltyOffers);
router.post('/loyalty/offers/sync', LoyaltyController.syncLoyaltyOffers);
router.post('/loyalty/offers/calculate-profit', LoyaltyController.calculateProfit);
router.get('/loyalty/offers/:id', LoyaltyController.getLoyaltyOfferById);
router.post('/loyalty/offers', LoyaltyController.createLoyaltyOffer);
router.put('/loyalty/offers/:id', LoyaltyController.updateLoyaltyOffer);
router.delete('/loyalty/offers/:id', LoyaltyController.deleteLoyaltyOffer);

module.exports = router;
