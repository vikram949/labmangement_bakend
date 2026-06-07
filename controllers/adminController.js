const db = require('../config/db');
const sendEmail = require('../utils/emailService');
const crypto = require('crypto');

// 1. GET SUB-ADMINS
exports.getAdmins = async (req, res) => {
    try {
        const { workspace_name, admin_type } = req.query;
        const [admins] = await db.execute(
            'SELECT id, name, email, password, admin_type FROM admins WHERE workspace_name = ? AND admin_type = ?',
            [workspace_name, admin_type]
        );
        res.status(200).json(admins);
    } catch (error) {
        console.error('Get Admins Error:', error);
        res.status(500).json({ error: 'Failed to fetch admins' });
    }
};

// 2. ADD NEW SUB-ADMIN
exports.addAdmin = async (req, res) => {
    try {
        const { name, email, role, workspace_name, admin_type } = req.body;
        
        const safeName = name ?? null;
        const safeEmail = email ?? null;
        const safeRole = role ?? null;
        const safeWorkspace = workspace_name ?? null;
        const safeType = admin_type ?? null;

        if (!safeEmail) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        // Pehle check kar lo ki is email se koi aur admin toh nahi hai
        const [existing] = await db.execute('SELECT id FROM admins WHERE email = ?', [safeEmail]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const newId = crypto.randomUUID();
        const verificationToken = crypto.randomBytes(20).toString('hex');

        // Insert with no password initially, and is_verified = false
        const [result] = await db.execute(
            'INSERT INTO admins (id, name, email, password, role, workspace_name, admin_type, is_verified, verification_token) VALUES (?, ?, ?, NULL, ?, ?, ?, false, ?)',
            [newId, safeName, safeEmail, safeRole, safeWorkspace, safeType, verificationToken]
        );
        
        // Send email
        const setupLink = `http://localhost:5000/api/admins/setup-password?token=${verificationToken}`;
        const emailText = `Namaste ${name}! 🙏\n\nAapko "${workspace_name}" workspace ke liye Sub-Admin banaya gaya hai.\nApna password set karne ke liye is link par click karein:\n\n${setupLink}\n\nDHYAN RAHE: Ye link sirf ek baar kaam karega aur apna password aap khud baad mein change nahi kar payenge. Agar aap bhool gaye, toh aapka Super Admin hi password change kar sakta hai.\n\nRegards,\nLab Manager System`;
        
        await sendEmail(email, '🔑 Setup Your Sub-Admin Password', emailText);

        res.status(201).json({ message: 'Admin added successfully and email sent', id: newId });
    } catch (error) {
        console.error('Add Admin Error:', error);
        res.status(500).json({ error: 'Failed to add admin' });
    }
};

// 3. DELETE SUB-ADMIN
exports.deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM admins WHERE id = ?', [id]);
        res.status(200).json({ message: 'Admin deleted successfully' });
    } catch (error) {
        console.error('Delete Admin Error:', error);
        res.status(500).json({ error: 'Failed to delete admin' });
    }
};

// 4. GET SETUP PASSWORD PAGE
exports.getSetupPasswordPage = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).send('<h1>❌ Invalid Link</h1>');

        const [admins] = await db.execute('SELECT * FROM admins WHERE verification_token = ?', [token]);
        if (admins.length === 0) return res.status(400).send('<h1>❌ Link expire ho gaya ya pehle hi use ho chuka hai!</h1>');

        res.status(200).send(`
            <div style="text-align: center; font-family: sans-serif; padding-top: 50px;">
                <h2>🔑 Set Your Sub-Admin Password</h2>
                <form action="/api/admins/setup-password" method="POST">
                    <input type="hidden" name="token" value="${token}" />
                    <input type="password" name="password" placeholder="Enter your new password" required style="padding: 10px; font-size: 16px; margin-bottom: 10px; width: 250px;" />
                    <br/>
                    <button type="submit" style="padding: 10px 20px; font-size: 16px; background-color: #1A2980; color: white; border: none; cursor: pointer;">Save Password</button>
                </form>
                <p style="color: red; font-size: 12px; margin-top: 20px;">Note: Ye ek one-time password setup hai. Aap ise dobara change nahi kar payenge.</p>
            </div>
        `);
    } catch (error) {
        res.status(500).send('<h1>Server error</h1>');
    }
};

// 5. POST SETUP PASSWORD
exports.setupPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        const [admins] = await db.execute('SELECT * FROM admins WHERE verification_token = ?', [token]);
        if (admins.length === 0) return res.status(400).send('<h1>❌ Invalid or expired token</h1>');

        // User wanted plain text password so Super Admin can see it.
        await db.execute(
            'UPDATE admins SET password = ?, is_verified = true, verification_token = NULL WHERE verification_token = ?',
            [password, token]
        );

        res.status(200).send(`
            <div style="text-align: center; font-family: sans-serif; padding-top: 50px;">
                <h1 style="color: green;">✅ Password Set Successfully!</h1>
                <p>Ab aap Lab Manager app me login kar sakte hain.</p>
            </div>
        `);
    } catch (error) {
        res.status(500).send('<h1>Server error</h1>');
    }
};

// 6. UPLOAD PROFILE IMAGE
exports.uploadProfileImage = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        const imageUrl = `/uploads/${req.file.filename}`;

        await db.execute('UPDATE admins SET profile_image = ? WHERE email = ?', [imageUrl, email]);

        res.status(200).json({ 
            message: 'Profile image uploaded successfully',
            image_url: imageUrl
        });
    } catch (error) {
        console.error('Upload Profile Image Error:', error);
        res.status(500).json({ error: 'Failed to upload profile image' });
    }
};