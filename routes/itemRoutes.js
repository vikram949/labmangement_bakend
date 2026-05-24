const express = require('express');
const router = express.Router();

// ✅ FIX YAHAN HAI: Is list mein 'bulkReturnItems' ko add karna zaroori hai!
const { getItems, addItem, updateItem, deleteItem, checkIssued, issueItem, returnItem, bulkReturnItems } = require('../controllers/itemController');

router.get('/', getItems);
router.post('/', addItem);

// Issuing & Returning
router.post('/issue', issueItem);
router.post('/return', returnItem);
router.post('/bulk-return', bulkReturnItems); // ✅ Ab ye perfectly chalega

// CRUD
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);
router.get('/:id/check-issued', checkIssued);

module.exports = router;