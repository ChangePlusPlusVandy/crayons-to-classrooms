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
export const getMovementById = async(req: Request, res: Response) => {
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
    console.error('Error fetching inventory movement by ID:',error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Retrieves all inventory movements associated with a specific inventory action.
 *
 * @param {Request} req - Express request object with:
 *   - action: UUID of the inventory action (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of inventory movements matching the action or error message
 * @throws {500} Internal server error if database query fails
 */
export const getMovementsByAction = async (
  req: Request,
  res: Response
) => {
  try {
    const { inventory_action } = actionQuerySchema.parse(req.params);
    const result = await pool.query(
      'SELECT * FROM "inventory movement" WHERE inventory_action = $1;',
      [inventory_action]
    );
    if (!countRows(result.rows, res)) {
      return
    }
    res.json(result.rows);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error("Error fetching inventory movements by action:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Retrieves all items associated with a specific item ID.
 *
 * @param {Request} req - Express request object with:
 *   - item_id: UUID of the item (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of items matching the item ID or error message
 * @throws {500} Internal server error if database query fails
 */
export const getMovementsByItemId = async(
  req: Request<{ item_id: string }>,
  res: Response
) =>{
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
    console.error("Error fetching inventory movements by item ID:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Retrieves all items associated with a specific product ID.
 *
 * @param {Request} req - Express request object with:
 *   - product_id: UUID of the product (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of items matching the product ID or error message
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
    console.error("Error fetching inventory movements by product ID:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Retrieves all items associated with a specific start location ID.
 *
 * @param {Request} req - Express request object with:
 *   - start_location_id: UUID of the start location (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of items matching the start location ID or error message
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
    console.error("Error fetching inventory movements by start location ID:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Retrieves all items associated with a specific start location ID.
 *
 * @param {Request} req - Express request object with:
 *   - start_location_id: UUID of the start location (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of items matching the start location ID or error message
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
    console.error("Error fetching inventory movements by end location ID:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Retrieves all items associated with a specific performer ID.
 *
 * @param {Request} req - Express request object with:
 *   - performed_by_id: UUID of the performer (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of items matching the performer ID or error message
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
    console.error("Error fetching inventory movements by performed by ID:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Retrieves all items associated with a specific date on and before.
 *
 * @param {Request} req - Express request object with:
 *   - date: date requested (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of items matching the date on or before or error message
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
    console.error("Error fetching inventory movements on or before date:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Retrieves all items associated with a specific date on and after.
 *
 * @param {Request} req - Express request object with:
 *   - date: date requested (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of items matching the date on or after or error message
 * @throws {500} Internal server error if database query fails
 */
export const getMovementsOnAndAfterDate = async (
  req: Request<{ date: string }>,
  res: Response
) => {
  try {
    const { date } = performedDateParamSchema.parse(req.params);
    const result = await pool.query('SELECT * FROM "inventory movement" WHERE performed_at >= $1::date ORDER BY performed_at ASC;', [
      date,
    ]);
    if (!countRows(result.rows, res)) {
      return;
    }
    res.json(result.rows);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error("Error fetching inventory movements on or after date:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Creates a new inventory movement in the database.
 * Validates foreign key constraints for item_id, product_id, from_location_id, to_location_id, performed_by_id.
 *
 * @param {Request} req - Express request object with:
 *   - inventory_action: Type of inventory action ie ('ADD', 'MOVE', 'CLOCKOUT', 'DISCARD', 'ADJUSTMENT') (in body)
 *   - item_id: UUID of the item (in body)
 *   - product_id: UUID of the product (in body)
 *   - from_location_id: UUID of the start location (in body)
 *   - to_location_id: UUID of the end location (in body)
 *   - quantity: Number of items (in body)
 *   - performed_by: UUID of the user performing the action (in body)
 *   - note: Optional note about the movement (in body)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON object of the newly created inventory movement or error message
 * @throws {400} Invalid foreign key if item_id, product_id, from_location_id, to_location_id, performed_by doesn't exist
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

  // Check if item_id, product_id, from_location_id, to_location_id, performed_by_id exist in tables (in parallel)
  const [itemCheck, productCheck, fromLocationCheck, toLocationCheck, userCheck] = await Promise.all([
    pool.query('SELECT id FROM items WHERE id = $1', [item_id]),
    pool.query('SELECT id FROM products WHERE id = $1', [product_id]),
    pool.query('SELECT id FROM storage_locations WHERE id = $1', [from_location_id]),
    pool.query('SELECT id FROM storage_locations WHERE id = $1', [to_location_id]),
    pool.query('SELECT id FROM users WHERE id = $1', [performed_by]),
  ]);
  if (itemCheck.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid item_id' });
  }
  if (productCheck.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid product_id' });
  }
  if (fromLocationCheck.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid from_location_id' });
  }
  if (toLocationCheck.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid to_location_id' });
  }
  if (userCheck.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid performed_by user id' });
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
        from_location_id,
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
      console.error('Error creating inventory action:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Updates an existing inventory action in the database.
 * Only updates fields that are provided in the request body.
 * Allowed fields: inventory_action, item_id, product_id, from_location_id, to_location_id, quantity, performed_by, performed_at, note.
 *
 * @param {Request} req - Express request object with:
 *   - id: UUID of the inventory action to update (in params)
 *   - Updatable fields in body (inventory_action, item_id, product_id, from_location_id, to_location_id, quantity, performed_by, performed_at, note)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON object of the updated inventory action or error message
 * @throws {400} Invalid id, item_id, product_id, from_location_id, to_location_id, performed_by (must be valid UUIDs)
 * @throws {400} Invalid product_id if product doesn't exist in database
 * @throws {400} Invalid item_id if item doesn't exist in database
 * @throws {400} Invalid from_location_id if location doesn't exist in database
 * @throws {400} Invalid to_location_id if location doesn't exist in database
 * @throws {400} Invalid performed_by if user doesn't exist in database
 * @throws {400} No updatable fields provided if request body is empty or contains no allowed fields
 * @throws {404} Inventory action not found if no inventory action matches the provided ID
 * @throws {500} Internal server error if database query fails
 */
export const updateInventoryMovement = async (req: Request, res: Response) => {
  try{
    const { id } = movementIdParamSchema.parse(req.params);
    const validatedData: UpdateInventoryInput = updateInventoryMovementSchema.parse(req.body);

    const allowedFields = [
      'inventory_action',
      'item_id',
      'product_id',
      'from_location_id',
      'to_location_id',
      'quantity',
      'performed_by',
      'performed_at',
      'note',
    ];

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;
    for (const [key, value] of Object.entries(validatedData)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${idx++}`);
        values.push(value);
      }
    }
    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' });
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
      console.error('Error updating inventory action:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
}

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
export const deleteInventoryMovement = async (req: Request, res: Response) =>{
  try {
    const { id } = movementIdParamSchema.parse(req.params);

    const result = await pool.query('DELETE FROM "inventory movement" WHERE id = $1 RETURNING *;', [id,]);
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
}
