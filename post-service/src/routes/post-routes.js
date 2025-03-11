const {createPost,getAllPosts,getPost,deletePost} = require('../controllers/post-controllers');
const express = require('express');
const {authenticateRequest} = require('../middlewares/auth-middleware');

const router = express.Router();

router.use(authenticateRequest);

router.post('/create-post', createPost);
router.get('/all-posts',getAllPosts);
router.get('/:id',getPost);
router.delete('/:id',deletePost);

module.exports = router;