const { getPool } = require('../config/database');
const { MenuItem } = require('../models');
const logger = require('../utils/logger');

// Helper — lazy pool access so it works after initDatabase()
const db = () => getPool();

/**
 * Get all menu items (including unavailable ones for admin)
 */
exports.getAllMenuItems = async (req, res) => {
  try {
    const [rows] = await db().query(`
      SELECT mi.*, r.name as restaurant_name 
      FROM menu_items mi
      JOIN restaurants r ON mi.restaurant_id = r.id
      ORDER BY mi.is_available DESC, r.name, mi.name
    `);
    
    const menuItems = rows.map(row => MenuItem.fromDatabase(row).toJSON());
    res.json(menuItems);
  } catch (error) {
    logger.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Error fetching menu items' });
  }
};

/**
 * Get menu items by restaurant
 */
exports.getMenuItemsByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const showAll = req.query.all === 'true';
    
    const query = showAll
      ? 'SELECT * FROM menu_items WHERE restaurant_id = ? ORDER BY is_available DESC, name'
      : 'SELECT * FROM menu_items WHERE restaurant_id = ? AND is_available = true ORDER BY name';
    
    const [rows] = await db().query(query, [restaurantId]);

    const menuItems = rows.map(row => MenuItem.fromDatabase(row).toJSON());
    res.json(menuItems);
  } catch (error) {
    logger.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Error fetching menu items' });
  }
};

/**
 * Get menu item by ID
 */
exports.getMenuItemById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await db().query(`
      SELECT mi.*, r.name as restaurant_name 
      FROM menu_items mi
      JOIN restaurants r ON mi.restaurant_id = r.id
      WHERE mi.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const menuItem = MenuItem.fromDatabase(rows[0]);
    res.json(menuItem.toJSON());
  } catch (error) {
    logger.error('Error fetching menu item:', error);
    res.status(500).json({ error: 'Error fetching menu item' });
  }
};

/**
 * Create new menu item
 */
exports.createMenuItem = async (req, res) => {
  try {
    const menuItem = new MenuItem(req.body);
    
    const validation = menuItem.validate();
    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }

    // Verify restaurant exists
    const [restaurant] = await db().query(
      'SELECT id FROM restaurants WHERE id = ? AND is_active = true',
      [menuItem.restaurantId]
    );
    
    if (restaurant.length === 0) {
      return res.status(400).json({ error: 'Restaurant not found or inactive' });
    }

    const dbData = menuItem.toDatabase();
    const [result] = await db().query(
      'INSERT INTO menu_items (restaurant_id, name, description, price, stock, is_available) VALUES (?, ?, ?, ?, ?, ?)',
      [dbData.restaurant_id, dbData.name, dbData.description, dbData.price, dbData.stock, dbData.is_available]
    );

    menuItem.id = result.insertId;
    logger.info(`Menu item created: ${menuItem.name} (ID: ${menuItem.id})`);
    
    res.status(201).json(menuItem.toJSON());
  } catch (error) {
    logger.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Error creating menu item' });
  }
};

/**
 * Update menu item
 */
exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info(`[updateMenuItem] Request for ID ${id}, body:`, JSON.stringify(req.body));
    
    const [existing] = await db().query('SELECT * FROM menu_items WHERE id = ?', [id]);
    if (existing.length === 0) {
      logger.warn(`[updateMenuItem] Menu item ${id} not found`);
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const menuItem = new MenuItem({ ...existing[0], ...req.body });
    
    const validation = menuItem.validate(true);
    if (!validation.isValid) {
      logger.warn(`[updateMenuItem] Validation failed for item ${id}:`, validation.errors);
      return res.status(400).json({ error: validation.errors.join(', '), errors: validation.errors });
    }

    const dbData = menuItem.toDatabase();
    await db().query(
      'UPDATE menu_items SET name = ?, description = ?, price = ?, stock = ?, is_available = ? WHERE id = ?',
      [dbData.name, dbData.description, dbData.price, dbData.stock, dbData.is_available, id]
    );

    logger.info(`Menu item updated: ${menuItem.name} (ID: ${id})`);
    res.json(menuItem.toJSON());
  } catch (error) {
    logger.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Error updating menu item' });
  }
};

/**
 * Delete menu item (soft delete)
 */
exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [existing] = await db().query('SELECT * FROM menu_items WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    await db().query('UPDATE menu_items SET is_available = false WHERE id = ?', [id]);
    
    logger.info(`Menu item deactivated: ID ${id}`);
    res.json({ message: 'Menu item deactivated successfully' });
  } catch (error) {
    logger.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Error deleting menu item' });
  }
};

/**
 * Toggle menu item availability
 */
exports.toggleMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [existing] = await db().query('SELECT * FROM menu_items WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const newStatus = !existing[0].is_available;
    await db().query('UPDATE menu_items SET is_available = ? WHERE id = ?', [newStatus, id]);
    
    logger.info(`Menu item toggled: ID ${id}, new status: ${newStatus}`);
    res.json({ 
      message: `Menu item ${newStatus ? 'activated' : 'deactivated'} successfully`,
      is_available: newStatus
    });
  } catch (error) {
    logger.error('Error toggling menu item:', error);
    res.status(500).json({ error: 'Error toggling menu item availability' });
  }
};
