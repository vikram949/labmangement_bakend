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

const fs = require('fs');
const csv = require('csv-parser');

exports.importData = async (req, res) => {
    try {
        const { table, workspace_name } = req.body;
        if (!req.file || !table || !workspace_name) {
            return res.status(400).json({ error: "File, table, and workspace_name are required!" });
        }

        const results = [];
        fs.createReadStream(req.file.path)
            .pipe(csv({
                mapHeaders: ({ header }) => header.trim().toLowerCase()
            }))
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                try {
                    if (results.length > 0) {
                        const firstRowKeys = Object.keys(results[0]);
                        const isItems = firstRowKeys.some(k => k.includes('qty') || k.includes('category') || k.includes('available'));
                        const isMembers = firstRowKeys.some(k => k.includes('email') || k.includes('phone') || k.includes('year'));
                        const isIssued = firstRowKeys.some(k => k.includes('issued to') || k.includes('returned by') || k.includes('status') || k.includes('reason'));

                        let expected = '';
                        if (table === 'members' && !isMembers) expected = 'Members';
                        else if (table === 'items' && !isItems && !isIssued) expected = 'Items';
                        else if ((table === 'issued_items' || table === 'permanent_items' || table === 'damaged_items') && !isIssued) expected = 'Issued/Permanent/Damaged Items';

                        if (expected !== '') {
                            fs.unlinkSync(req.file.path);
                            return res.status(400).json({ error: `Galat file upload ho gayi hai! Aap ${expected} ka data upload karne ki koshish kar rahe hain, par CSV kisi aur cheez ki hai.` });
                        }
                    }

                    let insertedCount = 0;
                    for (const row of results) {
                        if (table === 'categories') {
                            const name = row['name'] || row['category name'] || null;
                            const description = row['description'] || '';
                            const type = row['type'] || 'consumable';
                            
                            if (!name) continue;
                            
                            const [existing] = await db.execute('SELECT id FROM categories WHERE name = ? AND workspace_id = ?', [name, workspace_name]);
                            if (existing.length === 0) {
                                await db.execute(
                                    'INSERT INTO categories (name, description, type, workspace_id) VALUES (?, ?, ?, ?)',
                                    [name, description, type, workspace_name]
                                );
                            }
                        } else if (table === 'members') {
                            const name = row['name'] || null;
                            const email = row['email'] || null;
                            const phone = row['phone'] || null;
                            const year = row['year'] || '1st Year';
                            const address = row['address'] || '';

                            if (!name || !email) continue;

                            const [existing] = await db.execute('SELECT id FROM members WHERE email = ? AND workspace_id = ?', [email, workspace_name]);
                            if (existing.length === 0) {
                                await db.execute(
                                    'INSERT INTO members (name, email, phone, year, address, workspace_id) VALUES (?, ?, ?, ?, ?, ?)',
                                    [name, email, phone, year, address, workspace_name]
                                );
                            }
                        } else if (table === 'items') {
                            const name = row['name'] || row['item name'] || null;
                            const categoryName = row['category'] || row['category name'] || row['category_id'] || null; 
                            const totalQty = parseInt(row['total_quantity'] || row['total qty'] || row['qty'] || 1);
                            const availableQty = parseInt(row['available_quantity'] || row['available qty'] || totalQty);
                            
                            if (!name) continue;

                            let category_id = null;
                            if (categoryName) {
                                const [cats] = await db.execute('SELECT id FROM categories WHERE name = ? AND workspace_id = ?', [categoryName, workspace_name]);
                                if (cats.length > 0) category_id = cats[0].id;
                            }

                            if (!category_id) {
                                const [cats] = await db.execute('SELECT id FROM categories WHERE workspace_id = ? LIMIT 1', [workspace_name]);
                                if (cats.length > 0) category_id = cats[0].id;
                            }

                            if (category_id) {
                                await db.execute(
                                    'INSERT INTO items (name, category_id, total_quantity, available_quantity, workspace_id, properties) VALUES (?, ?, ?, ?, ?, ?)',
                                    [name, category_id, totalQty, availableQty, workspace_name, JSON.stringify({})]
                                );
                            }
                        } else if (table === 'issued_items' || table === 'permanent_items' || table === 'damaged_items') {
                            const itemName = row['item name'] || row['name'] || row['item'] || null;
                            const memberName = row['issued to'] || row['returned by'] || row['member'] || row['member name'] || null;
                            const qty = parseInt(row['qty'] || row['quantity'] || 1);
                            
                            if (!itemName || !memberName) continue;

                            const [itemsList] = await db.execute('SELECT id FROM items WHERE name = ? AND workspace_id = ?', [itemName, workspace_name]);
                            let item_id = null;
                            if (itemsList.length > 0) item_id = itemsList[0].id;

                            const [membersList] = await db.execute('SELECT id FROM members WHERE name = ? AND workspace_id = ?', [memberName, workspace_name]);
                            let member_id = null;
                            if (membersList.length > 0) member_id = membersList[0].id;

                            if (item_id && member_id) {
                                if (table === 'issued_items') {
                                    const status = row['status'] || 'issued';
                                    const [existing] = await db.execute('SELECT id FROM issued_items WHERE item_id = ? AND member_id = ? AND workspace_id = ? AND status = ? AND is_permanent = 0', [item_id, member_id, workspace_name, status]);
                                    if (existing.length === 0) {
                                        await db.execute(
                                            'INSERT INTO issued_items (item_id, member_id, workspace_id, quantity, status, is_permanent) VALUES (?, ?, ?, ?, ?, 0)',
                                            [item_id, member_id, workspace_name, qty, status]
                                        );
                                        insertedCount++;
                                    }
                                } else if (table === 'permanent_items') {
                                    const [existing] = await db.execute('SELECT id FROM issued_items WHERE item_id = ? AND member_id = ? AND workspace_id = ? AND is_permanent = 1', [item_id, member_id, workspace_name]);
                                    if (existing.length === 0) {
                                        await db.execute(
                                            'INSERT INTO issued_items (item_id, member_id, workspace_id, quantity, status, is_permanent) VALUES (?, ?, ?, ?, ?, 1)',
                                            [item_id, member_id, workspace_name, qty, 'issued']
                                        );
                                        insertedCount++;
                                    }
                                } else if (table === 'damaged_items') {
                                    const reason = row['reason'] || row['damage_reason'] || row['damage reason'] || '';
                                    const [existing] = await db.execute('SELECT id FROM issued_items WHERE item_id = ? AND member_id = ? AND workspace_id = ? AND status = "damaged"', [item_id, member_id, workspace_name]);
                                    if (existing.length === 0) {
                                        await db.execute(
                                            'INSERT INTO issued_items (item_id, member_id, workspace_id, quantity, status, is_permanent, damage_reason) VALUES (?, ?, ?, ?, ?, 0, ?)',
                                            [item_id, member_id, workspace_name, qty, 'damaged', reason]
                                        );
                                        insertedCount++;
                                    }
                                }
                            }
                        }
                    }
                    fs.unlinkSync(req.file.path);
                    res.status(200).json({ message: insertedCount > 0 ? "Import successful!" : "No new data was imported (maybe duplicates or missing references)." });
                } catch (dbError) {
                    console.error("DB Import Error:", dbError);
                    res.status(500).json({ error: "Failed to save data into database." });
                }
            });
    } catch (error) {
        console.error("Import Error:", error);
        res.status(500).json({ error: "Server import process failed." });
    }
};