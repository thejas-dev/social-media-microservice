const express = require('express');
const {searchPostController} = require('../controllers/search-controllers');
const {authenticateRequest} = require('../middlwares/auth-middleware');

const router = express.Router();

router.use(authenticateRequest);

router.get('/posts', searchPostController);

module.exports = router;
