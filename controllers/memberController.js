const db = require('../config/db');

// 1. GET ALL MEMBERS
exports.getMembers = async (req, res) => {
    try {
        // Flutter app query params me workspace_name bhej rahi hai
        const { workspace_name } = req.query;

        if (!workspace_name) {
            return res.status(400).json({ error: 'Workspace name is required' });
        }

        const [members] = await db.execute(
            'SELECT * FROM members WHERE workspace_id = ? ORDER BY name ASC',
            [workspace_name]
        );

        // ✅ Flutter app ko sidha array chahiye
        res.status(200).json(members);
    } catch (error) {
        console.error('Get Members Error:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
};

// 2. ADD NEW MEMBER
// 2. ADD NEW MEMBER
exports.addMember = async (req, res) => {
    try {
        const { workspace_name, name, email, phone, address, year, photo_url } = req.body;

        if (!name || !workspace_name) {
            return res.status(400).json({ error: 'Name and Workspace are required' });
        }

        // Database me insert kar rahe hain (Sequence exactly match karna chahiye)
        const [result] = await db.execute(
            `INSERT INTO members (workspace_id, name, email, phone, address, year, photo_url) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                workspace_name, 
                name, 
                email || null, 
                phone || null, 
                address || null, 
                year || null, 
                photo_url || null
            ]
        );

        res.status(201).json({ message: 'Member added successfully', id: result.insertId });
    } catch (error) {
        console.error('Add Member Error:', error);
        res.status(500).json({ error: 'Failed to add member' });
    }
};

// 3. UPDATE MEMBER
exports.updateMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, address, year, photo_url } = req.body;

        await db.execute(
            `UPDATE members 
             SET name = ?, email = ?, phone = ?, address = ?, year = ?, photo_url = ? 
             WHERE id = ?`,
            [name, email || null, phone || null, address || null, year || null, photo_url || null, id]
        );

        res.status(200).json({ message: 'Member updated successfully' });
    } catch (error) {
        console.error('Update Member Error:', error);
        res.status(500).json({ error: 'Failed to update member' });
    }
};

// 4. DELETE MEMBER
exports.deleteMember = async (req, res) => {
    try {
        const { id } = req.params;

        // Note: Flutter app frontend pe check kar rahi hai ki koi item issue toh nahi hai.
        // Backend pe bhi delete kar dete hain seedha.
        await db.execute('DELETE FROM members WHERE id = ?', [id]);

        res.status(200).json({ message: 'Member deleted successfully' });
    } catch (error) {
        console.error('Delete Member Error:', error);
        // Agar database me foreign key constraint (issued_items) fail hota hai, toh error aayega
        res.status(500).json({ error: 'Cannot delete member. They might have issued items.' });
    }
};
// ✅ SETTINGS PAGE SE EMPLOYEE PASSWORD UPDATE KARNE KE LIYE
// ✅ SETTINGS PAGE SE EMPLOYEE PASSWORD UPDATE KARNE KE LIYE
exports.updateMemberPassword = async (req, res) => {
    try {
        const { email, password, workspace_name } = req.body;
        
        // Yahan hum 'workspace_id' use kar rahe hain kyunki teri table me wahi naam hai
        const [result] = await db.execute(
            'UPDATE members SET password = ? WHERE email = ? AND workspace_id = ?',
            [password, email, workspace_name]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // ✅ FIX: Yahan 'members' nahi, sirf success message bhejna hai
        res.status(200).json({ message: 'Password updated successfully' });
        
    } catch (error) {
        console.error('Update Password Error:', error);
        res.status(500).json({ error: 'Failed to update password' });
    }
};