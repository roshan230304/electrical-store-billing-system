const express = require('express');
const router = express.Router();
const partyController = require('../controllers/partyController');
const { verifyToken } = require('../middleware/auth');

router.get('/', partyController.getParties);
router.get('/customer-by-phone/:phone', verifyToken, partyController.getCustomerByPhone);
router.get('/:id/loyalty-history', verifyToken, partyController.getLoyaltyHistory);
router.get('/:id', partyController.getPartyById);
router.post('/', verifyToken, partyController.createParty);
router.put('/:id', verifyToken, partyController.updateParty);
router.delete('/:id', verifyToken, partyController.deleteParty);

// Payment-In / Link to transactions
router.post('/payment-in', verifyToken, partyController.addPaymentIn);

module.exports = router;
