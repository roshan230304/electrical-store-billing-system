const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { verifyToken, checkRole } = require('../middleware/auth');

router.get('/', purchaseController.getPurchases);
router.post('/', verifyToken, purchaseController.createPurchase);
router.get('/:id', purchaseController.getPurchaseById);
router.put('/:id', verifyToken, purchaseController.updatePurchase);
router.delete('/:id', verifyToken, checkRole(['Admin']), purchaseController.deletePurchase);
router.get('/:id/history', purchaseController.getPurchaseHistory);

module.exports = router;
