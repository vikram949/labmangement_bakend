const db = require('../config/db');

exports.getStats = async (req, res) => {
    try {
        const [[workspaces]] = await db.execute('SELECT COUNT(DISTINCT workspace_id) AS total_workspaces FROM members');
        const [[members]] = await db.execute('SELECT COUNT(*) AS total_members FROM members');
        const [[items]] = await db.execute('SELECT COUNT(*) AS total_items FROM items');
        const [[issued]] = await db.execute('SELECT COUNT(*) AS total_issued FROM issued_items');
        const [[categories]] = await db.execute('SELECT COUNT(*) AS total_categories FROM categories');
        const [[admins]] = await db.execute("SELECT COUNT(*) AS total_admins FROM admins WHERE role = 'admin'");

        const totalItems = items.total_items || 0;
        const totalCats = categories.total_categories || 0;
        const totalMems = members.total_members || 0;
        
        // Roughly estimate data size in MB for visualization
        const sizeMb = ((totalItems * 0.5) + (totalCats * 0.1) + (totalMems * 0.2)).toFixed(2);

        res.json({
            workspaces: workspaces.total_workspaces || 0,
            members: totalMems,
            items: totalItems,
            issued: issued.total_issued || 0,
            categories: totalCats,
            admins: admins.total_admins || 0,
            size_mb: sizeMb
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
};

exports.getWorkspaces = async (req, res) => {
    try {
        const [workspaces] = await db.execute(`
            SELECT 
                a.workspace_name as workspace_id, 
                a.email, 
                a.name, 
                COUNT(m.id) as total_members 
            FROM admins a
            LEFT JOIN members m ON a.workspace_name = m.workspace_id
            WHERE a.role = 'admin'
            GROUP BY a.workspace_name, a.email, a.name
        `);
        res.json(workspaces);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch workspaces" });
    }
};

exports.getAdminsList = async (req, res) => {
    try {
        const [admins] = await db.execute(`
            SELECT 
                a.workspace_name as workspace_id, 
                a.email, 
                a.name,
                a.role
            FROM admins a
            ORDER BY a.workspace_name, a.role
        `);
        res.json(admins);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch admins list" });
    }
};

exports.deleteWorkspace = async (req, res) => {
    const { workspace_id } = req.body;
    if (!workspace_id) return res.status(400).json({ error: "workspace_id required" });

    try {
        await db.execute('DELETE FROM access_requests WHERE workspace_id = ?', [workspace_id]);
        await db.execute('DELETE FROM damaged_items WHERE workspace_id = ?', [workspace_id]);
        await db.execute('DELETE FROM employee_passwords WHERE workspace_id = ?', [workspace_id]);
        await db.execute('DELETE FROM notifications WHERE workspace_id = ?', [workspace_id]);
        await db.execute('DELETE FROM issued_items WHERE workspace_id = ?', [workspace_id]);
        await db.execute('DELETE FROM items WHERE workspace_id = ?', [workspace_id]);
        await db.execute('DELETE FROM categories WHERE workspace_id = ?', [workspace_id]);
        await db.execute('DELETE FROM members WHERE workspace_id = ?', [workspace_id]);
        await db.execute('DELETE FROM admins WHERE workspace_name = ?', [workspace_id]);
        await db.execute('DELETE FROM chats WHERE workspace_id = ?', [workspace_id]);
        
        res.json({ message: "Workspace completely nuked!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to delete workspace data" });
    }
};

exports.postGlobalAnnouncement = async (req, res) => {
    const { message } = req.body;
    try {
        // Disable old announcements
        await db.execute('UPDATE global_announcements SET is_active = false');
        
        // Insert new one
        await db.execute('INSERT INTO global_announcements (message) VALUES (?)', [message]);
        
        // Emit via Socket (we will handle emitting directly from frontend for now, or use io instance if accessible)
        res.json({ message: "Announcement posted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to post announcement" });
    }
};

exports.getActiveAnnouncement = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT message FROM global_announcements WHERE is_active = true ORDER BY created_at DESC LIMIT 1');
        if (rows.length > 0) {
            res.json({ message: rows[0].message });
        } else {
            res.json({ message: '' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch announcement" });
    }
};

exports.getWorkspaceDetails = async (req, res) => {
    const { workspaceId } = req.params;
    try {
        const [[itemsRow]] = await db.execute('SELECT COUNT(*) as c FROM items WHERE workspace_id = ?', [workspaceId]);
        const [[catsRow]] = await db.execute('SELECT COUNT(*) as c FROM categories WHERE workspace_id = ?', [workspaceId]);
        const [[membersRow]] = await db.execute('SELECT COUNT(*) as c FROM members WHERE workspace_id = ?', [workspaceId]);

        const items = itemsRow.c || 0;
        const categories = catsRow.c || 0;
        const members = membersRow.c || 0;

        // Roughly estimate data size in MB for visualization
        const sizeMb = ((items * 0.5) + (categories * 0.1) + (members * 0.2)).toFixed(2);

        res.json({
            items,
            categories,
            members,
            size_mb: sizeMb
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch workspace details" });
    }
};
