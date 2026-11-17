const express = require('express');
const requestRoutes = express.Router();
const ctrl = require('../controllers/requests');
const { requireAuth } = require('../../middlewares/auth');
const { requireAdmin } = require('../../helpers/roles');

requestRoutes.post('/:type', ctrl.createRequest);
requestRoutes.patch('/code/:code', requireAuth, requireAdmin, ctrl.updateRequest);
requestRoutes.patch('/:type/:id', requireAuth, requireAdmin, ctrl.updateRequest);

module.exports = requestRoutes;