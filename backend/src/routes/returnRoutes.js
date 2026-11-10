const express = require('express');
const router = express.Router();
const returnController = require('../controllers/returnController');
const { verifyToken } = require('../middleware/auth');

router.get('/', returnController.getReturns);
router.post('/', verifyToken, returnController.createReturn);

module.exports = router;

