const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

router.post('/login', authController.login);
router.get('/setup-status', authController.getSetupStatus);
router.post('/setup', authController.createInitialAdmin);
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
