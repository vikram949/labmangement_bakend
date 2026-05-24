const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');
const verifyToken = require('../middlewares/authMiddleware'); // Agar dashboard secure karna hai toh

// API Route: GET /api/dashboard/stats
router.get('/stats', getDashboardStats); // Agar token zaroori karna ho toh (verifyToken, getDashboardStats) likh dena

module.exports = router;