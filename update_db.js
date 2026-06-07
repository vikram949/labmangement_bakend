const db = require('./config/db');

async function updateDB() {
    try {
        await db.execute('ALTER TABLE admins ADD COLUMN profile_image VARCHAR(255) DEFAULT NULL');
        console.log("SUCCESS: profile_image column added to admins table");
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log("SUCCESS: profile_image column already exists");
        } else {
            console.error("ERROR:", e);
        }
    }
    process.exit(0);
}

updateDB();
