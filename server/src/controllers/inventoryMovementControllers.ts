import { Request, Response } from 'express';
import pool from '../db.js';
import {
  movementIdParamSchema,
  createInventoryMovementSchema,
  updateInventoryMovementSchema,
  itemIdParamSchema,
  productIdParamSchema,
  startLocationIdParamSchema,
  endLocationIdParamSchema,
  performedByIdParamSchema,
  performedDateParamSchema,
  CreateInventoryInput,
  UpdateInventoryInput,
  actionQuerySchema,
} from '../utils/inventoryMovementsModel.js';
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

// Controller functions for inventory movements

// GET all rows
export async function getAllInventoryMovements(req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query('SELECT * FROM "inventory movement"');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// GET all rows with JOINed details and server-side pagination
export async function getAllMovementsDetailed(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset = (page - 1) * limit;

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT
          im.id,
          im.item_id,
          im.product_id,
          im.from_location_id,
          im.to_location_id,
          im.quantity,
          im.performed_by,
          im.note,
          im.performed_at,
          im.inventory_action,
          p.name AS product_name,
          from_loc.location_code AS from_location_name,
          to_loc.location_code AS to_location_name,
          u.name AS user_name
        FROM "inventory movement" im
        LEFT JOIN products p ON im.product_id = p.id
        LEFT JOIN storage_locations from_loc ON im.from_location_id = from_loc.id
        LEFT JOIN storage_locations to_loc ON im.to_location_id = to_loc.id
        LEFT JOIN users u ON im.performed_by = u.id
        ORDER BY im.performed_at DESC NULLS LAST
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*) FROM "inventory movement"'),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    res.json({
      data: dataResult.rows,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Retrieves a single inventory movement by its unique ID.
 *
 * @param {Request} req - Express request object with:
 *   - id: UUID of the inventory movement (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON object of the requested inventory movement or error message
 * @throws {404} Inventory movement not found if no inventory movement matches the provided ID
 * @throws {500} Internal server error if database query fails
 */
// GET single row by id
export const getMovementById = async (req: Request, res: Response) => {
  try {
    const { id } = movementIdParamSchema.parse(req.params);

    const result = await pool.query('SELECT * FROM "inventory movement" WHERE id = $1;', [id]);

    if (!countRows(result.rows, res)) {
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error fetching inventory movement by ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Retrieves all inventory movements associated with a specific inventory action.
 *
 * @param {Request} req - Express request object with:
 *   - inventory_action: Type/value of the inventory action (in params). One of: 'ADD', 'MOVE', 'CHECKOUT', 'DISCARD', 'ADJUSTMENT'
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of inventory movements matching the action or error message
 * @throws {500} Internal server error if database query fails
 */
export const getMovementsByAction = async (req: Request, res: Response) => {
  try {
    const { inventory_action } = actionQuerySchema.parse(req.params);
    const result = await pool.query(
      'SELECT * FROM "inventory movement" WHERE inventory_action = $1;',
      [inventory_action]
    );
    if (!countRows(result.rows, res)) {
      return;
    }
    res.json(result.rows);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error fetching inventory movements by action:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Retrieves all inventory movements associated with a specific item ID.
 *
 * @param {Request} req - Express request object with:
 *   - item_id: UUID of the item (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of inventory movements matching the item ID or error message
 * @throws {500} Internal server error if database query fails
 */
export const getMovementsByItemId = async (req: Request<{ item_id: string }>, res: Response) => {
  try {
    const { item_id } = itemIdParamSchema.parse(req.params);
    const result = await pool.query('SELECT * FROM "inventory movement" WHERE item_id = $1;', [
      item_id,
    ]);
    if (!countRows(result.rows, res)) {
      return;
    }
    res.json(result.rows);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error fetching inventory movements by item ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Retrieves all inventory movements associated with a specific product ID.
 *
 * @param {Request} req - Express request object with:
 *   - product_id: UUID of the product (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of inventory movements matching the product ID or error message
 * @throws {500} Internal server error if database query fails
 */
export const getMovementsByProductId = async (
  req: Request<{ product_id: string }>,
  res: Response
) => {
  try {
    const { product_id } = productIdParamSchema.parse(req.params);
    const result = await pool.query('SELECT * FROM "inventory movement" WHERE product_id = $1;', [
      product_id,
    ]);
    if (!countRows(result.rows, res)) {
      return;
    }
    res.json(result.rows);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error fetching inventory movements by product ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Retrieves all inventory movements associated with a specific start location ID.
 *
 * @param {Request} req - Express request object with:
 *   - start_location_id: UUID of the start location (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of inventory movements matching the start location ID or error message
 * @throws {500} Internal server error if database query fails
 */
export const getMovementsByStartLocationId = async (
  req: Request<{ start_location_id: string }>,
  res: Response
) => {
  try {
    const { start_location_id } = startLocationIdParamSchema.parse(req.params);
    const result = await pool.query(
      'SELECT * FROM "inventory movement" WHERE from_location_id = $1;',
      [start_location_id]
    );
    if (!countRows(result.rows, res)) {
      return;
    }
    res.json(result.rows);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error fetching inventory movements by start location ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Retrieves all inventory movements associated with a specific end location ID.
 *
 * @param {Request} req - Express request object with:
 *   - end_location_id: UUID of the end location (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of inventory movements matching the end location ID or error message
 * @throws {500} Internal server error if database query fails
 */
export const getMovementsByEndLocationId = async (
  req: Request<{ end_location_id: string }>,
  res: Response
) => {
  try {
    const { end_location_id } = endLocationIdParamSchema.parse(req.params);
    const result = await pool.query(
      'SELECT * FROM "inventory movement" WHERE to_location_id = $1;',
      [end_location_id]
    );
    if (!countRows(result.rows, res)) {
      return;
    }
    res.json(result.rows);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error fetching inventory movements by end location ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Retrieves all inventory movements associated with a specific performer ID.
 *
 * @param {Request} req - Express request object with:
 *   - performed_by_id: UUID of the performer (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of inventory movements matching the performer ID or error message
 * @throws {500} Internal server error if database query fails
 */
export const getMovementsByPerformedId = async (
  req: Request<{ performed_by_id: string }>,
  res: Response
) => {
  try {
    const { performed_by_id } = performedByIdParamSchema.parse(req.params);
    const result = await pool.query('SELECT * FROM "inventory movement" WHERE performed_by = $1', [
      performed_by_id,
    ]);
    if (!countRows(result.rows, res)) {
      return;
    }
    res.json(result.rows);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error fetching inventory movements by performed by ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Retrieves all inventory movements associated with a specific date on and before.
 *
 * @param {Request} req - Express request object with:
 *   - date: date requested (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of inventory movements matching the date on or before, or error message
 * @throws {500} Internal server error if database query fails
 */
export const getMovementsOnAndBeforeDate = async (
  req: Request<{ date: string }>,
  res: Response
) => {
  try {
    const { date } = performedDateParamSchema.parse(req.params);
    const result = await pool.query(
      'SELECT * FROM "inventory movement" WHERE performed_at <= $1::date ORDER BY performed_at DESC;',
      [date]
    );
    if (!countRows(result.rows, res)) {
      return;
    }
    res.json(result.rows);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error fetching inventory movements on or before date:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Retrieves all inventory movements associated with a specific date on and after.
 *
 * @param {Request} req - Express request object with:
 *   - date: date requested (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of inventory movements matching the date on or after, or error message
 * @throws {500} Internal server error if database query fails
 */
export const getMovementsOnAndAfterDate = async (req: Request<{ date: string }>, res: Response) => {
  try {
    const { date } = performedDateParamSchema.parse(req.params);
    const result = await pool.query(
      'SELECT * FROM "inventory movement" WHERE performed_at >= $1::date ORDER BY performed_at ASC;',
      [date]
    );
    if (!countRows(result.rows, res)) {
      return;
    }
    res.json(result.rows);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error fetching inventory movements on or after date:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Creates a new inventory movement in the database.
 * Validates foreign key constraints for item_id, product_id, to_location_id, performed_by_id,
 * and from_location_id when provided.
 *
 * @param {Request} req - Express request object with:
 *   - inventory_action: Type of inventory action ie ('ADD', 'MOVE', 'CHECKOUT', 'DISCARD', 'ADJUSTMENT') (in body)
 *   - item_id: UUID of the item (in body)
 *   - product_id: UUID of the product (in body)
 *   - from_location_id: Optional UUID of the start location, may be null for ADD actions (in body)
 *   - to_location_id: UUID of the end location (in body)
 *   - quantity: Number of items (in body)
 *   - performed_by: UUID of the user performing the action (in body)
 *   - note: Optional note about the movement (in body)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON object of the newly created inventory movement or error message
 * @throws {400} Invalid foreign key if item_id, product_id, to_location_id, performed_by doesn't exist
 * @throws {400} Invalid from_location_id if provided and doesn't exist
 * @throws {500} Internal server error if validation or creation fails
 */
export const createInventoryMovement = async (req: Request, res: Response) => {
  try {
    const {
      inventory_action,
      item_id,
      product_id,
      from_location_id,
      to_location_id,
      quantity,
      performed_by,
      note,
    }: CreateInventoryInput = createInventoryMovementSchema.parse(req.body);

    // Normalize from_location_id: undefined → null to avoid node-postgres invalid parameter errors
    const normalizedFromLocationId = from_location_id ?? null;

    // Check if item_id, product_id, from_location_id (if provided), to_location_id, performed_by_id exist in tables (in parallel)
    const checks = [
      pool.query('SELECT id FROM items WHERE id = $1', [item_id]),
      pool.query('SELECT id FROM products WHERE id = $1', [product_id]),
      pool.query('SELECT id FROM storage_locations WHERE id = $1', [to_location_id]),
      pool.query('SELECT id FROM users WHERE id = $1', [performed_by]),
    ];

    // Only check from_location_id if it's provided (it's optional for ADD actions)
    if (normalizedFromLocationId) {
      checks.push(
        pool.query('SELECT id FROM storage_locations WHERE id = $1', [normalizedFromLocationId])
      );
    }

    const [itemCheck, productCheck, toLocationCheck, userCheck, fromLocationCheck] =
      await Promise.all(checks);

    if (itemCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid item_id' });
    }
    if (productCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid product_id' });
    }
    if (toLocationCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid to_location_id' });
    }
    if (userCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid performed_by user id' });
    }
    if (normalizedFromLocationId && fromLocationCheck && fromLocationCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid from_location_id' });
    }
    const newInventoryAction = await pool.query(
      `
      INSERT INTO "inventory movement" (
      inventory_action, 
      item_id, 
      product_id, 
      from_location_id, 
      to_location_id, 
      quantity, 
      performed_by, 
      note
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *;
      `,
      [
        inventory_action,
        item_id,
        product_id,
        normalizedFromLocationId,
        to_location_id,
        quantity,
        performed_by,
        note || null,
      ]
    );

    res.status(201).json(newInventoryAction.rows[0]);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error creating inventory movement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Updates an existing inventory movement in the database.
 * Only updates fields that are provided in the request body.
 * Allowed fields: inventory_action, item_id, product_id, from_location_id, to_location_id, quantity, performed_by, performed_at, note.
 *
 * @param {Request} req - Express request object with:
 *   - id: UUID of the inventory movement to update (in params)
 *   - Updatable fields in body (inventory_action, item_id, product_id, from_location_id, to_location_id, quantity, performed_by, performed_at, note)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON object of the updated inventory movement or error message
 * @throws {400} Invalid id, item_id, product_id, from_location_id, to_location_id, performed_by (must be valid UUIDs)
 * @throws {400} Invalid product_id if product doesn't exist in database
 * @throws {400} Invalid item_id if item doesn't exist in database
 * @throws {400} Invalid from_location_id if location doesn't exist in database
 * @throws {400} Invalid to_location_id if location doesn't exist in database
 * @throws {400} Invalid performed_by if user doesn't exist in database
 * @throws {400} No updatable fields provided if request body is empty or contains no allowed fields
 * @throws {404} Inventory movement not found if no inventory movement matches the provided ID
 * @throws {500} Internal server error if database query fails
 */
export const updateInventoryMovement = async (req: Request, res: Response) => {
  try {
    const { id } = movementIdParamSchema.parse(req.params);
    const validatedData: UpdateInventoryInput = updateInventoryMovementSchema.parse(req.body);

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;
    for (const [key, value] of Object.entries(validatedData)) {
      setClauses.push(`${key} = $${idx++}`);
      values.push(value);
    }
    const sql = `
      UPDATE "inventory movement"
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
    console.error('Error updating inventory movement:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Deletes a inventory movement from the database by its ID.
 *
 * @param {Request} req - Express request object with:
 *   - id: UUID of the inventory movement to delete (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Success message or error message
 * @throws {404} Inventory movement not found if no product matches the provided ID
 * @throws {500} Internal server error if database query fails
 */
export const deleteInventoryMovement = async (req: Request, res: Response) => {
  try {
    const { id } = movementIdParamSchema.parse(req.params);

    const result = await pool.query('DELETE FROM "inventory movement" WHERE id = $1 RETURNING *;', [
      id,
    ]);
    if (!countRows(result.rows, res)) {
      return;
    }
    res.json({ message: 'Inventory movement deleted successfully', deleted: result.rows[0] });
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error deleting inventory movement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const undoInventoryMovement = async (req: Request, res: Response) => {
  try {
    const { id } = movementIdParamSchema.parse(req.params);
    const result = await pool.query('SELECT * FROM "inventory movement" WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error : "Inventory movement not found" });
    }

    const inventoryMovement = result.rows[0];

    if (inventoryMovement.inventory_action === 'MOVE') {
      const itemsAtDestination = await pool.query('SELECT id FROM items WHERE product_id = $1 AND current_location_id = $2 LIMIT $3',
        [inventoryMovement.product_id, inventoryMovement.to_location_id, inventoryMovement.quantity]
      );

      if (itemsAtDestination.rows.length < inventoryMovement.quantity) {
        return res.status(400).json({ error : "Cannot undo: items have been moved again or deleted" });
      }

      const itemIds = itemsAtDestination.rows.map(row => row.id);
      for (const itemId of itemIds) {
        await pool.query('UPDATE items SET current_location_id = $1 WHERE id = $2', 
          [inventoryMovement.from_location_id, itemId]);
      }
    } else if (inventoryMovement.inventory_action === 'ADD') {
      const itemsAtDestination = await pool.query('SELECT id FROM items WHERE product_id = $1 AND current_location_id = $2 LIMIT $3',
        [inventoryMovement.product_id, inventoryMovement.to_location_id, inventoryMovement.quantity]
      );

      if (itemsAtDestination.rows.length < inventoryMovement.quantity) {
        return res.status(400).json({ error : "Cannot undo: items have been moved or deleted" });
      }

      // Delete movement record FIRST to avoid foreign key constraint
      await pool.query('DELETE FROM "inventory movement" WHERE id = $1', [id]);

      const itemIds = itemsAtDestination.rows.map(row => row.id);
      for (const itemId of itemIds) {
        // Delete item only if not referenced by other movements
        await pool.query('DELETE FROM items WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM "inventory movement" WHERE item_id = $1)', [itemId]);
      }
    } else {
      // For other action types, just delete the movement record
      await pool.query('DELETE FROM "inventory movement" WHERE id = $1', [id]);
    }

    // Delete movement record for MOVE (already handled for ADD above)
    if (inventoryMovement.inventory_action === 'MOVE') {
      await pool.query('DELETE FROM "inventory movement" WHERE id = $1', [id]);
    }
    res.json({ message : 'Inventory movement undone successfully' });
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error undoing inventory movement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}