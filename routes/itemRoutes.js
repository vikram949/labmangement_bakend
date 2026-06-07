const express = require('express');
const router = express.Router();

// ✅ FIX YAHAN HAI: Is list mein 'bulkReturnItems' ko add karna zaroori hai!
const { getItems, getLowStockItems, addItem, updateItem, deleteItem, checkIssued, issueItem, returnItem, bulkReturnItems } = require('../controllers/itemController');

router.get('/', getItems);
router.get('/low-stock', getLowStockItems);
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