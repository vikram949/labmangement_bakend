const db = require('../config/db');

exports.getExportData = async (req, res) => {
    try {
        const { table, workspace_name } = req.query;

        if (!workspace_name || !table) {
            return res.status(400).json({ error: "Table aur workspace_name dono zaroori hain!" });
        }

        let query = '';
        const params = [workspace_name];

        // Har table ke liye alag query aur column names (taaki CSV mast dikhe)
        switch (table) {
            case 'members':
                query = 'SELECT name AS "NAME", email AS "EMAIL", phone AS "PHONE", year AS "YEAR", address AS "ADDRESS" FROM members WHERE workspace_id = ?';
                break;
                
            case 'categories':
                query = 'SELECT name AS "CATEGORY NAME", description AS "DESCRIPTION", type AS "TYPE" FROM categories WHERE workspace_id = ?';
                break;
                
            case 'items':
                query = `SELECT i.name AS "ITEM NAME", c.name AS "CATEGORY", i.total_quantity AS "TOTAL QTY", i.available_quantity AS "AVAILABLE QTY"
                         FROM items i
                         LEFT JOIN categories c ON i.category_id = c.id
                         WHERE i.workspace_id = ?`;
                break;
                
            case 'issued_items':
                query = `SELECT i.name AS "ITEM NAME", m.name AS "ISSUED TO", ii.quantity AS "QTY", ii.status AS "STATUS", DATE_FORMAT(ii.issued_date, '%Y-%m-%d') AS "ISSUE DATE"
                         FROM issued_items ii
                         LEFT JOIN items i ON ii.item_id = i.id
                         LEFT JOIN members m ON ii.member_id = m.id
                         WHERE ii.workspace_id = ? AND ii.is_permanent = 0`;
                break;
                
            case 'permanent_items':
                 query = `SELECT i.name AS "ITEM NAME", m.name AS "ISSUED TO", ii.quantity AS "QTY", DATE_FORMAT(ii.issued_date, '%Y-%m-%d') AS "ISSUE DATE"
                         FROM issued_items ii
                         LEFT JOIN items i ON ii.item_id = i.id
                         LEFT JOIN members m ON ii.member_id = m.id
                         WHERE ii.workspace_id = ? AND ii.is_permanent = 1`;
                break;
                
            case 'damaged_items':
                 query = `SELECT i.name AS "ITEM NAME", m.name AS "RETURNED BY", ii.quantity AS "QTY", ii.damage_reason AS "REASON", DATE_FORMAT(ii.returned_date, '%Y-%m-%d') AS "DATE"
                         FROM issued_items ii
                         LEFT JOIN items i ON ii.item_id = i.id
                         LEFT JOIN members m ON ii.member_id = m.id
                         WHERE ii.workspace_id = ? AND ii.status = 'damaged'`;
                break;
                
            default:
                return res.status(400).json({ error: "Invalid table name bhai!" });
        }

        const [rows] = await db.execute(query, params);
        res.status(200).json(rows);

    } catch (error) {
        console.error("Export Error:", error);
        res.status(500).json({ error: "Data export karne mein gadbad hui server pe." });
    }
};