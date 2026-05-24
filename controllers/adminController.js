const db = require('../config/db');

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
        const { name, email, password, role, workspace_name, admin_type } = req.body;
        
        // Pehle check kar lo ki is email se koi aur admin toh nahi hai
        const [existing] = await db.execute('SELECT id FROM admins WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const [result] = await db.execute(
            'INSERT INTO admins (name, email, password, role, workspace_name, admin_type) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, password, role, workspace_name, admin_type]
        );
        
        res.status(201).json({ message: 'Admin added successfully', id: result.insertId });
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