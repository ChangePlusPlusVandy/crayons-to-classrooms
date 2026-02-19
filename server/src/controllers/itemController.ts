import { Request, Response } from 'express';
import pool from '../db.js';
import {
  createItemSchema,
  createItemsBulkSchema,
  updateItemSchema,
  statusQuerySchema,
  nameParamSchema,
  itemIdParamSchema,
  productIdParamSchema,
  locationIdParamSchema,
  warehouseIdParamSchema,
  itemInfoIdParamSchema,
  CreateItemInput,
  CreateItemsBulkInput,
  UpdateItemInput,
} from '../utils/itemsModel.js';
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

type DbClient = {
  query: (text: string, params?: any[]) => Promise<any>;
};

const getLocationInfo = async (locationId?: string | null, db: DbClient = pool) => {
  if (!locationId) {
    return { locationCode: null };
  }

  const locationResult = await db.query(
    'SELECT location_code FROM storage_locations WHERE id = $1',
    [locationId]
  );

  if (locationResult.rows.length === 0) {
    return { locationCode: null };
  }

  return {
    locationCode: locationResult.rows[0].location_code ?? null,
  };
};

const syncItemInfoStock = async (
  itemName: string,
  productId: string | undefined,
  category: string | undefined,
  quantity: number | undefined,
  value: number | undefined,
  itemLimit: number | undefined,
  fixture: string | null | undefined,
  lastKnownLocationCode: string | null | undefined,
  stockDelta: number,
  createIfMissing: boolean,
  db: DbClient = pool
) => {
  try {
    if (!createIfMissing) {
      const updateResult = await db.query(
        'UPDATE item_info SET stock = stock + $1, limbo = (stock + $1) = 0, fixture = COALESCE($2, fixture), last_known_location_code = COALESCE($3, last_known_location_code), time_last_updated = NOW() WHERE name = $4 RETURNING id',
        [stockDelta, fixture ?? null, lastKnownLocationCode ?? null, itemName]
      );
      return updateResult.rows[0]?.id ?? null;
    }

    const upsertResult = await db.query(
      `INSERT INTO item_info (name, product_id, category, quantity, value, item_limit, stock, fixture, last_known_location_code, time_last_updated, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)
       ON CONFLICT (name) DO UPDATE
       SET stock = item_info.stock + EXCLUDED.stock,
           limbo = (item_info.stock + EXCLUDED.stock) = 0,
           product_id = COALESCE(EXCLUDED.product_id, item_info.product_id),
           category = COALESCE(EXCLUDED.category, item_info.category),
           quantity = COALESCE(EXCLUDED.quantity, item_info.quantity),
           value = COALESCE(EXCLUDED.value, item_info.value),
           item_limit = COALESCE(EXCLUDED.item_limit, item_info.item_limit),
           fixture = COALESCE(EXCLUDED.fixture, item_info.fixture),
           last_known_location_code = COALESCE(EXCLUDED.last_known_location_code, item_info.last_known_location_code),
           time_last_updated = NOW()
       RETURNING id`,
      [
        itemName,
        productId ?? null,
        category ?? null,
        quantity ?? null,
        value ?? null,
        itemLimit ?? null,
        stockDelta,
        fixture ?? null,
        lastKnownLocationCode ?? null,
        null,
      ]
    );
    return upsertResult.rows[0]?.id ?? null;
  } catch (error) {
    console.error('Error syncing item info stock:', {
      itemName,
      productId,
      category,
      quantity,
      value,
      stockDelta,
      itemLimit,
      fixture,
      lastKnownLocationCode,
      createIfMissing,
      error,
    });
    throw error;
  }
};

/**
 * Retrieves all items from the database.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of all items or error message
 * @throws {500} Internal server error if database query fails
 */
export const getItems = async (req: Request, res: Response) => {
  try {
    const items = await pool.query('SELECT * FROM items');

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
export const getItemById = async (req: Request, res: Response) => {
  try {
    const { id } = itemIdParamSchema.parse(req.params);

    const item = await pool.query('SELECT * FROM items WHERE id = $1', [id]);

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
 * Retrieves all items associated with a specific product ID.
 *
 * @param {Request} req - Express request object with:
 *   - productId: UUID of the product (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of items matching the product ID or error message
 * @throws {500} Internal server error if database query fails
 */
export const getItemsByProductId = async (req: Request, res: Response) => {
  try {
    const { productId } = productIdParamSchema.parse(req.params);

    const items = await pool.query('SELECT * FROM items WHERE product_id = $1', [productId]);

    if (!countRows(items.rows, res)) {
      return;
    }

    res.json(items.rows);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }

    console.error('Error fetching items by product ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Retrieves all items with a specific name.
 *
 * @param {Request} req - Express request object with:
 *   - name: Name of the items to filter by (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of items with the specified name or error message
 * @throws {500} Internal server error if database query fails
 */
export const getItemsByName = async (req: Request, res: Response) => {
  try {
    const { name } = nameParamSchema.parse(req.params);
    const items = await pool.query('SELECT * FROM items WHERE name = $1', [name]);
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
 * Retrieves all items currently at a specific location.
 *
 * @param {Request} req - Express request object with:
 *   - locationId: UUID of the location (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of items at the specified location or error message
 * @throws {500} Internal server error if database query fails
 */
export const getItemsByLocationId = async (req: Request, res: Response) => {
  try {
    const { locationId } = locationIdParamSchema.parse(req.params);
    const items = await pool.query('SELECT * FROM items WHERE current_location_id = $1', [
      locationId,
    ]);

    if (!countRows(items.rows, res)) {
      return;
    }

    res.json(items.rows);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }

    console.error('Error fetching items by location ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Retrieves all items associated with a specific warehouse ID.
 *
 * @param {Request} req - Express request object with:
 *   - warehouseId: UUID of the warehouse (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of items matching the warehouse ID or error message
 * @throws {500} Internal server error if database query fails
 */
export const getItemsByWarehouseId = async (req: Request, res: Response) => {
  try {
    const { warehouseId } = warehouseIdParamSchema.parse(req.params);
    const items = await pool.query('SELECT * FROM items WHERE warehouse = $1', [warehouseId]);
    if (!countRows(items.rows, res)) {
      return;
    }
    res.json(items.rows);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error fetching items by warehouse ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Retrieves all items associated with a specific item_info ID.
 *
 * @param {Request} req - Express request object with:
 *   - itemInfoId: UUID of the item_info (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of items matching the item_info ID or error message
 * @throws {500} Internal server error if database query fails
 */
export const getItemsByItemInfoId = async (req: Request, res: Response) => {
  try {
    const { itemInfoId } = itemInfoIdParamSchema.parse(req.params);
    const items = await pool.query('SELECT * FROM items WHERE item_info = $1', [itemInfoId]);
    if (!countRows(items.rows, res)) {
      return;
    }
    res.json(items.rows);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error fetching items by item_info ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
/**
 * Retrieves all items with a specific status.
 *
 * @param {Request} req - Express request object with:
 *   - status: Status of the items to filter by (in query)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of items with the specified status or error message
 * @throws {500} Internal server error if database query fails
 */
export const getItemsByStatus = async (req: Request, res: Response) => {
  try {
    const { status } = statusQuerySchema.parse(req.query);

    const items = await pool.query('SELECT * FROM items WHERE status = $1', [status]);

    if (!countRows(items.rows, res)) {
      return;
    }

    res.json(items.rows);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error fetching items by status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Creates a new item in the database.
 * Validates foreign key constraints for product_id, current_location_id (if provided), created_by, and warehouse.
 *
 * @param {Request} req - Express request object with:
 *   - name: Item name (in body, required)
 *   - product_id: UUID of the product (in body)
 *   - quantity: Number of items (in body)
 *   - current_location_id: UUID of the current location (in body, optional)
 *   - fixture: Fixture string (in body, optional)
 *   - status: Current status of the item ie ('active', 'inactive', 'discontinued', 'checked out') (in body)
 *   - created_by: UUID of the user creating the item (in body)
 *   - warehouse: UUID of the warehouse (in body, required)
 *   - category: Category string (in body, optional)
 *   - item_limit: Limit number (in body, optional)
 *   - value: Value number (in body, required)
 *   - limbo: Limbo boolean, defaults to false (in body, optional)
 *   - notes: Notes string (in body, optional)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON object of the newly created item or error message
 * @throws {400} Invalid foreign key if product_id, current_location_id (if provided), created_by, or warehouse doesn't exist
 * @throws {500} Internal server error if validation or creation fails
 */
export const createItem = async (req: Request, res: Response) => {
  try {
    const {
      name,
      product_id,
      current_location_id,
      fixture,
      created_by,
      quantity,
      stock,
      status,
      warehouse,
      category,
      item_limit,
      value,
      limbo,
      notes,
    }: CreateItemInput = createItemSchema.parse(req.body);

    // Check if product_id, created_by, warehouse exist in tables
    // Only check current_location_id if it's provided
    const validationPromises = [
      pool.query('SELECT id FROM products WHERE id = $1', [product_id]),
      pool.query('SELECT id FROM users WHERE id = $1', [created_by]),
      pool.query('SELECT id FROM warehouse WHERE id = $1', [warehouse]),
    ];

    if (current_location_id) {
      validationPromises.push(
        pool.query('SELECT id FROM storage_locations WHERE id = $1', [current_location_id])
      );
    }

    const validationResults = await Promise.all(validationPromises);

    if (validationResults[0].rows.length === 0) {
      return res.status(400).json({ error: 'Invalid product_id' });
    }
    if (validationResults[1].rows.length === 0) {
      return res.status(400).json({ error: 'Invalid created_by user id' });
    }
    if (validationResults[2].rows.length === 0) {
      return res.status(400).json({ error: 'Invalid warehouse id' });
    }
    if (current_location_id && validationResults[3]?.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid current_location_id' });
    }

    const newItem = await pool.query(
      'INSERT INTO items (name, product_id, quantity, stock, current_location_id, status, created_by, warehouse, category, item_limit, value, limbo, notes, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()) RETURNING *',
      [
        name,
        product_id,
        quantity,
        stock ?? null,
        current_location_id ?? null,
        status,
        created_by,
        warehouse,
        category ?? null,
        item_limit ?? null,
        value,
        limbo ?? false,
        notes ?? null,
      ]
    );

    const { locationCode } = await getLocationInfo(current_location_id ?? null);
    const fixtureOverride = fixture ?? null;
    const itemInfoId = await syncItemInfoStock(
      name,
      product_id,
      category ?? 'UNKNOWN',
      quantity,
      value,
      item_limit ?? Number.MAX_SAFE_INTEGER,
      fixtureOverride,
      locationCode,
      1,
      true
    );

    let createdItem = newItem.rows[0];
    if (itemInfoId) {
      const updatedItem = await pool.query(
        'UPDATE items SET item_info = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [itemInfoId, createdItem.id]
      );
      if (updatedItem.rows[0]) {
        createdItem = updatedItem.rows[0];
      }
    }

    res.status(201).json(createdItem);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Creates multiple items in the database with the same data.
 *
 * @param {Request} req - Express request object with:
 *   - count: Number of items to create (in body, required)
 *   - All fields required by createItemSchema
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of created items or error message
 * @throws {400} Invalid foreign key if product_id, current_location_id (if provided), created_by, or warehouse doesn't exist
 * @throws {500} Internal server error if validation or creation fails
 */
export const createItemsBulk = async (req: Request, res: Response) => {
  try {
    const {
      count,
      name,
      product_id,
      current_location_id,
      fixture,
      created_by,
      quantity,
      stock,
      status,
      warehouse,
      category,
      item_limit,
      value,
      limbo,
      notes,
    }: CreateItemsBulkInput = createItemsBulkSchema.parse(req.body);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const validationPromises = [
        client.query('SELECT id FROM products WHERE id = $1', [product_id]),
        client.query('SELECT id FROM users WHERE id = $1', [created_by]),
        client.query('SELECT id FROM warehouse WHERE id = $1', [warehouse]),
      ];

      if (current_location_id) {
        validationPromises.push(
          client.query('SELECT id FROM storage_locations WHERE id = $1', [current_location_id])
        );
      }

      const validationResults = await Promise.all(validationPromises);

      if (validationResults[0].rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid product_id' });
      }
      if (validationResults[1].rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid created_by user id' });
      }
      if (validationResults[2].rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid warehouse id' });
      }
      if (current_location_id && validationResults[3]?.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid current_location_id' });
      }

      const newItems = await client.query(
        `INSERT INTO items (
          name,
          product_id,
          quantity,
          stock,
          current_location_id,
          status,
          created_by,
          warehouse,
          category,
          item_limit,
          value,
          limbo,
          notes,
          created_at,
          updated_at
        )
        SELECT
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          NOW(),
          NOW()
        FROM generate_series(1, $14)
        RETURNING *;`,
        [
          name,
          product_id,
          quantity,
          stock ?? null,
          current_location_id ?? null,
          status,
          created_by,
          warehouse,
          category ?? null,
          item_limit ?? null,
          value,
          limbo ?? false,
          notes ?? null,
          count,
        ]
      );

      const { locationCode } = await getLocationInfo(current_location_id ?? null, client);
      const fixtureOverride = fixture ?? null;
      const itemInfoId = await syncItemInfoStock(
        name,
        product_id,
        category ?? 'UNKNOWN',
        quantity,
        value,
        item_limit ?? Number.MAX_SAFE_INTEGER,
        fixtureOverride,
        locationCode,
        count,
        true,
        client
      );

      let responseItems = newItems.rows;
      if (itemInfoId) {
        const newItemIds = newItems.rows.map((row: { id: string }) => row.id);
        await client.query(
          'UPDATE items SET item_info = $1, updated_at = NOW() WHERE id = ANY($2::uuid[])',
          [itemInfoId, newItemIds]
        );
        const updatedItems = await client.query('SELECT * FROM items WHERE id = ANY($1::uuid[])', [
          newItemIds,
        ]);
        responseItems = updatedItems.rows;
      }
      await client.query('COMMIT');
      return res.status(201).json(responseItems);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error creating items in bulk:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Updates an existing item in the database.
 * Only updates fields that are provided in the request body.
 * Allowed fields: name, product_id, quantity, current_location_id, status, warehouse, category, limit, value, limbo, notes, item_info.
 *
 * @param {Request} req - Express request object with:
 *   - id: UUID of the item to update (in params)
 *   - Updatable fields in body (name, product_id, quantity, current_location_id, status, warehouse, category, limit, value, limbo, notes, item_info)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON object of the updated item or error message
 * @throws {400} Invalid id or product_id (must be valid UUIDs)
 * @throws {400} Invalid product_id if product doesn't exist in database
 * @throws {400} Invalid warehouse if warehouse doesn't exist in database
 * @throws {400} Invalid item_info if item_info doesn't exist in database
 * @throws {400} No updatable fields provided if request body is empty or contains no allowed fields
 * @throws {404} Item not found if no item matches the provided ID
 * @throws {500} Internal server error if database query fails
 */
export const updateItem = async (req: Request, res: Response) => {
  try {
    const { id } = itemIdParamSchema.parse(req.params);
    const validatedData: UpdateItemInput = updateItemSchema.parse(req.body);

    const currentItem = await pool.query(
      'SELECT name, current_location_id FROM items WHERE id = $1',
      [id]
    );
    if (currentItem.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    const oldName = currentItem.rows[0].name as string;
    const newName = validatedData.name ?? oldName;
    const oldLocationId = currentItem.rows[0].current_location_id as string | null;
    const newLocationId = validatedData.current_location_id ?? oldLocationId;

    // If product_id is being updated, verify it exists
    if (validatedData.product_id) {
      const productCheck = await pool.query('SELECT id FROM products WHERE id = $1', [
        validatedData.product_id,
      ]);
      if (productCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid product_id' });
      }
    }

    // If warehouse is being updated, verify it exists
    if (validatedData.warehouse) {
      const warehouseCheck = await pool.query('SELECT id FROM warehouse WHERE id = $1', [
        validatedData.warehouse,
      ]);
      if (warehouseCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid warehouse id' });
      }
    }

    if (validatedData.item_info) {
      const itemInfoCheck = await pool.query('SELECT id FROM item_info WHERE id = $1', [
        validatedData.item_info,
      ]);
      if (itemInfoCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid item_info id' });
      }
    }

    // If current_location_id is being updated, verify it exists
    if (newLocationId) {
      const locationCheck = await pool.query('SELECT id FROM storage_locations WHERE id = $1', [
        newLocationId,
      ]);
      if (locationCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid current_location_id' });
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
      UPDATE items
      SET ${setClauses.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    values.push(id);

    const { rows } = await pool.query(sql, values);

    if (!countRows(rows, res)) {
      return;
    }

    const { locationCode } = await getLocationInfo(newLocationId ?? null);
    const updatedItem = rows[0];

    if (newName !== oldName) {
      await syncItemInfoStock(
        oldName,
        undefined,
        undefined,
        undefined,
        undefined,
        0,
        undefined,
        undefined,
        -1,
        false
      );
      await syncItemInfoStock(
        newName,
        updatedItem.product_id,
        updatedItem.category ?? 'UNKNOWN',
        updatedItem.quantity,
        updatedItem.value,
        updatedItem.item_limit ?? undefined,
        undefined,
        locationCode,
        1,
        true
      );
    } else if (validatedData.current_location_id) {
      await syncItemInfoStock(
        newName,
        updatedItem.product_id,
        updatedItem.category ?? 'UNKNOWN',
        updatedItem.quantity,
        updatedItem.value,
        updatedItem.item_limit ?? undefined,
        undefined,
        locationCode,
        0,
        true
      );
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
export const deleteItem = async (req: Request, res: Response) => {
  try {
    const { id } = itemIdParamSchema.parse(req.params);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const deletedItem = await client.query('DELETE FROM items WHERE id = $1 RETURNING *', [id]);
      if (!countRows(deletedItem.rows, res)) {
        await client.query('ROLLBACK');
        return;
      }

      const itemName = deletedItem.rows[0].name;
      await syncItemInfoStock(
        itemName,
        undefined,
        undefined,
        undefined,
        undefined,
        0,
        undefined,
        undefined,
        -1,
        false,
        client
      );

      await client.query('COMMIT');
      return res.json({ message: 'Item deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
