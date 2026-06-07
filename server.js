const express = require('express');
const cors = require('cors');
const path = require('path'); //  NAYA: Folders ke raaste (paths) manage karne ke liye
require('dotenv').config();

// Database connect karne ke liye (Ye line zaroori hai DB message aane ke liye)
const db = require('./config/db');

const app = express();

// Middlewares
app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); // <-- VERY IMPORTANT for HTML form parsing

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

const superAdminRoutes = require('./routes/superAdminRoutes');
app.use('/api/super-admin', superAdminRoutes);

const chatRoutes = require('./routes/chatRoutes');
app.use('/api/chats', chatRoutes);
const { Server } = require('socket.io');

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(` Server is running on http://localhost:${PORT}`);
});

// NAYA: Socket.io setup for real-time notifications
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins for the app
    }
});

io.on('connection', (socket) => {
    console.log(`User connected to socket: ${socket.id}`);
    
    // Yahan hum app se workspace_name ya role sun sakte hain agar specific room me daalna ho
    socket.on('join_workspace', (workspaceName) => {
        socket.join(workspaceName);
        console.log(`Socket ${socket.id} joined workspace: ${workspaceName}`);
    });

    socket.on('disconnect', () => {
        console.log(' A user disconnected:', socket.id);
    });

    // Handle Global Announcements from Super Admin
    socket.on('send_global_announcement', (data) => {
        // data expects: { message: "Some news!" }
        io.emit('new_global_announcement', data); // Broadcast to ALL connected clients
    });

    // Handle Chat Messages (Save to DB, then broadcast)
    socket.on('send_chat_message', async (data) => {
        // data expects: { workspace_id, sender_id, sender_role, receiver_id, receiver_role, message }
        try {
            await db.execute(
                'INSERT INTO chats (workspace_id, sender_id, sender_role, receiver_id, receiver_role, message) VALUES (?, ?, ?, ?, ?, ?)',
                [data.workspace_id, data.sender_id, data.sender_role, data.receiver_id, data.receiver_role, data.message]
            );
            
            // Broadcast the message so the receiver (and sender) can update their UI instantly
            io.emit('new_chat_message', data);
        } catch (error) {
            console.error("Socket Chat Insert Error:", error);
        }
    });
});

// App level par io ko save kar dete hain taaki controllers me use kar sakein
app.set('io', io);