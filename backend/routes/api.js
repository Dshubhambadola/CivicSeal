const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const documentController = require('../controllers/document');


const authController = require('../controllers/auth');

// Auth Routes
// Auth Routes (Custodial)
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/faucet', authController.getFunds); // Keep faucet for auto-funding

// Document Routes
router.post('/upload', auth, documentController.uploadDocument);
router.post('/revoke', auth, documentController.revokeDocument);
router.get('/list', auth, documentController.listDocuments); // Dashboard API

router.post('/verify', documentController.verifyDocument);
router.post('/recover', documentController.recoverKey);



module.exports = router;
