const express = require('express');
const router = express.Router();

// ✅ FIX: Yahan 'updateMemberPassword' ko list mein add karna zaroori hai!
const { getMembers, addMember, updateMember, deleteMember, updateMemberPassword } = require('../controllers/memberController');

// Ye route sabse upar rakhna theek hai
router.put('/password', updateMemberPassword);

// Define API Routes for Members
router.get('/', getMembers);
router.post('/', addMember);
router.put('/:id', updateMember);
router.delete('/:id', deleteMember);

module.exports = router;