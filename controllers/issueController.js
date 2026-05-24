const db = require('../config/db');

// Helper function to format data like Supabase (Nested Objects)
const formatSupabaseStyle = (rows) => {
    return rows.map(row => ({
        id: row.id,
        quantity: row.quantity,
        status: row.status,
        is_permanent: row.is_permanent,
        issued_date: row.issued_date,
        returned_date: row.returned_date,
        unique_item_id: row.unique_item_id,
        items: {
            id: row.item_id,
            name: row.item_name,
            image_url: row.item_image
        },
        members: {
            id: row.member_id,
            name: row.member_name,
            email: row.member_email
        }
    }));
};

// Base Query jo common hai sabme (JOINs ke sath)
const baseQuery = `
    SELECT 
        ii.*, 
        i.name AS item_name, i.image_url AS item_image,
        m.name AS member_name, m.email AS member_email
    FROM issued_items ii
    LEFT JOIN items i ON ii.item_id = i.id
    LEFT JOIN members m ON ii.member_id = m.id
    WHERE ii.workspace_id = ?
`;

// 1. CURRENT ISSUES TAB (status = 'issued', is_permanent = 0)
exports.getCurrentIssues = async (req, res) => {
    try {
        const { workspace_name } = req.query;
        const [rows] = await db.execute(
            `${baseQuery} AND ii.status = 'issued' AND ii.is_permanent = 0 ORDER BY ii.issued_date DESC`,
            [workspace_name]
        );
        res.status(200).json(formatSupabaseStyle(rows));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch current issues' });
    }
};

// 2. HISTORY TAB (status = 'returned')
exports.getHistory = async (req, res) => {
    try {
        const { workspace_name } = req.query;
        const [rows] = await db.execute(
            `${baseQuery} AND ii.status = 'returned' ORDER BY ii.returned_date DESC`,
            [workspace_name]
        );
        res.status(200).json(formatSupabaseStyle(rows));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
};

// 3. PERMANENT ISSUES TAB (is_permanent = 1)
exports.getPermanentIssues = async (req, res) => {
    try {
        const { workspace_name } = req.query;
        const [rows] = await db.execute(
            `${baseQuery} AND ii.is_permanent = 1 ORDER BY ii.issued_date DESC`,
            [workspace_name]
        );
        res.status(200).json(formatSupabaseStyle(rows));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch permanent issues' });
    }
};

// 4. DAMAGED TAB (status = 'damaged')
exports.getDamagedIssues = async (req, res) => {
    try {
        const { workspace_name } = req.query;
        const [rows] = await db.execute(
            `${baseQuery} AND ii.status = 'damaged' ORDER BY ii.issued_date DESC`,
            [workspace_name]
        );
        res.status(200).json(formatSupabaseStyle(rows));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch damaged issues' });
    }
};