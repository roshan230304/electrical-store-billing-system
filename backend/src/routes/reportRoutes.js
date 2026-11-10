const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken } = require('../middleware/auth');

router.get('/dashboard-stats', reportController.getDashboardStats);
router.get('/sales', reportController.getSaleReport);
router.get('/daybook', reportController.getDaybookReport);
router.get('/all-transactions', reportController.getAllTransactions);

module.exports = router;

