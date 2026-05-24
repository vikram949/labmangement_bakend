const express = require('express');
const router = express.Router();
const { 
    getCurrentIssues, 
    getHistory, 
    getDamagedIssues, 
    getPermanentIssues 
} = require('../controllers/issueController');

// Ye API end-points tere 4 tabs ke liye hain
router.get('/current', getCurrentIssues);
router.get('/history', getHistory);
router.get('/permanent', getPermanentIssues);
router.get('/damaged', getDamagedIssues);

module.exports = router;