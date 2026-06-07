const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getExportData, importData } = require('../controllers/exportController');

const upload = multer({ dest: 'uploads/' });

router.get('/', getExportData);
router.post('/import', upload.single('file'), importData);

module.exports = router;