const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // 1. Check karo ki request ke 'Header' mein token aaya hai ya nahi
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ error: 'Access Denied! Bhai token kahan hai?' });
    }

    try {
        // 2. Token hamesha "Bearer eyJhb..." format mein aata hai, toh 'Bearer ' word ko hata do
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7, authHeader.length) : authHeader;

        // 3. Token ko apni secret key se verify karo
        const verified = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Token sahi nikla! User ki ID aur Workspace ka naam req.user mein daal do aage use karne ke liye
        req.user = verified;
        
        // 5. Bouncer ne bola: "Sahi hai bhai, jao andar!"
        next(); 
        
    } catch (error) {
        res.status(400).json({ error: 'Token galat hai ya expire ho chuka hai!' });
    }
};

module.exports = verifyToken;