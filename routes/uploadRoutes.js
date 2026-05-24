const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware'); 

// Jab koi POST request marega '/api/upload/image' par
router.post('/image', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Bhai, photo toh attach kar!' });
        }

        const imageUrl = `/uploads/${req.file.filename}`;

        res.status(200).json({
            message: '✅ Photo server par save ho gayi!',
            url: imageUrl
        });

    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Photo save karne mein gadbad hui.' });
    }
});

// Ye line Express ko bata rahi hai ki is file ko router ki tarah use karna hai
module.exports = router;