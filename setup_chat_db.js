const db = require('./config/db');

async function setupDB() {
    try {
        console.log("Creating global_announcements table...");
        await db.execute(`
            CREATE TABLE IF NOT EXISTS global_announcements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                message TEXT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log("Creating chats table...");
        await db.execute(`
            CREATE TABLE IF NOT EXISTS chats (
                id INT AUTO_INCREMENT PRIMARY KEY,
                workspace_id VARCHAR(255) NULL, 
                sender_id VARCHAR(255) NOT NULL,
                sender_role VARCHAR(50) NOT NULL,
                receiver_id VARCHAR(255) NOT NULL,
                receiver_role VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log("Database tables created successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Error creating tables:", err);
        process.exit(1);
    }
}

setupDB();
