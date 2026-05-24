const db = require('../config/db');

// 1. GET ALL CATEGORIES
exports.getCategories = async (req, res) => {
    try {
        const { workspace_name } = req.query;
        const [categories] = await db.execute(
            'SELECT * FROM categories WHERE workspace_id = ? ORDER BY name ASC',
            [workspace_name]
        );
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. ADD NEW CATEGORY
exports.addCategory = async (req, res) => {
    try {
        // Yahan 'enable_item_tracking' aata hai
        const { workspace_name, name, description, image_url, type, enable_item_tracking, properties } = req.body;

        if (!name || !workspace_name) {
            return res.status(400).json({ error: 'Category name and workspace are required' });
        }

        const propertiesJson = properties ? JSON.stringify(properties) : JSON.stringify([]);
        // ✅ FIXED: yahan enable_item_tracking use kiya hai
        const isTracking = enable_item_tracking ? 1 : 0; 

        const [result] = await db.execute(
            `INSERT INTO categories (workspace_id, name, description, image_url, type, enable_item_tracking, properties) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [workspace_name, name, description || null, image_url || null, type || 'consumable', isTracking, propertiesJson]
        );

        res.status(201).json({ message: 'Category added successfully', id: result.insertId });
    } catch (error) {
        console.error('Add Category Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// 3. UPDATE CATEGORY
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, image_url, type, enable_item_tracking, properties } = req.body;

        const propertiesJson = properties ? JSON.stringify(properties) : JSON.stringify([]);
        // ✅ FIXED: yahan bhi theek kar diya
        const isTracking = enable_item_tracking ? 1 : 0;

        await db.execute(
            `UPDATE categories 
             SET name=?, description=?, image_url=?, type=?, enable_item_tracking=?, properties=? 
             WHERE id=?`,
            [name, description || null, image_url || null, type || 'consumable', isTracking, propertiesJson, id]
        );

        res.status(200).json({ message: 'Category updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. DELETE CATEGORY
// 4. DELETE CATEGORY (WITH SAFETY CHECK)
// 4. DELETE CATEGORY (SMART DELETE WITH CASCADE)
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // 🛡️ STEP 1: Check karo ki kya is category ka koi bhi item abhi issued hai?
        // Logic: Agar total_quantity, available_quantity se zyada hai, matlab saman bahar gaya hua hai
        const [issuedItems] = await db.execute(
            'SELECT id FROM items WHERE category_id = ? AND total_quantity > available_quantity LIMIT 1', 
            [id]
        );

        if (issuedItems.length > 0) {
            // ❌ STEP 2: Agar item issued hai, toh error throw karo
            return res.status(400).json({ 
                error: 'Cannot delete! Is category ka kuch saaman abhi issued hai. Pehle use return karwao.' 
            });
        }

        // 🧹 STEP 3: Agar koi item issued nahi hai, toh pehle is category ke saare items delete karo
        await db.execute('DELETE FROM items WHERE category_id = ?', [id]);

        // ✅ STEP 4: Jab items saaf ho jayein, toh finally category uda do
        await db.execute('DELETE FROM categories WHERE id = ?', [id]);
        
        res.status(200).json({ message: 'Category aur uske andar ke saare items delete ho gaye!' });

    } catch (error) {
        console.error('Delete Category Error:', error);
        res.status(500).json({ error: 'Server error while deleting category.' });
    }
};