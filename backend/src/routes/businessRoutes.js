const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const { verifyToken } = require('../middleware/auth');

router.get('/profile', businessController.getProfile);
router.put('/profile', verifyToken, businessController.updateProfile);

module.exports = router;

