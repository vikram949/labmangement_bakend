const db = require('../config/db');

exports.getDashboardStats = async (req, res) => {
    try {
        const { workspace_name } = req.query;

        if (!workspace_name) {
            return res.status(400).json({ error: 'Bhai, workspace_name toh bhej!' });
        }

        // 1. Total Members
        const [[memberCount]] = await db.execute(
            'SELECT COUNT(*) as count FROM members WHERE workspace_id = ?',
            [workspace_name]
        );

        // 2. Total Items (Components)
        const [[itemCount]] = await db.execute(
            'SELECT COUNT(*) as count FROM items WHERE workspace_id = ?',
            [workspace_name]
        );

        // 3. Total Issued Items
        const [[issuedCount]] = await db.execute(
            'SELECT COUNT(*) as count FROM issued_items WHERE workspace_id = ? AND status = "issued"',
            [workspace_name]
        );

        // 4. Low Stock Items (Available qty < 5)
        const [[lowStockCount]] = await db.execute(
            'SELECT COUNT(*) as count FROM items WHERE workspace_id = ? AND available_quantity < 5',
            [workspace_name]
        );

        // Data JSON format mein wapas bhej do (exactly waisa jaisa Flutter expect kar raha hai)
        res.status(200).json({
            total_members: memberCount.count,
            total_components: itemCount.count,
            total_issued_items: issuedCount.count,
            low_stock_items: lowStockCount.count
        });

    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ error: 'Server me gadbad hai, stats load nahi huye.' });
    }
};