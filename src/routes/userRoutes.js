const express = require('express');
const userRoutes = express.Router();
const ctrl = require('../controllers/user');
const { requireAuth } = require('../../middlewares/auth');
const { requireAdmin } = require('../../helpers/roles');

userRoutes.post('/first-admin', ctrl.createFirstAdmin);
userRoutes.get('/me',  requireAuth, ctrl.getCurrentAdmin);
userRoutes.get('/all', requireAuth, requireAdmin, ctrl.getAllUsers);
userRoutes.post('/transfer-admin', requireAuth, requireAdmin, ctrl.transferAdmin);

userRoutes.post('/',       requireAuth, requireAdmin, ctrl.createUser);
userRoutes.get('/',        requireAuth, requireAdmin, ctrl.getUser);
userRoutes.get('/:id',     requireAuth,               ctrl.getUser);
userRoutes.patch('/:id',   requireAuth,               ctrl.updateUserDetails);
userRoutes.delete('/:id',  requireAuth, requireAdmin, ctrl.deleteUser);

module.exports = userRoutes;