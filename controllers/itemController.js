const db = require('../config/db');

// 1. GET ALL ITEMS BY CATEGORY
exports.getItems = async (req, res) => {
    try {
        const { category_id } = req.query;
        if (!category_id) {
            return res.status(400).json({ error: 'Category ID is required' });
        }

        const [items] = await db.execute(
            'SELECT * FROM items WHERE category_id = ? ORDER BY name ASC',
            [category_id]
        );
        res.status(200).json(items);
    } catch (error) {
        console.error("Get Items Error:", error);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
};

// 1.5 GET LOW STOCK ITEMS
exports.getLowStockItems = async (req, res) => {
    try {
        const { workspace_name } = req.query;
        if (!workspace_name) {
            return res.status(400).json({ error: 'workspace_name is required' });
        }

        const [items] = await db.execute(`
            SELECT i.*, c.name as category_name 
            FROM items i
            LEFT JOIN categories c ON i.category_id = c.id
            WHERE i.workspace_id = ? AND i.available_quantity < 5
            ORDER BY i.available_quantity ASC
        `, [workspace_name]);

        res.status(200).json(items);
    } catch (error) {
        console.error("Get Low Stock Items Error:", error);
        res.status(500).json({ error: 'Failed to fetch low stock items' });
    }
};

// 2. CHECK IF ITEM IS ISSUED (Delete karne se pehle check karne ke liye)
exports.checkIssued = async (req, res) => {
    try {
        const { id } = req.params;
        const [items] = await db.execute('SELECT total_quantity, available_quantity FROM items WHERE id = ?', [id]);
        
        if (items.length === 0) return res.status(404).json({ error: 'Item not found' });

        const item = items[0];
        // Agar Available quantity Total se kam hai, matlab kuch items issued hain
        const hasIssued = item.total_quantity > item.available_quantity;

        res.status(200).json({ hasIssuedItems: hasIssued });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. ADD NEW ITEM (Flutter ke AddItemDialog se aayega)
exports.addItem = async (req, res) => {
    try {
        const { category_id, workspace_name, name, total_quantity, available_quantity, properties, image_url } = req.body;

        const propertiesJson = properties ? JSON.stringify(properties) : JSON.stringify({});

        const [result] = await db.execute(
            `INSERT INTO items (category_id, workspace_id, name, total_quantity, available_quantity, properties, image_url) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [category_id, workspace_name, name, total_quantity, available_quantity, propertiesJson, image_url || null]
        );

        res.status(201).json({ message: 'Item added successfully', id: result.insertId });
    } catch (error) {
        console.error('Add Item Error:', error);
        res.status(500).json({ error: 'Failed to add item' });
    }
};

// 4. UPDATE ITEM
exports.updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, total_quantity, available_quantity, properties, image_url } = req.body;

        const propertiesJson = properties ? JSON.stringify(properties) : JSON.stringify({});

        await db.execute(
            `UPDATE items SET name=?, total_quantity=?, available_quantity=?, properties=?, image_url=? WHERE id=?`,
            [name, total_quantity, available_quantity, propertiesJson, image_url || null, id]
        );

        res.status(200).json({ message: 'Item updated successfully' });
    } catch (error) {
        console.error('Update Item Error:', error);
        res.status(500).json({ error: 'Failed to update item' });
    }
};

// 5. DELETE ITEM
exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM items WHERE id = ?', [id]);
        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Cannot delete item.' });
    }
};
// 6. ISSUE ITEM (Naya Code with Notifications)
exports.issueItem = async (req, res) => {
    try {
        const { item_id, member_id, workspace_name, quantity, status, is_permanent, unique_item_id } = req.body;

        // Step 1: Check current available quantity and get item/member names for notifications
        const [itemRows] = await db.execute('SELECT name, available_quantity FROM items WHERE id = ?', [item_id]);
        if (itemRows.length === 0) return res.status(404).json({ error: 'Item not found' });
        
        if (itemRows[0].available_quantity < quantity) {
            return res.status(400).json({ error: 'Stock not available!' });
        }
        
        const [memberRows] = await db.execute('SELECT name FROM members WHERE id = ?', [member_id]);
        const itemName = itemRows[0].name;
        const memberName = memberRows.length > 0 ? memberRows[0].name : 'A Member';

        // Step 2: Insert into issued_items table
        const [result] = await db.execute(
            `INSERT INTO issued_items (item_id, member_id, workspace_id, quantity, status, is_permanent, unique_item_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [item_id, member_id, workspace_name, quantity, status, is_permanent, unique_item_id || null]
        );

        // Step 3: Available quantity kam karo (Only if not pending, or if logic dictates, but let's keep original logic)
        await db.execute(
            'UPDATE items SET available_quantity = available_quantity - ? WHERE id = ?',
            [quantity, item_id]
        );

        // Step 4: Emit real-time notification
        const io = req.app.get('io');
        if (io) {
            if (status === 'pending') {
                io.to(workspace_name).emit('item_request', {
                    employeeName: memberName,
                    itemName: itemName,
                    quantity: quantity
                });
            } else {
                io.to(workspace_name).emit('request_approved', {
                    itemName: itemName,
                    quantity: quantity
                });
            }
        }

        res.status(200).json({ message: 'Item issued successfully', issue_id: result.insertId });
    } catch (error) {
        console.error('Issue Item Error:', error);
        res.status(500).json({ error: 'Failed to issue item' });
    }
};

// 7. RETURN ITEM (Naya Code)
exports.returnItem = async (req, res) => {
    try {
        const { issued_item_id, return_qty } = req.body;

        // Step 1: Pata karo kitne issue hue the
        const [issueRows] = await db.execute('SELECT * FROM issued_items WHERE id = ?', [issued_item_id]);
        if (issueRows.length === 0) return res.status(404).json({ error: 'Issue record not found' });
        
        const issueRecord = issueRows[0];
        const currentQty = issueRecord.quantity;
        const itemId = issueRecord.item_id;

        // Step 2: Status update karo (Full ya Partial return)
        if (return_qty === currentQty) {
            await db.execute(
                'UPDATE issued_items SET status = ?, returned_date = NOW() WHERE id = ?', 
                ['returned', issued_item_id]
            );
        } else {
            // Agar aadha saman wapas aaya hai toh purane ko update karke ek naya returned record dalo
            await db.execute('UPDATE issued_items SET quantity = ? WHERE id = ?', [currentQty - return_qty, issued_item_id]);
            await db.execute(
                `INSERT INTO issued_items (item_id, member_id, workspace_id, quantity, status, is_permanent, returned_date) 
                 VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                [itemId, issueRecord.member_id, issueRecord.workspace_id, return_qty, 'returned', 0]
            );
        }

        // Step 3: Items table me Available quantity wapas badha do
        await db.execute(
            'UPDATE items SET available_quantity = available_quantity + ? WHERE id = ?', 
            [return_qty, itemId]
        );

        res.status(200).json({ message: 'Item returned successfully' });
    } catch (error) {
        console.error('Return Item Error:', error);
        res.status(500).json({ error: 'Failed to return item' });
    }
};
// 8. BULK RETURN ITEMS (Damaged handling added)
exports.bulkReturnItems = async (req, res) => {
    try {
        const { returns } = req.body;
        
        if (!returns || !Array.isArray(returns) || returns.length === 0) {
             return res.status(400).json({ error: 'No items provided for return' });
        }

        // Loop through each return request
        for (const item of returns) {
            const { issued_item_id, return_qty, is_damaged, reason } = item;

            // Pata karo kitne issue hue the
            const [issueRows] = await db.execute('SELECT * FROM issued_items WHERE id = ?', [issued_item_id]);
            if (issueRows.length === 0) continue; // Skip if not found
            
            const issueRecord = issueRows[0];
            const currentQty = issueRecord.quantity;
            const itemId = issueRecord.item_id;

            // Determine the final status based on whether it was marked damaged
            const finalStatus = is_damaged ? 'damaged' : 'returned';

            // Agar saare item wapas aaye (damaged ya normal)
            if (return_qty === currentQty) {
                // Agar damaged hai, toh reason bhi save karo (Assuming you have a damage_reason column)
                // Agar 'damage_reason' column nahi hai db mein, toh query wapas simple kardenge.
                try {
                     if(is_damaged) {
                         await db.execute(
                             'UPDATE issued_items SET status = ?, returned_date = NOW(), damage_reason = ? WHERE id = ?', 
                             [finalStatus, reason, issued_item_id]
                         );
                     } else {
                         await db.execute(
                             'UPDATE issued_items SET status = ?, returned_date = NOW() WHERE id = ?', 
                             [finalStatus, issued_item_id]
                         );
                     }
                } catch(e) {
                     // Fallback agar damage_reason column exist nahi karta hai database me
                     await db.execute(
                         'UPDATE issued_items SET status = ?, returned_date = NOW() WHERE id = ?', 
                         [finalStatus, issued_item_id]
                     );
                }
            } else {
                // Agar aadha saman wapas aaya hai toh purane ko update karke ek naya record dalo
                await db.execute('UPDATE issued_items SET quantity = ? WHERE id = ?', [currentQty - return_qty, issued_item_id]);
                
                try {
                     if(is_damaged) {
                         await db.execute(
                             `INSERT INTO issued_items (item_id, member_id, workspace_id, quantity, status, is_permanent, returned_date, damage_reason) 
                              VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`,
                             [itemId, issueRecord.member_id, issueRecord.workspace_id, return_qty, finalStatus, 0, reason]
                         );
                     } else {
                         await db.execute(
                             `INSERT INTO issued_items (item_id, member_id, workspace_id, quantity, status, is_permanent, returned_date) 
                              VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                             [itemId, issueRecord.member_id, issueRecord.workspace_id, return_qty, finalStatus, 0]
                         );
                     }
                } catch(e) {
                     // Fallback without damage_reason
                     await db.execute(
                         `INSERT INTO issued_items (item_id, member_id, workspace_id, quantity, status, is_permanent, returned_date) 
                          VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                         [itemId, issueRecord.member_id, issueRecord.workspace_id, return_qty, finalStatus, 0]
                     );
                }
            }

            // Sirf wahi item inventory mein wapas add karo jo DAMAGE NAHI hue hain
            if (!is_damaged) {
                await db.execute(
                    'UPDATE items SET available_quantity = available_quantity + ? WHERE id = ?', 
                    [return_qty, itemId]
                );
            }
        }

        res.status(200).json({ message: 'Bulk return processed successfully' });
    } catch (error) {
        console.error('Bulk Return Error:', error);
        res.status(500).json({ error: 'Failed to process bulk return' });
    }
};