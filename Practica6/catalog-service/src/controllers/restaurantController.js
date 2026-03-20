const { getPool } = require('../config/database');
const { Restaurant } = require('../models');
const logger = require('../utils/logger');

// Helper — lazy pool access so it works after initDatabase()
const db = () => getPool();

/**
 * Get all restaurants (including inactive ones for admin)
 */
exports.getAllRestaurants = async (req, res) => {
  try {
    const [rows] = await db().query(`
      SELECT * FROM restaurants ORDER BY is_active DESC, name
    `);
    
    const restaurants = rows.map(row => Restaurant.fromDatabase(row).toJSON());
    res.json(restaurants);
  } catch (error) {
    logger.error('Error fetching restaurants:', error);
    res.status(500).json({ error: 'Error fetching restaurants' });
  }
};

/**
 * Get restaurant by ID
 */
exports.getRestaurantById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await db().query(
      'SELECT * FROM restaurants WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const restaurant = Restaurant.fromDatabase(rows[0]);
    
    // Get menu items for this restaurant
    const [menuItems] = await db().query(
      'SELECT * FROM menu_items WHERE restaurant_id = ? AND is_available = true',
      [id]
    );
    
    restaurant.menuItems = menuItems;
    
    res.json(restaurant.toJSON());
  } catch (error) {
    logger.error('Error fetching restaurant:', error);
    res.status(500).json({ error: 'Error fetching restaurant' });
  }
};

/**
 * Get restaurants by owner
 */
exports.getRestaurantsByOwner = async (req, res) => {
  try {
    const { ownerId } = req.params;
    
    const [rows] = await db().query(
      'SELECT * FROM restaurants WHERE owner_id = ?',
      [ownerId]
    );

    const restaurants = rows.map(row => Restaurant.fromDatabase(row).toJSON());
    res.json(restaurants);
  } catch (error) {
    logger.error('Error fetching restaurants by owner:', error);
    res.status(500).json({ error: 'Error fetching restaurants' });
  }
};

/**
 * Create new restaurant
 */
exports.createRestaurant = async (req, res) => {
  try {
    logger.info('Creating restaurant with data:', req.body);
    const restaurant = new Restaurant(req.body);
    
    logger.info('Restaurant object before validation:', {
      ownerId: restaurant.ownerId,
      name: restaurant.name,
      address: restaurant.address
    });
    
    const validation = restaurant.validate();
    
    logger.info('Restaurant object after validation:', {
      ownerId: restaurant.ownerId,
      name: restaurant.name,
      address: restaurant.address,
      validation: validation
    });
    
    if (!validation.isValid) {
      logger.warn('Restaurant validation failed:', validation.errors);
      return res.status(400).json({ errors: validation.errors });
    }

    const dbData = restaurant.toDatabase();
    logger.info('Inserting restaurant to database:', dbData);
    
    const [result] = await db().query(
      'INSERT INTO restaurants (owner_id, name, address, is_active) VALUES (?, ?, ?, ?)',
      [dbData.owner_id, dbData.name, dbData.address, dbData.is_active]
    );

    restaurant.id = result.insertId;
    logger.info(`Restaurant created: ${restaurant.name} (ID: ${restaurant.id})`);
    
    res.status(201).json(restaurant.toJSON());
  } catch (error) {
    logger.error('Error creating restaurant:', error);
    res.status(500).json({ error: 'Error creating restaurant' });
  }
};

/**
 * Update restaurant
 */
exports.updateRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [existing] = await db().query('SELECT * FROM restaurants WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const restaurant = new Restaurant({ ...existing[0], ...req.body });
    
    const validation = restaurant.validate(true);
    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const dbData = restaurant.toDatabase();
    await db().query(
      'UPDATE restaurants SET name = ?, address = ?, is_active = ? WHERE id = ?',
      [dbData.name, dbData.address, dbData.is_active, id]
    );

    logger.info(`Restaurant updated: ${restaurant.name} (ID: ${id})`);
    res.json(restaurant.toJSON());
  } catch (error) {
    logger.error('Error updating restaurant:', error);
    res.status(500).json({ error: 'Error updating restaurant' });
  }
};

/**
 * Delete restaurant (soft delete)
 */
exports.deleteRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [existing] = await db().query('SELECT * FROM restaurants WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    await db().query('UPDATE restaurants SET is_active = false WHERE id = ?', [id]);
    
    logger.info(`Restaurant deactivated: ID ${id}`);
    res.json({ message: 'Restaurant deactivated successfully' });
  } catch (error) {
    logger.error('Error deleting restaurant:', error);
    res.status(500).json({ error: 'Error deleting restaurant' });
  }
};

/**
 * Toggle restaurant active status
 */
exports.toggleRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [existing] = await db().query('SELECT * FROM restaurants WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const newStatus = !existing[0].is_active;
    await db().query('UPDATE restaurants SET is_active = ? WHERE id = ?', [newStatus, id]);
    
    logger.info(`Restaurant toggled: ID ${id}, new status: ${newStatus}`);
    res.json({ 
      message: `Restaurant ${newStatus ? 'activated' : 'deactivated'} successfully`,
      is_active: newStatus
    });
  } catch (error) {
    logger.error('Error toggling restaurant:', error);
    res.status(500).json({ error: 'Error toggling restaurant status' });
  }
};
