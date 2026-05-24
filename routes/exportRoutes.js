const express = require('express');
const router = express.Router();
const { getExportData } = require('../controllers/exportController');

router.get('/', getExportData);

module.exports = router;