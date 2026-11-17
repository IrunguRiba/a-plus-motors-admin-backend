const express = require('express');
const authRoutes = express.Router();
const ctrl = require('../controllers/auth');

authRoutes.post('/login',           ctrl.login);
authRoutes.post('/forgot-password', ctrl.forgotPassword);
authRoutes.post('/reset-password',  ctrl.resetPassword);

module.exports = authRoutes;