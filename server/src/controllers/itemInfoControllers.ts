import { Request, Response } from 'express';
import pool from '../db.js';
import {
  createItemInfoSchema,
  updateItemInfoSchema,
  nameParamSchema,
  itemInfoIdParamSchema,
  CreateItemInfoInput,
  UpdateItemInfoInput,
} from '../utils/itemsInfoModel.js';
import { ZodError } from 'zod';

/**
 * Checks if the query returned any rows.
 * @param rows - The rows returned from the database query.
 * @param res - The Express response object.
 * @returns True if rows exist, otherwise sends a 404 response and returns false.
 */
const countRows = (rows: any[], res: Response) => {
  if (rows.length === 0) {
    res.status(404).json({ error: 'No entries found' });
    return false;
  }
  return true;
};

/**
 * Handles Zod validation errors and sends appropriate error response
 * @param error - The error object
 * @param res - The Express response object
 */
const handleValidationError = (error: unknown, res: Response) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
  }
  console.error('Unexpected error:', error);
  return res.status(500).json({ error: 'Internal server error' });
};

/**
 * Retrieves all items from the database.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of all items or error message
 * @throws {500} Internal server error if database query fails
 */
export const getItemsInfo = async (req: Request, res: Response) => {
  try {
    const items = await pool.query('SELECT * FROM item_info');

    if (!countRows(items.rows, res)) {
      return;
    }

    res.json(items.rows);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Retrieves a single item by its unique ID.
 *
 * @param {Request} req - Express request object with:
 *   - id: UUID of the item (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON object of the requested item or error message
 * @throws {404} Item not found if no item matches the provided ID
 * @throws {500} Internal server error if database query fails
 */
export const getItemInfoById = async (req: Request, res: Response) => {
  try {
    const { id } = itemInfoIdParamSchema.parse(req.params);

    const item = await pool.query('SELECT * FROM item_info WHERE id = $1', [id]);

    if (!countRows(item.rows, res)) {
      return;
    }

    res.json(item.rows[0]);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error fetching item by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Retrieves item info with a specific name.
 *
 * @param {Request} req - Express request object with:
 *   - name: Name of the items to filter by (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of items with the specified name or error message
 * @throws {500} Internal server error if database query fails
 */
export const getItemsInfoByName = async (req: Request, res: Response) => {
  try {
    const { name } = nameParamSchema.parse(req.params);
    const items = await pool.query('SELECT * FROM item_info WHERE name = $1', [name]);
    if (!countRows(items.rows, res)) {
      return;
    }
    res.json(items.rows);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error fetching items by name:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
/**
 * Retrieves items that are in limbo.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of items in limbo or error message
 * @throws {500} Internal server error if database query fails
 */
export const getLimboItems = async (req: Request, res: Response) => {
  try {
    const items = await pool.query('SELECT * FROM item_info WHERE limbo = TRUE AND stock = 0');
    if (!countRows(items.rows, res)) {
      return;
    }
    res.json(items.rows);
  } catch (error) {
    console.error('Error fetching limbo items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Creates a new item in the database.
 *
 * @param {Request} req - Express request object with:
 *   - name: Item name (in body, required)
 *   - product_id: UUID of the product (in body, optional)
 *   - category: Category string (in body, optional)
 *   - quantity: Quantity number (in body, optional)
 *   - value: Value number (in body, optional)
 *   - item_limit: Limit number (in body, optional)
 *   - limbo: Limbo boolean, defaults to false (in body, optional)
 *   - stock: total stock of the item (in body, required)
 *   - fixture: fixture of the item (in body, optional)
 *   - last_known_location_code: last known location code of the item (in body, required)
 *   - time_last_updated: time last updated of the item (in body, required)
 *   - notes: Notes string (in body, optional)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON object of the newly created item or error message
 * @throws {500} Internal server error if validation or creation fails
 */
export const createItemInfo = async (req: Request, res: Response) => {
  try {
    const {
      name,
      product_id,
      category,
      quantity,
      value,
      item_limit,
      stock,
      limbo,
      fixture,
      last_known_location_code,
      time_last_updated,
      notes,
    }: CreateItemInfoInput = createItemInfoSchema.parse(req.body);
    if (product_id) {
      const productCheck = await pool.query('SELECT id FROM products WHERE id = $1', [product_id]);
      if (productCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid product_id' });
      }
    }

    const newItemInfo = await pool.query(
      'INSERT INTO item_info (name, product_id, category, quantity, value, item_limit, limbo, stock, fixture, last_known_location_code, time_last_updated, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
      [
        name,
        product_id,
        category,
        quantity,
        value,
        item_limit,
        limbo,
        stock,
        fixture,
        last_known_location_code,
        time_last_updated,
        notes,
      ]
    );

    res.status(201).json(newItemInfo.rows[0]);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Updates an existing item in the database.
 * Only updates fields that are provided in the request body.
 * Allowed fields: name, product_id, category, quantity, value, item_limit, stock, fixture, last_known_location_code, time_last_updated, notes.
 *
 * @param {Request} req - Express request object with:
 *   - id: UUID of the item to update (in params)
 *   - Updatable fields in body (name, product_id, category, quantity, value, item_limit, stock, fixture, last_known_location_code, time_last_updated, notes)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON object of the updated item or error message
 * @throws {400} No updatable fields provided if request body is empty or contains no allowed fields
 * @throws {404} Item not found if no item matches the provided ID
 * @throws {500} Internal server error if database query fails
 */
export const updateItemInfo = async (req: Request, res: Response) => {
  try {
    const { id } = itemInfoIdParamSchema.parse(req.params);
    const validatedData: UpdateItemInfoInput = updateItemInfoSchema.parse(req.body);

    if (validatedData.product_id) {
      const productCheck = await pool.query('SELECT id FROM products WHERE id = $1', [
        validatedData.product_id,
      ]);
      if (productCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid product_id' });
      }
    }

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(validatedData)) {
      setClauses.push(`${key} = $${idx++}`);
      values.push(value);
    }

    setClauses.push(`updated_at = NOW()`);

    const sql = `
      UPDATE item_info
      SET ${setClauses.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    values.push(id);

    const { rows } = await pool.query(sql, values);

    if (!countRows(rows, res)) {
      return;
    }

    return res.json(rows[0]);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error updating item:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Deletes an item from the database by its ID.
 *
 * @param {Request} req - Express request object with:
 *   - id: UUID of the item to delete (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Success message or error message
 * @throws {404} Item not found if no item matches the provided ID
 * @throws {500} Internal server error if database query fails
 */
export const deleteItemInfo = async (req: Request, res: Response) => {
  try {
    const { id } = itemInfoIdParamSchema.parse(req.params);

    // Get the item's name before deleting so we can update stock
    const itemToDelete = await pool.query('SELECT name FROM item_info WHERE id = $1', [id]);

    if (itemToDelete.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const deletedItem = await pool.query('DELETE FROM item_info WHERE id = $1 RETURNING *', [id]);

    if (!countRows(deletedItem.rows, res)) {
      return;
    }

    return res.json({ message: 'Item info deleted successfully' });
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getInventoryStats = async (req: Request, res: Response) => {
  try {
    const [skuResult, slotResult] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total_skus,
          COALESCE(SUM(CASE WHEN stock > 0 THEN 1 ELSE 0 END), 0) AS stocked_skus
        FROM item_info
      `),
      pool.query(`
        SELECT
          COUNT(DISTINCT sl.id) AS total_slots,
          COUNT(DISTINCT sl.id) FILTER (WHERE i.id IS NOT NULL) AS occupied_slots
        FROM storage_locations sl
        LEFT JOIN items i ON sl.id = i.current_location_id
        WHERE sl.active = true
      `),
    ]);

    res.json({
      total_skus: Number(skuResult.rows[0].total_skus),
      stocked_skus: Number(skuResult.rows[0].stocked_skus),
      total_slots: Number(slotResult.rows[0].total_slots),
      occupied_slots: Number(slotResult.rows[0].occupied_slots),
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
