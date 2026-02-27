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
  createItemWithMovementSchema,
  moveItemsWithMovementSchema,
} from '../utils/inventoryMovementsModel.js';
import { ZodError } from 'zod';
import { DbClient } from '../utils/dbTypes.js';
import { ForeignKeyError } from '../utils/errors.js';
import { createItemCore } from './itemController.js';

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
 * Core logic for creating a new inventory movement in the database.
 * Validates foreign key constraints and inserts the movement.
 * Can be used inside a transaction by passing a PoolClient.
 *
 * @param data - Validated CreateInventoryInput data
 * @param db - Database client (pool or transaction client)
 * @returns The newly created inventory movement row
 * @throws {ForeignKeyError} If any foreign key reference is invalid
 */
export async function createInventoryMovementCore(
  data: CreateInventoryInput,
  db: DbClient = pool
): Promise<any> {
  const {
    inventory_action,
    item_id,
    product_id,
    from_location_id,
    to_location_id,
    quantity,
    performed_by,
    note,
  } = data;

  // Normalize from_location_id: undefined → null to avoid node-postgres invalid parameter errors
  const normalizedFromLocationId = from_location_id ?? null;
    // Normalize from_location_id: undefined → null to avoid node-postgres invalid parameter errors
    const normalizedFromLocationId = from_location_id ?? null;
    // Normalize to_location_id: null for DONATED and DISCARD actions (items leaving inventory)
    const normalizedToLocationId = to_location_id ?? null;

  // Check if item_id, product_id, from_location_id (if provided), to_location_id, performed_by_id exist in tables (in parallel)
  const checks = [
    db.query('SELECT id FROM items WHERE id = $1', [item_id]),
    db.query('SELECT id FROM products WHERE id = $1', [product_id]),
    db.query('SELECT id FROM storage_locations WHERE id = $1', [to_location_id]),
    db.query('SELECT id FROM users WHERE id = $1', [performed_by]),
  ];

  // Only check from_location_id if it's provided (it's optional for ADD actions)
  if (normalizedFromLocationId) {
    checks.push(db.query('SELECT id FROM storage_locations WHERE id = $1', [normalizedFromLocationId]));
  }

  const [itemCheck, productCheck, toLocationCheck, userCheck, fromLocationCheck] =
    await Promise.all(checks);

  if (itemCheck.rows.length === 0) {
    throw new ForeignKeyError('item_id');
  }
  if (productCheck.rows.length === 0) {
    throw new ForeignKeyError('product_id');
  }
  if (toLocationCheck.rows.length === 0) {
    throw new ForeignKeyError('to_location_id');
  }
  if (userCheck.rows.length === 0) {
    throw new ForeignKeyError('performed_by user id');
  }
  if (normalizedFromLocationId && fromLocationCheck && fromLocationCheck.rows.length === 0) {
    throw new ForeignKeyError('from_location_id');
  }

  const newInventoryAction = await db.query(
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

  return newInventoryAction.rows[0];
}

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
    const data: CreateInventoryInput = createInventoryMovementSchema.parse(req.body);
    const createdMovement = await createInventoryMovementCore(data);
    res.status(201).json(createdMovement);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    if (error instanceof ForeignKeyError) {
      return res.status(400).json({ error: error.message });
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

/**
 * Creates multiple identical items and an associated inventory movement atomically in a transaction.
 * The number of items created is derived from movement.quantity.
 * If any operation fails, none are committed.
 *
 * @param {Request} req - Express request object with nested body:
 *   - item: Object with all createItem fields (name, product_id, quantity, etc.)
 *   - movement: Object with movement fields (inventory_action, to_location_id, quantity, performed_by, etc.)
 *     Note: item_id and product_id are derived from the first created item.
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON object with { items, movement } or error message
 * @throws {400} Validation error or invalid foreign key
 * @throws {500} Internal server error
 */
export const createItemWithMovement = async (req: Request, res: Response) => {
  let parsedData;
  try {
    parsedData = createItemWithMovementSchema.parse(req.body);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { item: itemData, movement: movementData } = parsedData;

  if (movementData.quantity <= 0) {
    return res.status(400).json({ error: 'Quantity must be greater than 0' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const createdItems = await createItemCore(itemData, movementData.quantity, client);

    if (createdItems.length === 0) {
      throw new Error('No items were created');
    }

    const fullMovementData: CreateInventoryInput = {
      inventory_action: movementData.inventory_action,
      item_id: createdItems[0].id,
      product_id: createdItems[0].product_id,
      from_location_id: movementData.from_location_id,
      to_location_id: movementData.to_location_id,
      quantity: movementData.quantity,
      performed_by: movementData.performed_by,
      note: movementData.note,
    };

    const createdMovement = await createInventoryMovementCore(fullMovementData, client);

    await client.query('COMMIT');

    res.status(201).json({ items: createdItems, movement: createdMovement });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof ForeignKeyError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error creating items with movement:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * Moves existing items to a new location and creates an inventory movement record atomically.
 * All item location updates and the movement record are wrapped in a single transaction.
 *
 * @param {Request} req - Express request object with nested body:
 *   - item_ids: Array of UUIDs of items to move
 *   - movement: Object with movement fields (inventory_action, from_location_id, to_location_id, quantity, performed_by, note)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON object with { updatedCount, movement } or error message
 */
export const moveItemsWithMovement = async (req: Request, res: Response) => {
  let parsedData;
  try {
    parsedData = moveItemsWithMovementSchema.parse(req.body);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { item_ids, movement: movementData } = parsedData;
  const normalizedFromLocationId = movementData.from_location_id ?? null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update all items' location in a single query, ensuring they are currently at from_location_id
    const updateResult = await client.query(
      `UPDATE items
       SET current_location_id = $1,
           updated_at = NOW()
       WHERE id = ANY($2::uuid[])
         AND current_location_id IS NOT DISTINCT FROM $3
       RETURNING *`,
      [movementData.to_location_id, item_ids, normalizedFromLocationId]
    );

    if (updateResult.rows.length === 0) {
      throw new Error('No items found with the provided IDs and from_location_id');
    }

    if (updateResult.rowCount !== item_ids.length) {
      throw new Error('Some items were not at the expected from_location_id');
    }
    // Use the first item as the representative for the movement record
    const representativeItem = updateResult.rows[0];

    const fullMovementData: CreateInventoryInput = {
      inventory_action: movementData.inventory_action,
      item_id: representativeItem.id,
      product_id: representativeItem.product_id,
      from_location_id: normalizedFromLocationId,
      to_location_id: movementData.to_location_id,
      quantity: updateResult.rowCount,
      performed_by: movementData.performed_by,
      note: movementData.note,
    };

    const createdMovement = await createInventoryMovementCore(fullMovementData, client);

    await client.query('COMMIT');

    res.status(201).json({ updatedCount: updateResult.rowCount, movement: createdMovement });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof ForeignKeyError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error moving items with movement:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const undoInventoryMovement = async (req: Request, res: Response) => {
  let client: DbClient | null = null;
  try {
    const { id } = movementIdParamSchema.parse(req.params);

    client = await pool.connect();
    await client.query('BEGIN');

    const result = await client.query('SELECT * FROM "inventory movement" WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
      return res.status(404).json({ error: "Inventory movement not found" });
    }

    const inventoryMovement = result.rows[0];

    if (inventoryMovement.inventory_action === 'MOVE') {
      const itemsAtDestination = await client.query(
        'SELECT id FROM items WHERE product_id = $1 AND current_location_id = $2 LIMIT $3',
        [inventoryMovement.product_id, inventoryMovement.to_location_id, inventoryMovement.quantity]
      );

      if (itemsAtDestination.rows.length < inventoryMovement.quantity) {
        await client.query('ROLLBACK');
        client.release();
        client = null;
        return res.status(400).json({ error: "Cannot undo: items have been moved again or deleted" });
      }

      const itemIds = itemsAtDestination.rows.map(row => row.id);
      await client.query(
        'UPDATE items SET current_location_id = $1 WHERE id = ANY($2::int[])',
        [inventoryMovement.from_location_id, itemIds]
      );
    } else if (inventoryMovement.inventory_action === 'ADD') {
      const itemsAtDestination = await client.query(
        'SELECT id FROM items WHERE product_id = $1 AND current_location_id = $2 LIMIT $3',
        [inventoryMovement.product_id, inventoryMovement.to_location_id, inventoryMovement.quantity]
      );

      if (itemsAtDestination.rows.length < inventoryMovement.quantity) {
        await client.query('ROLLBACK');
        client.release();
        client = null;
        return res.status(400).json({ error: "Cannot undo: items have been moved or deleted" });
      }

      // Delete movement record FIRST to avoid foreign key constraint
      await client.query('DELETE FROM "inventory movement" WHERE id = $1', [id]);

      const itemIds = itemsAtDestination.rows.map(row => row.id);
      // Delete items only if not referenced by other movements
      await client.query(
        'DELETE FROM items WHERE id = ANY($1::int[]) AND NOT EXISTS (SELECT 1 FROM "inventory movement" m WHERE m.item_id = items.id)',
        [itemIds]
      );
    } else {
      // For other action types, just delete the movement record
      await client.query('DELETE FROM "inventory movement" WHERE id = $1', [id]);
    }

    // Delete movement record for MOVE (already handled for ADD above)
    if (inventoryMovement.inventory_action === 'MOVE') {
      await client.query('DELETE FROM "inventory movement" WHERE id = $1', [id]);
    }

    await client.query('COMMIT');
    client.release();
    client = null;

    res.json({ message: 'Inventory movement undone successfully' });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error rolling back transaction in undoInventoryMovement:', rollbackError);
      }
      client.release();
      client = null;
    }
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error undoing inventory movement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
