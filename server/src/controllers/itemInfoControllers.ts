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
 * Creates a new item in the database.
 *
 * @param {Request} req - Express request object with:
 *   - name: Item name (in body, required)
 *   - item_limit: Limit number (in body, optional)
 *   - stock: total stock of the item (in body, required)
 *   - last_known_fixture: last known fixture of the item (in body, optional)
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
      item_limit,
      stock,
      last_known_fixture,
      last_known_location_code,
      time_last_updated,
      notes,
    }: CreateItemInfoInput = createItemInfoSchema.parse(req.body);



    const newItemInfo = await pool.query(
      'INSERT INTO item_info (name, item_limit, stock, last_known_fixture, last_known_location_code, time_last_updated, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, item_limit, stock, last_known_fixture, last_known_location_code, time_last_updated, notes]
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
 * Allowed fields: name, item_limit, stock, last_known_fixture, last_known_location_code, time_last_updated, notes.
 *
 * @param {Request} req - Express request object with:
 *   - id: UUID of the item to update (in params)
 *   - Updatable fields in body (name, item_limit, stock, last_known_fixture, last_known_location_code, time_last_updated, notes)
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
