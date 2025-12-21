const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document');


// Document Routes
router.post('/upload', documentController.uploadDocument);
router.post('/verify', documentController.verifyDocument);
router.post('/recover', documentController.recoverKey);



module.exports = router;
