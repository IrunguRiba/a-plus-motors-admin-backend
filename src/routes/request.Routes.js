const express = require('express');
const requestRoutes = express.Router();
const ctrl = require('../controllers/requests');
const { requireAuth } = require('../../middlewares/auth');
const { requireAdmin } = require('../../helpers/roles');

requestRoutes.post('/:type', ctrl.createRequest);
requestRoutes.patch('/code/:code', requireAuth, requireAdmin, ctrl.updateRequest);
requestRoutes.patch('/:type/:id', requireAuth, requireAdmin, ctrl.updateRequest);
requestRoutes.get('/code/:code', ctrl.getRequest);
requestRoutes.get('/:type/:id', ctrl.getRequest);
requestRoutes.get('/:type', ctrl.getRequest);

module.exports = requestRoutes;