const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { verifyToken, checkRole } = require('../middleware/auth');

router.get('/', itemController.getItems);
router.get('/categories', itemController.getCategories);
router.post('/categories', verifyToken, checkRole(['Admin']), itemController.createCategory);
router.get('/units', itemController.getUnits);
router.get('/next-code', itemController.getNextProductCode);
router.get('/barcode/:id.svg', itemController.getBarcodeSvg);
router.get('/barcode/:barcode', (req, res, next) => {
  if (req.params.barcode.endsWith('.svg')) return next();
  return itemController.getProductByBarcode(req, res, next);
});
router.get('/by-barcode/:barcode', itemController.getProductByBarcode);
router.get('/:id', itemController.getItemById);
router.post('/', verifyToken, checkRole(['Admin']), itemController.createItem);
router.put('/:id', verifyToken, checkRole(['Admin']), itemController.updateItem);
router.delete('/:id', verifyToken, checkRole(['Admin']), itemController.deleteItem);

module.exports = router;
