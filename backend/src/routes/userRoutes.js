const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, checkRole } = require('../middleware/auth');

router.get('/', verifyToken, userController.getUsers);
router.get('/permissions', verifyToken, userController.getPermissionsMatrix);
router.post('/', verifyToken, checkRole(['Admin']), userController.createUser);
router.delete('/:id', verifyToken, checkRole(['Admin']), userController.deleteUser);

module.exports = router;

