const express = require('express');
const router = express.Router();
const posController = require('../controllers/posController');
const { verifyToken } = require('../middleware/auth');

router.get('/held-bills', posController.getHeldBills);
router.post('/hold', verifyToken, posController.holdBill);
router.post('/resume/:id', verifyToken, posController.resumeBill);
router.delete('/held-bills/:id', verifyToken, posController.deleteHeldBill);

module.exports = router;
