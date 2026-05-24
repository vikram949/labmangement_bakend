const express = require('express');
const router = express.Router();
const { getAdmins, addAdmin, deleteAdmin } = require('../controllers/adminController');

router.get('/', getAdmins);
router.post('/', addAdmin);
router.delete('/:id', deleteAdmin);

module.exports = router;