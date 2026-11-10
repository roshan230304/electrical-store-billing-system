const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { verifyToken, checkRole } = require('../middleware/auth');

router.get('/', expenseController.getExpenses);
router.get('/categories', expenseController.getExpenseCategories);
router.post('/', verifyToken, expenseController.createExpense);
router.put('/:id', verifyToken, expenseController.updateExpense);
router.delete('/:id', verifyToken, checkRole(['Admin']), expenseController.deleteExpense);

module.exports = router;
