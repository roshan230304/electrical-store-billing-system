const express = require('express');
const router = express.Router();
const bankController = require('../controllers/bankController');
const { verifyToken } = require('../middleware/auth');

router.get('/accounts', bankController.getBankAccounts);
router.post('/accounts', verifyToken, bankController.addBankAccount);
router.get('/cash-in-hand', bankController.getCashInHand);
router.post('/cash-adjust', verifyToken, bankController.adjustCash);

module.exports = router;

