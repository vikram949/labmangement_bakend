const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (to, subject, text) => {
    try {
        const mailOptions = {
            from: `"Lab Inventory System" <${process.env.EMAIL_USER}>`, 
            to: to,
            subject: subject,
            text: text
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Mast Email chali gayi isko: ${to}`);
        return true;
    } catch (error) {
        console.error('❌ Email bhejne mein gadbad ho gayi bhai:', error);
        return false;
    }
};

// YAHAN DHYAN DE: Ye line sabse zaroori hai error hatane ke liye
module.exports = sendEmail;