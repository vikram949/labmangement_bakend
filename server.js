const express = require('express');
const cors = require('cors');
const path = require('path'); //  NAYA: Folders ke raaste (paths) manage karne ke liye
require('dotenv').config();

// Database connect karne ke liye (Ye line zaroori hai DB message aane ke liye)
require('./config/db');

const app = express();

// Middlewares
app.use(cors()); 
app.use(express.json()); 

//  NAYA: Uploads folder ko public banana taaki browser/app mein photo khul sake
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 1. Ek simple test route (Check karne ke liye ki server chal raha hai)
app.get('/', (req, res) => {
    res.send(' Lab Manager Backend is Running Perfectly!');
});

// 2.  TEMP TEST ROUTE: Email check karne ke liye
const sendEmail = require('./utils/emailService');

app.get('/api/test-email', async (req, res) => {
    //  YAHAN DHYAN DE: Apni khud ki koi asali email ID daal dena
    const testEmailID = 'vickybanna1236@gmail.com'; 

    const success = await sendEmail(
        testEmailID,
        ' Test Mail from Lab Inventory System',
        'Bhai agar ye mail aa gayi, toh tera Nodemailer aur App Password ekdum makhan chal raha hai! '
    );

    if (success) {
        res.send(` Email successfully chali gayi ${testEmailID} par! Apna inbox check kar.`);
    } else {
        res.status(500).send(' Email fail ho gayi. Terminal me error dekh.');
    }
});
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);
const uploadRoutes = require('./routes/uploadRoutes');
app.use('/api/upload', uploadRoutes);
const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/api/dashboard', dashboardRoutes);
const memberRoutes = require('./routes/memberRoutes');
app.use('/api/members', memberRoutes);
const categoryRoutes = require('./routes/categoryRoutes');
app.use('/api/categories', categoryRoutes);
const itemRoutes = require('./routes/itemRoutes');
app.use('/api/items', itemRoutes);
const issueRoutes = require('./routes/issueRoutes');
app.use('/api/issued_items/admin', issueRoutes);
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admins', adminRoutes);
app.use('/api/export', require('./routes/exportRoutes'));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(` Server is running on http://localhost:${PORT}`);
});