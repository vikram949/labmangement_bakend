const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid'); 
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/emailService'); // Tera postman!

// ==========================================
// 🚀 1. SIGNUP LOGIC (Verification mail ke sath)
// ==========================================
exports.signup = async (req, res) => {
    try {
        const { name, email, password, workspace_name } = req.body;

        const [existingUser] = await db.execute('SELECT * FROM admins WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Bhai, ye email pehle se registered hai!' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const adminId = uuidv4();
        
        // Ek lambi secret chabi (token) verification ke liye
        const verificationToken = uuidv4(); 

        await db.execute(
            'INSERT INTO admins (id, name, email, password, role, admin_type, workspace_name, is_verified, verification_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [adminId, name, email, hashedPassword, 'admin', 'super_admin', workspace_name, false, verificationToken]
        );

        // User ko Verification Link mail karna
        // ⚠️ HOSTINGER PE JAANE KE BAAD YAHAN LOCALHOST KI JAGAH APNA DOMAIN DAALNA
        const verificationLink = `http://localhost:5000/api/auth/verify-email/${verificationToken}`;
        const emailText = `Namaste ${name}! 🙏\n\nLab Manager mein account banane ke liye shukriya. Apna account chalu karne ke liye neeche diye gaye link par click karein:\n\n${verificationLink}\n\nAgar aapne ye request nahi ki hai, toh is email ko ignore karein.`;
        
        await sendEmail(email, '📧 Verify Your Lab Manager Account', emailText);

        res.status(201).json({ message: '✅ Signup successful! Bhai apna email check kar aur account verify kar.' });

    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ error: 'Server mein kuch gadbad hai bhai.' });
    }
};

// ==========================================
// 🚀 2. VERIFY EMAIL LOGIC (Jab user link pe click karega)
// ==========================================
exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;

        const [users] = await db.execute('SELECT * FROM admins WHERE verification_token = ?', [token]);
        
        if (users.length === 0) {
            return res.status(400).send('<h1>❌ Link expire ho gaya ya galat hai!</h1>');
        }

        // User ko verify kar do aur token hata do
        await db.execute(
            'UPDATE admins SET is_verified = true, verification_token = NULL WHERE verification_token = ?',
            [token]
        );

        // Ek mast sa HTML page dikhao success ka
        res.status(200).send(`
            <div style="text-align: center; font-family: sans-serif; padding-top: 50px;">
                <h1 style="color: green;">✅ Account Created Successfully!</h1>
                <p>Aapka Lab Manager account verify ho gaya hai.</p>
                <p>Ab aap apni app mein login kar sakte hain! 🚀</p>
            </div>
        `);
    } catch (error) {
        console.error('Verification Error:', error);
        res.status(500).send('<h1>Server error, baad me try karna bhai.</h1>');
    }
};

// ==========================================
// 🚀 3. LOGIN LOGIC (Bina verify hue andar nahi aane dega)
// ==========================================
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const [users] = await db.execute('SELECT * FROM admins WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'Bhai, ye email toh registered hi nahi hai!' });
        }

        const user = users[0];

        // CHECK: Kya account verify kiya usne link daba ke?
        if (!user.is_verified) {
            return res.status(403).json({ error: 'Pehle apna email check kar aur account verify kar bhai!' });
        }

        let isMatch = false;
        try {
            isMatch = await bcrypt.compare(password, user.password);
        } catch (e) {
            // Ignore bcrypt errors if hash format is completely wrong
        }
        
        // Agar bcrypt se match nahi hua (yaani plain text me save kiya tha taaki admin dekh sake), toh sidha compare kar lo
        if (!isMatch && password === user.password) {
            isMatch = true;
        }

        if (!isMatch) {
            return res.status(400).json({ error: 'Galat password! Wapas try kar.' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, workspace_name: user.workspace_name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            message: '✅ Login Successful!',
            token: token,
            user: {
                id: user.id, name: user.name, email: user.email, 
                role: user.role, workspace_name: user.workspace_name,
                admin_type: user.admin_type,
                profile_image: user.profile_image
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Server mein kuch gadbad hai bhai.' });
    }
};

// ==========================================
// 🚀 4. FORGOT PASSWORD (OTP Bhejna)
// ==========================================
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const [users] = await db.execute('SELECT * FROM admins WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ error: 'Bhai, ye email toh registered hi nahi hai!' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiryTime = new Date(Date.now() + 10 * 60000); 

        await db.execute('UPDATE admins SET reset_otp = ?, otp_expires = ? WHERE email = ?', [otp, expiryTime, email]);

        const emailText = `Namaste Bhai! 🙏\n\nTere password reset ke liye tera 6-digit OTP hai: ${otp}\n\nYe OTP sirf 10 minute ke liye valid hai.\n\nRegards,\nLab Manager System`;
        await sendEmail(email, '🔑 Password Reset OTP - Lab Manager', emailText);

        res.status(200).json({ message: '✅ OTP bhej diya gaya hai!' });
    } catch (error) {
        res.status(500).json({ error: 'OTP bhejne mein gadbad hui.' });
    }
};

// ==========================================
// 🚀 5. VERIFY OTP
// ==========================================
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const [users] = await db.execute('SELECT * FROM admins WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ error: 'User nahi mila!' });

        const user = users[0];
        if (user.reset_otp !== otp) return res.status(400).json({ error: 'Galat OTP hai bhai!' });
        if (new Date() > new Date(user.otp_expires)) return res.status(400).json({ error: 'OTP expire ho gaya. Naya mangwao!' });

        res.status(200).json({ message: '✅ OTP ekdum sahi hai!' });
    } catch (error) {
        res.status(500).json({ error: 'Server error.' });
    }
};

// ==========================================
// 🚀 6. RESET PASSWORD
// ==========================================
exports.resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.execute(
            'UPDATE admins SET password = ?, reset_otp = NULL, otp_expires = NULL WHERE email = ?',
            [hashedPassword, email]
        );

        res.status(200).json({ message: '✅ Password successfully change ho gaya!' });
    } catch (error) {
        res.status(500).json({ error: 'Password change karne mein gadbad hui.' });
    }
};