const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { verifyToken } = require('../middleware/auth');

router.get('/next-number', saleController.getNextInvoiceNumber);
router.get('/', saleController.getSales);
router.get('/:id', saleController.getSaleById);
router.post('/', verifyToken, saleController.createSale);

module.exports = router;

