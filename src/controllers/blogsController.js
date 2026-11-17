const { BlogPost, SideInformation } = require('../models/blog');

module.exports = {
  getAllBlogPosts: async (req, res) => {
    try {
      const posts = await BlogPost.find().sort({ createdAt: -1 });
      res.status(200).json(posts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getBlogPostById: async (req, res) => {
    try {
      const post = await BlogPost.findOne({ id: req.params.id });
      if (!post) {
        return res.status(404).json({ error: 'Blog post not found' });
      }
      res.status(200).json(post);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  createBlogPost: async (req, res) => {
    try {
      const newPost = new BlogPost(req.body);
      const savedPost = await newPost.save();
      res.status(201).json(savedPost);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  updateBlogPost: async (req, res) => {
    try {
      const updatedPost = await BlogPost.findOneAndUpdate(
        { id: req.params.id },
        req.body,
        { new: true, runValidators: true }
      );
      if (!updatedPost) {
        return res.status(404).json({ error: 'Blog post not found' });
      }
      res.status(200).json(updatedPost);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  deleteBlogPost: async (req, res) => {
    try {
      const deletedPost = await BlogPost.findOneAndDelete({ id: req.params.id });
      if (!deletedPost) {
        return res.status(404).json({ error: 'Blog post not found' });
      }
      res.status(200).json({ message: 'Blog post deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getAllSideInformation: async (req, res) => {
    try {
      const items = await SideInformation.find().sort({ createdAt: -1 });
      res.status(200).json(items);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getSideInformationById: async (req, res) => {
    try {
      const item = await SideInformation.findOne({ id: req.params.id });
      if (!item) {
        return res.status(404).json({ error: 'Side information not found' });
      }
      res.status(200).json(item);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  createSideInformation: async (req, res) => {
    try {
      const newItem = new SideInformation(req.body);
      const savedItem = await newItem.save();
      res.status(201).json(savedItem);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  updateSideInformation: async (req, res) => {
    try {
      const updatedItem = await SideInformation.findOneAndUpdate(
        { id: req.params.id },
        req.body,
        { new: true, runValidators: true }
      );
      if (!updatedItem) {
        return res.status(404).json({ error: 'Side information not found' });
      }
      res.status(200).json(updatedItem);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  deleteSideInformation: async (req, res) => {
    try {
      const deletedItem = await SideInformation.findOneAndDelete({ id: req.params.id });
      if (!deletedItem) {
        return res.status(404).json({ error: 'Side information not found' });
      }
      res.status(200).json({ message: 'Side information deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};