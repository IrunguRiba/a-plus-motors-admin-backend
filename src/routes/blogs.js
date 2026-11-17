const express = require('express');
const blogRouter = express.Router();
const ctrl = require('../controllers/blogsController');

blogRouter.get('/', ctrl.getAllBlogPosts);
blogRouter.post('/', ctrl.createBlogPost);
blogRouter.get('/:id', ctrl.getBlogPostById);
blogRouter.put('/:id', ctrl.updateBlogPost);
blogRouter.delete('/:id', ctrl.deleteBlogPost);
blogRouter.get('/side-info', ctrl.getAllSideInformation);
blogRouter.post('/side-info', ctrl.createSideInformation);
blogRouter.get('/side-info/:id', ctrl.getSideInformationById);
blogRouter.put('/side-info/:id', ctrl.updateSideInformation);
blogRouter.delete('/side-info/:id', ctrl.deleteSideInformation);

module.exports = blogRouter;