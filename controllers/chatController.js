const db = require('../config/db');

// Fetch history between current user and the Super Admin (or others)
exports.getChatHistory = async (req, res) => {
    const { workspace_id } = req.query; 

    try {
        let query = 'SELECT * FROM chats';
        let params = [];

        if (workspace_id) {
            query += ' WHERE workspace_id = ? OR workspace_id = "superadmin" ORDER BY created_at ASC';
            params.push(workspace_id);
        } else {
            query += ' ORDER BY created_at ASC';
        }

        const [chats] = await db.execute(query, params);
        res.json(chats);
    } catch (error) {
        console.error("Chat Fetch Error:", error);
        res.status(500).json({ error: "Failed to load chats" });
    }
};
