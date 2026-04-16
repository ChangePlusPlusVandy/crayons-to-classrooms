import { Request, Response } from 'express';
import pool from '../db.js';
import {
  movementIdParamSchema,
  MovementIdParamType,
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
  editMoveSchema,
  editRemoveSchema,
  createItemWithMovementSchema,
  bulkCreateItemsWithMovementSchema,
  moveItemsWithMovementSchema,
  removeItemsWithMovementSchema,
} from '../utils/inventoryMovementsModel.js';
import { ZodError } from 'zod';
import { DbClient } from '../utils/dbTypes.js';
import {
  ForeignKeyError,
  InvalidError,
  NotFoundError,
  UndoConflictError,
} from '../utils/errors.js';
import { createItemCore, syncItemInfoStock } from './itemController.js';

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
          CASE
            WHEN im.product_id IS NULL
              AND im.quantity > 1
              AND im.inventory_action IN ('MOVE', 'DONATED', 'DISCARD')
            THEN NULL
            ELSE COALESCE(ii.name, i.name, p.name)
          END AS product_name,
          from_loc.slot AS from_location_name,
          to_loc.slot AS to_location_name,
          pu.name AS user_name,
          au.email AS user_email
        FROM "inventory movement" im
        LEFT JOIN items i ON im.item_id = i.id
        LEFT JOIN item_info ii ON i.item_info = ii.id
        LEFT JOIN products p ON im.product_id = p.id
        LEFT JOIN storage_locations from_loc ON im.from_location_id = from_loc.id
        LEFT JOIN storage_locations to_loc ON im.to_location_id = to_loc.id
        LEFT JOIN public.users pu ON im.performed_by = pu.id
        LEFT JOIN auth.users au ON pu.id = au.id
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
  db: DbClient = pool,
  skipStockSync = false
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
  // Normalize to_location_id: undefined → null to avoid node-postgres invalid parameter errors
  const normalizedToLocationId = to_location_id ?? null;

  // Check if item_id, product_id (if provided), from_location_id (if provided), to_location_id (if provided) exist in tables (in parallel)
  const checks: Promise<any>[] = [db.query('SELECT id, name FROM items WHERE id = $1', [item_id])];

  if (normalizedToLocationId) {
    checks.push(
      db.query('SELECT id FROM storage_locations WHERE id = $1', [normalizedToLocationId])
    );
  }

  if (product_id) {
    checks.push(db.query('SELECT id FROM products WHERE id = $1', [product_id]));
  }

  // Only check from_location_id if it's provided (it's optional for ADD actions)
  if (normalizedFromLocationId) {
    checks.push(
      db.query('SELECT id, location_code FROM storage_locations WHERE id = $1', [
        normalizedFromLocationId,
      ])
    );
  }

  const results = await Promise.all(checks);

  let idx = 0;
  const itemCheck = results[idx++];
  const toLocationCheck = normalizedToLocationId ? results[idx++] : null;
  const productCheck = product_id ? results[idx++] : null;
  const fromLocationCheck = normalizedFromLocationId ? results[idx++] : null;

  if (itemCheck.rows.length === 0) {
    throw new ForeignKeyError('item_id');
  }
  if (productCheck && productCheck.rows.length === 0) {
    throw new ForeignKeyError('product_id');
  }
  if (normalizedFromLocationId && fromLocationCheck && fromLocationCheck.rows.length === 0) {
    throw new ForeignKeyError('from_location_id');
  }
  if (normalizedToLocationId && toLocationCheck && toLocationCheck.rows.length === 0) {
    throw new ForeignKeyError('to_location_id');
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
      product_id ?? null,
      normalizedFromLocationId,
      normalizedToLocationId,
      quantity,
      performed_by,
      note || null,
    ]
  );

  const createdMovement = newInventoryAction.rows[0];

  const REMOVE_ACTIONS = ['CHECKOUT', 'DISCARD', 'DONATED'];
  if (!skipStockSync && REMOVE_ACTIONS.includes(inventory_action)) {
    const itemName = itemCheck.rows[0].name as string;

    const fromLocationCode = fromLocationCheck?.rows[0]?.location_code ?? null;

    // Decrement stock first without updating location
    const syncResult = await syncItemInfoStock(
      itemName,
      undefined, // productId — don't update
      undefined, // category — don't update
      undefined, // quantity — don't update
      undefined, // value — don't update
      undefined, // itemLimit — don't update
      undefined, // limbo — don't update
      null, // fixture — don't update (COALESCE keeps existing)
      null, // locationCode — don't update yet
      -quantity, // decrement stock
      false, // don't create if missing
      db
    );
    if (!syncResult) {
      console.warn(
        `[createInventoryMovementCore] item_info row not found for item "${itemName}" during ${inventory_action} — stock not decremented`
      );
    } else if (syncResult.stock === 0 && fromLocationCode) {
      // Only update last_known_location_code when stock reaches 0
      await syncItemInfoStock(
        itemName,
        undefined, undefined, undefined, undefined, undefined, undefined,
        null, // fixture — don't update
        fromLocationCode, // update location to where the last item was removed from
        0, // no stock change
        false,
        db
      );
    }
  }

  return createdMovement;
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
  const client = await pool.connect();
  let began = false;
  try {
    const data: CreateInventoryInput = createInventoryMovementSchema.parse(req.body);
    await client.query('BEGIN');
    began = true;
    const createdMovement = await createInventoryMovementCore(data, client);
    await client.query('COMMIT');
    res.status(201).json(createdMovement);
  } catch (error) {
    if (began) {
      await client.query('ROLLBACK').catch(() => { });
    }
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    if (error instanceof ForeignKeyError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error creating inventory movement:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
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

    // Update fixture on item_info if provided in the request
    const fixtureValue = itemData.fixture ?? null;
    const firstCreated = createdItems[0];
    if (firstCreated.item_info) {
      await client.query(
        'UPDATE item_info SET fixture = COALESCE($2, fixture), time_last_updated = NOW() WHERE id = $1',
        [firstCreated.item_info, fixtureValue]
      );
    } else {
      await client.query(
        'UPDATE item_info SET fixture = COALESCE($2, fixture), time_last_updated = NOW() WHERE name = $1',
        [firstCreated.name, fixtureValue]
      );
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
 * Creates multiple items with their associated inventory movements atomically in a single transaction.
 * Each entry in the array is processed identically to createItemWithMovement.
 * If any entry fails, the entire batch is rolled back.
 *
 * @param {Request} req - Express request object with:
 *   - entries: Array of { item, movement } pairs
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON object with { results: [{ items, movement }] } or error message
 */
export const bulkCreateItemsWithMovement = async (req: Request, res: Response) => {
  let parsedData;
  try {
    parsedData = bulkCreateItemsWithMovementSchema.parse(req.body);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { entries } = parsedData;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const results: { items: any[]; movement: any }[] = [];

    for (const entry of entries) {
      const { item: itemData, movement: movementData } = entry;

      if (movementData.quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      const createdItems = await createItemCore(itemData, movementData.quantity, client);

      if (createdItems.length === 0) {
        throw new Error('No items were created');
      }

      // Update fixture on item_info if provided in the request
      const fixtureValue = itemData.fixture ?? null;
      const firstRow = createdItems[0];
      if (firstRow.item_info) {
        await client.query(
          'UPDATE item_info SET fixture = COALESCE($2, fixture), time_last_updated = NOW() WHERE id = $1',
          [firstRow.item_info, fixtureValue]
        );
      } else {
        await client.query(
          'UPDATE item_info SET fixture = COALESCE($2, fixture), time_last_updated = NOW() WHERE name = $1',
          [firstRow.name, fixtureValue]
        );
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

      results.push({ items: createdItems, movement: createdMovement });
    }

    await client.query('COMMIT');

    res.status(201).json({ results });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof ForeignKeyError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error bulk creating items with movements:', error);
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
       SET current_location_id = $1::uuid,
           warehouse = (SELECT warehouse_id FROM storage_locations WHERE id = $1::uuid),
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
    const uniqueProductIds = new Set(updateResult.rows.map((r) => r.product_id));

    const fullMovementData: CreateInventoryInput = {
      inventory_action: movementData.inventory_action,
      item_id: representativeItem.id,
      product_id: uniqueProductIds.size === 1 ? representativeItem.product_id : null,
      from_location_id: normalizedFromLocationId,
      to_location_id: movementData.to_location_id,
      quantity: updateResult.rowCount,
      performed_by: movementData.performed_by,
      note: movementData.note,
    };

    const createdMovement = await createInventoryMovementCore(fullMovementData, client);

    const movedItemIds = updateResult.rows.map((r: { id: string }) => r.id);
    await client.query(
      'UPDATE "inventory movement" SET item_ids = $1 WHERE id = $2',
      [movedItemIds, createdMovement.id]
    );

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

/**
 * Removes existing items (sets inactive, clears location) and creates an inventory movement record atomically.
 * All item updates, item_info stock sync, and the movement record are wrapped in a single transaction.
 *
 * @param {Request} req - Express request object with nested body:
 *   - item_ids: Array of UUIDs of items to remove
 *   - movement: Object with movement fields (inventory_action, from_location_id, quantity, performed_by, note)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON object with { updatedCount, movement } or error message
 */
export const removeItemsWithMovement = async (req: Request, res: Response) => {
  let parsedData;
  try {
    parsedData = removeItemsWithMovementSchema.parse(req.body);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { item_ids, movement: movementData } = parsedData;
  const normalizedFromLocationId = movementData.from_location_id ?? null;
  const removalStatus = movementData.inventory_action === 'DONATED' ? 'donated' : 'defective';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Deactivate all items in a single query, ensuring they are currently at from_location_id.
    // Status reflects the removal reason: 'donated' for DONATED, 'defective' for DISCARD.
    const updateResult = await client.query(
      `UPDATE items
       SET status = $3,
           current_location_id = NULL,
           warehouse = NULL,
           updated_at = NOW()
       WHERE id = ANY($1::uuid[])
         AND current_location_id IS NOT DISTINCT FROM $2
       RETURNING *`,
      [item_ids, normalizedFromLocationId, removalStatus]
    );

    if (updateResult.rows.length === 0) {
      throw new Error('No items found with the provided IDs and from_location_id');
    }

    if (updateResult.rowCount !== item_ids.length) {
      throw new Error('Some items were not at the expected location or were already inactive');
    }

    // Look up from-location code for potential last_known_location_code update
    const fromLocResult = await client.query(
      'SELECT location_code FROM storage_locations WHERE id = $1',
      [movementData.from_location_id]
    );
    const fromLocationCode = fromLocResult.rows[0]?.location_code ?? null;

    // Sync item_info stock: group by name and decrement
    const countsByName: Record<string, number> = {};
    for (const row of updateResult.rows) {
      const name = (row as { name: string }).name;
      countsByName[name] = (countsByName[name] || 0) + 1;
    }

    for (const [itemName, count] of Object.entries(countsByName)) {
      const syncResult = await syncItemInfoStock(
        itemName,
        undefined, // productId
        undefined, // category
        undefined, // quantity
        undefined, // value
        undefined, // itemLimit
        false, // limbo
        null, // fixture
        null, // locationCode — don't update yet
        -count, // stockDelta - decrement by removed count
        false, // createIfMissing
        client
      );

      // Only update last_known_location_code when stock reaches 0
      if (syncResult && syncResult.stock === 0 && fromLocationCode) {
        await syncItemInfoStock(
          itemName,
          undefined, undefined, undefined, undefined, undefined, undefined,
          null, // fixture
          fromLocationCode, // update location to where the last item was removed from
          0, // no stock change
          false,
          client
        );
      }
    }

    // Use the first item as the representative for the movement record
    const representativeItem = updateResult.rows[0];
    const uniqueProductIds = new Set(updateResult.rows.map((r) => r.product_id));

    const fullMovementData: CreateInventoryInput = {
      inventory_action: movementData.inventory_action,
      item_id: representativeItem.id,
      product_id: uniqueProductIds.size === 1 ? representativeItem.product_id : null,
      from_location_id: normalizedFromLocationId,
      to_location_id: null,
      quantity: updateResult.rowCount!,
      performed_by: movementData.performed_by,
      note: movementData.note,
    };

    // skipStockSync = true because the loop above already decremented stock per item name (correctly handles multi-type pallets)
    const createdMovement = await createInventoryMovementCore(fullMovementData, client, true);

    const removedItemIds = updateResult.rows.map((r: { id: string }) => r.id);
    await client.query(
      'UPDATE "inventory movement" SET item_ids = $1 WHERE id = $2',
      [removedItemIds, createdMovement.id]
    );

    await client.query('COMMIT');

    res.status(201).json({ updatedCount: updateResult.rowCount, movement: createdMovement });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof ForeignKeyError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error removing items with movement:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const editInventoryMovementAdd = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = movementIdParamSchema.parse(req.params);
    const { item: itemData, movement: movementData } = createItemWithMovementSchema.parse(req.body);

    await client.query('BEGIN');

    // Validation
    const original = await client.query(
      'SELECT inventory_action FROM "inventory movement" WHERE id = $1',
      [id]
    );
    if (original.rows.length === 0) {
      throw new NotFoundError('Inventory movement not found');
    }
    if (original.rows[0].inventory_action !== 'ADD') {
      throw new InvalidError('Can only edit ADD type movements with this endpoint');
    }

    await undoInventoryMovementCore({ id }, client);

    const createdItems = await createItemCore(itemData, movementData.quantity, client);

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
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    if (error instanceof ForeignKeyError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof UndoConflictError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof InvalidError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error editing ADD inventory movement:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const editInventoryMovementMove = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = movementIdParamSchema.parse(req.params);
    const moveData = editMoveSchema.parse(req.body);

    await client.query('BEGIN');

    // Validation
    const original = await client.query(
      'SELECT inventory_action FROM "inventory movement" WHERE id = $1',
      [id]
    );
    if (original.rows.length === 0) {
      throw new NotFoundError('Inventory movement not found');
    }
    if (original.rows[0].inventory_action !== 'MOVE') {
      throw new InvalidError('Can only edit MOVE type movements with this endpoint');
    }

    // Undo the original MOVE (reverses item locations, deletes movement record)
    await undoInventoryMovementCore({ id }, client);

    // Find items at the new source location matching product_id (LIFO order)
    const itemsAtSource = await client.query(
      'SELECT id FROM items WHERE product_id = $1 AND current_location_id = $2 ORDER BY created_at DESC LIMIT $3',
      [moveData.product_id, moveData.from_location_id, moveData.quantity]
    );

    if (itemsAtSource.rows.length < moveData.quantity) {
      throw new UndoConflictError(
        `Not enough items at source location: found ${itemsAtSource.rows.length}, need ${moveData.quantity}`
      );
    }

    // Move each item to the new destination
    const itemIds: string[] = itemsAtSource.rows.map((row: { id: string }) => row.id);
    await client.query(
      `UPDATE items
       SET current_location_id = $1::uuid,
           warehouse = (SELECT warehouse_id FROM storage_locations WHERE id = $1::uuid),
           updated_at = NOW()
       WHERE id = ANY($2::uuid[])`,
      [moveData.to_location_id, itemIds]
    );

    // Create new MOVE movement record
    const representativeItemId = itemIds[0];
    const fullMovementData: CreateInventoryInput = {
      inventory_action: 'MOVE',
      item_id: representativeItemId,
      product_id: moveData.product_id,
      from_location_id: moveData.from_location_id,
      to_location_id: moveData.to_location_id,
      quantity: moveData.quantity,
      performed_by: moveData.performed_by,
      note: moveData.note,
    };
    const createdMovement = await createInventoryMovementCore(fullMovementData, client);

    await client.query('COMMIT');

    res.status(201).json({ movement: createdMovement });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    if (error instanceof ForeignKeyError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof UndoConflictError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof InvalidError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error editing MOVE inventory movement:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const editInventoryMovementRemove = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = movementIdParamSchema.parse(req.params);
    const removeData = editRemoveSchema.parse(req.body);

    await client.query('BEGIN');

    // Validate original movement exists and is a remove action
    const original = await client.query('SELECT * FROM "inventory movement" WHERE id = $1', [id]);
    if (original.rows.length === 0) {
      throw new NotFoundError('Inventory movement not found');
    }
    if (!['DONATED', 'DISCARD'].includes(original.rows[0].inventory_action)) {
      throw new InvalidError('Can only edit DONATED or DISCARD type movements with this endpoint');
    }

    const originalMovement = original.rows[0];

    // Compute delta: positive = removing more, negative = removing less
    const oldQty: number = originalMovement.quantity;
    const newQty: number = removeData.quantity;
    const delta = newQty - oldQty;
    const actionChanged = originalMovement.inventory_action !== removeData.inventory_action;

    // Derive warehouse from the source location (used for both restore and remove paths)
    const locationResult = await client.query(
      `SELECT warehouse_id FROM storage_locations WHERE id = $1`,
      [removeData.from_location_id]
    );
    const warehouseId = locationResult.rows[0]?.warehouse_id ?? null;

    if (delta < 0 && !actionChanged) {
      // Removing LESS than before — restore the difference back to active
      const restoreCount = Math.abs(delta);
      const originalStatus = originalMovement.inventory_action === 'DONATED' ? 'donated' : 'defective';

      const itemsToRestore = await client.query(
        `SELECT id, name FROM items
         WHERE name = (SELECT name FROM items WHERE id = $1)
           AND status = $2
           AND updated_at <= $3
         ORDER BY updated_at DESC, id DESC
         LIMIT $4`,
        [originalMovement.item_id, originalStatus, originalMovement.performed_at, restoreCount]
      );

      if (itemsToRestore.rows.length > 0) {
        const restoreIds: string[] = itemsToRestore.rows.map((row: { id: string }) => row.id);
        await client.query(
          `UPDATE items
           SET status = 'active', current_location_id = $1, warehouse = $2, updated_at = NOW()
           WHERE id = ANY($3::uuid[])`,
          [removeData.from_location_id, warehouseId, restoreIds]
        );
        const itemName = (itemsToRestore.rows[0] as { name: string }).name;
        await syncItemInfoStock(
          itemName,
          undefined, undefined, undefined, undefined, undefined, undefined,
          null, null,
          +itemsToRestore.rows.length,
          false,
          client
        );
      }
    } else if (delta > 0 || actionChanged) {
      // Removing MORE than before — remove the additional items
      const additionalCount = delta;
      const newRemovalStatus = removeData.inventory_action === 'DONATED' ? 'donated' : 'defective';

      const itemsAtSource = await client.query(
        `SELECT id, name FROM items
         WHERE name = (SELECT name FROM items WHERE id = $1)
           AND current_location_id = $2 AND status = 'active'
         ORDER BY created_at DESC
         LIMIT $3`,
        [originalMovement.item_id, removeData.from_location_id, additionalCount]
      );

      if (itemsAtSource.rows.length < additionalCount) {
        throw new UndoConflictError(
          `Not enough items at source location: found ${itemsAtSource.rows.length}, need ${additionalCount}`
        );
      }

      const additionalRemoveIds: string[] = itemsAtSource.rows.map((row: { id: string }) => row.id);
      await client.query(
        `UPDATE items
         SET status = $1, current_location_id = NULL, warehouse = NULL, updated_at = NOW()
         WHERE id = ANY($2::uuid[])`,
        [newRemovalStatus, additionalRemoveIds]
      );
      if (additionalRemoveIds.length > 0) {
        const itemName = (itemsAtSource.rows[0] as { name: string }).name;
        await syncItemInfoStock(
          itemName,
          undefined, undefined, undefined, undefined, undefined, undefined,
          null, null,
          -additionalRemoveIds.length,
          false,
          client
        );
      }
    }
    // delta === 0: no item state changes needed

    // Update the existing movement record to reflect the new values
    await client.query(
      `UPDATE "inventory movement"
       SET inventory_action = $1,
           from_location_id = $2,
           quantity         = $3,
           performed_by     = $4,
           note             = $5
       WHERE id = $6`,
      [
        removeData.inventory_action,
        removeData.from_location_id,
        removeData.quantity,
        removeData.performed_by,
        removeData.note ?? null,
        id,
      ]
    );

    const updatedMovement = await client.query(
      `SELECT * FROM "inventory movement" WHERE id = $1`,
      [id]
    );


    await client.query('COMMIT');

    res.status(200).json({ movement: updatedMovement.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    if (error instanceof ForeignKeyError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof UndoConflictError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof InvalidError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error editing REMOVE inventory movement:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const undoInventoryMovementCore = async (
  { id }: MovementIdParamType,
  db: DbClient = pool
) => {
  const result = await db.query('SELECT * FROM "inventory movement" WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    throw new NotFoundError('Inventory movement not found');
  }

  const inventoryMovement = result.rows[0];

  if (inventoryMovement.inventory_action === 'MOVE') {
    // Validate that both from and to locations exist before undoing MOVE
    if (!inventoryMovement.from_location_id || !inventoryMovement.to_location_id) {
      throw new UndoConflictError(
        'Cannot undo: movement has null from_location_id or to_location_id'
      );
    }

    // Get items at destination with their names for item_info sync
    const itemsAtDestination = await db.query(
      'SELECT id, name FROM items WHERE product_id = $1 AND current_location_id = $2 LIMIT $3',
      [inventoryMovement.product_id, inventoryMovement.to_location_id, inventoryMovement.quantity]
    );

    if (itemsAtDestination.rows.length < inventoryMovement.quantity) {
      throw new UndoConflictError('Cannot undo because item has since been moved');
    }

    // Get from_location details for item_info update
    const fromLocationResult = await db.query(
      'SELECT location_code, fixture FROM storage_locations WHERE id = $1',
      [inventoryMovement.from_location_id]
    );
    const fromLocation = fromLocationResult.rows[0];

    const itemIds = itemsAtDestination.rows.map((row: { id: string }) => row.id);

    // Update items, verifying they're still at the expected location (prevents race conditions)
    const updateResult = await db.query(
      `UPDATE items
       SET current_location_id = $1::uuid,
           warehouse = (SELECT warehouse_id FROM storage_locations WHERE id = $1::uuid),
           updated_at = NOW()
       WHERE id = ANY($2::uuid[]) AND current_location_id = $3`,
      [inventoryMovement.from_location_id, itemIds, inventoryMovement.to_location_id]
    );

    // Verify all items were updated (all-or-nothing)
    if (updateResult.rowCount !== itemIds.length) {
      throw new UndoConflictError('Cannot undo because item has since been moved');
    }

    // Update item_info location tracking for each unique item name
    const uniqueItemNames = [
      ...new Set(itemsAtDestination.rows.map((row: { name: string }) => row.name)),
    ];
    for (const itemName of uniqueItemNames) {
      await syncItemInfoStock(
        itemName,
        undefined, // productId - don't update
        undefined, // category - don't update
        undefined, // quantity - don't update
        undefined, // value - don't update
        undefined, // itemLimit - don't update
        undefined, // limbo - don't update
        fromLocation?.fixture ?? null,
        fromLocation?.location_code ?? null,
        0, // stockDelta - no change to stock count for MOVE
        false, // createIfMissing - don't create new item_info
        db
      );
    }

    // Delete movement record for MOVE
    await db.query('DELETE FROM "inventory movement" WHERE id = $1', [id]);
  } else if (inventoryMovement.inventory_action === 'ADD') {
    // Get items at destination with their names for item_info sync
    const itemsAtDestination = await db.query(
      'SELECT id, name FROM items WHERE product_id = $1 AND current_location_id = $2 LIMIT $3',
      [inventoryMovement.product_id, inventoryMovement.to_location_id, inventoryMovement.quantity]
    );

    if (itemsAtDestination.rows.length < inventoryMovement.quantity) {
      throw new UndoConflictError('Cannot undo because item has since been moved');
    }

    const itemIds = itemsAtDestination.rows.map((row: { id: string }) => row.id);

    // Check if any items are referenced by other movements (can't be deleted)
    const referencedItems = await db.query(
      'SELECT DISTINCT item_id FROM "inventory movement" WHERE item_id = ANY($1::uuid[]) AND id != $2',
      [itemIds, id]
    );

    if (referencedItems.rows.length > 0) {
      throw new UndoConflictError('Cannot undo: some items have subsequent movements');
    }

    // Delete movement record FIRST to avoid foreign key constraint
    await db.query('DELETE FROM "inventory movement" WHERE id = $1', [id]);

    // Delete items - constrain by current_location_id to avoid deleting items that moved
    const deleteResult = await db.query(
      'DELETE FROM items WHERE id = ANY($1::uuid[]) AND current_location_id = $2 RETURNING name',
      [itemIds, inventoryMovement.to_location_id]
    );

    // Verify all items were deleted (all-or-nothing)
    if (deleteResult.rowCount !== itemIds.length) {
      throw new UndoConflictError('Cannot undo because item has since been moved');
    }

    // Decrement item_info stock for each deleted item
    const deletedCountsByName: Record<string, number> = {};
    for (const row of deleteResult.rows) {
      const name = (row as { name: string }).name;
      deletedCountsByName[name] = (deletedCountsByName[name] || 0) + 1;
    }

    for (const [itemName, deletedCount] of Object.entries(deletedCountsByName)) {
      await syncItemInfoStock(
        itemName,
        undefined, // productId - don't update
        undefined, // category - don't update
        undefined, // quantity - don't update
        undefined, // value - don't update
        undefined, // itemLimit - don't update
        undefined, // limbo - don't update
        null, // fixture - don't update
        null, // locationCode - don't update
        -deletedCount, // stockDelta - decrement by number of deleted items
        false, // createIfMissing - don't create new item_info
        db
      );
    }
  } else if (inventoryMovement.inventory_action === 'DONATED' || inventoryMovement.inventory_action === 'DISCARD') {
    // Validate that from_location_id exists (needed to restore items)
    if (!inventoryMovement.from_location_id) {
      throw new UndoConflictError('Cannot undo: movement has no from_location_id');
    }

    // Get the original item details to recreate
    const originalItemResult = await db.query(
      `SELECT name, product_id, quantity, category, item_limit, value, limbo, notes, item_info, warehouse
       FROM items WHERE id = $1`,
      [inventoryMovement.item_id]
    );

    if (originalItemResult.rows.length === 0) {
      throw new UndoConflictError('Cannot undo: original item not found');
    }

    const originalItem = originalItemResult.rows[0];

    // Get from_location details (warehouse_id)
    const fromLocationResult = await db.query(
      'SELECT warehouse_id FROM storage_locations WHERE id = $1',
      [inventoryMovement.from_location_id]
    );

    if (fromLocationResult.rows.length === 0) {
      throw new UndoConflictError('Cannot undo: original location no longer exists');
    }

    const warehouseId = fromLocationResult.rows[0].warehouse_id;

    // Use createItemCore to add items back (this also handles stock increment)
    await createItemCore(
      {
        name: originalItem.name,
        product_id: originalItem.product_id,
        current_location_id: inventoryMovement.from_location_id,
        quantity: originalItem.quantity,
        status: 'active',
        warehouse: warehouseId ?? originalItem.warehouse,
        category: originalItem.category,
        item_limit: originalItem.item_limit,
        value: originalItem.value ?? 0,
        limbo: originalItem.limbo ?? false,
        notes: originalItem.notes,
        item_info: originalItem.item_info,
        created_by: inventoryMovement.performed_by,
      },
      inventoryMovement.quantity,
      db
    );

    // Delete movement record
    await db.query('DELETE FROM "inventory movement" WHERE id = $1', [id]);
  } else {
    throw new UndoConflictError(
      'Undo operation is only supported for MOVE, ADD, DONATED, and DISCARD inventory actions'
    );
  }
};

export const undoInventoryMovement = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = movementIdParamSchema.parse(req.params);

    await client.query('BEGIN');
    await undoInventoryMovementCore({ id }, client);
    await client.query('COMMIT');

    res.json({ message: 'Inventory movement undone successfully' });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error rolling back transaction in undoInventoryMovement:', rollbackError);
    }
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof UndoConflictError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error undoing inventory movement:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * Returns a grouped item summary for a pallet movement by joining item_ids back to the items table.
 * Groups by item name + category and sums quantity.
 * Returns [] for movements that have no item_ids (pre-feature or non-pallet operations).
 *
 * GET /api/inventory-movement/:id/pallet-items
 */
export const getPalletMovementItems = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT
         i.name,
         i.category,
         SUM(i.quantity)::int AS total_quantity
       FROM "inventory movement" m
       JOIN items i ON i.id = ANY(m.item_ids)
       WHERE m.id = $1
       GROUP BY i.name, i.category
       ORDER BY i.name ASC`,
      [id]
    );
    res.json({ items: result.rows });
  } catch (error) {
    console.error('Error fetching pallet movement items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
